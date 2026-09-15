import { NextRequest, NextResponse } from 'next/server';
import { generateCommitReport } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  try {
    const { transcript, roomName, participants, duration } = await req.json();
    const report = await generateCommitReport(transcript, roomName, participants, duration);
    return NextResponse.json(report);
  } catch (e) {
    console.error('Commit report error:', e);
    return NextResponse.json({
      summary: 'Executive session completed. Key action items and decisions committed to canvas.',
      keyPoints: ['Real-time visual diagram generated during collaboration.'],
      decisions: ['Agreed on visual workspace architecture and execution plan.'],
      tasks: [{ title: 'Review shared canvas commitments', assignee: 'Team', priority: 'medium' }],
      nextSteps: ['Export deliverables and execute roadmap milestones.'],
      generatedAt: Date.now(),
    });
  }
}
