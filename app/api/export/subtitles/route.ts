import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Minimum line duration in ms (VideoBolt and other tools require at least 100ms)
const MIN_LINE_DURATION_MS = 100;

// Minimum gap between lines in seconds for SRT format (some tools can't share the same second)
const MIN_LINE_GAP_SECONDS = 2;

// Convert milliseconds to SRT timestamp format (00:00:00,000)
function msToSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

// Convert milliseconds to VTT timestamp format (00:00:00.000)
function msToVttTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');
    const format = searchParams.get('format') || 'srt'; // srt or vtt
    const lineDuration = parseInt(searchParams.get('lineDuration') || '3000'); // Default 3 seconds per line if no timestamp

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    const db = await getDb();

    // Get the song
    const song = await db.collection('songs').findOne({
      _id: new ObjectId(songId),
      user_id: session.user.id
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Get lyrics for the song
    const lyrics = await db.collection('lyric_lines')
      .find({ song_id: songId })
      .sort({ line_number: 1 })
      .toArray();

    if (lyrics.length === 0) {
      return NextResponse.json({ error: 'No lyrics found for this song' }, { status: 404 });
    }

    let content = '';
    const filename = `${song.title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.${format}`;
    const minGapMs = MIN_LINE_GAP_SECONDS * 1000; // Convert to milliseconds

    // Pre-process timestamps to ensure minimum 2-second gaps between lines
    // This is critical for SRT compatibility with video tools that can't handle same-second timestamps
    const processedTimestamps: { startMs: number; endMs: number }[] = [];
    let lastEndMs = 0;

    lyrics.forEach((line, index) => {
      // Get the original timestamp or calculate from index
      let startMs = line.timestamp_ms ?? (index * lineDuration);

      // Ensure this line starts at least 2 seconds after the previous line's start
      // (not end, because some tools check start times)
      if (index > 0) {
        const prevStart = processedTimestamps[index - 1].startMs;
        const minStartMs = prevStart + minGapMs;
        if (startMs < minStartMs) {
          startMs = minStartMs;
        }
      }

      // Calculate end time - either next line's timestamp or default duration
      const nextLine = lyrics[index + 1];
      let endMs: number;

      if (nextLine?.timestamp_ms) {
        // Use next line's timestamp, but ensure we end before it starts
        // and maintain the 2-second minimum gap
        endMs = Math.min(nextLine.timestamp_ms - 100, startMs + lineDuration);
      } else {
        endMs = startMs + lineDuration;
      }

      // Ensure minimum 100ms duration
      if (endMs - startMs < MIN_LINE_DURATION_MS) {
        endMs = startMs + MIN_LINE_DURATION_MS;
      }

      // Ensure end doesn't overlap with next line's potential start
      if (nextLine) {
        const nextPotentialStart = (nextLine.timestamp_ms ?? ((index + 1) * lineDuration));
        // Make sure end time is at least 100ms before the next start
        if (endMs >= nextPotentialStart - 100) {
          endMs = Math.max(startMs + MIN_LINE_DURATION_MS, nextPotentialStart - 100);
        }
      }

      processedTimestamps.push({ startMs, endMs });
      lastEndMs = endMs;
    });

    if (format === 'vtt') {
      // WebVTT format
      content = 'WEBVTT\n\n';

      lyrics.forEach((line, index) => {
        const { startMs, endMs } = processedTimestamps[index];
        content += `${index + 1}\n`;
        content += `${msToVttTime(startMs)} --> ${msToVttTime(endMs)}\n`;
        content += `${line.text}\n\n`;
      });
    } else {
      // SRT format (default) - requires 2-second minimum gaps
      lyrics.forEach((line, index) => {
        const { startMs, endMs } = processedTimestamps[index];
        content += `${index + 1}\n`;
        content += `${msToSrtTime(startMs)} --> ${msToSrtTime(endMs)}\n`;
        content += `${line.text}\n\n`;
      });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting subtitles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
