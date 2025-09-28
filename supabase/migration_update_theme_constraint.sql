-- Drop the old check constraint and add new one for light/dark themes
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_theme_check;

-- Add new check constraint for light and dark themes
ALTER TABLE user_settings ADD CONSTRAINT user_settings_theme_check CHECK (theme IN ('light', 'dark'));

-- Update any existing theme values to the new themes
UPDATE user_settings SET theme = 'dark' WHERE theme NOT IN ('light', 'dark');