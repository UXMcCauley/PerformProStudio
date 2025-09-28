export interface SoundCloudTrackInfo {
  id?: number;
  title: string;
  artist: string;
  description?: string;
  thumbnail_url?: string;
  artwork_url?: string;
  url: string;
  permalink_url?: string;
  duration?: number;
}

export interface SoundCloudPlaylistInfo {
  id?: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  artwork_url?: string;
  url: string;
  permalink_url?: string;
  track_count?: number;
  tracks?: SoundCloudTrackInfo[];
  user?: {
    username: string;
  };
}

export interface SoundCloudSearchResult {
  playlists: SoundCloudPlaylistInfo[];
  next_href?: string;
}

export function isValidSoundCloudUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'soundcloud.com' || urlObj.hostname === 'www.soundcloud.com';
  } catch {
    return false;
  }
}

export function getSoundCloudUrlType(url: string): 'track' | 'playlist' | 'set' | 'user' | 'unknown' {
  if (!isValidSoundCloudUrl(url)) return 'unknown';

  if (url.includes('/sets/')) return 'playlist';
  if (url.includes('/sets') || url.includes('/albums')) return 'set';

  const pathSegments = new URL(url).pathname.split('/').filter(Boolean);
  if (pathSegments.length === 2) return 'track';
  if (pathSegments.length === 1) return 'user';

  return 'unknown';
}

export async function getTrackInfoFromUrl(url: string): Promise<SoundCloudTrackInfo | null> {
  try {
    const response = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      console.error('Failed to fetch track info:', await response.text());
      return null;
    }

    const data = await response.json();

    return {
      title: data.title || 'Untitled',
      artist: data.author_name || 'Unknown Artist',
      description: data.description || '',
      thumbnail_url: data.thumbnail_url || null,
      url: url,
      duration: data.duration || null,
    };
  } catch (error) {
    console.error('Error fetching track info:', error);
    return null;
  }
}

export async function getPlaylistInfoFromUrl(url: string): Promise<SoundCloudPlaylistInfo | null> {
  try {
    const response = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      console.error('Failed to fetch playlist info:', await response.text());
      return null;
    }

    const data = await response.json();

    return {
      title: data.title || 'Untitled Playlist',
      description: data.description || '',
      thumbnail_url: data.thumbnail_url || null,
      url: url,
    };
  } catch (error) {
    console.error('Error fetching playlist info:', error);
    return null;
  }
}

export async function searchPlaylists(query: string, limit: number = 10, offset: number = 0): Promise<SoundCloudSearchResult> {
  try {
    const url = `https://api.soundcloud.com/playlists?q=${encodeURIComponent(query)}&access=playable&show_tracks=false&limit=${limit}&offset=${offset}&linked_partitioning=true`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('Failed to search playlists:', await response.text());
      return { playlists: [] };
    }

    const data = await response.json();

    const playlists: SoundCloudPlaylistInfo[] = (data.collection || []).map((playlist: any) => ({
      id: playlist.id,
      title: playlist.title || 'Untitled Playlist',
      description: playlist.description || '',
      artwork_url: playlist.artwork_url || null,
      url: playlist.permalink_url || '',
      permalink_url: playlist.permalink_url || '',
      track_count: playlist.track_count || 0,
      user: {
        username: playlist.user?.username || 'Unknown',
      },
    }));

    return {
      playlists,
      next_href: data.next_href,
    };
  } catch (error) {
    console.error('Error searching playlists:', error);
    return { playlists: [] };
  }
}

export async function getPlaylistTracks(playlistUrn: string): Promise<SoundCloudTrackInfo[]> {
  try {
    const encodedUrn = encodeURIComponent(playlistUrn);
    const url = `https://api.soundcloud.com/playlists/${encodedUrn}/tracks?access=playable&linked_partitioning=true`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('Failed to fetch playlist tracks:', await response.text());
      return [];
    }

    const data = await response.json();

    const tracks: SoundCloudTrackInfo[] = (data.collection || []).map((track: any) => ({
      id: track.id,
      title: track.title || 'Untitled',
      artist: track.user?.username || 'Unknown Artist',
      description: track.description || '',
      artwork_url: track.artwork_url || null,
      url: track.permalink_url || '',
      permalink_url: track.permalink_url || '',
      duration: track.duration || 0,
    }));

    return tracks;
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return [];
  }
}

export async function extractTracksFromPlaylist(playlistUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(playlistUrl)}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const trackUrls: string[] = [];

    if (data.html) {
      const iframeMatch = data.html.match(/src="([^"]+)"/);
      if (iframeMatch) {
        const widgetUrl = iframeMatch[1];
        const apiUrl = widgetUrl.replace('widget.soundcloud.com', 'api-widget.soundcloud.com');

        try {
          const widgetResponse = await fetch(apiUrl);
          const widgetData = await widgetResponse.json();

          if (widgetData.tracks && Array.isArray(widgetData.tracks)) {
            return widgetData.tracks.map((track: any) => track.permalink_url).filter(Boolean);
          }
        } catch (widgetError) {
          console.error('Error fetching playlist tracks:', widgetError);
        }
      }
    }

    return trackUrls;
  } catch (error) {
    console.error('Error extracting tracks from playlist:', error);
    return [];
  }
}