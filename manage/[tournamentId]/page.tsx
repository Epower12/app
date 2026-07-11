'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import ScoreStepper from '../../components/ScoreStepper';
import RaceWeekendEditor, { emptyRaceWeekendForm, type RaceWeekendFormState } from '../../components/RaceWeekendEditor';
import type { MatchType, SeriesFormat, RaceSession } from '@/lib/types';
import { defaultMatchType, defaultSeriesFormat, SUPPORTED_SPORTS } from '@/lib/types';

interface Match {
    id: string; team_a: string; team_b: string; scheduled_time: number;
    team_a_score: number | null; team_b_score: number | null;
    is_finished: boolean; sport: string; source: string; is_playoff: boolean;
    team_a_logo?: string | null; team_b_logo?: string | null;
    match_type?: MatchType; series_format?: SeriesFormat | null;
    race_session?: RaceSession | null;
    top10_result?: string[] | null;
    pole_result?: string | null; fastest_lap_result?: string | null; first_retirement_result?: string | null;
    safety_car_result?: boolean | null;
    positions_gained_result?: string | null; positions_lost_result?: string | null;
    winning_margin_result?: string | null; retirements_result?: string | null;
    is_season_finale?: boolean;
}

function raceResultToForm(m?: Match): RaceWeekendFormState {
    if (!m) return { ...emptyRaceWeekendForm, picks: [] };
    return {
        picks: m.top10_result ?? [],
        pole: m.pole_result ?? '',
        fastestLap: m.fastest_lap_result ?? '',
        firstRetirement: m.first_retirement_result ?? '',
        safetyCar: m.safety_car_result === true ? 'yes' : m.safety_car_result === false ? 'no' : '',
        positionsGained: m.positions_gained_result ?? '',
        positionsLost: m.positions_lost_result ?? '',
        winningMargin: (m.winning_margin_result as any) ?? '',
        retirements: (m.retirements_result as any) ?? '',
    };
}

interface RaceDriver { id: string; driver_name: string; team_name: string | null; number: number | null; }
interface ApiLeague { id: number; name: string; season: number; match_count: number; provider: 'api-sports' | 'nhl' | 'jolpica-f1'; }
interface ApiMatch {
    id: number; home_team: string; away_team: string; match_time: number;
    status: string; home_score: number | null; away_score: number | null;
}
interface ApiRace {
    id: number; race_name: string; round: number; race_time: number; status: string;
    p1_driver: string | null; p2_driver: string | null; p3_driver: string | null;
}
interface PresetMatch { teamA: string; teamB: string; scheduledTime: number; sport: string; }
interface PresetSummary {
    id: string; name: string; sport: string; icon: string;
    venue: string; dateRange: string; description: string;
    notes?: string; matchCount: number;
}

// Inline team logo with letter fallback
function TeamLogoChip({ name, logo, size = 26 }: { name: string; logo?: string | null; size?: number }) {
    const [broken, setBroken] = useState(false);
    if (logo && !broken) {
        return (
            <img
                src={logo}
                alt={name}
                onError={() => setBroken(true)}
                style={{ width: size, height: size, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: 2, flexShrink: 0 }}
            />
        );
    }
    return (
        <div style={{
            width: size, height: size, borderRadius: 6, background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: '1px solid var(--border-color)',
        }}>
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

const fmt = (ts: number) => new Date(ts * 1000).toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
});

