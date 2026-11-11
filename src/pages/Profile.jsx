import React, { useEffect, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Dados padrão (usados apenas se o componente for renderizado sem props)    */
/* -------------------------------------------------------------------------- */
const DEFAULT_USER = {
  name: 'Carlos Eduardo Lima',
  email: 'carlos.lima@email.com',
  cpf: '12345678901',
  phone: '11987654321',
  role: 'Convidado / Morador',
};

/* -------------------------------------------------------------------------- */
/*  Helpers de formatação e máscara                                           */
/* -------------------------------------------------------------------------- */
const onlyDigits = (v = '') => v.replace(/\D/g, '');

// 12345678901 -> ***.456.789-**
const maskCpf = (cpf) => {
  const d = onlyDigits(cpf);
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};

// 11987654321 -> (11) 9****-4321
const maskPhone = (phone) => {
  const d = onlyDigits(phone);
  const ddd = d.slice(0, 2);
  const last4 = d.slice(-4);
  return d.length === 11
    ? `(${ddd}) ${d[2]}****-${last4}`
    : `(${ddd}) ****-${last4}`;
};

// Formata enquanto o usuário digita: (11) 98765-4321
const formatPhone = (value) => {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const PASSWORD_RULES = [
  { key: 'len', label: 'Mínimo de 8 caracteres', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'Uma letra maiúscula', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'Uma letra minúscula', test: (v) => /[a-z]/.test(v) },
  { key: 'num', label: 'Um número', test: (v) => /\d/.test(v) },
];

/* -------------------------------------------------------------------------- */
/*  Estilos reutilizáveis                                                     */
/* -------------------------------------------------------------------------- */
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900';

const inputBase =
  'h-11 w-full rounded-lg border bg-brand-900 px-3.5 text-sm text-slate-100 placeholder-slate-500 transition-colors duration-200 hover:border-white/25 focus:outline-none focus:ring-1';
const inputOk = 'border-white/15 focus:border-accent focus:ring-accent';
const inputErr = 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500';

const btnPrimary = `inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-card transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const btnSecondary = `inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium text-slate-200 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

/* -------------------------------------------------------------------------- */
/*  Componentes de apoio                                                      */
/* -------------------------------------------------------------------------- */
function Card({ title, description, action, children }) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-brand-800 shadow-card">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        </div>
        {action}
      </header>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function Banner({ type, children, onClose }) {
  const styles =
    type === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      : 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';

  return (
    <div
      role={type === 'success' ? 'status' : 'alert'}
      className={`mb-6 flex items-start justify-between gap-3 rounded-lg border px-3.5 py-3 text-sm ${styles}`}
    >
      <div className="flex items-start gap-2.5">
        <i className={`fas ${icon} mt-0.5 text-xs`}></i>
        <span>{children}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className={`-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-70 transition-opacity hover:opacity-100 ${focusRing}`}
        aria-label="Dispensar aviso"
      >
        <i className="fas fa-xmark text-xs"></i>
      </button>
    </div>
  );
}

function InfoRow({ label, hint, children }) {
  return (
    <div className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="sm:col-span-2">
        <div className="text-sm text-slate-100">{children}</div>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </dd>
    </div>
  );
}

function FieldLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-200">
      {children}
    </label>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-xs text-rose-400" role="alert">
      {children}
    </p>
  );
}

