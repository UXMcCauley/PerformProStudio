import Anthropic from '@anthropic-ai/sdk';
import { PerformanceLine } from '@/types/music';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ProcessedLyrics {
  lines: ProcessedLine[];
  structure: SongStructure;
  metadata: LyricsMetadata;
}

export interface ProcessedLine {
  text: string;
  section?: string;
  lineNumber: number;
  estimatedDurationMs?: number;
  isEmptyLine?: boolean;
}

export interface SongStructure {
  sections: SectionInfo[];
  estimatedBpm?: number;
  timeSignature?: string;
}

export interface SectionInfo {
  type: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'outro' | 'intro' | 'hook' | 'unknown';
  label: string;
  startLine: number;
  endLine: number;
}

export interface LyricsMetadata {
  totalLines: number;
  averageLineLength: number;
  longestLine: string;
  estimatedReadTimeMs: number;
  language: string;
  hasExistingStructure: boolean;
}

export interface LyricsProcessingOptions {
  maxLineLength?: number;
  targetLinesPerSection?: number;
  preserveExistingBreaks?: boolean;
  addSectionMarkers?: boolean;
  optimizeForTeleprompter?: boolean;
  songDurationMs?: number;
}

const DEFAULT_OPTIONS: LyricsProcessingOptions = {
  maxLineLength: 60,
  targetLinesPerSection: 8,
  preserveExistingBreaks: true,
  addSectionMarkers: true,
  optimizeForTeleprompter: true,
};

/**
 * Main function to intelligently process and split lyrics using Claude AI
 */
export async function processLyrics(
  rawLyrics: string,
  options: LyricsProcessingOptions = {}
): Promise<ProcessedLyrics> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // First, analyze the lyrics to understand their structure
  const analysis = await analyzeLyrics(rawLyrics);

  // Then, intelligently split them based on the analysis
  const splitResult = await intelligentSplit(rawLyrics, analysis, opts);

  return splitResult;
}

/**
 * Analyze lyrics to detect structure, patterns, and characteristics
 */
