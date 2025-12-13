import { MongoClient, Db, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB!;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to preserve the connection across hot reloads
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export { clientPromise };

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

// Type definitions

// Content types for grouping entities
export type GroupContentType = 'band' | 'production' | 'podcast' | 'organization';

// Band represents different group types based on content:
// - band: Music band/group (for lyrics)
// - production: Theater company/production team (for scripts)
// - podcast: Podcast show (for podcasts)
// - organization: Organization/company (for speeches)
export type Band = {
  _id: string;
  user_id: string;
  name: string;
  content_type: GroupContentType;  // What type of group this is
  created_at: string;
  updated_at: string;
};

// Album represents different collection types based on parent's content_type:
// - band → Album (music album)
// - production → Show/Play (theatrical production)
// - podcast → Season (podcast season)
// - organization → Event/Series (speaking event)
export type Album = {
  _id: string;
  band_id: string;
  name: string;
  cover_art: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

// Folder represents different organization types based on parent's content_type:
// - band → Folder (general folder)
// - production → Project (production project)
// - podcast → Category (episode category)
// - organization → Topic (speech topic)
export type Folder = {
  _id: string;
  band_id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type TagConfig = {
  _id: string;
  user_id: string;
  tag_name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

// Content types for different use cases
export type ContentType = 'lyrics' | 'script' | 'podcast' | 'speech';

export type Song = {
  _id: string;
  title: string;
  artist: string;  // For lyrics: artist name, scripts: production/show name, podcasts: show name, speeches: event name
  album: string | null;
  folder: string | null;
  tags: string[];
  soundcloud_url: string | null;
  instrumental_url: string | null;
  artwork_url: string | null;
  completed: boolean;
  band_id: string | null;
  album_id: string | null;
  folder_id: string | null;
  user_id: string;
  display_order: number;
  content_type: ContentType;  // What type of content this is
  // Script-specific fields
  my_character_id: string | null;  // Which character the user is practicing
  // Podcast-specific fields
  episode_number: number | null;
  // Speech-specific fields
  duration_target_minutes: number | null;  // Target speech duration
  created_at: string;
  updated_at: string;
};

// Character roles for scripts/podcasts
export type CharacterRole = 'performer' | 'director' | 'narrator' | 'crew' | 'host' | 'guest';

// Character for scripts (actors practicing with other parts read by TTS)
export type Character = {
  _id: string;
  song_id: string;  // The script this character belongs to
  name: string;
  color: string;  // For visual distinction in editor
  voice_id: string | null;  // TTS voice to use for this character
  is_user: boolean;  // Is this the character the user is practicing?
  role: CharacterRole;  // Type of role (performer, director, narrator, etc.)
  display_order: number;
  created_at: string;
  updated_at: string;
};

// Line types for different content
export type LineType =
  | 'lyric'           // Regular lyrics line
  | 'dialogue'        // Script dialogue
  | 'stage_direction' // Script stage directions (actions, etc.)
  | 'talking_point'   // Podcast talking point
  | 'question'        // Podcast interview question
  | 'segment_header'  // Podcast/speech segment header
  | 'cue'             // Speech cue/prompt
  | 'emphasis'        // Speech emphasis point
  | 'pause';          // Intentional pause marker

export type LyricLine = {
  _id: string;
  song_id: string;
  line_number: number;
  text: string;
  timestamp_ms: number | null;
  // Extended fields for different content types
  character_id: string | null;  // For scripts: which character speaks this line
  line_type: LineType;          // What kind of line this is
  notes: string | null;         // Additional notes (stage directions, delivery notes)
  duration_seconds: number | null; // For speeches: estimated time for this section
  created_at: string;
  updated_at: string;
};

export type PracticeSession = {
  _id: string;
  song_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  completed: boolean;
  created_at: string;
};

export type LineTake = {
  _id: string;
  lyric_line_id: string;
  session_id: string | null;
  take_number: number;
  created_at: string;
};

export type TimeSpentSegment = {
  _id: string;
  session_id: string;
  lyric_line_id: string | null;
  start_time_ms: number;
  end_time_ms: number;
  duration_seconds: number;
  created_at: string;
};

export type UserSettings = {
  _id: string;
  user_id: string;
  theme: 'light' | 'dark';
  name?: string;
  email?: string;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
};

export type User = {
  _id: string;
  email: string;
  password: string;
  displayName?: string;
  created_at: string;
  updated_at: string;
};

// Show types for setlist feature
export type Show = {
  _id: string;
  band_id: string;
  name: string;
  date: string;           // ISO date "2024-12-20"
  time: string | null;    // "20:00" or null
  venue: string | null;
  notes: string | null;
  event_type: 'show' | 'practice';  // Type of event
  created_by: string;     // user_id who created
  created_at: string;
  updated_at: string;
};

export type SetlistItem = {
  _id: string;
  show_id: string;
  type: 'song' | 'artifact';
  song_id: string | null;
  artifact_id: string | null;
  custom_title: string | null;  // Custom title for artifacts (e.g., "Stage Banter", "Crowd Work")
  custom_text: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type ArtifactTemplate = {
  _id: string;
  band_id: string;
  name: string;
  default_text: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

// Helper to convert MongoDB _id to string id for client compatibility
function toClientDoc<T extends { _id: ObjectId | string }>(doc: T): Omit<T, '_id'> & { _id: string } {
  return {
    ...doc,
    _id: doc._id.toString(),
  };
}

// User Settings Functions
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const db = await getDb();
    const doc = await db.collection('user_settings').findOne({ user_id: userId });
    if (!doc) return null;
    return toClientDoc(doc) as UserSettings;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }
}

export async function upsertUserSettings(
  userId: string,
  settings: {
    theme?: 'light' | 'dark';
    name?: string;
    email?: string;
    avatar?: string | null;
  }
): Promise<UserSettings | null> {
  try {
    if (settings.theme && !['light', 'dark'].includes(settings.theme)) {
      console.error('Invalid theme value:', settings.theme);
      return null;
    }

    const db = await getDb();
    const now = new Date().toISOString();

    // Filter out undefined values to avoid overwriting with undefined
    const updateFields: Record<string, unknown> = { updated_at: now };
    if (settings.theme !== undefined) updateFields.theme = settings.theme;
    if (settings.name !== undefined) updateFields.name = settings.name;
    if (settings.email !== undefined) updateFields.email = settings.email;
    if (settings.avatar !== undefined) updateFields.avatar = settings.avatar;

    // Build $setOnInsert fields - exclude fields that are in $set to avoid conflict
    const setOnInsertFields: Record<string, unknown> = {
      user_id: userId,
      created_at: now,
    };
    // Only add theme to $setOnInsert if NOT being updated (to avoid conflict with $set)
    if (settings.theme === undefined) {
      setOnInsertFields.theme = 'dark';
    }

    // Use updateOne with upsert instead of findOneAndUpdate for better compatibility
    await db.collection('user_settings').updateOne(
      { user_id: userId },
      {
        $set: updateFields,
        $setOnInsert: setOnInsertFields,
      },
      { upsert: true }
    );

    // Fetch the updated/inserted document
    const doc = await db.collection('user_settings').findOne({ user_id: userId });
    if (!doc) {
      console.error('Could not find user_settings after upsert for user:', userId);
      return null;
    }
    return toClientDoc(doc) as UserSettings;
  } catch (error) {
    console.error('Error upserting user settings:', error);
    throw error;
  }
}

// Band Functions
export async function getUserBands(userId: string): Promise<Band[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('bands')
      .find({ user_id: userId })
      .sort({ name: 1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as Band[];
  } catch (error) {
    console.error('Error fetching bands:', error);
    return [];
  }
}

export async function createBand(userId: string, name: string, contentType: GroupContentType = 'band'): Promise<Band | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      user_id: userId,
      name,
      content_type: contentType,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection('bands').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as Band;
  } catch (error) {
    console.error('Error creating band:', error);
    return null;
  }
}

// Album Functions
export async function getBandAlbums(bandId: string): Promise<Album[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('albums')
      .find({ band_id: bandId })
      .sort({ name: 1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as Album[];
  } catch (error) {
    console.error('Error fetching albums:', error);
    return [];
  }
}

export async function createAlbum(bandId: string, name: string): Promise<Album | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Get the max display_order for this band's albums
    const maxOrderDoc = await db.collection('albums')
      .find({ band_id: bandId })
      .sort({ display_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = maxOrderDoc.length > 0 ? (maxOrderDoc[0].display_order || 0) : 0;

    const doc = {
      band_id: bandId,
      name,
      cover_art: null,
      display_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection('albums').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as Album;
  } catch (error) {
    console.error('Error creating album:', error);
    return null;
  }
}

export async function updateAlbum(albumId: string, updates: Partial<Album>): Promise<Album | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.collection('albums').findOneAndUpdate(
      { _id: new ObjectId(albumId) },
      { $set: { ...updates, updated_at: now } },
      { returnDocument: 'after' }
    );

    if (!result) return null;
    return toClientDoc(result) as Album;
  } catch (error) {
    console.error('Error updating album:', error);
    return null;
  }
}

export async function reorderAlbums(albumIds: string[]): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const bulkOps = albumIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { display_order: index, updated_at: now } }
      }
    }));

    await db.collection('albums').bulkWrite(bulkOps);
    return true;
  } catch (error) {
    console.error('Error reordering albums:', error);
    return false;
  }
}

