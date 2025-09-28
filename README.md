# Lyric Teleprompter

A Next.js music studio teleprompter app with AI-powered lyric formatting, Supabase storage, and SoundCloud integration.

## Features

- **Song Library**: Store and manage multiple songs with metadata
- **AI Lyric Formatting**: Intelligently format and structure lyrics using GPT-4
- **Line Breaking**: Break lyrics into individual lines for precise control
- **SoundCloud Integration**: Embed and sync with SoundCloud tracks
- **Real-time Teleprompter**: Auto-scrolling lyrics synced to audio playback
- **Manual Sync Mode**: Click lines during playback to create timestamps
- **Adjustable Display**: Customize font size and appearance

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Get your project URL and anon key from Settings > API

### 3. Set Up Anthropic

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. This is used for AI lyric formatting with Claude

### 4. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### Creating a Song

1. Click "New Song" in the Song Library
2. Enter title, artist, and SoundCloud URLs
3. Paste your lyrics in the text area
4. Click "AI Format" to automatically structure the lyrics
5. Click "Break into Lines" to split into individual lines
6. Edit lines manually as needed
7. Click "Save Song"

### Using the Teleprompter

1. Select a song from the library
2. Go to the Teleprompter tab
3. Click "Play" to start the track
4. Lyrics will auto-scroll if timestamps are set
5. Use "Sync Mode" to manually time lyrics by clicking each line as it plays

### Syncing Lyrics

1. In Teleprompter view, click "Sync Mode"
2. Play the instrumental track
3. Click on each lyric line at the moment it should appear
4. Exit Sync Mode and the timestamps will be saved

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Database and storage
- **Anthropic Claude** - AI lyric formatting
- **SoundCloud Widget API** - Audio playback

## License

MIT