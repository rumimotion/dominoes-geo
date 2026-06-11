// ============================================================
// Room management helpers
// ============================================================
import { createClient } from '@/lib/supabase/client';
import type { Room, RoomPlayer, Seat } from '@/types/game';

const GEO_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += GEO_CHARS[Math.floor(Math.random() * GEO_CHARS.length)];
  }
  return code;
}

export async function createRoom(nickname: string): Promise<{ room: Room; player: RoomPlayer }> {
  const supabase = createClient();
  const userId = await getOrCreateUserId();

  const code = generateRoomCode();

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code, host_id: userId, status: 'waiting' })
    .select()
    .single();

  if (roomError) throw roomError;

  const { data: player, error: playerError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      seat: 0,
      team: 0,
    })
    .select()
    .single();

  if (playerError) throw playerError;

  return {
    room: mapRoom(room),
    player: mapPlayer(player),
  };
}

export async function joinRoom(
  code: string,
  nickname: string,
): Promise<{ room: Room; player: RoomPlayer }> {
  const supabase = createClient();
  const userId = await getOrCreateUserId();

  // Find room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single();

  if (roomError || !room) throw new Error('კომნატა ვერ მოიძებნა');
  if (room.status !== 'waiting') throw new Error('თამაში უკვე დაწყებულია');

  // Count current players
  const { data: existing } = await supabase
    .from('room_players')
    .select('seat')
    .eq('room_id', room.id);

  if ((existing?.length ?? 0) >= 4) throw new Error('კომნატა სავსეა');

  // Check if already in room
  const alreadyIn = existing?.find((p: any) => p.user_id === userId);
  if (alreadyIn) throw new Error('უკვე ხართ ამ კომნატაში');

  // Assign next available seat
  const takenSeats = new Set(existing?.map(p => p.seat) ?? []);
  let seat = 0;
  for (let s = 0; s <= 3; s++) {
    if (!takenSeats.has(s)) { seat = s; break; }
  }

  const { data: player, error: playerError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      seat,
      team: seat % 2,
    })
    .select()
    .single();

  if (playerError) throw playerError;

  return { room: mapRoom(room), player: mapPlayer(player) };
}

export async function getOrCreateUserId(): Promise<string> {
  // Use localStorage for anonymous identity
  if (typeof window === 'undefined') return crypto.randomUUID();
  let id = localStorage.getItem('domino_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('domino_user_id', id);
  }
  return id;
}

export async function getNickname(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('domino_nickname');
}

export async function setNickname(name: string): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('domino_nickname', name);
  }
}

// Mappers
function mapRoom(r: Record<string, unknown>): Room {
  return {
    id: r.id as string,
    code: r.code as string,
    hostId: r.host_id as string,
    status: r.status as Room['status'],
  };
}

function mapPlayer(p: Record<string, unknown>): RoomPlayer {
  return {
    id: p.id as string,
    roomId: p.room_id as string,
    userId: p.user_id as string,
    nickname: p.nickname as string,
    seat: p.seat as Seat,
    team: p.team as 0 | 1,
    isOnline: p.is_online as boolean,
  };
}