export async function deleteAlbum(albumId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.collection('albums').deleteOne({ _id: new ObjectId(albumId) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting album:', error);
    return false;
  }
}

// Folder Functions
export async function getBandFolders(bandId: string): Promise<Folder[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('folders')
      .find({ band_id: bandId })
      .sort({ name: 1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as Folder[];
  } catch (error) {
    console.error('Error fetching folders:', error);
    return [];
  }
}

export async function createFolder(bandId: string, name: string): Promise<Folder | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Get the max display_order for this band's folders
    const maxOrderDoc = await db.collection('folders')
      .find({ band_id: bandId })
      .sort({ display_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = maxOrderDoc.length > 0 ? (maxOrderDoc[0].display_order || 0) : 0;

    const doc = {
      band_id: bandId,
      name,
      display_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection('folders').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as Folder;
  } catch (error) {
    console.error('Error creating folder:', error);
    return null;
  }
}

export async function updateFolder(folderId: string, updates: Partial<Folder>): Promise<Folder | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.collection('folders').findOneAndUpdate(
      { _id: new ObjectId(folderId) },
      { $set: { ...updates, updated_at: now } },
      { returnDocument: 'after' }
    );

    if (!result) return null;
    return toClientDoc(result) as Folder;
  } catch (error) {
    console.error('Error updating folder:', error);
    return null;
  }
}

export async function reorderFolders(folderIds: string[]): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const bulkOps = folderIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { display_order: index, updated_at: now } }
      }
    }));

    await db.collection('folders').bulkWrite(bulkOps);
    return true;
  } catch (error) {
    console.error('Error reordering folders:', error);
    return false;
  }
}