async function analyzeLyrics(rawLyrics: string): Promise<{
  hasStructureMarkers: boolean;
  estimatedSections: number;
  repetitionPatterns: string[];
  suggestedBpm: number;
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analyze these song lyrics and return a JSON object with the following structure:
{
  "hasStructureMarkers": boolean (true if lyrics already have [Verse], [Chorus] etc markers),
  "estimatedSections": number (estimated number of distinct sections),
  "repetitionPatterns": string[] (any repeated phrases or lines that suggest chorus),
  "suggestedBpm": number (estimated BPM based on lyric density and phrasing, typical range 60-180)
}

Lyrics to analyze:
"""
${rawLyrics}
"""

Return ONLY valid JSON, no other text.`
      }
    ]
  });

  try {
    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }
  } catch {
    // Return defaults if parsing fails
  }

  return {
    hasStructureMarkers: false,
    estimatedSections: 4,
    repetitionPatterns: [],
    suggestedBpm: 120
  };
}

/**
 * Intelligently split lyrics into optimal lines for teleprompter display
 */
async function intelligentSplit(
  rawLyrics: string,
  analysis: { hasStructureMarkers: boolean; estimatedSections: number; repetitionPatterns: string[]; suggestedBpm: number },
  options: LyricsProcessingOptions
): Promise<ProcessedLyrics> {
  const systemPrompt = `You are an expert music lyricist and teleprompter specialist. Your job is to format song lyrics for optimal display on a karaoke/teleprompter system.

Key principles for line splitting:
1. **Breath Points**: Split at natural breathing points where a singer would pause
2. **Phrase Integrity**: Keep complete musical phrases together (don't split mid-thought)
3. **Rhythmic Units**: Honor the natural rhythm - typically 4-8 syllables per line works well
4. **Visual Balance**: Lines should be roughly similar length for easy reading
5. **Section Awareness**: Maintain verse/chorus/bridge structure

Line length guidelines:
- Target: ${options.maxLineLength} characters max per line
- Ideal: 30-50 characters for comfortable reading
- Never split contractions or compound words
- Keep rhyming pairs visible (end of consecutive lines)

Section markers to use: [Intro], [Verse 1], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Outro], [Hook]`;

  const userPrompt = `Process these lyrics into optimized teleprompter format.

Analysis context:
- Has existing structure markers: ${analysis.hasStructureMarkers}
- Estimated sections: ${analysis.estimatedSections}
- Detected repeated patterns: ${analysis.repetitionPatterns.length > 0 ? analysis.repetitionPatterns.join(', ') : 'none'}
- Suggested tempo: ~${analysis.suggestedBpm} BPM

Options:
- Add section markers: ${options.addSectionMarkers}
- Preserve existing line breaks where sensible: ${options.preserveExistingBreaks}
- Optimize for teleprompter scrolling: ${options.optimizeForTeleprompter}
${options.songDurationMs ? `- Song duration: ${Math.round(options.songDurationMs / 1000)} seconds` : ''}

Raw lyrics:
"""
${rawLyrics}
"""

Return a JSON object with this exact structure:
{
  "lines": [
    { "text": "line text", "section": "Verse 1 or Chorus etc or null", "isEmptyLine": false },
    { "text": "", "section": null, "isEmptyLine": true }
  ],
  "structure": {
    "sections": [
      { "type": "verse", "label": "Verse 1", "startLine": 0, "endLine": 4 }
    ],
    "estimatedBpm": 120
  },
  "metadata": {
    "language": "en",
    "hasExistingStructure": false
  }
}

Important:
- Include empty lines (isEmptyLine: true) between sections for visual separation
- Section markers like [Verse 1] should NOT be separate lines - just set the section field
- Return ONLY valid JSON`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: systemPrompt + '\n\n' + userPrompt }
    ]
  });

  try {
    const content = response.content[0];
    if (content.type === 'text') {
      // Extract JSON from the response (handle markdown code blocks)
      let jsonText = content.text;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const result = JSON.parse(jsonText.trim());

      // Add line numbers and calculate metadata
      const processedLines: ProcessedLine[] = result.lines.map((line: { text: string; section?: string; isEmptyLine?: boolean }, index: number) => ({
        text: line.text,
        section: line.section || undefined,
        lineNumber: index,
        isEmptyLine: line.isEmptyLine || false,
        estimatedDurationMs: estimateLineDuration(line.text, analysis.suggestedBpm)
      }));

      const nonEmptyLines = processedLines.filter(l => !l.isEmptyLine && l.text.trim());
      const avgLength = nonEmptyLines.length > 0
        ? nonEmptyLines.reduce((sum, l) => sum + l.text.length, 0) / nonEmptyLines.length
        : 0;
      const longestLine = nonEmptyLines.reduce((max, l) => l.text.length > max.length ? l.text : max, '');

      return {
        lines: processedLines,
        structure: {
          sections: result.structure?.sections || [],
          estimatedBpm: analysis.suggestedBpm,
          timeSignature: '4/4'
        },
        metadata: {
          totalLines: processedLines.length,
          averageLineLength: Math.round(avgLength),
          longestLine,
          estimatedReadTimeMs: processedLines.reduce((sum, l) => sum + (l.estimatedDurationMs || 0), 0),
          language: result.metadata?.language || 'en',
          hasExistingStructure: analysis.hasStructureMarkers
        }
      };
    }
  } catch (error) {
    console.error('Error parsing AI response:', error);
  }

  // Fallback: simple line-by-line split
  return fallbackSplit(rawLyrics);
}

/**
 * Estimate how long a line takes to sing based on syllables and tempo
 */
function estimateLineDuration(text: string, bpm: number): number {
  if (!text || text.trim() === '') return 500; // Half second for empty lines

  // Rough syllable count (vowel groups)
  const syllables = (text.match(/[aeiouy]+/gi) || []).length || 1;

  // At given BPM, assume roughly 2 syllables per beat
  const msPerBeat = 60000 / bpm;
  const beatsNeeded = syllables / 2;

  return Math.round(beatsNeeded * msPerBeat);
}

/**
 * Fallback splitting logic when AI fails
 */
function fallbackSplit(rawLyrics: string): ProcessedLyrics {
  const lines = rawLyrics.split('\n').map((text, index) => ({
    text: text.trim(),
    lineNumber: index,
    isEmptyLine: text.trim() === ''
  }));

  return {
    lines,
    structure: { sections: [] },
    metadata: {
      totalLines: lines.length,
      averageLineLength: Math.round(lines.filter(l => l.text).reduce((sum, l) => sum + l.text.length, 0) / lines.filter(l => l.text).length) || 0,
      longestLine: lines.reduce((max, l) => l.text.length > max.length ? l.text : max, ''),
      estimatedReadTimeMs: lines.length * 3000,
      language: 'en',
      hasExistingStructure: false
    }
  };
}

/**
 * Quick format - simpler processing for basic line breaks
 */
export async function quickFormatLyrics(rawLyrics: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a music lyric formatter. Format these lyrics for a teleprompter:

1. Break into natural singing phrases (one phrase per line)
2. Add section markers: [Verse 1], [Chorus], [Bridge], etc.
3. Add blank lines between sections
4. Keep lines under 60 characters
5. Preserve the original words exactly

Lyrics:
"""
${rawLyrics}
"""

Return ONLY the formatted lyrics, no explanations.`
      }
    ]
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text.trim();
  }

  return rawLyrics;
}

