import { NextRequest, NextResponse } from 'next/server';
import { musicSearch } from '@/lib/music-search';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Album ID is required' },
      { status: 400 }
    );
  }

  try {
    const album = await musicSearch.getAlbum(id);

    if (!album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: album,
    });
  } catch (error) {
    console.error('Get album error:', error);
    return NextResponse.json(
      { error: 'Failed to get album', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