// Campo somente leitura (e-mail, CPF e nível de acesso não são editáveis pelo usuário)
function LockedField({ id, label, value, hint, mono = false }) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          disabled
          readOnly
          className={`${inputBase} cursor-not-allowed border-white/10 pr-10 opacity-60 hover:border-white/10 ${
            mono ? 'font-mono' : ''
          }`}
        />
        <i className="fas fa-lock pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500"></i>
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, error }) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={`${inputBase} pr-11 ${error ? inputErr : inputOk}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className={`absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:text-slate-200 ${focusRing}`}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <i className={`fas ${show ? 'fa-eye-slash' : 'fa-eye'} text-[13px]`}></i>
        </button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function Spinner() {
  return <i className="fas fa-circle-notch fa-spin text-xs"></i>;
}

/* -------------------------------------------------------------------------- */
/*  Página de Perfil                                                          */
/*                                                                            */
/*  Props:                                                                    */
/*   - user:   { name, email, cpf, phone, role }                              */
/*   - onSave: (dados) => Promise|void — recebe { name, phone } já validados  */
/* -------------------------------------------------------------------------- */
export default function Profile({ user = DEFAULT_USER, onSave }) {
  /* ---------------------------- Dados pessoais ---------------------------- */
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(formatPhone(user.phone));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type, text }

  // Mantém o formulário sincronizado com o usuário quando não está editando
  useEffect(() => {
    if (!editing) {
      setName(user.name);
      setPhone(formatPhone(user.phone));
    }
  }, [user, editing]);

  // Some sozinho o aviso de sucesso
  useEffect(() => {
    if (feedback?.type !== 'success') return undefined;
    const id = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(id);
  }, [feedback]);

  const phoneDigits = onlyDigits(phone);
  const nameValid = name.trim().length >= 3;
  const phoneValid = phoneDigits.length === 10 || phoneDigits.length === 11;
  const dirty =
    name.trim() !== user.name || phoneDigits !== onlyDigits(user.phone);
  const canSave = nameValid && phoneValid && dirty && !saving;

  const startEdit = () => {
    setFeedback(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setName(user.name);
    setPhone(formatPhone(user.phone));
    setEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setFeedback(null);

    try {
      // TODO: substituir pela chamada real à API (PUT /usuarios/me)
      await new Promise((resolve) => setTimeout(resolve, 900));
      await onSave?.({ name: name.trim(), phone: phoneDigits });

      setEditing(false);
      setFeedback({ type: 'success', text: 'Dados atualizados com sucesso.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: 'Não foi possível salvar as alterações. Tente novamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ Alterar senha --------------------------- */
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwFeedback, setPwFeedback] = useState(null);

  useEffect(() => {
    if (pwFeedback?.type !== 'success') return undefined;
    const id = setTimeout(() => setPwFeedback(null), 5000);
    return () => clearTimeout(id);
  }, [pwFeedback]);

  const newPwValid = PASSWORD_RULES.every((r) => r.test(newPw));
  const sameAsCurrent = newPw.length > 0 && newPw === currentPw;
  const confirmMismatch = confirmPw.length > 0 && newPw !== confirmPw;
  const canChangePw =
    currentPw.length > 0 &&
    newPwValid &&
    !sameAsCurrent &&
    newPw === confirmPw &&
    !pwSaving;

  const resetPwForm = () => {
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
  };

  const closePwForm = () => {
    resetPwForm();
    setPwOpen(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!canChangePw) return;

    setPwSaving(true);
    setPwFeedback(null);

    try {
      // TODO: substituir pela chamada real à API (PUT /usuarios/me/senha)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      closePwForm();
      setPwFeedback({ type: 'success', text: 'Senha alterada com sucesso.' });
    } catch (err) {
      setPwFeedback({
        type: 'error',
        text: 'Não foi possível alterar a senha. Verifique a senha atual e tente novamente.',
      });
    } finally {
      setPwSaving(false);
    }
  };

  /* --------------------------------- Render -------------------------------- */
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Dados do perfil</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Consulte e atualize as informações da sua conta.
        </p>
      </div>

      {/* Identidade */}
      <section className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-brand-800 p-6 shadow-card">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-slate-200">
          {getInitials(user.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-100">{user.name}</p>
          <p className="truncate text-sm text-slate-400">{user.email}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
            <i className="fas fa-shield-halved text-[10px]"></i>
            {user.role}
          </span>
        </div>
      </section>

      {/* Informações pessoais */}
      <Card
        title="Informações pessoais"
        description="Nome e telefone podem ser atualizados. Os demais dados são protegidos."
        action={
          !editing && (
            <button type="button" onClick={startEdit} className={btnSecondary}>
              <i className="fas fa-pen text-xs"></i>
              Editar dados
            </button>
          )
        }
      >
        {feedback && (
          <Banner type={feedback.type} onClose={() => setFeedback(null)}>
            {feedback.text}
          </Banner>
        )}

        {!editing ? (
          <dl className="divide-y divide-white/[0.06]">
            <InfoRow label="Nome completo">{user.name}</InfoRow>
            <InfoRow label="E-mail" hint="Identificador de login da sua conta.">
              {user.email}
            </InfoRow>
            <InfoRow label="CPF" hint="Exibido com máscara por segurança.">
              <span className="font-mono">{maskCpf(user.cpf)}</span>
            </InfoRow>
            <InfoRow label="Telefone / Celular">
              <span className="font-mono">{maskPhone(user.phone)}</span>
            </InfoRow>
            <InfoRow label="Nível de acesso">{user.role}</InfoRow>
          </dl>
        ) : (
          <form onSubmit={handleSave} noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="profile-name">Nome completo</FieldLabel>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className={`${inputBase} ${nameValid ? inputOk : inputErr}`}
                />
                <FieldError>
                  {!nameValid && 'Informe seu nome completo (mínimo de 3 caracteres).'}
                </FieldError>
              </div>

              <div>
                <FieldLabel htmlFor="profile-phone">Telefone / Celular</FieldLabel>
                <input
                  id="profile-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  autoComplete="tel"
                  placeholder="(11) 98765-4321"
                  className={`${inputBase} ${phoneValid ? inputOk : inputErr}`}
                />
                <FieldError>{!phoneValid && 'Informe um telefone com DDD válido.'}</FieldError>
              </div>

              <LockedField
                id="profile-role"
                label="Nível de acesso"
                value={user.role}
                hint="Definido pela administração."
              />

              <LockedField
                id="profile-email"
                label="E-mail"
                value={user.email}
                hint="Usado para login. Não pode ser alterado aqui."
              />

              <LockedField
                id="profile-cpf"
                label="CPF"
                value={maskCpf(user.cpf)}
                mono
                hint="Documento protegido. Fale com a administração para corrigi-lo."
              />
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:justify-end">
              <button type="button" onClick={cancelEdit} disabled={saving} className={btnSecondary}>
                Cancelar
              </button>
              <button type="submit" disabled={!canSave} className={btnPrimary}>
                {saving ? (
                  <>
                    <Spinner />
                    Salvando...
                  </>
                ) : (
                  'Salvar alterações'
                )}
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Segurança / senha */}
      <Card
        title="Segurança"
        description="Mantenha sua conta protegida com uma senha forte."
        action={
          !pwOpen && (
            <button
              type="button"
              onClick={() => {
                setPwFeedback(null);
                setPwOpen(true);
              }}
              className={btnSecondary}
            >
              <i className="fas fa-key text-xs"></i>
              Alterar senha
            </button>
          )
        }
      >
        {pwFeedback && (
          <Banner type={pwFeedback.type} onClose={() => setPwFeedback(null)}>
            {pwFeedback.text}
          </Banner>
        )}

        {!pwOpen ? (
          <dl>
            <InfoRow label="Senha" hint="Recomendamos trocar a senha periodicamente.">
              <span className="font-mono tracking-widest text-slate-300">••••••••••</span>
            </InfoRow>
          </dl>
        ) : (
          <form onSubmit={handleChangePassword} noValidate className="space-y-5">
            <PasswordField
              id="pw-current"
              label="Senha atual"
              value={currentPw}
              onChange={setCurrentPw}
              autoComplete="current-password"
            />

            <div>
              <PasswordField
                id="pw-new"
                label="Nova senha"
                value={newPw}
                onChange={setNewPw}
                autoComplete="new-password"
                error={sameAsCurrent ? 'A nova senha deve ser diferente da atual.' : ''}
              />
              {newPw.length > 0 && (
                <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(newPw);
                    return (
                      <li
                        key={rule.key}
                        className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
                          ok ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        <i className={`fas ${ok ? 'fa-circle-check' : 'fa-circle'} text-[10px]`}></i>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <PasswordField
              id="pw-confirm"
              label="Confirmar nova senha"
              value={confirmPw}
              onChange={setConfirmPw}
              autoComplete="new-password"
              error={confirmMismatch ? 'As senhas não coincidem.' : ''}
            />

            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:justify-end">
              <button type="button" onClick={closePwForm} disabled={pwSaving} className={btnSecondary}>
                Cancelar
              </button>
              <button type="submit" disabled={!canChangePw} className={btnPrimary}>
                {pwSaving ? (
                  <>
                    <Spinner />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar senha'
                )}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}