import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

// Static defaults - these are shown if no custom content is saved
const defaults = {
  logoText: 'POGO',
  signInButtonText: 'SIGN IN',
  heroSubtitle: 'INVEST IN YOUR FUTURE',
  // Hero slides - 3 variations
  heroSlides: [
    {
      line1: 'Saving &',
      line2: 'investing are',
      line3: 'made',
      highlight: 'simple.'
    },
    {
      line1: 'Grow your',
      line2: 'wealth with',
      line3: 'smart',
      highlight: 'choices.'
    },
    {
      line1: 'Build your',
      line2: 'future with',
      line3: 'secure',
      highlight: 'savings.'
    }
  ],
  heroImage: '', // URL of uploaded hero image
  stat1Label: 'Active users',
  stat1Value: '5000+',
  stat2Label: 'Download',
  stat2Value: '100K',
  heroDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit. Mauris interdum enim ullamcorper consequat, nec sed.',
  feature1Title: 'Send Money',
  feature1Description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit.',
  feature2Title: 'Received Money',
  feature2Description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit.',
  feature3Title: 'Money Exchange',
  feature3Description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit.',
  feature4Title: 'Multiple Currency',
  feature4Description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit.',
  // How it works section
  howItWorksTitle: 'How it',
  howItWorksTitleHighlight: 'works',
  howItWorksDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Platea ornare blandit est, pellentesque orci.',
  step1Title: 'Install Pogo Partners',
  step1Description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Platea ornare blandit est, pellentesque orci.',
  step2Title: 'Create your account',
  step2Description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Platea ornare blandit est, pellentesque orci.',
  step3Title: 'Enjoy the features',
  step3Description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Platea ornare blandit est, pellentesque orci.',
  // About section
  aboutSubtitle: 'INVEST IN YOUR FUTURE',
  aboutTitleLine1: 'About',
  aboutTitleLine2: 'Pogo Partners',
  aboutDescription1: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit. Mauris interdum enim ullamcorper consequat, nec sed. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit.',
  aboutDescription2: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit. Mauris interdum enim ullamcorper consequat, nec sed.',
  aboutStat1Value: '5k',
  aboutStat1Label: 'Active Users',
  aboutStat2Value: '10k',
  aboutStat2Label: 'Downloads',
  aboutStat3Value: '12k',
  aboutStat3Label: 'Reviews',
  aboutStat4Value: '09',
  aboutStat4Label: 'Awards',
  // Built-in Tools section
  toolsTitle: 'An entire stack of tools that keep your business moving',
  tool1Title: 'Employee Management',
  tool1Description: 'A centralized employee database built for efficiency — manage profiles, track attendance, and handle payroll with zero friction.',
  tool2Title: 'Payroll & Finance',
  tool2Description: 'Track finances in real-time — automate salary calculations, manage expenses, and generate reports with recipes.',
  tool3Title: 'Dashboard',
  tool3Description: 'Stay in control with insights across your organization — from employees to finances, all in one powerful dashboard.',
  tool4Title: 'Attendance Tracking',
  tool4Description: 'Real-time attendance monitoring with clock-in/out, overtime tracking, and automated reports for payroll integration.',
  tool5Title: 'Leave Management',
  tool5Description: 'Streamlined leave requests with multi-level approvals, balance tracking, and calendar integration for team planning.',
  tool6Title: 'Reports & Analytics',
  tool6Description: 'Comprehensive reporting with customizable charts, data exports, and actionable insights for informed decision-making.',
  // Footer section
  footerDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mi augue viverra ac vitae est commodo in urna.',
  footerCopyright: 'GC Partners',
}

