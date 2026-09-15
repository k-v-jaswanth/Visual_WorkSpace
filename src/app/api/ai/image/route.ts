import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const url = await generateImage(prompt);
    return NextResponse.json({ url });
  } catch (e) {
    console.error('Image generation error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
