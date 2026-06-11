'use client';
import React from 'react';
import type { ScoreEntry, RoomPlayer } from '@/types/game';
import { TARGET_SCORE, MSHRALI_THRESHOLD } from '@/types/game';
import { TEAM_NAMES } from '@/lib/game/scoring';

interface ScoreBoardProps {
  scores: ScoreEntry[];
  players: RoomPlayer[];
  compact?: boolean;
}

// ── Tally / ჩოთქი mark SVG ────────────────────────────────────
function TallyMarks({ count }: { count: number }) {
  const groups = Math.floor(count / 5);
  const remainder = count % 5;

  const renderGroup = (key: number) => (
    <svg key={key} width="28" height="28" viewBox="0 0 28 28" style={{ marginRight: '4px' }}>
      {/* 4 vertical strokes */}
      {[5, 10, 15, 20].map((x, i) => (
        <line key={i} x1={x} y1="4" x2={x} y2="24"
          stroke="var(--chalk-white)" strokeWidth="2.5" strokeLinecap="round" />
      ))}
      {/* Diagonal cross-stroke */}
      <line x1="2" y1="24" x2="26" y2="4"
        stroke="var(--chalk-white)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  const renderRemainder = (n: number) => (
    <svg key="rem" width={n * 8 + 4} height="28" viewBox={`0 0 ${n * 8 + 4} 28`}>
      {Array.from({ length: n }).map((_, i) => (
        <line key={i} x1={i * 8 + 5} y1="4" x2={i * 8 + 5} y2="24"
          stroke="var(--chalk-cream)" strokeWidth="2.5" strokeLinecap="round"
          opacity="0.8" />
      ))}
    </svg>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px' }}>
      {Array.from({ length: groups }).map((_, i) => renderGroup(i))}
      {remainder > 0 && renderRemainder(remainder)}
    </div>
  );
}

// ── Score progress bar ────────────────────────────────────────
function ScoreBar({ score, team }: { score: number; team: 0 | 1 }) {
  const pct = Math.min((score / TARGET_SCORE) * 100, 100);
  const color = team === 0 ? 'var(--team-a)' : 'var(--team-b)';
  const reached200 = score >= MSHRALI_THRESHOLD;

  return (
    <div style={styles.barOuter}>
      <div style={{
        ...styles.barInner,
        width: `${pct}%`,
        background: `linear-gradient(90deg, ${color}88 0%, ${color} 100%)`,
      }} />
      {/* 200 marker */}
      <div style={{
        ...styles.barMarker,
        left: `${(MSHRALI_THRESHOLD / TARGET_SCORE) * 100}%`,
        borderColor: reached200 ? color : 'rgba(255,255,255,0.2)',
      }} title="200 — მშრალი ზღვარი" />
    </div>
  );
}