/**
 * Detect if text looks like unformatted lyrics that need processing
 */
export function needsProcessing(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const lines = text.split('\n').filter(l => l.trim());

  // Check various indicators that processing might help
  const indicators = {
    // Very few line breaks for the amount of text
    lowLineBreakRatio: lines.length < text.length / 100,
    // Very long lines
    hasLongLines: lines.some(l => l.length > 80),
    // No section markers
    noSectionMarkers: !text.match(/\[(verse|chorus|bridge|intro|outro|hook|pre-chorus)/i),
    // Looks like a text blob
    isTextBlob: lines.length === 1 && text.length > 200,
    // All caps or weird formatting
    unusualFormatting: text === text.toUpperCase() && text.length > 50
  };

  // If any indicators are true, suggest processing
  return Object.values(indicators).some(v => v);
}

/**
 * Split a single long line into multiple shorter lines
 */
export async function splitLongLine(line: string, maxLength: number = 50): Promise<string[]> {
  if (line.length <= maxLength) return [line];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Split this lyric line into shorter phrases (max ${maxLength} chars each) at natural breath points:

"${line}"

Return only the split lines, one per line, no numbering or bullets.`
      }
    ]
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text.trim().split('\n').map(l => l.trim()).filter(l => l);
  }

  // Fallback: split at punctuation or spaces
  const result: string[] = [];
  let current = '';
  const words = line.split(' ');

  for (const word of words) {
    if ((current + ' ' + word).length > maxLength && current) {
      result.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) result.push(current.trim());

  return result;
}

/**
 * Merge lyrics from the AI processor into the expected format for the database
 */
export function toLyricLines(processed: ProcessedLyrics): Array<{
  line_number: number;
  text: string;
  timestamp_ms: number | null;
}> {
  return processed.lines
    .filter(line => !line.isEmptyLine || line.text.trim()) // Keep non-empty lines
    .map((line, index) => ({
      line_number: index,
      text: line.section ? `[${line.section}]\n${line.text}`.trim() : line.text,
      timestamp_ms: null
    }));
}

/**
 * Convert processed lyrics back to raw text format
 */
export function toRawText(processed: ProcessedLyrics): string {
  let currentSection = '';
  const lines: string[] = [];

  for (const line of processed.lines) {
    if (line.section && line.section !== currentSection) {
      if (lines.length > 0) lines.push(''); // Add blank line before new section
      lines.push(`[${line.section}]`);
      currentSection = line.section;
    }

    if (line.isEmptyLine) {
      lines.push('');
    } else {
      lines.push(line.text);
    }
  }

  return lines.join('\n');
}

// ============================================================================
// ENHANCED PERFORMANCE-FOCUSED LYRICS PROCESSING
// ============================================================================

export interface PerformanceProcessingOptions {
  maxLineLength?: number;
  targetSyllablesPerLine?: number;
  songDurationMs?: number;
  songTitle?: string;
  artistName?: string;
  genre?: string;
  tempo?: number;
  includeBreathMarkers?: boolean;
  includeEmphasisMarkers?: boolean;
  vocalStyle?: 'pop' | 'rock' | 'hip-hop' | 'r&b' | 'country' | 'folk' | 'classical' | 'musical-theater';
}

export interface PerformanceResult {
  lines: PerformanceLine[];
  sections: PerformanceSection[];
  metadata: PerformanceMetadata;
  formattedText: string;
}

export interface PerformanceSection {
  type: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'outro' | 'intro' | 'hook' | 'ad-lib';
  label: string;
  startLine: number;
  endLine: number;
  repeatCount?: number;
  energy?: 'low' | 'medium' | 'high' | 'building' | 'peak';
}

export interface PerformanceMetadata {
  totalLines: number;
  totalSyllables: number;
  estimatedDurationMs: number;
  tempo: number;
  key?: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
  breathPointCount: number;
  longestPhrase: string;
  averageSyllablesPerLine: number;
}

const DEFAULT_PERFORMANCE_OPTIONS: PerformanceProcessingOptions = {
  maxLineLength: 55,
  targetSyllablesPerLine: 8,
  includeBreathMarkers: true,
  includeEmphasisMarkers: true,
  vocalStyle: 'pop',
};

/**
 * Enhanced lyrics processing focused on singability and performance
 * This uses more sophisticated AI analysis to create truly performable lines
 */
export async function processLyricsForPerformance(
  rawLyrics: string,
  options: PerformanceProcessingOptions = {}
): Promise<PerformanceResult> {
  const opts = { ...DEFAULT_PERFORMANCE_OPTIONS, ...options };

  const systemPrompt = `You are an expert vocal coach and music arranger who specializes in preparing lyrics for live performance. Your job is to analyze lyrics and break them into optimal singable phrases.

You understand:
- Natural breath points in singing (you can't sing forever without breathing!)
- Syllable stress patterns and how they affect rhythm
- How different genres require different phrasing approaches
- The difference between reading lyrics and performing them
- Melodic phrasing and how lyrics fit music

Key principles for PERFORMABLE lines:
1. **Breath Points**: Every line should be singable in one breath (typically 3-8 seconds)
2. **Syllable Balance**: ${opts.targetSyllablesPerLine}-12 syllables per line is ideal
3. **Phrase Completion**: Never break a phrase mid-thought or mid-word
4. **Rhythmic Grouping**: Honor the natural rhythm - group words that flow together
5. **Emphasis Patterns**: Mark words that would naturally receive emphasis
6. **Anticipation Space**: Leave room for breaths between sections

Vocal style context: ${opts.vocalStyle || 'pop'}
${opts.tempo ? `Tempo: ~${opts.tempo} BPM` : ''}
${opts.genre ? `Genre: ${opts.genre}` : ''}`;

  const userPrompt = `Process these lyrics into optimal PERFORMABLE format for a singer.

${opts.songTitle ? `Song: "${opts.songTitle}"` : ''}
${opts.artistName ? `Artist: ${opts.artistName}` : ''}

Raw lyrics:
"""
${rawLyrics}
"""

Return a JSON object with this structure:
{
  "lines": [
    {
      "text": "the actual lyric line",
      "lineNumber": 0,
      "section": "Verse 1",
      "sectionType": "verse",
      "syllableCount": 8,
      "performance": {
        "breathBefore": true,
        "emphasis": "normal",
        "dynamics": "mf",
        "vocalType": "lead"
      },
      "isEmptyLine": false
    }
  ],
  "sections": [
    {
      "type": "verse",
      "label": "Verse 1",
      "startLine": 0,
      "endLine": 4,
      "energy": "medium"
    }
  ],
  "metadata": {
    "tempo": 120,
    "language": "en",
    "difficulty": "medium",
    "key": null
  }
}

Important guidelines:
- "breathBefore": true when the singer should take a breath before this line
- "emphasis": "strong" for lines with emotional peaks or key lyrics
- "dynamics": use standard musical dynamics (pp, p, mp, mf, f, ff)
- "vocalType": "lead" for main vocals, "harmony" for backing, "spoken" for spoken word, "ad-lib" for improvised sections
- "sectionType" must be one of: verse, chorus, bridge, pre-chorus, outro, intro, hook, ad-lib
- "energy" for sections: low (intro/outro), medium (verse), high (chorus), building (pre-chorus), peak (final chorus)
- Count syllables accurately for each line
- "difficulty": based on breath control needed, range of dynamics, and phrase complexity

Return ONLY valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        { role: 'user', content: systemPrompt + '\n\n' + userPrompt }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Extract JSON from response
      let jsonText = content.text;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const result = JSON.parse(jsonText.trim());

      // Process and validate the lines
      const lines: PerformanceLine[] = result.lines.map((line: {
        text: string;
        lineNumber?: number;
        section?: string;
        sectionType?: string;
        syllableCount?: number;
        performance?: {
          breathBefore?: boolean;
          emphasis?: string;
          dynamics?: string;
          vocalType?: string;
        };
        isEmptyLine?: boolean;
      }, index: number) => ({
        text: line.text || '',
        lineNumber: line.lineNumber ?? index,
        section: line.section,
        sectionType: line.sectionType as PerformanceLine['sectionType'],
        syllableCount: line.syllableCount || countSyllables(line.text || ''),
        performance: line.performance ? {
          breathBefore: line.performance.breathBefore ?? false,
          emphasis: (line.performance.emphasis || 'normal') as 'normal' | 'strong' | 'soft',
          dynamics: line.performance.dynamics as PerformanceLine['performance'] extends { dynamics?: infer D } ? D : undefined,
          vocalType: (line.performance.vocalType || 'lead') as 'lead' | 'harmony' | 'backing' | 'spoken' | 'ad-lib',
        } : undefined,
        isEmptyLine: line.isEmptyLine ?? false,
      }));

      // Calculate timing if we have duration/tempo
      const tempo = result.metadata?.tempo || opts.tempo || 120;
      const linesWithTiming = addTimingEstimates(lines, tempo, opts.songDurationMs);

      // Calculate metadata
      const nonEmptyLines = linesWithTiming.filter(l => !l.isEmptyLine && l.text.trim());
      const totalSyllables = nonEmptyLines.reduce((sum, l) => sum + (l.syllableCount || 0), 0);
      const breathPoints = linesWithTiming.filter(l => l.performance?.breathBefore).length;

      const metadata: PerformanceMetadata = {
        totalLines: linesWithTiming.length,
        totalSyllables,
        estimatedDurationMs: linesWithTiming.reduce((sum, l) => sum + (l.timing?.durationMs || 0), 0),
        tempo,
        key: result.metadata?.key,
        language: result.metadata?.language || 'en',
        difficulty: result.metadata?.difficulty || 'medium',
        breathPointCount: breathPoints,
        longestPhrase: nonEmptyLines.reduce((max, l) => (l.text.length > max.length ? l.text : max), ''),
        averageSyllablesPerLine: nonEmptyLines.length > 0 ? Math.round(totalSyllables / nonEmptyLines.length) : 0,
      };

      // Generate formatted text with performance annotations
      const formattedText = generatePerformanceText(linesWithTiming, result.sections || [], opts);

      return {
        lines: linesWithTiming,
        sections: result.sections || [],
        metadata,
        formattedText,
      };
    }
  } catch (error) {
    console.error('Error in performance lyrics processing:', error);
  }

  // Fallback to basic processing
  return fallbackPerformanceProcess(rawLyrics, opts);
}

