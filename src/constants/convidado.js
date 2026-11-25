/* -------------------------------------------------------------------------- */
/*  Constantes da visão do Convidado (/convidado)                             */
/* -------------------------------------------------------------------------- */

export const GUEST_TABS = [
  { key: 'qrcodes', label: 'Meus QR Codes', icon: 'fa-qrcode' },
  { key: 'entradas', label: 'Entradas', icon: 'fa-door-open' },
  { key: 'chat', label: 'Chat com Morador', icon: 'fa-comments' },
  { key: 'perfil', label: 'Perfil', icon: 'fa-user' },
];

// `tone` é interpretado pelo componente Badge
export const QR_STATUS = {
  ativo: { label: 'Ativo', tone: 'success' },
  agendado: { label: 'Agendado', tone: 'info' },
  usado: { label: 'Usado', tone: 'neutral' },
  expirado: { label: 'Expirado', tone: 'warning' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};

// "Ativos" inclui os agendados (ainda utilizáveis)
export const QR_FILTERS = [
  { key: 'todos', label: 'Todos', match: () => true },
  { key: 'ativos', label: 'Ativos', match: (s) => s === 'ativo' || s === 'agendado' },
  { key: 'usado', label: 'Usados', match: (s) => s === 'usado' },
  { key: 'expirado', label: 'Expirados', match: (s) => s === 'expirado' },
  { key: 'cancelado', label: 'Cancelados', match: (s) => s === 'cancelado' },
];

export const ENTRY_STATUS = {
  autorizada: { label: 'Autorizada', tone: 'success', icon: 'fa-circle-check' },
  negada: { label: 'Negada', tone: 'danger', icon: 'fa-circle-xmark' },
  expirada: { label: 'Expirada', tone: 'warning', icon: 'fa-clock' },
};

export const ENTRY_FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'autorizada', label: 'Autorizadas' },
  { key: 'negada', label: 'Negadas' },
  { key: 'expirada', label: 'Expiradas' },
];

export const QUICK_MESSAGES = [
  'Estou chegando na portaria',
  'Cheguei, aguardando liberação',
  'Obrigado pelo convite!',
];

export const ARRIVAL_MESSAGE = 'Cheguei na portaria, aguardando liberação.';
export const RENEWAL_MESSAGE = 'Poderia estender o horário do meu acesso? Preciso de mais tempo.';
export const MESSAGE_MAX_LENGTH = 500;
