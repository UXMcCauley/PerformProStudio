'use client';

import { useState } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

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
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            <span>Built for Musicians</span>
          </div>

          <h1 className="hero-title">
            Your Lyrics,
            <br />
            <span className="hero-title-gradient">Perfectly Prompted</span>
          </h1>

          <p className="hero-description">
            Professional teleprompter designed for musicians, performers, and studios.
            AI-powered formatting, cloud sync, and customizable display for seamless performances.
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
              <div className="stat-label">Musicians</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">50K+</div>
              <div className="stat-label">Songs</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">100K+</div>
              <div className="stat-label">Performances</div>
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
              <span className="visual-title">teleprompter.app</span>
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

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to transform your performances?</h2>
          <p className="cta-description">
            Join thousands of musicians who trust IntelliPrompter for their live shows
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
