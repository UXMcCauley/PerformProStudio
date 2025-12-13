import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBandAlbums, createAlbum, deleteAlbum, getDb } from '@/lib/mongodb';
import { canAccessBand, canEditBand } from '@/lib/social';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bandId = searchParams.get('bandId');

    if (!bandId) {
      return NextResponse.json({ error: 'Band ID is required' }, { status: 400 });
    }

    // Verify user is a member of the band
    const hasAccess = await canAccessBand(bandId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const albums = await getBandAlbums(bandId);
    return NextResponse.json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
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
    const { bandId, name } = body;

    if (!bandId || !name?.trim()) {
      return NextResponse.json({ error: 'Band ID and name are required' }, { status: 400 });
    }

    // Verify user can edit the band (owner or admin)
    const canEdit = await canEditBand(bandId, session.user.id);
    if (!canEdit) {
      return NextResponse.json({ error: 'Only admins can create albums' }, { status: 403 });
    }

    const album = await createAlbum(bandId, name.trim());

    if (!album) {
      return NextResponse.json({ error: 'Failed to create album' }, { status: 500 });
    }

    return NextResponse.json(album, { status: 201 });
  } catch (error) {
    console.error('Error creating album:', error);
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
    const albumId = searchParams.get('id');

    if (!albumId) {
      return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });
    }

    // Get the album to find the band
    const db = await getDb();
    const album = await db.collection('albums').findOne({
      _id: new ObjectId(albumId)
    });

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    // Verify user can edit the band (owner or admin)
    const canEdit = await canEditBand(album.band_id, session.user.id);
    if (!canEdit) {
      return NextResponse.json({ error: 'Only admins can delete albums' }, { status: 403 });
    }

    const success = await deleteAlbum(albumId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete album' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting album:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
