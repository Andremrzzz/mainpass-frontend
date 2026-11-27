import React, { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import mascote from '../assets/mascote.png';
import {
  authenticate,
  AuthError,
  register,
  getHomeRoute,
  getSession,
  resolveRole,
  saveSession,
} from '../auth';

/* -------------------------------------------------------------------------- */
/*  Validações                                                                */
/* -------------------------------------------------------------------------- */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { key: 'len', label: 'Mínimo de 8 caracteres', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'Uma letra maiúscula', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'Uma letra minúscula', test: (v) => /[a-z]/.test(v) },
  { key: 'num', label: 'Um número', test: (v) => /\d/.test(v) },
];

const validateEmail = (v) => EMAIL_REGEX.test(v.trim());
const validatePassword = (v) => PASSWORD_RULES.every((r) => r.test(v));

// Entrada composta só por dígitos e pontuação é tratada como CPF
const isCpfLike = (v) => /^[\d.\-\s]+$/.test(v.trim());

const isValidCpf = (raw) => {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
};

const validateLogin = (v) => validateEmail(v) || (isCpfLike(v) && isValidCpf(v));

// E-mail em minúsculas ou CPF somente com dígitos
const normalizeLogin = (v) => (isCpfLike(v) ? v.replace(/\D/g, '') : v.trim().toLowerCase());

/* -------------------------------------------------------------------------- */
/*  Estilos reutilizáveis                                                     */
/* -------------------------------------------------------------------------- */
const inputClass =
  'h-11 w-full rounded-lg border bg-brand-900 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 transition-colors duration-200 hover:border-white/20 focus:outline-none focus:ring-1';
const inputOk = 'border-white/10 focus:border-accent focus:ring-accent';
const inputErr = 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500';
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900';

