import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reorderSongs, getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { songIds } = body;

    if (!Array.isArray(songIds)) {
      return NextResponse.json({ error: 'songIds must be an array' }, { status: 400 });
    }

    // Verify all songs belong to the user
    const db = await getDb();
    const songs = await db.collection('songs').find({
      _id: { $in: songIds.map(id => new ObjectId(id)) },
      user_id: session.user.id
    }).toArray();

    if (songs.length !== songIds.length) {
      return NextResponse.json({ error: 'Some songs not found or not authorized' }, { status: 403 });
    }

    const success = await reorderSongs(songIds);

    if (!success) {
      return NextResponse.json({ error: 'Failed to reorder songs' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering songs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
