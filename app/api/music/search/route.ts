import { NextRequest, NextResponse } from 'next/server';
import { musicSearch } from '@/lib/music-search';
import { MusicSource } from '@/types/music';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const sourcesParam = searchParams.get('sources');
  const typesParam = searchParams.get('types');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    const sources = sourcesParam
      ? (sourcesParam.split(',') as MusicSource[])
      : undefined;

    const types = typesParam
      ? (typesParam.split(',') as ('artist' | 'album' | 'track')[])
      : undefined;

    const results = await musicSearch.search(query, {
      sources,
      limit: Math.min(limit, 50), // Cap at 50
      types,
    });

    return NextResponse.json({
      success: true,
      data: results,
      services: musicSearch.getServiceStatus(),
    });
  } catch (error) {
    console.error('Music search error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, sources, limit = 10, types } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const results = await musicSearch.search(query, {
      sources,
      limit: Math.min(limit, 50),
      types,
    });

    return NextResponse.json({
      success: true,
      data: results,
      services: musicSearch.getServiceStatus(),
    });
  } catch (error) {
    console.error('Music search error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
