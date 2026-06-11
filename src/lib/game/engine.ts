// ============================================================
// Georgian Domino — Core Game Engine
// Pure functions, no side effects, no React
// ============================================================
import type {
  Tile, Seat, Team, Move, PlaceSide, PlacedTile,
  GameState, MoveValidation, Hands,
} from '@/types/game';
import { seatToTeam, TARGET_SCORE, MSHRALI_THRESHOLD } from '@/types/game';
import { tilesEqual, teamPipCounts } from './tiles';

// ─── Move Validation ────────────────────────────────────────

export function validateMove(
  state: GameState,
  seat: Seat,
  tile: Tile,
  side: PlaceSide,
): MoveValidation {
  if (state.currentSeat !== seat) {
    return { valid: false, reason: 'Not your turn' };
  }
  if (!state.hands[seat].some(t => tilesEqual(t, tile))) {
    return { valid: false, reason: 'You do not have that tile' };
  }

  // First move of the round: must play the highest double
  if (state.chain.length === 0) {
    const [h, l] = tile;
    if (h !== l) return { valid: false, reason: 'First tile must be a double' };
    // Check it's the highest double in play
    for (let pip = 6; pip > h; pip--) {
      for (let s = 0 as Seat; s <= 3; s++) {
        if (state.hands[s as Seat].some(([th, tl]) => th === pip && tl === pip)) {
          return { valid: false, reason: `First play must be the highest double ([${pip},${pip}])` };
        }
      }
    }
    return { valid: true, side: 'first' };
  }

  const { leftEnd, rightEnd } = state;
  if (leftEnd === null || rightEnd === null) {
    return { valid: false, reason: 'Invalid chain state' };
  }

  const [high, low] = tile;

  const fitsLeft = high === leftEnd || low === leftEnd;
  const fitsRight = high === rightEnd || low === rightEnd;

  if (side === 'left' && !fitsLeft) {
    return { valid: false, reason: `Tile does not connect to left end (${leftEnd})` };
  }
  if (side === 'right' && !fitsRight) {
    return { valid: false, reason: `Tile does not connect to right end (${rightEnd})` };
  }
  if (side !== 'left' && side !== 'right') {
    return { valid: false, reason: 'Must specify left or right' };
  }

  return { valid: true, side };
}

/** Can the player make ANY move? */
export function canPlay(state: GameState, seat: Seat): boolean {
  const hand = state.hands[seat];
  if (hand.length === 0) return false;
  if (state.chain.length === 0) return true; // first move — must play double

  const { leftEnd, rightEnd } = state;
  if (leftEnd === null || rightEnd === null) return false;

  return hand.some(([high, low]) =>
    high === leftEnd || low === leftEnd ||
    high === rightEnd || low === rightEnd
  );
}

/** Get legal tiles for a seat */
export function legalTiles(state: GameState, seat: Seat): Tile[] {
  if (!canPlay(state, seat)) return [];
  const hand = state.hands[seat];
  if (state.chain.length === 0) {
    // Must be the highest double
    return hand.filter(([h, l]) => h === l);
  }
  const { leftEnd, rightEnd } = state;
  if (leftEnd === null || rightEnd === null) return [];
  return hand.filter(([high, low]) =>
    high === leftEnd || low === leftEnd ||
    high === rightEnd || low === rightEnd
  );
}

/** Which sides a tile can be played on */
export function legalSides(state: GameState, tile: Tile): PlaceSide[] {
  if (state.chain.length === 0) return ['first'];
  const { leftEnd, rightEnd } = state;
  if (leftEnd === null || rightEnd === null) return [];
  const [high, low] = tile;
  const sides: PlaceSide[] = [];
  if (high === leftEnd || low === leftEnd) sides.push('left');
  if (high === rightEnd || low === rightEnd) sides.push('right');
  return sides;
}

// ─── Apply Move ──────────────────────────────────────────────

