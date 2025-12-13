import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getSetlistItems,
  addSetlistItem,
  updateSetlistItem,
  deleteSetlistItem,
  reorderSetlistItems,
} from '@/lib/mongodb';

// GET /api/setlist?showId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('showId');

    if (!showId) {
      return NextResponse.json({ error: 'showId is required' }, { status: 400 });
    }

    const items = await getSetlistItems(showId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error in GET /api/setlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/setlist
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { show_id, type, song_id, artifact_id, custom_title, custom_text } = body;

    if (!show_id || !type) {
      return NextResponse.json(
        { error: 'show_id and type are required' },
        { status: 400 }
      );
    }

    if (type !== 'song' && type !== 'artifact') {
      return NextResponse.json(
        { error: 'type must be "song" or "artifact"' },
        { status: 400 }
      );
    }

    if (type === 'song' && !song_id) {
      return NextResponse.json(
        { error: 'song_id is required for song type' },
        { status: 400 }
      );
    }

    const item = await addSetlistItem({
      show_id,
      type,
      song_id: song_id || null,
      artifact_id: artifact_id || null,
      custom_title: custom_title || null,
      custom_text: custom_text || null,
    });

    if (!item) {
      return NextResponse.json({ error: 'Failed to add setlist item' }, { status: 500 });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/setlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/setlist
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, custom_title, custom_text } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: { custom_title?: string; custom_text?: string } = {};
    if (custom_title !== undefined) updates.custom_title = custom_title;
    if (custom_text !== undefined) updates.custom_text = custom_text;

    const item = await updateSetlistItem(id, updates);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error in PUT /api/setlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/setlist - Reorder items
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { showId, itemIds } = body;

    if (!showId || !itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { error: 'showId and itemIds array are required' },
        { status: 400 }
      );
    }

    const success = await reorderSetlistItems(showId, itemIds);
    if (!success) {
      return NextResponse.json({ error: 'Failed to reorder items' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/setlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/setlist?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const success = await deleteSetlistItem(id);
    if (!success) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/setlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
