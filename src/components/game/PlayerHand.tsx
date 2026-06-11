'use client';
import React, { useState } from 'react';
import DominoTile from './DominoTile';
import type { Tile, GameState, Seat, PlaceSide } from '@/types/game';
import { legalTiles, legalSides } from '@/lib/game/engine';
import { canPlay } from '@/lib/game/engine';

interface PlayerHandProps {
  hand: Tile[];
  gameState: GameState | null;
  mySeat: Seat;
  isMyTurn: boolean;
  onPlay: (tile: Tile, side: PlaceSide) => void;
  onPass: () => void;
  submitting: boolean;
}

export default function PlayerHand({
  hand, gameState, mySeat, isMyTurn, onPlay, onPass, submitting,
}: PlayerHandProps) {
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [showSideChoice, setShowSideChoice] = useState(false);

  if (!gameState) return null;

  const legal = legalTiles(gameState, mySeat);
  const isLegal = (t: Tile) => legal.some(lt => lt[0] === t[0] && lt[1] === t[1]);
  const isSelected = (t: Tile) => selectedTile?.[0] === t[0] && selectedTile?.[1] === t[1];

  const handleTileClick = (tile: Tile) => {
    if (!isMyTurn || submitting) return;
    if (!isLegal(tile)) return;

    if (isSelected(tile)) {
      setSelectedTile(null);
      setShowSideChoice(false);
      return;
    }

    setSelectedTile(tile);

    if (gameState.chain.length === 0) {
      // First move — auto-place
      onPlay(tile, 'first');
      setSelectedTile(null);
      return;
    }

    const sides = legalSides(gameState, tile);
    if (sides.length === 1) {
      onPlay(tile, sides[0]);
      setSelectedTile(null);
    } else if (sides.length === 2) {
      setShowSideChoice(true);
    }
  };

  const handleSideChoice = (side: PlaceSide) => {
    if (!selectedTile) return;
    onPlay(selectedTile, side);
    setSelectedTile(null);
    setShowSideChoice(false);
  };

  const canPassNow = isMyTurn && gameState && !canPlay(gameState, mySeat);

  return (
    <div style={styles.container}>
      {/* Turn indicator */}
      {isMyTurn && (
        <div style={styles.turnBanner}>
          <span style={styles.turnText}>⬆ თქვენი სვლაა</span>
        </div>
      )}

      {/* Side choice modal */}
      {showSideChoice && selectedTile && (
        <div style={styles.sideChoice}>
          <span style={styles.sideLabel}>სად დადებთ?</span>
          <button style={styles.sideBtn} onClick={() => handleSideChoice('left')}>
            ◀ მარცხნივ
          </button>
          <button style={styles.sideBtn} onClick={() => handleSideChoice('right')}>
            მარჯვნივ ▶
          </button>
          <button style={styles.sideCancelBtn} onClick={() => {
            setSelectedTile(null);
            setShowSideChoice(false);
          }}>
            გაუქმება
          </button>
        </div>
      )}

      {/* Tile rack */}
      <div style={styles.rack}>
        <div style={styles.tiles}>
          {hand.map((tile, i) => (
            <div
              key={`${tile[0]}-${tile[1]}-${i}`}
              style={{
                ...styles.tileWrapper,
                transform: isSelected(tile) ? 'translateY(-12px)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            >
              <DominoTile
                tile={tile}
                selected={isSelected(tile)}
                legal={isMyTurn && isLegal(tile)}
                onClick={() => handleTileClick(tile)}
                size="md"
              />
            </div>
          ))}

          {hand.length === 0 && (
            <span style={{ color: 'var(--text-muted)', padding: '1rem' }}>
              ხელი ცარიელია
            </span>
          )}
        </div>

        {/* Count badge */}
        <div style={styles.countBadge}>{hand.length} ქვა</div>
      </div>

      {/* Pass button */}
      {canPassNow && (
        <button
          style={styles.passBtn}
          onClick={onPass}
          disabled={submitting}
        >
          გამოტოვება (ვერ ვთამაშობ)
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  turnBanner: {
    background: 'rgba(200,168,80,0.15)',
    border: '1px solid rgba(200,168,80,0.4)',
    borderRadius: '4px',
    padding: '4px 12px',
    animation: 'pulse-glow 2s ease-in-out infinite',
  },
  turnText: {
    color: 'var(--team-a)',
    fontWeight: 700,
    fontSize: '0.85rem',
    letterSpacing: '0.05em',
  },
  rack: {
    position: 'relative',
    background: 'linear-gradient(180deg, #3d2b1a 0%, #2a1810 100%)',
    borderRadius: '8px',
    border: '2px solid #1a0e08',
    padding: '12px 16px 10px',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.4)',
    width: '100%',
    maxWidth: '600px',
  },
  tiles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    alignItems: 'flex-end',
    minHeight: '90px',
  },
  tileWrapper: {
    display: 'flex',
  },
  countBadge: {
    position: 'absolute',
    top: '6px',
    right: '10px',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  sideChoice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(10,20,12,0.95)',
    border: '1px solid var(--team-a)',
    borderRadius: '6px',
    padding: '8px 14px',
    boxShadow: 'var(--glow-gold)',
  },
  sideLabel: {
    color: 'var(--chalk-white)',
    fontSize: '0.85rem',
    marginRight: '4px',
  },
  sideBtn: {
    background: 'linear-gradient(180deg, #c8a850 0%, #9a7a2a 100%)',
    color: '#1a1008',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: 'var(--font-geo)',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  sideCancelBtn: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--felt-light)',
    borderRadius: '4px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontFamily: 'var(--font-geo)',
    fontSize: '0.8rem',
  },
  passBtn: {
    background: 'transparent',
    border: '1px solid var(--team-b)',
    color: 'var(--team-b)',
    borderRadius: '4px',
    padding: '6px 16px',
    cursor: 'pointer',
    fontFamily: 'var(--font-geo)',
    fontSize: '0.85rem',
  },
};
