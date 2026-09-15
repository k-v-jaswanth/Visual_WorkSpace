'use client';
import { MindMapNodeData } from '@/types/canvas';

interface Props {
  data: MindMapNodeData;
}

const BRANCH_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

export default function MindMapNode({ data }: Props) {
  const subtopics = data.subtopics || [];

  return (
    <div className="node-mindmap" style={{ height: '100%', overflow: 'hidden' }}>
      <div className="node-mindmap-topic">
        <span style={{ marginRight: '6px' }}>🧠</span>
        {data.topic}
      </div>
      <div>
        {subtopics.map((sub, i) => (
          <div key={i} className="node-mindmap-sub" style={{ color: BRANCH_COLORS[i % BRANCH_COLORS.length] }}>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: BRANCH_COLORS[i % BRANCH_COLORS.length], flexShrink: 0, display: 'inline-block' }} />
            {sub}
          </div>
        ))}
      </div>
    </div>
  );
}
