import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { employeeAPI, branchAPI, departmentAPI } from '../../services/api';
import {
  HiOutlineUsers,
  HiOutlineOfficeBuilding,
  HiOutlineUserGroup,
  HiOutlineCalendar,
} from 'react-icons/hi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './Dashboard.scss';

const Dashboard = () => {
  const { user, tenant, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      if (isSuperAdmin) {
        // Super admin dashboard
        setStats({
          totalEmployees: 0,
          totalBranches: 0,
          totalDepartments: 0,
          onLeave: 0,
        });
      } else {
        const [employeeStats, branches, departments] = await Promise.all([
          employeeAPI.getStats(),
          branchAPI.getAll(),
          departmentAPI.getAll(),
        ]);

        setStats({
          totalEmployees: employeeStats.data.data.totalEmployees,
          activeEmployees: employeeStats.data.data.activeEmployees,
          totalBranches: branches.data.data.length,
          totalDepartments: departments.data.data.length,
          onLeave: employeeStats.data.data.onLeaveEmployees,
          recentHires: employeeStats.data.data.recentHires,
          departmentStats: employeeStats.data.data.departmentStats,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="welcome-text">
            Welcome back, {user?.firstName}!
            {tenant && <span> - {tenant.name}</span>}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <HiOutlineUsers />
          </div>
          <div className="stat-value">{stats?.totalEmployees || 0}</div>
          <div className="stat-label">Total Employees</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <HiOutlineOfficeBuilding />
          </div>
          <div className="stat-value">{stats?.totalBranches || 0}</div>
          <div className="stat-label">Branches</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <HiOutlineUserGroup />
          </div>
          <div className="stat-value">{stats?.totalDepartments || 0}</div>
          <div className="stat-label">Departments</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <HiOutlineCalendar />
          </div>
          <div className="stat-value">{stats?.onLeave || 0}</div>
          <div className="stat-label">On Leave Today</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Recent Hires</h3>
          {stats?.recentHires?.length > 0 ? (
            <div className="recent-list">
              {stats.recentHires.map((emp) => (
                <div key={emp._id} className="recent-item">
                  <div className="avatar">
                    {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                  </div>
                  <div className="info">
                    <div className="name">{emp.firstName} {emp.lastName}</div>
                    <div className="meta">{emp.department?.name}</div>
                  </div>
                  <div className="date">
                    {new Date(emp.hireDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No recent hires</p>
          )}
        </div>

        <div className="card">
          <h3>Department Distribution</h3>
          {stats?.departmentStats?.length > 0 ? (
            <div className="dept-stats">
              {stats.departmentStats.map((dept) => (
                <div key={dept._id} className="dept-item">
                  <div className="dept-name">{dept.name}</div>
                  <div className="dept-bar">
                    <div
                      className="dept-fill"
                      style={{
                        width: `${(dept.count / stats.totalEmployees) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="dept-count">{dept.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No department data</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
