'use client';
import { useState, useEffect, useRef } from 'react';
import { User } from '@/types/room';
import { TranscriptEntry } from '@/types/ai';
import { generateId } from '@/lib/canvasUtils';

export interface SimScenario {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  participants: Array<{ id: string; name: string; color: string; micOn: boolean; cameraOn: boolean }>;
  dialogue: Array<{ speaker: string; text: string; delayMs: number }>;
}

export const SCENARIOS: SimScenario[] = [
  {
    id: 'ai-workspace',
    title: 'AI Canvas Architecture Sync',
    subtitle: 'Team aligns on the living canvas engine, WebRTC mesh, and automated diagramming.',
    icon: '✦',
    participants: [
      { id: 'sim-alex', name: 'Alex Vance', color: '#7c3aed', micOn: true, cameraOn: true },
      { id: 'sim-maya', name: 'Maya Lin', color: '#ec4899', micOn: true, cameraOn: true },
      { id: 'sim-liam', name: 'Liam Zhang', color: '#3b82f6', micOn: true, cameraOn: true },
      { id: 'sim-sophie', name: 'Sophie Dubost', color: '#10b981', micOn: true, cameraOn: true },
    ],
    dialogue: [
      { speaker: 'Alex Vance', text: "Let's align on the architecture for our AI collaborative visual workspace. The core vision is: the conversation becomes the canvas.", delayMs: 2500 },
      { speaker: 'Maya Lin', text: "Exactly. As we speak, the AI should parse concepts into a central mindmap, highlight decisions on amber cards, and extract tasks with assignees.", delayMs: 3200 },
      { speaker: 'Liam Zhang', text: "I will implement the SVG Bezier connector layer linking decisions directly to downstream tasks and flow steps so relationships are clear.", delayMs: 3500 },
      { speaker: 'Sophie Dubost', text: "I'll wire the hybrid AI engine: GPT-4o cloud plus a local zero-key semantic heuristic analyzer that generates nodes even offline.", delayMs: 3200 },
      { speaker: 'Alex Vance', text: "Decision agreed: we approve the living canvas architecture. Liam owns connector synchronization, and Sophie handles resilient NLP pipeline.", delayMs: 3400 },
      { speaker: 'Maya Lin', text: "Great! Let's ensure the meeting commit report exports clean Markdown deliverables and canvas snapshots for the executive summary.", delayMs: 3000 },
    ],
  },
  {
    id: 'product-launch',
    title: 'Quarterly Product Launch & GTM',
    subtitle: 'Cross-functional alignment on release dates, marketing campaigns, and infrastructure readiness.',
    icon: '🚀',
    participants: [
      { id: 'sim-sarah', name: 'Sarah Connor', color: '#f59e0b', micOn: true, cameraOn: true },
      { id: 'sim-marcus', name: 'Marcus Brody', color: '#06b6d4', micOn: true, cameraOn: true },
      { id: 'sim-elena', name: 'Elena Rostova', color: '#8b5cf6', micOn: true, cameraOn: true },
    ],
    dialogue: [
      { speaker: 'Sarah Connor', text: "Our target launch date for Echo 2.0 is next Tuesday. We need complete readiness across marketing, docs, and infrastructure.", delayMs: 2800 },
      { speaker: 'Marcus Brody', text: "For growth, I will prepare the Product Hunt launch kit, tech community demos, and social media teaser animations.", delayMs: 3200 },
      { speaker: 'Elena Rostova', text: "Infrastructure is 99.9% ready. We need to run stress tests on WebRTC mesh signaling with 20 concurrent rooms.", delayMs: 3400 },
      { speaker: 'Sarah Connor', text: "We decided: launch is approved for Tuesday. Marcus owns community outreach and Elena oversees load testing and server reliability.", delayMs: 3200 },
    ],
  },
  {
    id: 'ux-review',
    title: 'Design System & Canvas Interaction',
    subtitle: 'Reviewing glassmorphism, responsive minimap, and keyboard workflows.',
    icon: '🎨',
    participants: [
      { id: 'sim-oliver', name: 'Oliver Twist', color: '#10b981', micOn: true, cameraOn: true },
      { id: 'sim-chloe', name: 'Chloe Bennett', color: '#ec4899', micOn: true, cameraOn: true },
      { id: 'sim-david', name: 'David Kim', color: '#3b82f6', micOn: true, cameraOn: true },
    ],
    dialogue: [
      { speaker: 'Oliver Twist', text: "Let's review the canvas UI. Sleek dark themes with glassmorphic floating bars give the workspace an ultra-modern aesthetic.", delayMs: 2800 },
      { speaker: 'Chloe Bennett', text: "I suggest color-coding nodes: purple for mindmaps, green for verified tasks, amber for key decisions, and blue for flow states.", delayMs: 3200 },
      { speaker: 'David Kim', text: "We must ensure full keyboard accessibility: Ctrl+Z for undo, Ctrl+Y for redo, and smooth trackpad pinch-to-zoom.", delayMs: 3000 },
      { speaker: 'Oliver Twist', text: "Agreed. Let's lock in these design guidelines for all future canvas node extensions.", delayMs: 2800 },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddSimUser: (user: User) => void;
  onAddTranscript: (entry: TranscriptEntry) => void;
  onTriggerGenerate: () => void;
  currentUsers: User[];
}

export default function SimulationModal({
  isOpen,
  onClose,
  onAddSimUser,
  onAddTranscript,
  onTriggerGenerate,
}: Props) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SCENARIOS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleStart = () => {
    setIsPlaying(true);
    setCurrentStep(0);

    // Add simulated participants to the room
    scenario.participants.forEach((p) => {
      onAddSimUser(p);
    });

    runStep(0);
  };

  const runStep = (stepIdx: number) => {
    if (stepIdx >= scenario.dialogue.length) {
      setIsPlaying(false);
      onTriggerGenerate();
      return;
    }

    setCurrentStep(stepIdx);
    const item = scenario.dialogue[stepIdx];

    timerRef.current = setTimeout(() => {
      onAddTranscript({
        id: generateId(),
        text: item.text,
        speaker: item.speaker,
        timestamp: Date.now(),
      });

      // Automatically trigger AI generation at key milestones (e.g., every 2nd utterance)
      if ((stepIdx + 1) % 2 === 0 || stepIdx === scenario.dialogue.length - 1) {
        onTriggerGenerate();
      }

      runStep(stepIdx + 1);
    }, item.delayMs);
  };

  const handleStop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🎭</span>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Simulate Team Meeting</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Watch the conversation automatically construct the visual canvas in real time.
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ width: '28px', height: '28px' }}>✕</button>
        </div>

        {/* Scenario selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {SCENARIOS.map((sc) => (
            <div
              key={sc.id}
              onClick={() => !isPlaying && setSelectedScenarioId(sc.id)}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: selectedScenarioId === sc.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                background: selectedScenarioId === sc.id ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-card)',
                cursor: isPlaying ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '24px' }}>{sc.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: selectedScenarioId === sc.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {sc.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {sc.subtitle}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {sc.participants.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '99px',
                        background: `${p.color}22`,
                        color: p.color,
                        fontWeight: 600,
                      }}
                    >
                      {p.name.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Active playback progress */}
        {isPlaying && (
          <div style={{
            background: 'var(--bg-card)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                <span className="live-dot" />
                <span>Simulating: {scenario.dialogue[currentStep]?.speaker}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Step {currentStep + 1} of {scenario.dialogue.length}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
              &ldquo;{scenario.dialogue[currentStep]?.text}&rdquo;
            </div>
            <div style={{ height: '4px', width: '100%', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: 'var(--accent-primary)',
                  width: `${((currentStep + 1) / scenario.dialogue.length) * 100}%`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={isPlaying}>
            Cancel
          </button>
          {isPlaying ? (
            <button className="btn btn-danger" onClick={handleStop}>
              ⏹ Stop Simulation
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleStart}>
              ▶ Run Live Simulation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
