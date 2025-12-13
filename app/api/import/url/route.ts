import { NextRequest, NextResponse } from 'next/server';
import { detectMusicUrl, getServiceDisplayName } from '@/lib/url-detector';
import { getTrackInfoFromUrl } from '@/lib/soundcloud';
import * as spotify from '@/lib/spotify';
import * as deezer from '@/lib/deezer';
import { lrclib, ParsedLyricLine } from '@/lib/lrclib';

export interface ImportedTrack {
  title: string;
  artist: string;
  album?: string;
  image?: string;
  duration?: number;
  url: string;
  service: string;
  serviceDisplayName: string;
}

export interface ImportedLyrics {
  synced: ParsedLyricLine[] | null;
  plain: string[] | null;
  source: string;
}

// Fetch track info from YouTube using oEmbed
async function getYouTubeTrackInfo(videoId: string, url: string): Promise<ImportedTrack | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Try to parse title for artist - title format
    let title = data.title || 'Untitled';
    let artist = data.author_name || 'Unknown Artist';

    // Common patterns: "Artist - Title", "Artist: Title", "Title by Artist"
    const dashMatch = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    const colonMatch = title.match(/^(.+?)\s*:\s*(.+)$/);
    const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);

    if (dashMatch) {
      artist = dashMatch[1].trim();
      title = dashMatch[2].trim();
    } else if (colonMatch) {
      artist = colonMatch[1].trim();
      title = colonMatch[2].trim();
    } else if (byMatch) {
      title = byMatch[1].trim();
      artist = byMatch[2].trim();
    }

    return {
      title,
      artist,
      image: data.thumbnail_url,
      url,
      service: 'youtube',
      serviceDisplayName: 'YouTube',
    };
  } catch (error) {
    console.error('Error fetching YouTube track info:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const detected = detectMusicUrl(url.trim());

    if (detected.service === 'unknown') {
      return NextResponse.json(
        { error: 'Unsupported URL. Please use a URL from SoundCloud, Spotify, Deezer, or YouTube.' },
        { status: 400 }
      );
    }

    if (detected.type !== 'track') {
      return NextResponse.json(
        { error: `Only single track URLs are supported. This appears to be a ${detected.type} URL.` },
        { status: 400 }
      );
    }

    let trackInfo: ImportedTrack | null = null;

    switch (detected.service) {
      case 'soundcloud': {
        const scTrack = await getTrackInfoFromUrl(url);
        if (scTrack) {
          trackInfo = {
            title: scTrack.title,
            artist: scTrack.artist,
            image: scTrack.thumbnail_url || scTrack.artwork_url,
            duration: scTrack.duration,
            url: scTrack.url,
            service: 'soundcloud',
            serviceDisplayName: 'SoundCloud',
          };
        }
        break;
      }

      case 'spotify': {
        if (!spotify.isConfigured()) {
          return NextResponse.json(
            { error: 'Spotify is not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your environment.' },
            { status: 400 }
          );
        }

        if (detected.id) {
          const track = await spotify.getTrack(detected.id);
          if (track) {
            trackInfo = {
              title: track.name,
              artist: track.artist,
              album: track.album,
              image: track.image,
              duration: track.duration,
              url: track.externalUrls?.spotify || url,
              service: 'spotify',
              serviceDisplayName: 'Spotify',
            };
          }
        }
        break;
      }

      case 'deezer': {
        if (detected.id) {
          const track = await deezer.getTrack(detected.id);
          if (track) {
            trackInfo = {
              title: track.name,
              artist: track.artist,
              album: track.album,
              image: track.image,
              duration: track.duration,
              url: track.externalUrls?.deezer || url,
              service: 'deezer',
              serviceDisplayName: 'Deezer',
            };
          }
        }
        break;
      }

      case 'youtube': {
        if (detected.id) {
          trackInfo = await getYouTubeTrackInfo(detected.id, url);
        }
        break;
      }

      case 'apple': {
        // Apple Music oEmbed is limited, but we can try
        try {
          const oembedUrl = `https://music.apple.com/oembed?url=${encodeURIComponent(url)}&format=json`;
          const response = await fetch(oembedUrl);

          if (response.ok) {
            const data = await response.json();
            // Parse the title which is usually "Song Name - Artist"
            let title = data.title || 'Untitled';
            let artist = data.author_name || 'Unknown Artist';

            const dashMatch = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
            if (dashMatch) {
              title = dashMatch[1].trim();
              artist = dashMatch[2].trim();
            }

            trackInfo = {
              title,
              artist,
              image: data.thumbnail_url,
              url,
              service: 'apple',
              serviceDisplayName: 'Apple Music',
            };
          }
        } catch (error) {
          console.error('Error fetching Apple Music track info:', error);
        }
        break;
      }
    }

    if (!trackInfo) {
      return NextResponse.json(
        { error: `Failed to fetch track information from ${getServiceDisplayName(detected.service)}` },
        { status: 500 }
      );
    }

    // Try to fetch lyrics from LRCLIB
    let lyrics: ImportedLyrics | null = null;
    try {
      const lyricsResult = await lrclib.getLyrics(
        trackInfo.title,
        trackInfo.artist,
        trackInfo.album,
        trackInfo.duration
      );

      if (lyricsResult) {
        lyrics = lyricsResult;
      }
    } catch (lyricsError) {
      console.error('Error fetching lyrics:', lyricsError);
      // Don't fail the import if lyrics fetch fails
    }

    return NextResponse.json({
      success: true,
      track: trackInfo,
      lyrics,
    });
  } catch (error) {
    console.error('Error processing import URL:', error);
    return NextResponse.json({ error: 'Failed to process URL' }, { status: 500 });
  }
}
