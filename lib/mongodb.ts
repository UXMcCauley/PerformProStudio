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
  cover_art: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

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

export type Song = {
  _id: string;
  title: string;
  artist: string;
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

    // Build the query filter
    const filter: Record<string, unknown> = { user_id: userId };
    if (!includeArchived) {
      filter.$or = [
        { archived_at: null },
        { archived_at: { $exists: false } }
      ];
    }

    // First try to get albums from the user_albums collection
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

    if (userAlbums.length > 0) {
      return userAlbums.map(album => ({
        ...toClientDoc(album),
        song_count: countMap.get(album.name) || 0,
      })) as UserAlbum[];
    }

    // Fallback: get unique albums from songs
    const uniqueAlbums = await db.collection('songs').aggregate([
      { $match: { user_id: userId, album: { $ne: null } } },
      { $group: { _id: '$album' } },
      { $sort: { _id: 1 } }
    ]).toArray();

    return uniqueAlbums.map((album, index) => ({
      _id: album._id,
      name: album._id,
      cover_art: null,
      display_order: index,
      song_count: countMap.get(album._id) || 0,
      user_id: userId,
    }));
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

    // Try to update in user_albums collection first
    const result = await db.collection('user_albums').findOneAndUpdate(
      { user_id: userId, name: albumName },
      {
        $set: { ...updates, updated_at: now },
        $setOnInsert: {
          user_id: userId,
          name: albumName,
          display_order: 0,
          created_at: now,
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    // If renaming the album, update all songs with that album
    if (updates.name && updates.name !== albumName) {
      await db.collection('songs').updateMany(
        { user_id: userId, album: albumName },
        { $set: { album: updates.name, updated_at: now } }
      );
    }

    return !!result;
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
