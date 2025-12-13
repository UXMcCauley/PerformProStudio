// Text-to-Speech utility for reading character lines in scripts
// Uses the Web Speech API for client-side TTS

export type VoiceType = 'default-male' | 'default-female' | 'deep-male' | 'high-female' | 'neutral';

// Get available browser voices
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

// Find a suitable voice based on voice type preference
export function findVoice(voiceType: VoiceType): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (voices.length === 0) return null;

  // Try to find a voice that matches the preference
  const voicePrefs: Record<VoiceType, { gender?: string; keywords: string[] }> = {
    'default-male': { gender: 'male', keywords: ['male', 'daniel', 'james', 'david', 'alex'] },
    'default-female': { gender: 'female', keywords: ['female', 'samantha', 'victoria', 'karen', 'moira'] },
    'deep-male': { gender: 'male', keywords: ['deep', 'male', 'bass'] },
    'high-female': { gender: 'female', keywords: ['female', 'soprano'] },
    'neutral': { keywords: ['neutral', 'default'] },
  };

  const pref = voicePrefs[voiceType];

  // Try to find matching voice by keywords
  for (const keyword of pref.keywords) {
    const found = voices.find(v => v.name.toLowerCase().includes(keyword));
    if (found) return found;
  }

  // Fall back to first English voice or any voice
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  return englishVoice || voices[0] || null;
}

// Speak text with optional voice preference
export function speak(
  text: string,
  options: {
    voiceType?: VoiceType;
    rate?: number;      // 0.1 to 10, default 1
    pitch?: number;     // 0 to 2, default 1
    volume?: number;    // 0 to 1, default 1
    onEnd?: () => void;
    onError?: (error: Error) => void;
  } = {}
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis not supported');
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(text);

  // Set voice
  const voice = findVoice(options.voiceType || 'default-male');
  if (voice) {
    utterance.voice = voice;
  }

  // Set speech parameters
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;

  // Set callbacks
  if (options.onEnd) {
    utterance.onend = options.onEnd;
  }
  if (options.onError) {
    utterance.onerror = (e) => options.onError?.(new Error(e.error));
  }

  // Speak
  window.speechSynthesis.speak(utterance);

  return utterance;
}

// Stop all speech
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Pause speech
export function pauseSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.pause();
  }
}

// Resume speech
export function resumeSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
}

// Check if currently speaking
export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }
  return window.speechSynthesis.speaking;
}

// Script practice mode - reads other characters' lines with pauses for user's lines
export interface ScriptLine {
  text: string;
  characterId: string | null;
  isUserCharacter: boolean;
  lineType: string;
}

export class ScriptPracticePlayer {
  private lines: ScriptLine[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private characterVoices: Map<string, VoiceType> = new Map();
  private onLineChange?: (index: number) => void;
  private onPlayStateChange?: (playing: boolean) => void;
  private pauseBetweenLines = 500; // ms
  private userLinePause = 3000; // ms to wait for user to say their line

  constructor(options: {
    onLineChange?: (index: number) => void;
    onPlayStateChange?: (playing: boolean) => void;
    pauseBetweenLines?: number;
    userLinePause?: number;
  } = {}) {
    this.onLineChange = options.onLineChange;
    this.onPlayStateChange = options.onPlayStateChange;
    if (options.pauseBetweenLines) this.pauseBetweenLines = options.pauseBetweenLines;
    if (options.userLinePause) this.userLinePause = options.userLinePause;
  }

  setLines(lines: ScriptLine[]) {
    this.lines = lines;
    this.currentIndex = 0;
  }

  setCharacterVoice(characterId: string, voiceType: VoiceType) {
    this.characterVoices.set(characterId, voiceType);
  }

  async play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.onPlayStateChange?.(true);

    while (this.isPlaying && this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex];
      this.onLineChange?.(this.currentIndex);

      if (line.isUserCharacter) {
        // User's line - wait for them to say it
        await this.delay(this.userLinePause);
      } else if (line.lineType === 'stage_direction') {
        // Stage direction - brief pause, don't read aloud
        await this.delay(1000);
      } else if (line.text.trim()) {
        // Other character's line - speak it
        const voiceType = line.characterId
          ? this.characterVoices.get(line.characterId) || 'default-male'
          : 'default-male';

        await this.speakAndWait(line.text, voiceType);
        await this.delay(this.pauseBetweenLines);
      }

      this.currentIndex++;
    }

    this.isPlaying = false;
    this.onPlayStateChange?.(false);
  }

  pause() {
    this.isPlaying = false;
    stopSpeaking();
    this.onPlayStateChange?.(false);
  }

  stop() {
    this.isPlaying = false;
    this.currentIndex = 0;
    stopSpeaking();
    this.onPlayStateChange?.(false);
    this.onLineChange?.(0);
  }

  goToLine(index: number) {
    this.currentIndex = Math.max(0, Math.min(index, this.lines.length - 1));
    this.onLineChange?.(this.currentIndex);
  }

  private speakAndWait(text: string, voiceType: VoiceType): Promise<void> {
    return new Promise((resolve) => {
      speak(text, {
        voiceType,
        onEnd: resolve,
        onError: () => resolve(),
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
