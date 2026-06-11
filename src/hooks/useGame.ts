'use client';
import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { validateMove, applyMove, canPlay, calculateRoundResult, isGameOver } from '@/lib/game/engine';
import { generateTileSet, shuffleTiles, dealTiles, findFirstPlayer } from '@/lib/game/tiles';
import type { Tile, Seat, PlaceSide, GameState, Team } from '@/types/game';
import { seatToTeam } from '@/types/game';

export function useGame(roomId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const startGame = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Deal tiles
      const tiles = shuffleTiles(generateTileSet());
      const { hands, boneyard } = dealTiles(tiles);
      const firstSeat = findFirstPlayer(hands);

      await supabase.from('game_states').insert({
        room_id: roomId,
        round_number: 1,
        status: 'active',
        hands,
        boneyard,
        chain: [],
        left_end: null,
        right_end: null,
        current_seat: firstSeat,
        pass_count: 0,
        round_scores: { 0: 0, 1: 0 },
        first_seat: firstSeat,
      });

      await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [roomId]);

  const placeTile = useCallback(async (
    gameState: GameState,
    seat: Seat,
    tile: Tile,
    side: PlaceSide,
    currentTotals: { 0: number; 1: number },
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      const validation = validateMove(gameState, seat, tile, side);
      if (!validation.valid) {
        setError(validation.reason ?? 'Invalid move');
        return;
      }

      const nextState = applyMove(gameState, { seat, type: 'place', tile, side });

      // Log move
      await supabase.from('moves').insert({
        room_id: roomId,
        round_id: gameState.id,
        seat,
        move_type: 'place',
        tile,
        side,
      });

      // Update game state
      await supabase.from('game_states').update({
        hands: nextState.hands,
        chain: nextState.chain,
        left_end: nextState.leftEnd,
        right_end: nextState.rightEnd,
        current_seat: nextState.currentSeat,
        pass_count: nextState.passCount,
        status: nextState.status,
        updated_at: new Date().toISOString(),
      }).eq('id', gameState.id);

      // Check round end
      if (nextState.status === 'finished') {
        await endRound(nextState, currentTotals);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [roomId]);

  const passTurn = useCallback(async (
    gameState: GameState,
    seat: Seat,
    currentTotals: { 0: number; 1: number },
  ) => {
    if (canPlay(gameState, seat)) {
      setError('შეგიძლიათ ითამაშოთ — ვერ გაიტანთ');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const nextState = applyMove(gameState, { seat, type: 'pass' });

      await supabase.from('moves').insert({
        room_id: roomId,
        round_id: gameState.id,
        seat,
        move_type: 'pass',
      });

      await supabase.from('game_states').update({
        current_seat: nextState.currentSeat,
        pass_count: nextState.passCount,
        status: nextState.status,
        updated_at: new Date().toISOString(),
      }).eq('id', gameState.id);

      if (nextState.status === 'blocked') {
        await endRound(nextState, currentTotals);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [roomId]);

  const endRound = useCallback(async (
    finalState: GameState,
    currentTotals: { 0: number; 1: number },
  ) => {
    const result = calculateRoundResult(finalState, currentTotals);

    const newTotals = {
      0: currentTotals[0] + result.team0Delta,
      1: currentTotals[1] + result.team1Delta,
    };

    await supabase.from('score_history').insert({
      room_id: roomId,
      round_number: finalState.roundNumber,
      team0_delta: result.team0Delta,
      team1_delta: result.team1Delta,
      team0_total: newTotals[0],
      team1_total: newTotals[1],
      finish_reason: result.reason,
      winner_team: result.winnerTeam,
    });

    // Check if game is over
    const gameWinner = isGameOver(newTotals);
    if (gameWinner !== null) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
      return;
    }

    // Start next round
    await startNextRound(finalState.roundNumber + 1, result.winnerTeam);
  }, [roomId]);

  const startNextRound = useCallback(async (roundNumber: number, leaderTeam: Team) => {
    const tiles = shuffleTiles(generateTileSet());
    const { hands, boneyard } = dealTiles(tiles);
    // The winner of last round leads — find their first seat
    // Simple: let the engine find the highest double
    const firstSeat = findFirstPlayer(hands);

    await supabase.from('game_states').insert({
      room_id: roomId,
      round_number: roundNumber,
      status: 'active',
      hands,
      boneyard,
      chain: [],
      left_end: null,
      right_end: null,
      current_seat: firstSeat,
      pass_count: 0,
      round_scores: { 0: 0, 1: 0 },
      first_seat: firstSeat,
    });
  }, [roomId]);

  const sendChat = useCallback(async (
    userId: string,
    nickname: string,
    message?: string,
    reaction?: string,
  ) => {
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      user_id: userId,
      nickname,
      message,
      reaction,
    });
  }, [roomId]);

  return { startGame, placeTile, passTurn, sendChat, submitting, error };
}
