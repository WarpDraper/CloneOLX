import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NotificationManager from '../../components/common/NotificationManager';

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <Header />
      <NotificationManager />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
