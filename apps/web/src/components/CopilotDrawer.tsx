import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles, User, HelpCircle } from 'lucide-react';
import { apiClient } from '../api/client';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductId?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isDemo?: boolean;
  timestamp: string;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  onClose,
  selectedProductId,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `👋 **Welcome to CatalogPilot AI Copilot!**\n\nI can analyze your catalog health, inspect missing attributes or duplicate SKUs, and assist with automated product enrichment. What would you like to investigate?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    'Catalog health overview',
    'Which products need attention most?',
    'Explain duplicate SKU risks',
    'How does the 4-agent workflow work?',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiClient.askCopilot(text, selectedProductId);
      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        isDemo: data.is_demo,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Error communicating with Copilot:** ${err.message || 'Server error'}. Please check if the API is active.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '420px',
        maxWidth: '90vw',
        background: '#0d1322',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(17, 24, 39, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC' }}>
              Catalog Copilot
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              Autonomous Catalog Intelligence
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Suggested Prompts */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#CBD5E1',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: isUser ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : '#172238',
                  border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.07)',
                  color: isUser ? '#fff' : '#E2E8F0',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#64748B',
                  marginTop: '4px',
                  display: 'flex',
                  gap: '6px',
                }}
              >
                <span>{m.timestamp}</span>
                {m.isDemo && <span style={{ color: '#FBBF24' }}>• Demo Assistant</span>}
              </div>
            </div>
          );
        })}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#94A3B8',
              fontSize: '0.85rem',
            }}
          >
            <Sparkles size={16} className="animate-spin" color="#06B6D4" />
            <span>CatalogPilot is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: '14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(17, 24, 39, 0.6)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about catalog health..."
          className="glass-input"
          style={{ flex: 1, fontSize: '0.88rem' }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary"
          style={{ padding: '8px 14px' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
