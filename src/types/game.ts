// ============================================================
// Georgian Domino — TypeScript Types
// ============================================================

export type Tile = [number, number]; // [high, low], always high >= low

export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1; // Team 0: seats 0,2 | Team 1: seats 1,3

export function seatToTeam(seat: Seat): Team {
  return (seat % 2) as Team;
}

// A tile as it sits on the chain — may be flipped
export interface PlacedTile {
  tile: Tile;
  flipped: boolean; // if true, display as [low, high]
  seat: Seat;       // who played it
}

export interface ChainState {
  tiles: PlacedTile[];
  leftEnd: number | null;
  rightEnd: number | null;
}

export type MoveType = 'place' | 'pass';
export type PlaceSide = 'left' | 'right' | 'first';

export interface Move {
  seat: Seat;
  type: MoveType;
  tile?: Tile;
  side?: PlaceSide;
}

export interface Hands {
  0: Tile[];
  1: Tile[];
  2: Tile[];
  3: Tile[];
}

export type GameStatus = 'active' | 'blocked' | 'finished';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface GameState {
  id: string;
  roomId: string;
  roundNumber: number;
  status: GameStatus;
  hands: Hands;
  boneyard: Tile[];
  chain: PlacedTile[];
  leftEnd: number | null;
  rightEnd: number | null;
  currentSeat: Seat;
  passCount: number;
  roundScores: { 0: number; 1: number };
  firstSeat: Seat;
}

export interface RoundResult {
  reason: 'domino' | 'blocked' | 'mshrali';
  winnerTeam: Team | null;
  team0Delta: number;
  team1Delta: number;
  isMshrali: boolean; // losing team never reached 200
}

export interface ScoreEntry {
  roundNumber: number;
  team0Delta: number;
  team1Delta: number;
  team0Total: number;
  team1Total: number;
  reason: RoundResult['reason'];
  winnerTeam: Team | null;
}

export interface RoomPlayer {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  seat: Seat;
  team: Team;
  isOnline: boolean;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  message?: string;
  reaction?: string;
  createdAt: string;
}

// Client-side game context
export interface GameContext {
  room: Room;
  players: RoomPlayer[];
  gameState: GameState | null;
  scores: ScoreEntry[];
  chat: ChatMessage[];
  myUserId: string;
  mySeat: Seat | null;
  myTeam: Team | null;
  myHand: Tile[];
  isMyTurn: boolean;
}

// Validation result
export interface MoveValidation {
  valid: boolean;
  reason?: string;
  side?: PlaceSide;
}

export const TARGET_SCORE = 355;
export const MSHRALI_THRESHOLD = 200;
export const TOTAL_TILES = 28;
export const PLAYERS = 4;
export const TILES_PER_PLAYER = 7;
