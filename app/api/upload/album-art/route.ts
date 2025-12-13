import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { put, del } from '@vercel/blob';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max for album art

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const albumName = formData.get('albumName') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!albumName) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed types: JPEG, PNG, WebP, GIF` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB for album art` },
        { status: 400 }
      );
    }

    // Generate a unique filename for album art
    const timestamp = Date.now();
    const sanitizedAlbumName = albumName.replace(/[^a-zA-Z0-9-]/g, '_');
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${session.user.id}/album-art/${sanitizedAlbumName}-${timestamp}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
      pathname: blob.pathname,
    });
  } catch (error) {
    console.error('Error uploading album art:', error);
    return NextResponse.json(
      { error: 'Failed to upload album art' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Verify the URL belongs to the user
    if (!url.includes(session.user.id)) {
      return NextResponse.json({ error: 'Not authorized to delete this file' }, { status: 403 });
    }

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting album art:', error);
    return NextResponse.json(
      { error: 'Failed to delete album art' },
      { status: 500 }
    );
  }
}
