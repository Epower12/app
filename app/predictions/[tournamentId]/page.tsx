'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import SportHeader, { sportImage } from '../../components/SportHeader';
import ScoreStepper from '../../components/ScoreStepper';
import SeriesPredictor from '../../components/SeriesPredictor';
import RaceWeekendEditor, { emptyRaceWeekendForm, type RaceWeekendFormState } from '../../components/RaceWeekendEditor';
import type { MatchType, SeriesFormat, RaceSession, RaceBonusConfig } from '@/lib/types';
import { defaultRaceBonusConfig, parseRaceBonusConfig } from '@/lib/types';
import { calculateRaceWeekendPoints, raceSessionMultiplier } from '@/lib/scoring';
import { formatKickoff, timeUntil, plural } from '@/lib/format';

interface Match {
    id: string; team_a: string; team_b: string; scheduled_time: number;
    team_a_score: number | null; team_b_score: number | null;
    is_finished: boolean; sport: string; is_playoff: boolean;
    team_a_logo?: string | null; team_b_logo?: string | null;
    match_type: MatchType; series_format: SeriesFormat | null; race_session: RaceSession | null;
    top10_result?: string[] | null;
    pole_result?: string | null; fastest_lap_result?: string | null; first_retirement_result?: string | null;
    safety_car_result?: boolean | null;
    positions_gained_result?: string | null; positions_lost_result?: string | null;
    winning_margin_result?: string | null; retirements_result?: string | null;
    is_season_finale?: boolean;
}

interface ScorePrediction { id: string; match_id: string; team_a_score: number; team_b_score: number; }
interface RaceWeekendPrediction {
    id: string; match_id: string; picks: string[];
    pole_pick: string | null; fastest_lap_pick: string | null; first_retirement_pick: string | null;
    safety_car_pick: boolean | null;
    positions_gained_pick: string | null; positions_lost_pick: string | null;
    winning_margin_pick: string | null; retirements_pick: string | null;
}
interface MatchStats { total: number; homeWin: number; draw: number; awayWin: number; teamA: string; teamB: string; topPredictions: { score: string; count: number; pct: number }[]; }

function raceWeekendToForm(rp?: RaceWeekendPrediction): RaceWeekendFormState {
    if (!rp) return { ...emptyRaceWeekendForm, picks: [] };
    return {
        picks: rp.picks ?? [],
        pole: rp.pole_pick ?? '',
        fastestLap: rp.fastest_lap_pick ?? '',
        firstRetirement: rp.first_retirement_pick ?? '',
        safetyCar: rp.safety_car_pick === true ? 'yes' : rp.safety_car_pick === false ? 'no' : '',
        positionsGained: rp.positions_gained_pick ?? '',
        positionsLost: rp.positions_lost_pick ?? '',
        winningMargin: (rp.winning_margin_pick as any) ?? '',
        retirements: (rp.retirements_pick as any) ?? '',
    };
}

const SESSION_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
    qualifying:       { label: 'QUALIFYING',        color: '#1e3a8a', bg: '#dde7ff', border: '#1e3a8a' },
    sprint_qualifying:{ label: 'SPRINT QUALIFYING', color: '#4338ca', bg: '#e0e7ff', border: '#4338ca' },
    sprint:           { label: 'SPRINT',            color: '#9a3412', bg: '#ffe2d4', border: '#9a3412' },
    race:             { label: 'RACE',              color: '#0f172a', bg: '#c6f135', border: '#0f172a' },
};

const PODIUM_COLORS = ['#a16207', '#475569', '#9a3412'];

/** What a series score counts: sets in tennis, maps in esports. */
const seriesUnit = (sport: string) => (sport === 'Tennis' ? 'sets' : sport === 'Volleyball' ? 'sets' : 'maps');

const avatarLetters = (name: string) => name.slice(0, 2).toUpperCase();
const formatDT = formatKickoff;

function TeamAvatar({ name, logo, side }: { name: string; logo?: string | null; side: 'a' | 'b' }) {
    const [broken, setBroken] = useState(false);
    if (logo && !broken) {
        return (
            <div className={`match-team-avatar match-team-avatar-${side}`} style={{ background: '#ffffff', padding: 4 }}>
                <img src={logo} alt={name} onError={() => setBroken(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }} />
            </div>
        );
    }
    return <div className={`match-team-avatar match-team-avatar-${side}`}>{avatarLetters(name)}</div>;
}

