import { useState } from 'react';

export default function Signup({ theme, setTheme, onSignupSuccess }) {
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:8000/api/signup/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.detail || 'Signup failed');
        return;
      }
      if (onSignupSuccess) onSignupSuccess();
    } catch (err) {
      setError('Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900 transition-colors duration-300">
      <div className="w-full max-w-md p-6 rounded-2xl shadow-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 z-20">
        <h2 className="text-xl font-semibold mb-6">Sign Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-2 rounded bg-gray-100 dark:bg-neutral-800 placeholder-gray-500 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 rounded bg-gray-100 dark:bg-neutral-800 placeholder-gray-500 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 rounded bg-gray-100 dark:bg-neutral-800 placeholder-gray-500 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button
            type="submit"
            className="w-full py-2 rounded bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition"
          >
            Sign Up
          </button>
        </form>
        {error && <p className="mt-4 text-center text-red-500">{error}</p>}
      </div>
    </div>
  );
} 