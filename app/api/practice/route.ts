import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSongPracticeSessions, createPracticeSession, updatePracticeSession, getLineTakes, createLineTake, getTimeSpentSegments, createTimeSpentSegment, getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');
    const type = searchParams.get('type');
    const db = await getDb();

    // Get all sessions for user (for analytics)
    if (type === 'all-sessions') {
      // Get all user's songs first
      const userSongs = await db.collection('songs').find({
        user_id: session.user.id
      }).toArray();

      const songIds = userSongs.map(s => s._id.toString());

      // Get all practice sessions for those songs
      const allSessions = await db.collection('practice_sessions')
        .find({ song_id: { $in: songIds } })
        .sort({ started_at: -1 })
        .toArray();

      return NextResponse.json(allSessions.map(s => ({
        ...s,
        _id: s._id.toString()
      })));
    }

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Verify the song belongs to the user
    const song = await db.collection('songs').findOne({
      _id: new ObjectId(songId),
      user_id: session.user.id
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    if (type === 'sessions') {
      const sessions = await getSongPracticeSessions(songId);
      return NextResponse.json(sessions);
    }

    // Default: return all practice data
    const sessions = await getSongPracticeSessions(songId);
    const sessionIds = sessions.map(s => s._id);
    const timeSegments = sessionIds.length > 0 ? await getTimeSpentSegments(sessionIds) : [];

    return NextResponse.json({ sessions, timeSegments });
  } catch (error) {
    console.error('Error fetching practice data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, songId, ...data } = body;

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Validate songId is a valid ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(songId)) {
      return NextResponse.json({ error: 'Invalid song ID format' }, { status: 400 });
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

    if (type === 'session') {
      const practiceSession = await createPracticeSession({
        song_id: songId,
        started_at: data.started_at || new Date().toISOString(),
        ended_at: data.ended_at || null,
        duration_seconds: data.duration_seconds || null,
        completed: data.completed || false,
      });

      if (!practiceSession) {
        return NextResponse.json({ error: 'Failed to create practice session' }, { status: 500 });
      }

      return NextResponse.json(practiceSession, { status: 201 });
    }

    if (type === 'take') {
      const take = await createLineTake({
        lyric_line_id: data.lyric_line_id,
        session_id: data.session_id || null,
        take_number: data.take_number,
      });
      return NextResponse.json(take, { status: 201 });
    }

    if (type === 'time_segment') {
      const segment = await createTimeSpentSegment({
        session_id: data.session_id,
        lyric_line_id: data.lyric_line_id || null,
        start_time_ms: data.start_time_ms,
        end_time_ms: data.end_time_ms,
        duration_seconds: data.duration_seconds,
      });
      return NextResponse.json(segment, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error creating practice data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, ...updates } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const practiceSession = await updatePracticeSession(sessionId, updates);
    if (!practiceSession) {
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json(practiceSession);
  } catch (error) {
    console.error('Error updating practice session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
