-- Enable Row Level Security (RLS) for all tables
-- Run this in your Supabase SQL editor

-- Enable RLS on songs table
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lyric_lines table
ALTER TABLE lyric_lines ENABLE ROW LEVEL SECURITY;

-- Enable RLS on practice_sessions table
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on line_takes table
ALTER TABLE line_takes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on time_spent_segments table
ALTER TABLE time_spent_segments ENABLE ROW LEVEL SECURITY;

-- Add user_id column to songs table (if not exists)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create policies for songs table
CREATE POLICY "Users can view their own songs" ON songs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own songs" ON songs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs" ON songs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own songs" ON songs
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for lyric_lines table (through song ownership)
CREATE POLICY "Users can view lyric_lines for their songs" ON lyric_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = lyric_lines.song_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert lyric_lines for their songs" ON lyric_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = lyric_lines.song_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update lyric_lines for their songs" ON lyric_lines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = lyric_lines.song_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete lyric_lines for their songs" ON lyric_lines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = lyric_lines.song_id 
      AND songs.user_id = auth.uid()
    )
  );

-- Create policies for practice_sessions table (through song ownership)
CREATE POLICY "Users can view practice_sessions for their songs" ON practice_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = practice_sessions.song_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert practice_sessions for their songs" ON practice_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = practice_sessions.song_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update practice_sessions for their songs" ON practice_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = practice_sessions.song_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete practice_sessions for their songs" ON practice_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = practice_sessions.song_id 
      AND songs.user_id = auth.uid()
    )
  );

-- Create policies for line_takes table (through lyric_line ownership)
CREATE POLICY "Users can view line_takes for their lyric_lines" ON line_takes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lyric_lines 
      JOIN songs ON songs.id = lyric_lines.song_id
      WHERE lyric_lines.id = line_takes.lyric_line_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert line_takes for their lyric_lines" ON line_takes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lyric_lines 
      JOIN songs ON songs.id = lyric_lines.song_id
      WHERE lyric_lines.id = line_takes.lyric_line_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update line_takes for their lyric_lines" ON line_takes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM lyric_lines 
      JOIN songs ON songs.id = lyric_lines.song_id
      WHERE lyric_lines.id = line_takes.lyric_line_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete line_takes for their lyric_lines" ON line_takes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM lyric_lines 
      JOIN songs ON songs.id = lyric_lines.song_id
      WHERE lyric_lines.id = line_takes.lyric_line_id 
      AND songs.user_id = auth.uid()
    )
  );

-- Create policies for time_spent_segments table (through session ownership)
CREATE POLICY "Users can view time_spent_segments for their sessions" ON time_spent_segments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practice_sessions 
      JOIN songs ON songs.id = practice_sessions.song_id
      WHERE practice_sessions.id = time_spent_segments.session_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert time_spent_segments for their sessions" ON time_spent_segments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM practice_sessions 
      JOIN songs ON songs.id = practice_sessions.song_id
      WHERE practice_sessions.id = time_spent_segments.session_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update time_spent_segments for their sessions" ON time_spent_segments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM practice_sessions 
      JOIN songs ON songs.id = practice_sessions.song_id
      WHERE practice_sessions.id = time_spent_segments.session_id 
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete time_spent_segments for their sessions" ON time_spent_segments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM practice_sessions 
      JOIN songs ON songs.id = practice_sessions.song_id
      WHERE practice_sessions.id = time_spent_segments.session_id 
      AND songs.user_id = auth.uid()
    )
  );