export default function PredictionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.tournamentId as string;
    const [matches, setMatches] = useState<Match[]>([]);
    const [scorePreds, setScorePreds] = useState<Record<string, ScorePrediction>>({});
    const [racePreds, setRacePreds] = useState<Record<string, RaceWeekendPrediction>>({});
    const [tournamentName, setTournamentName] = useState('');
    const [tournamentSport, setTournamentSport] = useState('');
    const [raceBonusConfig, setRaceBonusConfig] = useState<RaceBonusConfig>(defaultRaceBonusConfig());
    const [isTournamentActive, setIsTournamentActive] = useState(true);
    const [isCreator, setIsCreator] = useState(false);
    const [loading, setLoading] = useState(true);
    const [statsMap, setStatsMap] = useState<Record<string, MatchStats>>({});
    const [openStatsId, setOpenStatsId] = useState<string | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);
    useEffect(() => { if (session && tournamentId) fetchData(); }, [session, tournamentId]);

    const fetchData = async () => {
        try {
            const [mRes, pRes, rpRes, tRes] = await Promise.all([
                fetch(`/api/matches?tournamentId=${tournamentId}`),
                fetch(`/api/predictions?tournamentId=${tournamentId}`),
                fetch(`/api/race-weekend-predictions?tournamentId=${tournamentId}`),
                fetch(`/api/tournaments?id=${tournamentId}`),
            ]);
            const [mData, pData, rpData, tData] = await Promise.all([mRes.json(), pRes.json(), rpRes.json(), tRes.json()]);
            setMatches(Array.isArray(mData) ? mData : []);

            const scoreMap: Record<string, ScorePrediction> = {};
            if (Array.isArray(pData)) pData.forEach((p: ScorePrediction) => { scoreMap[p.match_id] = p; });
            setScorePreds(scoreMap);

            const raceMap: Record<string, RaceWeekendPrediction> = {};
            if (Array.isArray(rpData)) rpData.forEach((p: RaceWeekendPrediction) => { raceMap[p.match_id] = p; });
            setRacePreds(raceMap);

            setTournamentName(tData?.name ?? '');
            setTournamentSport(tData?.sport ?? '');
            setRaceBonusConfig(parseRaceBonusConfig(tData?.race_bonus_config));
            setIsTournamentActive(tData?.is_active === 1 || tData?.is_active === true);
            setIsCreator(tData?.created_by === (session?.user as any)?.id);
        } catch { /* ignore */ } finally { setLoading(false); }
    };

    const user = session?.user as any;
    const isPremium = user?.role === 'premium' || user?.role === 'admin';

    const loadStats = async (matchId: string) => {
        if (statsMap[matchId]) { setOpenStatsId(openStatsId === matchId ? null : matchId); return; }
        setStatsLoading(true);
        setOpenStatsId(matchId);
        const res = await fetch(`/api/predictions/stats?matchId=${matchId}`);
        if (res.ok) { const data = await res.json(); setStatsMap(prev => ({ ...prev, [matchId]: data })); }
        setStatsLoading(false);
    };

    // Both submit helpers return an error message for the card to show, or null on success.
    const submitScorePrediction = async (matchId: string, teamAScore: number, teamBScore: number): Promise<string | null> => {
        try {
            const res = await fetch('/api/predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, teamAScore, teamBScore }),
            });
            fetchData();
            if (!res.ok) return (await res.json().catch(() => ({})))?.error || 'Your prediction was not saved. Please try again.';
            return null;
        } catch { return 'Your prediction was not saved. Check your connection and try again.'; }
    };

    const submitRaceWeekendPrediction = async (matchId: string, form: RaceWeekendFormState): Promise<string | null> => {
        try {
        const res = await fetch('/api/race-weekend-predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matchId, picks: form.picks,
                polePick: form.pole, fastestLapPick: form.fastestLap, firstRetirementPick: form.firstRetirement,
                safetyCarPick: form.safetyCar,
                positionsGainedPick: form.positionsGained, positionsLostPick: form.positionsLost,
                winningMarginPick: form.winningMargin, retirementsPick: form.retirements,
            }),
        });
        fetchData();
        if (!res.ok) return (await res.json().catch(() => ({})))?.error || 'Your prediction was not saved. Please try again.';
        return null;
        } catch { return 'Your prediction was not saved. Check your connection and try again.'; }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="app-page"><Navbar />
                <div className="container" style={{ paddingTop: '2rem' }}>
                    {[1, 2, 3].map(i => <div key={i} className="loading" style={{ height: '100px', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />)}
                </div>
            </div>
        );
    }

    const now = Date.now() / 1000;
    const upcomingMatches = matches.filter(m => !m.is_finished && now < m.scheduled_time);
    const liveMatches = matches.filter(m => !m.is_finished && now >= m.scheduled_time);
    const finishedMatches = matches.filter(m => m.is_finished);

    // Determine dominant match type for scoring rules display
    const hasRace = matches.some(m => m.match_type === 'race');
    const hasSeries = matches.some(m => m.match_type === 'series');
    const firstMatch = matches[0];

    return (
        <div className="app-page">
            <Navbar />
            <div className="container">
                {/* Header */}
                <SportHeader
                    title={tournamentName || 'Matches'}
                    subtitle="Pick the result of each match before it starts. You can change your pick until kick-off."
                    image={sportImage(tournamentSport)}
                    actions={
                        <>
                            <Link href={`/leaderboard/${tournamentId}`} className="btn btn-secondary">League table</Link>
                            {isCreator && <Link href={`/manage/${tournamentId}`} className="btn btn-secondary">Manage league</Link>}
                        </>
                    }
                />

                {!isTournamentActive && (
                    <div className="next-step next-step-warn">
                        <span className="next-step-icon" aria-hidden="true">🔒</span>
                        <div>
                            <h2>This league is closed</h2>
                            <p>The organiser has closed it, so no new predictions can be made. Your points and the league table stay as they are.</p>
                        </div>
                    </div>
                )}

                {/* Progress: the one thing a player needs to know on arrival */}
                {isTournamentActive && upcomingMatches.length > 0 && (() => {
                    const predictedCount = upcomingMatches.filter(m => m.match_type === 'race' ? !!racePreds[m.id] : !!scorePreds[m.id]).length;
                    const missing = upcomingMatches.length - predictedCount;
                    const nextMissing = upcomingMatches.find(m => !(m.match_type === 'race' ? racePreds[m.id] : scorePreds[m.id]));
                    return missing > 0 ? (
                        <div className="next-step">
                            <span className="next-step-icon" aria-hidden="true">🎯</span>
                            <div>
                                <h2>You&apos;ve predicted {predictedCount} of {plural(upcomingMatches.length, 'open match', 'open matches')}</h2>
                                <p>
                                    {plural(missing, 'match still needs', 'matches still need')} your pick
                                    {nextMissing && timeUntil(nextMissing.scheduled_time) ? <>. The next one locks in <strong>{timeUntil(nextMissing.scheduled_time)}</strong>.</> : '.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="next-step">
                            <span className="next-step-icon" aria-hidden="true">✅</span>
                            <div>
                                <h2>All {plural(upcomingMatches.length, 'open match', 'open matches')} predicted</h2>
                                <p>You can still change any pick until that match kicks off. Check the league table after the results come in.</p>
                            </div>
                        </div>
                    );
                })()}

                <ScoringLegend hasRace={hasRace} hasScore={matches.some(m => (m.match_type ?? 'score') === 'score')} hasSeries={hasSeries} sport={tournamentSport} />

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    <span className="stat-pill"><strong>{upcomingMatches.length}</strong> open for predictions</span>
                    <span className={`stat-pill ${liveMatches.length ? 'stat-pill-alert' : ''}`}><strong>{liveMatches.length}</strong> waiting for result</span>
                    <span className="stat-pill"><strong>{finishedMatches.length}</strong> finished</span>
                </div>

                {matches.length === 0 && (
                    <div className="empty-state">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/img/sport-floodlight.png" alt="" className="empty-state-img" />
                        <h3>No matches yet</h3>
                        <p>{isCreator ? 'Add the first matches so your players can start predicting.' : "The organiser hasn't added any matches yet. Check back soon."}</p>
                        {isCreator && <Link href={`/manage/${tournamentId}`} className="btn btn-primary">Add matches</Link>}
                    </div>
                )}

                {upcomingMatches.length > 0 && (
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="match-section-header">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4facfe', display: 'inline-block' }} />
                            Open for predictions
                        </div>
                        <p className="section-help">You can make or change your pick until each match kicks off.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {upcomingMatches.map(m => (
                                <PredCard key={m.id} match={m} tournamentId={tournamentId}
                                    scorePrediction={scorePreds[m.id]} racePrediction={racePreds[m.id]}
                                    onSubmitScore={submitScorePrediction} onSubmitRaceWeekend={submitRaceWeekendPrediction}
                                    raceBonusConfig={raceBonusConfig} sport={tournamentSport}
                                    locked={!isTournamentActive}
                                    isPremium={isPremium} onLoadStats={loadStats}
                                    stats={statsMap[m.id]} statsOpen={openStatsId === m.id} statsLoading={statsLoading} />
                            ))}
                        </div>
                    </div>
                )}

                {liveMatches.length > 0 && (
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="match-section-header">
                            <span className="match-live-dot" /> Started: waiting for the result
                        </div>
                        <p className="section-help">Picks are locked. Your points appear here once the organiser enters the final score.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {liveMatches.map(m => (
                                <PredCard key={m.id} match={m} tournamentId={tournamentId}
                                    scorePrediction={scorePreds[m.id]} racePrediction={racePreds[m.id]}
                                    onSubmitScore={submitScorePrediction} onSubmitRaceWeekend={submitRaceWeekendPrediction}
                                    raceBonusConfig={raceBonusConfig} sport={tournamentSport}
                                    locked isPremium={isPremium} onLoadStats={loadStats}
                                    stats={statsMap[m.id]} statsOpen={openStatsId === m.id} statsLoading={statsLoading} />
                            ))}
                        </div>
                    </div>
                )}

                {finishedMatches.length > 0 && (
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="match-section-header">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} />
                            Finished
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {finishedMatches.map(m => (
                                <PredCard key={m.id} match={m} tournamentId={tournamentId}
                                    scorePrediction={scorePreds[m.id]} racePrediction={racePreds[m.id]}
                                    onSubmitScore={submitScorePrediction} onSubmitRaceWeekend={submitRaceWeekendPrediction}
                                    raceBonusConfig={raceBonusConfig} sport={tournamentSport}
                                    locked showResult isPremium={isPremium} onLoadStats={loadStats}
                                    stats={statsMap[m.id]} statsOpen={openStatsId === m.id} statsLoading={statsLoading} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── PredCard ────────────────────────────────────────────────────────────────

function PredCard({
    match, tournamentId, sport = '',
    scorePrediction, racePrediction,
    onSubmitScore, onSubmitRaceWeekend, raceBonusConfig,
    locked = false, showResult = false,
    isPremium = false, onLoadStats,
    stats, statsOpen, statsLoading,
}: {
    match: Match; tournamentId: string; sport?: string;
    scorePrediction?: ScorePrediction; racePrediction?: RaceWeekendPrediction;
    onSubmitScore: (id: string, a: number, b: number) => Promise<string | null>;
    onSubmitRaceWeekend: (id: string, form: RaceWeekendFormState) => Promise<string | null>;
    raceBonusConfig?: RaceBonusConfig;
    locked?: boolean; showResult?: boolean;
    isPremium?: boolean; onLoadStats?: (id: string) => void;
    stats?: MatchStats; statsOpen?: boolean; statsLoading?: boolean;
}) {
    const matchType = match.match_type ?? 'score';

    if (matchType === 'race') {
        return <RaceCard match={match} tournamentId={tournamentId} racePrediction={racePrediction}
            onSubmitRaceWeekend={onSubmitRaceWeekend} raceBonusConfig={raceBonusConfig} locked={locked} showResult={showResult} />;
    }

    return <ScoreCard match={match} tournamentId={tournamentId} sport={sport}
        scorePrediction={scorePrediction} onSubmitScore={onSubmitScore}
        locked={locked} showResult={showResult}
        isPremium={isPremium} onLoadStats={onLoadStats}
        stats={stats} statsOpen={statsOpen} statsLoading={statsLoading} />;
}

// ─── RaceCard ────────────────────────────────────────────────────────────────

function RaceCard({ match, tournamentId, racePrediction, onSubmitRaceWeekend, raceBonusConfig, locked, showResult }: {
    match: Match; tournamentId: string; racePrediction?: RaceWeekendPrediction;
    onSubmitRaceWeekend: (id: string, form: RaceWeekendFormState) => Promise<string | null>;
    raceBonusConfig?: RaceBonusConfig;
    locked?: boolean; showResult?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<RaceWeekendFormState>(raceWeekendToForm(racePrediction));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(raceWeekendToForm(racePrediction));
    }, [racePrediction]);

    const sessionBadge = match.race_session ? SESSION_BADGE[match.race_session] : null;

    const left = !locked ? timeUntil(match.scheduled_time) : null;

    const handleSave = async () => {
        if (form.picks.length < 3) return;
        setSaving(true);
        const err = await onSubmitRaceWeekend(match.id, form);
        setError(err);
        if (!err) setEditing(false);
        setSaving(false);
    };

    // Points display for finished race
    const multiplier = raceSessionMultiplier(match.race_session ?? null, !!match.is_season_finale);
    const result = (showResult && match.top10_result && racePrediction)
        ? calculateRaceWeekendPoints(
            {
                picks: racePrediction.picks, polePick: racePrediction.pole_pick,
                fastestLapPick: racePrediction.fastest_lap_pick, firstRetirementPick: racePrediction.first_retirement_pick,
                safetyCarPick: racePrediction.safety_car_pick,
                positionsGainedPick: racePrediction.positions_gained_pick, positionsLostPick: racePrediction.positions_lost_pick,
                winningMarginPick: racePrediction.winning_margin_pick, retirementsPick: racePrediction.retirements_pick,
            },
            {
                top10Result: match.top10_result ?? null, poleResult: match.pole_result, fastestLapResult: match.fastest_lap_result,
                firstRetirementResult: match.first_retirement_result, safetyCarResult: match.safety_car_result,
                positionsGainedResult: match.positions_gained_result, positionsLostResult: match.positions_lost_result,
                winningMarginResult: match.winning_margin_result, retirementsResult: match.retirements_result,
            },
            match.race_session ?? null, multiplier, raceBonusConfig ?? defaultRaceBonusConfig()
        )
        : null;

    return (
        <div className="match-card" style={{
            borderLeft: sessionBadge ? `3px solid ${sessionBadge.color}` : undefined,
            overflow: 'visible',
        }}>
            {/* Session + event header */}
            <div className="match-card-teams">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {sessionBadge && (
                            <span style={{
                                fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.55rem',
                                borderRadius: '999px', background: sessionBadge.bg,
                                color: sessionBadge.color, border: `1px solid ${sessionBadge.border}`,
                                letterSpacing: '0.06em',
                            }}>{sessionBadge.label}</span>
                        )}
                        {match.is_season_finale && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '999px', background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.35)' }}>
                                ×2 FINALE
                            </span>
                        )}
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{match.team_a}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{match.team_b || 'Grand Prix'}</span>
                    {!showResult && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Predict the Top 10 finishing order{match.race_session === 'race' ? ', plus the bonus questions' : ''}. At least the first 3 places are needed.
                        </span>
                    )}
                </div>

                {showResult && match.top10_result ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'flex-end', maxWidth: 200 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>RESULT: TOP 3</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                            {match.top10_result.slice(0, 3).join(' · ')}
                        </span>
                    </div>
                ) : null}
            </div>

            {/* Result points overlay */}
            {result && (
                <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: result.total > 0 ? '#3f6212' : 'var(--text-muted)' }}>
                        +{result.total} pts
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {result.breakdown.length ? result.breakdown.map(b => `${b.label} +${b.points}`).join(' · ') : 'No points'}
                    </span>
                </div>
            )}

            {/* Footer */}
            <div className="match-card-footer">
                <span className="match-time">
                    {formatDT(match.scheduled_time)}
                    {left && <span className="status-chip status-chip-upcoming" style={{ marginLeft: '0.5rem' }}>Locks in {left}</span>}
                </span>

                {error && <div className="auth-error" role="alert" style={{ width: '100%' }}>{error}</div>}

                {editing && !locked ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', paddingTop: '0.5rem' }}>
                        <RaceWeekendEditor
                            tournamentId={tournamentId}
                            raceSession={match.race_session}
                            value={form}
                            onChange={setForm}
                            mode="predict"
                            enabledQuestions={raceBonusConfig}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-success btn-sm" onClick={handleSave}
                                disabled={saving || form.picks.length < 3}>
                                {saving ? '…' : 'Save prediction'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                    </div>
                ) : racePrediction && !editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your picks:</span>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {racePrediction.picks.slice(0, 3).map((driver, i) => (
                                <span key={driver} style={{ fontSize: '0.8rem', fontWeight: 700, color: PODIUM_COLORS[i] }}>
                                    P{i + 1}: {driver}
                                </span>
                            ))}
                            {racePrediction.picks.length > 3 && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>+{racePrediction.picks.length - 3} more</span>
                            )}
                        </div>
                        {!locked && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>}
                    </div>
                ) : !locked ? (
                    <button className="btn btn-primary" onClick={() => setEditing(true)}>Make prediction</button>
                ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>You didn&apos;t predict this one</span>
                )}
            </div>
        </div>
    );
}

