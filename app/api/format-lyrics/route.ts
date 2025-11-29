import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { quickFormatLyrics, needsProcessing } from '@/lib/lyrics-ai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lyrics } = await request.json();

    if (!lyrics || typeof lyrics !== 'string') {
      return NextResponse.json({ error: 'Invalid lyrics' }, { status: 400 });
    }

    // Check if processing would help
    const shouldProcess = needsProcessing(lyrics);

    // Use the quick format from our lyrics-ai library
    const formattedLyrics = await quickFormatLyrics(lyrics);

    return NextResponse.json({
      formattedLyrics,
      wasProcessed: shouldProcess,
      originalLength: lyrics.length,
      formattedLength: formattedLyrics.length
    });
  } catch (error) {
    console.error('Error formatting lyrics:', error);
    return NextResponse.json(
      { error: 'Failed to format lyrics' },
      { status: 500 }
    );
  }
}
