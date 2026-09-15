import { NextRequest, NextResponse } from 'next/server';
import { generateCanvasNodes } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  try {
    const { transcript, mode, existingNodes, userInstruction } = await req.json();
    const result = await generateCanvasNodes(transcript, mode, existingNodes, userInstruction);
    return NextResponse.json(result);
  } catch (e) {
    console.error('Generate nodes error:', e);
    return NextResponse.json({ nodes: [], connectors: [], error: String(e) }, { status: 200 });
  }
}
