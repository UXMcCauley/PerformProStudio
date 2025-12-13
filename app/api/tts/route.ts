import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// TTS voice options (these map to Web Speech API voices or can be extended to cloud TTS)
const VOICE_OPTIONS = [
  { id: 'default-male', name: 'Default Male', gender: 'male' },
  { id: 'default-female', name: 'Default Female', gender: 'female' },
  { id: 'deep-male', name: 'Deep Male', gender: 'male' },
  { id: 'high-female', name: 'High Female', gender: 'female' },
  { id: 'neutral', name: 'Neutral', gender: 'neutral' },
];

// GET /api/tts/voices - Get available voices
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return available voice options
    // In future, this could query cloud TTS services for available voices
    return NextResponse.json({
      voices: VOICE_OPTIONS,
      note: 'TTS is handled client-side using Web Speech API. These are suggested voice types.',
    });
  } catch (error) {
    console.error('Error fetching TTS voices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tts - Generate speech (placeholder for cloud TTS integration)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, voice_id } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // For now, return instructions for client-side TTS
    // In future, this could integrate with:
    // - Google Cloud TTS
    // - Amazon Polly
    // - ElevenLabs
    // - OpenAI TTS
    return NextResponse.json({
      success: true,
      method: 'client-side',
      text,
      voice_id: voice_id || 'default-male',
      instructions: 'Use Web Speech API on client with the provided text and voice hint',
    });
  } catch (error) {
    console.error('Error with TTS:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
