import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBandFolders, createFolder, deleteFolder, getDb } from '@/lib/mongodb';
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

    // Verify the band belongs to the user
    const db = await getDb();
    const band = await db.collection('bands').findOne({
      _id: new ObjectId(bandId),
      user_id: session.user.id
    });

    if (!band) {
      return NextResponse.json({ error: 'Band not found' }, { status: 404 });
    }

    const folders = await getBandFolders(bandId);
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
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

    // Verify the band belongs to the user
    const db = await getDb();
    const band = await db.collection('bands').findOne({
      _id: new ObjectId(bandId),
      user_id: session.user.id
    });

    if (!band) {
      return NextResponse.json({ error: 'Band not found' }, { status: 404 });
    }

    const folder = await createFolder(bandId, name.trim());

    if (!folder) {
      return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
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
    const folderId = searchParams.get('id');

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    // Verify the folder belongs to a band owned by the user
    const db = await getDb();
    const folder = await db.collection('folders').findOne({
      _id: new ObjectId(folderId)
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const band = await db.collection('bands').findOne({
      _id: new ObjectId(folder.band_id),
      user_id: session.user.id
    });

    if (!band) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await deleteFolder(folderId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
