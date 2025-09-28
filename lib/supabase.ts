import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Add Row Level Security (RLS) helper
export const getAuthenticatedSupabase = () => {
  return supabase;
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

export async function upsertUserSettings(userId: string, theme: 'light' | 'dark'): Promise<UserSettings | null> {
  // Debug logging
  console.log('Upserting user settings:', { userId, theme, themeType: typeof theme });
  
  // Ensure theme is exactly 'light' or 'dark' and is a valid string
  if (typeof theme !== 'string' || !['light', 'dark'].includes(theme)) {
    console.error('Invalid theme value:', theme);
    return null;
  }
  
  const validTheme: 'light' | 'dark' = theme;
  console.log('Validated theme:', validTheme);
  
  // Check if user settings already exist
  const existingSettings = await getUserSettings(userId);
  
  if (existingSettings) {
    // Update existing settings
    const { data, error } = await supabase
      .from('user_settings')
      .update({ theme: validTheme, updated_at: new Date().toISOString() })
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
      .insert({ user_id: userId, theme: validTheme })
      .select();
      
    if (error) {
      console.error('Error inserting user settings:', error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] : null;
  }
}