'use client';
import { useState } from 'react';
import { CommitReport } from '@/types/room';

interface Props {
  report: CommitReport;
  roomId?: string;
}

export default function CommitReportPanel({ report, roomId = 'ECHO' }: Props) {
  const time = new Date(report.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [copied, setCopied] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  const toggleTask = (index: number) => {
    setCompletedTasks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getMarkdownContent = () => {
    return `# Meeting Report — Room ${roomId}
Generated at ${new Date(report.generatedAt).toLocaleString()}

## Executive Summary
${report.summary || 'No summary available.'}

## Key Takeaways
${report.keyPoints.map((p) => `- ${p}`).join('\n')}

## Decisions Made
${report.decisions.map((d) => `- [x] ${d}`).join('\n')}

## Action Items
${report.tasks.map((t, i) => `- [${completedTasks[i] ? 'x' : ' '}] **${t.title}** (Assignee: ${t.assignee || 'Unassigned'}, Priority: ${t.priority})`).join('\n')}

## Next Steps
${report.nextSteps.map((s) => `1. ${s}`).join('\n')}

---
*Created with Echo — AI Collaborative Visual Workspace*
`;
  };

  const downloadMarkdown = () => {
    const md = getMarkdownContent();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-report-${roomId}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const md = getMarkdownContent();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="commit-report">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>📋</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Meeting Report</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Generated at {time}</div>
          </div>
        </div>

        {/* Quick action badges */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '11px', padding: '4px 8px' }}
            onClick={copyToClipboard}
            title="Copy formatted summary"
          >
            {copied ? '✓ Copied' : '📄 Copy'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontSize: '11px', padding: '4px 8px' }}
            onClick={downloadMarkdown}
            title="Export Markdown file"
          >
            ⬇ Export .MD
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '16px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{report.decisions.length}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Decisions</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>{report.tasks.length}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tasks</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#3b82f6' }}>{report.keyPoints.length}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Key Points</div>
        </div>
      </div>

      {report.summary && (
        <div className="commit-section">
          <div className="commit-section-title">Executive Summary</div>
          <div className="commit-summary" style={{ lineHeight: '1.6', fontSize: '13px' }}>
            {report.summary}
          </div>
        </div>
      )}

      {report.decisions.length > 0 && (
        <div className="commit-section">
          <div className="commit-section-title">Decisions Agreed Upon</div>
          {report.decisions.map((d, i) => (
            <div key={i} className="commit-item" style={{ alignItems: 'flex-start' }}>
              <div className="commit-bullet" style={{ background: '#10b981', marginTop: '5px' }} />
              <span style={{ fontSize: '12px', lineHeight: '1.4' }}>{d}</span>
            </div>
          ))}
        </div>
      )}

      {report.tasks.length > 0 && (
        <div className="commit-section">
          <div className="commit-section-title">Action Items & Deliverables</div>
          {report.tasks.map((task, i) => {
            const isDone = !!completedTasks[i];
            return (
              <div
                key={i}
                className="commit-task"
                onClick={() => toggleTask(i)}
                style={{
                  cursor: 'pointer',
                  opacity: isDone ? 0.6 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: isDone ? '#10b981' : 'var(--text-muted)', fontSize: '13px' }}>
                    {isDone ? '☑' : '☐'}
                  </span>
                  <div
                    className="commit-task-title"
                    style={{ textDecoration: isDone ? 'line-through' : 'none' }}
                  >
                    {task.title}
                  </div>
                </div>
                <div className="commit-task-meta" style={{ marginTop: '4px', paddingLeft: '18px' }}>
                  {task.assignee && `👤 ${task.assignee} · `}
                  <span style={{
                    color: task.priority === 'high' ? '#f87171' : task.priority === 'medium' ? '#fcd34d' : '#6ee7b7',
                    fontWeight: 600,
                  }}>
                    {task.priority?.toUpperCase() || 'MEDIUM'} PRIORITY
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {report.keyPoints.length > 0 && (
        <div className="commit-section">
          <div className="commit-section-title">Key Discussion Points</div>
          {report.keyPoints.map((point, i) => (
            <div key={i} className="commit-item" style={{ alignItems: 'flex-start' }}>
              <div className="commit-bullet" style={{ marginTop: '5px' }} />
              <span style={{ fontSize: '12px', lineHeight: '1.4' }}>{point}</span>
            </div>
          ))}
        </div>
      )}

      {report.nextSteps.length > 0 && (
        <div className="commit-section">
          <div className="commit-section-title">Immediate Next Steps</div>
          {report.nextSteps.map((step, i) => (
            <div key={i} className="commit-item" style={{ alignItems: 'flex-start' }}>
              <div className="commit-bullet" style={{ background: '#3b82f6', marginTop: '5px' }} />
              <span style={{ fontSize: '12px', lineHeight: '1.4' }}>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
