import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSongLyricLines, saveLyricLines, getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');

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

    const lyrics = await getSongLyricLines(songId);
    return NextResponse.json(lyrics);
  } catch (error) {
    console.error('Error fetching lyrics:', error);
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
    const { songId, lines } = body;

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

    const savedLines = await saveLyricLines(songId, lines || []);
    return NextResponse.json(savedLines);
  } catch (error) {
    console.error('Error saving lyrics:', error);
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
    const { songId, lyrics } = body;

    if (!songId || !lyrics || !Array.isArray(lyrics)) {
      return NextResponse.json({ error: 'Song ID and lyrics array required' }, { status: 400 });
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

    // Bulk update timestamps
    const bulkOps = lyrics.map((line: { _id: string; timestamp_ms: number | null }) => ({
      updateOne: {
        filter: { _id: new ObjectId(line._id), song_id: songId },
        update: { $set: { timestamp_ms: line.timestamp_ms, updated_at: new Date().toISOString() } }
      }
    }));

    if (bulkOps.length > 0) {
      await db.collection('lyric_lines').bulkWrite(bulkOps);
    }

    return NextResponse.json({ success: true, updated: bulkOps.length });
  } catch (error) {
    console.error('Error updating lyrics timestamps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
