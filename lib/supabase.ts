import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Add Row Level Security (RLS) helper
export const getAuthenticatedSupabase = () => {
  return supabase;
};

export type Band = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Album = {
  id: string;
  band_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Folder = {
  id: string;
  band_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type TagConfig = {
  id: string;
  user_id: string;
  tag_name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Song = {
  id: string;
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
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LyricLine = {
  id: string;
  song_id: string;
  line_number: number;
  text: string;
  timestamp_ms: number | null;
  created_at: string;
  updated_at: string;
};

export type PracticeSession = {
  id: string;
  song_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  completed: boolean;
  created_at: string;
};

export type LineTake = {
  id: string;
  lyric_line_id: string;
  session_id: string | null;
  take_number: number;
  created_at: string;
};

export type TimeSpentSegment = {
  id: string;
  session_id: string;
  lyric_line_id: string | null;
  start_time_ms: number;
  end_time_ms: number;
  duration_seconds: number;
  created_at: string;
};

export type UserSettings = {
  id: string;
  user_id: string;
  theme: 'light' | 'dark';
  name?: string;
  email?: string;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
};

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }

  // Return the first result or null if no settings exist
  return data && data.length > 0 ? data[0] : null;
}

export async function upsertUserSettings(
  userId: string,
  settings: { theme?: 'light' | 'dark'; name?: string; email?: string; avatar?: string | null }
): Promise<UserSettings | null> {
  console.log('Upserting user settings:', { userId, settings });

  // Validate theme if provided
  if (settings.theme && !['light', 'dark'].includes(settings.theme)) {
    console.error('Invalid theme value:', settings.theme);
    return null;
  }

  // Check if user settings already exist
  const existingSettings = await getUserSettings(userId);

  const updateData: any = { updated_at: new Date().toISOString() };
  if (settings.theme) updateData.theme = settings.theme;
  if (settings.name) updateData.name = settings.name;
  if (settings.email) updateData.email = settings.email;
  if (settings.avatar !== undefined) updateData.avatar = settings.avatar;

  if (existingSettings) {
    // Update existing settings
    const { data, error } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error updating user settings:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } else {
    // Insert new settings
    const { data, error } = await supabase
      .from('user_settings')
      .insert({ user_id: userId, ...updateData, theme: settings.theme || 'dark' })
      .select();

    if (error) {
      console.error('Error inserting user settings:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  }
}

export async function getUserBands(userId: string): Promise<Band[]> {
  const { data, error } = await supabase
    .from('bands')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching bands:', error);
    return [];
  }

  return data || [];
}

export async function createBand(userId: string, name: string): Promise<Band | null> {
  const { data, error } = await supabase
    .from('bands')
    .insert({ user_id: userId, name })
    .select()
    .single();

  if (error) {
    console.error('Error creating band:', error);
    return null;
  }

  return data;
}

export async function getBandAlbums(bandId: string): Promise<Album[]> {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('band_id', bandId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching albums:', error);
    return [];
  }

  return data || [];
}

export async function createAlbum(bandId: string, name: string): Promise<Album | null> {
  const { data, error } = await supabase
    .from('albums')
    .insert({ band_id: bandId, name })
    .select()
    .single();

  if (error) {
    console.error('Error creating album:', error);
    return null;
  }

  return data;
}

export async function getBandFolders(bandId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('band_id', bandId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching folders:', error);
    return [];
  }

  return data || [];
}

export async function createFolder(bandId: string, name: string): Promise<Folder | null> {
  const { data, error } = await supabase
    .from('folders')
    .insert({ band_id: bandId, name })
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    return null;
  }

  return data;
}

export async function getUserTagConfigs(userId: string): Promise<TagConfig[]> {
  const { data, error } = await supabase
    .from('tags_config')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching tag configs:', error);
    return [];
  }

  return data || [];
}

export async function upsertTagConfig(userId: string, tagName: string, color: string): Promise<TagConfig | null> {
  const { data, error } = await supabase
    .from('tags_config')
    .upsert({ user_id: userId, tag_name: tagName, color }, { onConflict: 'user_id,tag_name' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting tag config:', error);
    return null;
  }

  return data;
}