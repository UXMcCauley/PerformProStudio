import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createPracticeInvites,
  getPracticeInvitesForShow,
  getPendingPracticeInvites,
  respondToPracticeInvite,
  canAccessBand,
} from '@/lib/social';

// GET - Get practice invites for a show or pending invites for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const showId = searchParams.get('showId');
    const pending = searchParams.get('pending') === 'true';

    if (pending) {
      // Get pending practice invites for current user
      const invites = await getPendingPracticeInvites(session.user.id);
      return NextResponse.json(invites);
    }

    if (showId) {
      // Get invites for a specific show
      const invites = await getPracticeInvitesForShow(showId);
      return NextResponse.json(invites);
    }

    return NextResponse.json({ error: 'Show ID or pending flag required' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching practice invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create practice invites
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { showId, bandId, memberIds } = body;

    if (!showId || !bandId || !Array.isArray(memberIds)) {
      return NextResponse.json(
        { error: 'Show ID, band ID, and member IDs are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this band
    const hasAccess = await canAccessBand(bandId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const invites = await createPracticeInvites(
      showId,
      bandId,
      session.user.id,
      memberIds
    );

    return NextResponse.json(invites, { status: 201 });
  } catch (error) {
    console.error('Error creating practice invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Respond to a practice invite
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { inviteId, accept } = body;

    if (!inviteId || typeof accept !== 'boolean') {
      return NextResponse.json(
        { error: 'Invite ID and accept flag are required' },
        { status: 400 }
      );
    }

    const success = await respondToPracticeInvite(inviteId, session.user.id, accept);

    if (!success) {
      return NextResponse.json({ error: 'Invite not found or already processed' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error responding to practice invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
