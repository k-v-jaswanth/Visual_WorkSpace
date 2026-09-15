import { CanvasNode } from './canvas';
import { RoomMode } from './room';

export interface TranscriptEntry {
  id: string;
  text: string;
  speaker: string;
  timestamp: number;
}

export interface AIGenerateRequest {
  transcript: TranscriptEntry[];
  mode: RoomMode;
  existingNodes: CanvasNode[];
  userInstruction?: string;
}

export interface AIGenerateResponse {
  nodes: CanvasNode[];
  message?: string;
}

export interface CommitReportRequest {
  transcript: TranscriptEntry[];
  roomName: string;
  participants: string[];
  duration: number;
}

export interface ImageGenerateRequest {
  prompt: string;
  style?: 'infographic' | 'diagram' | 'illustration' | 'realistic';
}
