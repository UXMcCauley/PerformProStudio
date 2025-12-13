import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserSettings, upsertUserSettings } from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getUserSettings(session.user.id);
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { theme, name, email, avatar } = body;

    // Validate theme if provided
    if (theme !== undefined && theme !== 'light' && theme !== 'dark') {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
    }

    let settings;
    try {
      settings = await upsertUserSettings(session.user.id, {
        theme,
        name,
        email,
        avatar,
      });
    } catch (dbError) {
      console.error('Database error in upsertUserSettings:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!settings) {
      console.error('upsertUserSettings returned null for user:', session.user.id);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
