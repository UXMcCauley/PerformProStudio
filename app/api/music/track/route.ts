import { NextRequest, NextResponse } from 'next/server';
import { musicSearch } from '@/lib/music-search';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Track ID is required' },
      { status: 400 }
    );
  }

  try {
    const track = await musicSearch.getTrack(id);

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    // Also get cross-references for streaming links
    const crossRefs = await musicSearch.crossReference(track);

    return NextResponse.json({
      success: true,
      data: track,
      streamingLinks: {
        spotify: crossRefs.spotify?.externalUrls?.spotify || track.externalUrls?.spotify,
        deezer: crossRefs.deezer?.externalUrls?.deezer || track.externalUrls?.deezer,
      },
      lyrics: crossRefs.genius,
    });
  } catch (error) {
    console.error('Get track error:', error);
    return NextResponse.json(
      { error: 'Failed to get track', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Import a track into the user's library
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    const track = await musicSearch.getTrack(trackId);

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    // Get cross-references for all streaming links
    const crossRefs = await musicSearch.crossReference(track);

    // Prepare import data
    const importData = {
      title: track.name,
      artist: track.artist,
      album: track.album || null,
      duration: track.duration,
      isrc: track.isrc,
      image: track.image,
      streamingUrls: {
        spotify: crossRefs.spotify?.externalUrls?.spotify || track.externalUrls?.spotify,
        deezer: crossRefs.deezer?.externalUrls?.deezer || track.externalUrls?.deezer,
      },
      lyricsInfo: crossRefs.genius,
    };

    return NextResponse.json({
      success: true,
      data: importData,
      message: 'Track ready for import. Add lyrics to complete.',
    });
  } catch (error) {
    console.error('Import track error:', error);
    return NextResponse.json(
      { error: 'Failed to import track', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
