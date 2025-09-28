-- Fix practice_sessions table schema
-- Run this in your Supabase SQL Editor

-- Drop the table if it exists with wrong schema and recreate it
DROP TABLE IF EXISTS practice_sessions CASCADE;
DROP TABLE IF EXISTS line_takes CASCADE;
DROP TABLE IF EXISTS time_spent_segments CASCADE;

-- Create practice_sessions table with correct schema
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create line_takes table
CREATE TABLE line_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lyric_line_id UUID NOT NULL REFERENCES lyric_lines(id) ON DELETE CASCADE,
  session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  take_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time_spent_segments table
CREATE TABLE time_spent_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  lyric_line_id UUID REFERENCES lyric_lines(id) ON DELETE SET NULL,
  start_time_ms INTEGER NOT NULL,
  end_time_ms INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_practice_sessions_song_id ON practice_sessions(song_id);
CREATE INDEX idx_line_takes_lyric_line_id ON line_takes(lyric_line_id);
CREATE INDEX idx_line_takes_session_id ON line_takes(session_id);
CREATE INDEX idx_time_spent_segments_session_id ON time_spent_segments(session_id);
CREATE INDEX idx_time_spent_segments_lyric_line_id ON time_spent_segments(lyric_line_id);

-- Enable Row Level Security
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_spent_segments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON practice_sessions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON practice_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON practice_sessions FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON practice_sessions FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON line_takes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON line_takes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON line_takes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON line_takes FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON time_spent_segments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON time_spent_segments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON time_spent_segments FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON time_spent_segments FOR DELETE USING (true);
