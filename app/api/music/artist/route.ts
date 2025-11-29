import { NextRequest, NextResponse } from 'next/server';
import { musicSearch } from '@/lib/music-search';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Artist ID is required' },
      { status: 400 }
    );
  }

  try {
    const artist = await musicSearch.getArtist(id);

    if (!artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: artist,
    });
  } catch (error) {
    console.error('Get artist error:', error);
    return NextResponse.json(
      { error: 'Failed to get artist', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
