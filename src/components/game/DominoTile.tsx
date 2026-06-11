'use client';
import React, { memo } from 'react';
import type { Tile, PlacedTile } from '@/types/game';

interface DominoTileProps {
  tile: Tile;
  flipped?: boolean;
  selected?: boolean;
  legal?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  faceDown?: boolean;
}

// Pip positions for each face value (in a 40x40 grid)
const PIP_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[20, 20]],
  2: [[10, 10], [30, 30]],
  3: [[10, 10], [20, 20], [30, 30]],
  4: [[10, 10], [30, 10], [10, 30], [30, 30]],
  5: [[10, 10], [30, 10], [20, 20], [10, 30], [30, 30]],
  6: [[10, 10], [30, 10], [10, 20], [30, 20], [10, 30], [30, 30]],
};

const SIZES = {
  sm: { w: 28, h: 56, pip: 3.5, divider: 3 },
  md: { w: 40, h: 80, pip: 5, divider: 4 },
  lg: { w: 56, h: 112, pip: 7, divider: 5 },
};

function DominoFace({ value, size, w, h }: { value: number; size: { w: number; h: number; pip: number }; w: number; h: number }) {
  const scale = w / 40;
  return (
    <>
      {(PIP_POSITIONS[value] || []).map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx * scale}
          cy={cy * scale}
          r={size.pip}
          fill="var(--pip-black)"
          opacity="0.85"
        />
      ))}
    </>
  );
}

export const DominoTile = memo(function DominoTile({
  tile,
  flipped = false,
  selected = false,
  legal = false,
  onClick,
  size = 'md',
  orientation = 'vertical',
  className = '',
  faceDown = false,
}: DominoTileProps) {
  const s = SIZES[size];
  const [high, low] = tile;
  const topVal = flipped ? low : high;
  const botVal = flipped ? high : low;

  const isHoriz = orientation === 'horizontal';
  const W = isHoriz ? s.h : s.w;
  const H = isHoriz ? s.w : s.h;
  const halfW = isHoriz ? s.h / 2 : s.w;
  const halfH = isHoriz ? s.w : s.h / 2;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      onClick={onClick}
      className={`domino-tile ${selected ? 'selected' : ''} ${legal ? 'legal' : ''} ${onClick ? 'clickable' : ''} ${className}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      role={onClick ? 'button' : undefined}
      aria-label={`${high}-${low}`}
    >
      <defs>
        <linearGradient id={`wood-${high}-${low}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7a5535" />
          <stop offset="40%" stopColor="#6b4a2e" />
          <stop offset="100%" stopColor="#3d2b1a" />
        </linearGradient>
        <filter id="tile-shadow">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Tile body */}
      <rect
        x="1" y="1" width={W - 2} height={H - 2}
        rx="4"
        fill={faceDown ? '#2a1810' : `url(#wood-${high}-${low})`}
        filter="url(#tile-shadow)"
      />

      {/* Border */}
      <rect
        x="1" y="1" width={W - 2} height={H - 2}
        rx="4"
        fill="none"
        stroke={selected ? '#c8a850' : 'rgba(0,0,0,0.5)'}
        strokeWidth={selected ? 2 : 1}
      />

      {/* Ivory face inlays */}
      {!faceDown && (
        <>
          <rect x="3" y="3" width={halfW - 4} height={halfH - 4} rx="2"
            fill="var(--ivory)" opacity="0.92" />
          <rect
            x={isHoriz ? halfW + 1 : 3}
            y={isHoriz ? 3 : halfH + 1}
            width={halfW - 4} height={halfH - 4} rx="2"
            fill="var(--ivory-dark)" opacity="0.92" />

          {/* Divider line */}
          {isHoriz ? (
            <line x1={halfW} y1="4" x2={halfW} y2={H - 4}
              stroke="var(--wood-dark)" strokeWidth={s.divider} />
          ) : (
            <line x1="4" y1={halfH} x2={W - 4} y2={halfH}
              stroke="var(--wood-dark)" strokeWidth={s.divider} />
          )}

          {/* Center screw dot (traditional) */}
          <circle
            cx={isHoriz ? halfW : W / 2}
            cy={isHoriz ? H / 2 : halfH}
            r="2" fill="var(--wood-dark)" opacity="0.6"
          />

          {/* Pips — top/left half */}
          <g transform={`translate(3, 3)`}>
            <DominoFace value={topVal} size={s} w={halfW - 6} h={halfH - 6} />
          </g>

          {/* Pips — bottom/right half */}
          <g transform={isHoriz ? `translate(${halfW + 1}, 3)` : `translate(3, ${halfH + 1})`}>
            <DominoFace value={botVal} size={s} w={halfW - 6} h={halfH - 6} />
          </g>
        </>
      )}

      {/* Legal move highlight */}
      {legal && !selected && (
        <rect x="1" y="1" width={W - 2} height={H - 2} rx="4"
          fill="rgba(200,168,80,0.12)"
          stroke="rgba(200,168,80,0.5)"
          strokeWidth="1.5" />
      )}

      {/* Selected ring */}
      {selected && (
        <rect x="0" y="0" width={W} height={H} rx="5"
          fill="none"
          stroke="#c8a850"
          strokeWidth="2.5"
          strokeDasharray="4 2" />
      )}
    </svg>
  );
});

export default DominoTile;
