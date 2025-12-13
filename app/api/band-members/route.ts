import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getBandMembers,
  removeBandMember,
  updateBandMemberRole,
  transferBandOwnership,
  canAccessBand,
} from '@/lib/social';

// GET - List band members
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const bandId = searchParams.get('bandId');

    if (!bandId) {
      return NextResponse.json({ error: 'Band ID is required' }, { status: 400 });
    }

    // Verify user has access to this band
    const hasAccess = await canAccessBand(bandId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const members = await getBandMembers(bandId);
    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching band members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update member role or transfer ownership
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bandId, userId, action, newRole } = body;

    if (!bandId || !userId || !action) {
      return NextResponse.json(
        { error: 'Band ID, user ID, and action are required' },
        { status: 400 }
      );
    }

    if (action === 'updateRole') {
      if (!newRole) {
        return NextResponse.json({ error: 'New role is required' }, { status: 400 });
      }
      const success = await updateBandMemberRole(bandId, userId, newRole, session.user.id);
      return NextResponse.json({ success });
    } else if (action === 'transferOwnership') {
      const success = await transferBandOwnership(bandId, userId, session.user.id);
      return NextResponse.json({ success });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error updating band member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update band member' },
      { status: 400 }
    );
  }
}

// DELETE - Remove a member or leave band
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const bandId = searchParams.get('bandId');
    const userId = searchParams.get('userId') || session.user.id; // Default to self (leaving)

    if (!bandId) {
      return NextResponse.json({ error: 'Band ID is required' }, { status: 400 });
    }

    const success = await removeBandMember(bandId, userId, session.user.id);

    if (!success) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing band member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove band member' },
      { status: 400 }
    );
  }
}
