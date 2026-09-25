'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import SportHeader, { sportImage } from '../../components/SportHeader';
import type { MatchType, SeriesFormat, RaceSession, LeaderboardStats } from '@/lib/types';
import { plural } from '@/lib/format';

interface RaceWeekendEntry {
    picks: string[];
    actual: string[] | null;
    multiplier: number;
    breakdown: { label: string; points: number }[];
}

interface PredictionEntry {
    matchId: string; teamA: string; teamB: string;
    matchType: MatchType; seriesFormat: SeriesFormat | null; raceSession: RaceSession | null;
    predictedScoreA?: number; predictedScoreB?: number;
    actualScoreA?: number | null; actualScoreB?: number | null;
    raceWeekend?: RaceWeekendEntry;
    points: number;
}

interface LeaderboardEntry {
    userId: string; username: string; totalPoints: number;
    rank: number; stats: LeaderboardStats;
    predictions: PredictionEntry[];
}

const SESSION_LABEL: Record<string, string> = {
    qualifying: 'Qualifying', sprint_qualifying: 'Sprint qualifying', sprint: 'Sprint', race: 'Race',
};

const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

function TierChip({ pts }: { pts: number }) {
    if (pts === 5) return <span className="status-chip status-chip-done">Exact +5</span>;
    if (pts === 3) return <span className="status-chip" style={{ background: '#ffe2d4', color: '#9a3412' }}>Winner + margin +3</span>;
    if (pts === 2) return <span className="status-chip status-chip-upcoming">Winner +2</span>;
    return <span className="status-chip status-chip-muted">No points</span>;
}

/** One match inside a player's expanded details. */
function PredictionLine({ p }: { p: PredictionEntry }) {
    if (p.matchType === 'race') {
        const rw = p.raceWeekend;
        const scored = !!rw?.actual;
        return (
            <li className="lb-detail">
                <div className="lb-detail-main">
                    <strong>{p.teamA}</strong>
                    {p.raceSession && <span className="status-chip status-chip-muted">{SESSION_LABEL[p.raceSession]}</span>}
                    {rw && rw.multiplier !== 1 && <span className="status-chip status-chip-live">×{rw.multiplier}</span>}
                </div>
                <div className="lb-detail-sub">
                    Picked: {rw?.picks.slice(0, 3).map((d, i) => `P${i + 1} ${d}`).join(' · ') || '–'}
                    {rw?.actual && <> · Result: {rw.actual.slice(0, 3).join(' · ')}</>}
                </div>
                {rw && rw.breakdown.length > 0 && (
                    <div className="lb-detail-sub">{rw.breakdown.map(b => `${b.label} ${b.points >= 0 ? '+' : ''}${b.points}`).join(' · ')}</div>
                )}
                <div className="lb-detail-pts">{scored ? `+${p.points}` : 'Waiting for result'}</div>
            </li>
        );
    }
    const scored = p.actualScoreA !== null && p.actualScoreA !== undefined;
    return (
        <li className="lb-detail">
            <div className="lb-detail-main">
                <strong>{p.teamA} vs {p.teamB}</strong>
                {p.matchType === 'series' && p.seriesFormat && <span className="status-chip status-chip-muted">{p.seriesFormat.replace('BO', 'Best of ')}</span>}
            </div>
            <div className="lb-detail-sub">
                Picked {p.predictedScoreA}–{p.predictedScoreB}
                {scored ? <> · Final score {p.actualScoreA}–{p.actualScoreB}</> : ' · waiting for the result'}
            </div>
            <div className="lb-detail-pts">{scored ? <TierChip pts={p.points} /> : null}</div>
        </li>
    );
}

