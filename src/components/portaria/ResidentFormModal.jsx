import React, { useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import Select from '../ui/Select';
import { createMorador, updateMorador } from '../../services/portariaService';
import { ApiError } from '../../services/api';
import { btnPrimary, btnSecondary, inputBase, inputErr, inputOk } from '../../constants/ui';
import { formatCpf, formatPhone, isValidCpf, isValidEmail, onlyDigits } from '../../utils/masks';

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'bloqueado', label: 'Bloqueado' },
];

const EMPTY = { nome: '', cpf: '', email: '', telefone: '', bloco: '', unidade: '', status: 'ativo' };

const validate = (v) => {
  const e = {};
  const name = v.nome.trim();
  if (name.length < 3) e.nome = 'Informe o nome completo.';
  else if (name.split(/\s+/).length < 2) e.nome = 'Informe nome e sobrenome.';
  if (!isValidCpf(v.cpf)) e.cpf = 'Informe um CPF válido.';
  if (!isValidEmail(v.email)) e.email = 'Informe um e-mail válido.';
  const phone = onlyDigits(v.telefone).length;
  if (phone < 10 || phone > 11) e.telefone = 'Informe um telefone com DDD válido.';
  if (!v.bloco.trim()) e.bloco = 'Informe o bloco.';
  if (!v.unidade.trim()) e.unidade = 'Informe a unidade.';
  return e;
};

/**
 * Formulário de cadastro (resident = null) ou edição de morador.
 * Chama POST /api/moradores ou PUT /api/moradores/{id} via portariaService.
 *
 * Props:
 *  - resident: morador a editar (ou null para cadastrar)
 *  - onClose:  fecha o modal
 *  - onSaved:  (moradorSalvo, mensagem) => void
 */
export default function ResidentFormModal({ resident = null, onClose, onSaved }) {
  const isEdit = Boolean(resident);

  const [values, setValues] = useState(() =>
    resident
      ? {
          nome: resident.nome,
          cpf: formatCpf(resident.cpf),
          email: resident.email,
          telefone: formatPhone(resident.telefone),
          bloco: resident.bloco,
          unidade: resident.unidade,
          status: resident.status,
        }
      : EMPTY
  );
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const clientErrors = useMemo(() => validate(values), [values]);

  // Erro de um campo: do servidor (até o campo ser editado) ou da validação local
  const errorOf = (field) => serverErrors[field] || ((submitted || touched[field]) && clientErrors[field]) || '';

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setServerErrors((s) => ({ ...s, [field]: undefined }));
    setFormError('');
  };
  const blur = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const fieldProps = (field) => ({
    id: `resident-${field}`,
    value: values[field],
    onBlur: () => blur(field),
    disabled: saving,
    'aria-invalid': Boolean(errorOf(field)),
    className: `${inputBase} ${errorOf(field) ? inputErr : inputOk}`,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSubmitted(true);
    if (Object.keys(clientErrors).length > 0) return;

    const payload = {
      nome: values.nome.trim().replace(/\s+/g, ' '),
      cpf: onlyDigits(values.cpf),
      email: values.email.trim().toLowerCase(),
      telefone: onlyDigits(values.telefone),
      bloco: values.bloco.trim().toUpperCase(),
      unidade: values.unidade.trim(),
      status: values.status,
    };

    setSaving(true);
    setFormError('');
    try {
      const saved = isEdit ? await updateMorador(resident.id, payload) : await createMorador(payload);
      onSaved(saved, isEdit ? 'Dados do morador atualizados.' : 'Morador cadastrado com sucesso.');
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setServerErrors(err.fieldErrors);
      setFormError(err.message || 'Não foi possível salvar. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <Modal
      size="lg"
      title={isEdit ? 'Editar morador' : 'Cadastrar novo morador'}
      subtitle={isEdit ? resident.nome : 'Preencha os dados do morador e da unidade.'}
      onClose={onClose}
      dismissible={!saving}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className={btnSecondary}>
            Cancelar
          </button>
          <button type="submit" form="resident-form" disabled={saving} className={btnPrimary}>
            {saving ? (
              <>
                <i className="fas fa-circle-notch fa-spin text-xs"></i>
                Salvando...
              </>
            ) : isEdit ? (
              'Salvar alterações'
            ) : (
              'Cadastrar morador'
            )}
          </button>
        </div>
      }
    >
      <form id="resident-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300"
          >
            <i className="fas fa-circle-exclamation mt-0.5 text-xs"></i>
            <span>{formError}</span>
          </div>
        )}

        <FormField id="resident-nome" label="Nome completo" error={errorOf('nome')}>
          <input
            {...fieldProps('nome')}
            type="text"
            autoComplete="off"
            placeholder="Nome e sobrenome"
            onChange={(e) => setField('nome', e.target.value)}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="resident-cpf" label="CPF" error={errorOf('cpf')}>
            <input
              {...fieldProps('cpf')}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              onChange={(e) => setField('cpf', formatCpf(e.target.value))}
            />
          </FormField>

          <FormField id="resident-telefone" label="Telefone / Celular" error={errorOf('telefone')}>
            <input
              {...fieldProps('telefone')}
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              placeholder="(11) 98765-4321"
              onChange={(e) => setField('telefone', formatPhone(e.target.value))}
            />
          </FormField>
        </div>

        <FormField id="resident-email" label="E-mail" error={errorOf('email')} hint="Usado como login do morador.">
          <input
            {...fieldProps('email')}
            type="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="morador@email.com"
            onChange={(e) => setField('email', e.target.value)}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-3">
          <FormField id="resident-bloco" label="Bloco" error={errorOf('bloco')}>
            <input
              {...fieldProps('bloco')}
              type="text"
              autoComplete="off"
              maxLength={10}
              placeholder="Ex.: B"
              onChange={(e) => setField('bloco', e.target.value)}
            />
          </FormField>

          <FormField id="resident-unidade" label="Unidade" error={errorOf('unidade')}>
            <input
              {...fieldProps('unidade')}
              type="text"
              autoComplete="off"
              maxLength={10}
              placeholder="Ex.: 42"
              onChange={(e) => setField('unidade', e.target.value)}
            />
          </FormField>

          <FormField id="resident-status" label="Status da conta">
            <Select
              id="resident-status"
              variant="field"
              value={values.status}
              onChange={(v) => setField('status', v)}
              options={STATUS_OPTIONS}
              disabled={saving}
              label="Status da conta"
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
