'use client';
import React, { useRef, useEffect } from 'react';
import DominoTile from './DominoTile';
import type { GameState, RoomPlayer, Seat } from '@/types/game';
import { seatToTeam } from '@/types/game';

interface GameBoardProps {
  gameState: GameState | null;
  players: RoomPlayer[];
  mySeat: Seat | null;
}

const SEAT_POSITIONS = {
  0: { label: 'სამხრეთი', side: 'bottom' },
  1: { label: 'დასავლეთი', side: 'left' },
  2: { label: 'ჩრდილოეთი', side: 'top' },
  3: { label: 'აღმოსავლეთი', side: 'right' },
} as const;

export default function GameBoard({ gameState, players, mySeat }: GameBoardProps) {
  const chainRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chain to end
  useEffect(() => {
    if (chainRef.current) {
      chainRef.current.scrollLeft = chainRef.current.scrollWidth;
    }
  }, [gameState?.chain.length]);

  const getPlayer = (seat: Seat) => players.find(p => p.seat === seat);

  const teamColor = (seat: Seat) => seat % 2 === 0 ? 'var(--team-a)' : 'var(--team-b)';

  const handSize = (seat: Seat) =>
    gameState?.hands[seat]?.length ?? '?';

  return (
    <div style={styles.board} className="felt-texture">
      {/* Corner ornament */}
      <div style={styles.cornerTL} />
      <div style={styles.cornerTR} />
      <div style={styles.cornerBL} />
      <div style={styles.cornerBR} />

      {/* Player positions around the board */}
      {([0, 1, 2, 3] as Seat[]).map(seat => {
        const player = getPlayer(seat);
        const pos = SEAT_POSITIONS[seat];
        const isMe = seat === mySeat;
        const isTurn = gameState?.currentSeat === seat;
        const team = seatToTeam(seat);
        const tiles = handSize(seat);

        return (
          <div
            key={seat}
            style={{
              ...styles.playerSlot,
              ...slotPosition(pos.side),
              borderColor: isTurn ? teamColor(seat) : 'rgba(90,62,38,0.3)',
              boxShadow: isTurn ? `0 0 16px ${teamColor(seat)}44` : 'none',
            }}
          >
            {player ? (
              <>
                <span style={{ ...styles.playerName, color: teamColor(seat) }}>
                  {isMe ? `⭐ ${player.nickname}` : player.nickname}
                </span>
                <span style={styles.tileCount}>{tiles} ქვა</span>
                {isTurn && <span style={styles.turnDot}>●</span>}
                {!player.isOnline && <span style={styles.offlineDot}>○</span>}

                {/* Opponent tile backs — show count as face-down tiles */}
                {!isMe && (
                  <div style={styles.opponentTiles}>
                    {Array.from({ length: Math.min(Number(tiles), 7) }).map((_, i) => (
                      <div key={i} style={{
                        ...styles.faceDownTile,
                        transform: `rotate(${(i - 3) * 3}deg)`,
                        zIndex: i,
                      }} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <span style={styles.emptySlot}>{pos.label}... მოლოდინი</span>
            )}
          </div>
        );
      })}

      {/* Chain / game table center */}
      <div style={styles.tableCenter}>
        {!gameState || gameState.chain.length === 0 ? (
          <div style={styles.emptyTable}>
            <div style={styles.emptyIcon}>🀱</div>
            <div style={styles.emptyText}>
              {gameState ? 'ველოდებით პირველ სვლას...' : 'თამაში ჯერ არ დაწყებულა'}
            </div>
          </div>
        ) : (
          <div ref={chainRef} style={styles.chainScroll}>
            <div style={styles.chain}>
              {gameState.chain.map((placed, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.chainTile,
                    animationDelay: `${idx * 0.03}s`,
                  }}
                  className="animate-tile-in"
                >
                  <DominoTile
                    tile={placed.tile}
                    flipped={placed.flipped}
                    size="sm"
                    orientation="horizontal"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* End indicators */}
        {gameState && gameState.leftEnd !== null && (
          <div style={styles.endIndicators}>
            <span style={styles.endLeft}>◀ {gameState.leftEnd}</span>
            <span style={styles.endRight}>{gameState.rightEnd} ▶</span>
          </div>
        )}

        {/* Blocked indicator */}
        {gameState?.status === 'blocked' && (
          <div style={styles.fishBanner}>
            🐟 თევზი — ბლოკი!
          </div>
        )}
      </div>
    </div>
  );
}

function slotPosition(side: string): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute' };
  switch (side) {
    case 'top':    return { ...base, top: '8px', left: '50%', transform: 'translateX(-50%)' };
    case 'bottom': return { ...base, bottom: '8px', left: '50%', transform: 'translateX(-50%)' };
    case 'left':   return { ...base, left: '8px', top: '50%', transform: 'translateY(-50%)' };
    case 'right':  return { ...base, right: '8px', top: '50%', transform: 'translateY(-50%)' };
    default:       return base;
  }
}

const styles: Record<string, React.CSSProperties> = {
  board: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4/3',
    maxHeight: '420px',
    borderRadius: '12px',
    border: '6px solid var(--wood-dark)',
    boxShadow: 'var(--shadow-deep), inset 0 0 40px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  cornerTL: {
    position: 'absolute', top: 8, left: 8,
    width: 16, height: 16,
    border: '2px solid rgba(200,168,80,0.3)',
    borderRight: 'none', borderBottom: 'none',
    borderRadius: '2px 0 0 0',
  },
  cornerTR: {
    position: 'absolute', top: 8, right: 8,
    width: 16, height: 16,
    border: '2px solid rgba(200,168,80,0.3)',
    borderLeft: 'none', borderBottom: 'none',
    borderRadius: '0 2px 0 0',
  },
  cornerBL: {
    position: 'absolute', bottom: 8, left: 8,
    width: 16, height: 16,
    border: '2px solid rgba(200,168,80,0.3)',
    borderRight: 'none', borderTop: 'none',
    borderRadius: '0 0 0 2px',
  },
  cornerBR: {
    position: 'absolute', bottom: 8, right: 8,
    width: 16, height: 16,
    border: '2px solid rgba(200,168,80,0.3)',
    borderLeft: 'none', borderTop: 'none',
    borderRadius: '0 0 2px 0',
  },
  playerSlot: {
    position: 'absolute',
    background: 'rgba(10,20,12,0.7)',
    border: '1px solid',
    borderRadius: '6px',
    padding: '6px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    minWidth: '80px',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    backdropFilter: 'blur(4px)',
  },
  playerName: {
    fontSize: '0.8rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  tileCount: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  turnDot: {
    color: 'var(--team-a)',
    fontSize: '0.5rem',
    animation: 'pulse-glow 1s infinite',
  },
  offlineDot: {
    color: 'var(--text-muted)',
    fontSize: '0.6rem',
  },
  opponentTiles: {
    display: 'flex',
    marginTop: '4px',
  },
  faceDownTile: {
    width: '12px',
    height: '24px',
    background: 'linear-gradient(135deg, #3d2b1a 0%, #1a0e08 100%)',
    borderRadius: '2px',
    border: '1px solid rgba(0,0,0,0.5)',
    marginLeft: '-4px',
  },
  emptySlot: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  tableCenter: {
    position: 'absolute',
    inset: '70px 90px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTable: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    opacity: 0.4,
  },
  emptyIcon: { fontSize: '2.5rem' },
  emptyText: { fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' },
  chainScroll: {
    overflowX: 'auto',
    width: '100%',
    scrollbarWidth: 'thin',
  },
  chain: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    padding: '8px',
    justifyContent: 'center',
  },
  chainTile: {
    display: 'flex',
    animation: 'tileSlide 0.25s ease forwards',
  },
  endIndicators: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: '6px',
  },
  endLeft: {
    fontSize: '0.75rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--team-a)',
    background: 'rgba(0,0,0,0.4)',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  endRight: {
    fontSize: '0.75rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--team-a)',
    background: 'rgba(0,0,0,0.4)',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  fishBanner: {
    marginTop: '8px',
    background: 'rgba(160,64,64,0.2)',
    border: '1px solid rgba(160,64,64,0.5)',
    borderRadius: '4px',
    padding: '4px 12px',
    color: '#e08080',
    fontSize: '0.85rem',
    fontWeight: 600,
    animation: 'pulse-glow 1.5s infinite',
  },
};
