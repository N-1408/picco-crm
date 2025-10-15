import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface AdminLoginPageProps {
  redirectTo?: string;
}

export default function AdminLoginPage({ redirectTo = '/admin' }: AdminLoginPageProps) {
  const { loginAdmin, adminLoading, addToast } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await loginAdmin({ username, password });
      addToast({
        variant: 'success',
        title: 'Hush kelibsiz',
        description: 'Admin paneliga muvaffaqiyatli kirdingiz.'
      });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kirish amalga oshmadi.';
      setError(message);
      addToast({
        variant: 'error',
        title: 'Kirish amalga oshmadi',
        description: message
      });
    }
  };

  return (
    <main className="page admin-login">
      <section className="glass-panel admin-login__card">
        <h1>Admin paneli</h1>
        <p>Boshqaruv zonasi. Kirish uchun login va parolni kiriting.</p>
        <form className="admin-login__form" onSubmit={handleSubmit}>
          <label className="input-field">
            <span>Login</span>
            <input
              type="text"
              placeholder="admin"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="input-field">
            <span>Parol</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <span className="hero-error">{error}</span> : null}
          <button type="submit" className="btn-primary btn-large" disabled={adminLoading}>
            {adminLoading ? 'Kirish...' : 'Tasdiqlash'}
          </button>
        </form>
        <button type="button" className="btn-link admin-login__back" onClick={() => navigate('/')}>
          Bosh sahifaga qaytish
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
      </section>
    </main>
  );
}
