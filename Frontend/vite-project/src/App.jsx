import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AuthForm from './components/AuthForm';
import ChatApp from './components/ChatApp';
function App() {
 const [theme, setTheme] = useState(() => {
  const stored = localStorage.getItem("theme");
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
});

  useEffect(() => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  window.localStorage.setItem("theme", theme);
}, [theme]);


  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthForm theme={theme} setTheme={setTheme} />} />
        <Route path="/H" element={<Home theme={theme} setTheme={setTheme} />} />
        <Route path="/chat" element={<ChatApp theme={theme} setTheme={setTheme} />} />
      </Routes>
    </Router>
  );
}

export default App;
