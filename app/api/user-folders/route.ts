import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserFolders,
  createUserFolder,
  reorderUserFolders,
  getDb
} from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folders = await getUserFolders(session.user.id);
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching user folders:', error);
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
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const folder = await createUserFolder(session.user.id, name.trim());

    if (!folder) {
      return NextResponse.json({ error: 'Folder already exists or failed to create' }, { status: 400 });
    }

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Error creating user folder:', error);
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
    const folderName = searchParams.get('folderName');

    if (!folderName) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const db = await getDb();

    // Delete from user_folders collection
    await db.collection('user_folders').deleteOne({
      user_id: session.user.id,
      name: folderName
    });

    // Remove folder from all songs (don't delete the songs)
    await db.collection('songs').updateMany(
      { user_id: session.user.id, folder: folderName },
      { $set: { folder: null, updated_at: new Date().toISOString() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user folder:', error);
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
    const { folderNames } = body;

    if (!Array.isArray(folderNames)) {
      return NextResponse.json({ error: 'folderNames must be an array' }, { status: 400 });
    }

    const success = await reorderUserFolders(session.user.id, folderNames);

    if (!success) {
      return NextResponse.json({ error: 'Failed to reorder folders' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering user folders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
