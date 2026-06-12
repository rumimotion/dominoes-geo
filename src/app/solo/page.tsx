'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';

// ============================================================
// TYPES
// ============================================================
type Tile = [number, number];
type Seat = 0 | 1 | 2 | 3;
type Team = 0 | 1;

interface PlacedTile {
  tile: Tile;
  seat: Seat;
  orientation: 'h' | 'v'; // horizontal or vertical (doubles)
  side: 'left' | 'right' | 'first';
}

interface GameState {
  hands: Record<Seat, Tile[]>;
  chain: PlacedTile[];
  leftEnd: number | null;
  rightEnd: number | null;
  currentSeat: Seat;
  passCount: number;
  status: 'active' | 'blocked' | 'finished';
  firstSeat: Seat;
  roundNumber: number;
}

interface ScoreEntry {
  round: number;
  team0: number;
  team1: number;
  total0: number;
  total1: number;
  reason: 'domino' | 'blocked';
}

// ============================================================
// TILE GENERATION
// ============================================================
function generateTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let h = 0; h <= 6; h++)
    for (let l = 0; l <= h; l++)
      tiles.push([h, l]);
  return tiles;
}

function shuffle(tiles: Tile[]): Tile[] {
  const a = [...tiles];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal(tiles: Tile[]): Record<Seat, Tile[]> {
  const s = shuffle(tiles);
  return { 0: s.slice(0, 7), 1: s.slice(7, 14), 2: s.slice(14, 21), 3: s.slice(21, 28) };
}

function findFirstSeat(hands: Record<Seat, Tile[]>): Seat {
  for (let p = 6; p >= 0; p--) {
    for (let s = 0 as Seat; s <= 3; s++) {
      if (hands[s as Seat].some(([h, l]) => h === p && l === p)) return s as Seat;
    }
  }
  return 0;
}

function pipCount(tiles: Tile[]): number {
  return tiles.reduce((s, [h, l]) => s + h + l, 0);
}

function tilesEq(a: Tile, b: Tile) { return a[0] === b[0] && a[1] === b[1]; }

function seatTeam(s: Seat): Team { return (s % 2) as Team; }

// ============================================================
// LEGAL MOVES
// ============================================================
function legalTiles(state: GameState, seat: Seat): Tile[] {
  const hand = state.hands[seat];
  if (state.chain.length === 0) {
    // Must play highest double
    const doubles = hand.filter(([h, l]) => h === l).sort((a, b) => b[0] - a[0]);
    return doubles.length > 0 ? [doubles[0]] : [];
  }
  const { leftEnd, rightEnd } = state;
  if (leftEnd === null || rightEnd === null) return [];
  return hand.filter(([h, l]) => h === leftEnd || l === leftEnd || h === rightEnd || l === rightEnd);
}

function canPlay(state: GameState, seat: Seat): boolean {
  return legalTiles(state, seat).length > 0;
}

function legalSidesForTile(state: GameState, tile: Tile): ('left' | 'right')[] {
  if (state.chain.length === 0) return [];
  const [h, l] = tile;
  const sides: ('left' | 'right')[] = [];
  if (h === state.leftEnd || l === state.leftEnd) sides.push('left');
  if (h === state.rightEnd || l === state.rightEnd) sides.push('right');
  return [...new Set(sides)];
}

// ============================================================
// APPLY MOVE
// ============================================================
function applyPlace(state: GameState, seat: Seat, tile: Tile, side: 'left' | 'right' | 'first'): GameState {
  const [high, low] = tile;
  const isDouble = high === low;
  const next: GameState = {
    ...state,
    hands: {
      ...state.hands,
      [seat]: state.hands[seat].filter(t => !tilesEq(t, tile)),
    },
    passCount: 0,
  };

  const placed: PlacedTile = { tile, seat, orientation: isDouble ? 'v' : 'h', side };

  if (side === 'first' || state.chain.length === 0) {
    next.chain = [placed];
    next.leftEnd = high;
    next.rightEnd = high;
  } else if (side === 'left') {
    const flippedVal = high === state.leftEnd! ? low : high;
    next.chain = [placed, ...state.chain];
    next.leftEnd = flippedVal;
  } else {
    const flippedVal = low === state.rightEnd! ? high : low;
    next.chain = [...state.chain, placed];
    next.rightEnd = flippedVal;
  }

  if (next.hands[seat].length === 0) {
    next.status = 'finished';
  } else {
    next.currentSeat = ((seat + 1) % 4) as Seat;
  }
  return next;
}

function applyPass(state: GameState, seat: Seat): GameState {
  const next = { ...state, passCount: state.passCount + 1 };
  next.currentSeat = ((seat + 1) % 4) as Seat;
  if (next.passCount >= 4) next.status = 'blocked';
  return next;
}

// ============================================================
// SCORING
// ============================================================
function scoreRound(state: GameState, totals: { 0: number; 1: number }): ScoreEntry {
  const round = state.roundNumber;
  if (state.status === 'finished') {
    const lastPlaced = state.chain[state.chain.length - 1];
    const winnerSeat = lastPlaced.seat;
    const winnerTeam = seatTeam(winnerSeat);
    const loserTeam = (1 - winnerTeam) as Team;
    const loserSeats = ([0, 1, 2, 3] as Seat[]).filter(s => seatTeam(s) === loserTeam);
    const delta = loserSeats.reduce((s, seat) => s + pipCount(state.hands[seat]), 0);
    const t0 = totals[0] + (winnerTeam === 0 ? delta : 0);
    const t1 = totals[1] + (winnerTeam === 1 ? delta : 0);
    return { round, team0: winnerTeam === 0 ? delta : 0, team1: winnerTeam === 1 ? delta : 0, total0: t0, total1: t1, reason: 'domino' };
  }
  // Blocked
  const t0pips = pipCount(state.hands[0]) + pipCount(state.hands[2]);
  const t1pips = pipCount(state.hands[1]) + pipCount(state.hands[3]);
  const diff = Math.abs(t0pips - t1pips);
  const winnerTeam: Team = t0pips <= t1pips ? 0 : 1;
  const nt0 = totals[0] + (winnerTeam === 0 ? diff : 0);
  const nt1 = totals[1] + (winnerTeam === 1 ? diff : 0);
  return { round, team0: winnerTeam === 0 ? diff : 0, team1: winnerTeam === 1 ? diff : 0, total0: nt0, total1: nt1, reason: 'blocked' };
}

// ============================================================
// AI
// ============================================================
type AILevel = 'beginner' | 'medium' | 'master';

function aiMove(state: GameState, seat: Seat, level: AILevel, playedTiles: Tile[]): { tile: Tile; side: 'left' | 'right' } | null {
  const legal = legalTiles(state, seat);
  if (legal.length === 0) return null;

  if (level === 'beginner') {
    const tile = legal[Math.floor(Math.random() * legal.length)];
    const sides = legalSidesForTile(state, tile);
    const side = sides[Math.floor(Math.random() * sides.length)] || 'right';
    return { tile, side };
  }

  if (level === 'medium') {
    // Prefer doubles, then highest pip
    const sorted = [...legal].sort((a, b) => {
      if (a[0] === a[1] && b[0] !== b[1]) return -1;
      if (b[0] === b[1] && a[0] !== a[1]) return 1;
      return (b[0] + b[1]) - (a[0] + a[1]);
    });
    const tile = sorted[0];
    const sides = legalSidesForTile(state, tile);
    const side = sides[0] || 'right';
    return { tile, side };
  }

  // Master: count played tiles, block opponents
  // Count how many of each number remain
  const allTiles = generateTiles();
  const remaining = allTiles.filter(t => !playedTiles.some(p => tilesEq(p, t)) && !state.hands[seat].some(p => tilesEq(p, t)));
  
  // Score each move: prefer moves that open numbers partner likely has, block opponent numbers
  let best: { tile: Tile; side: 'left' | 'right'; score: number } | null = null;
  
  for (const tile of legal) {
    const sides = legalSidesForTile(state, tile);
    for (const side of (sides.length > 0 ? sides : ['right' as const])) {
      const [h, l] = tile;
      const isDouble = h === l;
      let score = h + l; // base: higher is better
      if (isDouble) score += 5; // doubles are good to play early
      // Prefer plays that leave common numbers open
      if (best === null || score > best.score) {
        best = { tile, side, score };
      }
    }
  }
  
  return best ? { tile: best.tile, side: best.side } : null;
}

// ============================================================
// CHOTKI DISPLAY
// ============================================================
function Chotqi({ score, team }: { score: number; team: Team }) {
  const color = team === 0 ? '#c8a850' : '#c05050';
  
  // Each mark = 5 pts
  const marks5 = Math.floor(score / 5);
  const remainder = score % 5;
  
  // Groups: 5 marks = one "chotqi" (cross-hatch)
  const groups = Math.floor(marks5 / 5);
  const extra = marks5 % 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: '0.6rem', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {team === 0 ? 'ა · წყვილი' : 'ბ · წყვილი'}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '1.8rem', color, fontWeight: 700, lineHeight: 1 }}>
        {score}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', maxWidth: 120 }}>
        {Array.from({ length: groups }).map((_, i) => (
          <svg key={i} width="18" height="20" viewBox="0 0 18 20">
            {[3, 7, 11, 15].map((x, j) => (
              <line key={j} x1={x} y1="2" x2={x} y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
            ))}
            <line x1="1" y1="17" x2="17" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </svg>
        ))}
        {extra > 0 && (
          <svg width={extra * 5 + 2} height="20" viewBox={`0 0 ${extra * 5 + 2} 20`}>
            {Array.from({ length: extra }).map((_, j) => (
              <line key={j} x1={j * 5 + 3} y1="2" x2={j * 5 + 3} y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            ))}
          </svg>
        )}
      </div>
      <div style={{ color: '#444', fontSize: '0.6rem', fontFamily: 'monospace' }}>
        {score}/355
      </div>
      <div style={{ width: '80px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min((score / 355) * 100, 100)}%`, height: '100%', background: color, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ============================================================
// DOMINO TILE SVG
// ============================================================
const PIP_POS: Record<number, [number, number][]> = {
  0: [],
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
};

function TileFace({ value, size }: { value: number; size: number }) {
  const r = size * 0.09;
  return (
    <>
      {(PIP_POS[value] || []).map(([fx, fy], i) => (
        <circle key={i} cx={fx * size} cy={fy * size} r={r} fill="#1a1008" />
      ))}
    </>
  );
}

interface TileProps {
  tile: Tile;
  size?: 'sm' | 'md' | 'lg';
  vertical?: boolean;
  selected?: boolean;
  legal?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  dimmed?: boolean;
}

function DominoTileComp({ tile, size = 'md', vertical = false, selected = false, legal = false, faceDown = false, onClick, dimmed = false }: TileProps) {
  const S = size === 'sm' ? 28 : size === 'lg' ? 52 : 38;
  const H = S * 2 + 4;
  const [high, low] = tile;
  const isDouble = high === low;

  const W = vertical ? S : H;
  const Ht = vertical ? H : S;

  return (
    <svg
      width={W} height={Ht}
      viewBox={`0 0 ${W} ${Ht}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        opacity: dimmed ? 0.35 : 1,
        filter: selected ? 'drop-shadow(0 0 6px rgba(200,168,80,0.8))' : legal ? 'drop-shadow(0 0 4px rgba(200,168,80,0.4))' : 'none',
        transform: selected ? 'translateY(-6px)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Shadow */}
      <rect x="2" y="3" width={W - 2} height={Ht - 2} rx="4" fill="rgba(0,0,0,0.4)" />
      {/* Body — bone/ivory */}
      <rect x="0" y="0" width={W - 2} height={Ht - 2} rx="4"
        fill={faceDown ? '#2a1810' : '#f0ebe0'}
        stroke={selected ? '#c8a850' : '#c8bfa8'}
        strokeWidth={selected ? 1.5 : 0.8}
      />
      {!faceDown && (
        <>
          {/* Divider */}
          {vertical ? (
            <line x1="3" y1={Ht / 2 - 1} x2={W - 5} y2={Ht / 2 - 1} stroke="#b0a898" strokeWidth="1" />
          ) : (
            <line x1={W / 2 - 1} y1="3" x2={W / 2 - 1} y2={Ht - 5} stroke="#b0a898" strokeWidth="1" />
          )}
          {/* Pips top/left */}
          <g transform={vertical ? `translate(0, 0)` : `translate(0, 0)`}>
            <g transform={vertical
              ? `translate(0, 0) scale(${(W - 2) / S}, ${(Ht / 2 - 2) / S})`
              : `translate(0, 0) scale(${(W / 2 - 2) / S}, ${(Ht - 2) / S})`
            }>
              <TileFace value={high} size={S} />
            </g>
          </g>
          {/* Pips bottom/right */}
          <g transform={vertical
            ? `translate(0, ${Ht / 2 + 1}) scale(${(W - 2) / S}, ${(Ht / 2 - 2) / S})`
            : `translate(${W / 2 + 1}, 0) scale(${(W / 2 - 2) / S}, ${(Ht - 2) / S})`
          }>
            <TileFace value={low} size={S} />
          </g>
        </>
      )}
    </svg>
  );
}

// ============================================================
// CHAIN RENDERER
// ============================================================
function ChainDisplay({ chain, leftEnd, rightEnd }: { chain: PlacedTile[]; leftEnd: number | null; rightEnd: number | null }) {
  if (chain.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#3a4a3a', fontSize: '0.85rem' }}>
        ველოდებით პირველ სვლას...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: '100%', padding: '8px 0' }}>
      {/* End indicators */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 8px' }}>
        <span style={{ background: 'rgba(0,0,0,0.4)', color: '#c8a850', fontFamily: 'monospace', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 3 }}>◀ {leftEnd}</span>
        <span style={{ color: '#3a5a3a', fontSize: '0.7rem' }}>{chain.length} ქვა</span>
        <span style={{ background: 'rgba(0,0,0,0.4)', color: '#c8a850', fontFamily: 'monospace', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 3 }}>{rightEnd} ▶</span>
      </div>
      {/* Chain */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
        {chain.map((p, i) => (
          <DominoTileComp
            key={i}
            tile={p.tile}
            size="sm"
            vertical={p.orientation === 'v'}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN GAME
// ============================================================
function newGame(roundNum = 1, firstSeat?: Seat): GameState {
  const hands = deal(generateTiles());
  const first = firstSeat !== undefined ? firstSeat : findFirstSeat(hands);
  return {
    hands,
    chain: [],
    leftEnd: null,
    rightEnd: null,
    currentSeat: first,
    passCount: 0,
    status: 'active',
    firstSeat: first,
    roundNumber: roundNum,
  };
}

const SEAT_LABELS: Record<Seat, string> = { 0: 'სამხრეთი', 1: 'დასავლეთი', 2: 'ჩრდილოეთი', 3: 'აღმოსავლეთი' };
const TEAM_LABEL: Record<Team, string> = { 0: 'ა-წყვილი', 1: 'ბ-წყვილი' };
const AI_SEATS: Seat[] = [1, 2, 3]; // seats 1,2,3 are AI; seat 0 is human

export default function SoloPage() {
  const [aiLevel, setAiLevel] = useState<AILevel>('medium');
  const [game, setGame] = useState<GameState>(() => newGame());
  const [totals, setTotals] = useState<{ 0: number; 1: number }>({ 0: 0, 1: 0 });
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [selected, setSelected] = useState<Tile | null>(null);
  const [sideChoice, setSideChoice] = useState<{ tile: Tile; sides: ('left' | 'right')[] } | null>(null);
  const [message, setMessage] = useState('');
  const [playedTiles, setPlayedTiles] = useState<Tile[]>([]);
  const [gameOver, setGameOver] = useState<Team | null>(null);
  const aiTimeout = useRef<NodeJS.Timeout | null>(null);

  const humanSeat = 0 as Seat;
  const isMyTurn = game.currentSeat === humanSeat && game.status === 'active';
  const myLegal = legalTiles(game, humanSeat);
  const isLegal = (t: Tile) => myLegal.some(l => tilesEq(l, t));

  // ── End round ───────────────────────────────────────────
  const endRound = useCallback((finalState: GameState, currentTotals: { 0: number; 1: number }) => {
    const entry = scoreRound(finalState, currentTotals);
    const newTotals = { 0: entry.total0, 1: entry.total1 };
    setHistory(h => [...h, entry]);
    setTotals(newTotals);

    // Check game over
    if (newTotals[0] >= 355 || newTotals[1] >= 355) {
      setGameOver(newTotals[0] >= 355 ? 0 : 1);
      return;
    }

    // New round after delay
    const winnerTeam = entry.team0 > 0 ? 0 : 1;
    const winnerSeats = ([0, 1, 2, 3] as Seat[]).filter(s => seatTeam(s) === winnerTeam);
    // Winner of last round leads — pick first of their seats that can go first
    const nextFirst = winnerSeats[0]; // simplified
    setTimeout(() => {
      setGame(newGame(finalState.roundNumber + 1, nextFirst));
      setPlayedTiles([]);
      setSelected(null);
      setSideChoice(null);
      setMessage(`მე-${finalState.roundNumber + 1} რაუნდი! ${TEAM_LABEL[winnerTeam]} იწყებს.`);
    }, 1500);
  }, []);

  // ── Place tile ──────────────────────────────────────────
  const doPlace = useCallback((tile: Tile, side: 'left' | 'right' | 'first', currentGame: GameState, currentTotals: { 0: number; 1: number }) => {
    const next = applyPlace(currentGame, currentGame.currentSeat, tile, side);
    setPlayedTiles(pt => [...pt, tile]);
    setSelected(null);
    setSideChoice(null);
    setMessage('');
    setGame(next);
    if (next.status !== 'active') {
      endRound(next, currentTotals);
    }
    return next;
  }, [endRound]);

  // ── Human tile click ────────────────────────────────────
  const handleTileClick = useCallback((tile: Tile) => {
    if (!isMyTurn) return;
    if (!isLegal(tile)) {
      setMessage(`❌ [${tile[0]}-${tile[1]}] ვერ ჯდება — ბოლოები არ ემთხვევა`);
      return;
    }
    setMessage('');

    if (game.chain.length === 0) {
      doPlace(tile, 'first', game, totals);
      return;
    }

    const sides = legalSidesForTile(game, tile);
    if (sides.length === 0) return;
    if (sides.length === 1) {
      doPlace(tile, sides[0], game, totals);
    } else {
      setSelected(tile);
      setSideChoice({ tile, sides });
    }
  }, [isMyTurn, isLegal, game, totals, doPlace]);

  const handleSide = useCallback((side: 'left' | 'right') => {
    if (!sideChoice) return;
    doPlace(sideChoice.tile, side, game, totals);
  }, [sideChoice, game, totals, doPlace]);

  const handlePass = useCallback(() => {
    if (!isMyTurn) return;
    if (canPlay(game, humanSeat)) {
      setMessage('❌ გამოტოვება შეუძლებელია — გაქვთ სათამაშო ქვა!');
      return;
    }
    const next = applyPass(game, humanSeat);
    setGame(next);
    setMessage('');
    if (next.status === 'blocked') endRound(next, totals);
  }, [isMyTurn, game, totals, endRound]);

  // ── AI turns ────────────────────────────────────────────
  useEffect(() => {
    if (game.status !== 'active') return;
    if (!AI_SEATS.includes(game.currentSeat)) return;

    aiTimeout.current = setTimeout(() => {
      const seat = game.currentSeat;
      const move = aiMove(game, seat, aiLevel, playedTiles);

      let next: GameState;
      if (!move) {
        next = applyPass(game, seat);
      } else {
        const side = game.chain.length === 0 ? 'first' : move.side;
        next = applyPlace(game, seat, move.tile, side);
        setPlayedTiles(pt => [...pt, move.tile]);
      }
      setGame(next);
      if (next.status !== 'active') {
        endRound(next, totals);
      }
    }, 600);

    return () => { if (aiTimeout.current) clearTimeout(aiTimeout.current); };
  }, [game, aiLevel, playedTiles, totals, endRound]);

  const startNewGame = () => {
    setGame(newGame());
    setTotals({ 0: 0, 1: 0 });
    setHistory([]);
    setPlayedTiles([]);
    setSelected(null);
    setSideChoice(null);
    setMessage('');
    setGameOver(null);
  };

  const myHand = game.hands[humanSeat];
  const isMshrali0 = totals[0] < 200 && totals[1] >= 355;
  const isMshrali1 = totals[1] < 200 && totals[0] >= 355;

  return (
    <div style={styles.page}>
      {/* Game over overlay */}
      {gameOver !== null && (
        <div style={styles.overlay}>
          <div style={styles.overlayCard}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🏆</div>
            <div style={{ color: '#c8a850', fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>
              {TEAM_LABEL[gameOver]} გაიმარჯვა!
            </div>
            <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: 4 }}>
              {totals[0]} : {totals[1]}
            </div>
            {(isMshrali0 || isMshrali1) && (
              <div style={{ color: '#e08080', fontSize: '0.9rem', marginBottom: 12 }}>
                მშრალი წაგება! ({isMshrali0 ? 'ა' : 'ბ'}-წყვილი 200-ს ვერ მიაღწია)
              </div>
            )}
            <button style={styles.btnPrimary} onClick={startNewGame}>ახალი თამაში</button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#c8a850', fontWeight: 700, fontSize: '1rem' }}>🀱 დომინო 355</span>
          <span style={{ color: '#444', fontSize: '0.75rem' }}>მე-{game.roundNumber} რაუნდი</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: '0.72rem' }}>AI:</span>
          {(['beginner', 'medium', 'master'] as AILevel[]).map(l => (
            <button key={l} style={{
              ...styles.btnLevel,
              background: aiLevel === l ? 'rgba(200,168,80,0.2)' : 'transparent',
              borderColor: aiLevel === l ? 'rgba(200,168,80,0.5)' : 'rgba(255,255,255,0.08)',
              color: aiLevel === l ? '#c8a850' : '#555',
            }} onClick={() => setAiLevel(l)}>
              {l === 'beginner' ? 'სუსტი' : l === 'medium' ? 'საშუალო' : 'ოსტატი'}
            </button>
          ))}
          <button style={styles.btnSmall} onClick={startNewGame}>ახალი თამაში</button>
        </div>
      </div>

      {/* Main layout */}
      <div style={styles.mainGrid}>

        {/* Left: scores */}
        <div style={styles.scorePanel}>
          <Chotqi score={totals[0]} team={0} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
          <Chotqi score={totals[1]} team={1} />

          {/* Round history */}
          {history.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ color: '#444', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>ისტორია</div>
              {[...history].reverse().slice(0, 8).map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#555' }}>
                  <span>#{e.round} {e.reason === 'blocked' ? '🐟' : '🀱'}</span>
                  <span style={{ color: e.team0 > 0 ? '#c8a850' : '#555' }}>ა+{e.team0}</span>
                  <span style={{ color: e.team1 > 0 ? '#c05050' : '#555' }}>ბ+{e.team1}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center: board */}
        <div style={styles.centerCol}>
          {/* Player positions */}
          <div style={styles.boardWrapper}>
            {/* North (seat 2, AI, team A) */}
            <div style={styles.northPlayer}>
              <div style={{ ...styles.playerChip, borderColor: game.currentSeat === 2 ? '#c8a850' : 'rgba(255,255,255,0.08)', color: game.currentSeat === 2 ? '#c8a850' : '#555' }}>
                🤖 {SEAT_LABELS[2]} · {game.hands[2].length}ქვ {game.currentSeat === 2 ? '▶' : ''}
              </div>
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                {game.hands[2].map((_, i) => <div key={i} style={styles.faceDownSm} />)}
              </div>
            </div>

            {/* West (seat 1, AI, team B) */}
            <div style={styles.westPlayer}>
              <div style={{ ...styles.playerChip, borderColor: game.currentSeat === 1 ? '#c05050' : 'rgba(255,255,255,0.08)', color: game.currentSeat === 1 ? '#c05050' : '#555' }}>
                🤖 {game.hands[1].length}ქვ {game.currentSeat === 1 ? '▶' : ''}
              </div>
            </div>

            {/* East (seat 3, AI, team B) */}
            <div style={styles.eastPlayer}>
              <div style={{ ...styles.playerChip, borderColor: game.currentSeat === 3 ? '#c05050' : 'rgba(255,255,255,0.08)', color: game.currentSeat === 3 ? '#c05050' : '#555' }}>
                {game.currentSeat === 3 ? '◀ ' : ''}{game.hands[3].length}ქვ 🤖
              </div>
            </div>

            {/* Board */}
            <div style={styles.board}>
              <ChainDisplay chain={game.chain} leftEnd={game.leftEnd} rightEnd={game.rightEnd} />
              {game.status === 'blocked' && (
                <div style={styles.fishBanner}>🐟 თევზი — ბლოკი!</div>
              )}
            </div>
          </div>

          {/* Status / message */}
          {message && (
            <div style={{ background: message.startsWith('❌') ? 'rgba(160,64,64,0.15)' : 'rgba(200,168,80,0.08)', border: `1px solid ${message.startsWith('❌') ? 'rgba(160,64,64,0.3)' : 'rgba(200,168,80,0.2)'}`, borderRadius: 6, padding: '6px 14px', color: message.startsWith('❌') ? '#e08080' : '#c8a850', fontSize: '0.82rem', textAlign: 'center' }}>
              {message}
            </div>
          )}

          {/* Side choice */}
          {sideChoice && (
            <div style={styles.sideChoiceBar}>
              <span style={{ color: '#aaa', fontSize: '0.82rem' }}>
                [{sideChoice.tile[0]}-{sideChoice.tile[1]}] — სად?
              </span>
              <button style={styles.sideBtn} onClick={() => handleSide('left')}>
                ◀ მარცხნივ ({game.leftEnd})
              </button>
              <button style={styles.sideBtn} onClick={() => handleSide('right')}>
                მარჯვნივ ({game.rightEnd}) ▶
              </button>
              <button style={{ ...styles.sideBtn, background: 'rgba(255,255,255,0.04)', color: '#666' }}
                onClick={() => { setSelected(null); setSideChoice(null); }}>
                გაუქმება
              </button>
            </div>
          )}

          {/* Turn indicator */}
          <div style={{ ...styles.turnBar, borderColor: isMyTurn ? '#c8a850' : 'rgba(255,255,255,0.06)' }}>
            {isMyTurn ? (
              <span style={{ color: '#c8a850', fontWeight: 700 }}>⬆ თქვენი სვლაა — {myLegal.length > 0 ? 'აირჩიეთ ქვა' : 'გამოტოვება'}</span>
            ) : (
              <span style={{ color: '#555' }}>
                🤖 {SEAT_LABELS[game.currentSeat]} თამაშობს...
              </span>
            )}
          </div>

          {/* Human hand */}
          <div style={styles.handRack}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'flex-end' }}>
              {myHand.sort((a, b) => (b[0] + b[1]) - (a[0] + a[1])).map((tile, i) => {
                const leg = isLegal(tile);
                const sel = selected && tilesEq(selected, tile);
                return (
                  <DominoTileComp
                    key={i}
                    tile={tile}
                    size="md"
                    selected={!!sel}
                    legal={isMyTurn && leg}
                    dimmed={isMyTurn && !leg && !sel}
                    onClick={isMyTurn ? () => handleTileClick(tile) : undefined}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ color: '#555', fontSize: '0.7rem' }}>⭐ თქვენი ხელი · ა-წყვილი · {myHand.length} ქვა</span>
              {isMyTurn && !canPlay(game, humanSeat) && (
                <button style={styles.passButton} onClick={handlePass}>
                  გამოტოვება
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: rules */}
        <div style={styles.rulesPanel}>
          <div style={{ color: '#555', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>წესები</div>
          {[
            ['🀱', 'პირველი სვლა = [6-6]'],
            ['↔', 'ბოლოები უნდა ემთხვეოდეს'],
            ['⊥', 'ორმაგი = ვერტიკალური'],
            ['🐟', 'ბლოკი = ნაკლები ქულა იგებს'],
            ['🏆', '355 ქულა = გამარჯვება'],
            ['⚠', 'მშრალი = 200-ზე ნაკლები'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', gap: 6, marginBottom: 5, fontSize: '0.72rem', color: '#4a5a4a' }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '10px 0' }} />
          <div style={{ color: '#555', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>ჩოთქი</div>
          <div style={{ fontSize: '0.68rem', color: '#3a4a3a', lineHeight: 1.6 }}>
            ყოველი ქვა = 5 ქულა<br/>
            5 ხაზი = 1 ჯგუფი (25)<br/>
            მაქს 355 ქულა
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STYLES — ბესეტკა / Soviet courtyard
// ============================================================
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#1a1e18',
    backgroundImage: `
      radial-gradient(ellipse at 20% 50%, rgba(30,40,25,0.8) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 20%, rgba(20,30,20,0.6) 0%, transparent 50%)
    `,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    fontFamily: "'Noto Sans Georgian', sans-serif",
    color: '#c8c0b0',
    userSelect: 'none',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.4)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr 110px',
    gap: 0,
    flex: 1,
    minHeight: 0,
  },
  scorePanel: {
    background: 'rgba(0,0,0,0.25)',
    borderRight: '1px solid rgba(255,255,255,0.04)',
    padding: '16px 10px',
    display: 'flex',
    flexDirection: 'column',
  },
  centerCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '12px',
    minHeight: 0,
  },
  boardWrapper: {
    position: 'relative',
    background: '#1e2b1e',
    borderRadius: 10,
    border: '2px solid #2a3a28',
    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.4)',
    minHeight: '280px',
    display: 'grid',
    gridTemplateAreas: `
      ". north ."
      "west board east"
    `,
    gridTemplateColumns: '80px 1fr 80px',
    gridTemplateRows: '50px 1fr',
  },
  board: {
    gridArea: 'board',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    overflowY: 'auto',
  },
  northPlayer: {
    gridArea: 'north',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '4px 0',
  },
  westPlayer: {
    gridArea: 'west',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 6px',
  },
  eastPlayer: {
    gridArea: 'east',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '0 6px',
  },
  playerChip: {
    border: '1px solid',
    borderRadius: 12,
    padding: '3px 8px',
    fontSize: '0.65rem',
    whiteSpace: 'nowrap',
    background: 'rgba(0,0,0,0.3)',
    transition: 'all 0.2s',
  },
  faceDownSm: {
    width: 10,
    height: 20,
    background: 'linear-gradient(135deg, #3d2b1a, #1a0e08)',
    borderRadius: 2,
    border: '1px solid rgba(0,0,0,0.5)',
  },
  fishBanner: {
    marginTop: 8,
    background: 'rgba(160,64,64,0.15)',
    border: '1px solid rgba(160,64,64,0.3)',
    borderRadius: 4,
    padding: '4px 12px',
    color: '#e08080',
    fontSize: '0.82rem',
    fontWeight: 600,
  },
  turnBar: {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid',
    borderRadius: 6,
    padding: '6px 14px',
    textAlign: 'center',
    fontSize: '0.82rem',
    transition: 'border-color 0.3s',
  },
  handRack: {
    background: 'linear-gradient(180deg, #2a1e12 0%, #1a1208 100%)',
    borderRadius: 8,
    border: '2px solid #1a0e08',
    padding: '12px 16px 10px',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
  },
  sideChoiceBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(200,168,80,0.3)',
    borderRadius: 6,
    padding: '6px 12px',
    flexWrap: 'wrap',
  },
  sideBtn: {
    background: 'linear-gradient(180deg, #c8a850 0%, #8a6020 100%)',
    border: 'none',
    borderRadius: 4,
    color: '#1a1008',
    cursor: 'pointer',
    fontFamily: "'Noto Sans Georgian', sans-serif",
    fontWeight: 700,
    fontSize: '0.78rem',
    padding: '5px 12px',
  },
  passButton: {
    background: 'transparent',
    border: '1px solid rgba(160,64,64,0.4)',
    borderRadius: 4,
    color: '#e08080',
    cursor: 'pointer',
    fontFamily: "'Noto Sans Georgian', sans-serif",
    fontSize: '0.75rem',
    padding: '3px 10px',
  },
  rulesPanel: {
    background: 'rgba(0,0,0,0.2)',
    borderLeft: '1px solid rgba(255,255,255,0.04)',
    padding: '16px 10px',
    fontSize: '0.72rem',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  overlayCard: {
    background: '#1e2820',
    border: '1px solid rgba(200,168,80,0.3)',
    borderRadius: 12,
    padding: '32px 40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  btnPrimary: {
    background: 'linear-gradient(180deg, #c8a850 0%, #8a6020 100%)',
    border: 'none',
    borderRadius: 6,
    color: '#1a1008',
    cursor: 'pointer',
    fontFamily: "'Noto Sans Georgian', sans-serif",
    fontWeight: 700,
    fontSize: '0.9rem',
    padding: '10px 24px',
    marginTop: 8,
  },
  btnSmall: {
    background: 'rgba(200,168,80,0.1)',
    border: '1px solid rgba(200,168,80,0.2)',
    borderRadius: 4,
    color: '#c8a850',
    cursor: 'pointer',
    fontFamily: "'Noto Sans Georgian', sans-serif",
    fontSize: '0.72rem',
    padding: '3px 10px',
  },
  btnLevel: {
    border: '1px solid',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: "'Noto Sans Georgian', sans-serif",
    fontSize: '0.68rem',
    padding: '3px 8px',
    transition: 'all 0.15s',
  },
};
