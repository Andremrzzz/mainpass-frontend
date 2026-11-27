import React, { useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import Select from '../ui/Select';
import { ErrorState } from '../ui/States';
import useResource from '../../hooks/useResource';
import { createConvite, listAmbientes } from '../../services/conviteService';
import { ApiError } from '../../services/api';
import { btnPrimary, btnSecondary, inputBase, inputErr, inputOk } from '../../constants/ui';
import { fmtDateTime } from '../../utils/dates';
import { formatCpf, formatPhone, isValidCpf, isValidEmail, onlyDigits } from '../../utils/masks';

const DAY = 24 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');
// ms -> valor de <input type="datetime-local"> (horário local)
const toLocalInput = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).getTime() : NaN);

const USOS = ['1', '2', '3', '5', '10'].map((v) => ({ value: v, label: v === '1' ? '1 uso' : `${v} usos` }));

const validate = (v, now) => {
  const e = {};
  const name = v.guestName.trim();
  if (name.length < 3) e.guestName = 'Informe o nome do convidado.';
  else if (name.split(/\s+/).length < 2) e.guestName = 'Informe nome e sobrenome.';
  if (!isValidCpf(v.guestCpf)) e.guestCpf = 'Informe um CPF válido.';
  if (!isValidEmail(v.guestEmail)) e.guestEmail = 'Informe um e-mail válido.';
  const phone = onlyDigits(v.guestPhone);
  if (phone && (phone.length < 10 || phone.length > 11)) e.guestPhone = 'Telefone com DDD (10 ou 11 dígitos).';
  if (!v.ambienteId) e.ambienteId = 'Selecione o ambiente autorizado.';
  const until = fromLocalInput(v.validUntil);
  const from = v.validFrom ? fromLocalInput(v.validFrom) : now;
  if (!v.validUntil || Number.isNaN(until)) e.validUntil = 'Informe a data e hora de expiração.';
  else if (until <= now) e.validUntil = 'A expiração deve estar no futuro.';
  else if (until <= from) e.validUntil = 'A expiração deve ser posterior ao início.';
  else if (until - from > 30 * DAY) e.validUntil = 'A validade máxima é de 30 dias.';
  if (v.validFrom && Number.isNaN(from)) e.validFrom = 'Data de início inválida.';
  return e;
};

/**
 * "Novo convite" do morador. O convite é ENVIADO PARA APROVAÇÃO da portaria: o QR Code só é liberado
 * ao convidado depois que o porteiro aprovar. Ao concluir mostra "Aguardando aprovação da portaria".
 *
 * Props: onClose, onCreated(convite) (atualiza a lista)
 */
