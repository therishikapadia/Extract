import { useState } from 'react';
import toast from 'react-hot-toast';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function AuthForm({ onAuthSuccess, onClose, theme }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        // Login: use JWT endpoint
        const res = await fetch(`${API_BASE_URL}/api/token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            password: form.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        localStorage.setItem('token', data.access);
        toast.success('Login successful!');
        if (onAuthSuccess) onAuthSuccess();
      } else {
        // Signup
        const res = await fetch(`${API_BASE_URL}/api/signup/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error('Signup failed');
        toast.success('Signup successful! Please log in.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      toast.error(err.message || 'Something went wrong.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative bg-neutral-900 text-neutral-100 shadow-xl rounded-lg px-8 pt-8 pb-6 w-full max-w-md mx-auto
        ${theme === 'dark' ? 'bg-neutral-900 text-neutral-100' : 'bg-neutral-100 text-neutral-900'}
      `}
    >
      {/* <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        aria-label="Close"
      >
        &times;
      </button> */}
      <h2 className="text-2xl font-bold mb-6 text-center">{isLogin ? 'Login' : 'Sign Up'}</h2>
      {!isLogin && (
        <input
          className="mb-4 px-3 py-2 border border-neutral-700 rounded w-full bg-neutral-800 text-neutral-100"
          placeholder="Username"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
          required
        />
      )}
      {isLogin && (
        <input
          className="mb-4 px-3 py-2 border border-neutral-700 rounded w-full bg-neutral-800 text-neutral-100"
          placeholder="Username or Email"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
          required
        />
      )}
      {!isLogin && (
        <input
          className="mb-4 px-3 py-2 border border-neutral-700 rounded w-full bg-neutral-800 text-neutral-100"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          required
        />
      )}
      <input
        className="mb-4 px-3 py-2 border border-neutral-700 rounded w-full bg-neutral-800 text-neutral-100"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })}
        required
      />
      <button
        type="submit"
        className="w-full bg-neutral-700 text-neutral-100 py-2 rounded hover:bg-neutral-600 transition mb-2"
      >
        {isLogin ? 'Login' : 'Sign Up'}
      </button>
      <div className="text-center mb-2">
        {isLogin ? (
          <span>
            Don’t have an account?{' '}
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="text-blue-400 hover:underline"
            >
              Sign up
            </button>
          </span>
        ) : (
          <span>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className="text-blue-400 hover:underline"
            >
              Login
            </button>
          </span>
        )}
      </div>
      {error && <div className="text-red-400 text-center">{error}</div>}
    </form>
  );
}