/**
 * Count syllables in text (improved algorithm)
 */
function countSyllables(text: string): number {
  if (!text || text.trim() === '') return 0;

  const word = text.toLowerCase().trim();

  // Handle common contractions
  const contractions: Record<string, number> = {
    "i'm": 1, "you're": 1, "he's": 1, "she's": 1, "it's": 1,
    "we're": 1, "they're": 1, "i've": 1, "you've": 1, "we've": 1,
    "they've": 1, "i'd": 1, "you'd": 1, "he'd": 1, "she'd": 1,
    "we'd": 1, "they'd": 1, "i'll": 1, "you'll": 1, "he'll": 1,
    "she'll": 1, "we'll": 1, "they'll": 1, "isn't": 2, "aren't": 2,
    "wasn't": 2, "weren't": 2, "haven't": 2, "hasn't": 2,
    "hadn't": 2, "won't": 1, "wouldn't": 2, "don't": 1,
    "doesn't": 2, "didn't": 2, "can't": 1, "couldn't": 2,
    "shouldn't": 2, "mightn't": 2, "mustn't": 2,
  };

  let count = 0;
  const words = word.split(/\s+/);

  for (const w of words) {
    if (contractions[w]) {
      count += contractions[w];
    } else {
      // Count vowel groups
      const vowelGroups = w.match(/[aeiouy]+/gi) || [];
      let wordSyllables = vowelGroups.length;

      // Subtract for silent e at end
      if (w.endsWith('e') && wordSyllables > 1 && !w.endsWith('le')) {
        wordSyllables--;
      }

      // Add for -le endings
      if (w.match(/[^aeiou]le$/)) {
        wordSyllables++;
      }

      count += Math.max(1, wordSyllables);
    }
  }

  return count;
}