// ─── ScoreCard (handles both 'score' and 'series') ────────────────────────────

function ScoreCard({ match, tournamentId, sport = '', scorePrediction, onSubmitScore, locked = false, showResult = false, isPremium = false, onLoadStats, stats, statsOpen, statsLoading }: {
    match: Match; tournamentId: string; sport?: string;
    scorePrediction?: ScorePrediction;
    onSubmitScore: (id: string, a: number, b: number) => Promise<string | null>;
    locked?: boolean; showResult?: boolean;
    isPremium?: boolean; onLoadStats?: (id: string) => void;
    stats?: MatchStats; statsOpen?: boolean; statsLoading?: boolean;
}) {
    const matchType = match.match_type ?? 'score';
    const isSeries = matchType === 'series';
    const seriesFormat = match.series_format ?? 'BO3';

    const [editing, setEditing] = useState(false);
    const [scores, setScores] = useState({ a: scorePrediction?.team_a_score ?? 0, b: scorePrediction?.team_b_score ?? 0 });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isTied = scores.a === scores.b;
    const playoffTieBlocked = match.is_playoff && isTied;

    useEffect(() => { setScores({ a: scorePrediction?.team_a_score ?? 0, b: scorePrediction?.team_b_score ?? 0 }); }, [scorePrediction]);

    const timeLeft = Math.floor((match.scheduled_time * 1000 - Date.now()) / 1000);
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);

    const countdownUrgency = !locked && timeLeft > 0
        ? timeLeft < 1800 ? 'critical' : timeLeft < 10800 ? 'warning' : timeLeft < 86400 ? 'soon' : 'normal'
        : null;

    const urgencyStyle: Record<string, React.CSSProperties> = {
        critical: { background: '#fee2e2', color: '#b91c1c', border: '1.5px solid #b91c1c' },
        warning:  { background: '#ffedd5', color: '#9a3412', border: '1.5px solid #9a3412' },
        soon:     { background: '#fef9c3', color: '#854d0e', border: '1.5px solid #ca8a04' },
        normal:   { background: '#dde7ff', color: '#1e3a8a', border: '1.5px solid transparent' },
    };

    const handleSave = async () => {
        setSaving(true);
        const err = await onSubmitScore(match.id, scores.a, scores.b);
        setError(err);
        if (!err) setEditing(false);
        setSaving(false);
    };

    const resultPoints = () => {
        if (!showResult || match.team_a_score === null || !scorePrediction) return null;
        const predA = scorePrediction.team_a_score, predB = scorePrediction.team_b_score;
        const actualA = match.team_a_score, actualB = match.team_b_score!;
        if (predA === actualA && predB === actualB) return { pts: 5, label: 'Exact score!', color: '#3f6212' };
        const predW = predA > predB ? 'A' : predA < predB ? 'B' : 'draw';
        const actualW = actualA > actualB ? 'A' : actualA < actualB ? 'B' : 'draw';
        const correctWinner = predW === actualW;
        const correctGap = Math.abs(predA - predB) === Math.abs(actualA - actualB);
        if (correctWinner && correctGap) return { pts: 3, label: 'Right winner + margin', color: '#15803d' };
        if (correctWinner) return { pts: 2, label: 'Right winner', color: '#1e3a8a' };
        return { pts: 0, label: 'No points', color: 'var(--text-muted)' };
    };
    const result = resultPoints();

    return (
        <div className="match-card" style={{ overflow: 'visible' }}>
            {/* Series format badge */}
            {isSeries && (
                <div style={{ padding: '0.5rem 1rem 0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="status-chip status-chip-upcoming">{seriesFormat.replace('BO', 'Best of ')}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Predict how many {seriesUnit(sport)} each side wins</span>
                </div>
            )}

            {/* Teams row */}
            <div className="match-card-teams">
                <div className="match-team">
                    {!isSeries && <TeamAvatar name={match.team_a} logo={match.team_a_logo} side="a" />}
                    <span className="match-team-name">{match.team_a}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    {match.is_playoff && !isSeries && (
                        <span className="status-chip status-chip-live" title="Knockout match: someone has to win, so a draw can't be predicted">⚔️ Knockout</span>
                    )}
                    {showResult && match.team_a_score !== null ? (
                        <div className="score-result">{match.team_a_score} – {match.team_b_score}</div>
                    ) : (
                        <span className="match-vs-badge">VS</span>
                    )}
                    {result && (
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: result.color }}>{result.label} +{result.pts} pts</span>
                    )}
                </div>
                <div className="match-team" style={{ justifyContent: 'flex-end' }}>
                    <span className="match-team-name" style={{ textAlign: 'right' }}>{match.team_b}</span>
                    {!isSeries && <TeamAvatar name={match.team_b} logo={match.team_b_logo} side="b" />}
                </div>
            </div>

            {/* Premium stats */}
            {isPremium && !match.is_finished && !isSeries && (
                <div style={{ padding: '0 1rem 0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button style={{ fontSize: '0.78rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline' }}
                        onClick={() => onLoadStats?.(match.id)} aria-expanded={!!statsOpen}>
                        {statsOpen ? 'Hide community picks' : 'See what everyone predicted (Premium)'}
                    </button>
                </div>
            )}
            {isPremium && statsOpen && stats && (
                <div style={{ margin: '0 1rem 0.75rem', padding: '0.85rem', background: 'var(--bg-tertiary)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    {statsLoading && !stats ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Loading…</p> : stats.total > 0 ? (
                        <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 700 }}>📊 {stats.total} PREDICTION{stats.total !== 1 ? 'S' : ''}: {stats.teamA} win · draw · {stats.teamB} win</div>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.6rem', fontSize: '0.78rem', fontWeight: 700 }}>
                                <span style={{ color: '#1e3a8a', minWidth: 28 }}>{stats.homeWin}%</span>
                                <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--bg-tertiary)', overflow: 'hidden', display: 'flex' }}>
                                    <div style={{ width: `${stats.homeWin}%`, background: '#2f6bff', transition: 'width 0.4s' }} />
                                    <div style={{ width: `${stats.draw}%`, background: '#94a3b8', transition: 'width 0.4s' }} />
                                    <div style={{ width: `${stats.awayWin}%`, background: '#ff5a1f', transition: 'width 0.4s' }} />
                                </div>
                                <span style={{ color: '#9a3412', minWidth: 28, textAlign: 'right' }}>{stats.awayWin}%</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {stats.topPredictions.map(p => (
                                    <span key={p.score} style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        {p.score} <span style={{ color: 'var(--text-muted)' }}>({p.pct}%)</span>
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>No predictions yet.</p>}
                </div>
            )}

            {/* Countdown */}
            {countdownUrgency && countdownUrgency !== 'normal' && (
                <div style={{ margin: '0 1rem 0.6rem', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', ...urgencyStyle[countdownUrgency] }}>
                    {countdownUrgency === 'critical' ? `Locks in ${minutes}m. Predict now!` : `Locks in ${hours}h ${minutes}m`}
                </div>
            )}

            {/* Footer */}
            <div className="match-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="match-time">{formatDT(match.scheduled_time)}</span>
                    {countdownUrgency === 'normal' && (
                        <span className="status-chip status-chip-upcoming">Locks in {timeUntil(match.scheduled_time)}</span>
                    )}
                    {locked && !showResult && <span className="status-chip status-chip-live">Locked</span>}
                </div>

                {error && <div className="auth-error" role="alert" style={{ width: '100%' }}>{error}</div>}

                {editing && !locked ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: isSeries ? 'stretch' : 'flex-end', width: '100%' }}>
                        {isSeries ? (
                            <SeriesPredictor
                                format={seriesFormat}
                                teamA={match.team_a}
                                teamB={match.team_b}
                                value={scores.a !== 0 || scores.b !== 0 ? [scores.a, scores.b] : null}
                                onChange={(a, b) => setScores({ a, b })}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <ScoreStepper value={scores.a} onChange={v => setScores(s => ({ ...s, a: v }))} />
                                <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '1.1rem' }} aria-hidden="true">–</span>
                                <ScoreStepper value={scores.b} onChange={v => setScores(s => ({ ...s, b: v }))} />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {playoffTieBlocked && (
                                <span style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: 600 }}>Knockout match: pick a winner, a draw isn&apos;t possible.</span>
                            )}
                            <button className="btn btn-success btn-sm" onClick={handleSave}
                                disabled={saving || playoffTieBlocked || (isSeries && scores.a === 0 && scores.b === 0)}>
                                {saving ? 'Saving…' : 'Save prediction'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                    </div>
                ) : scorePrediction && !editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Your pick:</span>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {scorePrediction.team_a_score} – {scorePrediction.team_b_score}
                        </span>
                        {!locked && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>}
                    </div>
                ) : !locked ? (
                    <button className="btn btn-primary" onClick={() => setEditing(true)} style={{ minWidth: 130 }}>
                        Make prediction
                    </button>
                ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>You didn&apos;t predict this one</span>
                )}
            </div>
        </div>
    );
}

