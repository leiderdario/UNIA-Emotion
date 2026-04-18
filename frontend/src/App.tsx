import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import { useAuthStore } from './features/auth/store';
import { EmotionThemeProvider } from './components/EmotionThemeProvider';

function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 emotion-border" />
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">Cargando...</p>
        </div>
      </div>
    );
  }
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <EmotionThemeProvider>
      <div className="h-full relative z-10">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/welcome" element={<AuthGate><Welcome /></AuthGate>} />
          <Route path="/dashboard" element={<AuthGate><Dashboard /></AuthGate>} />
          <Route path="/profile" element={<AuthGate><Profile /></AuthGate>} />
          <Route path="/admin" element={<AuthGate><AdminPanel /></AuthGate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer className="app-footer">
          UNIA-Emotion no reemplaza la atención de un profesional de salud mental.
        </footer>
      </div>
    </EmotionThemeProvider>
  );
}
