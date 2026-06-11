'use client';
import React from 'react';
import type { Room, RoomPlayer } from '@/types/game';
import { seatToTeam } from '@/types/game';
import { TEAM_NAMES, SEAT_LABELS } from '@/lib/game/scoring';

interface LobbyProps {
  room: Room;
  players: RoomPlayer[];
  myUserId: string;
  onStart: () => void;
  starting: boolean;
}

const SEAT_ORDER = [0, 2, 1, 3] as const; // team A first, then B

export default function Lobby({ room, players, myUserId, onStart, starting }: LobbyProps) {
  const isHost = players.find(p => p.userId === myUserId)?.userId === room.hostId;
  const canStart = players.length >= 2;

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${room.id}?code=${room.code}`
    : '';

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl).catch(() => {});
  };

  const getPlayer = (seat: number) => players.find(p => p.seat === seat);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>🀱</div>
        <h1 style={styles.title}>დომინო</h1>
        <p style={styles.subtitle}>ქართული ეზოს დომინო</p>
      </div>

      {/* Room code */}
      <div style={styles.codeCard}>
        <div style={styles.codeLabel}>კომნატის კოდი</div>
        <div style={styles.codeValue}>{room.code}</div>
        <button style={styles.copyBtn} onClick={copyInvite}>
          📋 ბმულის კოპირება
        </button>
      </div>

      {/* Teams layout */}
      <div style={styles.teams}>
        {([0, 1] as const).map(team => (
          <div key={team} style={{
            ...styles.teamBlock,
            borderColor: team === 0 ? 'rgba(200,168,80,0.4)' : 'rgba(160,64,64,0.4)',
          }}>
            <div style={{
              ...styles.teamTitle,
              color: team === 0 ? 'var(--team-a)' : 'var(--team-b)',
            }}>
              {TEAM_NAMES[team]}
            </div>

            {[team === 0 ? 0 : 1, team === 0 ? 2 : 3].map(seat => {
              const player = getPlayer(seat);
              const isMe = player?.userId === myUserId;
              return (
                <div key={seat} style={{
                  ...styles.playerSlot,
                  background: player
                    ? `rgba(${team === 0 ? '200,168,80' : '160,64,64'}, 0.08)`
                    : 'rgba(255,255,255,0.03)',
                  borderStyle: player ? 'solid' : 'dashed',
                }}>
                  {player ? (
                    <span style={styles.playerName}>
                      {isMe && '⭐ '}{player.nickname}
                      <span style={styles.seatTag}>{SEAT_LABELS[seat as keyof typeof SEAT_LABELS]}</span>
                    </span>
                  ) : (
                    <span style={styles.emptySlot}>
                      + {SEAT_LABELS[seat as keyof typeof SEAT_LABELS]} — ველოდები...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Player count */}
      <div style={styles.countRow}>
        <div style={styles.countDots}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              ...styles.dot,
              background: i < players.length ? 'var(--team-a)' : 'rgba(255,255,255,0.15)',
            }} />
          ))}
        </div>
        <span style={styles.countText}>
          {players.length}/4 მოთამაშე
        </span>
      </div>

      {/* Rules reminder */}
      <div style={styles.rules}>
        <div style={styles.ruleItem}>🎯 <strong>355</strong> ქულა — გამარჯვება</div>
        <div style={styles.ruleItem}>⚠️ <strong>200</strong>-ზე ნაკლები — მშრალი</div>
        <div style={styles.ruleItem}>🐟 <strong>თევზი</strong> — ბლოკი, ითვლება ქულები</div>
      </div>

      {/* Start button */}
      {isHost && (
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '1.1rem', padding: '0.75rem' }}
          onClick={onStart}
          disabled={!canStart || starting}
        >
          {starting ? 'იწყება...' : canStart ? '🀱 თამაშის დაწყება' : `ველოდებით (${4 - players.length} კიდევ)`}
        </button>
      )}

      {!isHost && (
        <div style={styles.waitingHost}>
          ⏳ ლიდერი დაიწყებს თამაშს...
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '480px',
    margin: '0 auto',
    padding: '20px 16px',
  },
  header: {
    textAlign: 'center',
    paddingTop: '8px',
  },
  logo: {
    fontSize: '3rem',
    lineHeight: 1,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.4rem',
    color: 'var(--team-a)',
    letterSpacing: '0.05em',
    marginTop: '4px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    letterSpacing: '0.1em',
  },
  codeCard: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(200,168,80,0.3)',
    borderRadius: '8px',
    padding: '14px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
  codeValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '2rem',
    color: 'var(--chalk-white)',
    letterSpacing: '0.3em',
    fontWeight: 700,
  },
  copyBtn: {
    background: 'transparent',
    border: '1px solid rgba(200,168,80,0.3)',
    borderRadius: '4px',
    color: 'var(--team-a)',
    cursor: 'pointer',
    fontFamily: 'var(--font-geo)',
    fontSize: '0.8rem',
    padding: '4px 12px',
  },
  teams: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  teamBlock: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  teamTitle: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  playerSlot: {
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '5px',
    padding: '7px 8px',
    minHeight: '36px',
    display: 'flex',
    alignItems: 'center',
  },
  playerName: {
    fontSize: '0.82rem',
    color: 'var(--text-light)',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  seatTag: {
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    marginLeft: '4px',
  },
  emptySlot: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  countRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  countDots: {
    display: 'flex',
    gap: '6px',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'background 0.3s ease',
  },
  countText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  rules: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  ruleItem: {
    fontSize: '0.78rem',
    color: 'var(--chalk-cream)',
    opacity: 0.8,
  },
  waitingHost: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    padding: '12px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
  },
};
