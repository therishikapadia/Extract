import { useState } from 'react';

export default function AuthForm({ theme, setTheme, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', username: '' });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      console.log('Toggling theme to:', next);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(isLogin ? 'Logging in:' : 'Signing up:', form);
    // Simulate successful auth
    if (onAuthSuccess) onAuthSuccess();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900 transition-colors duration-300">
      <div className=" bg-white dark:bg-neutral-900">

      <div className="w-full max-w-md p-6 rounded-2xl shadow-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 z-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {isLogin ? 'Login' : 'Sign Up'}
          </h2>
          <button
            onClick={toggleTheme}
            className="text-sm underline hover:opacity-80"
            type="button"
            >
            {theme === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-2 rounded bg-gray-100 dark:bg-neutral-800 placeholder-gray-500 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            />
          )}
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
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          {isLogin ? 'Don’t have an account?' : 'Already have an account?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="underline text-blue-600 dark:text-blue-400"
            type="button"
            >
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
            </div>
    </div>
  );
}
