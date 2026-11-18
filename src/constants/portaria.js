/* -------------------------------------------------------------------------- */
/*  Constantes do painel da Portaria                                          */
/* -------------------------------------------------------------------------- */

// Visões da navegação lateral
export const PORTARIA_MENU_ITEMS = [
  { key: 'overview', label: 'Visão Geral & Acessos', icon: 'fa-gauge-high' },
  { key: 'residents', label: 'Gestão de Moradores', icon: 'fa-users' },
  { key: 'invites', label: 'Convites Ativos', icon: 'fa-ticket' },
  { key: 'support', label: 'Chamados / Suporte', icon: 'fa-headset' },
];

// Rótulo do perfil exibido na sidebar
export const ROLE_LABELS = {
  ROLE_PORTEIRO: 'Porteiro',
  ROLE_ADMIN: 'Administrador / Síndico',
  ROLE_USER: 'Morador',
};

// `tone` é interpretado pelo componente Badge
export const ACCESS_STATUS = {
  permitido: { label: 'Permitido', tone: 'success' },
  negado: { label: 'Negado', tone: 'danger' },
  expirado: { label: 'Expirado', tone: 'warning' },
};

export const DIRECTION = {
  entrada: { label: 'Entrada', icon: 'fa-arrow-right-to-bracket' },
  saida: { label: 'Saída', icon: 'fa-arrow-right-from-bracket' },
};

export const RESIDENT_STATUS = {
  ativo: { label: 'Ativo', tone: 'success' },
  bloqueado: { label: 'Bloqueado', tone: 'danger' },
};

export const GUEST_STATUS = {
  valido: { label: 'Válido', tone: 'success' },
  pendente: { label: 'Pendente', tone: 'warning' },
  expirado: { label: 'Expirado', tone: 'danger' },
};

export const TICKET_STATUS = {
  aberto: { label: 'Aberto', tone: 'warning' },
  resolvido: { label: 'Resolvido', tone: 'success' },
};

export const PERIOD_OPTIONS = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
];

export const ACCESS_STATUS_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'permitidos', label: 'Permitidos' },
  { key: 'negados', label: 'Negados' },
];

export const RESIDENT_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'ativo', label: 'Ativos' },
  { key: 'bloqueado', label: 'Bloqueados' },
];

export const TICKET_TABS = [
  { key: 'aberto', label: 'Abertos' },
  { key: 'resolvido', label: 'Resolvidos' },
  { key: 'todos', label: 'Todos' },
];

export const PAGE_SIZE = 10;