export async function deleteFolder(folderId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.collection('folders').deleteOne({ _id: new ObjectId(folderId) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting folder:', error);
    return false;
  }
}

// Tag Config Functions
export async function getUserTagConfigs(userId: string): Promise<TagConfig[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('tags_config')
      .find({ user_id: userId })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as TagConfig[];
  } catch (error) {
    console.error('Error fetching tag configs:', error);
    return [];
  }
}

export async function upsertTagConfig(userId: string, tagName: string, color: string): Promise<TagConfig | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.collection('tags_config').findOneAndUpdate(
      { user_id: userId, tag_name: tagName },
      {
        $set: {
          color,
          updated_at: now,
        },
        $setOnInsert: {
          user_id: userId,
          tag_name: tagName,
          created_at: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result) return null;
    return toClientDoc(result) as TagConfig;
  } catch (error) {
    console.error('Error upserting tag config:', error);
    return null;
  }
}

// Song Functions
export async function getUserSongs(userId: string): Promise<Song[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('songs')
      .find({ user_id: userId })
      .sort({ updated_at: -1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as Song[];
  } catch (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
}

export async function createSong(song: Omit<Song, '_id' | 'created_at' | 'updated_at' | 'display_order'>): Promise<Song | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Get the max display_order for this user's songs
    const maxOrderDoc = await db.collection('songs')
      .find({ user_id: song.user_id })
      .sort({ display_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = maxOrderDoc.length > 0 ? (maxOrderDoc[0].display_order || 0) : 0;

    const doc = {
      ...song,
      display_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection('songs').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as Song;
  } catch (error) {
    console.error('Error creating song:', error);
    return null;
  }
}

export async function updateSong(songId: string, updates: Partial<Song>): Promise<Song | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.collection('songs').findOneAndUpdate(
      { _id: new ObjectId(songId) },
      { $set: { ...updates, updated_at: now } },
      { returnDocument: 'after' }
    );

    if (!result) return null;
    return toClientDoc(result) as Song;
  } catch (error) {
    console.error('Error updating song:', error);
    return null;
  }
}

export async function reorderSongs(songIds: string[]): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const bulkOps = songIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { display_order: index, updated_at: now } }
      }
    }));

    await db.collection('songs').bulkWrite(bulkOps);
    return true;
  } catch (error) {
    console.error('Error reordering songs:', error);
    return false;
  }
}

