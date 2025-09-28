import { NextRequest, NextResponse } from 'next/server';
import { getTrackInfoFromUrl, getPlaylistInfoFromUrl, getSoundCloudUrlType, isValidSoundCloudUrl, extractTracksFromPlaylist } from '@/lib/soundcloud';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !isValidSoundCloudUrl(url)) {
      return NextResponse.json({ error: 'Invalid SoundCloud URL' }, { status: 400 });
    }

    const urlType = getSoundCloudUrlType(url);

    if (urlType === 'track') {
      const trackInfo = await getTrackInfoFromUrl(url);
      if (!trackInfo) {
        return NextResponse.json({ error: 'Failed to fetch track information' }, { status: 500 });
      }
      return NextResponse.json({ type: 'track', data: trackInfo });
    }

    if (urlType === 'playlist' || urlType === 'set') {
      const playlistInfo = await getPlaylistInfoFromUrl(url);
      if (!playlistInfo) {
        return NextResponse.json({ error: 'Failed to fetch playlist information' }, { status: 500 });
      }

      const trackUrls = await extractTracksFromPlaylist(url);
      const tracks = await Promise.all(
        trackUrls.map(async (trackUrl) => await getTrackInfoFromUrl(trackUrl))
      );

      return NextResponse.json({
        type: 'playlist',
        data: {
          ...playlistInfo,
          tracks: tracks.filter(Boolean),
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported URL type' }, { status: 400 });
  } catch (error) {
    console.error('Error processing SoundCloud URL:', error);
    return NextResponse.json({ error: 'Failed to process URL' }, { status: 500 });
  }
}