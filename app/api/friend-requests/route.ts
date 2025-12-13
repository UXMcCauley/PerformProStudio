import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getPendingFriendRequests,
  getSentFriendRequests,
} from '@/lib/social';

// GET - List pending friend requests (incoming and sent)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'incoming'; // 'incoming' | 'sent'

    if (type === 'sent') {
      const requests = await getSentFriendRequests(session.user.id);
      return NextResponse.json(requests);
    } else {
      const requests = await getPendingFriendRequests(session.user.id);
      return NextResponse.json(requests);
    }
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a friend request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { toUserId, message } = body;

    if (!toUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const result = await sendFriendRequest(session.user.id, toUserId, message);

    if (result === null) {
      // Auto-accepted because they had sent us a request
      return NextResponse.json({
        success: true,
        autoAccepted: true,
        message: 'Friend request auto-accepted - you are now friends!',
      });
    }

    return NextResponse.json({ success: true, request: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error sending friend request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send friend request' },
      { status: 400 }
    );
  }
}

// PUT - Accept or reject a friend request
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      const friendship = await acceptFriendRequest(requestId, session.user.id);
      return NextResponse.json({ success: true, friendship });
    } else if (action === 'reject') {
      const success = await rejectFriendRequest(requestId, session.user.id);
      return NextResponse.json({ success });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error processing friend request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process friend request' },
      { status: 400 }
    );
  }
}

// DELETE - Cancel a sent friend request
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const success = await cancelFriendRequest(requestId, session.user.id);

    if (!success) {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling friend request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
