import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Admin.scss';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, featuresRes] = await Promise.all([
        api.get('/plans'),
        api.get('/plans/features'),
      ]);
      setPlans(plansRes.data.data || []);
      setFeatures(featuresRes.data.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedPlans = async () => {
    try {
      setSaving(true);
      await api.post('/plans/seed');
      toast.success('Default plans created successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to seed plans');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan({ ...plan });
    setShowModal(true);
  };

  const handleCreatePlan = () => {
    setEditingPlan({
      name: '',
      slug: '',
      description: '',
      price: { monthly: 0, yearly: 0 },
      employeeRange: { min: 1, max: 10 },
      features: features.map(f => ({ featureSlug: f.slug, included: false })),
      isPopular: false,
      isEnterprise: false,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleSavePlan = async () => {
    if (!editingPlan.name || !editingPlan.slug) {
      toast.error('Name and slug are required');
      return;
    }

    try {
      setSaving(true);
      if (editingPlan._id) {
        await api.put(`/plans/${editingPlan._id}`, editingPlan);
        toast.success('Plan updated successfully');
      } else {
        await api.post('/plans', editingPlan);
        toast.success('Plan created successfully');
      }
      setShowModal(false);
      setEditingPlan(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      await api.delete(`/plans/${planId}`);
      toast.success('Plan deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  };

  const handleFeatureToggle = (featureSlug) => {
    const updatedFeatures = editingPlan.features.map(f =>
      f.featureSlug === featureSlug ? { ...f, included: !f.included } : f
    );
    setEditingPlan({ ...editingPlan, features: updatedFeatures });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    const category = feature.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-state">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="admin-page plans-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Pricing Plans</h1>
          <p>Manage subscription plans and pricing for your customers</p>
        </div>
        <div className="header-actions">
          {plans.length === 0 && (
            <button className="btn-secondary" onClick={handleSeedPlans} disabled={saving}>
              {saving ? 'Creating...' : 'Create Default Plans'}
            </button>
          )}
          <button className="btn-primary" onClick={handleCreatePlan}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Plan
          </button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="12" y2="17" />
            </svg>
          </div>
          <h3>No Plans Yet</h3>
          <p>Create pricing plans to offer subscription tiers to your customers.</p>
          <button className="btn-primary" onClick={handleSeedPlans} disabled={saving}>
            {saving ? 'Creating...' : 'Create Default Plans'}
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map((plan) => (
            <div key={plan._id} className={`plan-card ${plan.isPopular ? 'popular' : ''} ${!plan.isActive ? 'inactive' : ''}`}>
              {plan.isPopular && <div className="popular-badge">Most Popular</div>}
              {!plan.isActive && <div className="inactive-badge">Inactive</div>}

              <div className="plan-header">
                <h3>{plan.name}</h3>
                <p className="plan-description">{plan.description}</p>
              </div>

              <div className="plan-pricing">
                <div className="price">
                  {plan.isEnterprise ? (
                    <span className="custom-price">Custom</span>
                  ) : (
                    <>
                      <span className="amount">{formatPrice(plan.price?.monthly || 0)}</span>
                      <span className="period">/month</span>
                    </>
                  )}
                </div>
                {!plan.isEnterprise && plan.price?.yearly > 0 && (
                  <div className="yearly-price">
                    {formatPrice(plan.price.yearly)}/year
                  </div>
                )}
              </div>

              <div className="plan-employees">
                <span className="label">Employees:</span>
                <span className="range">
                  {plan.employeeRange?.min || 1} - {plan.employeeRange?.max === null ? 'Unlimited' : plan.employeeRange?.max}
                </span>
              </div>

              <div className="plan-features">
                <span className="feature-count">
                  {plan.features?.filter(f => f.included).length || 0} features included
                </span>
              </div>

              <div className="plan-actions">
                <button className="btn-edit" onClick={() => handleEditPlan(plan)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
                <button className="btn-delete" onClick={() => handleDeletePlan(plan._id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && editingPlan && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPlan._id ? 'Edit Plan' : 'Create Plan'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Plan Name *</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="e.g., Premium"
                  />
                </div>

                <div className="form-group">
                  <label>Slug *</label>
                  <input
                    type="text"
                    value={editingPlan.slug}
                    onChange={(e) => setEditingPlan({ ...editingPlan, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="e.g., premium"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <input
                    type="text"
                    value={editingPlan.description}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    placeholder="Plan description"
                  />
                </div>

                <div className="form-group">
                  <label>Monthly Price (NGN)</label>
                  <input
                    type="number"
                    value={editingPlan.price?.monthly || 0}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan,
                      price: { ...editingPlan.price, monthly: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Yearly Price (NGN)</label>
                  <input
                    type="number"
                    value={editingPlan.price?.yearly || 0}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan,
                      price: { ...editingPlan.price, yearly: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Min Employees</label>
                  <input
                    type="number"
                    value={editingPlan.employeeRange?.min || 1}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan,
                      employeeRange: { ...editingPlan.employeeRange, min: parseInt(e.target.value) || 1 }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Max Employees (0 for unlimited)</label>
                  <input
                    type="number"
                    value={editingPlan.employeeRange?.max || 0}
                    onChange={(e) => setEditingPlan({
                      ...editingPlan,
                      employeeRange: { ...editingPlan.employeeRange, max: parseInt(e.target.value) || null }
                    })}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingPlan.isPopular}
                      onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                    />
                    Mark as Popular
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingPlan.isEnterprise}
                      onChange={(e) => setEditingPlan({ ...editingPlan, isEnterprise: e.target.checked })}
                    />
                    Enterprise (Custom Pricing)
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingPlan.isActive}
                      onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="features-section">
                <h3>Included Features</h3>
                {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                  <div key={category} className="feature-category">
                    <h4>{category}</h4>
                    <div className="feature-list">
                      {categoryFeatures.map((feature) => {
                        const planFeature = editingPlan.features?.find(f => f.featureSlug === feature.slug);
                        return (
                          <label key={feature.slug} className="feature-item">
                            <input
                              type="checkbox"
                              checked={planFeature?.included || false}
                              onChange={() => handleFeatureToggle(feature.slug)}
                            />
                            <span>{feature.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSavePlan} disabled={saving}>
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;
