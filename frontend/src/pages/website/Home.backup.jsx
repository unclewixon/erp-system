import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Website.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const defaultFeatures = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'HR Management',
    description: 'Complete employee lifecycle management from recruitment to retirement.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Attendance & Leave',
    description: 'Automated attendance tracking and comprehensive leave management.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    title: 'Payroll & Finance',
    description: 'Streamlined payroll processing with expense and wallet management.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    title: 'Inventory & Assets',
    description: 'Real-time inventory tracking and complete asset lifecycle management.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'Procurement',
    description: 'End-to-end procurement with vendor management and purchase orders.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Workflow Automation',
    description: 'Customizable approval workflows and task management.',
  },
];

const defaultStats = [
  { value: '500+', label: 'Organizations' },
  { value: '50,000+', label: 'Employees Managed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

const defaultContent = {
  heroBadge: 'Enterprise Resource Planning',
  heroTitle: 'Streamline Your Business Operations with',
  heroTitleHighlight: 'EnterprisePro',
  heroDescription: 'All-in-one ERP solution to manage HR, Finance, Inventory, Procurement, and more. Built for Nigerian businesses, designed for growth.',
  heroPrimaryButton: 'Start Free Trial',
  heroSecondaryButton: 'View Pricing',
  heroNote: '14-day free trial. No credit card required.',
  featuresSectionBadge: 'Features',
  featuresSectionTitle: 'Everything You Need to Run Your Business',
  featuresSectionDescription: 'Comprehensive modules designed to handle all aspects of your enterprise operations.',
  ctaTitle: 'Ready to Transform Your Business?',
  ctaDescription: 'Join hundreds of Nigerian businesses already using EnterprisePro to streamline their operations.',
  ctaPrimaryButton: 'Get Started Free',
  ctaSecondaryButton: 'Talk to Sales',
};

const Home = () => {
  const [content, setContent] = useState(defaultContent);
  const [stats, setStats] = useState(defaultStats);
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/website-content/home`);
      if (response.data.success && response.data.data?.content) {
        const pageContent = response.data.data.content;
        setContent(prev => ({ ...prev, ...pageContent }));
        if (pageContent.stats && Array.isArray(pageContent.stats)) {
          setStats(pageContent.stats);
        }
        if (pageContent.features && Array.isArray(pageContent.features)) {
          setFeatures(pageContent.features);
        }
      }
    } catch (error) {
      console.error('Error fetching home content:', error);
    }
  };

  const displayFeatures = features.length > 0 ? features.map((f, i) => ({
    ...f,
    icon: defaultFeatures[i % defaultFeatures.length]?.icon,
  })) : defaultFeatures;

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <span className="hero-badge">{content.heroBadge}</span>
            <h1>
              {content.heroTitle}
              <span className="gradient-text"> {content.heroTitleHighlight}</span>
            </h1>
            <p>{content.heroDescription}</p>
            <div className="hero-buttons">
              <Link to="/register" className="btn-primary">
                {content.heroPrimaryButton}
              </Link>
              <Link to="/pricing" className="btn-secondary">
                {content.heroSecondaryButton}
              </Link>
            </div>
            <p className="hero-note">{content.heroNote}</p>
          </div>
          <div className="hero-image">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="preview-content">
                <div className="sidebar-mock">
                  <div className="menu-item active"></div>
                  <div className="menu-item"></div>
                  <div className="menu-item"></div>
                  <div className="menu-item"></div>
                  <div className="menu-item"></div>
                </div>
                <div className="main-mock">
                  <div className="stat-cards">
                    <div className="stat-card"></div>
                    <div className="stat-card"></div>
                    <div className="stat-card"></div>
                    <div className="stat-card"></div>
                  </div>
                  <div className="chart-mock"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="features-container">
          <div className="section-header">
            <span className="section-badge">{content.featuresSectionBadge}</span>
            <h2>{content.featuresSectionTitle}</h2>
            <p>{content.featuresSectionDescription}</p>
          </div>
          <div className="features-grid">
            {displayFeatures.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>{content.ctaTitle}</h2>
          <p>{content.ctaDescription}</p>
          <div className="cta-buttons">
            <Link to="/register" className="btn-primary">
              {content.ctaPrimaryButton}
            </Link>
            <Link to="/contact" className="btn-outline">
              {content.ctaSecondaryButton}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