/**
 * Add timing estimates to performance lines
 */
function addTimingEstimates(
  lines: PerformanceLine[],
  tempo: number,
  totalDurationMs?: number
): PerformanceLine[] {
  const msPerBeat = 60000 / tempo;

  // First pass: estimate duration based on syllables
  let runningTimeMs = 0;

  const linesWithTiming = lines.map(line => {
    if (line.isEmptyLine) {
      // Empty lines get a short pause
      const duration = msPerBeat * 2; // 2 beats for section breaks
      const startMs = runningTimeMs;
      runningTimeMs += duration;

      return {
        ...line,
        timing: {
          startMs,
          endMs: runningTimeMs,
          durationMs: duration,
        },
      };
    }

    const syllables = line.syllableCount || countSyllables(line.text);
    // Assume ~2 syllables per beat on average
    const beatsNeeded = Math.max(1, syllables / 2);
    // Add breath time if marked
    const breathTime = line.performance?.breathBefore ? msPerBeat : 0;
    const duration = beatsNeeded * msPerBeat;

    const startMs = runningTimeMs + breathTime;
    runningTimeMs = startMs + duration;

    return {
      ...line,
      timing: {
        startMs,
        endMs: runningTimeMs,
        durationMs: duration,
      },
    };
  });

  // If we have actual duration, scale all timings proportionally
  if (totalDurationMs && runningTimeMs > 0) {
    const scale = totalDurationMs / runningTimeMs;

    return linesWithTiming.map(line => ({
      ...line,
      timing: line.timing ? {
        startMs: Math.round(line.timing.startMs * scale),
        endMs: Math.round(line.timing.endMs * scale),
        durationMs: Math.round(line.timing.durationMs * scale),
      } : undefined,
    }));
  }

  return linesWithTiming;
}

