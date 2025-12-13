'use client';

import { useState, useRef, useCallback } from 'react';

type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'processing'
  | 'complete'
  | 'error';

interface ProcessedLyrics {
  lines: Array<{
    text: string;
    lineNumber: number;
    section?: string;
  }>;
  formattedText: string;
  metadata: {
    totalLines: number;
    tempo: number;
    difficulty: string;
  };
}

interface TimedLine {
  text: string;
  startMs: number;
  endMs: number;
}

interface TranscriptionMetadata {
  duration: number;
  confidence: number;
  language: string;
  estimatedTempo: number;
  wordCount: number;
}

interface AudioUploaderProps {
  onLyricsReady: (lyrics: string, processedLyrics?: ProcessedLyrics, audioUrl?: string, metadata?: TranscriptionMetadata, timedLines?: TimedLine[]) => void;
  onCancel?: () => void;
  songTitle?: string;
  artistName?: string;
}

export default function AudioUploader({
  onLyricsReady,
  onCancel,
  songTitle,
  artistName
}: AudioUploaderProps) {
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [formattedLyrics, setFormattedLyrics] = useState<string>('');
  const [processedLyrics, setProcessedLyrics] = useState<ProcessedLyrics | null>(null);
  const [metadata, setMetadata] = useState<TranscriptionMetadata | null>(null);
  const [timedLines, setTimedLines] = useState<TimedLine[]>([]);
  const [editedLyrics, setEditedLyrics] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/ogg',
      'audio/flac',
      'audio/m4a',
      'audio/mp4',
      'audio/x-m4a',
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Please upload an audio file (MP3, WAV, OGG, FLAC, or M4A)';
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return 'File is too large. Maximum size is 50MB';
    }

    return null;
  };

  const processFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setStage('uploading');
    setUploadProgress(0);

    try {
      // Step 1: Upload to Vercel Blob
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      setAudioUrl(uploadResult.url);
      setUploadProgress(100);

      // Step 2: Transcribe with Deepgram
      setStage('transcribing');

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: uploadResult.url,
          processWithAI: true,
          songTitle,
          artistName,
        }),
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const transcribeResult = await transcribeResponse.json();

      setRawTranscript(transcribeResult.transcript);
      setFormattedLyrics(transcribeResult.formattedLyrics);
      setMetadata(transcribeResult.metadata);
      setTimedLines(transcribeResult.timedLines || []);

      if (transcribeResult.processedLyrics) {
        setProcessedLyrics(transcribeResult.processedLyrics);
        setEditedLyrics(transcribeResult.processedLyrics.formattedText);
        setStage('complete');
      } else {
        setEditedLyrics(transcribeResult.formattedLyrics);
        setStage('complete');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStage('error');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [songTitle, artistName]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleConfirm = () => {
    const finalLyrics = isEditing ? editedLyrics : (processedLyrics?.formattedText || formattedLyrics);
    onLyricsReady(
      finalLyrics,
      processedLyrics || undefined,
      audioUrl || undefined,
      metadata || undefined,
      timedLines.length > 0 ? timedLines : undefined
    );
  };

  const handleReset = () => {
    setStage('idle');
    setSelectedFile(null);
    setAudioUrl(null);
    setRawTranscript('');
    setFormattedLyrics('');
    setProcessedLyrics(null);
    setMetadata(null);
    setTimedLines([]);
    setEditedLyrics('');
    setIsEditing(false);
    setError(null);
    setUploadProgress(0);
  };

  const getStageMessage = () => {
    switch (stage) {
      case 'uploading':
        return 'Uploading audio file...';
      case 'transcribing':
        return 'Transcribing lyrics with AI...';
      case 'processing':
        return 'Optimizing lyrics for performance...';
      case 'complete':
        return 'Lyrics extracted successfully!';
      case 'error':
        return error || 'An error occurred';
      default:
        return '';
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      {/* Idle state - Drop zone */}
      {stage === 'idle' && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
            isDragging
              ? 'border-purple-500 bg-purple-50 scale-[1.02]'
              : 'border-base-300 hover:border-purple-400 hover:bg-base-200'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-purple-100' : 'bg-base-200'}`}>
              <svg
                className={`w-12 h-12 transition-colors ${isDragging ? 'text-purple-600' : 'text-base-content/50'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25"
                />
              </svg>
            </div>

            <div>
              <p className="text-lg font-semibold text-base-content">
                {isDragging ? 'Drop your audio file here' : 'Upload your MP3'}
              </p>
              <p className="text-sm text-base-content/60 mt-1">
                Drag & drop or click to browse
              </p>
              <p className="text-xs text-base-content/40 mt-2">
                Supports MP3, WAV, OGG, FLAC, M4A (max 50MB)
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Processing states */}
      {(stage === 'uploading' || stage === 'transcribing' || stage === 'processing') && (
        <div className="border border-base-300 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            {selectedFile && (
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-base-content truncate">{selectedFile.name}</p>
                  <p className="text-sm text-base-content/60">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Progress steps */}
          <div className="space-y-3">
            {/* Upload step */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                stage === 'uploading' ? 'bg-purple-100' : 'bg-green-100'
              }`}>
                {stage === 'uploading' ? (
                  <svg className="w-4 h-4 text-purple-600 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${stage === 'uploading' ? 'text-base-content font-medium' : 'text-base-content/60'}`}>
                Uploading audio
              </span>
              {stage === 'uploading' && (
                <span className="text-sm text-purple-600 font-medium ml-auto">{uploadProgress}%</span>
              )}
            </div>

            {/* Transcribe step */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                stage === 'transcribing' ? 'bg-purple-100' :
                stage === 'processing' ? 'bg-green-100' : 'bg-base-200'
              }`}>
                {stage === 'transcribing' ? (
                  <svg className="w-4 h-4 text-purple-600 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                ) : stage === 'processing' ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-base-content/30" />
                )}
              </div>
              <span className={`text-sm ${
                stage === 'transcribing' ? 'text-base-content font-medium' :
                stage === 'processing' ? 'text-base-content/60' : 'text-base-content/40'
              }`}>
                Extracting lyrics with AI
              </span>
            </div>

            {/* AI Processing step */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                stage === 'processing' ? 'bg-purple-100' : 'bg-base-200'
              }`}>
                {stage === 'processing' ? (
                  <svg className="w-4 h-4 text-purple-600 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-base-content/30" />
                )}
              </div>
              <span className={`text-sm ${
                stage === 'processing' ? 'text-base-content font-medium' : 'text-base-content/40'
              }`}>
                Optimizing for performance
              </span>
            </div>
          </div>

          <p className="text-sm text-base-content/60 text-center mt-4">
            {getStageMessage()}
          </p>
        </div>
      )}

      {/* Error state */}
      {stage === 'error' && (
        <div className="border border-error/30 rounded-xl p-6 bg-error/5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-error/10 rounded-full">
              <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-error">Processing Failed</h4>
              <p className="text-sm text-base-content/70 mt-1">{error}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleReset} className="btn btn-outline btn-sm">
              Try Again
            </button>
            {onCancel && (
              <button onClick={onCancel} className="btn btn-ghost btn-sm">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Complete state - Show extracted lyrics */}
      {stage === 'complete' && (
        <div className="space-y-4">
          {/* Metadata summary */}
          {metadata && (
            <div className="flex flex-wrap gap-3 p-4 bg-base-200 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-base-content/70">
                  Duration: <strong>{formatDuration(metadata.duration)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-sm text-base-content/70">
                  Tempo: <strong>~{metadata.estimatedTempo} BPM</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span className="text-sm text-base-content/70">
                  Words: <strong>{metadata.wordCount}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-base-content/70">
                  Confidence: <strong>{Math.round(metadata.confidence * 100)}%</strong>
                </span>
              </div>
            </div>
          )}

          {/* Lyrics preview/edit */}
          <div className="border border-base-300 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-base-200 border-b border-base-300">
              <h4 className="font-semibold text-base-content flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Extracted Lyrics
                {processedLyrics && (
                  <span className="badge badge-sm badge-primary">AI Optimized</span>
                )}
              </h4>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-ghost btn-sm gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {isEditing ? 'Preview' : 'Edit'}
              </button>
            </div>

            {isEditing ? (
              <textarea
                value={editedLyrics}
                onChange={(e) => setEditedLyrics(e.target.value)}
                className="w-full h-64 p-4 bg-base-100 font-mono text-sm resize-none focus:outline-none"
                placeholder="Edit lyrics here..."
              />
            ) : (
              <div className="p-4 bg-base-100 h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm text-base-content">
                  {editedLyrics || formattedLyrics}
                </pre>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3">
            <button onClick={handleReset} className="btn btn-outline btn-sm gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Upload Different File
            </button>
            <button onClick={handleConfirm} className="btn btn-primary btn-sm gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Use These Lyrics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