export default function ManagePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.tournamentId as string;

    const [matches, setMatches] = useState<Match[]>([]);
    const [tournamentName, setTournamentName] = useState('');
    const [tournamentSport, setTournamentSport] = useState('');
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'matches' | 'manual' | 'import' | 'preset' | 'drivers'>('matches');

    // Driver roster state (F1/MotoGP)
    const [drivers, setDrivers] = useState<RaceDriver[]>([]);
    const [driverForm, setDriverForm] = useState({ name: '', team: '', number: '' });
    const [driverLoading, setDriverLoading] = useState(false);
    const [driverMsg, setDriverMsg] = useState('');

    // Race result state (per match, for race-type matches)
    const [editingRaceResult, setEditingRaceResult] = useState<string | null>(null);
    const [raceResultForm, setRaceResultForm] = useState<RaceWeekendFormState>({ ...emptyRaceWeekendForm, picks: [] });
    const [raceResultFinale, setRaceResultFinale] = useState(false);
    const [raceResultLoading, setRaceResultLoading] = useState(false);

    // Manual form state
    const [manualForm, setManualForm] = useState({
        teamA: '', teamB: '', scheduledTime: '', sport: 'Ice Hockey', isPlayoff: false,
        matchType: 'score' as MatchType, seriesFormat: null as SeriesFormat | null,
        raceSession: null as RaceSession | null,
    });
    const [manualLoading, setManualLoading] = useState(false);
    const [manualMsg, setManualMsg] = useState('');

    // Import state
    const [apiLeagues, setApiLeagues] = useState<ApiLeague[]>([]);
    const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
    const [apiMatches, setApiMatches] = useState<ApiMatch[]>([]);
    const [apiRaces, setApiRaces] = useState<ApiRace[]>([]);
    const [selectedMatchIds, setSelectedMatchIds] = useState<Set<number>>(new Set());
    const [importLoading, setImportLoading] = useState(false);
    const [importMsg, setImportMsg] = useState('');
    const [leagueLoading, setLeagueLoading] = useState(false);

    // Preset import state
    const [presetLoading, setPresetLoading] = useState(false);
    const [presetMsg, setPresetMsg] = useState('');
    const [presetMatches, setPresetMatches] = useState<PresetMatch[]>([]);
    const [presetSelected, setPresetSelected] = useState<Set<number>>(new Set());
    const [presetFetching, setPresetFetching] = useState(false);
    const [presetList, setPresetList] = useState<PresetSummary[]>([]);
    const [activePresetId, setActivePresetId] = useState<string>('');

    // Score editing state
    const [editingScore, setEditingScore] = useState<string | null>(null);
    const [scoreForm, setScoreForm] = useState({ a: 0, b: 0 });
    const [scoreLoading, setScoreLoading] = useState(false);

    // Match details editing state
    const [editingMatch, setEditingMatch] = useState<string | null>(null);
    const [matchEditForm, setMatchEditForm] = useState({ teamA: '', teamB: '', scheduledTime: '', sport: 'Ice Hockey', isPlayoff: false });
    const [matchEditLoading, setMatchEditLoading] = useState(false);
    const [matchEditMsg, setMatchEditMsg] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (session) fetchData();
    }, [session, tournamentId]);

    const user = session?.user as any;
    const [isCreator, setIsCreator] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [mRes, tRes] = await Promise.all([
                fetch(`/api/matches?tournamentId=${tournamentId}`),
                fetch(`/api/tournaments?id=${tournamentId}`),
            ]);
            const [mData, tData] = await Promise.all([mRes.json(), tRes.json()]);
            setMatches(mData);
            setTournamentName(tData?.name ?? '');
            const sport = tData?.sport ?? '';
            setTournamentSport(sport);
            setIsCreator(tData?.created_by === user?.id);
            // Pre-fetch drivers if this is a race-type tournament
            if (sport === 'Formula 1' || sport === 'MotoGP') {
                fetch(`/api/race-drivers?tournamentId=${tournamentId}`)
                    .then(r => r.ok ? r.json() : [])
                    .then(setDrivers)
                    .catch(() => {});
            }
        } catch { /* ignore */ }
        setLoading(false);
    };

    const fetchApiLeagues = async () => {
        const res = await fetch('/api/owner/api-leagues');
        if (res.ok) setApiLeagues(await res.json());
    };

    const selectedLeagueProvider = apiLeagues.find(l => l.id === selectedLeague)?.provider;
    const isRaceLeague = selectedLeagueProvider === 'jolpica-f1';

    const fetchApiMatches = async (leagueId: number) => {
        setLeagueLoading(true);
        setApiMatches([]);
        setApiRaces([]);
        setSelectedMatchIds(new Set());
        const res = await fetch(`/api/owner/api-leagues?leagueId=${leagueId}`);
        if (res.ok) {
            const data = await res.json();
            const league = apiLeagues.find(l => l.id === leagueId);
            if (league?.provider === 'jolpica-f1') setApiRaces(data);
            else setApiMatches(data);
        }
        setLeagueLoading(false);
    };

    const fetchDrivers = async () => {
        const res = await fetch(`/api/race-drivers?tournamentId=${tournamentId}`);
        if (res.ok) setDrivers(await res.json());
    };

    const handleAddDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        setDriverLoading(true);
        setDriverMsg('');
        const res = await fetch('/api/race-drivers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tournamentId, driverName: driverForm.name, teamName: driverForm.team, number: driverForm.number ? parseInt(driverForm.number) : null }),
        });
        if (res.ok) {
            setDriverMsg('✅ Driver added!');
            setDriverForm({ name: '', team: '', number: '' });
            fetchDrivers();
        } else {
            const d = await res.json();
            setDriverMsg(`❌ ${d.error}`);
        }
        setDriverLoading(false);
    };

    const handleDeleteDriver = async (id: string) => {
        await fetch(`/api/race-drivers?id=${id}`, { method: 'DELETE' });
        fetchDrivers();
    };

    const saveRaceResult = async (matchId: string) => {
        if (raceResultForm.picks.length < 3) return;
        setRaceResultLoading(true);
        const res = await fetch(`/api/matches/${matchId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                top10_result: raceResultForm.picks,
                pole_result: raceResultForm.pole || null,
                fastest_lap_result: raceResultForm.fastestLap || null,
                first_retirement_result: raceResultForm.firstRetirement || null,
                safety_car_result: raceResultForm.safetyCar === 'yes' ? true : raceResultForm.safetyCar === 'no' ? false : null,
                positions_gained_result: raceResultForm.positionsGained || null,
                positions_lost_result: raceResultForm.positionsLost || null,
                winning_margin_result: raceResultForm.winningMargin || null,
                retirements_result: raceResultForm.retirements || null,
                is_season_finale: raceResultFinale,
                is_finished: true,
            }),
        });
        if (res.ok) { setEditingRaceResult(null); fetchData(); }
        setRaceResultLoading(false);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setManualLoading(true);
        setManualMsg('');
        const dt = new Date(manualForm.scheduledTime);
        const res = await fetch('/api/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tournamentId,
                teamA: manualForm.teamA,
                teamB: manualForm.teamB,
                scheduledTime: Math.floor(dt.getTime() / 1000),
                sport: manualForm.sport,
                isPlayoff: manualForm.isPlayoff,
                matchType: manualForm.matchType,
                seriesFormat: manualForm.seriesFormat,
                raceSession: manualForm.raceSession,
            }),
        });
        if (res.ok) {
            setManualMsg('✅ Match added!');
            setManualForm({ teamA: '', teamB: '', scheduledTime: '', sport: manualForm.sport, isPlayoff: false, matchType: manualForm.matchType, seriesFormat: manualForm.seriesFormat, raceSession: null });
            fetchData();
        } else {
            const d = await res.json();
            setManualMsg(`❌ ${d.error}`);
        }
        setManualLoading(false);
    };

    const handleImport = async () => {
        if (!selectedMatchIds.size) return;
        setImportLoading(true);
        setImportMsg('');
        const endpoint = isRaceLeague ? '/api/matches/import-race' : '/api/matches/import';
        const idsKey = isRaceLeague ? 'apiRaceIds' : 'apiMatchIds';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tournamentId, [idsKey]: Array.from(selectedMatchIds) }),
        });
        const data = await res.json();
        if (res.ok) {
            setImportMsg(`✅ Imported ${data.imported} ${isRaceLeague ? 'race' : 'match'}${data.imported !== 1 ? (isRaceLeague ? 's' : 'es') : ''}${data.skipped ? ` (${data.skipped} already existed)` : ''}.`);
            setSelectedMatchIds(new Set());
            fetchData();
        } else {
            setImportMsg(`❌ ${data.error}`);
        }
        setImportLoading(false);
    };

    const toggleMatch = (id: number) => {
        setSelectedMatchIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelectedMatchIds(new Set((isRaceLeague ? apiRaces : apiMatches).map(m => m.id)));
    const clearAll = () => setSelectedMatchIds(new Set());

    const fetchPresetList = async () => {
        if (presetList.length) return; // already loaded
        const res = await fetch('/api/matches/bulk');
        if (res.ok) {
            const data = await res.json();
            setPresetList(data.presets ?? []);
            // Auto-select the first preset on initial load
            if (!activePresetId && data.presets?.length) {
                const firstId = data.presets[0].id;
                setActivePresetId(firstId);
                fetchPresetMatches(firstId);
            }
        }
    };

    const fetchPresetMatches = async (presetId: string) => {
        setPresetFetching(true);
        setPresetMatches([]);
        setPresetSelected(new Set());
        setPresetMsg('');
        try {
            const res = await fetch(`/api/matches/bulk?preset=${presetId}`);
            if (res.ok) {
                const data = await res.json();
                setPresetMatches(data.matches ?? []);
            }
        } finally {
            setPresetFetching(false);
        }
    };

    const onPresetChange = (id: string) => {
        setActivePresetId(id);
        fetchPresetMatches(id);
    };

    const togglePreset = (i: number) => {
        setPresetSelected(prev => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    };
    const selectAllPreset = () => setPresetSelected(new Set(presetMatches.map((_, i) => i)));
    const clearAllPreset = () => setPresetSelected(new Set());

    const importPreset = async () => {
        if (!activePresetId || presetSelected.size === 0) return;
        setPresetLoading(true);
        setPresetMsg('');
        const res = await fetch('/api/matches/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tournamentId,
                preset: activePresetId,
                selectedIndices: Array.from(presetSelected),
            }),
        });
        const data = await res.json();
        if (res.ok) {
            setPresetMsg(`✅ Imported ${data.inserted} matches${data.skipped ? ` (${data.skipped} already existed)` : ''}.`);
            setPresetSelected(new Set());
            fetchData();
        } else {
            setPresetMsg(`❌ ${data.error}`);
        }
        setPresetLoading(false);
    };

    const saveScore = async (matchId: string) => {
        setScoreLoading(true);
        const res = await fetch(`/api/matches/${matchId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_a_score: scoreForm.a, team_b_score: scoreForm.b, is_finished: true }),
        });
        if (res.ok) {
            setEditingScore(null);
            fetchData();
        }
        setScoreLoading(false);
    };

    const deleteMatch = async (matchId: string) => {
        if (!confirm('Delete this match? Predictions for it will also be removed.')) return;
        await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
        fetchData();
    };

    const openMatchEdit = (m: Match) => {
        // Convert unix timestamp back to datetime-local format
        const dt = new Date(m.scheduled_time * 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        const local = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        setMatchEditForm({ teamA: m.team_a, teamB: m.team_b, scheduledTime: local, sport: m.sport, isPlayoff: m.is_playoff });
        setMatchEditMsg('');
        setEditingMatch(m.id);
    };

    const saveMatchEdit = async (matchId: string) => {
        setMatchEditLoading(true);
        setMatchEditMsg('');
        const dt = new Date(matchEditForm.scheduledTime);
        const res = await fetch(`/api/matches/${matchId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team_a: matchEditForm.teamA,
                team_b: matchEditForm.teamB,
                scheduled_time: Math.floor(dt.getTime() / 1000),
                sport: matchEditForm.sport,
                is_playoff: matchEditForm.isPlayoff,
            }),
        });
        if (res.ok) {
            setEditingMatch(null);
            fetchData();
        } else {
            const d = await res.json();
            setMatchEditMsg(`❌ ${d.error}`);
        }
        setMatchEditLoading(false);
    };

    if (status === 'loading' || loading) {
        return (
            <div className="app-page"><Navbar />
                <div className="container" style={{ paddingTop: '2rem' }}>
                    {[1, 2, 3].map(i => <div key={i} className="loading" style={{ height: '80px', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />)}
                </div>
            </div>
        );
    }

    if (!loading && !isCreator) {
        return (
            <div className="app-page"><Navbar />
                <div className="container">
                    <div className="empty-state" style={{ paddingTop: '5rem' }}>
                        <div className="empty-state-icon">🚫</div>
                        <h3>Access Denied</h3>
                        <p>Only the league creator (or site admins) can manage matches.</p>
                        <Link href="/tournaments" className="btn btn-secondary">← Back to Leagues</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-page">
            <Navbar />
            <div className="container">
                {/* Header */}
                <div className="app-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="app-page-title">Manage matches</h1>
                        {tournamentName && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{tournamentName}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/predictions/${tournamentId}`} className="btn btn-secondary">🎯 Predictions</Link>
                        <Link href="/tournaments" className="btn btn-secondary">← Leagues</Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tab-bar">
                    <button className={`tab-btn ${tab === 'matches' ? 'tab-btn-active' : ''}`} onClick={() => setTab('matches')}>
                        📋 Matches <span style={{ opacity: 0.7, marginLeft: '0.3rem' }}>({matches.length})</span>
                    </button>
                    <button className={`tab-btn ${tab === 'manual' ? 'tab-btn-active' : ''}`} onClick={() => setTab('manual')}>
                        ✏️ Add Manual
                    </button>
                    <button className={`tab-btn ${tab === 'import' ? 'tab-btn-active' : ''}`} onClick={() => { setTab('import'); fetchApiLeagues(); }}>
                        ↓ Import from League
                    </button>
                    <button className={`tab-btn ${tab === 'preset' ? 'tab-btn-active' : ''}`} onClick={() => { setTab('preset'); fetchPresetList(); }}>
                        🏆 Tournament Presets
                    </button>
                    {(tournamentSport === 'Formula 1' || tournamentSport === 'MotoGP') && (
                        <button className={`tab-btn ${tab === 'drivers' ? 'tab-btn-active' : ''}`} onClick={() => { setTab('drivers'); fetchDrivers(); }}>
                            🏎️ Driver Roster
                        </button>
                    )}
                </div>

                {/* --- MATCHES LIST --- */}
                {tab === 'matches' && (
                    <div>
                        {matches.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📋</div>
                                <h3>No matches yet</h3>
                                <p>Add matches manually or import them from an API league.</p>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                    <button className="btn btn-primary" onClick={() => setTab('manual')}>✏️ Add Manual</button>
                                    <button className="btn btn-secondary" onClick={() => { setTab('import'); fetchApiLeagues(); }}>↓ Import</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {matches.map(m => (
                                    <div key={m.id} className="match-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                                                <TeamLogoChip name={m.team_a} logo={m.team_a_logo} />
                                                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                                    {m.team_a} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {m.team_b}
                                                </span>
                                                <TeamLogoChip name={m.team_b} logo={m.team_b_logo} />
                                                <span style={{
                                                    fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700,
                                                    background: m.source === 'api' ? 'rgba(56,189,248,0.15)' : 'var(--bg-tertiary)',
                                                    color: m.source === 'api' ? 'var(--color-primary)' : 'var(--text-muted)',
                                                    border: `1px solid ${m.source === 'api' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                }}>
                                                    {m.source === 'api' ? '🔗 API' : '✏️ Manual'}
                                                </span>
                                                {m.is_playoff && (
                                                    <span style={{
                                                        fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700,
                                                        background: 'rgba(129,140,248,0.15)', color: '#818cf8',
                                                        border: '1px solid rgba(129,140,248,0.35)',
                                                    }}>⚔️ Knockout</span>
                                                )}
                                                {m.is_finished && m.match_type === 'race' && m.top10_result && m.top10_result.length > 0 && (
                                                    <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700 }}>
                                                        {m.top10_result.slice(0, 3).join(' · ')} ✓
                                                    </span>
                                                )}
                                                {m.match_type === 'race' && m.is_season_finale && (
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.35)' }}>
                                                        ×2 FINALE
                                                    </span>
                                                )}
                                                {m.is_finished && m.match_type !== 'race' && (
                                                    <span style={{ fontSize: '0.85rem', color: '#48bb78', fontWeight: 700 }}>
                                                        {m.team_a_score} – {m.team_b_score} ✓
                                                    </span>
                                                )}
                                                {m.match_type === 'series' && m.series_format && (
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(129,140,248,0.1)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.3)' }}>
                                                        {m.series_format}
                                                    </span>
                                                )}
                                                {m.match_type === 'race' && m.race_session && (
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                                                        {m.race_session.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => editingMatch === m.id ? setEditingMatch(null) : openMatchEdit(m)}
                                                >
                                                    ✏️ Edit
                                                </button>
                                                {m.match_type === 'race' ? (
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => {
                                                            setEditingRaceResult(editingRaceResult === m.id ? null : m.id);
                                                            setRaceResultForm(raceResultToForm(m));
                                                            setRaceResultFinale(!!m.is_season_finale);
                                                        }}
                                                    >
                                                        {m.is_finished ? 'Edit result' : 'Enter result'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => {
                                                            setEditingScore(editingScore === m.id ? null : m.id);
                                                            setScoreForm({ a: m.team_a_score ?? 0, b: m.team_b_score ?? 0 });
                                                        }}
                                                    >
                                                        {m.is_finished ? '🔄 Score' : '+ Score'}
                                                    </button>
                                                )}
                                                <button className="btn btn-danger btn-sm" onClick={() => deleteMatch(m.id)}>🗑</button>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>📅 {fmt(m.scheduled_time)}</div>

                                        {/* Inline match details editor */}
                                        {editingMatch === m.id && (
                                            <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Home Team</label>
                                                        <input className="input" value={matchEditForm.teamA}
                                                            onChange={e => setMatchEditForm(f => ({ ...f, teamA: e.target.value }))} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Away Team</label>
                                                        <input className="input" value={matchEditForm.teamB}
                                                            onChange={e => setMatchEditForm(f => ({ ...f, teamB: e.target.value }))} />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Date & Time</label>
                                                        <input className="input" type="datetime-local" value={matchEditForm.scheduledTime}
                                                            onChange={e => setMatchEditForm(f => ({ ...f, scheduledTime: e.target.value }))} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Sport</label>
                                                        <select className="input" value={matchEditForm.sport}
                                                            onChange={e => setMatchEditForm(f => ({ ...f, sport: e.target.value }))}>
                                                            <option>Ice Hockey</option>
                                                            <option>Football</option>
                                                            <option>Basketball</option>
                                                            <option>Tennis</option>
                                                            <option>Volleyball</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                    <input type="checkbox" checked={matchEditForm.isPlayoff}
                                                        onChange={e => setMatchEditForm(f => ({ ...f, isPlayoff: e.target.checked }))}
                                                        style={{ width: 16, height: 16, accentColor: '#818cf8' }} />
                                                    <span style={{ color: matchEditForm.isPlayoff ? '#818cf8' : 'var(--text-secondary)', fontWeight: 600 }}>
                                                        ⚔️ Knockout / Playoff game
                                                    </span>
                                                </label>
                                                {matchEditMsg && <p style={{ margin: 0, fontSize: '0.82rem', color: '#f56565' }}>{matchEditMsg}</p>}
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-primary btn-sm" onClick={() => saveMatchEdit(m.id)} disabled={matchEditLoading}>
                                                        {matchEditLoading ? '…' : '✓ Save changes'}
                                                    </button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingMatch(null)}>Cancel</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Inline score editor (score/series) */}
                                        {editingScore === m.id && m.match_type !== 'race' && (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Final score:</span>
                                                <ScoreStepper value={scoreForm.a} onChange={v => setScoreForm(f => ({ ...f, a: v }))} />
                                                <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '1.1rem' }}>–</span>
                                                <ScoreStepper value={scoreForm.b} onChange={v => setScoreForm(f => ({ ...f, b: v }))} />
                                                <button className="btn btn-success btn-sm" onClick={() => saveScore(m.id)} disabled={scoreLoading}>
                                                    {scoreLoading ? '…' : '✓ Save'}
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingScore(null)}>Cancel</button>
                                            </div>
                                        )}

                                        {/* Race weekend result editor */}
                                        {editingRaceResult === m.id && m.match_type === 'race' && (
                                            <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>Enter race weekend result</div>

                                                <RaceWeekendEditor
                                                    tournamentId={tournamentId}
                                                    raceSession={m.race_session ?? null}
                                                    value={raceResultForm}
                                                    onChange={setRaceResultForm}
                                                    mode="result"
                                                />

                                                {m.race_session === 'race' && (
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                        <input type="checkbox" checked={raceResultFinale}
                                                            onChange={e => setRaceResultFinale(e.target.checked)}
                                                            style={{ width: 16, height: 16, accentColor: '#f97316' }} />
                                                        <span style={{ color: raceResultFinale ? '#f97316' : 'var(--text-secondary)', fontWeight: 600 }}>
                                                            Season finale — all points count double (×2)
                                                        </span>
                                                    </label>
                                                )}

                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-success btn-sm" onClick={() => saveRaceResult(m.id)}
                                                        disabled={raceResultLoading || raceResultForm.picks.length < 3}>
                                                        {raceResultLoading ? '…' : 'Save result'}
                                                    </button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingRaceResult(null)}>Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- MANUAL ADD --- */}
                {tab === 'manual' && (
                    <div className="owner-section" style={{ maxWidth: 540 }}>
                        <div className="owner-section-title">✏️ Add a Match Manually</div>
                        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Home Team</label>
                                    <input className="input" placeholder="e.g. Canada" value={manualForm.teamA}
                                        onChange={e => setManualForm(f => ({ ...f, teamA: e.target.value }))} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Away Team</label>
                                    <input className="input" placeholder="e.g. Sweden" value={manualForm.teamB}
                                        onChange={e => setManualForm(f => ({ ...f, teamB: e.target.value }))} required />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Date & Time</label>
                                <input className="input" type="datetime-local" value={manualForm.scheduledTime}
                                    onChange={e => setManualForm(f => ({ ...f, scheduledTime: e.target.value }))} required />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Sport</label>
                                <select className="input" value={manualForm.sport} onChange={e => {
                                    const sport = e.target.value;
                                    const mt = defaultMatchType(sport);
                                    const sf = defaultSeriesFormat(sport);
                                    setManualForm(f => ({ ...f, sport, matchType: mt, seriesFormat: sf, raceSession: null }));
                                }}>
                                    {SUPPORTED_SPORTS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Match type — auto-set but overridable */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Match Type</label>
                                    <select className="input" value={manualForm.matchType} onChange={e => setManualForm(f => ({ ...f, matchType: e.target.value as MatchType }))}>
                                        <option value="score">Score (default)</option>
                                        <option value="series">Series (BO format)</option>
                                        <option value="race">Race (podium)</option>
                                    </select>
                                </div>
                                {manualForm.matchType === 'series' && (
                                    <div>
                                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Series Format</label>
                                        <select className="input" value={manualForm.seriesFormat ?? 'BO3'} onChange={e => setManualForm(f => ({ ...f, seriesFormat: e.target.value as SeriesFormat }))}>
                                            <option value="BO1">BO1</option>
                                            <option value="BO3">BO3</option>
                                            <option value="BO5">BO5</option>
                                        </select>
                                    </div>
                                )}
                                {manualForm.matchType === 'race' && (
                                    <div>
                                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Session</label>
                                        <select className="input" value={manualForm.raceSession ?? ''} onChange={e => setManualForm(f => ({ ...f, raceSession: e.target.value as RaceSession || null }))}>
                                            <option value="">— Select —</option>
                                            <option value="qualifying">⚡ Qualifying</option>
                                            <option value="sprint_qualifying">⚡ Sprint Qualifying</option>
                                            <option value="sprint">🔰 Sprint Race</option>
                                            <option value="race">🏁 Grand Prix</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {manualForm.matchType === 'race' && (
                                <div style={{ padding: '0.6rem 0.85rem', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: '#fbbf24' }}>
                                    🏎️ For race type: "Home Team" = circuit / event name (e.g. "Monaco Grand Prix"). "Away Team" = season/series (e.g. "2025 F1"). Make sure to add drivers in the <strong>Driver Roster</strong> tab first.
                                </div>
                            )}

                            {/* Playoff toggle */}
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                                padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                                background: manualForm.isPlayoff ? 'rgba(129,140,248,0.1)' : 'var(--bg-tertiary)',
                                border: `1px solid ${manualForm.isPlayoff ? 'rgba(129,140,248,0.4)' : 'var(--border-color)'}`,
                                transition: 'all 0.15s',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={manualForm.isPlayoff}
                                    onChange={e => setManualForm(f => ({ ...f, isPlayoff: e.target.checked }))}
                                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#818cf8' }}
                                />
                                <div>
                                    <div style={{ fontWeight: 700, color: manualForm.isPlayoff ? '#818cf8' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                                        ⚔️ Knockout / Playoff game
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                        Ties not allowed — users must predict a winner
                                    </div>
                                </div>
                            </label>

                            {manualMsg && (
                                <p style={{ fontSize: '0.88rem', color: manualMsg.startsWith('✅') ? '#48bb78' : '#f56565' }}>{manualMsg}</p>
                            )}
                            <button className="btn btn-primary" type="submit" disabled={manualLoading}>
                                {manualLoading ? 'Adding…' : '+ Add Match'}
                            </button>
                        </form>
                    </div>
                )}

                {/* --- TOURNAMENT PRESETS --- */}
                {tab === 'preset' && (
                    <div className="owner-section">
                        <div className="owner-section-title">🏆 Tournament Presets</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                            Pick a championship from the list, then choose which matches to add. Duplicates are skipped automatically.
                        </p>

                        {/* Preset selector */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                                Tournament
                            </label>
                            {presetList.length === 0 ? (
                                <div className="loading" style={{ height: 44, borderRadius: 'var(--radius-md)' }} />
                            ) : (
                                <select
                                    className="input"
                                    value={activePresetId}
                                    onChange={(e) => onPresetChange(e.target.value)}
                                    style={{ maxWidth: 480, fontSize: '0.95rem', padding: '0.6rem 0.85rem' }}
                                >
                                    {presetList.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.icon} {p.name} — {p.matchCount} matches
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Active preset metadata */}
                        {activePresetId && presetList.length > 0 && (() => {
                            const meta = presetList.find(p => p.id === activePresetId);
                            if (!meta) return null;
                            return (
                                <div style={{
                                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
                                    marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
                                    fontSize: '0.85rem', color: 'var(--text-secondary)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                                        <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{meta.name}</span>
                                        <span style={{
                                            fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700,
                                            background: 'rgba(56,189,248,0.12)', color: 'var(--color-primary)',
                                            border: '1px solid rgba(56,189,248,0.35)',
                                        }}>{meta.sport}</span>
                                    </div>
                                    <div>📍 <strong style={{ color: 'var(--text-primary)' }}>{meta.venue}</strong></div>
                                    <div>📅 <strong style={{ color: 'var(--text-primary)' }}>{meta.dateRange}</strong></div>
                                    <div style={{ color: 'var(--text-muted)' }}>{meta.description}</div>
                                    {meta.notes && (
                                        <div style={{ color: '#f97316', marginTop: '0.25rem' }}>
                                            ⚠️ {meta.notes}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Match checklist */}
                        {presetFetching && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {[1, 2, 3, 4].map(i => <div key={i} className="loading" style={{ height: 48, borderRadius: 'var(--radius-md)' }} />)}
                            </div>
                        )}

                        {!presetFetching && presetMatches.length > 0 && (
                            <>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{presetMatches.length} matches available</span>
                                    <button className="btn btn-secondary btn-sm" onClick={selectAllPreset}>Select All</button>
                                    <button className="btn btn-secondary btn-sm" onClick={clearAllPreset}>Clear</button>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                                        {presetSelected.size} selected
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
                                    {presetMatches.map((m, i) => (
                                        <label key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
                                            border: `1px solid ${presetSelected.has(i) ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                            background: presetSelected.has(i) ? 'rgba(56,189,248,0.07)' : 'var(--bg-card)',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}>
                                            <input type="checkbox" checked={presetSelected.has(i)}
                                                onChange={() => togglePreset(i)}
                                                style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {m.teamA} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {m.teamB}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {fmt(m.scheduledTime)}
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={importPreset}
                                        disabled={presetLoading || presetSelected.size === 0}
                                    >
                                        {presetLoading ? '⏳ Importing…' : `🏆 Import ${presetSelected.size} Match${presetSelected.size !== 1 ? 'es' : ''}`}
                                    </button>
                                    {presetMsg && (
                                        <span style={{ fontSize: '0.88rem', color: presetMsg.startsWith('✅') ? '#48bb78' : '#f56565' }}>{presetMsg}</span>
                                    )}
                                </div>
                            </>
                        )}

                        {!presetFetching && presetMatches.length === 0 && activePresetId && (
                            <p style={{ color: 'var(--text-muted)' }}>No matches in this preset.</p>
                        )}
                    </div>
                )}

                {/* --- DRIVER ROSTER (F1/MotoGP) --- */}
                {tab === 'drivers' && (
                    <div className="owner-section" style={{ maxWidth: 600 }}>
                        <div className="owner-section-title">🏎️ Driver Roster</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                            Add all drivers competing in this tournament. These will appear in the podium prediction dropdowns.
                        </p>

                        {/* Add driver form */}
                        <form onSubmit={handleAddDriver} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Driver Name *</label>
                                    <input className="input" placeholder="e.g. Max Verstappen" value={driverForm.name}
                                        onChange={e => setDriverForm(f => ({ ...f, name: e.target.value }))} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Team</label>
                                    <input className="input" placeholder="e.g. Red Bull Racing" value={driverForm.team}
                                        onChange={e => setDriverForm(f => ({ ...f, team: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Number</label>
                                    <input className="input" type="number" placeholder="#1" value={driverForm.number}
                                        onChange={e => setDriverForm(f => ({ ...f, number: e.target.value }))} min={1} max={99} />
                                </div>
                            </div>
                            {driverMsg && <p style={{ margin: 0, fontSize: '0.82rem', color: driverMsg.startsWith('✅') ? '#48bb78' : '#f56565' }}>{driverMsg}</p>}
                            <button className="btn btn-primary" type="submit" disabled={driverLoading} style={{ alignSelf: 'flex-start' }}>
                                {driverLoading ? 'Adding…' : '+ Add Driver'}
                            </button>
                        </form>

                        {/* Roster list */}
                        {drivers.length === 0 ? (
                            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                No drivers yet. Add your grid above.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0 0.5rem', marginBottom: '0.25rem' }}>
                                    {drivers.length} driver{drivers.length !== 1 ? 's' : ''} in roster
                                </div>
                                {drivers.map(d => (
                                    <div key={d.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    }}>
                                        {d.number && (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', padding: '0.1rem 0.4rem', borderRadius: 4, minWidth: 28, textAlign: 'center' }}>
                                                #{d.number}
                                            </span>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{d.driver_name}</div>
                                            {d.team_name && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.team_name}</div>}
                                        </div>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDriver(d.id)}>🗑</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- IMPORT FROM LEAGUE --- */}
                {tab === 'import' && (
                    <div className="owner-section">
                        <div className="owner-section-title">↓ Import from API League</div>

                        {apiLeagues.length === 0 ? (
                            <div className="empty-state" style={{ padding: '2rem' }}>
                                <div className="empty-state-icon">🔗</div>
                                <h3>No API leagues available</h3>
                                <p>The owner needs to sync leagues first from the Owner Panel → API Leagues tab.</p>
                            </div>
                        ) : (
                            <>
                                {/* League selector */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Select League</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {apiLeagues.map(l => (
                                            <button
                                                key={l.id}
                                                onClick={() => { setSelectedLeague(l.id); fetchApiMatches(l.id); }}
                                                className={selectedLeague === l.id ? 'btn btn-primary' : 'btn btn-secondary'}
                                                style={{ fontSize: '0.88rem' }}
                                            >
                                                {l.name} <span style={{ opacity: 0.7 }}>{l.season}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Match list */}
                                {leagueLoading && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {[1, 2, 3].map(i => <div key={i} className="loading" style={{ height: '52px', borderRadius: 'var(--radius-md)' }} />)}
                                    </div>
                                )}

                                {!leagueLoading && selectedLeague && (isRaceLeague ? apiRaces : apiMatches).length === 0 && (
                                    <p style={{ color: 'var(--text-muted)' }}>No {isRaceLeague ? 'races' : 'matches'} found for this league.</p>
                                )}

                                {!leagueLoading && (isRaceLeague ? apiRaces : apiMatches).length > 0 && (
                                    <>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{(isRaceLeague ? apiRaces : apiMatches).length} {isRaceLeague ? 'races' : 'matches'}</span>
                                            <button className="btn btn-secondary btn-sm" onClick={selectAll}>Select All</button>
                                            <button className="btn btn-secondary btn-sm" onClick={clearAll}>Clear</button>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                                                {selectedMatchIds.size} selected
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                                            {!isRaceLeague && apiMatches.map((m: ApiMatch) => (
                                                <label key={m.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${selectedMatchIds.has(m.id) ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                    background: selectedMatchIds.has(m.id) ? 'rgba(56,189,248,0.07)' : 'var(--bg-card)',
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                }}>
                                                    <input type="checkbox" checked={selectedMatchIds.has(m.id)}
                                                        onChange={() => toggleMatch(m.id)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            {m.home_team} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {m.away_team}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                        {fmt(m.match_time)}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '999px', fontWeight: 700,
                                                        background: m.status === 'finished' ? 'rgba(72,187,120,0.15)' : m.status === 'live' ? 'rgba(245,87,108,0.15)' : 'var(--bg-tertiary)',
                                                        color: m.status === 'finished' ? '#48bb78' : m.status === 'live' ? '#f5576c' : 'var(--text-muted)',
                                                    }}>
                                                        {m.status}
                                                    </span>
                                                </label>
                                            ))}
                                            {isRaceLeague && apiRaces.map((r: ApiRace) => (
                                                <label key={r.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${selectedMatchIds.has(r.id) ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                    background: selectedMatchIds.has(r.id) ? 'rgba(56,189,248,0.07)' : 'var(--bg-card)',
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                }}>
                                                    <input type="checkbox" checked={selectedMatchIds.has(r.id)}
                                                        onChange={() => toggleMatch(r.id)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            Rd {r.round} — {r.race_name}
                                                        </span>
                                                        {r.status === 'finished' && r.p1_driver && (
                                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                                🥇 {r.p1_driver} · 🥈 {r.p2_driver} · 🥉 {r.p3_driver}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                        {fmt(r.race_time)}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '999px', fontWeight: 700,
                                                        background: r.status === 'finished' ? 'rgba(72,187,120,0.15)' : 'var(--bg-tertiary)',
                                                        color: r.status === 'finished' ? '#48bb78' : 'var(--text-muted)',
                                                    }}>
                                                        {r.status}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>

                                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleImport}
                                                disabled={importLoading || selectedMatchIds.size === 0}
                                            >
                                                {importLoading ? 'Importing…' : `↓ Import ${selectedMatchIds.size} Match${selectedMatchIds.size !== 1 ? 'es' : ''}`}
                                            </button>
                                            {importMsg && (
                                                <span style={{ fontSize: '0.88rem', color: importMsg.startsWith('✅') ? '#48bb78' : '#f56565' }}>{importMsg}</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
