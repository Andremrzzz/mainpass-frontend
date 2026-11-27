import { onlyDigits } from './masks';
import { maskCpf } from './format';

/* -------------------------------------------------------------------------- */
/*  Helpers da visão do Convidado                                             */
/* -------------------------------------------------------------------------- */

/**
 * Status de um QR Code do convidado, calculado a partir do relógio.
 * Ordem: cancelado > recusado > pendente (aguardando a portaria) > usado (usos esgotados) > expirado > agendado > ativo.
 * Convite pendente ou recusado NUNCA é "ativo": o QR Code só existe depois que a portaria aprova.
 * O servidor deve aplicar a mesma regra ao validar na portaria.
 */
export const getQrStatus = (qr, now = Date.now()) => {
  if (qr.canceladoEm) return 'cancelado';
  if (qr.aprovacao === 'recusado') return 'recusado';
  if (qr.aprovacao === 'pendente') return now >= qr.validUntil ? 'expirado' : 'pendente';
  if (qr.usos >= qr.usosMax) return 'usado';
  if (now >= qr.validUntil) return 'expirado';
  if (now < qr.validFrom) return 'agendado';
  return 'ativo';
};

// Progresso (0-100) do tempo já consumido da validade
export const qrProgress = (qr, now = Date.now()) => {
  const total = qr.validUntil - qr.validFrom;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - qr.validFrom) / total) * 100)));
};

// MP-7F3A-91C2-D4E8 -> MP-••••-••••-D4E8
export const maskToken = (token = '') => {
  const parts = token.split('-');
  return parts.map((p, i) => (i === 0 || i === parts.length - 1 ? p : '••••')).join('-');
};

// 11981234567 -> (11) •••••-4567
export const maskPhone = (phone) => {
  const d = onlyDigits(phone);
  if (d.length < 10) return '—';
  return `(${d.slice(0, 2)}) ${'•'.repeat(d.length - 6)}-${d.slice(-4)}`;
};

// fernanda@email.com -> f•••••@email.com
export const maskEmail = (email = '') => {
  const [user, domain] = email.split('@');
  if (!domain) return '—';
  return `${user[0]}${'•'.repeat(Math.max(user.length - 1, 3))}@${domain}`;
};

// Documento mascarado: CPF segue o padrão do sistema; RG mostra só os 2 últimos dígitos
export const maskDocument = (tipo, valor) => {
  if (tipo === 'CPF') return maskCpf(valor);
  const v = String(valor ?? '');
  return v ? `${'•'.repeat(Math.max(v.length - 2, 3))}${v.slice(-2)}` : '—';
};

const pad = (n) => String(n).padStart(2, '0');

// 14:05
export const fmtTime = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Hoje | Ontem | 12/11/2026
export const dayLabel = (ts, now = Date.now()) => {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// Copia texto; retorna true/false (o clipboard pode estar bloqueado em http ou iframe)
export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// Salva o <canvas> do QR Code como PNG com margem branca (melhora a leitura)
export const downloadQrCanvas = (canvas, filename) => {
  if (!canvas) return false;
  const margin = 40;
  const out = document.createElement('canvas');
  out.width = canvas.width + margin * 2;
  out.height = canvas.height + margin * 2;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, margin, margin);

  const link = document.createElement('a');
  link.download = filename;
  link.href = out.toDataURL('image/png');
  link.click();
  return true;
};

// Bip curto para o aviso sonoro (silencioso se o navegador bloquear o áudio)
export const playBeep = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {
    /* sem áudio: ignora */
  }
};
