import { NextRequest, NextResponse } from 'next/server';
import { searchPlaylists } from '@/lib/soundcloud';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10, offset = 0 } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    const results = await searchPlaylists(query.trim(), limit, offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching SoundCloud:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}