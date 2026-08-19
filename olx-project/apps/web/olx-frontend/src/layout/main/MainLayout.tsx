import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { usePresenceHub } from '../../hooks/usePresenceHub';

// NotificationManager (the actual antd toast renderer) now lives in App.tsx, mounted outside
// <Routes> so it survives every route change — see App.tsx for why: it used to live here, which
// meant it unmounted/remounted on every MainLayout <-> non-MainLayout transition (e.g.
// login/register aren't inside MainLayout), so any global-toast notification queued while on
// /login just sat unrendered until the user navigated somewhere that (re)mounted MainLayout, at
// which point every queued toast fired at once.
const MainLayout: React.FC = () => {
  // App-wide "хто зараз онлайн" — один SignalR-конект на весь layout, а не по одному на
  // кожен SellerWidget/картку. Компоненти читають стан через presence-стор (Redux).
  usePresenceHub();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