// ─── ScoringLegend ───────────────────────────────────────────────────────────
// The real rules for this league's match types (see lib/scoring.ts), shown up
// front so players know how points work before they pick.

function ScoringLegend({ hasRace, hasScore, hasSeries, sport }: { hasRace: boolean; hasScore: boolean; hasSeries: boolean; sport: string }) {
    const [open, setOpen] = useState(false);
    const unit = seriesUnit(sport);
    // In a best-of series, the right winner with the right margin always means the
    // exact result too (e.g. 2–0 / 2–1), so the +3 tier only exists for score matches.
    const onlySeries = hasSeries && !hasScore;
    const tiers = [
        { pts: '+5', label: onlySeries ? 'Exact result' : 'Exact score', example: onlySeries ? `You said 2–1 in ${unit}, it ended 2–1` : 'You said 2–1, it ended 2–1' , bg: '#c6f135' },
        ...(onlySeries ? [] : [{ pts: '+3', label: 'Right winner and margin', example: 'You said 3–2, it ended 2–1 (won by one)', bg: '#ffd2bf' }]),
        { pts: '+2', label: 'Right winner', example: onlySeries ? `You said 2–0, it ended 2–1` : 'You said 1–0, it ended 3–1', bg: '#dde7ff' },
        { pts: '0', label: 'Wrong winner', example: onlySeries ? 'You said 2–0, it ended 1–2' : 'You said 2–0, it ended 0–1', bg: '#ffffff' },
    ];
    return (
        <section aria-labelledby="scoring-title" style={{ background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 16, padding: '0.9rem 1.1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h2 id="scoring-title" style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>How points work</h2>
                <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                    {open ? 'Hide examples' : 'Show examples'}
                </button>
            </div>
            {(hasScore || hasSeries || !hasRace) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {tiers.map(t => (
                        <div key={t.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', padding: '0.55rem 0.7rem', borderRadius: 12, border: '1.5px solid var(--ink)', background: t.bg }}>
                            <span style={{ fontWeight: 900, fontSize: '1.15rem' }}>{t.pts}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.label}</span>
                            {open && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.example}</span>}
                        </div>
                    ))}
                </div>
            ) : null}
            {hasRace && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <p style={{ margin: 0 }}>
                        <strong style={{ color: 'var(--ink)' }}>Formula 1: </strong>
                        each driver in your Top 10 scores <strong>5</strong> in the exact place, <strong>3</strong> one place off,
                        {' '}<strong>2</strong> two places off, <strong>1</strong> if they finish anywhere in the Top 10.
                    </p>
                    {open && (
                        <p style={{ margin: '0.4rem 0 0' }}>
                            Race bonuses (main race only): winner +3, exact podium +5 (right three drivers in any order +3),
                            pole +3, fastest lap +3, first retirement +2, safety car +2, plus any extra questions your organiser switched on.
                            Qualifying scores the order only (3 exact, 1 one place off). Sprints count half; the season finale counts double.
                        </p>
                    )}
                </div>
            )}
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {(hasScore || hasSeries) && <>A score or series match gives the single highest rule you hit; those don&apos;t add up. </>}
                Everyone scores the same way, Premium or not.
            </p>
        </section>
    );
}
