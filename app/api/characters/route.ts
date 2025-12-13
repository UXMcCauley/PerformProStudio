import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  CHARACTER_COLORS,
  getDb,
} from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/characters?songId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json({ error: 'Song ID required' }, { status: 400 });
    }

    // Verify user owns this song
    const db = await getDb();
    const song = await db.collection('songs').findOne({
      _id: new ObjectId(songId),
      user_id: session.user.id,
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const characters = await getCharacters(songId);
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/characters
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { song_id, name, color, voice_id, is_user, role } = body;

    if (!song_id || !name) {
      return NextResponse.json({ error: 'Song ID and name required' }, { status: 400 });
    }

    // Verify user owns this song
    const db = await getDb();
    const song = await db.collection('songs').findOne({
      _id: new ObjectId(song_id),
      user_id: session.user.id,
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Get existing characters count for color assignment
    const existingChars = await getCharacters(song_id);
    const defaultColor = CHARACTER_COLORS[existingChars.length % CHARACTER_COLORS.length];

    const character = await createCharacter({
      song_id,
      name,
      color: color || defaultColor,
      voice_id: voice_id || null,
      is_user: is_user || false,
      role: role || 'performer',
    });

    if (!character) {
      return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
    }

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/characters
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, color, voice_id, is_user, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }

    // Get character and verify ownership
    const db = await getDb();
    const character = await db.collection('characters').findOne({ _id: new ObjectId(id) });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const song = await db.collection('songs').findOne({
      _id: new ObjectId(character.song_id),
      user_id: session.user.id,
    });

    if (!song) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (voice_id !== undefined) updates.voice_id = voice_id;
    if (is_user !== undefined) updates.is_user = is_user;
    if (role !== undefined) updates.role = role;

    // If setting this character as user's character, unset others
    if (is_user) {
      await db.collection('characters').updateMany(
        { song_id: character.song_id, _id: { $ne: new ObjectId(id) } },
        { $set: { is_user: false } }
      );
      // Also update the song's my_character_id
      await db.collection('songs').updateOne(
        { _id: new ObjectId(character.song_id) },
        { $set: { my_character_id: id } }
      );
    }

    const updated = await updateCharacter(id, updates);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/characters?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }

    // Get character and verify ownership
    const db = await getDb();
    const character = await db.collection('characters').findOne({ _id: new ObjectId(id) });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const song = await db.collection('songs').findOne({
      _id: new ObjectId(character.song_id),
      user_id: session.user.id,
    });

    if (!song) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const success = await deleteCharacter(id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
