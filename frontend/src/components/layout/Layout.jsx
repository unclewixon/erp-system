import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import TrialExpiredModal from '../common/TrialExpiredModal';
import './Layout.scss';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { tenant, isTrialExpired } = useAuth();

  const showTrialExpiredModal = isTrialExpired();

  return (
    <div className="layout">
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <HiOutlineX /> : <HiOutlineMenu />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <Outlet />
      </main>

      {/* Trial Expired Modal */}
      <TrialExpiredModal isOpen={showTrialExpiredModal} tenant={tenant} />
    </div>
  );
};

export default Layout;
