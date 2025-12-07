import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Features.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

// Feature categories with icons and descriptions
const featureCategories = [
  {
    id: 'hr',
    name: 'Human Resources',
    icon: '👥',
    color: '#524ee6',
    description: 'Complete HR management suite to streamline your workforce operations',
    features: [
      { slug: 'employee-management', name: 'Employee Management', description: 'Centralized employee database with profiles, documents, and history tracking' },
      { slug: 'leave-management', name: 'Leave Management', description: 'Automated leave requests, approvals, and balance tracking' },
      { slug: 'attendance-management', name: 'Attendance Management', description: 'Real-time attendance tracking with clock-in/out and reports' },
      { slug: 'department-management', name: 'Department Management', description: 'Organize your workforce into departments and teams' },
      { slug: 'branch-management', name: 'Branch Management', description: 'Multi-location support with branch-specific settings' },
      { slug: 'payroll', name: 'Payroll', description: 'Automated salary calculations, deductions, and payslips' },
      { slug: 'recruitment', name: 'Recruitment', description: 'Job postings, applicant tracking, and hiring workflows' },
      { slug: 'onboarding', name: 'On-boarding', description: 'Streamlined new employee onboarding process' },
      { slug: 'performance', name: 'Performance Appraisal', description: 'Goal setting, reviews, and performance tracking' },
      { slug: 'training', name: 'Training Management', description: 'Employee training programs and certifications' },
      { slug: 'benefits', name: 'Benefits Management', description: 'Health insurance, retirement plans, and perks management' },
      { slug: 'loans', name: 'Loan Management', description: 'Employee loan requests, approvals, and repayment tracking' },
      { slug: 'queries', name: 'Query Management', description: 'Employee disciplinary actions and query handling' },
    ]
  },
  {
    id: 'finance',
    name: 'Finance & Accounting',
    icon: '💰',
    color: '#10b981',
    description: 'Comprehensive financial tools to manage your business finances',
    features: [
      { slug: 'expenses', name: 'Expense Management', description: 'Track and categorize all business expenses' },
      { slug: 'reimbursement', name: 'Reimbursement', description: 'Employee expense claims and reimbursement workflows' },
      { slug: 'wallet', name: 'Wallet', description: 'Digital wallet for quick payments and transfers' },
      { slug: 'bills', name: 'Bill Payment', description: 'Pay utilities, vendors, and recurring bills' },
      { slug: 'invoicing', name: 'Invoicing', description: 'Create, send, and track professional invoices' },
      { slug: 'bookkeeping', name: 'Book Keeping', description: 'Double-entry accounting and financial records' },
      { slug: 'financial-reporting', name: 'Financial Reporting', description: 'Balance sheets, P&L statements, and custom reports' },
      { slug: 'vendors', name: 'Vendor Management', description: 'Supplier database and payment tracking' },
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory & Assets',
    icon: '📦',
    color: '#f59e0b',
    description: 'Keep track of your inventory and company assets',
    features: [
      { slug: 'inventory', name: 'Inventory', description: 'Stock management with real-time tracking' },
      { slug: 'assets', name: 'Asset Management', description: 'Track company assets, depreciation, and assignments' },
      { slug: 'purchase-expenses', name: 'Purchase Expenses', description: 'Record and categorize purchase expenses' },
    ]
  },
  {
    id: 'procurement',
    name: 'Procurement',
    icon: '🛒',
    color: '#8b5cf6',
    description: 'Streamline your purchasing and procurement processes',
    features: [
      { slug: 'procurement', name: 'Procurement', description: 'End-to-end procurement workflow management' },
      { slug: 'purchase-orders', name: 'Purchase Orders', description: 'Create, approve, and track purchase orders' },
    ]
  },
  {
    id: 'workflow',
    name: 'Workflow & Tasks',
    icon: '⚡',
    color: '#ec4899',
    description: 'Automate approvals and manage team tasks efficiently',
    features: [
      { slug: 'workflow-approval', name: 'Work Flow Approval', description: 'Multi-level approval workflows for all processes' },
      { slug: 'approval-matrix', name: 'Approval Matrix', description: 'Configure approval hierarchies and limits' },
      { slug: 'tasks', name: 'Task Management', description: 'Assign, track, and manage team tasks' },
    ]
  },
  {
    id: 'communication',
    name: 'Communication',
    icon: '💬',
    color: '#06b6d4',
    description: 'Keep your team connected and informed',
    features: [
      { slug: 'events', name: 'Events', description: 'Company events calendar and management' },
      { slug: 'messaging', name: 'Messaging', description: 'Internal team messaging and collaboration' },
      { slug: 'sms-marketing', name: 'SMS Marketing', description: 'Bulk SMS campaigns and customer communication' },
      { slug: 'announcements', name: 'Announcements', description: 'Company-wide announcements and notices' },
    ]
  },
]

const Features = () => {
  const [showNavbar, setShowNavbar] = useState(false)
  const [activeCategory, setActiveCategory] = useState('hr')

  useEffect(() => {
    const handleScroll = () => {
      setShowNavbar(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId)
    const element = document.getElementById(categoryId)
    if (element) {
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="features-page">
      {/* Fixed Navbar */}
      <nav className={`fixed-navbar ${showNavbar ? 'visible' : ''}`}>
        <div className="fixed-navbar-content">
          <Link to="/" className="logo">POGO</Link>
          <div className="fixed-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/features" className="nav-link active">Features</Link>
            <a href="/#pricing" className="nav-link">Pricing</a>
            <a href="/#about" className="nav-link">About</a>
          </div>
          <Link to="/login" className="fixed-signin-btn">SIGN IN</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="features-hero">
        <header className="features-header">
          <Link to="/" className="logo">POGO</Link>
          <nav className="features-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/features" className="nav-link active">Features</Link>
            <a href="/#pricing" className="nav-link">Pricing</a>
            <a href="/#about" className="nav-link">About</a>
          </nav>
          <Link to="/login" className="signin-btn">SIGN IN</Link>
        </header>

        <div className="features-hero-content">
          <span className="features-hero-subtitle">POWERFUL FEATURES</span>
          <h1 className="features-hero-title">
            Everything you need to<br />
            <span className="highlight">run your business</span>
          </h1>
          <p className="features-hero-description">
            A complete suite of tools designed to streamline your operations,
            boost productivity, and drive growth.
          </p>
          <div className="features-hero-actions">
            <Link to="/register" className="btn-primary">Get Started Free</Link>
            <a href="#hr" className="btn-secondary">Explore Features</a>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <div className="category-nav-wrapper">
        <div className="category-nav">
          {featureCategories.map((category) => (
            <button
              key={category.id}
              className={`category-nav-item ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => scrollToCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Categories */}
      <div className="features-content">
        {featureCategories.map((category, index) => (
          <section
            key={category.id}
            id={category.id}
            className={`feature-category-section ${index % 2 === 1 ? 'alt-bg' : ''}`}
          >
            <div className="category-header">
              <div className="category-icon-large" style={{ background: category.color }}>
                {category.icon}
              </div>
              <div className="category-info">
                <h2>{category.name}</h2>
                <p>{category.description}</p>
              </div>
            </div>

            <div className="feature-cards-grid">
              {category.features.map((feature) => (
                <div key={feature.slug} className="feature-card">
                  <div className="feature-card-icon" style={{ background: `${category.color}15`, color: category.color }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3>{feature.name}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA Section */}
      <section className="features-cta">
        <div className="features-cta-content">
          <h2>Ready to transform your business?</h2>
          <p>Start your 14-day free trial today. No credit card required.</p>
          <div className="features-cta-actions">
            <Link to="/register" className="btn-primary-large">Start Free Trial</Link>
            <Link to="/#pricing" className="btn-outline">View Pricing</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="features-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo">POGO</span>
            <p>Streamline your business operations with our comprehensive ERP solution.</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <Link to="/features">Features</Link>
              <a href="/#pricing">Pricing</a>
              <Link to="/register">Get Started</Link>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="/#about">About Us</a>
              <a href="/#about">Contact</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} POGO. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Features
