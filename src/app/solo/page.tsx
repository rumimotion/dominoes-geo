'use client';
import { useState, useCallback } from 'react';
import type { Tile, Seat, PlaceSide, GameState, Hands } from '@/types/game';
import { validateMove, applyMove, canPlay, legalTiles, legalSides, calculateRoundResult } from '@/lib/game/engine';
import { generateTileSet, shuffleTiles, dealTiles, findFirstPlayer, sortHand } from '@/lib/game/tiles';
import DominoTile from '@/components/game/DominoTile';
import '@/styles/globals.css';

const TEAM_COLORS = ['#c8a850', '#a04040', '#c8a850', '#a04040'];
const SEAT_NAMES = ['სამხრეთი (ა)', 'დასავლეთი (ბ)', 'ჩრდილოეთი (ა)', 'აღმოსავლეთი (ბ)'];

function createGame(): GameState {
  const tiles = shuffleTiles(generateTileSet());
  const { hands, boneyard } = dealTiles(tiles);
  const firstSeat = findFirstPlayer(hands);
  return {
    id: 'solo-test',
    roomId: 'solo',
    roundNumber: 1,
    status: 'active',
    hands,
    boneyard,
    chain: [],
    leftEnd: null,
    rightEnd: null,
    currentSeat: firstSeat,
    passCount: 0,
    roundScores: { 0: 0, 1: 0 },
    firstSeat,
  };
}

