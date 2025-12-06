import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineOfficeBuilding,
  HiOutlineUserGroup,
  HiOutlineBriefcase,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineChartBar,
  HiOutlineCollection,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineClipboardList,
  HiOutlineFlag,
  HiOutlineAcademicCap,
  HiOutlineCalculator,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineCube,
  HiOutlineShoppingCart,
  HiOutlineSpeakerphone,
  HiOutlineDesktopComputer,
  HiOutlineCurrencyDollar,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import './Sidebar.scss';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, tenant, logout, isSuperAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const menuItems = isSuperAdmin
    ? [
        { path: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
        { path: '/tenants', icon: HiOutlineCollection, label: 'Organizations' },
        { path: '/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
        { path: '/settings', icon: HiOutlineCog, label: 'Settings' },
      ]
    : [
        { path: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
        { path: '/employees', icon: HiOutlineUsers, label: 'Employees' },
        { path: '/attendance', icon: HiOutlineClock, label: 'Attendance' },
        { path: '/leaves', icon: HiOutlineCalendar, label: 'Leave Management' },
        { path: '/payroll', icon: HiOutlineCash, label: 'Payroll' },
        { path: '/accounting', icon: HiOutlineCalculator, label: 'Accounting' },
        { path: '/finance', icon: HiOutlineCurrencyDollar, label: 'Finance' },
        { path: '/inventory', icon: HiOutlineCube, label: 'Inventory' },
        { path: '/assets', icon: HiOutlineDesktopComputer, label: 'Assets' },
        { path: '/procurement', icon: HiOutlineShoppingCart, label: 'Procurement' },
        { path: '/recruitment', icon: HiOutlineClipboardList, label: 'Recruitment' },
        { path: '/performance', icon: HiOutlineFlag, label: 'Performance' },
        { path: '/training', icon: HiOutlineAcademicCap, label: 'Training' },
        { path: '/tasks', icon: HiOutlineCheckCircle, label: 'Tasks' },
        { path: '/communications', icon: HiOutlineSpeakerphone, label: 'Communications' },
        { path: '/departments', icon: HiOutlineUserGroup, label: 'Departments' },
        { path: '/designations', icon: HiOutlineBriefcase, label: 'Designations' },
        { path: '/branches', icon: HiOutlineOfficeBuilding, label: 'Branches' },
        { path: '/settings', icon: HiOutlineCog, label: 'Settings' },
      ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">ERP</span>
          <span className="logo-text">HR Manager</span>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
        </button>
      </div>

      {tenant && (
        <div className="tenant-info">
          <div className="tenant-name">{tenant.name}</div>
          <div className="tenant-plan">{tenant.subscription?.plan} Plan</div>
        </div>
      )}

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <item.icon className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.firstName} {user?.lastName}</div>
            <div className="user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <HiOutlineLogout />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