/**
 * Generate formatted text with performance annotations
 */
function generatePerformanceText(
  lines: PerformanceLine[],
  sections: PerformanceSection[],
  options: PerformanceProcessingOptions
): string {
  const output: string[] = [];
  let currentSection = '';

  for (const line of lines) {
    // Add section header if changed
    if (line.section && line.section !== currentSection) {
      if (output.length > 0) output.push('');

      const sectionInfo = sections.find(s => s.label === line.section);
      let sectionHeader = `[${line.section}]`;

      if (sectionInfo?.energy) {
        sectionHeader += ` (${sectionInfo.energy})`;
      }

      output.push(sectionHeader);
      currentSection = line.section;
    }

    if (line.isEmptyLine) {
      output.push('');
      continue;
    }

    let lineText = line.text;

    // Add performance annotations if requested
    if (options.includeBreathMarkers && line.performance?.breathBefore) {
      lineText = '⟨breath⟩ ' + lineText;
    }

    if (options.includeEmphasisMarkers) {
      if (line.performance?.emphasis === 'strong') {
        lineText = '→ ' + lineText + ' ←';
      } else if (line.performance?.dynamics === 'ff' || line.performance?.dynamics === 'f') {
        lineText = lineText + ' 🔊';
      } else if (line.performance?.dynamics === 'pp' || line.performance?.dynamics === 'p') {
        lineText = lineText + ' 🔉';
      }
    }

    output.push(lineText);
  }

  return output.join('\n');
}

