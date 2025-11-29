import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if user exists
    const user = await db.collection('users').findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      // Don't reveal whether user exists
      return NextResponse.json(
        { message: 'If an account with that email exists, a reset link will be sent.' },
        { status: 200 }
      );
    }

    // TODO: Implement email sending with a service like:
    // - SendGrid
    // - Resend
    // - AWS SES
    // - Nodemailer with SMTP

    // For now, return a message indicating the feature isn't fully implemented
    return NextResponse.json(
      {
        message: 'Password reset is not currently available. Please contact support.',
        // In development, you might want to log this or handle differently
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
