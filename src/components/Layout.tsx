import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  isPublic?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showSidebar = false, isPublic = false }) => {
  return (
    <div className="min-h-screen bg-light-primary dark:bg-dark-primary">
      <Navbar isPublic={isPublic} />
      <div className="flex">
        {showSidebar && (
          <div className="fixed left-0 top-16 h-full">
            <Sidebar />
          </div>
        )}
        <main className={`flex-1 ${showSidebar ? 'ml-64' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;