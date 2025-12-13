import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  transcribeFromUrl,
  TranscriptionResult,
  TranscriptionWord,
} from '@/lib/deepgram';

interface TimedLine {
  text: string;
  startMs: number;
  endMs: number;
}

interface LyricsCorrection {
  original: string;
  suggested: string;
  lineNumber: number;
}

interface AnalyzeLyricsResponse {
  timedLines: TimedLine[];
  corrections: LyricsCorrection[];
  formattedLyrics?: string;
  metadata: {
    matchConfidence: number;
    duration: number;
    wordCount: number;
  };
}

/**
 * Normalize text for comparison (lowercase, remove punctuation, etc.)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  const longerLength = longer.length;
  const editDistance = levenshteinDistance(longer, shorter);

  return (longerLength - editDistance) / longerLength;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // replace
          dp[i - 1][j] + 1,     // delete
          dp[i][j - 1] + 1      // insert
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Find words from transcription that match a lyric line
 * Returns the best matching word range
 *
 * Key improvements:
 * - Limited search window to prevent matching far-ahead content
 * - Position weighting to prefer matches closer to expected position
 * - Stricter thresholds for accepting matches
 */
function findBestMatchingWords(
  lineText: string,
  transcribedWords: TranscriptionWord[],
  startIndex: number = 0,
  expectedWordsPerLine: number = 8
): { startIdx: number; endIdx: number; confidence: number } | null {
  const normalizedLine = normalizeText(lineText);
  const lineWords = normalizedLine.split(' ').filter(w => w.length > 0);

  if (lineWords.length === 0) return null;

  let bestMatch = { startIdx: startIndex, endIdx: startIndex, confidence: 0, score: 0 };

  // Limit search to a reasonable window ahead (max ~3 lines worth of words)
  const maxSearchAhead = Math.min(expectedWordsPerLine * 3, 30);
  const searchEndLimit = Math.min(startIndex + maxSearchAhead, transcribedWords.length);

  // Window size based on line word count (with some tolerance)
  const minWindowSize = Math.max(1, lineWords.length - 2);
  const maxWindowSize = lineWords.length + 3;

  for (let windowStart = startIndex; windowStart < searchEndLimit; windowStart++) {
    for (let windowEnd = windowStart + minWindowSize; windowEnd <= Math.min(windowStart + maxWindowSize, transcribedWords.length); windowEnd++) {
      const windowWords = transcribedWords
        .slice(windowStart, windowEnd)
        .map(w => normalizeText(w.punctuated_word || w.word))
        .join(' ');

      const similarity = calculateSimilarity(normalizedLine, windowWords);

      // Apply position penalty - prefer matches closer to startIndex
      const distanceFromExpected = windowStart - startIndex;
      const positionPenalty = distanceFromExpected * 0.02; // 2% penalty per word distance
      const adjustedScore = similarity - positionPenalty;

      if (adjustedScore > bestMatch.score && similarity > 0.5) {
        bestMatch = {
          startIdx: windowStart,
          endIdx: windowEnd,
          confidence: similarity,
          score: adjustedScore,
        };
      }
    }
  }

  return bestMatch.confidence > 0.4 ? bestMatch : null;
}

/**
 * Strip section markers from lyrics text
 * Handles both standalone markers like [Verse 1] and embedded ones
 */
function stripSectionMarkers(text: string): string {
  // Remove standalone section markers on their own line
  let cleaned = text.replace(/^\[.*?\]\s*/gm, '');
  // Remove any remaining section markers embedded in text
  cleaned = cleaned.replace(/\[.*?\]/g, '');
  return cleaned.trim();
}

/**
 * Check if a line is a section marker
 */
function isSectionMarker(line: string): boolean {
  const trimmed = line.trim();
  // Pure section markers like [Verse 1], [Chorus], etc.
  if (/^\[.*\]$/.test(trimmed)) return true;
  // Lines that are mostly a section marker (e.g., "[Verse 1]" with trailing whitespace)
  if (/^\[.*\]\s*$/.test(trimmed)) return true;
  return false;
}

/**
 * Align pasted lyrics with transcribed audio timing
 */
