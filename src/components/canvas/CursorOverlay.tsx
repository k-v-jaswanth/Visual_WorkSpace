'use client';
import { RemoteCursor, Viewport } from '@/types/canvas';

interface Props {
  cursors: RemoteCursor[];
  viewport: Viewport;
}

export default function CursorOverlay({ cursors, viewport }: Props) {
  return (
    <div className="cursor-container">
      {cursors.map((cursor) => {
        const screenX = cursor.position.x * viewport.scale + viewport.x;
        const screenY = cursor.position.y * viewport.scale + viewport.y;
        return (
          <div
            key={cursor.userId}
            className="remote-cursor"
            style={{ left: screenX, top: screenY }}
          >
            <svg className="cursor-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 2L18 9L10 11L7 18L2 2Z" fill={cursor.color} stroke="#fff" strokeWidth="1" />
            </svg>
            <div
              className="cursor-label"
              style={{ '--label-color': cursor.color } as React.CSSProperties}
            >
              {cursor.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
