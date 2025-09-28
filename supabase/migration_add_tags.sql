-- Migration: Add tags column to songs table
-- Run this in your Supabase SQL Editor

-- Add tags column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'tags'
  ) THEN
    ALTER TABLE songs ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Update existing rows to have empty tags array if null
UPDATE songs SET tags = '{}' WHERE tags IS NULL;