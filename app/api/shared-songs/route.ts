import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  shareSongWithBand,
  unshareSongFromBand,
  getSharedSongsForBand,
  getBandsForSong,
  canAccessBand,
} from '@/lib/social';

// GET - Get shared songs for a band, or bands a song is shared with
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const bandId = searchParams.get('bandId');
    const songId = searchParams.get('songId');

    if (songId) {
      // Get bands this song is shared with
      const bandIds = await getBandsForSong(songId);
      return NextResponse.json({ bandIds });
    }

    if (bandId) {
      // Verify user has access to this band
      const hasAccess = await canAccessBand(bandId, session.user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const sharedSongs = await getSharedSongsForBand(bandId);
      return NextResponse.json(sharedSongs);
    }

    return NextResponse.json({ error: 'Band ID or Song ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching shared songs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Share a song with a band
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { songId, bandId } = body;

    if (!songId || !bandId) {
      return NextResponse.json(
        { error: 'Song ID and Band ID are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this band
    const hasAccess = await canAccessBand(bandId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const shared = await shareSongWithBand(songId, bandId, session.user.id);

    if (!shared) {
      return NextResponse.json({ error: 'Failed to share song' }, { status: 500 });
    }

    return NextResponse.json(shared, { status: 201 });
  } catch (error) {
    console.error('Error sharing song:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Unshare a song from a band
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('songId');
    const bandId = searchParams.get('bandId');

    if (!songId || !bandId) {
      return NextResponse.json(
        { error: 'Song ID and Band ID are required' },
        { status: 400 }
      );
    }

    const success = await unshareSongFromBand(songId, bandId, session.user.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to unshare song or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unsharing song:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
