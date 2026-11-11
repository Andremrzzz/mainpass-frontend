import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getSession, getHomeRoute } from '../auth';

/**
 * Guarda de rotas por perfil (layout route).
 *
 * Uso:
 *   <Route element={<ProtectedRoute roles={[ROLES.PORTEIRO, ROLES.ADMIN]} />}>
 *     <Route path="/portaria" element={<Portaria />} />
 *   </Route>
 *
 * - Sem sessão válida (ausente, expirada ou com role desconhecida): volta ao login.
 * - Perfil sem permissão para a rota: envia o usuário para a própria área.
 * - Sem a prop `roles`, qualquer usuário autenticado pode acessar.
 *
 * Isto é apenas controle de experiência. A API deve validar a role em cada requisição.
 */
export default function ProtectedRoute({ roles }) {
  const session = getSession();

  if (!session) return <Navigate to="/" replace />;

  if (roles && !roles.includes(session.role)) {
    return <Navigate to={getHomeRoute(session.role) ?? '/'} replace />;
  }

  return <Outlet />;
}
