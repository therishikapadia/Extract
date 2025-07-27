import { useState } from 'react';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export default function Signup({ onSignupSuccess }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Signup failed');
      if (onSignupSuccess) onSignupSuccess();
    } catch (err) {
      setError('Signup failed. Try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
      <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
      <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
      <button type="submit">Sign Up</button>
      {error && <div>{error}</div>}
    </form>
  );
}