function Home() {
  const [content, setContent] = useState(defaults)
  const [showFixedNav, setShowFixedNav] = useState(false)
  const [plans, setPlans] = useState([])
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const [features, setFeatures] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`${API_URL}/website-content/home`)
        const data = await response.json()
        if (data.success && data.data) {
          setContent({ ...defaults, ...data.data })
        }
      } catch (error) {
        // Keep defaults on error
      }
    }
    fetchContent()
  }, [])

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const [plansRes, featuresRes] = await Promise.all([
          fetch(`${API_URL}/plans`),
          fetch(`${API_URL}/plans/features`)
        ])
        const plansData = await plansRes.json()
        const featuresData = await featuresRes.json()
        if (plansData.success) {
          setPlans(plansData.data || [])
        }
        if (featuresData.success) {
          setFeatures(featuresData.data || [])
        }
      } catch (error) {
        // Keep empty on error
      }
    }
    fetchPlans()
  }, [])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getFeatureName = (featureSlug) => {
    const feature = features.find(f => f.slug === featureSlug)
    return feature?.name || featureSlug
  }

  useEffect(() => {
    const handleScroll = () => {
      // Show fixed nav when scrolled past hero section (100vh)
      const heroHeight = window.innerHeight
      setShowFixedNav(window.scrollY > heroHeight - 100)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Hero slider auto-cycle
  useEffect(() => {
    const slides = content.heroSlides || defaults.heroSlides
    if (slides.length <= 1) return

    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
        setTimeout(() => setIsAnimating(false), 100)
      }, 500) // Wait for fade out before changing
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [content.heroSlides])

  // Get current slide content
  const getCurrentSlide = () => {
    const slides = content.heroSlides || defaults.heroSlides
    return slides[currentSlide] || slides[0]
  }

  // Character animation helper - splits text into animated characters
  const AnimatedText = ({ text, className = '', delay = 0 }) => {
    return (
      <span className={`animated-text ${className}`}>
        {text.split('').map((char, index) => (
          <span
            key={index}
            className="char"
            style={{ animationDelay: `${delay + index * 0.03}s` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
    )
  }

  return (
    <div className="landing-page">
      {/* Fixed White Navbar - shows when scrolled past hero */}
      <header className={`fixed-navbar ${showFixedNav ? 'visible' : ''}`}>
        <div className="fixed-navbar-content">
          <a href="#home" className="logo">{content.logoText}</a>
          <nav className="fixed-nav">
            <a href="#home" className="nav-link">Home</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#about" className="nav-link">About</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <Link to="/contact" className="nav-link">Contact</Link>
          </nav>
          <Link to="/login" className="fixed-signin-btn">{content.signInButtonText}</Link>
        </div>
      </header>

      {/* Hero Viewport - First 100vh section */}
      <div className="hero-viewport">
        {/* Header */}
        <header className="landing-header">
        <div className="logo">{content.logoText}</div>
        <nav className="landing-nav">
          <a href="#home" className="nav-link">Home</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <Link to="/contact" className="nav-link">Contact</Link>
        </nav>
        <Link to="/login" className="download-btn">{content.signInButtonText}</Link>
      </header>

      {/* Hero Section */}
      <section className="hero-section" id="home">
        <div className="hero-content">
          <div className="hero-left">
            <span className="hero-subtitle">{content.heroSubtitle}</span>
            <h1 className={`hero-title ${isAnimating ? 'slide-out' : 'slide-in'}`} key={currentSlide}>
              <span className="savings-text">
                <AnimatedText text={getCurrentSlide().line1} delay={0} />
              </span>
              <span className="sparkle-icon">✦</span>
              <br />
              <AnimatedText text={getCurrentSlide().line2} delay={0.3} />
              <br />
              <AnimatedText text={getCurrentSlide().line3} delay={0.6} />{' '}
              <span className="highlight">
                <AnimatedText text={getCurrentSlide().highlight} delay={0.8} />
              </span>
            </h1>
            {/* Slide indicators */}
            <div className="slide-indicators">
              {(content.heroSlides || defaults.heroSlides).map((_, index) => (
                <button
                  key={index}
                  className={`slide-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => {
                    setIsAnimating(true)
                    setTimeout(() => {
                      setCurrentSlide(index)
                      setTimeout(() => setIsAnimating(false), 100)
                    }, 300)
                  }}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <div className="scroll-indicator">
              <div className="scroll-lines">
                <div className="scroll-line-thick"></div>
                <div className="scroll-line-thin"></div>
              </div>
              <span>Scroll to<br />Explore</span>
            </div>
          </div>

          <div className="hero-center">
            {content.heroImage ? (
              <div className="hero-image-container">
                <img
                  src={`${API_URL.replace('/api', '')}${content.heroImage}`}
                  alt="Hero"
                  className="hero-image"
                />
              </div>
            ) : (
              <div className="phone-with-hand">
                <div className="hand">
                  <div className="thumb"></div>
                  <div className="palm"></div>
                  <div className="fingers">
                    <div className="finger"></div>
                    <div className="finger"></div>
                    <div className="finger"></div>
                    <div className="finger"></div>
                  </div>
                </div>

                <div className="phone-device">
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="user-greeting">
                        <div className="user-avatar-small">
                          <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" />
                        </div>
                        <div className="greeting-text">
                          <span className="welcome-text">Welcome back,</span>
                          <span className="user-name">Alax Hare</span>
                        </div>
                      </div>
                    </div>

                    <div className="cards-section">
                      <div className="cards-header">
                        <span>Cards</span>
                        <span className="add-new">Add New <span className="plus-circle">+</span></span>
                      </div>
                      <div className="cards-row">
                        <div className="card-item dark">
                          <div className="card-chip">
                            <span className="chip-dot"></span>
                            <span className="chip-dot"></span>
                          </div>
                          <div className="card-balance">
                            <span className="balance-label">Balance</span>
                            <span className="balance-amount">$26,500</span>
                          </div>
                          <div className="card-info">
                            <span>**** 2586</span>
                            <span>02/09</span>
                          </div>
                        </div>
                        <div className="card-item green">
                          <div className="card-chip">
                            <span className="chip-dot dark"></span>
                            <span className="chip-dot dark"></span>
                          </div>
                          <div className="card-balance">
                            <span className="balance-label">Balance</span>
                            <span className="balance-amount">$30,500</span>
                          </div>
                          <div className="card-info">
                            <span>**** 2886</span>
                            <span>02/</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <div className="action-btn">
                        <div className="action-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 17L17 7M17 7H7M17 7V17" />
                          </svg>
                        </div>
                        <span>Send</span>
                      </div>
                      <div className="action-btn">
                        <div className="action-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 7L7 17M7 17H17M7 17V7" />
                          </svg>
                        </div>
                        <span>Receive</span>
                      </div>
                      <div className="action-btn">
                        <div className="action-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 7h8M8 17h8M7 12h10" />
                          </svg>
                        </div>
                        <span>Swap</span>
                      </div>
                    </div>

                    <div className="send-money-section">
                      <span className="section-title">Send Money To</span>
                      <div className="contacts-row">
                        <div className="contact-avatar">
                          <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="" />
                        </div>
                        <div className="contact-avatar">
                          <img src="https://randomuser.me/api/portraits/men/45.jpg" alt="" />
                        </div>
                        <div className="contact-avatar">
                          <img src="https://randomuser.me/api/portraits/men/46.jpg" alt="" />
                        </div>
                        <div className="contact-add">+</div>
                      </div>
                    </div>

                    <div className="phone-nav">
                      <div className="nav-item active">
                        <div className="nav-dot"></div>
                        <span>Home</span>
                      </div>
                      <div className="nav-item">
                        <div className="nav-dot"></div>
                      </div>
                      <div className="nav-item">
                        <div className="nav-dot"></div>
                      </div>
                      <div className="nav-item">
                        <div className="nav-dot"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hero-right">
            <div className="stats-row">
              <div className="landing-stat">
                <span className="stat-label">{content.stat1Label}</span>
                <span className="stat-value">{content.stat1Value}</span>
              </div>
              <div className="landing-stat">
                <span className="stat-label">{content.stat2Label}</span>
                <span className="stat-value">{content.stat2Value}</span>
              </div>
            </div>
            <p className="hero-description">
              {content.heroDescription}
            </p>
            <div className="download-section">
              <span className="download-label">DOWNLOAD NOW ON :</span>
              <div className="store-buttons">
                <a href="#" className="store-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="store-text">
                    <span className="store-small">Available on</span>
                    <span className="store-name">App Store</span>
                  </div>
                </a>
                <a href="#" className="store-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div className="store-text">
                    <span className="store-small">Available on</span>
                    <span className="store-name">Play Store</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="40" height="32" stroke="rgba(82, 78, 230)" strokeWidth="2.5"/>
                <rect x="10" y="18" width="12" height="12" stroke="rgba(82, 78, 230)" strokeWidth="2.5"/>
                <path d="M28 20h12M28 28h8" stroke="rgba(82, 78, 230)" strokeWidth="2.5"/>
              </svg>
            </div>
            <h3>{content.feature1Title}</h3>
            <p>{content.feature1Description}</p>
          </div>
          <div className="feature-card highlighted">
            <div className="feature-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="40" height="32" stroke="#1a1a2e" strokeWidth="2.5"/>
                <rect x="10" y="18" width="12" height="12" stroke="#1a1a2e" strokeWidth="2.5"/>
                <path d="M28 20h12M28 28h8" stroke="#1a1a2e" strokeWidth="2.5"/>
              </svg>
            </div>
            <h3>{content.feature2Title}</h3>
            <p>{content.feature2Description}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="40" height="40" stroke="rgba(82, 78, 230)" strokeWidth="2.5"/>
                <path d="M4 16h40M16 16v28" stroke="rgba(82, 78, 230)" strokeWidth="2.5"/>
                <rect x="22" y="22" width="16" height="8" stroke="rgba(82, 78, 230)" strokeWidth="2.5"/>
              </svg>
            </div>
            <h3>{content.feature3Title}</h3>
            <p>{content.feature3Description}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="40" height="32" stroke="white" strokeWidth="2.5"/>
                <path d="M4 18h40" stroke="white" strokeWidth="2.5"/>
                <path d="M12 28h8M12 34h16" stroke="white" strokeWidth="2.5"/>
              </svg>
            </div>
            <h3>{content.feature4Title}</h3>
            <p>{content.feature4Description}</p>
          </div>
        </div>
      </section>
      </div>

      {/* Built-in Tools Section */}
      <section className="tools-section" id="features">
        <div className="tools-content">
          <h2 className="tools-title">
            {content.toolsTitle?.split('your')[0] || 'An entire stack of tools that keep'}
            <br />
            your <span className="tools-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </span> {content.toolsTitle?.split('your')[1]?.trim() || 'business moving'}
          </h2>

          <div className="tools-cards">
            {/* Card 1 - Employee Management */}
            <div className="tool-card">
              <div className="tool-card-content">
                <span className="tool-number">1</span>
                <h3>{content.tool1Title}</h3>
                <p>{content.tool1Description}</p>
              </div>
              <div className="tool-card-visual">
                <div className="visual-stat-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  </svg>
                  <span className="stat-percent">30%</span>
                  <span className="stat-compare">vs Last Month</span>
                </div>
                <div className="visual-revenue-card">
                  <div className="revenue-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span className="revenue-label">Total Employees</span>
                  <span className="revenue-amount">2,545</span>
                </div>
              </div>
            </div>

            {/* Card 2 - Payroll & Finance */}
            <div className="tool-card">
              <div className="tool-card-content">
                <span className="tool-number">2</span>
                <h3>{content.tool2Title}</h3>
                <p>{content.tool2Description}</p>
              </div>
              <div className="tool-card-visual">
                <div className="visual-list-card">
                  <div className="list-item active">
                    <span>Pending Payroll</span>
                    <span className="badge green">24</span>
                  </div>
                  <div className="list-item">
                    <span>Processed</span>
                    <span className="badge gray">12</span>
                  </div>
                  <div className="list-item">
                    <span>Approved</span>
                  </div>
                </div>
                <div className="visual-item-card">
                  <div className="item-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div className="item-info">
                    <span className="item-name">Salary Payment</span>
                    <span className="item-desc">Monthly payroll processing for all departments</span>
                  </div>
                  <span className="item-price">NGN 12.5M</span>
                </div>
              </div>
            </div>

            {/* Card 3 - Dashboard */}
            <div className="tool-card">
              <div className="tool-card-content">
                <span className="tool-number">3</span>
                <h3>{content.tool3Title}</h3>
                <p>{content.tool3Description}</p>
              </div>
              <div className="tool-card-visual">
                <div className="visual-filters">
                  <div className="filter-dropdown">
                    <span>All Branches</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  <div className="filter-dropdown">
                    <span>All Departments</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
                <div className="visual-sales-card">
                  <span className="sales-title">Total Revenue</span>
                  <p className="sales-desc">Track your daily, weekly, and monthly performance at a glance.</p>
                  <div className="export-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Export to CSV
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4 - Attendance */}
            <div className="tool-card">
              <div className="tool-card-content">
                <span className="tool-number">4</span>
                <h3>{content.tool4Title}</h3>
                <p>{content.tool4Description}</p>
              </div>
              <div className="tool-card-visual">
                <div className="visual-calendar-badge">
                  <div className="calendar-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <span className="calendar-date">Dec 7</span>
                </div>
                <div className="visual-attendance-card">
                  <div className="attendance-header">
                    <span className="attendance-title">Today's Attendance</span>
                    <span className="attendance-rate">94%</span>
                  </div>
                  <div className="attendance-bars">
                    <div className="attendance-bar present"></div>
                    <div className="attendance-bar present"></div>
                    <div className="attendance-bar present"></div>
                    <div className="attendance-bar absent"></div>
                    <div className="attendance-bar present"></div>
                  </div>
                  <div className="attendance-legend">
                    <span><span className="dot present"></span> Present: 47</span>
                    <span><span className="dot absent"></span> Absent: 3</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5 - Leave Management */}
            <div className="tool-card">
              <div className="tool-card-content">
                <span className="tool-number">5</span>
                <h3>{content.tool5Title}</h3>
                <p>{content.tool5Description}</p>
              </div>
              <div className="tool-card-visual">
                <div className="visual-leave-card">
                  <div className="leave-request">
                    <div className="leave-avatar">
                      <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Employee" />
                    </div>
                    <div className="leave-info">
                      <span className="leave-name">Sarah Johnson</span>
                      <span className="leave-type">Annual Leave</span>
                    </div>
                    <span className="leave-days">3 days</span>
                  </div>
                </div>
                <div className="visual-approve-badge">
                  <div className="approve-actions">
                    <span className="approve-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className="reject-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 6 - Reports & Analytics */}
            <div className="tool-card">
              <div className="tool-card-content">
                <span className="tool-number">6</span>
                <h3>{content.tool6Title}</h3>
                <p>{content.tool6Description}</p>
              </div>
              <div className="tool-card-visual">
                <div className="visual-chart-card">
                  <div className="chart-header">
                    <span className="chart-title">Revenue Trend</span>
                    <span className="chart-period">Last 6 months</span>
                  </div>
                  <div className="mini-chart">
                    <div className="chart-line">
                      <svg viewBox="0 0 200 60" preserveAspectRatio="none">
                        <path d="M0,50 Q30,45 50,35 T100,25 T150,30 T200,10" fill="none" stroke="#10b981" strokeWidth="2"/>
                        <path d="M0,50 Q30,45 50,35 T100,25 T150,30 T200,10 L200,60 L0,60 Z" fill="url(#chartGradient)" opacity="0.2"/>
                        <defs>
                          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981"/>
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="visual-metric-badge">
                  <span className="metric-arrow">↑</span>
                  <span className="metric-value">24.5%</span>
                  <span className="metric-label">vs last period</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section" id="about">
        <div className="about-content">
          <div className="about-top">
            <div className="about-intro-left">
              <span className="about-subtitle">{content.aboutSubtitle}</span>
              <h2 className="about-title">
                {content.aboutTitleLine1}
                <br />
                <span className="title-bold">{content.aboutTitleLine2}</span>
              </h2>
            </div>
            <div className="about-intro-right">
              <p>{content.aboutDescription1}</p>
              <p>{content.aboutDescription2}</p>
            </div>
          </div>

          <div className="about-divider"></div>

          <div className="about-bottom">
            <div className="about-stats-left">
              <div className="sparkle sparkle-1">✦</div>
              <div className="sparkle sparkle-2">✦</div>
              <div className="sparkle sparkle-3">+</div>
              <div className="sparkle sparkle-4">+</div>

              <div className="about-stat-circle about-stat-primary">
                <span className="about-stat-value">{content.aboutStat1Value}</span>
                <span className="about-stat-label">{content.aboutStat1Label}</span>
              </div>
              <div className="about-stat-circle about-stat-secondary about-stat-downloads">
                <span className="about-stat-value">{content.aboutStat2Value}</span>
                <span className="about-stat-label">{content.aboutStat2Label}</span>
              </div>
              <div className="about-stat-circle about-stat-secondary about-stat-reviews">
                <span className="about-stat-value">{content.aboutStat3Value}</span>
                <span className="about-stat-label">{content.aboutStat3Label}</span>
              </div>
              <div className="about-stat-circle about-stat-secondary about-stat-awards">
                <span className="about-stat-value">{content.aboutStat4Value}</span>
                <span className="about-stat-label">{content.aboutStat4Label}</span>
              </div>
            </div>

            <div className="about-phones-right">
              <div className="about-phone-blob"></div>
              <div className="about-phone about-phone-back">
                <div className="about-phone-screen">
                  <div className="about-phone-header">
                    <span>←</span>
                    <span>Overview</span>
                  </div>
                  <div className="about-phone-balance">
                    <span className="balance-label">Your Balance</span>
                    <span className="balance-amount">$26,500.96</span>
                  </div>
                  <div className="about-phone-chart">
                    <div className="chart-bars">
                      <div className="chart-bar" style={{ height: '15%' }}></div>
                      <div className="chart-bar" style={{ height: '45%' }}></div>
                      <div className="chart-bar" style={{ height: '25%' }}></div>
                      <div className="chart-bar highlighted" style={{ height: '100%' }}></div>
                      <div className="chart-bar" style={{ height: '90%' }}></div>
                    </div>
                  </div>
                  <div className="about-phone-history">
                    <span className="history-title">History</span>
                    <div className="history-item">
                      <div className="history-icon energy"></div>
                      <span>Energy</span>
                      <span className="history-amount">$25,9...</span>
                    </div>
                    <div className="history-item">
                      <div className="history-icon fashion"></div>
                      <span>Fashion</span>
                      <span className="history-amount">$30,9...</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="about-phone about-phone-front">
                <div className="about-phone-screen">
                  <div className="about-phone-user">
                    <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" />
                    <span>Alax Hare</span>
                  </div>
                  <div className="about-mini-cards">
                    <div className="about-mini-card dark">
                      <span className="card-balance">$26,500</span>
                    </div>
                    <div className="about-mini-card green">
                      <span className="card-balance">$30,500</span>
                    </div>
                  </div>
                  <div className="about-phone-actions">
                    <div className="action-item"><span>↗</span><span>Send</span></div>
                    <div className="action-item"><span>↙</span><span>Receive</span></div>
                    <div className="action-item"><span>⇄</span><span>Swap</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section" id="pricing">
        <div className="pricing-content">
          <div className="pricing-header">
            <span className="pricing-subtitle">PRICING</span>
            <h2 className="pricing-title">
              Choose the <span className="highlight">perfect plan</span>
            </h2>
            <p className="pricing-description">
              Select a plan that fits your business needs. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="billing-toggle">
              <span className={billingPeriod === 'monthly' ? 'active' : ''}>Monthly</span>
              <button
                className={`toggle-switch ${billingPeriod === 'yearly' ? 'yearly' : ''}`}
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              >
                <span className="toggle-slider"></span>
              </button>
              <span className={billingPeriod === 'yearly' ? 'active' : ''}>
                Yearly <span className="save-badge">Save 17%</span>
              </span>
            </div>
          </div>

          {/* Plan Cards Row */}
          <div className="plan-cards-row">
            {plans.map((plan) => (
              <div key={plan._id} className={`plan-card ${plan.isPopular ? 'popular' : ''}`}>
                {plan.isPopular && <div className="popular-tag">Popular</div>}
                <h3 className="plan-card-name">{plan.name}</h3>
                <div className="plan-card-price">
                  {plan.isEnterprise ? (
                    <span className="price-custom">Custom</span>
                  ) : (
                    <>
                      <span className="price-amount">
                        {formatPrice(billingPeriod === 'monthly' ? plan.price?.monthly : plan.price?.yearly)}
                      </span>
                      <span className="price-period">{billingPeriod === 'monthly' ? '/mo' : '/yr'}</span>
                    </>
                  )}
                </div>
                <div className="plan-card-employees">
                  {plan.employeeRange?.min}-{plan.employeeRange?.max === null ? '∞' : plan.employeeRange?.max} employees
                </div>
                <Link
                  to={plan.isEnterprise ? '/contact' : '/register'}
                  className={`plan-card-btn ${plan.isPopular ? 'primary' : ''}`}
                >
                  {plan.isEnterprise ? 'Contact Us' : 'Get Started'}
                </Link>
              </div>
            ))}
          </div>

          {/* Features Comparison Table */}
          <div className="features-table-wrapper">
            <table className="features-table">
              <thead>
                <tr>
                  <th className="feature-name-col">Features</th>
                  {plans.map((plan) => (
                    <th key={plan._id} className={plan.isPopular ? 'popular-col' : ''}>
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((feature) => (
                  <tr key={feature.slug}>
                    <td className="feature-name-col">{feature.name}</td>
                    {plans.map((plan) => {
                      const planFeature = plan.features?.find(f => f.featureSlug === feature.slug)
                      const isIncluded = planFeature?.included
                      return (
                        <td key={plan._id} className={plan.isPopular ? 'popular-col' : ''}>
                          {isIncluded ? (
                            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="dash-icon">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo">{content.logoText}</span>
            <p>{content.footerDescription}</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Useful Links</h4>
              <a href="#home">Home</a>
              <a href="#about">About</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link to="/contact">Contact</Link>
            </div>

            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Conditions</a>
            </div>
          </div>

          <div className="footer-downloads">
            <h4>Downloads</h4>
            <a href="#" className="store-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="store-text">
                <span className="store-subtitle">Available on</span>
                <span className="store-name">App Store</span>
              </div>
            </a>
            <a href="#" className="store-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="store-text">
                <span className="store-subtitle">Available on</span>
                <span className="store-name">Play Store</span>
              </div>
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy;{content.footerCopyright} {new Date().getFullYear()}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Home
