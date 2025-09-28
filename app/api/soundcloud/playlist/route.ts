import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistTracks } from '@/lib/soundcloud';

export async function POST(request: NextRequest) {
  try {
    const { playlistId } = await request.json();

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID required' }, { status: 400 });
    }

    const playlistUrn = `soundcloud:playlists:${playlistId}`;
    const tracks = await getPlaylistTracks(playlistUrn);

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
  }
}