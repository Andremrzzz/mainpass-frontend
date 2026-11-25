import React, { useState } from 'react';
import { btnDanger, btnSecondary } from '../../constants/ui';
import { FOCUS_RING } from '../../constants/dashboard';
import { fmtDate } from '../../utils/format';
import { formatPhone } from '../../utils/masks';
import { maskDocument, maskEmail, maskPhone } from '../../utils/convidado';

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-brand-800 p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Rows({ items }) {
  return (
    <dl className="divide-y divide-white/[0.06]">
      {items.map(([label, value, mono]) => (
        <div key={label} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm text-slate-500">{label}</dt>
          <dd className={`break-all text-sm text-slate-100 sm:col-span-2 ${mono ? 'font-mono' : ''}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Switch({ id, label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-slate-100">{label}</label>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${FOCUS_RING} ${checked ? 'bg-accent' : 'bg-white/15'}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}></span>
      </button>
    </div>
  );
}

/**
 * Aba "Perfil". Props: perfil, onPrefs(patch), onLogout, onReset
 */
export default function ProfileTab({ perfil, onPrefs, onLogout, onReset }) {
  const [resetting, setResetting] = useState(false);
  const { preferencias: prefs, anfitriao, convite } = perfil;
  const hide = prefs.ocultarDadosSensiveis;

  const handleReset = async () => {
    setResetting(true);
    try {
      await onReset();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Meus dados">
        <Rows
          items={[
            ['Nome', perfil.nome],
            ['E-mail', hide ? maskEmail(perfil.email) : perfil.email],
            ['Telefone', hide ? maskPhone(perfil.telefone) : formatPhone(perfil.telefone)],
            [perfil.tipoDocumento, maskDocument(perfil.tipoDocumento, perfil.documento), true],
          ]}
        />
      </Section>

      <Section title="Convite e anfitrião">
        <Rows
          items={[
            ['Convidado por', anfitriao.nome],
            ['Unidade', `Bloco ${anfitriao.bloco}, unidade ${anfitriao.unidade}`],
            ['Motivo da visita', convite.motivo],
            ['Convite válido de', fmtDate(convite.inicio)],
            ['Convite válido até', fmtDate(convite.fim)],
          ]}
        />
      </Section>

      <Section title="Preferências">
        <div className="divide-y divide-white/[0.06]">
          <Switch id="pref-som" label="Aviso sonoro" description="Toca um som ao receber mensagem do morador." checked={prefs.somNotificacao} onChange={(v) => onPrefs({ somNotificacao: v })} />
          <Switch id="pref-visual" label="Aviso visual" description="Mostra um alerta na tela com novas mensagens." checked={prefs.avisoVisual} onChange={(v) => onPrefs({ avisoVisual: v })} />
          <Switch id="pref-privacidade" label="Ocultar dados sensíveis" description="Mascara documento, telefone e e-mail nesta tela." checked={prefs.ocultarDadosSensiveis} onChange={(v) => onPrefs({ ocultarDadosSensiveis: v })} />
        </div>
      </Section>

      <Section title="Conta">
        <p className="text-sm text-slate-400">Para entrar com outro perfil, encerre esta sessão e faça login novamente.</p>
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button type="button" onClick={onLogout} className={btnDanger}>
            <i className="fas fa-right-from-bracket text-xs"></i>
            Sair e trocar de conta
          </button>
          <button type="button" onClick={handleReset} disabled={resetting} className={btnSecondary}>
            <i className={`fas fa-rotate-left text-xs ${resetting ? 'fa-spin' : ''}`}></i>
            Restaurar dados de demonstração
          </button>
        </div>
      </Section>
    </div>
  );
}