export default function ScoreBoard({ scores, players, compact = false }: ScoreBoardProps) {
  const team0Total = scores.at(-1)?.team0Total ?? 0;
  const team1Total = scores.at(-1)?.team1Total ?? 0;
  const team0Players = players.filter(p => p.team === 0).map(p => p.nickname);
  const team1Players = players.filter(p => p.team === 1).map(p => p.nickname);

  return (
    <div style={styles.board}>
      {/* Chalk board header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>ანგარიში</span>
        <span style={styles.targetLabel}>
          მიზანი: {TARGET_SCORE}
        </span>
      </div>

      {/* Two team columns */}
      <div style={styles.teamsRow}>
        {([0, 1] as const).map(team => {
          const total = team === 0 ? team0Total : team1Total;
          const teamPlayers = team === 0 ? team0Players : team1Players;
          const isMshrali = total < MSHRALI_THRESHOLD;
          const isWinning = total > (team === 0 ? team1Total : team0Total);

          return (
            <div key={team} style={{
              ...styles.teamCol,
              borderColor: team === 0 ? 'rgba(200,168,80,0.3)' : 'rgba(160,64,64,0.3)',
            }}>
              {/* Team label */}
              <div style={styles.teamHeader}>
                <span style={{
                  ...styles.teamName,
                  color: team === 0 ? 'var(--team-a)' : 'var(--team-b)',
                }}>
                  {TEAM_NAMES[team]}
                </span>
                {isWinning && total > 0 && (
                  <span style={styles.leadingBadge}>↑</span>
                )}
              </div>

              {/* Players */}
              <div style={styles.playerNames}>
                {teamPlayers.join(' & ') || '—'}
              </div>

              {/* Main score */}
              <div style={styles.mainScore} className="score-label">
                {total}
              </div>

              {/* Progress bar */}
              <ScoreBar score={total} team={team} />

              {/* Tally marks */}
              {!compact && (
                <div style={styles.tallyArea}>
                  <TallyMarks count={Math.floor(total / 5)} />
                  <span style={styles.tallyNote}>({total} ÷ 5 = {Math.floor(total / 5)} ჩოთქი)</span>
                </div>
              )}

              {/* მშრალი warning */}
              {isMshrali && total > 0 && (
                <div style={styles.mshraliWarning}>
                  ⚠ მშრალის საფრთხე
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Round history */}
      {!compact && scores.length > 0 && (
        <div style={styles.history}>
          <div style={styles.historyTitle}>რაუნდების ისტორია</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>ა</th>
                <th style={styles.th}>ბ</th>
                <th style={styles.th}>შედეგი</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={i} style={{
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                }}>
                  <td style={styles.td}>{s.roundNumber}</td>
                  <td style={{
                    ...styles.td,
                    color: s.team0Delta > 0 ? 'var(--team-a)' : 'var(--text-muted)',
                    fontWeight: s.team0Delta > 0 ? 700 : 400,
                  }}>
                    {s.team0Delta > 0 ? `+${s.team0Delta}` : '—'}
                  </td>
                  <td style={{
                    ...styles.td,
                    color: s.team1Delta > 0 ? 'var(--team-b)' : 'var(--text-muted)',
                    fontWeight: s.team1Delta > 0 ? 700 : 400,
                  }}>
                    {s.team1Delta > 0 ? `+${s.team1Delta}` : '—'}
                  </td>
                  <td style={styles.td}>
                    {s.reason === 'domino' ? '🀱' : s.reason === 'blocked' ? '🐟' : '🏆'}
                    {' '}{s.team0Total} / {s.team1Total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  board: {
    background: 'var(--chalk-board)',
    borderRadius: '8px',
    border: '2px solid rgba(90,62,38,0.5)',
    padding: '16px',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
    fontFamily: 'var(--font-geo)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: '1rem',
    color: 'var(--chalk-white)',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  targetLabel: {
    fontSize: '0.7rem',
    color: 'var(--chalk-cream)',
    fontFamily: 'var(--font-mono)',
  },
  teamsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  teamCol: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid',
    borderRadius: '6px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  teamHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  leadingBadge: {
    color: 'var(--team-a)',
    fontSize: '1rem',
    fontWeight: 900,
  },
  playerNames: {
    fontSize: '0.7rem',
    color: 'var(--chalk-cream)',
    opacity: 0.7,
  },
  mainScore: {
    fontSize: '2.2rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--chalk-white)',
    lineHeight: 1,
    textShadow: '0 0 10px rgba(240,237,230,0.2)',
  },
  barOuter: {
    position: 'relative',
    height: '4px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '2px',
    overflow: 'visible',
  },
  barInner: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.6s ease',
  },
  barMarker: {
    position: 'absolute',
    top: '-4px',
    width: '2px',
    height: '12px',
    borderLeft: '2px dashed',
    transform: 'translateX(-1px)',
  },
  tallyArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '4px',
  },
  tallyNote: {
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  mshraliWarning: {
    fontSize: '0.65rem',
    color: '#e08080',
    background: 'rgba(160,64,64,0.12)',
    border: '1px solid rgba(160,64,64,0.3)',
    borderRadius: '3px',
    padding: '2px 6px',
    textAlign: 'center',
  },
  history: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  historyTitle: {
    fontSize: '0.7rem',
    color: 'var(--chalk-cream)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '8px',
    opacity: 0.6,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.75rem',
  },
  th: {
    color: 'var(--text-muted)',
    fontWeight: 500,
    padding: '4px 8px',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
  },
  td: {
    color: 'var(--chalk-cream)',
    padding: '4px 8px',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
  },
};
