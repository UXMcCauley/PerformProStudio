-- Migration: Add album, folder, and completed columns to songs table
-- Run this in your Supabase SQL Editor

-- Add album column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'album'
  ) THEN
    ALTER TABLE songs ADD COLUMN album TEXT;
  END IF;
END $$;

-- Add folder column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'folder'
  ) THEN
    ALTER TABLE songs ADD COLUMN folder TEXT;
  END IF;
END $$;

-- Add completed column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'completed'
  ) THEN
    ALTER TABLE songs ADD COLUMN completed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing rows to have completed = false if null
UPDATE songs SET completed = false WHERE completed IS NULL;