export default function SoloTestPage() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [selected, setSelected] = useState<Tile | null>(null);
  const [message, setMessage] = useState('');
  const [scores, setScores] = useState({ 0: 0, 1: 0 });
  const [log, setLog] = useState<string[]>(['თამაში დაიწყო! პირველი სვლა: ' + SEAT_NAMES[findFirstPlayer(game.hands)]]);
  const [showAllHands, setShowAllHands] = useState(true);

  const seat = game.currentSeat;
  const hand = game.hands[seat];
  const legal = legalTiles(game, seat);
  const isLegal = (t: Tile) => legal.some(lt => lt[0] === t[0] && lt[1] === t[1]);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev.slice(0, 19)]);

  const handleTileClick = useCallback((tile: Tile) => {
    if (!isLegal(tile)) {
      setMessage(`❌ ეს ქვა არ ჯდება! (${tile[0]}-${tile[1]})`);
      return;
    }
    if (selected && selected[0] === tile[0] && selected[1] === tile[1]) {
      setSelected(null);
      setMessage('');
      return;
    }
    setSelected(tile);
    setMessage('');

    if (game.chain.length === 0) {
      // First move
      placeTile(tile, 'first');
      return;
    }

    const sides = legalSides(game, tile);
    if (sides.length === 1) {
      placeTile(tile, sides[0]);
    } else {
      setMessage(`სად დადებთ ${tile[0]}-${tile[1]}? აირჩიეთ მხარე ▼`);
    }
  }, [game, selected]);

  const placeTile = useCallback((tile: Tile, side: PlaceSide) => {
    const validation = validateMove(game, seat, tile, side);
    if (!validation.valid) {
      setMessage('❌ ' + validation.reason);
      setSelected(null);
      return;
    }
    const next = applyMove(game, { seat, type: 'place', tile, side });
    addLog(`${SEAT_NAMES[seat]}: დადო [${tile[0]}-${tile[1]}] ${side === 'left' ? '◀ მარცხნივ' : side === 'right' ? 'მარჯვნივ ▶' : 'პირველი'}`);
    setSelected(null);
    setMessage('');

    if (next.status === 'finished') {
      const result = calculateRoundResult(next, scores);
      const newScores = {
        0: scores[0] + result.team0Delta,
        1: scores[1] + result.team1Delta,
      };
      setScores(newScores);
      addLog(`🏆 დომინო! გაიმარჯვა: ${result.winnerTeam === 0 ? 'პირველი' : 'მეორე'} წყვილი +${result.winnerTeam === 0 ? result.team0Delta : result.team1Delta}`);
      if (newScores[0] >= 355 || newScores[1] >= 355) {
        addLog('🎉 თამაში დასრულდა!');
      }
    } else if (next.status === 'blocked') {
      const result = calculateRoundResult(next, scores);
      const newScores = {
        0: scores[0] + result.team0Delta,
        1: scores[1] + result.team1Delta,
      };
      setScores(newScores);
      addLog(`🐟 თევზი! გამარჯვებული: ${result.winnerTeam === 0 ? 'პირველი' : 'მეორე'} წყვილი`);
    }
    setGame(next);
  }, [game, seat, scores]);

  const handlePass = useCallback(() => {
    if (canPlay(game, seat)) {
      setMessage('❌ გამოტოვება არ შეიძლება — გაქვთ სათამაშო ქვა!');
      return;
    }
    const next = applyMove(game, { seat, type: 'pass' });
    addLog(`${SEAT_NAMES[seat]}: გამოტოვა`);
    setGame(next);
    setMessage('');
  }, [game, seat]);

  const handleSide = (side: PlaceSide) => {
    if (!selected) return;
    placeTile(selected, side);
  };

  const newRound = () => {
    const newGame = createGame();
    setGame(newGame);
    setSelected(null);
    setMessage('');
    addLog(`--- მე-${game.roundNumber + 1} რაუნდი ---`);
  };

  const newGame = () => {
    setGame(createGame());
    setScores({ 0: 0, 1: 0 });
    setLog(['ახალი თამაში!']);
    setSelected(null);
    setMessage('');
  };

  const needsSideChoice = selected && game.chain.length > 0 && legalSides(game, selected).length === 2;

  return (
    <div style={styles.page} className="felt-texture">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🀱</span>
          <span style={styles.title}>სოლო ტესტი</span>
        </div>
        <div style={styles.scores}>
          <span style={{ color: '#c8a850' }}>ა: {scores[0]}</span>
          <span style={{ color: '#666' }}> / </span>
          <span style={{ color: '#a04040' }}>ბ: {scores[1]}</span>
          <span style={{ color: '#555', fontSize: '0.7rem', marginLeft: '8px' }}>/355</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.btnSmall} onClick={() => setShowAllHands(s => !s)}>
            {showAllHands ? '👁 ყველა ხელი' : '🙈 მხოლოდ მიმდინარე'}
          </button>
          <button style={styles.btnSmall} onClick={newRound}>ახალი რაუნდი</button>
          <button style={{ ...styles.btnSmall, background: 'rgba(160,64,64,0.3)' }} onClick={newGame}>ახალი თამაში</button>
        </div>
      </div>

      {/* Current turn banner */}
      <div style={{ ...styles.turnBanner, borderColor: TEAM_COLORS[seat] }}>
        <span style={{ color: TEAM_COLORS[seat], fontWeight: 700 }}>
          {SEAT_NAMES[seat]} — სვლა
        </span>
        <span style={{ color: '#888', fontSize: '0.8rem', marginLeft: '12px' }}>
          {hand.length} ქვა დარჩა
        </span>
        {game.status !== 'active' && (
          <span style={{ color: '#e08080', marginLeft: '12px' }}>
            {game.status === 'blocked' ? '🐟 თევზი!' : '🏆 დომინო!'}
          </span>
        )}
      </div>

      {/* Message */}
      {message && (
        <div style={styles.message}>{message}</div>
      )}

      {/* Side choice */}
      {needsSideChoice && (
        <div style={styles.sideChoice}>
          <span style={{ color: '#ddd', fontSize: '0.85rem' }}>
            [{selected![0]}-{selected![1]}] სად?
          </span>
          <button style={styles.sideBtn} onClick={() => handleSide('left')}>◀ მარცხნივ ({game.leftEnd})</button>
          <button style={styles.sideBtn} onClick={() => handleSide('right')}>მარჯვნივ ({game.rightEnd}) ▶</button>
          <button style={{ ...styles.sideBtn, background: 'rgba(255,255,255,0.05)', color: '#888' }}
            onClick={() => { setSelected(null); setMessage(''); }}>გაუქმება</button>
        </div>
      )}

      <div style={styles.main}>
        {/* Left: all hands */}
        <div style={styles.handsPanel}>
          {([0, 1, 2, 3] as Seat[]).map(s => {
            const isActive = s === seat;
            const h = game.hands[s];
            const show = showAllHands || isActive;
            return (
              <div key={s} style={{
                ...styles.handBlock,
                borderColor: isActive ? TEAM_COLORS[s] : 'rgba(255,255,255,0.08)',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.2)',
              }}>
                <div style={styles.handLabel}>
                  <span style={{ color: TEAM_COLORS[s], fontWeight: isActive ? 700 : 400 }}>
                    {isActive ? '▶ ' : ''}{SEAT_NAMES[s]}
                  </span>
                  <span style={{ color: '#555', fontSize: '0.7rem' }}>{h.length} ქვა</span>
                </div>
                {show && (
                  <div style={styles.tileRow}>
                    {sortHand(h).map((tile, i) => {
                      const legal = isActive && isLegal(tile);
                      const sel = isActive && selected?.[0] === tile[0] && selected?.[1] === tile[1];
                      return (
                        <div key={i} style={{
                          transform: sel ? 'translateY(-8px)' : 'none',
                          transition: 'transform 0.15s',
                          opacity: isActive && !legal && !sel ? 0.4 : 1,
                        }}>
                          <DominoTile
                            tile={tile}
                            selected={sel}
                            legal={legal}
                            onClick={isActive ? () => handleTileClick(tile) : undefined}
                            size="sm"
                          />
                        </div>
                      );
                    })}
                    {h.length === 0 && <span style={{ color: '#444', fontSize: '0.75rem' }}>ცარიელი</span>}
                  </div>
                )}
                {!show && (
                  <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                    {Array.from({ length: Math.min(h.length, 7) }).map((_, i) => (
                      <div key={i} style={styles.faceDown} />
                    ))}
                  </div>
                )}
                {isActive && !canPlay(game, s) && game.status === 'active' && (
                  <button style={styles.passBtn} onClick={handlePass}>
                    გამოტოვება (ვერ ვთამაშობ)
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Center: board */}
        <div style={styles.boardPanel}>
          {/* Chain */}
          <div style={styles.chainArea}>
            {game.chain.length === 0 ? (
              <div style={styles.emptyChain}>
                <div style={{ fontSize: '2rem', opacity: 0.3 }}>🀱</div>
                <div style={{ color: '#555', fontSize: '0.8rem', marginTop: '8px' }}>
                  ველოდებით პირველ სვლას...
                  <br/>უმაღლესი ორმაგი: [{game.firstSeat !== undefined ? '?' : '?'}]
                </div>
              </div>
            ) : (
              <div style={styles.chainScroll}>
                <div style={styles.chain}>
                  {game.chain.map((placed, idx) => (
                    <div key={idx} style={{ display: 'flex', flexShrink: 0 }}>
                      <DominoTile
                        tile={placed.tile}
                        flipped={placed.flipped}
                        size="sm"
                        orientation="horizontal"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {game.leftEnd !== null && (
              <div style={styles.ends}>
                <span style={styles.endTag}>◀ {game.leftEnd}</span>
                <span style={{ color: '#555', fontSize: '0.7rem' }}>{game.chain.length} ქვა მაგიდაზე</span>
                <span style={styles.endTag}>{game.rightEnd} ▶</span>
              </div>
            )}
          </div>

          {/* Log */}
          <div style={styles.logPanel}>
            <div style={styles.logTitle}>სვლების ისტორია</div>
            {log.map((entry, i) => (
              <div key={i} style={{
                ...styles.logEntry,
                color: i === 0 ? '#ddd' : '#666',
                fontWeight: i === 0 ? 500 : 400,
              }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rules reminder */}
      <div style={styles.rules}>
        <strong style={{ color: '#c8a850' }}>წესები:</strong>
        {' '}პირველი ქვა = უმაღლესი ორმაგი · მარჯვენა/მარცხენა ბოლო უნდა ემთხვეოდეს · 355 = გამარჯვება · მშრალი &lt; 200
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px 16px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  logo: { fontSize: '1.5rem' },
  title: { color: '#c8a850', fontWeight: 700, fontSize: '1rem' },
  scores: { fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700 },
  headerRight: { display: 'flex', gap: '6px' },
  btnSmall: {
    background: 'rgba(200,168,80,0.15)', border: '1px solid rgba(200,168,80,0.3)',
    borderRadius: '4px', color: '#c8a850', cursor: 'pointer',
    fontFamily: 'var(--font-geo)', fontSize: '0.75rem', padding: '4px 10px',
  },
  turnBanner: {
    background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '8px 16px',
    border: '1px solid', display: 'flex', alignItems: 'center',
  },
  message: {
    background: 'rgba(160,64,64,0.15)', border: '1px solid rgba(160,64,64,0.3)',
    borderRadius: '6px', padding: '6px 16px', color: '#e08080', fontSize: '0.85rem',
  },
  sideChoice: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(200,168,80,0.4)',
    borderRadius: '6px', padding: '8px 16px',
  },
  sideBtn: {
    background: 'linear-gradient(180deg, #c8a850 0%, #8a6020 100%)',
    border: 'none', borderRadius: '4px', color: '#1a1008',
    cursor: 'pointer', fontFamily: 'var(--font-geo)', fontWeight: 700,
    fontSize: '0.82rem', padding: '6px 12px',
  },
  main: { display: 'flex', gap: '8px', flex: 1, minHeight: 0 },
  handsPanel: {
    width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px',
    overflowY: 'auto',
  },
  handBlock: {
    border: '1px solid', borderRadius: '8px', padding: '8px 10px',
    transition: 'border-color 0.2s, background 0.2s',
  },
  handLabel: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '6px', fontSize: '0.78rem',
  },
  tileRow: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  faceDown: {
    width: '14px', height: '28px',
    background: 'linear-gradient(135deg, #3d2b1a, #1a0e08)',
    borderRadius: '2px', border: '1px solid rgba(0,0,0,0.5)',
  },
  passBtn: {
    marginTop: '6px', width: '100%',
    background: 'transparent', border: '1px solid rgba(160,64,64,0.4)',
    borderRadius: '4px', color: '#e08080', cursor: 'pointer',
    fontFamily: 'var(--font-geo)', fontSize: '0.75rem', padding: '4px',
  },
  boardPanel: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  chainArea: {
    flex: 1, background: 'rgba(26,51,32,0.6)', borderRadius: '10px',
    border: '3px solid var(--wood-dark)', padding: '12px',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  emptyChain: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' },
  chainScroll: { overflowX: 'auto', overflowY: 'hidden' },
  chain: { display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' },
  ends: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: '8px',
  },
  endTag: {
    background: 'rgba(0,0,0,0.4)', borderRadius: '3px',
    padding: '2px 8px', fontFamily: 'monospace', color: '#c8a850', fontSize: '0.8rem',
  },
  logPanel: {
    height: '160px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)',
    borderRadius: '6px', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.05)',
  },
  logTitle: { color: '#555', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' },
  logEntry: { fontSize: '0.78rem', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  rules: {
    background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '6px 16px',
    fontSize: '0.75rem', color: '#666',
  },
};
