import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateLink from './pages/CreateLink.jsx';
import IntermediatePage from './pages/IntermediatePage.jsx';

export default function App() {
  // Prepare the Telegram Mini App window (safe to run outside Telegram too)
  useEffect(() => {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (!tg) return;

    try {
      tg.ready();
      tg.expand();
      if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor('#0f172a');
      if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor('#0f172a');
    } catch (err) {
      // Older Telegram versions may not support every method
    }
  }, []);

  return (
    <Routes>
      {/* Public page: opened when someone clicks a short link */}
      <Route path="/go/:id" element={<IntermediatePage />} />

      {/* Admin Mini App (Telegram) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateLink />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
  }
