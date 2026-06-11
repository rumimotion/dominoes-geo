'use client';
import { use } from 'react';
import { useRoom } from '@/hooks/useRoom';
import { useGame } from '@/hooks/useGame';
import GameBoard from '@/components/game/GameBoard';
import PlayerHand from '@/components/game/PlayerHand';
import ScoreBoard from '@/components/game/ScoreBoard';
import Chat from '@/components/game/Chat';
import Lobby from '@/components/game/Lobby';
import type { Tile, PlaceSide } from '@/types/game';
import '@/styles/globals.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RoomPage({ params }: PageProps) {
  const { id: roomId } = use(params);
  const roomState = useRoom(roomId);
  const { startGame, placeTile, passTurn, sendChat, submitting, error: gameError } = useGame(roomId);

  const {
    room, players, gameState, scores, chat,
    myUserId, mySeat, myHand, isMyTurn, loading,
  } = roomState;

  // Compute cumulative totals
  const currentTotals = {
    0: scores.at(-1)?.team0Total ?? 0,
    1: scores.at(-1)?.team1Total ?? 0,
  };

  const myNickname = players.find(p => p.userId === myUserId)?.nickname ?? 'მე';

  const handlePlay = (tile: Tile, side: PlaceSide) => {
    if (!gameState || mySeat === null) return;
    placeTile(gameState, mySeat, tile, side, currentTotals);
  };

  const handlePass = () => {
    if (!gameState || mySeat === null) return;
    passTurn(gameState, mySeat, currentTotals);
  };

  if (loading) {
    return (
      <div style={loadingStyle} className="felt-texture">
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🀱</div>
        <div style={{ color: 'var(--text-muted)' }}>იტვირთება...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={loadingStyle} className="felt-texture">
        <div style={{ color: '#e08080' }}>კომნატა ვერ მოიძებნა</div>
      </div>
    );
  }

  // Game finished
  if (room.status === 'finished') {
    const winner: 0 | 1 = currentTotals[0] >= 355 ? 0 : 1;
const loser: 0 | 1 = winner === 0 ? 1 : 0;
const isMshrali = currentTotals[loser] < 200;
    return (
      <div style={{ ...loadingStyle, gap: '20px' }} className="felt-texture">
        <div style={{ fontSize: '3rem' }}>🏆</div>
        <div style={{ fontSize: '1.4rem', color: 'var(--team-a)', fontWeight: 700 }}>
          {winner === 0 ? 'პირველი წყვილი' : 'მეორე წყვილი'} გაიმარჯვა!
        </div>
        {isMshrali && (
          <div style={{ color: '#e08080', fontSize: '1rem', fontWeight: 600 }}>
            მშრალი წაგება! (200-ზე ნაკლები)
          </div>
        )}
        <div style={{ display: 'flex', gap: '32px', fontFamily: 'var(--font-mono)', fontSize: '1.5rem' }}>
          <span style={{ color: 'var(--team-a)' }}>{currentTotals[0]}</span>
          <span style={{ color: 'var(--text-muted)' }}>:</span>
          <span style={{ color: 'var(--team-b)' }}>{currentTotals[1]}</span>
        </div>
        <ScoreBoard scores={scores} players={players} />
        <a href="/" style={{ color: 'var(--team-a)', fontSize: '0.9rem' }}>← მთავარ გვერდზე</a>
      </div>
    );
  }

  // Lobby
  if (room.status === 'waiting') {
    return (
      <div className="felt-texture" style={{ minHeight: '100vh' }}>
        <Lobby
          room={room}
          players={players}
          myUserId={myUserId}
          onStart={startGame}
          starting={submitting}
        />
      </div>
    );
  }

  // Active game
  return (
    <div style={gameLayout} className="felt-texture">
      {/* Top bar */}
      <header style={styles.topBar}>
        <div style={styles.roomCode}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>კომნატა</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--chalk-white)', letterSpacing: '0.2em' }}>
            {room.code}
          </span>
        </div>
        <div style={styles.roundLabel}>
          მე-{gameState?.roundNumber ?? 1} რაუნდი
        </div>
        <div style={styles.scoresSummary}>
          <span style={{ color: 'var(--team-a)' }}>{currentTotals[0]}</span>
          <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>:</span>
          <span style={{ color: 'var(--team-b)' }}>{currentTotals[1]}</span>
        </div>
      </header>

      {/* Error */}
      {gameError && (
        <div style={styles.errorBanner}>{gameError}</div>
      )}

      {/* Main layout */}
      <div style={styles.mainGrid}>
        {/* Left: score + chat */}
        <aside style={styles.sidebar}>
          <ScoreBoard scores={scores} players={players} compact />
          <div style={{ flex: 1, minHeight: '200px' }}>
            <Chat
              messages={chat}
              players={players}
              myUserId={myUserId}
              myNickname={myNickname}
              onSend={(msg, reaction) => sendChat(myUserId, myNickname, msg, reaction)}
            />
          </div>
        </aside>

        {/* Center: board + hand */}
        <main style={styles.gameArea}>
          <GameBoard
            gameState={gameState}
            players={players}
            mySeat={mySeat}
          />

          {mySeat !== null && (
            <PlayerHand
              hand={myHand}
              gameState={gameState}
              mySeat={mySeat}
              isMyTurn={isMyTurn}
              onPlay={handlePlay}
              onPass={handlePass}
              submitting={submitting}
            />
          )}

          {mySeat === null && (
            <div style={styles.spectatorNote}>
              👁 მაყურებელი — {players.length}/4 მოთამაშე
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const loadingStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
};

const gameLayout: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
};

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    borderBottom: '1px solid rgba(90,62,38,0.3)',
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(4px)',
  },
  roomCode: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  roundLabel: {
    color: 'var(--chalk-cream)',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-mono)',
  },
  scoresSummary: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--chalk-white)',
  },
  errorBanner: {
    background: 'rgba(160,64,64,0.15)',
    border: '1px solid rgba(160,64,64,0.4)',
    color: '#e08080',
    fontSize: '0.82rem',
    padding: '6px 16px',
    textAlign: 'center',
  },
  mainGrid: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    gap: '0',
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    flexShrink: 0,
    borderRight: '1px solid rgba(90,62,38,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px',
    overflowY: 'auto',
  },
  gameArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    alignItems: 'center',
    overflowY: 'auto',
  },
  spectatorNote: {
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    padding: '12px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    textAlign: 'center',
  },
};
