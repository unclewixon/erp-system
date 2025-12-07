import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './About.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const defaults = {
  subtitle: 'INVEST IN YOUR FUTURE',
  titleLine1: 'About',
  titleLine2: 'Pogo Partners',
  description1: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit. Mauris interdum enim ullamcorper consequat, nec sed. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit. Mauris interdum enim ullamcorper consequat, nec sed orem ipsum dolor sit amet.',
  description2: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Dui id lobortis pretium blandit. Mauris interdum enim ullamcorper consequat, nec sed.',
  stat1Value: '5k',
  stat1Label: 'Active Users',
  stat2Value: '10k',
  stat2Label: 'Downloads',
  stat3Value: '12k',
  stat3Label: 'Reviews',
  stat4Value: '09',
  stat4Label: 'Awards',
};

function About() {
  const [content, setContent] = useState(defaults);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`${API_URL}/website-content/about`);
        const data = await response.json();
        if (data.success && data.data) {
          setContent({ ...defaults, ...data.data });
        }
      } catch (error) {
        // Keep defaults on error
      }
    };
    fetchContent();
  }, []);

  return (
    <div className="about-page">
      {/* Header */}
      <header className="about-header">
        <Link to="/" className="logo">POGO</Link>
        <nav className="about-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/about" className="nav-link active">About</Link>
          <Link to="/contact" className="nav-link">Contact</Link>
        </nav>
        <Link to="/login" className="signin-btn">SIGN IN</Link>
      </header>

      {/* Main Content */}
      <main className="about-main">
        {/* Top Section */}
        <section className="about-intro">
          <div className="about-intro-left">
            <span className="about-subtitle">{content.subtitle}</span>
            <h1 className="about-title">
              {content.titleLine1}
              <br />
              <span className="title-bold">{content.titleLine2}</span>
            </h1>
          </div>
          <div className="about-intro-right">
            <p>{content.description1}</p>
            <p>{content.description2}</p>
          </div>
        </section>

        {/* Divider */}
        <div className="about-divider"></div>

        {/* Bottom Section */}
        <section className="about-stats-section">
          <div className="stats-left">
            {/* Sparkles */}
            <div className="sparkle sparkle-1">✦</div>
            <div className="sparkle sparkle-2">✦</div>
            <div className="sparkle sparkle-3">+</div>
            <div className="sparkle sparkle-4">+</div>

            {/* Stats Circles */}
            <div className="stat-circle stat-primary">
              <span className="stat-value">{content.stat1Value}</span>
              <span className="stat-label">{content.stat1Label}</span>
            </div>
            <div className="stat-circle stat-secondary stat-downloads">
              <span className="stat-value">{content.stat2Value}</span>
              <span className="stat-label">{content.stat2Label}</span>
            </div>
            <div className="stat-circle stat-secondary stat-reviews">
              <span className="stat-value">{content.stat3Value}</span>
              <span className="stat-label">{content.stat3Label}</span>
            </div>
            <div className="stat-circle stat-secondary stat-awards">
              <span className="stat-value">{content.stat4Value}</span>
              <span className="stat-label">{content.stat4Label}</span>
            </div>
          </div>

          <div className="stats-right">
            <div className="phones-container">
              <div className="phone-blob"></div>
              <div className="phone phone-back">
                <div className="phone-screen">
                  <div className="phone-header-bar">
                    <span className="back-arrow">←</span>
                    <span>Overview</span>
                  </div>
                  <div className="phone-balance">
                    <span className="balance-label">Your Balance</span>
                    <span className="balance-amount">$26,500.96</span>
                  </div>
                  <div className="phone-chart">
                    <div className="chart-label">High spending</div>
                    <div className="chart-bars">
                      <div className="chart-bar" style={{ height: '15%' }}></div>
                      <div className="chart-bar" style={{ height: '45%' }}></div>
                      <div className="chart-bar" style={{ height: '25%' }}></div>
                      <div className="chart-bar highlighted" style={{ height: '100%' }}></div>
                      <div className="chart-bar" style={{ height: '90%' }}></div>
                    </div>
                    <div className="chart-labels">
                      <span>Apr</span>
                      <span>May</span>
                      <span>Jun</span>
                      <span>Aug</span>
                      <span>Sep</span>
                    </div>
                  </div>
                  <div className="phone-history">
                    <div className="history-header">
                      <span>History</span>
                      <span className="view-all">View All</span>
                    </div>
                    <div className="history-item">
                      <div className="history-icon energy"></div>
                      <div className="history-details">
                        <span className="history-name">Energy</span>
                        <span className="history-date">4 Sep 2022</span>
                      </div>
                      <span className="history-amount">$25,9...</span>
                    </div>
                    <div className="history-item">
                      <div className="history-icon fashion"></div>
                      <div className="history-details">
                        <span className="history-name">Fashion</span>
                        <span className="history-date">10 May 2022</span>
                      </div>
                      <span className="history-amount">$30,9...</span>
                    </div>
                    <div className="history-item">
                      <div className="history-icon design"></div>
                      <div className="history-details">
                        <span className="history-name">Design Kit</span>
                        <span className="history-date">15 May 2022</span>
                      </div>
                      <span className="history-amount">$60,0...</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="phone phone-front">
                <div className="phone-notch"></div>
                <div className="phone-screen">
                  <div className="phone-user-header">
                    <span className="back-arrow">←</span>
                    <span className="welcome-text">Welcome back,</span>
                    <div className="user-info">
                      <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" className="user-avatar" />
                      <span className="user-name">Alax Hare</span>
                    </div>
                  </div>
                  <div className="phone-cards-section">
                    <div className="cards-header">
                      <span>Cards</span>
                      <span className="add-new">Add New</span>
                    </div>
                    <div className="mini-cards">
                      <div className="mini-card dark">
                        <div className="card-dots"></div>
                        <div className="card-balance">
                          <span className="label">Balance</span>
                          <span className="amount">$26,500</span>
                        </div>
                        <div className="card-info">
                          <span>**** 2586</span>
                          <span>02/09</span>
                        </div>
                      </div>
                      <div className="mini-card green">
                        <div className="card-dots dark"></div>
                        <div className="card-balance">
                          <span className="label">Balance</span>
                          <span className="amount">$30,5000</span>
                        </div>
                        <div className="card-info">
                          <span>**** 2886</span>
                          <span>02/...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="phone-actions">
                    <div className="action-item">
                      <div className="action-circle">↗</div>
                      <span>Send</span>
                    </div>
                    <div className="action-item">
                      <div className="action-circle">↙</div>
                      <span>Receive</span>
                    </div>
                    <div className="action-item">
                      <div className="action-circle">⇄</div>
                      <span>Swap</span>
                    </div>
                  </div>
                  <div className="phone-send-to">
                    <span className="send-title">Send Money To</span>
                    <div className="send-avatars">
                      <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="" />
                      <img src="https://randomuser.me/api/portraits/men/45.jpg" alt="" />
                      <img src="https://randomuser.me/api/portraits/men/46.jpg" alt="" />
                      <div className="add-contact">+</div>
                    </div>
                  </div>
                  <div className="phone-bottom-nav">
                    <div className="nav-item active">
                      <div className="nav-dot"></div>
                      <span>Home</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default About;
