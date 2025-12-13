import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  sendBandInvite,
  acceptBandInvite,
  rejectBandInvite,
  getPendingBandInvites,
  canEditBand,
} from '@/lib/social';

// GET - List pending band invites for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invites = await getPendingBandInvites(session.user.id);
    return NextResponse.json(invites);
  } catch (error) {
    console.error('Error fetching band invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a band invite
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bandId, toUserId, role, message } = body;

    if (!bandId || !toUserId) {
      return NextResponse.json(
        { error: 'Band ID and target user ID are required' },
        { status: 400 }
      );
    }

    const invite = await sendBandInvite(
      bandId,
      session.user.id,
      toUserId,
      role || 'member',
      message
    );

    return NextResponse.json({ success: true, invite }, { status: 201 });
  } catch (error: any) {
    console.error('Error sending band invite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send band invite' },
      { status: 400 }
    );
  }
}

// PUT - Accept or reject a band invite
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { inviteId, action } = body;

    if (!inviteId || !action) {
      return NextResponse.json(
        { error: 'Invite ID and action are required' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      const member = await acceptBandInvite(inviteId, session.user.id);
      return NextResponse.json({ success: true, member });
    } else if (action === 'reject') {
      const success = await rejectBandInvite(inviteId, session.user.id);
      return NextResponse.json({ success });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error processing band invite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process band invite' },
      { status: 400 }
    );
  }
}
