// ============================================================
// Tile generation, shuffle, deal
// ============================================================
import type { Tile, Hands, Seat } from '@/types/game';
import { TILES_PER_PLAYER } from '@/types/game';

/** Generate a full double-six set (28 tiles) */
export function generateTileSet(): Tile[] {
  const tiles: Tile[] = [];
  for (let high = 0; high <= 6; high++) {
    for (let low = 0; low <= high; low++) {
      tiles.push([high, low]);
    }
  }
  return tiles; // 28 tiles
}

/** Fisher-Yates shuffle */
export function shuffleTiles(tiles: Tile[]): Tile[] {
  const arr = [...tiles];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Deal 7 tiles to each of 4 players */
export function dealTiles(shuffled: Tile[]): { hands: Hands; boneyard: Tile[] } {
  const hands: Hands = {
    0: shuffled.slice(0, 7),
    1: shuffled.slice(7, 14),
    2: shuffled.slice(14, 21),
    3: shuffled.slice(21, 28),
  };
  const boneyard = shuffled.slice(28); // empty in 4-player
  return { hands, boneyard };
}

/** Find who has the highest double — they go first */
export function findFirstPlayer(hands: Hands): Seat {
  for (let pip = 6; pip >= 0; pip--) {
    for (let seat = 0 as Seat; seat <= 3; seat++) {
      const hand = hands[seat as Seat];
      if (hand.some(([h, l]) => h === pip && l === pip)) {
        return seat as Seat;
      }
    }
  }
  // Fallback: seat 0 (shouldn't happen with full set)
  return 0;
}

/** Count total pips in a hand */
export function handPipCount(tiles: Tile[]): number {
  return tiles.reduce((sum, [h, l]) => sum + h + l, 0);
}

/** Count pips per team */
export function teamPipCounts(hands: Hands): { 0: number; 1: number } {
  return {
    0: handPipCount(hands[0]) + handPipCount(hands[2]),
    1: handPipCount(hands[1]) + handPipCount(hands[3]),
  };
}

/** Sort hand: doubles first, then by pip sum descending */
export function sortHand(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    const aDouble = a[0] === a[1];
    const bDouble = b[0] === b[1];
    if (aDouble && !bDouble) return -1;
    if (!aDouble && bDouble) return 1;
    return (b[0] + b[1]) - (a[0] + a[1]);
  });
}

/** Check if two tiles are the same */
export function tilesEqual(a: Tile, b: Tile): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
