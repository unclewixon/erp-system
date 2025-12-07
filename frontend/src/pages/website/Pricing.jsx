import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Website.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const defaultContent = {
  heroTitle: 'Features Comparison',
  heroDescription: 'Choose the plan that fits your business needs and scale effortlessly. We have provided a detailed breakdown of our features comparison for each plan.',
  faqTitle: 'Frequently Asked Questions',
  ctaTitle: 'Ready to Get Started?',
  ctaDescription: 'Start your 14-day free trial today. No credit card required.',
  ctaPrimaryButton: 'Start Free Trial',
  ctaSecondaryButton: 'Contact Sales',
};

const Pricing = () => {
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    fetchPlans();
    fetchFeatures();
    fetchContent();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API_URL}/plans`);
      setPlans(response.data.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      // Use fallback plans if API fails
      setPlans(getDefaultPlans());
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatures = async () => {
    try {
      const response = await axios.get(`${API_URL}/plans/features`);
      setFeatures(response.data.data || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      setFeatures(getDefaultFeatures());
    }
  };

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/website-content/pricing`);
      if (response.data.success && response.data.data?.content) {
        setContent(prev => ({ ...prev, ...response.data.data.content }));
      }
    } catch (error) {
      console.error('Error fetching pricing content:', error);
    }
  };

  const getDefaultFeatures = () => [
    { name: 'Employee Management', slug: 'employee-management', category: 'hr' },
    { name: 'Leave Management', slug: 'leave-management', category: 'hr' },
    { name: 'Attendance Management', slug: 'attendance-management', category: 'hr' },
    { name: 'Department Management', slug: 'department-management', category: 'hr' },
    { name: 'Branch Management', slug: 'branch-management', category: 'hr' },
    { name: 'Payroll', slug: 'payroll', category: 'hr' },
    { name: 'Recruitment', slug: 'recruitment', category: 'hr' },
    { name: 'On-boarding', slug: 'onboarding', category: 'hr' },
    { name: 'Performance Appraisal', slug: 'performance', category: 'hr' },
    { name: 'Training Management', slug: 'training', category: 'hr' },
    { name: 'Benefits Management', slug: 'benefits', category: 'hr' },
    { name: 'Loan Management', slug: 'loans', category: 'hr' },
    { name: 'Expense Management', slug: 'expenses', category: 'finance' },
    { name: 'Reimbursement', slug: 'reimbursement', category: 'finance' },
    { name: 'Wallet', slug: 'wallet', category: 'finance' },
    { name: 'Bill Payment', slug: 'bills', category: 'finance' },
    { name: 'Invoicing', slug: 'invoicing', category: 'finance' },
    { name: 'Book Keeping', slug: 'bookkeeping', category: 'finance' },
    { name: 'Financial Reporting', slug: 'financial-reporting', category: 'finance' },
    { name: 'Inventory', slug: 'inventory', category: 'inventory' },
    { name: 'Asset Management', slug: 'assets', category: 'inventory' },
    { name: 'Procurement', slug: 'procurement', category: 'procurement' },
    { name: 'Work Flow Approval', slug: 'workflow-approval', category: 'workflow' },
    { name: 'Task Management', slug: 'tasks', category: 'workflow' },
    { name: 'Events', slug: 'events', category: 'communication' },
    { name: 'Messaging', slug: 'messaging', category: 'communication' },
  ];

  const getDefaultPlans = () => [
    {
      _id: '1',
      name: 'SME Plan',
      slug: 'sme',
      price: { monthly: 5000, yearly: 50000 },
      employeeRange: { min: 1, max: 5 },
      features: [
        { featureSlug: 'employee-management', included: true },
        { featureSlug: 'attendance-management', included: true },
        { featureSlug: 'department-management', included: true },
        { featureSlug: 'expenses', included: true },
        { featureSlug: 'workflow-approval', included: true },
      ],
    },
    {
      _id: '2',
      name: 'Basic Plan',
      slug: 'basic',
      price: { monthly: 10000, yearly: 100000 },
      employeeRange: { min: 6, max: 10 },
      features: [
        { featureSlug: 'employee-management', included: true },
        { featureSlug: 'leave-management', included: true },
        { featureSlug: 'attendance-management', included: true },
        { featureSlug: 'department-management', included: true },
        { featureSlug: 'expenses', included: true },
        { featureSlug: 'reimbursement', included: true },
        { featureSlug: 'invoicing', included: true },
        { featureSlug: 'workflow-approval', included: true },
      ],
    },
    {
      _id: '3',
      name: 'Growth Plan',
      slug: 'growth',
      isPopular: true,
      price: { monthly: 25000, yearly: 250000 },
      employeeRange: { min: 11, max: 25 },
      features: [
        { featureSlug: 'employee-management', included: true },
        { featureSlug: 'leave-management', included: true },
        { featureSlug: 'attendance-management', included: true },
        { featureSlug: 'department-management', included: true },
        { featureSlug: 'expenses', included: true },
        { featureSlug: 'reimbursement', included: true },
        { featureSlug: 'invoicing', included: true },
        { featureSlug: 'workflow-approval', included: true },
        { featureSlug: 'procurement', included: true },
        { featureSlug: 'inventory', included: true },
        { featureSlug: 'events', included: true },
        { featureSlug: 'loans', included: true },
        { featureSlug: 'bookkeeping', included: true },
      ],
    },
    {
      _id: '4',
      name: 'Premium Plan',
      slug: 'premium',
      price: { monthly: 50000, yearly: 500000 },
      employeeRange: { min: 26, max: 50 },
      features: getDefaultFeatures().map(f => ({ featureSlug: f.slug, included: true })),
    },
    {
      _id: '5',
      name: 'Enterprise Plan',
      slug: 'enterprise',
      isEnterprise: true,
      price: { monthly: 100000, yearly: 1000000 },
      employeeRange: { min: 51, max: null },
      features: getDefaultFeatures().map(f => ({ featureSlug: f.slug, included: true })),
    },
  ];

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const isFeatureIncluded = (plan, featureSlug) => {
    if (plan.isEnterprise) return true;
    const feature = plan.features?.find(f => f.featureSlug === featureSlug);
    return feature?.included || false;
  };

  const getEmployeeRange = (plan) => {
    if (plan.employeeRange?.max === null) {
      return `${plan.employeeRange.min}+ Employees`;
    }
    return `${plan.employeeRange.min}-${plan.employeeRange.max} Employees`;
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    const category = feature.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {});

  const categoryLabels = {
    hr: 'Human Resources',
    finance: 'Finance & Accounting',
    inventory: 'Inventory & Assets',
    procurement: 'Procurement',
    workflow: 'Workflow & Automation',
    communication: 'Communication',
    other: 'Other Features',
  };

  if (loading) {
    return (
      <div className="pricing-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      {/* Hero Section */}
      <section className="pricing-hero">
        <div className="pricing-hero-container">
          <span className="section-badge">Pricing</span>
          <h1>{content.heroTitle}</h1>
          <p>{content.heroDescription}</p>

          {/* Billing Toggle */}
          <div className="billing-toggle">
            <button
              className={billingPeriod === 'monthly' ? 'active' : ''}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={billingPeriod === 'yearly' ? 'active' : ''}
              onClick={() => setBillingPeriod('yearly')}
            >
              Yearly
              <span className="discount-badge">Save 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pricing-cards-section">
        <div className="pricing-cards-container">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`pricing-card ${plan.isPopular ? 'popular' : ''} ${plan.isEnterprise ? 'enterprise' : ''}`}
            >
              {plan.isPopular && <span className="popular-badge">Most Popular</span>}
              <h3>{plan.name}</h3>
              <div className="price">
                <span className="amount">
                  {formatPrice(plan.price?.[billingPeriod] || 0)}
                </span>
                <span className="period">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <p className="employee-range">{getEmployeeRange(plan)}</p>
              <Link
                to="/register"
                className={`btn-plan ${plan.isPopular ? 'primary' : 'secondary'}`}
              >
                {plan.isEnterprise ? 'Contact Sales' : 'Get Started'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="comparison-section">
        <div className="comparison-container">
          <h2>Detailed Feature Comparison</h2>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="feature-header">Features</th>
                  {plans.map((plan) => (
                    <th key={plan._id} className={plan.isPopular ? 'popular' : ''}>
                      <div className="plan-header">
                        <span className="plan-name">{plan.name}</span>
                        <span className="plan-price">
                          {formatPrice(plan.price?.[billingPeriod] || 0)}/{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                        </span>
                        <span className="plan-employees">{getEmployeeRange(plan)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                  <>
                    <tr key={category} className="category-row">
                      <td colSpan={plans.length + 1}>
                        {categoryLabels[category] || category}
                      </td>
                    </tr>
                    {categoryFeatures.map((feature) => (
                      <tr key={feature.slug}>
                        <td className="feature-name">{feature.name}</td>
                        {plans.map((plan) => (
                          <td key={plan._id} className={plan.isPopular ? 'popular' : ''}>
                            {isFeatureIncluded(plan, feature.slug) ? (
                              <span className="check">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            ) : (
                              <span className="dash">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="faq-container">
          <h2>{content.faqTitle}</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Can I upgrade my plan later?</h4>
              <p>Yes, you can upgrade your plan at any time. Your billing will be prorated for the remaining period.</p>
            </div>
            <div className="faq-item">
              <h4>Is there a free trial?</h4>
              <p>Yes, all plans come with a 14-day free trial. No credit card required to start.</p>
            </div>
            <div className="faq-item">
              <h4>What payment methods do you accept?</h4>
              <p>We accept bank transfers, card payments via Paystack, and enterprise invoicing.</p>
            </div>
            <div className="faq-item">
              <h4>Can I cancel anytime?</h4>
              <p>Yes, you can cancel your subscription at any time. No long-term contracts required.</p>
            </div>
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

export default Pricing;
