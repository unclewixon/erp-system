import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import './Admin.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Default content matching the static Home.jsx
const defaults = {
  logoText: 'POGO',
  signInButtonText: 'SIGN IN',
  heroSubtitle: 'INVEST IN YOUR FUTURE',
  // Hero slides - 3 variations with character animation
  heroSlides: [
    { line1: 'Saving &', line2: 'investing are', line3: 'made', highlight: 'simple.' },
    { line1: 'Grow your', line2: 'wealth with', line3: 'smart', highlight: 'choices.' },
    { line1: 'Build your', line2: 'future with', line3: 'secure', highlight: 'savings.' }
  ],
  heroImage: '', // Will store the uploaded image URL
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
  // Footer section
  footerDescription: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mi augue viverra ac vitae est commodo in urna.',
  footerCopyright: 'GC Partners',
};

// Helper to create cropped image
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw image preserving transparency (no background fill)
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Use PNG to preserve transparency
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
};

const WebsiteContent = () => {
  const [content, setContent] = useState(defaults);
  const [originalContent, setOriginalContent] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Image cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(content) !== JSON.stringify(originalContent));
  }, [content, originalContent]);

  const fetchContent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/website-content/home`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success && response.data.data) {
        const merged = { ...defaults, ...response.data.data };
        setContent(merged);
        setOriginalContent(merged);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/website-content/home`, { content }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOriginalContent({ ...content });
      toast.success('Content saved successfully');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setContent({ ...originalContent });
  };

  // Image upload handlers
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
        setShowCropper(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;

    try {
      setUploading(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      const formData = new FormData();
      formData.append('image', croppedBlob, 'hero-image.png');

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/website-content/upload-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Note: Don't set Content-Type for FormData - axios sets it automatically with boundary
        },
      });

      if (response.data.success) {
        handleChange('heroImage', response.data.data.imageUrl);
        toast.success('Image uploaded successfully');
        setShowCropper(false);
        setImageSrc(null);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageSrc(null);
  };

  const handleRemoveImage = () => {
    handleChange('heroImage', '');
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-state">Loading content...</div>
      </div>
    );
  }

  return (
    <div className="admin-page website-content-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Website Content</h1>
          <p>Edit the landing page content</p>
        </div>
        {hasChanges && (
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handleDiscard} disabled={saving}>
              Discard
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="content-sections">
        {/* Header */}
        <div className="content-section">
          <h2>Header</h2>
          <div className="fields-grid">
            <div className="field">
              <label>Logo Text</label>
              <input type="text" value={content.logoText} onChange={(e) => handleChange('logoText', e.target.value)} />
            </div>
            <div className="field">
              <label>Sign In Button</label>
              <input type="text" value={content.signInButtonText} onChange={(e) => handleChange('signInButtonText', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="content-section">
          <h2>Hero Section</h2>
          <div className="fields-grid">
            <div className="field full-width">
              <label>Subtitle</label>
              <input type="text" value={content.heroSubtitle} onChange={(e) => handleChange('heroSubtitle', e.target.value)} />
            </div>
            <div className="field full-width">
              <label>Description</label>
              <textarea rows={3} value={content.heroDescription} onChange={(e) => handleChange('heroDescription', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Hero Slides */}
        <div className="content-section">
          <h2>Hero Text Slides</h2>
          <p className="section-description">The hero displays 3 rotating text slides with character animation. Edit each slide below.</p>
          <div className="features-edit-list">
            {(content.heroSlides || defaults.heroSlides).map((slide, index) => (
              <div className="feature-edit-item" key={index}>
                <h4>Slide {index + 1}</h4>
                <div className="fields-grid">
                  <div className="field">
                    <label>Line 1 (colored)</label>
                    <input
                      type="text"
                      value={slide.line1}
                      onChange={(e) => {
                        const newSlides = [...(content.heroSlides || defaults.heroSlides)];
                        newSlides[index] = { ...newSlides[index], line1: e.target.value };
                        handleChange('heroSlides', newSlides);
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Line 2</label>
                    <input
                      type="text"
                      value={slide.line2}
                      onChange={(e) => {
                        const newSlides = [...(content.heroSlides || defaults.heroSlides)];
                        newSlides[index] = { ...newSlides[index], line2: e.target.value };
                        handleChange('heroSlides', newSlides);
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Line 3</label>
                    <input
                      type="text"
                      value={slide.line3}
                      onChange={(e) => {
                        const newSlides = [...(content.heroSlides || defaults.heroSlides)];
                        newSlides[index] = { ...newSlides[index], line3: e.target.value };
                        handleChange('heroSlides', newSlides);
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Highlight (green)</label>
                    <input
                      type="text"
                      value={slide.highlight}
                      onChange={(e) => {
                        const newSlides = [...(content.heroSlides || defaults.heroSlides)];
                        newSlides[index] = { ...newSlides[index], highlight: e.target.value };
                        handleChange('heroSlides', newSlides);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Image */}
        <div className="content-section">
          <h2>Hero Image (Center)</h2>
          <p className="section-description">Upload an image to display in the center of the hero section</p>
          <div className="image-upload-area">
            {content.heroImage ? (
              <div className="image-preview">
                <img src={`${API_URL.replace('/api', '')}${content.heroImage}`} alt="Hero" />
                <div className="image-actions">
                  <label className="btn btn-secondary">
                    Change Image
                    <input type="file" accept="image/*" onChange={handleImageSelect} hidden />
                  </label>
                  <button className="btn btn-danger" onClick={handleRemoveImage}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="upload-placeholder">
                <div className="upload-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <span>Click to upload hero image</span>
                <span className="upload-hint">Recommended: 600x800px or similar aspect ratio</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} hidden />
              </label>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="content-section">
          <h2>Statistics</h2>
          <div className="fields-grid">
            <div className="field">
              <label>Stat 1 Label</label>
              <input type="text" value={content.stat1Label} onChange={(e) => handleChange('stat1Label', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 1 Value</label>
              <input type="text" value={content.stat1Value} onChange={(e) => handleChange('stat1Value', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 2 Label</label>
              <input type="text" value={content.stat2Label} onChange={(e) => handleChange('stat2Label', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 2 Value</label>
              <input type="text" value={content.stat2Value} onChange={(e) => handleChange('stat2Value', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="content-section">
          <h2>Features</h2>
          <div className="features-edit-list">
            <div className="feature-edit-item">
              <h4>Feature 1</h4>
              <div className="field">
                <label>Title</label>
                <input type="text" value={content.feature1Title} onChange={(e) => handleChange('feature1Title', e.target.value)} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={2} value={content.feature1Description} onChange={(e) => handleChange('feature1Description', e.target.value)} />
              </div>
            </div>
            <div className="feature-edit-item">
              <h4>Feature 2 (Highlighted)</h4>
              <div className="field">
                <label>Title</label>
                <input type="text" value={content.feature2Title} onChange={(e) => handleChange('feature2Title', e.target.value)} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={2} value={content.feature2Description} onChange={(e) => handleChange('feature2Description', e.target.value)} />
              </div>
            </div>
            <div className="feature-edit-item">
              <h4>Feature 3</h4>
              <div className="field">
                <label>Title</label>
                <input type="text" value={content.feature3Title} onChange={(e) => handleChange('feature3Title', e.target.value)} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={2} value={content.feature3Description} onChange={(e) => handleChange('feature3Description', e.target.value)} />
              </div>
            </div>
            <div className="feature-edit-item">
              <h4>Feature 4</h4>
              <div className="field">
                <label>Title</label>
                <input type="text" value={content.feature4Title} onChange={(e) => handleChange('feature4Title', e.target.value)} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={2} value={content.feature4Description} onChange={(e) => handleChange('feature4Description', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Built-in Tools Section */}
        <div className="content-section">
          <h2>Built-in Tools Section</h2>
          <div className="fields-grid">
            <div className="field full-width">
              <label>Section Title</label>
              <input type="text" value={content.toolsTitle} onChange={(e) => handleChange('toolsTitle', e.target.value)} />
            </div>
          </div>
          <div className="features-edit-list" style={{ marginTop: '1rem' }}>
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div className="feature-edit-item" key={num}>
                <h4>Tool {num}</h4>
                <div className="field">
                  <label>Title</label>
                  <input type="text" value={content[`tool${num}Title`]} onChange={(e) => handleChange(`tool${num}Title`, e.target.value)} />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea rows={2} value={content[`tool${num}Description`]} onChange={(e) => handleChange(`tool${num}Description`, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* About Section */}
        <div className="content-section">
          <h2>About Section</h2>
          <div className="fields-grid">
            <div className="field">
              <label>Subtitle</label>
              <input type="text" value={content.aboutSubtitle} onChange={(e) => handleChange('aboutSubtitle', e.target.value)} />
            </div>
            <div className="field">
              <label>Title Line 1</label>
              <input type="text" value={content.aboutTitleLine1} onChange={(e) => handleChange('aboutTitleLine1', e.target.value)} />
            </div>
            <div className="field">
              <label>Title Line 2 (bold)</label>
              <input type="text" value={content.aboutTitleLine2} onChange={(e) => handleChange('aboutTitleLine2', e.target.value)} />
            </div>
            <div className="field full-width">
              <label>Description 1</label>
              <textarea rows={3} value={content.aboutDescription1} onChange={(e) => handleChange('aboutDescription1', e.target.value)} />
            </div>
            <div className="field full-width">
              <label>Description 2</label>
              <textarea rows={3} value={content.aboutDescription2} onChange={(e) => handleChange('aboutDescription2', e.target.value)} />
            </div>
          </div>
          <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Statistics Circles</h3>
          <div className="fields-grid">
            <div className="field">
              <label>Stat 1 Value</label>
              <input type="text" value={content.aboutStat1Value} onChange={(e) => handleChange('aboutStat1Value', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 1 Label</label>
              <input type="text" value={content.aboutStat1Label} onChange={(e) => handleChange('aboutStat1Label', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 2 Value</label>
              <input type="text" value={content.aboutStat2Value} onChange={(e) => handleChange('aboutStat2Value', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 2 Label</label>
              <input type="text" value={content.aboutStat2Label} onChange={(e) => handleChange('aboutStat2Label', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 3 Value</label>
              <input type="text" value={content.aboutStat3Value} onChange={(e) => handleChange('aboutStat3Value', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 3 Label</label>
              <input type="text" value={content.aboutStat3Label} onChange={(e) => handleChange('aboutStat3Label', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 4 Value</label>
              <input type="text" value={content.aboutStat4Value} onChange={(e) => handleChange('aboutStat4Value', e.target.value)} />
            </div>
            <div className="field">
              <label>Stat 4 Label</label>
              <input type="text" value={content.aboutStat4Label} onChange={(e) => handleChange('aboutStat4Label', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="content-section">
          <h2>Footer</h2>
          <div className="fields-grid">
            <div className="field full-width">
              <label>Footer Description</label>
              <textarea rows={3} value={content.footerDescription} onChange={(e) => handleChange('footerDescription', e.target.value)} />
            </div>
            <div className="field">
              <label>Copyright Name</label>
              <input type="text" value={content.footerCopyright} onChange={(e) => handleChange('footerCopyright', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="floating-actions">
          <button className="btn btn-secondary" onClick={handleDiscard} disabled={saving}>
            Discard
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Image Cropper Modal */}
      {showCropper && (
        <div className="cropper-modal">
          <div className="cropper-container">
            <div className="cropper-header">
              <h3>Crop Image</h3>
              <p>Adjust the crop area for your hero image</p>
            </div>
            <div className="cropper-area">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={3 / 4}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="cropper-controls">
              <label>
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="cropper-actions">
              <button className="btn btn-secondary" onClick={handleCropCancel} disabled={uploading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCropSave} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Save & Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteContent;