/* -------------------------------------------------------------------------- */
/*  Campo de formulário                                                       */
/* -------------------------------------------------------------------------- */
function Field({ id, label, icon, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <div className="relative">
        <i
          className={`fas ${icon} pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-500`}
        ></i>
        {children}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tela de Login / Cadastro                                                  */
/*  Login único: o perfil (role) vem do back-end e define o destino.          */
/* -------------------------------------------------------------------------- */
export default function Login() {
  const navigate = useNavigate();
  const passwordRef = useRef(null);

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // e-mail ou CPF (login) | e-mail (cadastro)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [identifierTouched, setIdentifierTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Quem já tem sessão válida vai direto para a própria área
  const existingSession = getSession();

  const resetForm = () => {
    setName('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIdentifierTouched(false);
  };

  const toggleMode = () => {
    setIsLogin((v) => !v);
    setError('');
    setNotice('');
    setIdentifier('');
    resetForm();
  };

  const passwordsMatch = password === confirmPassword;

  const identifierValid = isLogin ? validateLogin(identifier) : validateEmail(identifier);
  const identifierError =
    identifierTouched && identifier.trim() && !identifierValid
      ? isLogin
        ? isCpfLike(identifier)
          ? 'Informe um CPF válido.'
          : 'Informe um e-mail ou CPF válido.'
        : 'Insira um e-mail válido.'
      : '';

  // No login basta identificador válido e senha preenchida;
  // as regras de complexidade valem apenas no cadastro.
  const isFormValid = isLogin
    ? identifierValid && password.length > 0
    : name.trim().length > 0 &&
      identifierValid &&
      validatePassword(password) &&
      confirmPassword.length > 0 &&
      passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !isFormValid) return;

    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await authenticate(normalizeLogin(identifier), password);

        // Role vinda da resposta da API ou, na falta dela, dos claims do JWT
        const role = resolveRole(data);
        const home = getHomeRoute(role);
        if (!role || !home) {
          setError('Seu perfil de acesso não é reconhecido. Procure a administração.');
          return;
        }

        const saved = saveSession({ token: data.token, role, user: data.user });
        if (!saved) {
          setError('Não foi possível salvar a sessão. Verifique se o navegador permite armazenamento local.');
          return;
        }

        // replace: o botão "voltar" não retorna para o login
        navigate(home, { replace: true });
      } else {
        // A conta nasce sempre como Convidado (o perfil não é enviado nem escolhido aqui)
        await register({ name, email: identifier, password });

        setIsLogin(true);
        setIdentifier('');
        resetForm();
        setNotice('Conta de Convidado criada com sucesso. Faça login para continuar.');
      }
    } catch (err) {
      if (err instanceof AuthError && err.code === 'INVALID_CREDENTIALS') {
        setError('CPF/E-mail ou senha incorretos.');
        setPassword('');
        passwordRef.current?.focus();
      } else if (err instanceof AuthError && err.code === 'EMAIL_IN_USE') {
        setError('Este e-mail já está cadastrado. Faça login ou use outro e-mail.');
      } else if (err instanceof AuthError && err.code === 'INVALID_DATA') {
        setError(err.message && err.message !== 'INVALID_DATA' ? err.message : 'Confira os dados informados.');
      } else {
        setError('Não foi possível concluir a operação. Tente novamente em instantes.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Todos os hooks já foram chamados acima; o redirecionamento condicional vem depois
  const existingHome = existingSession ? getHomeRoute(existingSession.role) : null;
  if (existingHome) return <Navigate to={existingHome} replace />;

  return (
    <div className="min-h-screen bg-brand-900 font-sans text-slate-400 antialiased selection:bg-accent selection:text-white lg:grid lg:grid-cols-2">
      {/* ----------------------------- Formulário ----------------------------- */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[400px]">
          {/* Marca */}
          <div className="mb-10 flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white">
              <img
                src={mascote}
                alt="Mascote MainPass"
                className="h-full w-full scale-125 object-cover"
                draggable="false"
              />
            </div>
            <span className="text-xl font-semibold tracking-tight text-slate-100">MainPass</span>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            {isLogin ? 'Entrar na sua conta' : 'Criar sua conta'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isLogin
              ? 'Use seu e-mail ou CPF e sua senha para acessar o sistema.'
              : 'Contas criadas aqui são de Convidado. Contas de Morador são criadas pela portaria.'}
          </p>

          {/* Avisos */}
          {notice && (
            <div
              role="status"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-300"
            >
              <i className="fas fa-circle-check mt-0.5 text-xs"></i>
              <span>{notice}</span>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300"
            >
              <i className="fas fa-circle-exclamation mt-0.5 text-xs"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {!isLogin && (
              <Field id="name" label="Nome completo" icon="fa-user">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Seu nome"
                  className={`${inputClass} ${inputOk}`}
                />
              </Field>
            )}

            <Field
              id="identifier"
              label={isLogin ? 'E-mail ou CPF' : 'E-mail'}
              icon={isLogin ? 'fa-user' : 'fa-envelope'}
              error={identifierError}
            >
              <input
                id="identifier"
                type={isLogin ? 'text' : 'email'}
                inputMode={isLogin ? 'email' : undefined}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError('');
                }}
                onBlur={() => setIdentifierTouched(true)}
                autoComplete={isLogin ? 'username' : 'email'}
                autoCapitalize="none"
                spellCheck={false}
                placeholder={isLogin ? 'voce@empresa.com ou 000.000.000-00' : 'voce@empresa.com'}
                className={`${inputClass} ${identifierError ? inputErr : inputOk}`}
              />
            </Field>

            <div>
              <Field id="password" label="Senha" icon="fa-lock">
                <input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  className={`${inputClass} ${inputOk} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:text-slate-200 ${focusRing}`}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-[13px]`}></i>
                </button>
              </Field>

              {/* Checklist de requisitos (somente no cadastro) */}
              {!isLogin && password.length > 0 && (
                <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(password);
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

            {!isLogin && (
              <Field
                id="confirmPassword"
                label="Confirmar senha"
                icon="fa-lock"
                error={confirmPassword && !passwordsMatch ? 'As senhas não coincidem.' : ''}
              >
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`${inputClass} ${
                    confirmPassword && !passwordsMatch ? inputErr : inputOk
                  } pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className={`absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:text-slate-200 ${focusRing}`}
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-[13px]`}></i>
                </button>
              </Field>
            )}

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-white shadow-card transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
            >
              {loading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin text-xs"></i>
                  {isLogin ? 'Autenticando...' : 'Criando conta...'}
                </>
              ) : isLogin ? (
                'Entrar'
              ) : (
                'Criar conta'
              )}
            </button>
          </form>

          {/* Alternar modo */}
          <p className="mt-8 text-center text-sm text-slate-400">
            {isLogin ? 'Ainda não tem acesso?' : 'Já possui uma conta?'}
            <button
              type="button"
              onClick={toggleMode}
              className={`ml-1.5 rounded font-medium text-accent-muted transition-colors duration-200 hover:text-indigo-300 ${focusRing}`}
            >
              {isLogin ? 'Criar conta' : 'Fazer login'}
            </button>
          </p>

          <p className="mt-10 text-center text-xs text-slate-600">
            MainPass © {new Date().getFullYear()} — Controle de Acesso
          </p>
        </div>
      </div>

      {/* ------------------------- Painel institucional ------------------------ */}
      <div className="relative hidden overflow-hidden border-l border-white/[0.08] bg-brand-800 lg:flex lg:items-center lg:justify-center">
        {/* Grade sutil (textura, sem brilho) */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
          }}
        ></div>

        <div className="relative z-10 w-full max-w-md px-10">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Controle de acesso para condomínios e empresas
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-100">
            Cada entrada autorizada, registrada e rastreável.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Moradores, portaria e convidados em um único sistema, com QR Codes de validade definida e histórico completo.
          </p>

          <ul className="mt-10 space-y-6">
            {[
              {
                icon: 'fa-qrcode',
                title: 'QR Codes com validade',
                text: 'Cada acesso tem início e fim definidos, sem chaves ou senhas compartilhadas.',
              },
              {
                icon: 'fa-user-check',
                title: 'Aprovação pelo morador',
                text: 'Convites só liberam a entrada depois de confirmados pelo anfitrião.',
              },
              {
                icon: 'fa-clock-rotate-left',
                title: 'Histórico de acessos',
                text: 'Consulte quem entrou, quando e por qual portaria.',
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-slate-300">
                  <i className={`fas ${item.icon} text-sm`}></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
