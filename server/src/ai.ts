import OpenAI from 'openai';

export interface CanvasNodeData {
  id: string;
  type: 'Goal' | 'Decision' | 'Task' | 'Risk' | 'Question' | 'Idea';
  title: string;
  body: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  owner?: string;
  status?: string;
  x?: number;
  y?: number;
}

export interface CanvasEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface AIAnalysisResult {
  summary: string;
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  nextSteps: string[];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// Sophisticated NLP parser for offline / zero-API-key fallback
export function parseConversationWithNLP(transcript: string): AIAnalysisResult {
  const text = transcript.trim();
  const lower = text.toLowerCase();
  const sentences = text.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 3);

  const nodes: CanvasNodeData[] = [];
  const edges: CanvasEdgeData[] = [];
  const nextSteps: string[] = [];

  // 1. Detect or extract Goal / Objective
  let goalTitle = 'Product & Project Objective';
  let goalBody = 'Align team on objectives, deliverable timelines, and key milestones.';
  const launchMatch = text.match(/(?:launch|release|ship|build|deploy|complete)\s+([^.,;]+)/i);
  if (launchMatch) {
    goalTitle = `Launch: ${launchMatch[1].trim()}`;
    goalBody = `Deliver ${launchMatch[1].trim()} successfully according to team requirements.`;
  }
  const goalId = 'node-goal-' + uid();
  nodes.push({
    id: goalId,
    type: 'Goal',
    title: goalTitle,
    body: goalBody,
    status: 'In Progress',
  });

  // 2. Detect Decisions
  let decisionFound = false;
  const decisionRegex = /(?:we (?:should|will|decided to|agree to|must)|agreed to|decision is|let's|going with)\s+([^.,;]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = decisionRegex.exec(text)) !== null) {
    const decText = match[1].trim();
    if (decText.length > 5) {
      const decId = 'node-dec-' + uid();
      nodes.push({
        id: decId,
        type: 'Decision',
        title: decText.length > 40 ? decText.slice(0, 37) + '...' : decText,
        body: `Agreed approach: ${decText}`,
        status: 'Approved',
      });
      edges.push({
        id: 'edge-' + uid(),
        source: goalId,
        target: decId,
        label: 'guides',
      });
      decisionFound = true;
    }
  }

  if (!decisionFound) {
    const decId = 'node-dec-' + uid();
    nodes.push({
      id: decId,
      type: 'Decision',
      title: 'Target Architecture & Milestones',
      body: sentences[0] || 'Establish agreed milestones and system expectations.',
      status: 'Approved',
    });
    edges.push({
      id: 'edge-' + uid(),
      source: goalId,
      target: decId,
      label: 'guides',
    });
  }

  // 3. Detect Tasks & Ownership
  // e.g. "Priya owns design", "Sam owns backend", "Alex will build the auth", "Sarah to test"
  const ownershipRegex = /([A-Z][a-z]+)\s+(?:owns|to lead|is leading|will handle|is taking|will build|will do)\s+([^.,;]+)/g;
  let taskCount = 0;
  while ((match = ownershipRegex.exec(text)) !== null) {
    const ownerName = match[1].trim();
    const taskDesc = match[2].trim();
    const taskId = 'node-task-' + uid();
    nodes.push({
      id: taskId,
      type: 'Task',
      title: `${ownerName}: ${taskDesc}`,
      body: `Responsible owner: ${ownerName}. Scope: ${taskDesc}`,
      owner: ownerName,
      priority: taskCount === 0 ? 'High' : 'Medium',
      status: 'To Do',
    });
    // Connect to most recent decision or goal
    const parentNode = nodes.find((n) => n.type === 'Decision') || nodes[0];
    edges.push({
      id: 'edge-' + uid(),
      source: parentNode.id,
      target: taskId,
      label: 'assigned to',
    });
    nextSteps.push(`Confirm ${ownerName}'s timeline for ${taskDesc}`);
    taskCount++;
  }

  // If no explicit ownership found, extract general tasks
  if (taskCount === 0) {
    const taskWords = ['implement', 'build', 'create', 'setup', 'test', 'review', 'prepare', 'verify'];
    for (const sent of sentences) {
      if (taskWords.some((w) => sent.toLowerCase().includes(w))) {
        const taskId = 'node-task-' + uid();
        nodes.push({
          id: taskId,
          type: 'Task',
          title: sent.slice(0, 40) + (sent.length > 40 ? '...' : ''),
          body: sent,
          priority: 'High',
          status: 'To Do',
        });
        const parentNode = nodes.find((n) => n.type === 'Decision') || nodes[0];
        edges.push({
          id: 'edge-' + uid(),
          source: parentNode.id,
          target: taskId,
          label: 'creates',
        });
        taskCount++;
        if (taskCount >= 3) break;
      }
    }
  }

