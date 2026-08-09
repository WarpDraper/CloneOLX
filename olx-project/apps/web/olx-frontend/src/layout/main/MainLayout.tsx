import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NotificationManager from '../../components/common/NotificationManager';
import { usePresenceHub } from '../../hooks/usePresenceHub';

const MainLayout: React.FC = () => {
  // App-wide "хто зараз онлайн" — один SignalR-конект на весь layout, а не по одному на
  // кожен SellerWidget/картку. Компоненти читають стан через presence-стор (Redux).
  usePresenceHub();

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
