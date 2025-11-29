import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserBands, createBand, getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bands = await getUserBands(session.user.id);
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

    return NextResponse.json(band, { status: 201 });
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

    const db = await getDb();

    // Verify the band belongs to the user
    const band = await db.collection('bands').findOne({
      _id: new ObjectId(bandId),
      user_id: session.user.id
    });

    if (!band) {
      return NextResponse.json({ error: 'Band not found' }, { status: 404 });
    }

    // Delete associated albums and folders
    await db.collection('albums').deleteMany({ band_id: bandId });
    await db.collection('folders').deleteMany({ band_id: bandId });

    // Delete the band
    await db.collection('bands').deleteOne({ _id: new ObjectId(bandId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting band:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
