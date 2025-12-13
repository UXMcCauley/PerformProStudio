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

    // Filter out lines with invalid ObjectIds (UUIDs from unsaved client-side lines)
    const isValidObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);
    const validLines = lyrics.filter((line: { _id: string; timestamp_ms: number | null }) =>
      isValidObjectId(line._id)
    );

    // Bulk update timestamps for valid lines only
    const bulkOps = validLines.map((line: { _id: string; timestamp_ms: number | null }) => ({
      updateOne: {
        filter: { _id: new ObjectId(line._id), song_id: songId },
        update: { $set: { timestamp_ms: line.timestamp_ms, updated_at: new Date().toISOString() } }
      }
    }));

    if (bulkOps.length > 0) {
      await db.collection('lyric_lines').bulkWrite(bulkOps);
    }

    const skipped = lyrics.length - validLines.length;
    return NextResponse.json({
      success: true,
      updated: bulkOps.length,
      skipped: skipped > 0 ? skipped : undefined,
      message: skipped > 0 ? `${skipped} unsaved lines were skipped. Save the song first to persist all lyrics.` : undefined
    });
  } catch (error) {
    console.error('Error updating lyrics timestamps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
