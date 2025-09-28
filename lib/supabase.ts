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