import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserSongs, createSong, updateSong, deleteSong, getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const songs = await getUserSongs(session.user.id);
    return NextResponse.json(songs);
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, artist, album, folder, tags, soundcloud_url, instrumental_url, completed, band_id, album_id, folder_id } = body;

    if (!title?.trim() || !artist?.trim()) {
      return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 });
    }

    const song = await createSong({
      title: title.trim(),
      artist: artist.trim(),
      album: album || null,
      folder: folder || null,
      tags: tags || [],
      soundcloud_url: soundcloud_url || null,
      instrumental_url: instrumental_url || null,
      completed: completed || false,
      band_id: band_id || null,
      album_id: album_id || null,
      folder_id: folder_id || null,
      user_id: session.user.id,
    });

    if (!song) {
      return NextResponse.json({ error: 'Failed to create song' }, { status: 500 });
    }

    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    console.error('Error creating song:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Verify the song belongs to the user
    const db = await getDb();
    const existingSong = await db.collection('songs').findOne({
      _id: new ObjectId(id),
      user_id: session.user.id
    });

    if (!existingSong) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const song = await updateSong(id, updates);
    if (!song) {
      return NextResponse.json({ error: 'Failed to update song' }, { status: 500 });
    }

    return NextResponse.json(song);
  } catch (error) {
    console.error('Error updating song:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('id');

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Verify the song belongs to the user
    const db = await getDb();
    const song = await db.collection('songs').findOne({
      _id: new ObjectId(songId),
      user_id: session.user.id
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const success = await deleteSong(songId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete song' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting song:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
