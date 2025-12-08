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
  HiOutlineCreditCard,
  HiOutlineChat,
  HiOutlineDocumentText,
  HiOutlineRefresh,
  HiOutlineSwitchHorizontal,
  HiOutlineMail,
  HiOutlineGlobeAlt,
} from 'react-icons/hi';
import './Sidebar.scss';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, tenant, logout, isSuperAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const menuItems = isSuperAdmin
    ? [
        { path: '/app/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
        { path: '/app/tenants', icon: HiOutlineCollection, label: 'Organizations' },
        { path: '/app/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
        { path: '/app/plans', icon: HiOutlineCreditCard, label: 'Pricing Plans' },
        { path: '/app/live-chats', icon: HiOutlineChat, label: 'Live Chats' },
        { path: '/app/website-content', icon: HiOutlineDocumentText, label: 'Website Content' },
        { path: '/app/payment-settings', icon: HiOutlineCash, label: 'Payment Settings' },
        { path: '/app/email-settings', icon: HiOutlineMail, label: 'Email Settings' },
        { path: '/app/global-settings', icon: HiOutlineGlobeAlt, label: 'Global Settings' },
        { path: '/app/settings', icon: HiOutlineCog, label: 'Settings' },
      ]
    : [
        { path: '/app/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
        { path: '/app/employees', icon: HiOutlineUsers, label: 'Employees' },
        { path: '/app/attendance', icon: HiOutlineClock, label: 'Attendance' },
        { path: '/app/shifts', icon: HiOutlineRefresh, label: 'Shifts' },
        { path: '/app/my-schedule', icon: HiOutlineCalendar, label: 'My Schedule' },
        { path: '/app/leaves', icon: HiOutlineCalendar, label: 'Leave Management' },
        { path: '/app/payroll', icon: HiOutlineCash, label: 'Payroll' },
        { path: '/app/accounting', icon: HiOutlineCalculator, label: 'Accounting' },
        { path: '/app/finance', icon: HiOutlineCurrencyDollar, label: 'Finance' },
        { path: '/app/inventory', icon: HiOutlineCube, label: 'Inventory' },
        { path: '/app/assets', icon: HiOutlineDesktopComputer, label: 'Assets' },
        { path: '/app/procurement', icon: HiOutlineShoppingCart, label: 'Procurement' },
        { path: '/app/recruitment', icon: HiOutlineClipboardList, label: 'Recruitment' },
        { path: '/app/performance', icon: HiOutlineFlag, label: 'Performance' },
        { path: '/app/training', icon: HiOutlineAcademicCap, label: 'Training' },
        { path: '/app/tasks', icon: HiOutlineCheckCircle, label: 'Tasks' },
        { path: '/app/communications', icon: HiOutlineSpeakerphone, label: 'Communications' },
        { path: '/app/departments', icon: HiOutlineUserGroup, label: 'Departments' },
        { path: '/app/designations', icon: HiOutlineBriefcase, label: 'Designations' },
        { path: '/app/branches', icon: HiOutlineOfficeBuilding, label: 'Branches' },
        { path: '/app/settings', icon: HiOutlineCog, label: 'Settings' },
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