export default function LeaderboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.tournamentId as string;
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [tournamentName, setTournamentName] = useState('');
    const [tournamentSport, setTournamentSport] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);

    useEffect(() => {
        if (session && tournamentId) {
            fetch(`/api/leaderboard/${tournamentId}`)
                .then(async r => {
                    const data = await r.json();
                    if (!r.ok) { setError(data?.error || 'Could not load the league table.'); return; }
                    setLeaderboard(Array.isArray(data) ? data : []);
                })
                .catch(() => setError('Could not load the league table.'))
                .finally(() => setLoading(false));
            fetch(`/api/tournaments?id=${tournamentId}`).then(r => r.json()).then(d => {
                setTournamentName(d?.name ?? '');
                setTournamentSport(d?.sport ?? '');
            }).catch(() => {});
        }
    }, [session, tournamentId]);

    const myId = (session?.user as any)?.id;

    if (status === 'loading' || loading) {
        return (
            <div className="app-page"><Navbar />
                <div className="container" style={{ paddingTop: '2rem' }}>
                    <div className="loading" style={{ height: '250px', borderRadius: 'var(--radius-lg)' }} />
                </div>
            </div>
        );
    }

    const me = leaderboard.find(e => e.userId === myId);
    const leader = leaderboard[0];
    const anyScored = leaderboard.some(e => e.stats.scored > 0);
    // Race leagues don't use the exact / margin / winner tiers, so hide those columns.
    const isRaceLeague = tournamentSport === 'Formula 1' || tournamentSport === 'MotoGP';
    const tied = (e: LeaderboardEntry) => leaderboard.filter(o => o.rank === e.rank).length > 1;

    let myLine = '';
    if (me && anyScored) {
        const gap = leader.totalPoints - me.totalPoints;
        myLine = me.rank === 1
            ? (tied(me) ? `You're joint top with ${me.totalPoints} points.` : `You're top of the league with ${me.totalPoints} points${leaderboard[1] ? `, ${leaderboard[1].totalPoints === me.totalPoints ? 'level on points' : `${me.totalPoints - leaderboard[1].totalPoints} ahead`} of ${leaderboard.find(e => e.rank > 1)?.username ?? 'the rest'}` : ''}.`)
            : `You're ${tied(me) ? 'joint ' : ''}${ordinal(me.rank)} of ${leaderboard.length} with ${me.totalPoints} points, ${gap} behind ${leader.username}.`;
    }

    return (
        <div className="app-page">
            <Navbar />
            <div className="container">
                <SportHeader
                    title="League table"
                    subtitle={tournamentName ? `${tournamentName}: points from every finished match, updated as soon as results are entered.` : undefined}
                    image={sportImage(tournamentSport)}
                    actions={<Link href={`/predictions/${tournamentId}`} className="btn btn-primary">Make predictions</Link>}
                />

                {error ? (
                    <div className="empty-state">
                        <h3>Can&apos;t show this table</h3>
                        <p>{error}</p>
                        <Link href="/tournaments" className="btn btn-secondary">My leagues</Link>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="empty-state">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/img/sport-scoreboard.png" alt="" className="empty-state-img" />
                        <h3>No players yet</h3>
                        <p>Invite friends to this league, then everyone predicts the matches.</p>
                    </div>
                ) : (
                    <>
                        {myLine ? (
                            <div className="next-step">
                                <span className="next-step-icon" aria-hidden="true">{me?.rank === 1 ? '🏆' : '📈'}</span>
                                <div>
                                    <h2>{myLine}</h2>
                                    <p>Every correct prediction counts. Make sure all upcoming matches have your pick before they kick off.</p>
                                </div>
                            </div>
                        ) : !anyScored ? (
                            <div className="next-step">
                                <span className="next-step-icon" aria-hidden="true">⏳</span>
                                <div>
                                    <h2>No results yet</h2>
                                    <p>The table fills in once the first match is finished and the organiser enters the score. Until then, everyone is on 0.</p>
                                </div>
                            </div>
                        ) : null}

                        <div className="data-table-wrap">
                            <div className="data-table-scroll">
                                <table className="data-table lb-table">
                                    <caption className="sr-only" style={{ position: 'absolute', left: -9999 }}>League table for {tournamentName}</caption>
                                    <thead>
                                        <tr>
                                            <th scope="col" className="center">#</th>
                                            <th scope="col">Player</th>
                                            <th scope="col" className="num" title="Finished matches this player predicted">Played</th>
                                            {!isRaceLeague && <>
                                                <th scope="col" className="num hide-sm" title="Exact score: 5 points">Exact</th>
                                                <th scope="col" className="num hide-sm" title="Right winner and goal difference: 3 points">W+M</th>
                                                <th scope="col" className="num hide-sm" title="Right winner: 2 points">Win</th>
                                                <th scope="col" className="num hide-sm" title="Wrong winner: 0 points">Miss</th>
                                            </>}
                                            <th scope="col" className="num">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map(entry => {
                                            const isMe = entry.userId === myId;
                                            const isOpen = expanded === entry.userId;
                                            const medal = entry.rank <= 3 && entry.totalPoints > 0 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : null;
                                            return (
                                                <Fragment key={entry.userId}>
                                                    <tr className={isMe ? 'lb-me' : undefined}>
                                                        <td className="center lb-rank-cell">
                                                            {medal ?? (tied(entry) ? `=${entry.rank}` : entry.rank)}
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="lb-name-btn"
                                                                onClick={() => setExpanded(isOpen ? null : entry.userId)}
                                                                aria-expanded={isOpen}
                                                                aria-controls={`lb-details-${entry.userId}`}
                                                            >
                                                                <span className="lb-name">{entry.username}</span>
                                                                {isMe && <span className="status-chip status-chip-done">You</span>}
                                                                <span className="lb-toggle" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
                                                            </button>
                                                        </td>
                                                        <td className="num">{entry.stats.scored}</td>
                                                        {!isRaceLeague && <>
                                                            <td className="num hide-sm">{entry.stats.exact}</td>
                                                            <td className="num hide-sm">{entry.stats.winnerAndMargin}</td>
                                                            <td className="num hide-sm">{entry.stats.winner}</td>
                                                            <td className="num hide-sm">{entry.stats.miss}</td>
                                                        </>}
                                                        <td className="num lb-points-cell">{entry.totalPoints}</td>
                                                    </tr>
                                                    {isOpen && (
                                                        <tr className="lb-details-row">
                                                            <td colSpan={isRaceLeague ? 4 : 8} id={`lb-details-${entry.userId}`}>
                                                                {entry.predictions.length === 0 ? (
                                                                    <p className="section-help" style={{ margin: 0 }}>
                                                                        {isMe ? "You haven't made any predictions yet." : 'No predictions to show yet.'}
                                                                    </p>
                                                                ) : (
                                                                    <ul className="lb-details">
                                                                        {entry.predictions.map(p => <PredictionLine key={p.matchId} p={p} />)}
                                                                    </ul>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="table-legend">
                            {isRaceLeague ? (
                                <span><b>Points</b> come from your Top 10 order and bonus questions on each race weekend.</span>
                            ) : (
                                <>
                                    <span><b>Played</b> finished matches predicted</span>
                                    <span><b>Exact</b> exact score, 5 pts</span>
                                    <span><b>W+M</b> right winner and margin, 3 pts</span>
                                    <span><b>Win</b> right winner, 2 pts</span>
                                    <span><b>Miss</b> 0 pts</span>
                                </>
                            )}
                        </div>
                        <p className="section-help" style={{ marginTop: '0.75rem' }}>
                            Level on points? More exact scores ranks higher; still level means a shared place (=).
                            Tap a name to see their picks. Other players&apos; picks stay hidden until each match kicks off.
                            {' '}{plural(leaderboard.length, 'player', 'players')} in this league.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
