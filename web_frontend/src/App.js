import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { apiFetch } from './api/client';

// PUBLIC_INTERFACE
function App() {
  /** Concept Quest frontend (minimal, end-to-end vertical slice). */
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem('cq_auth');
    return raw ? JSON.parse(raw) : null;
  });

  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);

  const [activeView, setActiveView] = useState('play'); // play | progress | syllabus
  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState(null);

  const [showAchievements, setShowAchievements] = useState(false);

  const [session, setSession] = useState(null);
  const [difficulty, setDifficulty] = useState(1);

  const [loading, setLoading] = useState({ games: false, action: false });
  const [error, setError] = useState(null);

  const selectedGame = useMemo(
    () => games.find(g => g.id === selectedGameId) || null,
    [games, selectedGameId]
  );

  useEffect(() => {
    localStorage.setItem('cq_auth', auth ? JSON.stringify(auth) : '');
  }, [auth]);

  useEffect(() => {
    let cancelled = false;
    async function loadGames() {
      setLoading(s => ({ ...s, games: true }));
      setError(null);
      try {
        const data = await apiFetch('/games');
        if (!cancelled) {
          setGames(data);
          if (!selectedGameId && data.length > 0) setSelectedGameId(data[0].id);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(s => ({ ...s, games: false }));
      }
    }
    loadGames();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshUserData(userId) {
    const [p, a] = await Promise.all([
      apiFetch(`/progress/${userId}`),
      apiFetch(`/achievements/${userId}`),
    ]);
    setProgress(p);
    setAchievements(a);
  }

  // PUBLIC_INTERFACE
  async function handleLogin(mode, payload) {
    /** Login or signup with placeholder backend auth. */
    setLoading(s => ({ ...s, action: true }));
    setError(null);
    try {
      const data = await apiFetch(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAuth(data);
      await refreshUserData(data.user_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(s => ({ ...s, action: false }));
    }
  }

  // PUBLIC_INTERFACE
  function handleLogout() {
    /** Clear local auth state. */
    setAuth(null);
    setProgress(null);
    setAchievements(null);
    setSession(null);
    localStorage.removeItem('cq_auth');
  }

  async function startSession() {
    if (!auth || !selectedGame) return;
    setLoading(s => ({ ...s, action: true }));
    setError(null);
    try {
      const resp = await apiFetch('/games/start', {
        method: 'POST',
        body: JSON.stringify({ user_id: auth.user_id, game_id: selectedGame.id, difficulty }),
      });
      setSession(resp);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(s => ({ ...s, action: false }));
    }
  }

  async function submitMockResult(score) {
    if (!auth || !selectedGame) return;
    setLoading(s => ({ ...s, action: true }));
    setError(null);
    try {
      const resp = await apiFetch('/games/submit', {
        method: 'POST',
        body: JSON.stringify({
          user_id: auth.user_id,
          game_id: selectedGame.id,
          difficulty,
          score,
          duration_seconds: 300,
        }),
      });

      await refreshUserData(auth.user_id);

      if (resp.earned_achievements && resp.earned_achievements.length > 0) {
        setShowAchievements(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(s => ({ ...s, action: false }));
    }
  }

  return (
    <div className="cq-app">
      <header className="cq-topnav">
        <div className="cq-brand">
          <div className="cq-logo" aria-hidden="true">CQ</div>
          <div>
            <div className="cq-title">Concept Quest</div>
            <div className="cq-subtitle">5-minute games for single-concept mastery</div>
          </div>
        </div>

        <nav className="cq-actions" aria-label="Primary">
          <button
            className={`cq-navbtn ${activeView === 'play' ? 'is-active' : ''}`}
            onClick={() => setActiveView('play')}
          >
            Play
          </button>
          <button
            className={`cq-navbtn ${activeView === 'progress' ? 'is-active' : ''}`}
            onClick={() => setActiveView('progress')}
            disabled={!auth}
            title={!auth ? 'Login to view progress' : ''}
          >
            Progress
          </button>
          <button
            className={`cq-navbtn ${activeView === 'syllabus' ? 'is-active' : ''}`}
            onClick={() => setActiveView('syllabus')}
          >
            Syllabus
          </button>

          <div className="cq-divider" />

          {auth ? (
            <>
              <div className="cq-userpill" title={auth.token}>
                <span className="cq-userdot" aria-hidden="true" />
                {auth.display_name}
              </div>
              <button className="cq-btn cq-btn-secondary" onClick={() => setShowAchievements(true)} disabled={!achievements}>
                Achievements
              </button>
              <button className="cq-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <span className="cq-muted">Not signed in</span>
          )}
        </nav>
      </header>

      <div className="cq-layout">
        <aside className="cq-sidebar" aria-label="Games">
          <div className="cq-sidebar-header">
            <div className="cq-sidebar-title">Games</div>
            {loading.games ? <div className="cq-muted">Loading…</div> : null}
          </div>

          <div className="cq-game-list">
            {games.map(g => (
              <button
                key={g.id}
                className={`cq-game-item ${g.id === selectedGameId ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedGameId(g.id);
                  setSession(null);
                }}
              >
                <div className="cq-game-name">{g.title}</div>
                <div className="cq-game-meta">{g.concept}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="cq-main" aria-label="Main content">
          {error ? (
            <div className="cq-alert" role="alert">
              <strong>Something went wrong:</strong> {error}
            </div>
          ) : null}

          {!auth ? (
            <AuthPanel onLogin={handleLogin} loading={loading.action} />
          ) : activeView === 'play' ? (
            <PlayPanel
              game={selectedGame}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              session={session}
              onStart={startSession}
              onSubmit={submitMockResult}
              loading={loading.action}
            />
          ) : activeView === 'progress' ? (
            <ProgressPanel progress={progress} games={games} />
          ) : (
            <SyllabusPanel games={games} selectedGame={selectedGame} />
          )}
        </main>
      </div>

      {showAchievements ? (
        <AchievementsModal
          achievements={achievements}
          onClose={() => setShowAchievements(false)}
        />
      ) : null}
    </div>
  );
}

function AuthPanel({ onLogin, loading }) {
  const [mode, setMode] = useState('login'); // login|signup
  const [email, setEmail] = useState('student@example.com');
  const [displayName, setDisplayName] = useState('Student');
  const [password, setPassword] = useState('password');

  return (
    <section className="cq-card">
      <h2 className="cq-h2">Welcome</h2>
      <p className="cq-muted">
        Sign in to track progress, earn achievements, and see syllabus alignment.
      </p>

      <div className="cq-tabs" role="tablist" aria-label="Auth mode">
        <button
          className={`cq-tab ${mode === 'login' ? 'is-active' : ''}`}
          onClick={() => setMode('login')}
          role="tab"
          aria-selected={mode === 'login'}
        >
          Login
        </button>
        <button
          className={`cq-tab ${mode === 'signup' ? 'is-active' : ''}`}
          onClick={() => setMode('signup')}
          role="tab"
          aria-selected={mode === 'signup'}
        >
          Signup
        </button>
      </div>

      <div className="cq-form">
        <label className="cq-label">
          Email
          <input className="cq-input" value={email} onChange={e => setEmail(e.target.value)} />
        </label>

        {mode === 'signup' ? (
          <label className="cq-label">
            Display name
            <input className="cq-input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </label>
        ) : null}

        <label className="cq-label">
          Password
          <input
            className="cq-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>

        <button
          className="cq-btn cq-btn-primary"
          onClick={() => onLogin(mode, mode === 'signup' ? { email, display_name: displayName, password } : { email, password })}
          disabled={loading}
        >
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Login'}
        </button>
      </div>
    </section>
  );
}

function PlayPanel({ game, difficulty, setDifficulty, session, onStart, onSubmit, loading }) {
  if (!game) {
    return (
      <section className="cq-card">
        <h2 className="cq-h2">Select a game</h2>
      </section>
    );
  }

  const levels = game.levels || [];
  const currentLevel = levels.find(l => l.difficulty === difficulty) || levels[0];

  return (
    <section className="cq-card">
      <div className="cq-split">
        <div>
          <h2 className="cq-h2">{game.title}</h2>
          <p className="cq-muted">{game.description}</p>
          <div className="cq-badge-row">
            <span className="cq-badge">Concept: {game.concept}</span>
            <span className="cq-badge cq-badge-secondary">5 min</span>
          </div>
        </div>

        <div className="cq-level">
          <label className="cq-label">
            Difficulty
            <select
              className="cq-input"
              value={difficulty}
              onChange={e => setDifficulty(Number(e.target.value))}
            >
              {levels.map(l => (
                <option key={l.difficulty} value={l.difficulty}>
                  {l.difficulty} — {l.title}
                </option>
              ))}
            </select>
          </label>
          <div className="cq-muted">
            Target score: <strong>{currentLevel ? currentLevel.target_score : 80}</strong>
          </div>
        </div>
      </div>

      <div className="cq-microgame">
        <div className="cq-microgame-header">
          <div className="cq-microgame-title">Micro-game placeholder</div>
          <div className="cq-microgame-meta">
            {session ? `Session: ${session.session_id.slice(0, 8)}…` : 'No active session'}
          </div>
        </div>

        <div className="cq-microgame-body">
          <p className="cq-muted">
            This is a mock 5-minute interaction. Start a session, then submit a score to update progress and unlock achievements.
          </p>

          {!session ? (
            <button className="cq-btn cq-btn-primary" onClick={onStart} disabled={loading}>
              {loading ? 'Starting…' : 'Start session'}
            </button>
          ) : (
            <div className="cq-score-row">
              <button className="cq-btn" onClick={() => onSubmit(65)} disabled={loading}>Submit 65</button>
              <button className="cq-btn" onClick={() => onSubmit(82)} disabled={loading}>Submit 82</button>
              <button className="cq-btn cq-btn-primary" onClick={() => onSubmit(95)} disabled={loading}>Submit 95</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProgressPanel({ progress, games }) {
  const lookup = useMemo(() => {
    const map = new Map();
    games.forEach(g => map.set(g.id, g));
    return map;
  }, [games]);

  return (
    <section className="cq-card">
      <h2 className="cq-h2">Progress</h2>
      <p className="cq-muted">Your best scores and mastery by game and difficulty.</p>

      {!progress ? (
        <div className="cq-muted">No progress yet. Play a game to get started.</div>
      ) : progress.items.length === 0 ? (
        <div className="cq-muted">No attempts recorded yet.</div>
      ) : (
        <div className="cq-table" role="table" aria-label="Progress table">
          <div className="cq-tr cq-th" role="row">
            <div role="columnheader">Game</div>
            <div role="columnheader">Difficulty</div>
            <div role="columnheader">Best</div>
            <div role="columnheader">Attempts</div>
            <div role="columnheader">Mastery</div>
          </div>
          {progress.items.map((it, idx) => {
            const game = lookup.get(it.game_id);
            return (
              <div className="cq-tr" role="row" key={`${it.game_id}-${it.difficulty}-${idx}`}>
                <div role="cell">{game ? game.title : it.game_slug}</div>
                <div role="cell">{it.difficulty}</div>
                <div role="cell">{it.best_score}</div>
                <div role="cell">{it.attempts}</div>
                <div role="cell">
                  <span className={`cq-pill ${it.mastered ? 'is-on' : ''}`}>{it.mastered ? 'Mastered' : 'In progress'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SyllabusPanel({ games, selectedGame }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = selectedGame ? `?game_id=${encodeURIComponent(selectedGame.id)}` : '';
        const data = await apiFetch(`/syllabus/mappings${qs}`);
        if (!cancelled) setItems(data.items || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedGame]);

  return (
    <section className="cq-card">
      <h2 className="cq-h2">Syllabus alignment</h2>
      <p className="cq-muted">
        Each micro-game maps to one or more syllabus standards. Showing mappings for the selected game.
      </p>

      {loading ? <div className="cq-muted">Loading…</div> : null}
      {error ? <div className="cq-alert" role="alert">{error}</div> : null}

      {items.length === 0 && !loading ? (
        <div className="cq-muted">No mappings found.</div>
      ) : (
        <div className="cq-mapping-list">
          {items.map((m, idx) => (
            <div className="cq-mapping" key={`${m.standard_code}-${idx}`}>
              <div className="cq-mapping-code">{m.standard_code}</div>
              <div className="cq-mapping-body">
                <div className="cq-mapping-label">{m.standard_label}</div>
                <div className="cq-muted">{m.subject} • Grade {m.grade_band} • Game: {m.game_slug}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AchievementsModal({ achievements, onClose }) {
  return (
    <div className="cq-modal-backdrop" role="dialog" aria-modal="true" aria-label="Achievements">
      <div className="cq-modal">
        <div className="cq-modal-header">
          <h3 className="cq-h3">Achievements</h3>
          <button className="cq-iconbtn" onClick={onClose} aria-label="Close achievements">✕</button>
        </div>

        {!achievements ? (
          <div className="cq-muted">No data.</div>
        ) : (
          <div className="cq-ach-grid">
            {achievements.items.map(a => (
              <div key={a.key} className={`cq-ach ${a.earned_at ? 'is-earned' : ''}`}>
                <div className="cq-ach-title">
                  {a.title}
                  {a.earned_at ? <span className="cq-earned-tag">Earned</span> : null}
                </div>
                <div className="cq-muted">{a.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
