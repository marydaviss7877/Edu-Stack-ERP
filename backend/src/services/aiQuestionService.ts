import { env } from '../config/env';
import type { PeerFeedbackCategory } from '../models/PeerFeedbackQuestion';

export interface GeneratedQuestion {
  text: string;
  category: PeerFeedbackCategory;
}

const CATEGORIES: PeerFeedbackCategory[] = ['respectfulness', 'teamwork', 'honesty', 'punctuality', 'leadership', 'kindness'];

// Fixed multiple-choice question bank, used whenever GEMINI_API_KEY is unset or the API call
// fails — peer feedback must never block on an external service being reachable.
const STATIC_QUESTION_BANK: GeneratedQuestion[] = [
  { text: 'This classmate treats others with respect.', category: 'respectfulness' },
  { text: 'This classmate listens when others are speaking.', category: 'respectfulness' },
  { text: 'This classmate works well in group activities.', category: 'teamwork' },
  { text: 'This classmate shares credit fairly in group work.', category: 'teamwork' },
  { text: 'This classmate is honest, even when it is difficult.', category: 'honesty' },
  { text: 'This classmate keeps their promises to classmates.', category: 'honesty' },
  { text: 'This classmate arrives to group activities on time.', category: 'punctuality' },
  { text: 'This classmate meets agreed deadlines in group work.', category: 'punctuality' },
  { text: 'This classmate helps organize group tasks.', category: 'leadership' },
  { text: 'This classmate steps up when the group needs direction.', category: 'leadership' },
  { text: 'This classmate is kind to classmates who are struggling.', category: 'kindness' },
  { text: 'This classmate includes others who are left out.', category: 'kindness' },
];

function pickStatic(count: number, contextTags: string[]): GeneratedQuestion[] {
  const prioritized = contextTags.length
    ? STATIC_QUESTION_BANK.filter((q) => contextTags.includes(q.category))
    : [];
  const rest = STATIC_QUESTION_BANK.filter((q) => !prioritized.includes(q));
  return [...prioritized, ...rest].slice(0, count);
}

function isValidQuestion(v: unknown): v is GeneratedQuestion {
  if (!v || typeof v !== 'object') return false;
  const q = v as Record<string, unknown>;
  return typeof q.text === 'string' && q.text.trim().length > 0 && q.text.length <= 240
    && typeof q.category === 'string' && CATEGORIES.includes(q.category as PeerFeedbackCategory);
}

/**
 * Generates grade- and context-aware multiple-choice peer-feedback questions via Gemini.
 * Falls back to a static bank on a missing key, a bad response, or any network failure —
 * a cycle must always be able to open, with or without the AI call succeeding.
 */
export async function generateQuestions(params: {
  gradeLevel?: string;
  contextSignals?: string[]; // e.g. ['punctuality'] when a class has a lateness pattern
  count: number;
}): Promise<{ questions: GeneratedQuestion[]; source: 'static' | 'ai' }> {
  const contextTags = params.contextSignals ?? [];

  if (!env.geminiApiKey) {
    return { questions: pickStatic(params.count, contextTags), source: 'static' };
  }

  const prompt = `Generate ${params.count} short multiple-choice peer-feedback survey questions for school students`
    + `${params.gradeLevel ? ` in grade ${params.gradeLevel}` : ''} to rate a classmate on a 1-5 scale.`
    + `${contextTags.length ? ` Emphasize these areas if natural: ${contextTags.join(', ')}.` : ''}`
    + ` Rules: each question must be a single respectful statement about observable behavior (e.g. "This classmate ..."),`
    + ` age-appropriate, never about appearance or personal life, and answerable on a 1 (never) to 5 (always) scale.`
    + ` Categories to choose from: ${CATEGORIES.join(', ')}.`
    + ` Respond with ONLY a JSON array like [{"text": "...", "category": "..."}], no other text.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`Gemini API returned ${resp.status}`);

    const body = await resp.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw: string = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) throw new Error('Gemini response was not an array');

    const questions = parsed.filter(isValidQuestion).slice(0, params.count);
    if (questions.length === 0) throw new Error('Gemini returned no valid questions');

    return { questions, source: 'ai' };
  } catch (err) {
    console.warn('[aiQuestionService] Gemini generation failed, using static fallback:', (err as Error).message);
    return { questions: pickStatic(params.count, contextTags), source: 'static' };
  }
}
