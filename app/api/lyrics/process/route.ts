import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  processLyrics,
  quickFormatLyrics,
  needsProcessing,
  splitLongLine,
  toRawText,
  toLyricLines,
  type LyricsProcessingOptions,
  type ProcessedLyrics
} from '@/lib/lyrics-ai';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      lyrics,
      mode = 'full', // 'full', 'quick', 'check', 'split-line'
      options = {}
    } = body;

    if (!lyrics || typeof lyrics !== 'string') {
      return NextResponse.json({ error: 'Lyrics text is required' }, { status: 400 });
    }

    // Mode: check - just check if processing is needed
    if (mode === 'check') {
      const needs = needsProcessing(lyrics);
      return NextResponse.json({
        needsProcessing: needs,
        reason: needs ? getProcessingReason(lyrics) : null
      });
    }

    // Mode: split-line - split a single long line
    if (mode === 'split-line') {
      const maxLength = options.maxLineLength || 50;
      const splitLines = await splitLongLine(lyrics, maxLength);
      return NextResponse.json({ lines: splitLines });
    }

    // Mode: quick - simple formatting without deep analysis
    if (mode === 'quick') {
      const formatted = await quickFormatLyrics(lyrics);
      return NextResponse.json({
        formattedLyrics: formatted,
        mode: 'quick'
      });
    }

    // Mode: full - comprehensive AI processing
    const processingOptions: LyricsProcessingOptions = {
      maxLineLength: options.maxLineLength || 60,
      targetLinesPerSection: options.targetLinesPerSection || 8,
      preserveExistingBreaks: options.preserveExistingBreaks !== false,
      addSectionMarkers: options.addSectionMarkers !== false,
      optimizeForTeleprompter: options.optimizeForTeleprompter !== false,
      songDurationMs: options.songDurationMs
    };

    const processed: ProcessedLyrics = await processLyrics(lyrics, processingOptions);

    return NextResponse.json({
      processed,
      formattedLyrics: toRawText(processed),
      lyricLines: toLyricLines(processed),
      mode: 'full'
    });
  } catch (error) {
    console.error('Error processing lyrics:', error);
    return NextResponse.json(
      { error: 'Failed to process lyrics' },
      { status: 500 }
    );
  }
}

function getProcessingReason(text: string): string {
  const lines = text.split('\n').filter(l => l.trim());

  if (lines.length === 1 && text.length > 200) {
    return 'Lyrics appear to be a single block of text without line breaks';
  }
  if (lines.some(l => l.length > 80)) {
    return 'Some lines are very long and may be hard to read on a teleprompter';
  }
  if (!text.match(/\[(verse|chorus|bridge|intro|outro|hook|pre-chorus)/i)) {
    return 'No section markers detected - AI can identify verses, choruses, etc.';
  }
  if (lines.length < text.length / 100) {
    return 'Text has few line breaks relative to its length';
  }

  return 'Lyrics may benefit from formatting optimization';
}