function alignLyricsWithAudio(
  pastedLyrics: string,
  transcription: TranscriptionResult
): { timedLines: TimedLine[]; corrections: LyricsCorrection[] } {
  // Pre-process: strip section markers from the entire lyrics first
  const cleanedLyrics = stripSectionMarkers(pastedLyrics);

  const lines = cleanedLyrics
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !isSectionMarker(line));

  const timedLines: TimedLine[] = [];
  const corrections: LyricsCorrection[] = [];
  let searchStartIndex = 0;

  // Calculate expected words per line for better search window sizing
  const totalWords = transcription.words.length;
  const contentLines = lines.length;
  const expectedWordsPerLine = contentLines > 0 ? Math.ceil(totalWords / contentLines) : 8;

  // Calculate average line duration for fallback timing
  const averageLineDuration = contentLines > 0
    ? transcription.duration * 1000 / contentLines
    : 3000; // Default 3 seconds per line

  // Track the last valid timestamp to ensure monotonic ordering
  let lastTimestampMs = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Double-check: skip any remaining section markers
    if (isSectionMarker(line)) {
      continue;
    }

    const match = findBestMatchingWords(line, transcription.words, searchStartIndex, expectedWordsPerLine);

    if (match) {
      const startWord = transcription.words[match.startIdx];
      const endWord = transcription.words[match.endIdx - 1];

      let startMs = Math.round(startWord.start * 1000);
      let endMs = Math.round(endWord.end * 1000);

      // Enforce monotonic timestamps - each line must start at or after the previous
      if (startMs < lastTimestampMs) {
        // This match is out of order - use estimated timing instead
        startMs = lastTimestampMs + Math.min(averageLineDuration, 2000);
        endMs = Math.round(startMs + averageLineDuration);
      }

      timedLines.push({
        text: line,
        startMs,
        endMs,
      });

      lastTimestampMs = startMs;

      // Check if there's a significant difference that warrants a correction suggestion
      if (match.confidence < 0.85 && match.confidence > 0.5) {
        const transcribedText = transcription.words
          .slice(match.startIdx, match.endIdx)
          .map(w => w.punctuated_word || w.word)
          .join(' ');

        corrections.push({
          original: line,
          suggested: transcribedText,
          lineNumber: i + 1,
        });
      }

      // Move search start forward to avoid matching same words
      searchStartIndex = match.endIdx;
    } else {
      // Couldn't find a match - estimate timing based on proportional position in song
      // Use a reasonable gap, not just 100ms
      const proportionalPosition = i / contentLines;
      const estimatedStartMs = Math.max(
        lastTimestampMs + 2000, // At least 2 seconds after previous line
        proportionalPosition * transcription.duration * 1000 // Or proportional to song duration
      );

      timedLines.push({
        text: line,
        startMs: Math.round(estimatedStartMs),
        endMs: Math.round(estimatedStartMs + averageLineDuration),
      });

      lastTimestampMs = estimatedStartMs;

      // Still advance the search index based on expected words
      searchStartIndex = Math.min(searchStartIndex + expectedWordsPerLine, transcription.words.length);
    }
  }

  return { timedLines, corrections };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lyrics, audioUrl, songTitle, artistName } = body;

    if (!lyrics || typeof lyrics !== 'string') {
      return NextResponse.json({ error: 'Lyrics are required' }, { status: 400 });
    }

    if (!audioUrl || typeof audioUrl !== 'string') {
      return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 });
    }

    // Step 1: Transcribe the audio with Deepgram
    let transcription: TranscriptionResult;
    try {
      transcription = await transcribeFromUrl(audioUrl, {
        model: 'nova-2',
        language: 'en',
        punctuate: true,
        smartFormat: true,
        paragraphs: false, // We don't need paragraph breaks for alignment
      });
    } catch (error) {
      console.error('Deepgram transcription error:', error);
      return NextResponse.json(
        { error: 'Failed to transcribe audio. Please ensure the audio contains clear vocals.' },
        { status: 422 }
      );
    }

    if (!transcription.words || transcription.words.length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in the audio. Please upload audio with clear vocals.' },
        { status: 422 }
      );
    }

    // Normalize line endings and count input lines for logging
    const normalizedLyrics = lyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const inputLineCount = normalizedLyrics.split('\n').filter((l: string) => l.trim().length > 0).length;

    // Step 2: Align pasted lyrics with transcribed audio timing
    const { timedLines, corrections } = alignLyricsWithAudio(normalizedLyrics, transcription);

    // Calculate overall match confidence
    const timedLinesWithMatches = timedLines.filter(
      line => !/^\[.*\]$/.test(line.text) && line.startMs !== line.endMs
    );
    const matchConfidence = timedLinesWithMatches.length > 0
      ? timedLinesWithMatches.length / timedLines.filter(line => !/^\[.*\]$/.test(line.text)).length
      : 0;

    const response: AnalyzeLyricsResponse = {
      timedLines,
      corrections,
      metadata: {
        matchConfidence,
        duration: transcription.duration,
        wordCount: transcription.words.length,
      },
    };

    // Log for debugging
    console.log(`Lyrics analysis: ${inputLineCount} input lines → ${timedLines.length} timed lines`);
    console.log(`Transcription: ${transcription.words.length} words, ${corrections.length} corrections, ${Math.round(matchConfidence * 100)}% confidence`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing lyrics:', error);
    return NextResponse.json(
      { error: 'Failed to analyze lyrics' },
      { status: 500 }
    );
  }
}
