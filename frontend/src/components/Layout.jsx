import { NavLink, Outlet } from 'react-router-dom';
import { inTelegram } from '../api.js';

export default function Layout() {
  const allowed = inTelegram() || import.meta.env.DEV;

  if (!allowed) {
    return (
      <div className="center-msg">
        <div>
          <h2>Open from Telegram</h2>
          <p>This dashboard works only inside the Telegram Mini App.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">🔗 Viral Link</div>
        <nav className="tabs">
          <NavLink to="/" end className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            My Links
          </NavLink>
          <NavLink to="/create" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            New Link
          </NavLink>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