export async function getAlbumSongs(albumName: string, userId: string): Promise<Song[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('songs')
      .find({ user_id: userId, album: albumName })
      .sort({ display_order: 1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as Song[];
  } catch (error) {
    console.error('Error fetching album songs:', error);
    return [];
  }
}

// ============================================
// CHARACTER FUNCTIONS (for scripts)
// ============================================

export async function getCharacters(songId: string): Promise<Character[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('characters')
      .find({ song_id: songId })
      .sort({ display_order: 1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as Character[];
  } catch (error) {
    console.error('Error fetching characters:', error);
    return [];
  }
}

export async function createCharacter(character: Omit<Character, '_id' | 'created_at' | 'updated_at' | 'display_order'>): Promise<Character | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Get max display_order for this script's characters
    const maxOrderDoc = await db.collection('characters')
      .find({ song_id: character.song_id })
      .sort({ display_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = maxOrderDoc.length > 0 ? (maxOrderDoc[0].display_order || 0) : 0;

    const doc = {
      ...character,
      display_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection('characters').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as Character;
  } catch (error) {
    console.error('Error creating character:', error);
    return null;
  }
}

export async function updateCharacter(characterId: string, updates: Partial<Character>): Promise<Character | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.collection('characters').findOneAndUpdate(
      { _id: new ObjectId(characterId) },
      { $set: { ...updates, updated_at: now } },
      { returnDocument: 'after' }
    );

    if (!result) return null;
    return toClientDoc(result) as Character;
  } catch (error) {
    console.error('Error updating character:', error);
    return null;
  }
}

export async function deleteCharacter(characterId: string): Promise<boolean> {
  try {
    const db = await getDb();

    // Remove character from any lines that reference it
    await db.collection('lyric_lines').updateMany(
      { character_id: characterId },
      { $set: { character_id: null } }
    );

    const result = await db.collection('characters').deleteOne({ _id: new ObjectId(characterId) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting character:', error);
    return false;
  }
}

// Default character colors for visual distinction
export const CHARACTER_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

// Get unique album names with cover art from user's albums collection or songs
export type UserAlbum = {
  _id: string;
  name: string;
  cover_art: string | null;
  display_order: number;
  song_count: number;
  user_id: string;
  archived_at?: string | null;
};

export async function getUserAlbums(userId: string, includeArchived: boolean = false): Promise<UserAlbum[]> {
  try {
    const db = await getDb();

    // Build the query filter for user_albums collection
    const filter: Record<string, unknown> = { user_id: userId };
    if (!includeArchived) {
      filter.$or = [
        { archived_at: null },
        { archived_at: { $exists: false } }
      ];
    }

    // Get albums from the user_albums collection
    const userAlbums = await db.collection('user_albums')
      .find(filter)
      .sort({ display_order: 1 })
      .toArray();

    // Get song counts for each album
    const albumCounts = await db.collection('songs').aggregate([
      { $match: { user_id: userId, album: { $ne: null } } },
      { $group: { _id: '$album', count: { $sum: 1 } } }
    ]).toArray();

    const countMap = new Map(albumCounts.map(a => [a._id, a.count]));

    // Get unique album names from songs that might not be in user_albums
    const uniqueAlbumsFromSongs = await db.collection('songs').aggregate([
      { $match: { user_id: userId, album: { $ne: null } } },
      { $group: { _id: '$album' } },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Build set of album names we already have from user_albums
    const existingAlbumNames = new Set(userAlbums.map(a => a.name));

    // Convert user_albums to result format
    const result: UserAlbum[] = userAlbums.map(album => ({
      ...toClientDoc(album),
      song_count: countMap.get(album.name) || 0,
    })) as UserAlbum[];

    // Add any albums from songs that aren't in user_albums collection
    let maxOrder = result.length > 0 ? Math.max(...result.map(a => a.display_order)) : -1;
    for (const songAlbum of uniqueAlbumsFromSongs) {
      if (!existingAlbumNames.has(songAlbum._id)) {
        maxOrder++;
        result.push({
          _id: songAlbum._id, // Use album name as ID for these
          name: songAlbum._id,
          cover_art: null,
          display_order: maxOrder,
          song_count: countMap.get(songAlbum._id) || 0,
          user_id: userId,
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching user albums:', error);
    return [];
  }
}

export async function createUserAlbum(userId: string, name: string, coverArt?: string): Promise<UserAlbum | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Check if album already exists
    const existing = await db.collection('user_albums').findOne({
      user_id: userId,
      name: name
    });

    if (existing) {
      return null; // Album already exists
    }

    // Get max display order
    const maxOrderDoc = await db.collection('user_albums')
      .find({ user_id: userId })
      .sort({ display_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = maxOrderDoc.length > 0 ? (maxOrderDoc[0].display_order || 0) : 0;

    const doc = {
      user_id: userId,
      name,
      cover_art: coverArt || null,
      display_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection('user_albums').insertOne(doc);
    return {
      _id: result.insertedId.toString(),
      name,
      cover_art: coverArt || null,
      display_order: maxOrder + 1,
      song_count: 0,
      user_id: userId,
    };
  } catch (error) {
    console.error('Error creating user album:', error);
    return null;
  }
}

export async function updateUserAlbum(userId: string, albumName: string, updates: { cover_art?: string | null; name?: string }): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Build the update object - include name in $set if renaming
    const setFields: Record<string, unknown> = { updated_at: now };
    if (updates.cover_art !== undefined) setFields.cover_art = updates.cover_art;
    if (updates.name !== undefined) setFields.name = updates.name;

    // Build $setOnInsert - exclude fields that are in $set
    const setOnInsertFields: Record<string, unknown> = {
      user_id: userId,
      display_order: 0,
      created_at: now,
    };
    // Only add name to $setOnInsert if NOT renaming (to avoid conflict with $set)
    if (updates.name === undefined) {
      setOnInsertFields.name = albumName;
    }

    // Try to update in user_albums collection
    const result = await db.collection('user_albums').updateOne(
      { user_id: userId, name: albumName },
      {
        $set: setFields,
        $setOnInsert: setOnInsertFields
      },
      { upsert: true }
    );

    // If renaming the album, update all songs with that album
    if (updates.name && updates.name !== albumName) {
      await db.collection('songs').updateMany(
        { user_id: userId, album: albumName },
        { $set: { album: updates.name, updated_at: now } }
      );
    }

    return result.acknowledged;
  } catch (error) {
    console.error('Error updating user album:', error);
    return false;
  }
}

export async function deleteUserAlbum(userId: string, albumName: string): Promise<boolean> {
  try {
    const db = await getDb();

    // Delete from user_albums collection
    await db.collection('user_albums').deleteOne({
      user_id: userId,
      name: albumName
    });

    // Remove album from all songs (don't delete the songs)
    await db.collection('songs').updateMany(
      { user_id: userId, album: albumName },
      { $set: { album: null, updated_at: new Date().toISOString() } }
    );

    return true;
  } catch (error) {
    console.error('Error deleting user album:', error);
    return false;
  }
}

export async function archiveUserAlbum(userId: string, albumName: string): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.collection('user_albums').updateOne(
      { user_id: userId, name: albumName },
      { $set: { archived_at: now, updated_at: now } }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error archiving user album:', error);
    return false;
  }
}

export async function restoreUserAlbum(userId: string, albumName: string): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.collection('user_albums').updateOne(
      { user_id: userId, name: albumName },
      { $set: { archived_at: null, updated_at: now } }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error restoring user album:', error);
    return false;
  }
}

export async function getArchivedUserAlbums(userId: string): Promise<UserAlbum[]> {
  try {
    const db = await getDb();

    const userAlbums = await db.collection('user_albums')
      .find({
        user_id: userId,
        archived_at: { $ne: null, $exists: true }
      })
      .sort({ archived_at: -1 })
      .toArray();

    // Get song counts for each album
    const albumCounts = await db.collection('songs').aggregate([
      { $match: { user_id: userId, album: { $ne: null } } },
      { $group: { _id: '$album', count: { $sum: 1 } } }
    ]).toArray();

    const countMap = new Map(albumCounts.map(a => [a._id, a.count]));

    return userAlbums.map(album => ({
      ...toClientDoc(album),
      song_count: countMap.get(album.name) || 0,
    })) as UserAlbum[];
  } catch (error) {
    console.error('Error fetching archived albums:', error);
    return [];
  }
}

export async function reorderUserAlbums(userId: string, albumNames: string[]): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const bulkOps = albumNames.map((name, index) => ({
      updateOne: {
        filter: { user_id: userId, name },
        update: {
          $set: { display_order: index, updated_at: now },
          $setOnInsert: { user_id: userId, name, cover_art: null, created_at: now }
        },
        upsert: true
      }
    }));

    await db.collection('user_albums').bulkWrite(bulkOps);
    return true;
  } catch (error) {
    console.error('Error reordering user albums:', error);
    return false;
  }
}

// Similar functions for user folders
export type UserFolder = {
  _id: string;
  name: string;
  display_order: number;
  song_count: number;
  user_id: string;
};

export async function getUserFolders(userId: string): Promise<UserFolder[]> {
  try {
    const db = await getDb();

    // Get folders from user_folders collection
    const userFolders = await db.collection('user_folders')
      .find({ user_id: userId })
      .sort({ display_order: 1 })
      .toArray();

    // Get song counts for each folder
    const folderCounts = await db.collection('songs').aggregate([
      { $match: { user_id: userId, folder: { $ne: null } } },
      { $group: { _id: '$folder', count: { $sum: 1 } } }
    ]).toArray();

    const countMap = new Map(folderCounts.map(f => [f._id, f.count]));

    if (userFolders.length > 0) {
      return userFolders.map(folder => ({
        ...toClientDoc(folder),
        song_count: countMap.get(folder.name) || 0,
      })) as UserFolder[];
    }

    // Fallback: get unique folders from songs
    const uniqueFolders = await db.collection('songs').aggregate([
      { $match: { user_id: userId, folder: { $ne: null } } },
      { $group: { _id: '$folder' } },
      { $sort: { _id: 1 } }
    ]).toArray();

    return uniqueFolders.map((folder, index) => ({
      _id: folder._id,
      name: folder._id,
      display_order: index,
      song_count: countMap.get(folder._id) || 0,
      user_id: userId,
    }));
  } catch (error) {
    console.error('Error fetching user folders:', error);
    return [];
  }
}

export async function createUserFolder(userId: string, name: string): Promise<UserFolder | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Check if folder already exists
    const existing = await db.collection('user_folders').findOne({
      user_id: userId,
      name: name
    });

    if (existing) {
      return null;
    }

    // Get max display order
    const maxOrderDoc = await db.collection('user_folders')
      .find({ user_id: userId })
      .sort({ display_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = maxOrderDoc.length > 0 ? (maxOrderDoc[0].display_order || 0) : 0;

    const doc = {
      user_id: userId,
      name,
      display_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection('user_folders').insertOne(doc);
    return {
      _id: result.insertedId.toString(),
      name,
      display_order: maxOrder + 1,
      song_count: 0,
      user_id: userId,
    };
  } catch (error) {
    console.error('Error creating user folder:', error);
    return null;
  }
}

export async function reorderUserFolders(userId: string, folderNames: string[]): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const bulkOps = folderNames.map((name, index) => ({
      updateOne: {
        filter: { user_id: userId, name },
        update: {
          $set: { display_order: index, updated_at: now },
          $setOnInsert: { user_id: userId, name, created_at: now }
        },
        upsert: true
      }
    }));

    await db.collection('user_folders').bulkWrite(bulkOps);
    return true;
  } catch (error) {
    console.error('Error reordering user folders:', error);
    return false;
  }
}

export async function deleteSong(songId: string): Promise<boolean> {
  try {
    const db = await getDb();

    // Delete associated data
    await db.collection('lyric_lines').deleteMany({ song_id: songId });
    await db.collection('practice_sessions').deleteMany({ song_id: songId });

    const result = await db.collection('songs').deleteOne({ _id: new ObjectId(songId) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting song:', error);
    return false;
  }
}

// Lyric Line Functions
export async function getSongLyricLines(songId: string): Promise<LyricLine[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('lyric_lines')
      .find({ song_id: songId })
      .sort({ line_number: 1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as LyricLine[];
  } catch (error) {
    console.error('Error fetching lyric lines:', error);
    return [];
  }
}

export async function saveLyricLines(songId: string, lines: { line_number: number; text: string; timestamp_ms?: number | null }[]): Promise<LyricLine[]> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Delete existing lines
    await db.collection('lyric_lines').deleteMany({ song_id: songId });

    if (lines.length === 0) return [];

    // Insert new lines
    const docs = lines.map(line => ({
      song_id: songId,
      line_number: line.line_number,
      text: line.text,
      timestamp_ms: line.timestamp_ms || null,
      created_at: now,
      updated_at: now,
    }));

    await db.collection('lyric_lines').insertMany(docs);

    // Return the inserted lines
    const insertedDocs = await db.collection('lyric_lines')
      .find({ song_id: songId })
      .sort({ line_number: 1 })
      .toArray();

    return insertedDocs.map(doc => toClientDoc(doc)) as LyricLine[];
  } catch (error) {
    console.error('Error saving lyric lines:', error);
    return [];
  }
}

// Practice Session Functions
export async function getSongPracticeSessions(songId: string): Promise<PracticeSession[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('practice_sessions')
      .find({ song_id: songId })
      .sort({ created_at: -1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as PracticeSession[];
  } catch (error) {
    console.error('Error fetching practice sessions:', error);
    return [];
  }
}

export async function createPracticeSession(session: Omit<PracticeSession, '_id' | 'created_at'>): Promise<PracticeSession | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      ...session,
      created_at: now,
    };
    const result = await db.collection('practice_sessions').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as PracticeSession;
  } catch (error) {
    console.error('Error creating practice session:', error);
    return null;
  }
}

export async function updatePracticeSession(sessionId: string, updates: Partial<PracticeSession>): Promise<PracticeSession | null> {
  try {
    const db = await getDb();

    const result = await db.collection('practice_sessions').findOneAndUpdate(
      { _id: new ObjectId(sessionId) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) return null;
    return toClientDoc(result) as PracticeSession;
  } catch (error) {
    console.error('Error updating practice session:', error);
    return null;
  }
}

// Line Takes Functions
export async function getLineTakes(lyricLineIds: string[]): Promise<LineTake[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('line_takes')
      .find({ lyric_line_id: { $in: lyricLineIds } })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as LineTake[];
  } catch (error) {
    console.error('Error fetching line takes:', error);
    return [];
  }
}

export async function createLineTake(take: Omit<LineTake, '_id' | 'created_at'>): Promise<LineTake | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      ...take,
      created_at: now,
    };
    const result = await db.collection('line_takes').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as LineTake;
  } catch (error) {
    console.error('Error creating line take:', error);
    return null;
  }
}

