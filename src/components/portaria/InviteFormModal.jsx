import React, { useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import Select from '../ui/Select';
import { ErrorState } from '../ui/States';
import useResource from '../../hooks/useResource';
import { createConvite, listMoradores } from '../../services/portariaService';
import { ApiError } from '../../services/api';
import { btnPrimary, btnSecondary, inputBase, inputErr, inputOk } from '../../constants/ui';
import { fmtDateTime } from '../../utils/dates';
import { formatCpf, isValidCpf, onlyDigits } from '../../utils/masks';
import { formatUnit } from '../../utils/residents';

const HOUR = 60 * 60 * 1000;

const DURATIONS = [
  { value: String(2 * HOUR), label: '2 horas' },
  { value: String(6 * HOUR), label: '6 horas' },
  { value: String(24 * HOUR), label: '24 horas' },
  { value: String(3 * 24 * HOUR), label: '3 dias' },
  { value: String(7 * 24 * HOUR), label: '7 dias' },
  { value: String(30 * 24 * HOUR), label: '30 dias' },
];

const validate = (v) => {
  const e = {};
  if (!v.residentId) e.residentId = 'Selecione o morador responsável.';
  const name = v.guestName.trim();
  if (name.length < 3) e.guestName = 'Informe o nome do convidado.';
  else if (name.split(/\s+/).length < 2) e.guestName = 'Informe nome e sobrenome.';
  if (!isValidCpf(v.guestCpf)) e.guestCpf = 'Informe um CPF válido.';
  return e;
};

/**
 * Gera um convite (QR Code) para um convidado de um morador.
 * Chama POST /api/convites (createConvite) e, ao concluir, mostra o QR Code gerado.
 *
 * Props:
 *  - onClose:   fecha o modal
 *  - onCreated: (convite) => void — chamado assim que o convite é criado (para atualizar a lista)
 *  - onToast:   feedback (usado ao copiar o código)
 */
export default function InviteFormModal({ onClose, onCreated, onToast }) {
  const residents = useResource(listMoradores);

  const [values, setValues] = useState({ residentId: '', guestName: '', guestCpf: '', duration: DURATIONS[2].value });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  // Só moradores ativos podem gerar convites
  const options = useMemo(() => {
    const active = (residents.data ?? [])
      .filter((r) => r.status === 'ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((r) => ({ value: String(r.id), label: `${r.nome} — ${formatUnit(r)}` }));
    return [{ value: '', label: 'Selecione o morador...' }, ...active];
  }, [residents.data]);

  const clientErrors = useMemo(() => validate(values), [values]);
  const errorOf = (f) => serverErrors[f] || ((submitted || touched[f]) && clientErrors[f]) || '';

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setServerErrors((s) => ({ ...s, [field]: undefined }));
    setFormError('');
  };

  const textProps = (field) => ({
    id: `invite-${field}`,
    value: values[field],
    disabled: saving,
    onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
    'aria-invalid': Boolean(errorOf(field)),
    className: `${inputBase} ${errorOf(field) ? inputErr : inputOk}`,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(clientErrors).length > 0) return;

    const now = Date.now();
    setSaving(true);
    setFormError('');
    try {
      const invite = await createConvite({
        residentId: Number(values.residentId),
        guestName: values.guestName.trim().replace(/\s+/g, ' '),
        guestCpf: onlyDigits(values.guestCpf),
        validFrom: now,
        validUntil: now + Number(values.duration),
      });
      setCreated(invite);
      onCreated(invite);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setServerErrors(err.fieldErrors);
      setFormError(err.message || 'Não foi possível gerar o convite. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(created.code);
      onToast('Código copiado.');
    } catch {
      onToast({ text: 'Não foi possível copiar o código.', type: 'error' });
    }
  };

  const another = () => {
    setCreated(null);
    setValues((v) => ({ ...v, guestName: '', guestCpf: '' }));
    setTouched({});
    setSubmitted(false);
  };

  /* ------------------------------ Convite gerado ----------------------------- */
  if (created) {
    return (
      <Modal
        title="Convite gerado"
        subtitle="Apresente o QR Code ao convidado ou envie o código."
        onClose={onClose}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={another} className={btnSecondary}>
              Gerar outro convite
            </button>
            <button type="button" onClick={onClose} className={btnPrimary}>
              Concluir
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center">
          <div className="rounded-xl border border-white/10 bg-white p-4" data-testid="invite-qr">
            <QRCodeCanvas value={created.code} size={360} level="H" style={{ width: 192, height: 192, display: 'block' }} />
          </div>

          <div className="mt-5 flex items-center gap-2">
            <span className="font-mono text-base text-slate-100" data-testid="invite-code">
              {created.code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copiar código"
              title="Copiar código"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-white/[0.06] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <i className="fas fa-copy text-xs"></i>
            </button>
          </div>
        </div>

        <dl className="mt-6 divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {[
            ['Convidado', created.guestName],
            ['Unidade', created.unit],
            ['Morador responsável', created.host],
            ['Válido até', fmtDateTime(created.validUntil)],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="text-sm text-slate-100 sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
      </Modal>
    );
  }

  /* -------------------------------- Formulário ------------------------------- */
  return (
    <Modal
      title="Novo convite"
      subtitle="Gere um QR Code de acesso para um convidado de um morador."
      onClose={onClose}
      dismissible={!saving}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className={btnSecondary}>
            Cancelar
          </button>
          <button type="submit" form="invite-form" disabled={saving || residents.loading || Boolean(residents.error)} className={btnPrimary}>
            {saving ? (
              <>
                <i className="fas fa-circle-notch fa-spin text-xs"></i>
                Gerando...
              </>
            ) : (
              <>
                <i className="fas fa-qrcode text-xs"></i>
                Gerar convite
              </>
            )}
          </button>
        </div>
      }
    >
      {residents.error ? (
        <ErrorState error={residents.error} onRetry={residents.reload} />
      ) : (
        <form id="invite-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          {formError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300">
              <i className="fas fa-circle-exclamation mt-0.5 text-xs"></i>
              <span>{formError}</span>
            </div>
          )}

          <FormField id="invite-residentId" label="Morador responsável" error={errorOf('residentId')}>
            <Select
              id="invite-residentId"
              variant="field"
              value={values.residentId}
              onChange={(v) => setField('residentId', v)}
              options={options}
              disabled={saving || residents.loading}
              invalid={Boolean(errorOf('residentId'))}
              label="Morador responsável"
            />
          </FormField>

          <FormField id="invite-guestName" label="Nome do convidado" error={errorOf('guestName')}>
            <input
              {...textProps('guestName')}
              type="text"
              autoComplete="off"
              placeholder="Nome e sobrenome"
              onChange={(e) => setField('guestName', e.target.value)}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="invite-guestCpf" label="CPF do convidado" error={errorOf('guestCpf')}>
              <input
                {...textProps('guestCpf')}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                onChange={(e) => setField('guestCpf', formatCpf(e.target.value))}
              />
            </FormField>

            <FormField id="invite-duration" label="Válido por" hint="Contado a partir de agora.">
              <Select
                id="invite-duration"
                variant="field"
                value={values.duration}
                onChange={(v) => setField('duration', v)}
                options={DURATIONS}
                disabled={saving}
                label="Período de validade"
              />
            </FormField>
          </div>
        </form>
      )}
    </Modal>
  );
}