export default function NewInviteModal({ onClose, onCreated }) {
  const ambientes = useResource(listAmbientes);
  const initial = () => ({
    guestName: '', guestCpf: '', guestEmail: '', guestPhone: '', ambienteId: '',
    validFrom: '', validUntil: toLocalInput(Date.now() + DAY), usosMax: '1', observacao: '',
  });
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const options = useMemo(() => {
    const list = (ambientes.data ?? []).map((a) => ({ value: String(a.id), label: a.nome }));
    return [{ value: '', label: 'Selecione o ambiente...' }, ...list];
  }, [ambientes.data]);

  // Com um único ambiente disponível, já vem selecionado
  React.useEffect(() => {
    if (ambientes.data?.length === 1) setValues((v) => (v.ambienteId ? v : { ...v, ambienteId: String(ambientes.data[0].id) }));
  }, [ambientes.data]);

  const clientErrors = useMemo(() => validate(values, Date.now()), [values]);
  const errorOf = (f) => serverErrors[f] || ((submitted || touched[f]) && clientErrors[f]) || '';

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setServerErrors((s) => ({ ...s, [field]: undefined }));
    setFormError('');
  };

  const fieldProps = (field) => ({
    id: `new-invite-${field}`,
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
    setSaving(true);
    setFormError('');
    try {
      const convite = await createConvite({
        guestName: values.guestName.trim().replace(/\s+/g, ' '),
        guestCpf: onlyDigits(values.guestCpf),
        guestEmail: values.guestEmail.trim(),
        guestPhone: onlyDigits(values.guestPhone),
        ambienteId: Number(values.ambienteId),
        validFrom: values.validFrom ? fromLocalInput(values.validFrom) : null,
        validUntil: fromLocalInput(values.validUntil),
        usosMax: Number(values.usosMax),
        observacao: values.observacao.trim(),
      });
      setCreated(convite);
      onCreated(convite);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setServerErrors(err.fieldErrors);
      setFormError(err.message || 'Não foi possível enviar o convite. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const another = () => {
    setCreated(null);
    setValues((v) => ({ ...initial(), ambienteId: v.ambienteId }));
    setTouched({});
    setSubmitted(false);
  };

  /* --------------------------- Enviado: aguardando --------------------------- */
  if (created) {
    return (
      <Modal
        title="Convite enviado"
        onClose={onClose}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={another} className={btnSecondary}>Criar outro convite</button>
            <button type="button" onClick={onClose} className={btnPrimary}>Concluir</button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center" data-testid="invite-pending">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-xl text-amber-400">
            <i className="fas fa-hourglass-half"></i>
          </div>
          <p className="mt-4 text-base font-semibold text-slate-100">Aguardando aprovação da portaria</p>
          <p className="mt-1.5 max-w-sm text-sm text-slate-400">
            O QR Code de <span className="text-slate-200">{created.guest.name}</span> será liberado assim que o porteiro aprovar.
            Acompanhe o status em “Meus acessos”.
          </p>
        </div>
        <dl className="mt-6 divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {[
            ['Convidado', created.guest.name],
            ['Ambiente', created.ambiente],
            ['Válido até', fmtDateTime(created.validUntil)],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="text-sm text-slate-100 sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
        {created.senhaProvisoria && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-brand-900/60 p-3 text-sm text-slate-300">
            Senha provisória do convidado (exibida uma única vez):{' '}
            <span className="font-mono text-slate-100">{created.senhaProvisoria}</span>
          </div>
        )}
      </Modal>
    );
  }

  /* -------------------------------- Formulário ------------------------------- */
  return (
    <Modal
      title="Novo convite"
      subtitle="A portaria precisa aprovar antes de o QR Code ser liberado ao convidado."
      onClose={onClose}
      dismissible={!saving}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className={btnSecondary}>Cancelar</button>
          <button type="submit" form="new-invite-form" disabled={saving || ambientes.loading || Boolean(ambientes.error)} className={btnPrimary}>
            {saving ? (
              <><i className="fas fa-circle-notch fa-spin text-xs"></i>Enviando...</>
            ) : (
              <><i className="fas fa-paper-plane text-xs"></i>Enviar para aprovação</>
            )}
          </button>
        </div>
      }
    >
      {ambientes.error ? (
        <ErrorState error={ambientes.error} onRetry={ambientes.reload} />
      ) : (
        <form id="new-invite-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          {formError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300">
              <i className="fas fa-circle-exclamation mt-0.5 text-xs"></i>
              <span>{formError}</span>
            </div>
          )}

          <FormField id="new-invite-guestName" label="Nome do convidado" error={errorOf('guestName')}>
            <input {...fieldProps('guestName')} type="text" autoComplete="off" placeholder="Nome e sobrenome" onChange={(e) => setField('guestName', e.target.value)} />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="new-invite-guestCpf" label="CPF do convidado" error={errorOf('guestCpf')}>
              <input {...fieldProps('guestCpf')} type="text" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" onChange={(e) => setField('guestCpf', formatCpf(e.target.value))} />
            </FormField>
            <FormField id="new-invite-guestPhone" label="Telefone" error={errorOf('guestPhone')} hint="Opcional.">
              <input {...fieldProps('guestPhone')} type="tel" inputMode="tel" autoComplete="off" placeholder="(11) 90000-0000" onChange={(e) => setField('guestPhone', formatPhone(e.target.value))} />
            </FormField>
          </div>

          <FormField id="new-invite-guestEmail" label="E-mail do convidado" error={errorOf('guestEmail')}>
            <input {...fieldProps('guestEmail')} type="email" autoComplete="off" placeholder="convidado@email.com" onChange={(e) => setField('guestEmail', e.target.value)} />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="new-invite-ambienteId" label="Ambiente autorizado" error={errorOf('ambienteId')}>
              <Select id="new-invite-ambienteId" variant="field" value={values.ambienteId} onChange={(v) => setField('ambienteId', v)} options={options} disabled={saving || ambientes.loading} invalid={Boolean(errorOf('ambienteId'))} label="Ambiente autorizado" />
            </FormField>
            <FormField id="new-invite-usosMax" label="Quantidade de entradas">
              <Select id="new-invite-usosMax" variant="field" value={values.usosMax} onChange={(v) => setField('usosMax', v)} options={USOS} disabled={saving} label="Quantidade de entradas" />
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="new-invite-validFrom" label="Início" error={errorOf('validFrom')} hint="Opcional. Padrão: assim que aprovado.">
              <input {...fieldProps('validFrom')} type="datetime-local" min={toLocalInput(Date.now())} onChange={(e) => setField('validFrom', e.target.value)} />
            </FormField>
            <FormField id="new-invite-validUntil" label="Expiração do QR Code" error={errorOf('validUntil')} hint="Máximo de 30 dias.">
              <input {...fieldProps('validUntil')} type="datetime-local" min={toLocalInput(Date.now())} onChange={(e) => setField('validUntil', e.target.value)} />
            </FormField>
          </div>

          <FormField id="new-invite-observacao" label="Observações" error={errorOf('observacao')} hint={`Opcional (${values.observacao.length}/255). Ex.: veículo, motivo da visita.`}>
            <textarea {...fieldProps('observacao')} rows={2} maxLength={255} className={`${inputBase} ${inputOk} h-auto py-2.5`} onChange={(e) => setField('observacao', e.target.value)} />
          </FormField>
        </form>
      )}
    </Modal>
  );
}