// Time Spent Segments Functions
export async function getTimeSpentSegments(sessionIds: string[]): Promise<TimeSpentSegment[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('time_spent_segments')
      .find({ session_id: { $in: sessionIds } })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as TimeSpentSegment[];
  } catch (error) {
    console.error('Error fetching time spent segments:', error);
    return [];
  }
}

export async function createTimeSpentSegment(segment: Omit<TimeSpentSegment, '_id' | 'created_at'>): Promise<TimeSpentSegment | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      ...segment,
      created_at: now,
    };
    const result = await db.collection('time_spent_segments').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as TimeSpentSegment;
  } catch (error) {
    console.error('Error creating time spent segment:', error);
    return null;
  }
}

// ============================================
// SHOWS & SETLIST FUNCTIONS
// ============================================

// Show Functions
export async function getBandShows(bandId: string, month?: string): Promise<Show[]> {
  try {
    const db = await getDb();
    const filter: Record<string, unknown> = { band_id: bandId };

    // If month provided (format: "2024-12"), filter by that month
    if (month) {
      const startDate = `${month}-01`;
      const [year, monthNum] = month.split('-').map(Number);
      const nextMonth = monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, '0')}`;
      const endDate = `${nextMonth}-01`;
      filter.date = { $gte: startDate, $lt: endDate };
    }

    const docs = await db.collection('shows')
      .find(filter)
      .sort({ date: 1, time: 1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as Show[];
  } catch (error) {
    console.error('Error fetching shows:', error);
    return [];
  }
}

export async function getShow(showId: string): Promise<Show | null> {
  try {
    const db = await getDb();
    const doc = await db.collection('shows').findOne({ _id: new ObjectId(showId) });
    if (!doc) return null;
    return toClientDoc(doc) as Show;
  } catch (error) {
    console.error('Error fetching show:', error);
    return null;
  }
}

export async function createShow(show: Omit<Show, '_id' | 'created_at' | 'updated_at'>): Promise<Show | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      ...show,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection('shows').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as Show;
  } catch (error) {
    console.error('Error creating show:', error);
    return null;
  }
}

export async function updateShow(showId: string, updates: Partial<Omit<Show, '_id' | 'created_at' | 'updated_at'>>): Promise<Show | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.collection('shows').updateOne(
      { _id: new ObjectId(showId) },
      { $set: { ...updates, updated_at: now } }
    );

    const doc = await db.collection('shows').findOne({ _id: new ObjectId(showId) });
    if (!doc) return null;
    return toClientDoc(doc) as Show;
  } catch (error) {
    console.error('Error updating show:', error);
    return null;
  }
}

export async function deleteShow(showId: string): Promise<boolean> {
  try {
    const db = await getDb();
    // Delete associated setlist items first
    await db.collection('setlist_items').deleteMany({ show_id: showId });
    // Delete the show
    const result = await db.collection('shows').deleteOne({ _id: new ObjectId(showId) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting show:', error);
    return false;
  }
}

// Get upcoming shows for a user (across all their bands)
export async function getUpcomingShowsForUser(userId: string): Promise<(Show & { band_name?: string })[]> {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format

    // Get all bands the user owns
    const userBands = await db.collection('bands')
      .find({ user_id: userId })
      .toArray();

    const bandIds = userBands.map(b => b._id.toString());
    const bandNameMap = new Map(userBands.map(b => [b._id.toString(), b.name]));

    if (bandIds.length === 0) {
      return [];
    }

    // Get upcoming shows from those bands (date >= today)
    const shows = await db.collection('shows')
      .find({
        band_id: { $in: bandIds },
        date: { $gte: today }
      })
      .sort({ date: 1, time: 1 })
      .limit(10) // Limit to next 10 upcoming shows
      .toArray();

    return shows.map(doc => ({
      ...toClientDoc(doc),
      band_name: bandNameMap.get(doc.band_id) || 'Unknown Band',
    })) as (Show & { band_name?: string })[];
  } catch (error) {
    console.error('Error fetching upcoming shows for user:', error);
    return [];
  }
}

// Get all shows from all bands the user is a member of for a specific month
export async function getAllUserBandShows(userId: string, month?: string): Promise<(Show & { band_name?: string })[]> {
  try {
    const db = await getDb();

    // Get all bands the user owns
    const userBands = await db.collection('bands')
      .find({ user_id: userId })
      .toArray();

    const bandIds = userBands.map(b => b._id.toString());
    const bandNameMap = new Map(userBands.map(b => [b._id.toString(), b.name]));

    if (bandIds.length === 0) {
      return [];
    }

    // Build filter
    const filter: Record<string, unknown> = { band_id: { $in: bandIds } };

    // If month provided (format: "2024-12"), filter by that month
    if (month) {
      const startDate = `${month}-01`;
      const [year, monthNum] = month.split('-').map(Number);
      const nextMonth = monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, '0')}`;
      const endDate = `${nextMonth}-01`;
      filter.date = { $gte: startDate, $lt: endDate };
    }

    const shows = await db.collection('shows')
      .find(filter)
      .sort({ date: 1, time: 1 })
      .toArray();

    return shows.map(doc => ({
      ...toClientDoc(doc),
      band_name: bandNameMap.get(doc.band_id) || 'Unknown Band',
    })) as (Show & { band_name?: string })[];
  } catch (error) {
    console.error('Error fetching all user band shows:', error);
    return [];
  }
}