  if (taskCount === 0) {
    const taskId = 'node-task-' + uid();
    nodes.push({
      id: taskId,
      type: 'Task',
      title: 'Action Item: Finalize execution roadmap',
      body: 'Break down discussion points into assignable work packages.',
      priority: 'High',
      status: 'To Do',
    });
    edges.push({
      id: 'edge-' + uid(),
      source: nodes[1]?.id || goalId,
      target: taskId,
      label: 'creates',
    });
    nextSteps.push('Assign primary owners and deadlines');
  }

  // 4. Detect Risks
  const riskRegex = /(?:risk|latency|bottleneck|blocker|concern|delay|security|vulnerability|failure)(?:\s+is|\s+of|:)?\s*([^.,;]+)/gi;
  let riskMatch = riskRegex.exec(text);
  if (riskMatch || lower.includes('risk') || lower.includes('latency')) {
    const riskDesc = riskMatch ? riskMatch[1].trim() : 'Onboarding latency and runtime stability';
    const riskId = 'node-risk-' + uid();
    nodes.push({
      id: riskId,
      type: 'Risk',
      title: `Risk: ${riskDesc.slice(0, 35)}`,
      body: `Identified risk: ${riskDesc}. Needs benchmark & mitigation plan.`,
      priority: 'Critical',
      status: 'Open',
    });
    // Connect to goal or task
    edges.push({
      id: 'edge-' + uid(),
      source: goalId,
      target: riskId,
      label: 'threatens',
    });
    nextSteps.push(`Benchmark and mitigate: ${riskDesc}`);
  }

  // 5. Detect Questions / Brainstorming
  for (const sent of sentences) {
    if (sent.includes('?') || sent.toLowerCase().startsWith('what about') || sent.toLowerCase().startsWith('how should')) {
      const qId = 'node-q-' + uid();
      nodes.push({
        id: qId,
        type: 'Question',
        title: sent.slice(0, 45) + (sent.length > 45 ? '...' : ''),
        body: sent,
        status: 'Open',
      });
      edges.push({
        id: 'edge-' + uid(),
        source: goalId,
        target: qId,
        label: 'investigate',
      });
      break;
    }
  }

  if (nextSteps.length === 0) {
    nextSteps.push('Confirm owners for all open action items');
    nextSteps.push('Review risks before staging deployment');
    nextSteps.push('Conduct next sync on milestone progress');
  }

  return {
    summary: `Synthesized ${nodes.length} key visual workspace cards (${nodes.map((n) => n.type).join(', ')}) with ${edges.length} relationships from team discussion.`,
    nodes,
    edges,
    nextSteps,
  };
}

export async function analyzeTranscriptWithAI(
  transcript: string,
  openaiClient: OpenAI | null
): Promise<AIAnalysisResult> {
  const clean = transcript.trim().slice(0, 15000);
  if (!clean) {
    throw new Error('Transcript is required for analysis');
  }

  if (!openaiClient) {
    return parseConversationWithNLP(clean);
  }

  try {
    const prompt = `You are CanvasMeet, an intelligent AI collaborative workspace copilot.
Transform the following spoken discussion or chat into structured, actionable visual canvas cards.
Identify:
- Goals (overarching target/vision)
- Decisions (key choices agreed upon)
- Tasks (concrete actions, including owner name and priority: Critical, High, Medium, Low)
- Risks (blockers, performance, security, latency issues)
- Questions (open uncertainties)
- Ideas (creative proposals)
Connect related nodes with logical edges (e.g. goal -> decision, decision -> task, goal -> risk).
Return clear, concise titles and informative bodies.`;

    const response = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: clean },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'workspace_canvas_schema',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: { type: 'string' },
              nodes: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: ['Goal', 'Decision', 'Task', 'Risk', 'Question', 'Idea'],
                    },
                    title: { type: 'string' },
                    body: { type: 'string' },
                    priority: {
                      type: 'string',
                      enum: ['Critical', 'High', 'Medium', 'Low'],
                    },
                    owner: { type: 'string' },
                    status: { type: 'string' },
                  },
                  required: ['id', 'type', 'title', 'body', 'priority', 'owner', 'status'],
                },
              },
              edges: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: { type: 'string' },
                    source: { type: 'string' },
                    target: { type: 'string' },
                    label: { type: 'string' },
                  },
                  required: ['id', 'source', 'target', 'label'],
                },
              },
              nextSteps: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['summary', 'nodes', 'edges', 'nextSteps'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    return {
      summary: parsed.summary || 'Workspace cards generated.',
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
      nextSteps: parsed.nextSteps || [],
    };
  } catch (error) {
    console.warn('OpenAI completion failed, falling back to NLP rule engine:', error);
    return parseConversationWithNLP(clean);
  }
}
