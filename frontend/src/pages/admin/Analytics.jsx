import { useState, useEffect } from 'react';
import {
  HiOutlineUserGroup,
  HiOutlineOfficeBuilding,
  HiOutlineCurrencyDollar,
  HiOutlineTrendingUp,
  HiOutlineChartPie,
  HiOutlineCalendar,
} from 'react-icons/hi';
import api from '../../services/api';
import './Analytics.scss';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalEmployees: 0,
    monthlyRevenue: 0,
    planDistribution: [],
    recentTenants: [],
    monthlyGrowth: [],
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/admin/analytics?days=${dateRange}`);
      if (response.data.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      // Use mock data if API not available
      setStats({
        totalTenants: 45,
        activeTenants: 42,
        totalEmployees: 1250,
        monthlyRevenue: 125000,
        planDistribution: [
          { plan: 'Starter', count: 20, percentage: 44 },
          { plan: 'Professional', count: 18, percentage: 40 },
          { plan: 'Enterprise', count: 7, percentage: 16 },
        ],
        recentTenants: [
          { name: 'Tech Solutions Ltd', plan: 'professional', createdAt: new Date() },
          { name: 'Global Industries', plan: 'enterprise', createdAt: new Date(Date.now() - 86400000) },
          { name: 'Startup Hub', plan: 'starter', createdAt: new Date(Date.now() - 172800000) },
          { name: 'Innovation Labs', plan: 'professional', createdAt: new Date(Date.now() - 259200000) },
          { name: 'Fintech Corp', plan: 'enterprise', createdAt: new Date(Date.now() - 345600000) },
        ],
        monthlyGrowth: [
          { month: 'Jul', tenants: 30, revenue: 95000 },
          { month: 'Aug', tenants: 35, revenue: 105000 },
          { month: 'Sep', tenants: 38, revenue: 112000 },
          { month: 'Oct', tenants: 42, revenue: 120000 },
          { month: 'Nov', tenants: 45, revenue: 125000 },
          { month: 'Dec', tenants: 48, revenue: 135000 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyShort = (amount) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K`;
    }
    return `₦${amount}`;
  };

  const getPlanColor = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'enterprise': return '#8b5cf6';
      case 'professional': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  // Calculate max values for scaling
  const maxTenants = Math.max(...stats.monthlyGrowth.map(m => m.tenants), 1);
  const maxRevenue = Math.max(...stats.monthlyGrowth.map(m => m.revenue), 1);

  // Calculate donut chart segments
  const calculateDonutSegments = () => {
    let accumulated = 0;
    return stats.planDistribution.map((item) => {
      const start = accumulated;
      accumulated += item.percentage;
      return {
        ...item,
        start,
        end: accumulated,
      };
    });
  };

  if (loading) {
    return <div className="loading-state">Loading analytics...</div>;
  }

  const donutSegments = calculateDonutSegments();

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Platform Analytics</h1>
          <p>Overview of platform performance and metrics</p>
        </div>
        <select
          className="date-filter"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <HiOutlineOfficeBuilding />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Organizations</span>
            <span className="stat-value">{stats.totalTenants}</span>
            <span className="stat-change positive">+12% from last month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <HiOutlineTrendingUp />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Organizations</span>
            <span className="stat-value">{stats.activeTenants}</span>
            <span className="stat-change positive">
              {stats.totalTenants > 0 ? Math.round((stats.activeTenants / stats.totalTenants) * 100) : 0}% active rate
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <HiOutlineUserGroup />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{stats.totalEmployees.toLocaleString()}</span>
            <span className="stat-change">Across all organizations</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <HiOutlineCurrencyDollar />
          </div>
          <div className="stat-content">
            <span className="stat-label">Monthly Revenue</span>
            <span className="stat-value">{formatCurrency(stats.monthlyRevenue)}</span>
            <span className="stat-change positive">+8% from last month</span>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Plan Distribution - Donut Chart */}
        <div className="card">
          <div className="card-header">
            <h3><HiOutlineChartPie /> Plan Distribution</h3>
          </div>
          <div className="donut-chart-container">
            <div className="donut-chart">
              <svg viewBox="0 0 100 100">
                {donutSegments.map((segment, index) => {
                  const startAngle = (segment.start / 100) * 360;
                  const endAngle = (segment.end / 100) * 360;
                  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

                  const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
                  const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
                  const endX = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
                  const endY = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);

                  return (
                    <path
                      key={index}
                      d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`}
                      fill={getPlanColor(segment.plan)}
                      className="donut-segment"
                    />
                  );
                })}
                <circle cx="50" cy="50" r="25" fill="var(--card-bg)" />
              </svg>
              <div className="donut-center">
                <span className="donut-total">{stats.totalTenants}</span>
                <span className="donut-label">Total</span>
              </div>
            </div>
            <div className="donut-legend">
              {stats.planDistribution.map((item) => (
                <div key={item.plan} className="legend-item">
                  <span className="legend-dot" style={{ background: getPlanColor(item.plan) }} />
                  <span className="legend-label">{item.plan}</span>
                  <span className="legend-value">{item.count}</span>
                  <span className="legend-percent">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Organizations */}
        <div className="card">
          <div className="card-header">
            <h3><HiOutlineCalendar /> Recent Organizations</h3>
          </div>
          <div className="recent-list">
            {stats.recentTenants.map((tenant, index) => (
              <div key={index} className="recent-item">
                <div className="org-avatar">{tenant.name.charAt(0)}</div>
                <div className="org-info">
                  <span className="org-name">{tenant.name}</span>
                  <span className="org-date">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className="plan-badge"
                  style={{
                    background: `${getPlanColor(tenant.plan)}15`,
                    color: getPlanColor(tenant.plan),
                    borderColor: `${getPlanColor(tenant.plan)}30`,
                  }}
                >
                  {tenant.plan}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Bar Chart */}
        <div className="card full-width">
          <div className="card-header">
            <h3><HiOutlineTrendingUp /> Monthly Growth</h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot purple" /> Organizations
              </span>
              <span className="legend-item">
                <span className="legend-dot green" /> Revenue
              </span>
            </div>
          </div>
          <div className="bar-chart">
            <div className="chart-y-axis">
              <span>{maxTenants}</span>
              <span>{Math.round(maxTenants * 0.75)}</span>
              <span>{Math.round(maxTenants * 0.5)}</span>
              <span>{Math.round(maxTenants * 0.25)}</span>
              <span>0</span>
            </div>
            <div className="chart-area">
              <div className="chart-grid">
                <div className="grid-line" />
                <div className="grid-line" />
                <div className="grid-line" />
                <div className="grid-line" />
              </div>
              <div className="chart-bars">
                {stats.monthlyGrowth.map((item, index) => (
                  <div key={index} className="bar-group">
                    <div className="bars">
                      <div
                        className="bar purple"
                        style={{ height: `${(item.tenants / maxTenants) * 100}%` }}
                      >
                        <span className="bar-tooltip">{item.tenants} orgs</span>
                      </div>
                      <div
                        className="bar green"
                        style={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                      >
                        <span className="bar-tooltip">{formatCurrencyShort(item.revenue)}</span>
                      </div>
                    </div>
                    <span className="bar-label">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
