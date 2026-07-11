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
import type { MatchType, SeriesFormat, RaceSession } from '@/lib/types';
import { scoringRulesLabel, calculateRaceWeekendPoints, raceSessionMultiplier } from '@/lib/scoring';

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
    qualifying:       { label: 'QUALI',   color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)' },
    sprint_qualifying:{ label: 'SQ',      color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.35)' },
    sprint:           { label: 'SPRINT',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)' },
    race:             { label: 'RACE',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)' },
};

const avatarLetters = (name: string) => name.slice(0, 2).toUpperCase();
const formatDT = (ts: number) => new Date(ts * 1000).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

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

    const submitScorePrediction = async (matchId: string, teamAScore: number, teamBScore: number) => {
        await fetch('/api/predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, teamAScore, teamBScore }),
        });
        fetchData();
    };

    const submitRaceWeekendPrediction = async (matchId: string, form: RaceWeekendFormState) => {
        await fetch('/api/race-weekend-predictions', {
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
                    title="Predictions"
                    subtitle={tournamentName || undefined}
                    image={sportImage(tournamentSport)}
                    actions={
                        <>
                            {isCreator && <Link href={`/manage/${tournamentId}`} className="btn btn-secondary">Manage</Link>}
                            <Link href={`/leaderboard/${tournamentId}`} className="btn btn-secondary">Rankings</Link>
                            <Link href="/tournaments" className="btn btn-secondary">All leagues</Link>
                        </>
                    }
                />

                {/* Scoring rules */}
                <div className="scoring-rules-row">
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.03em' }}>SCORING</span>
                    {hasRace ? (
                        <>
                            <span><strong style={{ color: '#fbbf24' }}>+5 pts</strong> <span style={{ color: 'var(--text-muted)' }}>Exact P1</span></span>
                            <span><strong style={{ color: '#94a3b8' }}>+3 pts</strong> <span style={{ color: 'var(--text-muted)' }}>Exact P2</span></span>
                            <span><strong style={{ color: '#b45309' }}>+2 pts</strong> <span style={{ color: 'var(--text-muted)' }}>Exact P3</span></span>
                            <span><strong style={{ color: '#818cf8' }}>+1 pt</strong> <span style={{ color: 'var(--text-muted)' }}>Driver in wrong slot</span></span>
                        </>
                    ) : (
                        <>
                            <span><strong style={{ color: '#4facfe' }}>+5 pts</strong> <span style={{ color: 'var(--text-muted)' }}>Exact {hasSeries ? 'series' : 'score'}</span></span>
                            <span><strong style={{ color: '#48bb78' }}>+3 pts</strong> <span style={{ color: 'var(--text-muted)' }}>Winner &amp; margin</span></span>
                            <span><strong style={{ color: '#667eea' }}>+2 pts</strong> <span style={{ color: 'var(--text-muted)' }}>Correct winner</span></span>
                            <span><strong style={{ color: 'var(--text-muted)' }}>+0 pts</strong> <span style={{ color: 'var(--text-muted)' }}>Wrong</span></span>
                        </>
                    )}
                </div>

                {/* Summary bar */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    {[
                        { label: 'Open', count: upcomingMatches.length, color: '#4facfe' },
                        { label: 'Live', count: liveMatches.length, color: '#f5576c' },
                        { label: 'Finished', count: finishedMatches.length, color: 'var(--text-muted)' },
                    ].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', border: `1px solid var(--border-color)`, padding: '0.4rem 0.85rem', borderRadius: '999px', fontSize: '0.85rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                            <span style={{ color: s.color, fontWeight: 700 }}>{s.count}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {matches.length === 0 && (
                    <div className="empty-state">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/img/sport-floodlight.png" alt="" className="empty-state-img" />
                        <h3>No matches yet</h3>
                        <p>The league organiser hasn't added any matches yet. Check back soon!</p>
                    </div>
                )}

                {upcomingMatches.length > 0 && (
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="match-section-header">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4facfe', display: 'inline-block' }} />
                            Open for Predictions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {upcomingMatches.map(m => (
                                <PredCard key={m.id} match={m} tournamentId={tournamentId}
                                    scorePrediction={scorePreds[m.id]} racePrediction={racePreds[m.id]}
                                    onSubmitScore={submitScorePrediction} onSubmitRaceWeekend={submitRaceWeekendPrediction}
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
                            <span className="match-live-dot" /> Live / Locked
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {liveMatches.map(m => (
                                <PredCard key={m.id} match={m} tournamentId={tournamentId}
                                    scorePrediction={scorePreds[m.id]} racePrediction={racePreds[m.id]}
                                    onSubmitScore={submitScorePrediction} onSubmitRaceWeekend={submitRaceWeekendPrediction}
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
    match, tournamentId,
    scorePrediction, racePrediction,
    onSubmitScore, onSubmitRaceWeekend,
    locked = false, showResult = false,
    isPremium = false, onLoadStats,
    stats, statsOpen, statsLoading,
}: {
    match: Match; tournamentId: string;
    scorePrediction?: ScorePrediction; racePrediction?: RaceWeekendPrediction;
    onSubmitScore: (id: string, a: number, b: number) => void;
    onSubmitRaceWeekend: (id: string, form: RaceWeekendFormState) => void;
    locked?: boolean; showResult?: boolean;
    isPremium?: boolean; onLoadStats?: (id: string) => void;
    stats?: MatchStats; statsOpen?: boolean; statsLoading?: boolean;
}) {
    const matchType = match.match_type ?? 'score';

    if (matchType === 'race') {
        return <RaceCard match={match} tournamentId={tournamentId} racePrediction={racePrediction}
            onSubmitRaceWeekend={onSubmitRaceWeekend} locked={locked} showResult={showResult} />;
    }

    return <ScoreCard match={match} tournamentId={tournamentId}
        scorePrediction={scorePrediction} onSubmitScore={onSubmitScore}
        locked={locked} showResult={showResult}
        isPremium={isPremium} onLoadStats={onLoadStats}
        stats={stats} statsOpen={statsOpen} statsLoading={statsLoading} />;
}

// ─── RaceCard ────────────────────────────────────────────────────────────────

function RaceCard({ match, tournamentId, racePrediction, onSubmitRaceWeekend, locked, showResult }: {
    match: Match; tournamentId: string; racePrediction?: RaceWeekendPrediction;
    onSubmitRaceWeekend: (id: string, form: RaceWeekendFormState) => void;
    locked?: boolean; showResult?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<RaceWeekendFormState>(raceWeekendToForm(racePrediction));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(raceWeekendToForm(racePrediction));
    }, [racePrediction]);

    const sessionBadge = match.race_session ? SESSION_BADGE[match.race_session] : null;

    const timeLeft = Math.floor((match.scheduled_time * 1000 - Date.now()) / 1000);
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);

    const handleSave = async () => {
        if (form.picks.length < 3) return;
        setSaving(true);
        await onSubmitRaceWeekend(match.id, form);
        setEditing(false);
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
            match.race_session ?? null, multiplier
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
                </div>

                {showResult && match.top10_result ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'flex-end', maxWidth: 200 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOP 3</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                            {match.top10_result.slice(0, 3).join(' · ')}
                        </span>
                    </div>
                ) : !locked && (
                    <span className="match-vs-badge">VS</span>
                )}
            </div>

            {/* Result points overlay */}
            {result && (
                <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: result.total >= 10 ? '#fbbf24' : result.total >= 5 ? '#38bdf8' : result.total > 0 ? '#818cf8' : 'var(--text-muted)' }}>
                        +{result.total} pts
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {result.breakdown.length ? result.breakdown.map(b => `${b.label} +${b.points}`).join(' · ') : 'No points'}
                    </span>
                </div>
            )}

            {/* Footer */}
            <div className="match-card-footer">
                <span className="match-time">{formatDT(match.scheduled_time)}</span>

                {editing && !locked ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', paddingTop: '0.5rem' }}>
                        <RaceWeekendEditor
                            tournamentId={tournamentId}
                            raceSession={match.race_session}
                            value={form}
                            onChange={setForm}
                            mode="predict"
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
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>My picks:</span>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {racePrediction.picks.slice(0, 3).map((driver, i) => (
                                <span key={driver} style={{ fontSize: '0.8rem', fontWeight: 700, color: ['#fbbf24', '#94a3b8', '#b45309'][i] }}>
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
                    <button className="btn btn-primary" onClick={() => setEditing(true)}>Predict this weekend</button>
                ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No prediction made</span>
                )}
            </div>
        </div>
    );
}

// ─── ScoreCard (handles both 'score' and 'series') ────────────────────────────

function ScoreCard({ match, tournamentId, scorePrediction, onSubmitScore, locked = false, showResult = false, isPremium = false, onLoadStats, stats, statsOpen, statsLoading }: {
    match: Match; tournamentId: string;
    scorePrediction?: ScorePrediction;
    onSubmitScore: (id: string, a: number, b: number) => void;
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
        critical: { background: 'rgba(245,87,108,0.15)', color: '#f5576c', border: '1px solid rgba(245,87,108,0.4)', animation: 'urgentPulse 1.2s ease-in-out infinite' },
        warning:  { background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.35)' },
        soon:     { background: 'rgba(251,191,36,0.1)',  color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' },
        normal:   { background: 'rgba(56,189,248,0.08)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' },
    };

    const handleSave = async () => {
        setSaving(true);
        await onSubmitScore(match.id, scores.a, scores.b);
        setEditing(false);
        setSaving(false);
    };

    const resultPoints = () => {
        if (!showResult || match.team_a_score === null || !scorePrediction) return null;
        const predA = scorePrediction.team_a_score, predB = scorePrediction.team_b_score;
        const actualA = match.team_a_score, actualB = match.team_b_score!;
        if (predA === actualA && predB === actualB) return { pts: 5, label: 'Exact!', color: '#4facfe' };
        const predW = predA > predB ? 'A' : predA < predB ? 'B' : 'draw';
        const actualW = actualA > actualB ? 'A' : actualA < actualB ? 'B' : 'draw';
        const correctWinner = predW === actualW;
        const correctGap = Math.abs(predA - predB) === Math.abs(actualA - actualB);
        if (correctWinner && correctGap) return { pts: 3, label: 'Winner + margin', color: '#48bb78' };
        if (correctWinner) return { pts: 2, label: 'Winner', color: '#667eea' };
        return { pts: 0, label: 'Wrong', color: 'var(--text-muted)' };
    };
    const result = resultPoints();

    return (
        <div className="match-card" style={{ overflow: 'visible' }}>
            {/* Series format badge */}
            {isSeries && (
                <div style={{ padding: '0.5rem 1rem 0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                        fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.55rem',
                        borderRadius: '999px', background: 'rgba(129,140,248,0.12)',
                        color: '#818cf8', border: '1px solid rgba(129,140,248,0.35)',
                        letterSpacing: '0.06em',
                    }}>{seriesFormat}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Map wins</span>
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
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(129,140,248,0.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.35)', letterSpacing: '0.04em' }}>⚔️ KNOCKOUT</span>
                    )}
                    {showResult && match.team_a_score !== null ? (
                        <div className="score-result">{match.team_a_score} – {match.team_b_score}</div>
                    ) : (
                        <span className="match-vs-badge">VS</span>
                    )}
                    {result && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: result.color }}>{result.label} +{result.pts}pts</span>
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
                    <button style={{ fontSize: '0.75rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                        onClick={() => onLoadStats?.(match.id)}>
                        {statsOpen ? 'Hide' : 'Community predictions'}
                    </button>
                </div>
            )}
            {isPremium && statsOpen && stats && (
                <div style={{ margin: '0 1rem 0.75rem', padding: '0.85rem', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 'var(--radius-md)' }}>
                    {statsLoading && !stats ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Loading…</p> : stats.total > 0 ? (
                        <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 600 }}>📊 COMMUNITY — {stats.total} prediction{stats.total !== 1 ? 's' : ''}</div>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.6rem', fontSize: '0.78rem', fontWeight: 700 }}>
                                <span style={{ color: '#38bdf8', minWidth: 28 }}>{stats.homeWin}%</span>
                                <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--bg-tertiary)', overflow: 'hidden', display: 'flex' }}>
                                    <div style={{ width: `${stats.homeWin}%`, background: '#38bdf8', transition: 'width 0.4s' }} />
                                    <div style={{ width: `${stats.draw}%`, background: '#818cf8', transition: 'width 0.4s' }} />
                                    <div style={{ width: `${stats.awayWin}%`, background: '#f97316', transition: 'width 0.4s' }} />
                                </div>
                                <span style={{ color: '#f97316', minWidth: 28, textAlign: 'right' }}>{stats.awayWin}%</span>
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
                    {countdownUrgency === 'critical' ? `Closes in ${minutes}m — predict now!` : countdownUrgency === 'warning' ? `${hours}h ${minutes}m left` : `Closes in ${hours}h ${minutes}m`}
                </div>
            )}

            {/* Footer */}
            <div className="match-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="match-time">{formatDT(match.scheduled_time)}</span>
                    {countdownUrgency === 'normal' && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: '999px', ...urgencyStyle.normal }}>
                            {hours}h {minutes}m
                        </span>
                    )}
                    {locked && !showResult && <span style={{ fontSize: '0.8rem', color: '#f5576c', fontWeight: 600 }}>Locked</span>}
                </div>

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
                            <button className="btn btn-success btn-sm" onClick={handleSave}
                                disabled={saving || playoffTieBlocked || (isSeries && scores.a === 0 && scores.b === 0)}
                                title={playoffTieBlocked ? 'Tied scores not allowed in knockout matches' : undefined}>
                                {saving ? '…' : 'Save'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                    </div>
                ) : scorePrediction && !editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>My pick:</span>
                        <span style={{ fontWeight: 700, color: '#667eea', fontSize: '0.95rem' }}>
                            {scorePrediction.team_a_score} – {scorePrediction.team_b_score}
                        </span>
                        {!locked && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>}
                    </div>
                ) : !locked ? (
                    <button className="btn btn-primary" onClick={() => setEditing(true)} style={{ minWidth: 130 }}>
                        {isSeries ? 'Pick result' : 'Make prediction'}
                    </button>
                ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No prediction made</span>
                )}
            </div>
        </div>
    );
}