export function applyMove(state: GameState, move: Move): GameState {
  const next = deepCloneState(state);

  if (move.type === 'pass') {
    next.passCount += 1;
    next.currentSeat = nextSeat(state.currentSeat);
    if (next.passCount >= 4) {
      next.status = 'blocked';
    }
    return next;
  }

  // place
  const { tile, side } = move;
  if (!tile || !side) return next;

  // Remove tile from hand
  const handIdx = next.hands[move.seat].findIndex(t => tilesEqual(t, tile));
  next.hands[move.seat].splice(handIdx, 1);
  next.passCount = 0;

  // Append to chain
  const [high, low] = tile;

  if (side === 'first' || next.chain.length === 0) {
    next.chain.push({ tile, flipped: false, seat: move.seat });
    next.leftEnd = high; // doubles: both ends same
    next.rightEnd = high;
  } else if (side === 'left') {
    const flipped = high === next.leftEnd!; // connect high to left → show low outward
    next.chain.unshift({ tile, flipped, seat: move.seat });
    next.leftEnd = flipped ? low : high;
  } else { // right
    const flipped = low === next.rightEnd!;
    next.chain.push({ tile, flipped, seat: move.seat });
    next.rightEnd = flipped ? high : low;
  }

  // Check if player emptied hand (domino!)
  if (next.hands[move.seat].length === 0) {
    next.status = 'finished';
    return next;
  }

  next.currentSeat = nextSeat(state.currentSeat);
  return next;
}

// ─── Round Scoring ───────────────────────────────────────────

export interface RoundResult {
  reason: 'domino' | 'blocked' | 'mshrali';
  winnerTeam: Team;
  team0Delta: number;
  team1Delta: number;
  isMshrali: boolean;
}

export function calculateRoundResult(
  state: GameState,
  currentTotals: { 0: number; 1: number },
): RoundResult {
  if (state.status === 'finished') {
    // Someone played their last tile (domino)
    const winnerSeat = state.chain[state.chain.length - 1]?.seat;
    const winnerTeam = seatToTeam(winnerSeat ?? 0);
    const loserTeam = (1 - winnerTeam) as Team;

    // Score = sum of all tiles remaining in losing team's hands
    const loserPips =
      state.hands[loserTeam === 0 ? 0 : 1].reduce((s, [h, l]) => s + h + l, 0) +
      state.hands[loserTeam === 0 ? 2 : 3].reduce((s, [h, l]) => s + h + l, 0);

    const delta = loserPips;
    const isMshrali = currentTotals[loserTeam] + 0 < MSHRALI_THRESHOLD &&
      currentTotals[winnerTeam] >= MSHRALI_THRESHOLD;

    return {
      reason: 'domino',
      winnerTeam,
      team0Delta: winnerTeam === 0 ? delta : 0,
      team1Delta: winnerTeam === 1 ? delta : 0,
      isMshrali,
    };
  }

  // Blocked (თევზი)
  const pips = teamPipCounts(state.hands);
  const winnerTeam: Team = pips[0] <= pips[1] ? 0 : 1;
  const loserTeam: Team = (1 - winnerTeam) as Team;
  const delta = Math.abs(pips[0] - pips[1]);

  const isMshrali = currentTotals[loserTeam] < MSHRALI_THRESHOLD &&
    (currentTotals[winnerTeam] + delta) >= TARGET_SCORE;

  return {
    reason: 'blocked',
    winnerTeam,
    team0Delta: winnerTeam === 0 ? delta : 0,
    team1Delta: winnerTeam === 1 ? delta : 0,
    isMshrali,
  };
}

export function isGameOver(totals: { 0: number; 1: number }): Team | null {
  if (totals[0] >= TARGET_SCORE) return 0;
  if (totals[1] >= TARGET_SCORE) return 1;
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────

function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

function deepCloneState(state: GameState): GameState {
  return {
    ...state,
    hands: {
      0: [...state.hands[0].map(t => [...t] as Tile)],
      1: [...state.hands[1].map(t => [...t] as Tile)],
      2: [...state.hands[2].map(t => [...t] as Tile)],
      3: [...state.hands[3].map(t => [...t] as Tile)],
    },
    chain: state.chain.map(p => ({ ...p, tile: [...p.tile] as Tile })),
    boneyard: state.boneyard.map(t => [...t] as Tile),
    roundScores: { ...state.roundScores },
  };
}

/** Create initial game state for a new round */
export function createInitialGameState(
  roomId: string,
  roundNumber: number,
  hands: Hands,
  firstSeat: Seat,
): Omit<GameState, 'id'> {
  return {
    roomId,
    roundNumber,
    status: 'active',
    hands,
    boneyard: [],
    chain: [],
    leftEnd: null,
    rightEnd: null,
    currentSeat: firstSeat,
    passCount: 0,
    roundScores: { 0: 0, 1: 0 },
    firstSeat,
  };
}
