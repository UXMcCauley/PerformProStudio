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
export type Band = {
  _id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Album = {
  _id: string;
  band_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Folder = {
  _id: string;
  band_id: string;
  name: string;
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

export type Song = {
  _id: string;
  title: string;
  artist: string;
  album: string | null;
  folder: string | null;
  tags: string[];
  soundcloud_url: string | null;
  instrumental_url: string | null;
  completed: boolean;
  band_id: string | null;
  album_id: string | null;
  folder_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type LyricLine = {
  _id: string;
  song_id: string;
  line_number: number;
  text: string;
  timestamp_ms: number | null;
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

    const result = await db.collection('user_settings').findOneAndUpdate(
      { user_id: userId },
      {
        $set: updateFields,
        $setOnInsert: {
          user_id: userId,
          theme: settings.theme || 'dark',
          created_at: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result) return null;
    return toClientDoc(result) as UserSettings;
  } catch (error) {
    console.error('Error upserting user settings:', error);
    return null;
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

export async function createBand(userId: string, name: string): Promise<Band | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      user_id: userId,
      name,
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
    const doc = {
      band_id: bandId,
      name,
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
    const doc = {
      band_id: bandId,
      name,
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

export async function createSong(song: Omit<Song, '_id' | 'created_at' | 'updated_at'>): Promise<Song | null> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      ...song,
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
