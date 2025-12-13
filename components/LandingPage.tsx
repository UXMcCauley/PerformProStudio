'use client';

import { useState } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

type ContentTypeKey = 'lyrics' | 'script' | 'podcast' | 'speech';

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [activeContentType, setActiveContentType] = useState<ContentTypeKey>('lyrics');

  // Content type showcase data
  const contentTypes: Record<ContentTypeKey, {
    icon: string;
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    demoLines: { character?: string; role?: string; color?: string; text: string; type?: string }[];
  }> = {
    lyrics: {
      icon: '🎵',
      title: 'Song Lyrics',
      subtitle: 'For Musicians & Performers',
      description: 'Professional teleprompter for live performances. Import from Spotify, Apple Music, or paste lyrics directly.',
      features: ['Auto-sync with audio', 'Band collaboration', 'Album organization', 'Performance metrics'],
      demoLines: [
        { text: 'In the depths of night, I find my way', type: 'lyric' },
        { text: 'Through the shadows, into the day', type: 'lyric' },
        { text: 'Every moment, every beat', type: 'lyric' },
        { text: 'Brings me closer to complete', type: 'lyric' },
      ],
    },
    script: {
      icon: '🎭',
      title: 'Scripts & Screenplays',
      subtitle: 'For Actors & Theater',
      description: 'Practice lines with AI reading other characters. Color-coded roles for directors, actors, and crew.',
      features: ['AI voice for other parts', 'Character color-coding', 'Director cues', 'Production organization'],
      demoLines: [
        { character: 'ROMEO', role: 'Actor', color: '#a855f7', text: 'But soft, what light through yonder window breaks?', type: 'dialogue' },
        { text: '[Romeo gazes up at the balcony]', type: 'stage_direction' },
        { character: 'JULIET', role: 'Actor', color: '#ec4899', text: 'O Romeo, Romeo! Wherefore art thou Romeo?', type: 'dialogue' },
        { character: 'DIRECTOR', role: 'Director', color: '#f97316', text: 'CUE: Spotlight on balcony', type: 'cue' },
      ],
    },
    podcast: {
      icon: '🎙️',
      title: 'Podcast Notes',
      subtitle: 'For Hosts & Creators',
      description: 'Organize talking points, interview questions, and segment headers. Keep your show on track.',
      features: ['Host & guest roles', 'Season organization', 'Episode numbering', 'Segment markers'],
      demoLines: [
        { text: '=== INTRO SEGMENT ===', type: 'segment_header' },
        { character: 'HOST', role: 'Host', color: '#3b82f6', text: 'Welcome back to Tech Talk! Today we have a special guest...', type: 'talking_point' },
        { character: 'GUEST', role: 'Guest', color: '#10b981', text: 'Thanks for having me! Excited to discuss AI trends.', type: 'talking_point' },
        { text: '? Ask about their journey into tech', type: 'question' },
      ],
    },
    speech: {
      icon: '📢',
      title: 'Speeches & Presentations',
      subtitle: 'For Public Speakers',
      description: 'Nail your keynotes, TED talks, and lectures. Emphasis markers and timing cues included.',
      features: ['Timing targets', 'Emphasis markers', 'Organization grouping', 'Event/series tracking'],
      demoLines: [
        { text: '[PAUSE - Let that sink in]', type: 'pause' },
        { text: '** The future is not something that happens TO us **', type: 'emphasis' },
        { text: 'It is something we CREATE, together, every single day.', type: 'talking_point' },
        { text: '[CUE: Advance to next slide]', type: 'cue' },
      ],
    },
  };

  const features = [
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
        </svg>
      ),
      title: 'Professional Teleprompter',
      description: 'Smooth scrolling lyrics display with customizable speed and font size for live performances.'
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
      title: 'AI-Powered Formatting',
      description: 'Automatically format and structure your lyrics with intelligent AI assistance.'
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        </svg>
      ),
      title: 'Organized Library',
      description: 'Manage your entire song catalog with ease. Search, sort, and access your lyrics instantly.'
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Performance Metrics',
      description: 'Track rehearsal progress and performance statistics to perfect your delivery.'
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      ),
      title: 'Customizable Display',
      description: 'Adjust colors, fonts, and themes to match your studio setup and preferences.'
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
      title: 'Cloud Sync',
      description: 'Access your lyrics from any device with secure cloud synchronization.'
    }
  ];

  return (
    <div className="landing-page">
      {/* Logo Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <div className="logo-icon">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
            </svg>
            <div className="logo-dot"></div>
          </div>
          <div className="logo-text">
            <span className="logo-name">PerformPro</span>
            <span className="logo-studio">Studio</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            <span>Built for Performers</span>
          </div>

          <h1 className="hero-title">
            Your Content,
            <br />
            <span className="hero-title-gradient">Perfectly Prompted</span>
          </h1>

          <p className="hero-description">
            Professional teleprompter for musicians, actors, podcasters, and public speakers.
            AI-powered formatting, character roles, and voice synthesis for seamless performances.
          </p>

          <div className="hero-actions">
            <button
              onClick={onGetStarted}
              className="btn-hero-primary"
            >
              Get Started Free
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>

            <button className="btn-hero-secondary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
              </svg>
              Watch Demo
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-value">10K+</div>
              <div className="stat-label">Performers</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">50K+</div>
              <div className="stat-label">Projects</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">100K+</div>
              <div className="stat-label">Rehearsals</div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-card">
            <div className="visual-header">
              <div className="visual-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="visual-title">performpro.studio</span>
            </div>
            <div className="visual-content">
              <div className="lyric-line">
                <span className="line-number">1</span>
                <span className="line-text">In the depths of night, I find my way</span>
              </div>
              <div className="lyric-line active">
                <span className="line-number">2</span>
                <span className="line-text">Through the shadows, into the day</span>
              </div>
              <div className="lyric-line">
                <span className="line-number">3</span>
                <span className="line-text">Every moment, every beat</span>
              </div>
              <div className="lyric-line">
                <span className="line-number">4</span>
                <span className="line-text">Brings me closer to complete</span>
              </div>
            </div>
            <div className="visual-glow"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Everything you need</h2>
          <p className="section-description">
            Powerful features designed to elevate your performance
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card ${hoveredFeature === index ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredFeature(index)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-glow"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Content Types Showcase Section */}
      <section className="content-types-section">
        <div className="section-header">
          <h2 className="section-title">One Platform, Four Specialties</h2>
          <p className="section-description">
            Tailored experience for every type of performer
          </p>
        </div>

        {/* Content Type Tabs */}
        <div className="content-type-tabs">
          {(Object.keys(contentTypes) as ContentTypeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveContentType(key)}
              className={`content-type-tab ${activeContentType === key ? 'active' : ''}`}
            >
              <span className="tab-icon">{contentTypes[key].icon}</span>
              <span className="tab-label">{contentTypes[key].title}</span>
            </button>
          ))}
        </div>

        {/* Active Content Type Display */}
        <div className="content-type-showcase">
          <div className="showcase-info">
            <div className="showcase-header">
              <span className="showcase-icon">{contentTypes[activeContentType].icon}</span>
              <div>
                <h3 className="showcase-title">{contentTypes[activeContentType].title}</h3>
                <p className="showcase-subtitle">{contentTypes[activeContentType].subtitle}</p>
              </div>
            </div>
            <p className="showcase-description">{contentTypes[activeContentType].description}</p>
            <ul className="showcase-features">
              {contentTypes[activeContentType].features.map((feature, idx) => (
                <li key={idx}>
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button onClick={onGetStarted} className="btn-showcase">
              Try {contentTypes[activeContentType].title}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>

          {/* Demo Preview */}
          <div className="showcase-demo">
            <div className="demo-card">
              <div className="demo-header">
                <div className="demo-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="demo-title">{contentTypes[activeContentType].title} Preview</span>
              </div>
              <div className="demo-content">
                {contentTypes[activeContentType].demoLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`demo-line ${line.type || 'default'} ${idx === 1 ? 'active' : ''}`}
                  >
                    {line.character && (
                      <span className="line-character" style={{ color: line.color }}>
                        {line.character}
                        {line.role && <span className="character-role">{line.role}</span>}
                      </span>
                    )}
                    <span className={`line-text ${line.type || ''}`}>{line.text}</span>
                  </div>
                ))}
              </div>
              <div className="demo-glow"></div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Voice Feature Section */}
      <section className="ai-voice-section">
        <div className="ai-voice-content">
          <div className="ai-voice-badge">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
            <span>AI-Powered Practice</span>
          </div>
          <h2 className="ai-voice-title">Let AI Read Your Scene Partners</h2>
          <p className="ai-voice-description">
            For actors practicing scripts, our text-to-speech technology reads other characters&apos; lines
            so you can focus on your part. Assign different voices to directors, narrators, and fellow actors.
          </p>
          <div className="ai-voice-features">
            <div className="voice-feature">
              <div className="voice-feature-icon" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>🎭</div>
              <div>
                <h4>Character Voices</h4>
                <p>Distinct voices for each character in your script</p>
              </div>
            </div>
            <div className="voice-feature">
              <div className="voice-feature-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>🎬</div>
              <div>
                <h4>Role-Based Coloring</h4>
                <p>Directors, actors, and crew each get unique colors</p>
              </div>
            </div>
            <div className="voice-feature">
              <div className="voice-feature-icon" style={{ background: 'linear-gradient(135deg, #10b981, #84cc16)' }}>⏯️</div>
              <div>
                <h4>Practice Mode</h4>
                <p>AI reads, pauses for your lines, then continues</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to transform your performances?</h2>
          <p className="cta-description">
            Join thousands of performers who trust PerformPro Studio for their rehearsals and live shows
          </p>
          <button
            onClick={onGetStarted}
            className="btn-cta"
          >
            Start Your Free Trial
          </button>
        </div>
        <div className="cta-glow"></div>
      </section>
    </div>
  );
}
