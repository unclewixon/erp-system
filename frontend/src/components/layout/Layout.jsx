import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.scss';

const Layout = () => {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
