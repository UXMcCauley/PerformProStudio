import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { lyrics } = await request.json();

    if (!lyrics || typeof lyrics !== 'string') {
      return NextResponse.json({ error: 'Invalid lyrics' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a music lyric formatter. Your job is to:
1. Break lyrics into properly formatted lines (one phrase per line)
2. Remove extra whitespace and fix formatting issues
3. Identify verse, chorus, bridge sections and add section markers [Verse 1], [Chorus], etc.
4. Ensure each line is a natural phrase that would be sung together
5. Keep the original words intact - only format the structure

Return ONLY the formatted lyrics with proper line breaks. Do not add any other text or explanations.

Here are the lyrics to format:

${lyrics}`,
        },
      ],
    });

    const formattedLyrics = message.content[0].type === 'text'
      ? message.content[0].text
      : lyrics;

    return NextResponse.json({ formattedLyrics });
  } catch (error) {
    console.error('Error formatting lyrics:', error);
    return NextResponse.json(
      { error: 'Failed to format lyrics' },
      { status: 500 }
    );
  }
}