import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/welcome', { replace: true });
    } catch (err) {
      setError(translateError((err as Error).message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md glass-card-strong p-8 space-y-6 animate-slideUp">
        <div className="text-center">
          <div className="text-4xl mb-3">🧠</div>
          <h1 className="text-2xl font-light emotion-text tracking-tight">UNIA-Emotion</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Inicia sesión para continuar
          </p>
        </div>

        <label className="block">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Correo electrónico</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-dark mt-1"
            placeholder="tu@correo.com"
          />
        </label>

        <label className="block">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-dark mt-1"
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="emotion-text hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}

function translateError(code: string): string {
  const map: Record<string, string> = {
    InvalidCredentials: 'Correo o contraseña incorrectos',
    ValidationError: 'Revisa los campos del formulario',
    TooManyRequests: 'Demasiados intentos. Espera un minuto.',
  };
  return map[code] ?? 'Algo salió mal. Intenta de nuevo.';
}