/**
 * Fallback performance processing when AI fails
 */
function fallbackPerformanceProcess(
  rawLyrics: string,
  options: PerformanceProcessingOptions
): PerformanceResult {
  const rawLines = rawLyrics.split('\n');
  const lines: PerformanceLine[] = [];
  let currentSection = '';
  let currentSectionType: PerformanceLine['sectionType'] = 'verse';

  for (let i = 0; i < rawLines.length; i++) {
    const text = rawLines[i].trim();

    // Detect section markers
    const sectionMatch = text.match(/^\[(.*?)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      currentSectionType = detectSectionType(currentSection);
      continue;
    }

    const syllables = countSyllables(text);

    lines.push({
      text,
      lineNumber: lines.length,
      section: currentSection || undefined,
      sectionType: currentSectionType,
      syllableCount: syllables,
      performance: {
        breathBefore: i === 0 || rawLines[i - 1]?.trim() === '',
        emphasis: 'normal',
        vocalType: 'lead',
      },
      isEmptyLine: text === '',
    });
  }

  const nonEmptyLines = lines.filter(l => !l.isEmptyLine && l.text);
  const totalSyllables = nonEmptyLines.reduce((sum, l) => sum + (l.syllableCount || 0), 0);

  return {
    lines,
    sections: [],
    metadata: {
      totalLines: lines.length,
      totalSyllables,
      estimatedDurationMs: nonEmptyLines.length * 3000,
      tempo: options.tempo || 120,
      language: 'en',
      difficulty: 'medium',
      breathPointCount: lines.filter(l => l.performance?.breathBefore).length,
      longestPhrase: nonEmptyLines.reduce((max, l) => (l.text.length > max.length ? l.text : max), ''),
      averageSyllablesPerLine: nonEmptyLines.length > 0 ? Math.round(totalSyllables / nonEmptyLines.length) : 0,
    },
    formattedText: rawLyrics,
  };
}

/**
 * Detect section type from label
 */
function detectSectionType(label: string): PerformanceLine['sectionType'] {
  const lower = label.toLowerCase();

  if (lower.includes('chorus') || lower.includes('hook')) return 'chorus';
  if (lower.includes('verse')) return 'verse';
  if (lower.includes('bridge')) return 'bridge';
  if (lower.includes('pre-chorus') || lower.includes('pre chorus')) return 'pre-chorus';
  if (lower.includes('intro')) return 'intro';
  if (lower.includes('outro')) return 'outro';
  if (lower.includes('ad-lib') || lower.includes('adlib')) return 'ad-lib';

  return 'verse';
}

/**
 * Analyze a track's audio features to inform lyric processing
 * Uses Spotify audio features if available
 */
export async function analyzeForPerformance(
  lyrics: string,
  audioFeatures?: {
    tempo: number;
    key: number;
    mode: number;
    timeSignature: number;
    energy: number;
    valence: number;
  }
): Promise<PerformanceProcessingOptions> {
  const options: PerformanceProcessingOptions = {};

  if (audioFeatures) {
    options.tempo = audioFeatures.tempo;

    // Adjust target syllables based on tempo
    if (audioFeatures.tempo < 80) {
      options.targetSyllablesPerLine = 12; // Slow songs can have longer phrases
    } else if (audioFeatures.tempo > 140) {
      options.targetSyllablesPerLine = 6; // Fast songs need shorter phrases
    } else {
      options.targetSyllablesPerLine = 8;
    }

    // Infer vocal style from energy and valence
    if (audioFeatures.energy > 0.8) {
      options.vocalStyle = 'rock';
    } else if (audioFeatures.valence > 0.7 && audioFeatures.energy > 0.5) {
      options.vocalStyle = 'pop';
    } else if (audioFeatures.valence < 0.3) {
      options.vocalStyle = 'r&b';
    }
  }

  return options;
}
