import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lineId, text } = body;

    if (!lineId || text === undefined) {
      return NextResponse.json({ error: 'Line ID and text are required' }, { status: 400 });
    }

    const db = await getDb();

    // Get the line to find the song
    const line = await db.collection('lyric_lines').findOne({
      _id: new ObjectId(lineId)
    });

    if (!line) {
      return NextResponse.json({ error: 'Line not found' }, { status: 404 });
    }

    // Verify the song belongs to the user
    const song = await db.collection('songs').findOne({
      _id: new ObjectId(line.song_id),
      user_id: session.user.id
    });

    if (!song) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the line
    const result = await db.collection('lyric_lines').findOneAndUpdate(
      { _id: new ObjectId(lineId) },
      { $set: { text, updated_at: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to update line' }, { status: 500 });
    }

    return NextResponse.json({ success: true, line: result });
  } catch (error) {
    console.error('Error updating lyric line:', error);
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
    const { songId, afterIndex, text } = body;

    if (!songId || afterIndex === undefined) {
      return NextResponse.json({ error: 'Song ID and afterIndex are required' }, { status: 400 });
    }

    const db = await getDb();

    // Verify the song belongs to the user
    const song = await db.collection('songs').findOne({
      _id: new ObjectId(songId),
      user_id: session.user.id
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found or unauthorized' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const newLineNumber = afterIndex + 1;

    // Increment line_number for all lines after the insertion point
    await db.collection('lyric_lines').updateMany(
      { song_id: songId, line_number: { $gt: afterIndex } },
      { $inc: { line_number: 1 }, $set: { updated_at: now } }
    );

    // Create the new line
    const newLine = {
      song_id: songId,
      line_number: newLineNumber,
      text: text || '',
      timestamp_ms: null,
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection('lyric_lines').insertOne(newLine);

    return NextResponse.json({
      success: true,
      line: {
        _id: result.insertedId.toString(),
        ...newLine,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating lyric line:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
