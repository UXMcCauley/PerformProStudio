-- Add missing columns to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Create bands table
CREATE TABLE IF NOT EXISTS bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create index for bands
CREATE INDEX IF NOT EXISTS idx_bands_user_id ON bands(user_id);

-- Enable Row Level Security for bands
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;

-- Create policies for bands
CREATE POLICY "Users can view their own bands" ON bands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bands" ON bands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bands" ON bands
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bands" ON bands
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for bands updated_at
CREATE TRIGGER update_bands_updated_at BEFORE UPDATE ON bands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create albums table (unique to bands)
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(band_id, name)
);

-- Create index for albums
CREATE INDEX IF NOT EXISTS idx_albums_band_id ON albums(band_id);

-- Enable Row Level Security for albums
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

-- Create policies for albums (accessible through band ownership)
CREATE POLICY "Users can view albums of their bands" ON albums
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bands WHERE bands.id = albums.band_id AND bands.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert albums for their bands" ON albums
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM bands WHERE bands.id = albums.band_id AND bands.user_id = auth.uid()
  ));

CREATE POLICY "Users can update albums of their bands" ON albums
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM bands WHERE bands.id = albums.band_id AND bands.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete albums of their bands" ON albums
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM bands WHERE bands.id = albums.band_id AND bands.user_id = auth.uid()
  ));

-- Create trigger for albums updated_at
CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create folders table (unique to bands)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(band_id, name)
);

-- Create index for folders
CREATE INDEX IF NOT EXISTS idx_folders_band_id ON folders(band_id);

-- Enable Row Level Security for folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create policies for folders (accessible through band ownership)
CREATE POLICY "Users can view folders of their bands" ON folders
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bands WHERE bands.id = folders.band_id AND bands.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert folders for their bands" ON folders
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM bands WHERE bands.id = folders.band_id AND bands.user_id = auth.uid()
  ));

CREATE POLICY "Users can update folders of their bands" ON folders
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM bands WHERE bands.id = folders.band_id AND bands.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete folders of their bands" ON folders
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM bands WHERE bands.id = folders.band_id AND bands.user_id = auth.uid()
  ));

-- Create trigger for folders updated_at
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create tags_config table for customizable tag colors
CREATE TABLE IF NOT EXISTS tags_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'purple',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tag_name)
);

-- Create index for tags_config
CREATE INDEX IF NOT EXISTS idx_tags_config_user_id ON tags_config(user_id);

-- Enable Row Level Security for tags_config
ALTER TABLE tags_config ENABLE ROW LEVEL SECURITY;

-- Create policies for tags_config
CREATE POLICY "Users can view their own tag configs" ON tags_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tag configs" ON tags_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tag configs" ON tags_config
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tag configs" ON tags_config
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for tags_config updated_at
CREATE TRIGGER update_tags_config_updated_at BEFORE UPDATE ON tags_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add new columns to songs table for band relationships
ALTER TABLE songs ADD COLUMN IF NOT EXISTS band_id UUID REFERENCES bands(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES albums(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for new song columns
CREATE INDEX IF NOT EXISTS idx_songs_band_id ON songs(band_id);
CREATE INDEX IF NOT EXISTS idx_songs_album_id ON songs(album_id);
CREATE INDEX IF NOT EXISTS idx_songs_folder_id ON songs(folder_id);
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);