// Setlist Item Functions
export async function getSetlistItems(showId: string): Promise<SetlistItem[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('setlist_items')
      .find({ show_id: showId })
      .sort({ display_order: 1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as SetlistItem[];
  } catch (error) {
    console.error('Error fetching setlist items:', error);
    return [];
  }
}

export async function addSetlistItem(item: Omit<SetlistItem, '_id' | 'created_at' | 'updated_at' | 'display_order'>): Promise<SetlistItem | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Get max display_order for this show
    const maxOrderDoc = await db.collection('setlist_items')
      .find({ show_id: item.show_id })
      .sort({ display_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = maxOrderDoc.length > 0 ? (maxOrderDoc[0].display_order || 0) : -1;

    const doc = {
      ...item,
      display_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection('setlist_items').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as SetlistItem;
  } catch (error) {
    console.error('Error adding setlist item:', error);
    return null;
  }
}

export async function updateSetlistItem(itemId: string, updates: Partial<Pick<SetlistItem, 'custom_text' | 'custom_title'>>): Promise<SetlistItem | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.collection('setlist_items').updateOne(
      { _id: new ObjectId(itemId) },
      { $set: { ...updates, updated_at: now } }
    );

    const doc = await db.collection('setlist_items').findOne({ _id: new ObjectId(itemId) });
    if (!doc) return null;
    return toClientDoc(doc) as SetlistItem;
  } catch (error) {
    console.error('Error updating setlist item:', error);
    return null;
  }
}

