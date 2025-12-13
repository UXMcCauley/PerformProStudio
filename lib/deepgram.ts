import { createClient, DeepgramClient } from '@deepgram/sdk';

let deepgramClient: DeepgramClient | null = null;

function getDeepgramClient(): DeepgramClient {
  if (!deepgramClient) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is required');
    }
    deepgramClient = createClient(apiKey);
  }
  return deepgramClient;
}

export interface TranscriptionResult {
  transcript: string;
  words: TranscriptionWord[];
  confidence: number;
  duration: number;
  language: string;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

export interface TranscriptionOptions {
  model?: 'nova-2' | 'nova' | 'enhanced' | 'base';
  language?: string;
  punctuate?: boolean;
  diarize?: boolean;
  smartFormat?: boolean;
  paragraphs?: boolean;
}

const DEFAULT_OPTIONS: TranscriptionOptions = {
  model: 'nova-2',
  language: 'en',
  punctuate: true,
  diarize: false,
  smartFormat: true,
  paragraphs: true,
};

/**
 * Transcribe audio from a URL (e.g., Vercel Blob URL)
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const client = getDeepgramClient();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const response = await client.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    {
      model: opts.model,
      language: opts.language,
      punctuate: opts.punctuate,
      diarize: opts.diarize,
      smart_format: opts.smartFormat,
      paragraphs: opts.paragraphs,
    }
  );

  const result = response.result;

  if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
    throw new Error('No transcription results returned');
  }

  const alternative = result.results.channels[0].alternatives[0];
  const metadata = result.metadata;
  const detectedLanguage = (metadata as { detected_language?: string })?.detected_language;

  return {
    transcript: alternative.transcript || '',
    words: (alternative.words || []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      punctuated_word: w.punctuated_word,
    })),
    confidence: alternative.confidence || 0,
    duration: metadata?.duration || 0,
    language: detectedLanguage || opts.language || 'en',
  };
}

/**
 * Transcribe audio from a buffer (for direct uploads)
 */
export async function transcribeFromBuffer(
  buffer: Buffer,
  mimetype: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const client = getDeepgramClient();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const response = await client.listen.prerecorded.transcribeFile(
    buffer,
    {
      model: opts.model,
      language: opts.language,
      punctuate: opts.punctuate,
      diarize: opts.diarize,
      smart_format: opts.smartFormat,
      paragraphs: opts.paragraphs,
      mimetype,
    }
  );

  const result = response.result;

  if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
    throw new Error('No transcription results returned');
  }

  const alternative = result.results.channels[0].alternatives[0];
  const metadata = result.metadata;
  const detectedLanguage = (metadata as { detected_language?: string })?.detected_language;

  return {
    transcript: alternative.transcript || '',
    words: (alternative.words || []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      punctuated_word: w.punctuated_word,
    })),
    confidence: alternative.confidence || 0,
    duration: metadata?.duration || 0,
    language: detectedLanguage || opts.language || 'en',
  };
}

/**
 * Format transcription into lyric-friendly format
 * Groups words into natural phrases based on timing gaps and punctuation
 */
export function formatTranscriptAsLyrics(result: TranscriptionResult): string {
  if (!result.words || result.words.length === 0) {
    return result.transcript;
  }

  const lines: string[] = [];
  let currentLine: string[] = [];
  let lastEndTime = 0;

  for (const word of result.words) {
    const text = word.punctuated_word || word.word;

    // Start new line if:
    // 1. Gap > 0.8 seconds (natural pause)
    // 2. Previous word ended with sentence-ending punctuation
    // 3. Current line is getting long (> 10 words)
    const gap = word.start - lastEndTime;
    const lastWord = currentLine[currentLine.length - 1];
    const endsWithPunctuation = lastWord && /[.!?]$/.test(lastWord);
    const lineIsTooLong = currentLine.length >= 10;

    if (currentLine.length > 0 && (gap > 0.8 || endsWithPunctuation || lineIsTooLong)) {
      lines.push(currentLine.join(' '));
      currentLine = [];
    }

    currentLine.push(text);
    lastEndTime = word.end;
  }

  // Add remaining words
  if (currentLine.length > 0) {
    lines.push(currentLine.join(' '));
  }

  return lines.join('\n');
}

/**
 * Timed line interface for syncing lyrics with audio
 */
export interface TimedLine {
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * Format transcription into timed lines for teleprompter sync
 * Groups words into natural phrases with start/end timestamps
 */
export function formatTranscriptAsTimedLines(result: TranscriptionResult): TimedLine[] {
  if (!result.words || result.words.length === 0) {
    // Fallback: split transcript into lines without timestamps
    return result.transcript.split('\n').filter(line => line.trim()).map(text => ({
      text,
      startMs: 0,
      endMs: 0,
    }));
  }

  const lines: TimedLine[] = [];
  let currentLine: TranscriptionWord[] = [];
  let lastEndTime = 0;

  for (const word of result.words) {
    const text = word.punctuated_word || word.word;

    // Start new line if:
    // 1. Gap > 0.8 seconds (natural pause)
    // 2. Previous word ended with sentence-ending punctuation
    // 3. Current line is getting long (> 10 words)
    const gap = word.start - lastEndTime;
    const lastWord = currentLine[currentLine.length - 1];
    const lastWordText = lastWord?.punctuated_word || lastWord?.word || '';
    const endsWithPunctuation = /[.!?]$/.test(lastWordText);
    const lineIsTooLong = currentLine.length >= 10;

    if (currentLine.length > 0 && (gap > 0.8 || endsWithPunctuation || lineIsTooLong)) {
      // Save current line
      lines.push({
        text: currentLine.map(w => w.punctuated_word || w.word).join(' '),
        startMs: Math.round(currentLine[0].start * 1000),
        endMs: Math.round(currentLine[currentLine.length - 1].end * 1000),
      });
      currentLine = [];
    }

    currentLine.push(word);
    lastEndTime = word.end;
  }

  // Add remaining words
  if (currentLine.length > 0) {
    lines.push({
      text: currentLine.map(w => w.punctuated_word || w.word).join(' '),
      startMs: Math.round(currentLine[0].start * 1000),
      endMs: Math.round(currentLine[currentLine.length - 1].end * 1000),
    });
  }

  return lines;
}

/**
 * Estimate song tempo from word timing
 */
export function estimateTempo(result: TranscriptionResult): number {
  if (!result.words || result.words.length < 10) {
    return 120; // Default tempo
  }

  // Calculate average syllables per second
  const totalDuration = result.duration;
  const wordCount = result.words.length;

  // Estimate syllables (roughly 1.5 syllables per word on average for English)
  const estimatedSyllables = wordCount * 1.5;
  const syllablesPerSecond = estimatedSyllables / totalDuration;

  // Convert to BPM (assuming 2 syllables per beat on average)
  const estimatedBpm = (syllablesPerSecond / 2) * 60;

  // Clamp to reasonable range
  return Math.round(Math.max(60, Math.min(180, estimatedBpm)));
}
