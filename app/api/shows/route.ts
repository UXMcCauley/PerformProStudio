import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getBandShows,
  getShow,
  createShow,
  updateShow,
  deleteShow,
  getUpcomingShowsForUser,
  getAllUserBandShows,
} from '@/lib/mongodb';

// GET /api/shows?bandId=xxx&month=2024-12 OR ?upcoming=true OR ?allBands=true&month=2024-12
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bandId = searchParams.get('bandId');
    const showId = searchParams.get('id');
    const month = searchParams.get('month') || undefined;
    const upcoming = searchParams.get('upcoming') === 'true';
    const allBands = searchParams.get('allBands') === 'true';

    // Get upcoming shows for current user (across all their bands)
    if (upcoming) {
      const shows = await getUpcomingShowsForUser(session.user.id);
      return NextResponse.json(shows);
    }

    // Get shows from all user's bands for a specific month
    if (allBands) {
      const shows = await getAllUserBandShows(session.user.id, month);
      return NextResponse.json(shows);
    }

    if (showId) {
      const show = await getShow(showId);
      if (!show) {
        return NextResponse.json({ error: 'Show not found' }, { status: 404 });
      }
      return NextResponse.json(show);
    }

    if (!bandId) {
      return NextResponse.json({ error: 'bandId is required' }, { status: 400 });
    }

    const shows = await getBandShows(bandId, month);
    return NextResponse.json(shows);
  } catch (error) {
    console.error('Error in GET /api/shows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shows
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { band_id, name, date, time, venue, notes, event_type } = body;

    if (!band_id || !name || !date) {
      return NextResponse.json(
        { error: 'band_id, name, and date are required' },
        { status: 400 }
      );
    }

    const show = await createShow({
      band_id,
      name,
      date,
      time: time || null,
      venue: venue || null,
      notes: notes || null,
      event_type: event_type || 'show',
      created_by: session.user.id,
    });

    if (!show) {
      return NextResponse.json({ error: 'Failed to create show' }, { status: 500 });
    }

    return NextResponse.json(show, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/shows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/shows
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, date, time, venue, notes, event_type } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (venue !== undefined) updates.venue = venue;
    if (notes !== undefined) updates.notes = notes;
    if (event_type !== undefined) updates.event_type = event_type;

    const show = await updateShow(id, updates);
    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    return NextResponse.json(show);
  } catch (error) {
    console.error('Error in PUT /api/shows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/shows?id=xxx
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

    const success = await deleteShow(id);
    if (!success) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/shows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
