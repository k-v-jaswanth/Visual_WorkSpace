'use client';
import { useState } from 'react';
import { RoomMode } from '@/types/room';
import { CommitReport } from '@/types/room';
import { TranscriptEntry } from '@/types/ai';
import ModeSelector from './ModeSelector';
import TranscriptFeed from './TranscriptFeed';
import CommitReportPanel from './CommitReport';

interface Props {
  mode: RoomMode;
  transcript: TranscriptEntry[];
  commitReport: CommitReport | null;
  echoMessage: string;
  isThinking: boolean;
  interimText?: string;
  speakerName?: string;
  onModeChange: (mode: RoomMode) => void;
  onCommit: () => void;
  onGenerateNodes: () => void;
  onGenerateImage: (prompt: string) => void;
  onClose?: () => void;
}

type Tab = 'transcript' | 'report' | 'ai';

export default function EchoPanel({
  mode, transcript, commitReport, echoMessage, isThinking,
  interimText, speakerName, onModeChange, onCommit, onGenerateNodes, onGenerateImage, onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const [imagePrompt, setImagePrompt] = useState('');

  return (
    <div className="echo-panel animate-slide-right">
      {/* Header */}
      <div className="echo-panel-header">
        <div className="echo-logo">✦</div>
        <div>
          <div className="echo-panel-title">Echo</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AI Assistant</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isThinking && (
            <div className="ai-thinking-dots"><span /><span /><span /></div>
          )}
          {onClose && (
            <button
              id="close-echo-panel-btn"
              className="btn-icon"
              onClick={onClose}
              title="Hide panel"
              style={{ width: '26px', height: '26px', fontSize: '14px' }}
            >›</button>
          )}
        </div>
      </div>

      {/* Mode selector */}
      <ModeSelector mode={mode} onChange={onModeChange} />

      {/* Echo message */}
      {echoMessage && (
        <div className="ai-thinking" style={{ margin: '8px 16px', fontSize: '12px' }}>
          <span>✦</span>
          <span>{echoMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="echo-panel-tabs">
        <div className={`echo-tab ${activeTab === 'transcript' ? 'active' : ''}`} onClick={() => setActiveTab('transcript')}>
          Transcript {transcript.length > 0 && <span style={{ fontSize: '10px', marginLeft: '3px', opacity: 0.7 }}>({transcript.length})</span>}
        </div>
        <div className={`echo-tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
          AI Tools
        </div>
        <div className={`echo-tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
          Report
        </div>
      </div>

      {/* Body */}
      <div className="echo-panel-body">
        {activeTab === 'transcript' && (
          <TranscriptFeed entries={transcript} interimText={interimText} speakerName={speakerName} />
        )}

        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Generate from transcript */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Canvas Generation
              </div>
              <button
                id="generate-from-transcript-btn"
                className="btn btn-primary w-full"
                onClick={onGenerateNodes}
                disabled={isThinking || transcript.length === 0}
                style={{ marginBottom: '8px' }}
              >
                {isThinking ? '⟳ Thinking…' : '✦ Generate from Conversation'}
              </button>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Analyzes your conversation and adds visual elements to the canvas automatically.
              </p>
            </div>

            <div className="divider" />

            {/* Image generation */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                AI Image Generation
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  className="input"
                  placeholder="Describe an image to generate…"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && imagePrompt.trim()) { onGenerateImage(imagePrompt); setImagePrompt(''); } }}
                />
                <button
                  id="generate-image-btn"
                  className="btn btn-ghost"
                  onClick={() => { if (imagePrompt.trim()) { onGenerateImage(imagePrompt); setImagePrompt(''); } }}
                  disabled={!imagePrompt.trim() || isThinking}
                >
                  🖼️ Generate Image
                </button>
              </div>
            </div>

            <div className="divider" />

            {/* Tips */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Echo Tips
              </div>
              {[
                { icon: '🎙️', tip: 'Speak naturally — Echo listens and builds your canvas' },
                { icon: '💬', tip: 'Type instructions in "Ask Echo" to guide the AI' },
                { icon: '🎯', tip: 'Switch modes to change how Echo visualizes ideas' },
                { icon: '📌', tip: 'Use "Follow Me" to sync everyone\'s view' },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  <span>{t.icon}</span>
                  <span>{t.tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div>
            {commitReport ? (
              <CommitReportPanel report={commitReport} />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>No report yet</div>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                  Click the Commit button to generate a meeting summary, action items, and decisions.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Commit button */}
      <button
        id="commit-btn-panel"
        className="commit-btn"
        onClick={onCommit}
        disabled={isThinking}
      >
        {isThinking ? <span className="animate-spin">⟳</span> : '●'}
        {isThinking ? 'Generating Report…' : 'Commit'}
      </button>
    </div>
  );
}
