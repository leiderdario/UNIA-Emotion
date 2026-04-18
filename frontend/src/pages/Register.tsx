import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from '../features/auth/store';

const schema = z.object({
  fullName: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Correo inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
  phone: z.string().min(6, 'Teléfono muy corto'),
  whatsapp: z.string().min(6, 'WhatsApp muy corto'),
  emergencyEmail: z.string().email('Correo de emergencia inválido'),
});

type FormState = z.infer<typeof schema>;

export default function Register() {
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    whatsapp: '',
    emergencyEmail: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const registerAction = useAuthStore((s) => s.register);
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrs: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        fieldErrs[key] = issue.message;
      }
      setErrors(fieldErrs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    setServerError(null);
    try {
      await registerAction(parsed.data);
      navigate('/welcome', { replace: true });
    } catch (err) {
      const msg = (err as Error).message;
      setServerError(
        msg === 'EmailAlreadyRegistered'
          ? 'Ese correo ya está registrado'
          : 'No se pudo crear la cuenta. Intenta de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-lg glass-card-strong p-8 space-y-4 animate-slideUp">
        <div className="text-center mb-2">
          <div className="text-4xl mb-3">✨</div>
          <h1 className="text-2xl font-light emotion-text tracking-tight">Crear cuenta</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Configura tu perfil y contacto de emergencia
          </p>
        </div>

        <Field label="Nombre completo" error={errors.fullName}>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            className="input-dark"
            placeholder="Tu nombre completo"
          />
        </Field>

        <Field label="Correo electrónico" error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="input-dark"
            placeholder="tu@correo.com"
          />
        </Field>

        <Field label="Contraseña" error={errors.password} hint="Mínimo 8, incluye mayúscula y número">
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="input-dark"
            placeholder="••••••••"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Celular" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="input-dark"
              placeholder="+57..."
            />
          </Field>
          <Field label="WhatsApp" error={errors.whatsapp}>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
              className="input-dark"
              placeholder="+57..."
            />
          </Field>
        </div>

        <Field label="Correo de contacto de emergencia" error={errors.emergencyEmail}>
          <input
            type="email"
            value={form.emergencyEmail}
            onChange={(e) => update('emergencyEmail', e.target.value)}
            className="input-dark"
            placeholder="familiar@correo.com"
          />
        </Field>

        {serverError && <p className="text-sm" style={{ color: '#f87171' }}>{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Creando...' : 'Crear cuenta'}
        </button>

        <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="emotion-text hover:underline">
            Ingresa
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="mt-1">{children}</div>
      {hint && !error && (
        <span className="text-xs mt-1 block" style={{ color: 'var(--text-muted)' }}>{hint}</span>
      )}
      {error && (
        <span className="text-xs mt-1 block" style={{ color: '#f87171' }}>{error}</span>
      )}
    </label>
  );
}
