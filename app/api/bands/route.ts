import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createBand, getDb } from '@/lib/mongodb';
import { getUserBands as getUserBandsWithMembership, addBandMember, isBandOwner } from '@/lib/social';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get bands where user is a member (includes owned bands and shared bands)
    const bands = await getUserBandsWithMembership(session.user.id);
    return NextResponse.json(bands);
  } catch (error) {
    console.error('Error fetching bands:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Band name is required' }, { status: 400 });
    }

    const band = await createBand(session.user.id, name.trim());
    if (!band) {
      return NextResponse.json({ error: 'Failed to create band' }, { status: 500 });
    }

    // Add creator as owner in band_members
    await addBandMember(band._id.toString(), session.user.id, 'owner', session.user.id);

    return NextResponse.json({ ...band, role: 'owner' }, { status: 201 });
  } catch (error) {
    console.error('Error creating band:', error);
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
    const bandId = searchParams.get('id');

    if (!bandId) {
      return NextResponse.json({ error: 'Band ID is required' }, { status: 400 });
    }

    // Verify user is the band owner
    const isOwner = await isBandOwner(bandId, session.user.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Only the band owner can delete the band' }, { status: 403 });
    }

    const db = await getDb();

    // Delete associated data
    await db.collection('albums').deleteMany({ band_id: bandId });
    await db.collection('folders').deleteMany({ band_id: bandId });
    await db.collection('band_members').deleteMany({ band_id: bandId });
    await db.collection('band_invites').deleteMany({ band_id: bandId });

    // Delete the band
    await db.collection('bands').deleteOne({ _id: new ObjectId(bandId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting band:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
