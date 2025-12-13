import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserAlbums,
  createUserAlbum,
  updateUserAlbum,
  deleteUserAlbum,
  reorderUserAlbums,
  getAlbumSongs
} from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const albumName = searchParams.get('albumName');

    // If albumName is provided, get songs for that album
    if (albumName) {
      const songs = await getAlbumSongs(albumName, session.user.id);
      return NextResponse.json({ songs });
    }

    // Otherwise, get all user albums
    const albums = await getUserAlbums(session.user.id);
    return NextResponse.json(albums);
  } catch (error) {
    console.error('Error fetching user albums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, cover_art } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    const album = await createUserAlbum(session.user.id, name.trim(), cover_art);

    if (!album) {
      return NextResponse.json({ error: 'Album already exists or failed to create' }, { status: 400 });
    }

    return NextResponse.json(album, { status: 201 });
  } catch (error) {
    console.error('Error creating user album:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { albumName, cover_art, name: newName } = body;

    if (!albumName) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    const updates: { cover_art?: string | null; name?: string } = {};
    if (cover_art !== undefined) updates.cover_art = cover_art;
    if (newName) updates.name = newName;

    const success = await updateUserAlbum(session.user.id, albumName, updates);

    if (!success) {
      return NextResponse.json({ error: 'Failed to update album' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user album:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const albumName = searchParams.get('albumName');

    if (!albumName) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    const success = await deleteUserAlbum(session.user.id, albumName);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete album' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user album:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { albumNames } = body;

    if (!Array.isArray(albumNames)) {
      return NextResponse.json({ error: 'albumNames must be an array' }, { status: 400 });
    }

    const success = await reorderUserAlbums(session.user.id, albumNames);

    if (!success) {
      return NextResponse.json({ error: 'Failed to reorder albums' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering user albums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
