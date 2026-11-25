/* -------------------------------------------------------------------------- */
/*  Constantes de interface compartilhadas pelo dashboard                     */
/* -------------------------------------------------------------------------- */

// Anel de foco padrão (acessibilidade por teclado)
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900';

// Itens do menu lateral
export const MENU_ITEMS = [
  { key: 'passes', label: 'Meus QR Codes / Passes', icon: 'fa-ticket' },
  { key: 'perfil', label: 'Dados do Perfil', icon: 'fa-user' },
  { key: 'historico', label: 'Histórico de Acessos', icon: 'fa-clock-rotate-left' },
  { key: 'ajuda', label: 'Regras & Ajuda', icon: 'fa-circle-question' },
];

// Menu do porteiro: o item "passes" vira "Histórico de Entradas" (mesma chave, outra tela)
// e "Histórico de Acessos" (mock pessoal do morador) não se aplica.
export const PORTEIRO_MENU_ITEMS = [
  { key: 'passes', label: 'Histórico de Entradas', icon: 'fa-clock-rotate-left' },
  { key: 'perfil', label: 'Dados do Perfil', icon: 'fa-user' },
  { key: 'ajuda', label: 'Regras & Ajuda', icon: 'fa-circle-question' },
];

export const menuItemsFor = (isPorteiro) => (isPorteiro ? PORTEIRO_MENU_ITEMS : MENU_ITEMS);

// Seções do menu que já possuem tela; as demais exibem aviso de "em breve"
export const AVAILABLE_MENUS = ['passes', 'perfil', 'historico'];

// Aparência de cada status de passe
export const STATUS = {
  valido: {
    label: 'Válido',
    badge: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-500',
  },
  pendente: {
    label: 'Pendente',
    badge: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    dot: 'bg-amber-400',
    bar: 'bg-amber-500',
  },
  expirado: {
    label: 'Expirado',
    badge: 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    dot: 'bg-rose-400',
    bar: 'bg-rose-500/70',
  },
};

// Abas de filtro da lista de passes
export const PASS_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'valido', label: 'Válidos' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'expirado', label: 'Expirados' },
];
