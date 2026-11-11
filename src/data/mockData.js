/* -------------------------------------------------------------------------- */
/*  Dados de exemplo (substituir pela resposta da API do Spring Boot)         */
/* -------------------------------------------------------------------------- */
const H = 60 * 60 * 1000;
const BASE = Date.now();

// GET /passes
export const MOCK_PASSES = [
  {
    id: 'PS-1042',
    unit: 'Apartamento 42 - Bloco B',
    host: 'Mariana Souza',
    approved: true,
    validFrom: BASE - 2 * H,
    validUntil: BASE + 30 * H,
    code: 'MP-7F3A-91C2-B042',
    guest: {
      name: 'Carlos Eduardo Lima',
      cpf: '12345678901',
      email: 'carlos.lima@email.com',
      phone: '(11) 98765-4321',
    },
  },
  {
    id: 'PS-1043',
    unit: 'Cobertura 101 - Bloco A',
    host: 'Roberto Almeida',
    approved: true,
    validFrom: BASE - 24 * H,
    validUntil: BASE + 5 * 24 * H,
    code: 'MP-2B8D-44E1-A101',
    guest: {
      name: 'Fernanda Oliveira',
      cpf: '98765432100',
      email: 'fernanda.o@email.com',
      phone: '(11) 91234-5678',
    },
  },
  {
    id: 'PS-1044',
    unit: 'Casa 15 - Rua das Acácias',
    host: 'Juliana Prado',
    approved: false,
    validFrom: BASE + 24 * H,
    validUntil: BASE + 48 * H,
    code: 'MP-9C1E-70D5-C015',
    guest: {
      name: 'Pedro Henrique Santos',
      cpf: '45612378955',
      email: 'pedro.hs@email.com',
      phone: '(21) 99876-1234',
    },
  },
  {
    id: 'PS-1039',
    unit: 'Apartamento 42 - Bloco B',
    host: 'Mariana Souza',
    approved: true,
    validFrom: BASE - 72 * H,
    validUntil: BASE - 24 * H,
    code: 'MP-5A6F-12B8-B039',
    guest: {
      name: 'Lucas Martins',
      cpf: '32165498700',
      email: 'lucas.m@email.com',
      phone: '(11) 97777-8888',
    },
  },
];

// GET /notificacoes
export const MOCK_NOTIFICATIONS = [
  { id: 1, icon: 'fa-circle-check', text: 'O acesso PS-1042 foi liberado pela portaria.', time: 'há 2 h' },
  { id: 2, icon: 'fa-hourglass-half', text: 'O acesso PS-1044 aguarda aprovação do morador.', time: 'há 5 h' },
  { id: 3, icon: 'fa-triangle-exclamation', text: 'O acesso PS-1039 expirou.', time: 'ontem' },
];

// GET /usuarios/me
export const MOCK_PROFILE = {
  name: 'Carlos Eduardo Lima',
  email: 'carlos.lima@email.com',
  cpf: '12345678901',
  phone: '11987654321',
  role: 'Convidado / Morador',
};
