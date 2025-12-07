import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Contact.css'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    setIsSuccess(true)
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
  }

  return (
    <div className="contact-page">
      {/* Left Side */}
      <div className="contact-left">
        <div className="contact-header">
          <Link to="/" className="contact-logo">
            <svg width="100" height="32" viewBox="0 0 100 32" fill="none">
              <text x="0" y="26" fontFamily="Montserrat" fontSize="28" fontWeight="700" fill="#1a1a2e" letterSpacing="2">POGO</text>
            </svg>
          </Link>
        </div>

        <div className="contact-left-content">
          <h1 className="contact-title">
            Let's get<br />in touch
          </h1>

          <div className="contact-info-section">
            <h2 className="contact-subtitle">
              Great! We're excited<br />to hear from you.
            </h2>

            <div className="contact-details">
              <div className="contact-item">
                <span className="contact-label">Address</span>
                <span className="contact-value">
                  123 Business District,<br />
                  Lagos, Nigeria
                </span>
                <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="map-link">
                  View on Google Maps
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                </a>
              </div>

              <div className="contact-item">
                <span className="contact-label">Phone</span>
                <span className="contact-value">+234 800 123 4567</span>
              </div>

              <div className="contact-item">
                <span className="contact-label">Email</span>
                <span className="contact-value">hello@pogo.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="contact-right">
        <nav className="contact-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/features" className="nav-link">Features</Link>
          <a href="/#pricing" className="nav-link">Pricing</a>
          <a href="/#about" className="nav-link">About</a>
          <Link to="/contact" className="nav-link active">Contact</Link>
          <Link to="/login" className="contact-login-btn">LOG IN</Link>
        </nav>

        <div className="contact-right-content">
          <div className="contact-intro">
            <div className="intro-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2">
                <path d="M7 7L17 17M17 17V7M17 17H7" />
              </svg>
            </div>
            <p className="intro-text">
              Let's collaborate to turn your ideas into reality. Fill out the form below to get started.
            </p>
          </div>

          <div className="contact-form-wrapper">
            {isSuccess ? (
              <div className="form-success">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#c2ff9d" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12l2 2 4-4" />
                </svg>
                <p>Thank you! We'll get back to you soon.</p>
              </div>
            ) : (
              <>
                <h3 className="form-title">Send us a message</h3>
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <input
                        type="text"
                        name="name"
                        placeholder="Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        name="subject"
                        placeholder="Subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <textarea
                      name="message"
                      placeholder="Message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send to us'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
