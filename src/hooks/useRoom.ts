'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Room, RoomPlayer, GameState, ScoreEntry, ChatMessage, Seat, Tile } from '@/types/game';
import { getOrCreateUserId } from '@/lib/supabase/rooms';

export interface RoomHookState {
  room: Room | null;
  players: RoomPlayer[];
  gameState: GameState | null;
  scores: ScoreEntry[];
  chat: ChatMessage[];
  myUserId: string;
  mySeat: Seat | null;
  myHand: Tile[];
  isMyTurn: boolean;
  loading: boolean;
  error: string | null;
}

export function useRoom(roomId: string) {
  const [state, setState] = useState<RoomHookState>({
    room: null,
    players: [],
    gameState: null,
    scores: [],
    chat: [],
    myUserId: '',
    mySeat: null,
    myHand: [],
    isMyTurn: false,
    loading: true,
    error: null,
  });

  const userIdRef = useRef('');
  const supabase = createClient();

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function load() {
      const userId = await getOrCreateUserId();
      userIdRef.current = userId;

      // Load room
      const { data: room } = await supabase
        .from('rooms').select().eq('id', roomId).single();
      if (!room || !mounted) return;

      // Load players
      const { data: players } = await supabase
        .from('room_players').select().eq('room_id', roomId);

      // Load latest game state
      const { data: gameStates } = await supabase
        .from('game_states')
        .select()
        .eq('room_id', roomId)
        .order('round_number', { ascending: false })
        .limit(1);
      const gs = gameStates?.[0] ?? null;

      // Load score history
      const { data: scores } = await supabase
        .from('score_history')
        .select()
        .eq('room_id', roomId)
        .order('round_number', { ascending: true });

      // Load recent chat
      const { data: chat } = await supabase
        .from('chat_messages')
        .select()
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!mounted) return;

      const mySeat = players?.find(p => p.user_id === userId)?.seat as Seat | null;
      const myHand = gs && mySeat !== null ? gs.hands[mySeat] ?? [] : [];
      const isMyTurn = gs ? gs.current_seat === mySeat : false;

      setState({
        room: mapRoom(room),
        players: (players ?? []).map(mapPlayer),
        gameState: gs ? mapGameState(gs) : null,
        scores: (scores ?? []).map(mapScore),
        chat: (chat ?? []).map(mapChat),
        myUserId: userId,
        mySeat: mySeat ?? null,
        myHand,
        isMyTurn,
        loading: false,
        error: null,
      });
    }

    load();
    return () => { mounted = false; };
  }, [roomId]);

  // ── Realtime subscriptions ───────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setState(prev => {
          const updated = payload.eventType === 'INSERT'
            ? [...prev.players, mapPlayer(payload.new)]
            : payload.eventType === 'DELETE'
              ? prev.players.filter(p => p.id !== (payload.old as {id: string}).id)
              : prev.players.map(p => p.id === (payload.new as {id: string}).id ? mapPlayer(payload.new) : p);
          return { ...prev, players: updated };
        });
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_states',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const gs = mapGameState(payload.new);
          setState(prev => {
            const mySeat = prev.mySeat;
            const myHand = mySeat !== null ? gs.hands[mySeat] ?? [] : [];
            const isMyTurn = gs.currentSeat === mySeat;
            return { ...prev, gameState: gs, myHand, isMyTurn };
          });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'score_history',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setState(prev => ({
          ...prev,
          scores: [...prev.scores, mapScore(payload.new)],
        }));
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setState(prev => ({
          ...prev,
          chat: [...prev.chat.slice(-49), mapChat(payload.new)],
        }));
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        setState(prev => ({ ...prev, room: mapRoom(payload.new) }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  return state;
}

// ─── Mappers ─────────────────────────────────────────────────

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
    isOnline: (p.is_online as boolean) ?? true,
  };
}

function mapGameState(g: Record<string, unknown>): GameState {
  return {
    id: g.id as string,
    roomId: g.room_id as string,
    roundNumber: g.round_number as number,
    status: g.status as GameState['status'],
    hands: g.hands as GameState['hands'],
    boneyard: (g.boneyard as Tile[]) ?? [],
    chain: (g.chain as GameState['chain']) ?? [],
    leftEnd: g.left_end as number | null,
    rightEnd: g.right_end as number | null,
    currentSeat: g.current_seat as Seat,
    passCount: g.pass_count as number,
    roundScores: g.round_scores as { 0: number; 1: number },
    firstSeat: g.first_seat as Seat,
  };
}

function mapScore(s: Record<string, unknown>): ScoreEntry {
  return {
    roundNumber: s.round_number as number,
    team0Delta: s.team0_delta as number,
    team1Delta: s.team1_delta as number,
    team0Total: s.team0_total as number,
    team1Total: s.team1_total as number,
    reason: s.finish_reason as ScoreEntry['reason'],
    winnerTeam: s.winner_team as 0 | 1 | null,
  };
}

function mapChat(c: Record<string, unknown>): ChatMessage {
  return {
    id: c.id as string,
    roomId: c.room_id as string,
    userId: c.user_id as string,
    nickname: c.nickname as string,
    message: c.message as string | undefined,
    reaction: c.reaction as string | undefined,
    createdAt: c.created_at as string,
  };
}
