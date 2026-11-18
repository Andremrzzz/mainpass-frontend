import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';

import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import Portaria from './pages/Portaria';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES, clearSession, getSession } from './auth';

/**
 * Tela provisória para páginas ainda não desenvolvidas.
 * Com sessão ativa, oferece "Sair"; sem sessão, volta ao login.
 */
function Placeholder({ title, subtitle, icon }) {
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    clearSession();
    navigate('/', { replace: true });
  };

  const actionClass =
    'mt-8 inline-flex items-center gap-2 rounded text-sm font-medium text-accent-muted transition-colors duration-200 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70';

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-brand-800 px-8 py-10 text-center shadow-card">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-slate-300">
          <i className={`fas ${icon}`}></i>
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-100">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>

        {session?.user?.name && (
          <p className="mt-4 text-xs text-slate-500">
            Sessão ativa: <span className="text-slate-300">{session.user.name}</span> ({session.role})
          </p>
        )}

        {session ? (
          <button type="button" onClick={handleLogout} className={actionClass}>
            <i className="fas fa-right-from-bracket text-xs"></i>
            Sair da conta
          </button>
        ) : (
          <Link to="/" className={actionClass}>
            <i className="fas fa-arrow-left text-xs"></i>
            Voltar ao login
          </Link>
        )}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <Placeholder
      title="Página não encontrada"
      subtitle="O endereço que você tentou acessar não existe."
      icon="fa-triangle-exclamation"
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brand-900 font-sans text-slate-400 antialiased">
        <Routes>
          {/* Pública: já redireciona quem possui sessão válida */}
          <Route path="/" element={<Login />} />

          {/* Convidado / morador */}
          <Route element={<ProtectedRoute roles={[ROLES.USER]} />}>
            <Route path="/dashboard" element={<UserDashboard />} />
          </Route>

          {/* Porteiro (e administração) */}
          <Route element={<ProtectedRoute roles={[ROLES.PORTEIRO, ROLES.ADMIN]} />}>
            <Route
              path="/portaria"
              element={<Portaria />}
            />
          </Route>

          {/* Administração */}
          <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
            <Route
              path="/admin"
              element={
                <Placeholder title="Painel do Morador / Admin" subtitle="Em desenvolvimento" icon="fa-user-shield" />
              }
            />
          </Route>

          {/* Rota antiga: redireciona para o dashboard */}
          <Route path="/convidado" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
