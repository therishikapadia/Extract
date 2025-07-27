import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import AuthForm from './components/AuthForm';
import ChatWithSidebar from './pages/ChatWithSidebar';

function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
  });

  const [showAuth, setShowAuth] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('token'));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  // Optional: Listen for token changes in localStorage (e.g., from other tabs)
  useEffect(() => {
    const handler = () => setLoggedIn(!!localStorage.getItem('token'));
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <Router>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
        {showAuth && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
            <AuthForm
              onAuthSuccess={() => {
                setShowAuth(false);
                setLoggedIn(true);
              }}
              theme={theme}
              setTheme={setTheme}
              onClose={() => setShowAuth(false)}
            />
          </div>
        )}
        <Toaster position="top-center" />
        <Routes>
          <Route
            path="/"
            element={
              <Home
                theme={theme}
                setTheme={setTheme}
                onShowAuth={() => setShowAuth(true)}
                loggedIn={loggedIn}
              />
            }
          />
          <Route path="/chat" element={<ChatWithSidebar theme={theme} setTheme={setTheme} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
