'use client';
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, RoomPlayer } from '@/types/game';
import { REACTIONS } from '@/lib/game/scoring';

interface ChatProps {
  messages: ChatMessage[];
  players: RoomPlayer[];
  myUserId: string;
  myNickname: string;
  onSend: (message?: string, reaction?: string) => void;
}

export default function Chat({ messages, players, myUserId, myNickname, onSend }: ChatProps) {
  const [text, setText] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const sendReaction = (emoji: string) => {
    onSend(undefined, emoji);
    setShowReactions(false);
  };

  const getTeamColor = (userId: string) => {
    const player = players.find(p => p.userId === userId);
    if (!player) return 'var(--text-muted)';
    return player.team === 0 ? 'var(--team-a)' : 'var(--team-b)';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>💬 ჩეთი</div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.empty}>გამარჯობა! მოთამაშეები ელოდებიან...</div>
        )}
        {messages.map(msg => {
          const isMe = msg.userId === myUserId;
          return (
            <div key={msg.id} style={{
              ...styles.message,
              flexDirection: isMe ? 'row-reverse' : 'row',
            }}>
              <span style={{
                ...styles.nick,
                color: getTeamColor(msg.userId),
              }}>
                {isMe ? 'მე' : msg.nickname}
              </span>
              {msg.reaction ? (
                <span style={styles.reaction}>{msg.reaction}</span>
              ) : (
                <span style={{
                  ...styles.bubble,
                  background: isMe
                    ? 'rgba(200,168,80,0.15)'
                    : 'rgba(255,255,255,0.06)',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                }}>
                  {msg.message}
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Emoji reactions */}
      {showReactions && (
        <div style={styles.reactionsPanel}>
          {REACTIONS.map(r => (
            <button
              key={r.emoji}
              style={styles.reactionBtn}
              onClick={() => sendReaction(r.emoji)}
              title={r.label}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={styles.inputRow}>
        <button
          style={styles.emojiToggle}
          onClick={() => setShowReactions(s => !s)}
          title="რეაქცია"
        >
          😄
        </button>
        <input
          style={styles.input}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="შეტყობინება..."
          maxLength={120}
        />
        <button
          style={styles.sendBtn}
          onClick={send}
          disabled={!text.trim()}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'rgba(10,20,12,0.7)',
    borderRadius: '8px',
    border: '1px solid rgba(90,62,38,0.3)',
    overflow: 'hidden',
  },
  header: {
    padding: '8px 12px',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '200px',
  },
  empty: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    textAlign: 'center',
    padding: '16px 0',
    fontStyle: 'italic',
  },
  message: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
  },
  nick: {
    fontSize: '0.65rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    paddingTop: '3px',
    flexShrink: 0,
  },
  bubble: {
    fontSize: '0.8rem',
    color: 'var(--text-light)',
    padding: '4px 8px',
    borderRadius: '8px',
    maxWidth: '80%',
    wordBreak: 'break-word',
    lineHeight: 1.4,
  },
  reaction: {
    fontSize: '1.4rem',
    lineHeight: 1,
  },
  reactionsPanel: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    padding: '6px 10px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.2)',
  },
  reactionBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.1s ease',
  },
  inputRow: {
    display: 'flex',
    gap: '4px',
    padding: '6px 8px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  emojiToggle: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    padding: '0 4px',
    opacity: 0.7,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--felt-light)',
    borderRadius: '4px',
    color: 'var(--text-light)',
    fontFamily: 'var(--font-geo)',
    fontSize: '0.8rem',
    padding: '4px 8px',
    outline: 'none',
  },
  sendBtn: {
    background: 'linear-gradient(180deg, #c8a850 0%, #9a7a2a 100%)',
    border: 'none',
    borderRadius: '4px',
    color: '#1a1008',
    cursor: 'pointer',
    padding: '4px 10px',
    fontWeight: 700,
    fontSize: '0.8rem',
    flexShrink: 0,
  },
};
