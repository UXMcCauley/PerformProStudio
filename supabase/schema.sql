-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  folder TEXT,
  tags TEXT[] DEFAULT '{}',
  soundcloud_url TEXT,
  instrumental_url TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lyric_lines table
CREATE TABLE IF NOT EXISTS lyric_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  timestamp_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(song_id, line_number)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lyric_lines_song_id ON lyric_lines(song_id);
CREATE INDEX IF NOT EXISTS idx_lyric_lines_song_line ON lyric_lines(song_id, line_number);

-- Enable Row Level Security
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyric_lines ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - adjust based on auth needs)
CREATE POLICY "Enable read access for all users" ON songs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON songs FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON songs FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON lyric_lines FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON lyric_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON lyric_lines FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON lyric_lines FOR DELETE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lyric_lines_updated_at BEFORE UPDATE ON lyric_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create practice_sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create line_takes table
CREATE TABLE IF NOT EXISTS line_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lyric_line_id UUID NOT NULL REFERENCES lyric_lines(id) ON DELETE CASCADE,
  session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  take_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time_spent_segments table
CREATE TABLE IF NOT EXISTS time_spent_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  lyric_line_id UUID REFERENCES lyric_lines(id) ON DELETE SET NULL,
  start_time_ms INTEGER NOT NULL,
  end_time_ms INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_practice_sessions_song_id ON practice_sessions(song_id);
CREATE INDEX IF NOT EXISTS idx_line_takes_lyric_line_id ON line_takes(lyric_line_id);
CREATE INDEX IF NOT EXISTS idx_line_takes_session_id ON line_takes(session_id);
CREATE INDEX IF NOT EXISTS idx_time_spent_segments_session_id ON time_spent_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_time_spent_segments_lyric_line_id ON time_spent_segments(lyric_line_id);

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