'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom, setNickname, getNickname } from '@/lib/supabase/rooms';
import '@/styles/globals.css';

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [nickname, setNicknameState] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!nickname.trim()) { setError('სახელი საჭიროა'); return; }
    setLoading(true);
    setError('');
    try {
      await setNickname(nickname.trim());
      const { room } = await createRoom(nickname.trim());
      router.push(`/room/${room.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) { setError('სახელი საჭიროა'); return; }
    if (!code.trim()) { setError('კოდი საჭიროა'); return; }
    setLoading(true);
    setError('');
    try {
      await setNickname(nickname.trim());
      const { room } = await joinRoom(code.trim(), nickname.trim());
      router.push(`/room/${room.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.main} className="felt-texture">
      {/* Background ornament */}
      <div style={styles.bgOrnament}>🀱</div>

      <div style={styles.card} className="card">
        {/* Logo / header */}
        <div style={styles.logoArea}>
          <div style={styles.bigTile}>
            <span style={styles.bigPip}>⠿</span>
          </div>
          <h1 style={styles.title}>დომინო</h1>
          <p style={styles.subtitle}>ქართული ეზო · ოჯახური თამაში</p>
        </div>

        {mode === 'home' && (
          <div style={styles.menuArea}>
            <button
              className="btn btn-primary"
              style={styles.bigBtn}
              onClick={() => setMode('create')}
            >
              🀱 კომნატის შექმნა
            </button>
            <button
              className="btn btn-secondary"
              style={styles.bigBtn}
              onClick={() => setMode('join')}
            >
              🚪 შემოსვლა კოდით
            </button>

            <div style={styles.flavorText}>
              <p>2 vs 2 · 28 ქვა · 355 ქულა</p>
              <p>ჩოთქი · თევზი · მშრალი</p>
            </div>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div style={styles.formArea}>
            <button style={styles.backBtn} onClick={() => { setMode('home'); setError(''); }}>
              ← უკან
            </button>

            <label style={styles.label}>თქვენი სახელი</label>
            <input
              className="input"
              value={nickname}
              onChange={e => setNicknameState(e.target.value)}
              placeholder="მაგ: გიორგი"
              maxLength={20}
              autoFocus
            />

            {mode === 'join' && (
              <>
                <label style={styles.label}>კომნატის კოდი</label>
                <input
                  className="input"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="6-სიმბოლო კოდი"
                  maxLength={6}
                  style={{ letterSpacing: '0.3em', fontFamily: 'var(--font-mono)' }}
                />
              </>
            )}

            {error && <div style={styles.error}>{error}</div>}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading
                ? 'გთხოვთ დაიცადოთ...'
                : mode === 'create' ? 'კომნატის შექმნა' : 'შემოსვლა'}
            </button>
          </div>
        )}
      </div>

      {/* Attribution */}
      <div style={styles.footer}>
        ტრადიციული ქართული სასახლის დომინო
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOrnament: {
    position: 'fixed',
    fontSize: '40vw',
    opacity: 0.025,
    userSelect: 'none',
    pointerEvents: 'none',
    zIndex: 0,
    transform: 'rotate(-15deg)',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '32px 24px',
    position: 'relative',
    zIndex: 1,
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  bigTile: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, var(--wood-light) 0%, var(--wood-dark) 100%)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '12px',
    boxShadow: 'var(--shadow-tile)',
  },
  bigPip: {
    fontSize: '2.5rem',
    color: 'var(--ivory)',
    fontFamily: 'monospace',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '3rem',
    color: 'var(--team-a)',
    letterSpacing: '0.08em',
    lineHeight: 1,
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    marginTop: '6px',
    letterSpacing: '0.12em',
  },
  menuArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  bigBtn: {
    width: '100%',
    fontSize: '1rem',
    padding: '0.8rem',
  },
  flavorText: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.72rem',
    marginTop: '8px',
    lineHeight: 1.8,
    opacity: 0.6,
    letterSpacing: '0.05em',
  },
  formArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-geo)',
    fontSize: '0.85rem',
    padding: '0',
    textAlign: 'left',
    marginBottom: '4px',
  },
  label: {
    fontSize: '0.75rem',
    color: 'var(--chalk-cream)',
    letterSpacing: '0.05em',
    marginBottom: '-6px',
  },
  error: {
    background: 'rgba(160,64,64,0.15)',
    border: '1px solid rgba(160,64,64,0.4)',
    borderRadius: '4px',
    color: '#e08080',
    fontSize: '0.82rem',
    padding: '6px 10px',
  },
  footer: {
    marginTop: '24px',
    color: 'var(--text-muted)',
    fontSize: '0.65rem',
    opacity: 0.4,
    letterSpacing: '0.1em',
    zIndex: 1,
  },
};