export async function deleteSetlistItem(itemId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.collection('setlist_items').deleteOne({ _id: new ObjectId(itemId) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting setlist item:', error);
    return false;
  }
}

export async function reorderSetlistItems(showId: string, itemIds: string[]): Promise<boolean> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const bulkOps = itemIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id), show_id: showId },
        update: { $set: { display_order: index, updated_at: now } }
      }
    }));

    await db.collection('setlist_items').bulkWrite(bulkOps);
    return true;
  } catch (error) {
    console.error('Error reordering setlist items:', error);
    return false;
  }
}

// Artifact Template Functions
export async function getArtifactTemplates(bandId: string): Promise<ArtifactTemplate[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('artifact_templates')
      .find({ band_id: bandId })
      .sort({ name: 1 })
      .toArray();
    return docs.map(doc => toClientDoc(doc)) as ArtifactTemplate[];
  } catch (error) {
    console.error('Error fetching artifact templates:', error);
    return [];
  }
}

export async function createArtifactTemplate(template: Omit<ArtifactTemplate, '_id' | 'created_at' | 'updated_at'>): Promise<ArtifactTemplate | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      ...template,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection('artifact_templates').insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as ArtifactTemplate;
  } catch (error) {
    console.error('Error creating artifact template:', error);
    return null;
  }
}

