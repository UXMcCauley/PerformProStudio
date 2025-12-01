import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  transcribeFromUrl,
  formatTranscriptAsLyrics,
  estimateTempo,
  TranscriptionResult,
} from '@/lib/deepgram';
import { processLyricsForPerformance } from '@/lib/lyrics-ai';

export interface TranscribeResponse {
  transcript: string;
  formattedLyrics: string;
  processedLyrics?: {
    lines: Array<{
      text: string;
      lineNumber: number;
      section?: string;
    }>;
    formattedText: string;
    metadata: {
      totalLines: number;
      tempo: number;
      difficulty: string;
    };
  };
  metadata: {
    duration: number;
    confidence: number;
    language: string;
    estimatedTempo: number;
    wordCount: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { audioUrl, processWithAI = true, songTitle, artistName } = body;

    if (!audioUrl) {
      return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 });
    }

    // Step 1: Transcribe with Deepgram
    let transcription: TranscriptionResult;
    try {
      transcription = await transcribeFromUrl(audioUrl, {
        model: 'nova-2',
        language: 'en',
        punctuate: true,
        smartFormat: true,
        paragraphs: true,
      });
    } catch (error) {
      console.error('Deepgram transcription error:', error);
      return NextResponse.json(
        { error: 'Failed to transcribe audio. Please ensure the audio contains clear vocals.' },
        { status: 422 }
      );
    }

    if (!transcription.transcript || transcription.transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in the audio. Please upload audio with clear vocals.' },
        { status: 422 }
      );
    }

    // Step 2: Format as basic lyrics
    const formattedLyrics = formatTranscriptAsLyrics(transcription);
    const estimatedTempo = estimateTempo(transcription);

    // Step 3: Optionally process with Claude AI for performance-ready lyrics
    let processedLyrics = null;
    if (processWithAI) {
      try {
        const aiResult = await processLyricsForPerformance(formattedLyrics, {
          songTitle,
          artistName,
          tempo: estimatedTempo,
          songDurationMs: transcription.duration * 1000,
          includeBreathMarkers: false,
          includeEmphasisMarkers: false,
        });

        processedLyrics = {
          lines: aiResult.lines.map((line) => ({
            text: line.text,
            lineNumber: line.lineNumber,
            section: line.section,
          })),
          formattedText: aiResult.formattedText,
          metadata: {
            totalLines: aiResult.metadata.totalLines,
            tempo: aiResult.metadata.tempo,
            difficulty: aiResult.metadata.difficulty,
          },
        };
      } catch (aiError) {
        console.error('AI processing error (continuing with basic format):', aiError);
        // Continue without AI processing - we still have the basic transcription
      }
    }

    const response: TranscribeResponse = {
      transcript: transcription.transcript,
      formattedLyrics,
      processedLyrics: processedLyrics || undefined,
      metadata: {
        duration: transcription.duration,
        confidence: transcription.confidence,
        language: transcription.language,
        estimatedTempo,
        wordCount: transcription.words?.length || 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in transcription:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}
