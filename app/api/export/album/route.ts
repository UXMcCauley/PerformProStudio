import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAlbumSongs, getDb } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const albumName = searchParams.get('albumName');
    const format = searchParams.get('format') || 'txt'; // txt, lrc, or json

    if (!albumName) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    // Get all songs in the album
    const songs = await getAlbumSongs(albumName, session.user.id);

    if (songs.length === 0) {
      return NextResponse.json({ error: 'No songs found in this album' }, { status: 404 });
    }

    // Get lyrics for all songs
    const db = await getDb();
    const songIds = songs.map(s => s._id);
    const allLyrics = await db.collection('lyric_lines')
      .find({ song_id: { $in: songIds } })
      .sort({ song_id: 1, line_number: 1 })
      .toArray();

    // Group lyrics by song_id
    const lyricsBySong = new Map<string, typeof allLyrics>();
    for (const lyric of allLyrics) {
      const songLyrics = lyricsBySong.get(lyric.song_id) || [];
      songLyrics.push(lyric);
      lyricsBySong.set(lyric.song_id, songLyrics);
    }

    if (format === 'json') {
      // Return structured JSON data
      const exportData = {
        album: albumName,
        exported_at: new Date().toISOString(),
        songs: songs.map(song => ({
          title: song.title,
          artist: song.artist,
          completed: song.completed,
          soundcloud_url: song.soundcloud_url,
          instrumental_url: song.instrumental_url,
          tags: song.tags,
          lyrics: (lyricsBySong.get(song._id) || []).map(line => ({
            line_number: line.line_number,
            text: line.text,
            timestamp_ms: line.timestamp_ms
          }))
        }))
      };

      return NextResponse.json(exportData);
    }

    // Build export content
    let content = '';
    const fileExt = format === 'lrc' ? 'lrc' : 'txt';

    for (const song of songs) {
      const songLyrics = lyricsBySong.get(song._id) || [];

      if (format === 'lrc') {
        // LRC format with timestamps
        content += `[ti:${song.title}]\n`;
        content += `[ar:${song.artist}]\n`;
        content += `[al:${albumName}]\n`;
        content += '[by:IntelliPrompter]\n\n';

        for (const line of songLyrics) {
          if (line.timestamp_ms !== null) {
            const totalSeconds = line.timestamp_ms / 1000;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = (totalSeconds % 60).toFixed(2);
            content += `[${String(minutes).padStart(2, '0')}:${seconds.padStart(5, '0')}]${line.text}\n`;
          } else {
            content += `${line.text}\n`;
          }
        }
        content += '\n\n';
      } else {
        // Plain text format
        content += `=== ${song.title} ===\n`;
        content += `Artist: ${song.artist}\n`;
        content += `Album: ${albumName}\n`;
        if (song.tags && song.tags.length > 0) {
          content += `Tags: ${song.tags.join(', ')}\n`;
        }
        content += '\n';

        for (const line of songLyrics) {
          content += `${line.text}\n`;
        }
        content += '\n\n';
      }
    }

    // Return as downloadable file
    const filename = `${albumName.replace(/[^a-zA-Z0-9-_ ]/g, '')}.${fileExt}`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': format === 'lrc' ? 'text/plain; charset=utf-8' : 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting album:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