export async function updateArtifactTemplate(templateId: string, updates: Partial<Omit<ArtifactTemplate, '_id' | 'created_at' | 'updated_at'>>): Promise<ArtifactTemplate | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.collection('artifact_templates').updateOne(
      { _id: new ObjectId(templateId) },
      { $set: { ...updates, updated_at: now } }
    );

    const doc = await db.collection('artifact_templates').findOne({ _id: new ObjectId(templateId) });
    if (!doc) return null;
    return toClientDoc(doc) as ArtifactTemplate;
  } catch (error) {
    console.error('Error updating artifact template:', error);
    return null;
  }
}

export async function deleteArtifactTemplate(templateId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.collection('artifact_templates').deleteOne({ _id: new ObjectId(templateId) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting artifact template:', error);
    return false;
  }
}

// Create default artifact templates for a band
export async function createDefaultArtifactTemplates(bandId: string): Promise<void> {
  const defaults = [
    { name: 'Intro', default_text: 'Welcome everyone! Tonight we have a great show planned...', color: '#10b981' },
    { name: 'Song Intro', default_text: 'This next song is...', color: '#3b82f6' },
    { name: 'Break', default_text: 'We\'re going to take a short break. We\'ll be back in a few minutes!', color: '#f59e0b' },
    { name: 'Outro', default_text: 'Thank you all for coming out tonight! We\'ve been [Band Name], goodnight!', color: '#8b5cf6' },
  ];

  for (const template of defaults) {
    await createArtifactTemplate({ band_id: bandId, ...template });
  }
}
