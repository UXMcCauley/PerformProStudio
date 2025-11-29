import { NextRequest, NextResponse } from 'next/server';
import { musicSearch } from '@/lib/music-search';
import { genius } from '@/lib/genius';
import { processLyrics, processLyricsForPerformance } from '@/lib/lyrics-ai';

// Find lyrics info for a track
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const track = searchParams.get('track');
  const artist = searchParams.get('artist');

  if (!track || !artist) {
    return NextResponse.json(
      { error: 'Track and artist parameters are required' },
      { status: 400 }
    );
  }

  try {
    const lyricsInfo = await musicSearch.findLyrics(track, artist);

    return NextResponse.json({
      success: true,
      data: lyricsInfo,
    });
  } catch (error) {
    console.error('Find lyrics error:', error);
    return NextResponse.json(
      { error: 'Failed to find lyrics', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Process user-provided lyrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lyrics,
      trackName,
      artistName,
      mode = 'performance', // 'performance' | 'full' | 'quick'
      options = {}
    } = body;

    if (!lyrics) {
      return NextResponse.json(
        { error: 'Lyrics text is required' },
        { status: 400 }
      );
    }

    // Get Genius info if available for attribution
    let geniusInfo = null;
    if (trackName && artistName && genius.isConfigured()) {
      const info = await genius.getLyricsInfo(trackName, artistName);
      if (info) {
        geniusInfo = {
          writers: info.writers,
          url: info.lyricsUrl,
        };
      }
    }

    let result;

    if (mode === 'performance') {
      // Use enhanced performance-focused processing
      result = await processLyricsForPerformance(lyrics, {
        ...options,
        songTitle: trackName,
        artistName: artistName,
      });
    } else if (mode === 'full') {
      // Use standard full processing
      result = await processLyrics(lyrics, options);
    } else {
      // Quick format - just return the formatted text
      const { quickFormatLyrics } = await import('@/lib/lyrics-ai');
      const formatted = await quickFormatLyrics(lyrics);
      result = { formatted };
    }

    return NextResponse.json({
      success: true,
      data: result,
      attribution: geniusInfo ? {
        writers: geniusInfo.writers,
        source: geniusInfo.url,
      } : null,
    });
  } catch (error) {
    console.error('Process lyrics error:', error);
    return NextResponse.json(
      { error: 'Failed to process lyrics', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
