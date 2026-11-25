import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { validarConvite } from '../../services/portariaService';
import { FOCUS_RING } from '../../constants/dashboard';
import { btnPrimary, btnSecondary, inputBase, inputOk } from '../../constants/ui';

const READER_ID = 'portaria-qr-reader';
const COOLDOWN_MS = 3000; // tempo do feedback na tela antes de liberar o próximo visitante
const REPEAT_GUARD_MS = 4000; // o mesmo código lido de novo logo após o feedback é ignorado

/* Diagnóstico de falha da câmera -> texto para o porteiro */
const CAMERA_ERRORS = {
  insecure: {
    icon: 'fa-lock',
    title: 'Câmera indisponível neste endereço',
    text: 'O navegador só libera a câmera em HTTPS (ou em localhost). Abra o painel por um endereço seguro.',
  },
  denied: {
    icon: 'fa-video-slash',
    title: 'Permissão da câmera negada',
    text: 'Permita o uso da câmera nas configurações do navegador (ícone de cadeado) e tente novamente.',
  },
  nocamera: {
    icon: 'fa-video-slash',
    title: 'Nenhuma câmera encontrada',
    text: 'Conecte uma câmera ou use o código manual abaixo.',
  },
  busy: {
    icon: 'fa-triangle-exclamation',
    title: 'Câmera em uso por outro aplicativo',
    text: 'Feche o outro aplicativo ou aba que está usando a câmera e tente novamente.',
  },
  other: {
    icon: 'fa-triangle-exclamation',
    title: 'Não foi possível iniciar a câmera',
    text: 'Tente novamente ou use o código manual abaixo.',
  },
};

const classifyCameraError = (err) => {
  const text = String(err?.name || err?.message || err || '');
  if (/NotAllowed|Permission|denied/i.test(text)) return 'denied';
  if (/NotFound|DevicesNotFound|no camera/i.test(text)) return 'nocamera';
  if (/NotReadable|TrackStart|in use/i.test(text)) return 'busy';
  return 'other';
};

const safeStop = async (scanner) => {
  if (!scanner) return;
  try {
    const state = scanner.getState();
    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
      await scanner.stop();
    }
  } catch {
    /* já parado */
  }
  try {
    scanner.clear();
  } catch {
    /* já limpo */
  }
};

/**
 * Leitor de QR Code da portaria (html5-qrcode).
 *
 *  - Inicia a câmera sozinho ao montar (traseira quando houver) e libera ao desmontar/pausar.
 *  - Cada leitura chama validarConvite() (POST /api/acessos/validar) e mostra "Acesso liberado"
 *    ou "Acesso negado" sobre a câmera; após ~3 s volta a ler sem cliques.
 *  - Trava de leitura: nada novo é validado enquanto há validação em andamento ou feedback na tela;
 *    o mesmo código lido logo em seguida é ignorado por mais alguns segundos.
 *  - Código manual: oculto até clicar no link discreto.
 *
 * Props:
 *  - onValidated(resultado): chamado após cada validação (para atualizar o registro de acessos)
 *  - scanRequest: número que o pai incrementa para pedir "retomar câmera e trazer o leitor à vista"
 */
export default function QrScannerPanel({ onValidated, scanRequest = 0 }) {
  const rootRef = useRef(null);
  const scannerRef = useRef(null);
  const chainRef = useRef(Promise.resolve());
  const wantRef = useRef('on'); // estado desejado da câmera: 'on' | 'off'
  const mountedRef = useRef(true);
  const busyRef = useRef(false); // true = validando ou exibindo feedback
  const lastRef = useRef({ code: '', until: 0 });
  const timerRef = useRef(null);
  const onValidatedRef = useRef(onValidated);
  onValidatedRef.current = onValidated;

  const [phase, setPhase] = useState('starting'); // starting | scanning | paused | error
  const [cameraError, setCameraError] = useState(null);
  const [result, setResult] = useState(null); // { kind: 'validating' | 'allowed' | 'denied' | 'failed', title, detail }
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const safeSet = (fn) => {
    if (mountedRef.current) fn();
  };

  /* ------------------------------ Validação ------------------------------ */
  const handleCode = useCallback(async (raw, { manual = false } = {}) => {
    const code = String(raw ?? '').trim();
    if (!code || busyRef.current) return;
    if (!manual && code === lastRef.current.code && Date.now() < lastRef.current.until) return;

    busyRef.current = true;
    clearTimeout(timerRef.current);
    safeSet(() => setResult({ kind: 'validating', title: 'Validando...', detail: '' }));

    let outcome;
    try {
      const r = await validarConvite({ code });
      const who = r.log?.personName && r.log.personName !== 'Não identificado' ? r.log.personName : '';
      const where = r.log?.unit && r.log.unit !== '—' ? r.log.unit : '';
      outcome = r.allowed
        ? { kind: 'allowed', title: 'Acesso liberado', detail: [who, where].filter(Boolean).join(' · ') }
        : { kind: 'denied', title: 'Acesso negado', detail: r.reason || 'QR Code inválido' };
      onValidatedRef.current?.(r);
    } catch (err) {
      outcome = { kind: 'failed', title: 'Falha na validação', detail: err?.message || 'Tente novamente.' };
    }

    try {
      navigator.vibrate?.(outcome.kind === 'allowed' ? 80 : [120, 60, 120]);
    } catch {
      /* sem vibração */
    }

    safeSet(() => setResult(outcome));
    if (manual && outcome.kind === 'allowed') safeSet(() => setManualCode(''));

    // Mantém o feedback por COOLDOWN_MS e só então libera a leitura do próximo visitante
    timerRef.current = setTimeout(() => {
      lastRef.current = { code, until: Date.now() + REPEAT_GUARD_MS };
      busyRef.current = false;
      safeSet(() => setResult(null));
    }, COOLDOWN_MS);
  }, []);

  const handleCodeRef = useRef(handleCode);
  handleCodeRef.current = handleCode;

  /* -------------------------------- Câmera -------------------------------- */
  const startCamera = useCallback(async () => {
    safeSet(() => {
      setPhase('starting');
      setCameraError(null);
    });

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      safeSet(() => {
        setCameraError('insecure');
        setPhase('error');
      });
      return;
    }

    let scanner = null;
    try {
      const cameras = await Html5Qrcode.getCameras(); // também dispara o pedido de permissão
      if (!cameras.length) throw new Error('NotFoundError');
      if (wantRef.current !== 'on' || !mountedRef.current) return;

      scanner = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      const config = {
        fps: 10,
        qrbox: (w, h) => {
          const side = Math.floor(Math.min(w, h) * 0.7);
          return { width: side, height: side };
        },
      };
      const onDecode = (text) => handleCodeRef.current(text);

      try {
        await scanner.start({ facingMode: 'environment' }, config, onDecode, () => {});
      } catch (firstErr) {
        if (classifyCameraError(firstErr) === 'denied') throw firstErr;
        // Sem câmera traseira (notebook/desktop): usa a última da lista
        await scanner.start(cameras[cameras.length - 1].id, config, onDecode, () => {});
      }

      scannerRef.current = scanner;
      if (wantRef.current !== 'on' || !mountedRef.current) return; // a limpeza abaixo já foi pedida
      safeSet(() => setPhase('scanning'));
    } catch (err) {
      await safeStop(scanner);
      scannerRef.current = null;
      safeSet(() => {
        setCameraError(classifyCameraError(err));
        setPhase('error');
      });
    }
  }, []);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    await safeStop(scanner);
  }, []);

  // Sincroniza a câmera com o estado desejado, em fila (evita start/stop concorrentes, p. ex. StrictMode)
  const sync = useCallback(() => {
    chainRef.current = chainRef.current.then(async () => {
      if (wantRef.current === 'on' && !scannerRef.current) await startCamera();
      else if (wantRef.current === 'off' && scannerRef.current) await stopCamera();
      if (wantRef.current === 'off' && !scannerRef.current) {
        safeSet(() => setPhase((p) => (p === 'error' ? p : 'paused')));
      }
    });
  }, [startCamera, stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    wantRef.current = 'on';
    sync();
    return () => {
      mountedRef.current = false;
      wantRef.current = 'off';
      clearTimeout(timerRef.current);
      busyRef.current = false;
      sync(); // libera a câmera (stop + clear)
    };
  }, [sync]);

  const pause = () => {
    wantRef.current = 'off';
    sync();
  };
  const resume = useCallback(() => {
    wantRef.current = 'on';
    sync();
  }, [sync]);

  // "Escanear QR Code" no cabeçalho: retoma a câmera e traz o leitor para a tela
  useEffect(() => {
    if (!scanRequest) return;
    rootRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    if (wantRef.current === 'off' || phase === 'error' || phase === 'paused') resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanRequest]);

  const submitManual = (e) => {
    e.preventDefault();
    handleCode(manualCode, { manual: true });
  };

  /* ---------------------------------- UI ---------------------------------- */
  const scanning = phase === 'scanning';
  const err = cameraError ? CAMERA_ERRORS[cameraError] : null;
  const feedbackTone = {
    allowed: 'bg-emerald-950 text-emerald-300',
    denied: 'bg-rose-950 text-rose-300',
    failed: 'bg-amber-950 text-amber-300',
    validating: 'bg-brand-900 text-slate-200',
  };
  const feedbackIcon = {
    allowed: 'fa-circle-check',
    denied: 'fa-circle-xmark',
    failed: 'fa-triangle-exclamation',
    validating: 'fa-circle-notch fa-spin',
  };

  return (
    <section ref={rootRef} className="rounded-xl border border-white/[0.08] bg-brand-800 p-5 shadow-card" aria-label="Leitor de QR Code" data-testid="qr-scanner">
      <style>{`
        #${READER_ID}{width:100%;height:100%}
        #${READER_ID} video{width:100%!important;height:100%!important;object-fit:cover}
      `}</style>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Leitor de QR Code</h2>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500" data-testid="scanner-status">
            <span className={`h-1.5 w-1.5 rounded-full ${scanning ? 'bg-emerald-400' : phase === 'starting' ? 'bg-amber-400' : 'bg-slate-500'}`}></span>
            {scanning ? 'Câmera ativa — aponte o QR Code' : phase === 'starting' ? 'Iniciando câmera...' : phase === 'paused' ? 'Câmera pausada' : 'Câmera indisponível'}
          </p>
        </div>
        {(scanning || phase === 'paused') && (
          <button
            type="button"
            onClick={scanning ? pause : resume}
            className={`inline-flex h-8 items-center gap-2 rounded-lg border border-white/[0.1] px-3 text-xs text-slate-300 transition-colors duration-200 hover:border-white/25 hover:text-slate-100 ${FOCUS_RING}`}
          >
            <i className={`fas ${scanning ? 'fa-pause' : 'fa-play'} text-[10px]`}></i>
            {scanning ? 'Pausar' : 'Retomar'}
          </button>
        )}
      </div>

      {/* Área da câmera */}
      <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-xl border border-white/[0.08] bg-black">
        <div id={READER_ID}></div>

        {phase === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-sm text-slate-400">
            <i className="fas fa-circle-notch fa-spin text-lg"></i>
            Iniciando câmera...
          </div>
        )}

        {phase === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-brand-900 px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-slate-400">
              <i className="fas fa-pause"></i>
            </div>
            <p className="text-sm text-slate-300">Câmera pausada</p>
            <button type="button" onClick={resume} className={btnPrimary}>
              <i className="fas fa-play text-xs"></i>
              Retomar leitura
            </button>
          </div>
        )}

        {phase === 'error' && err && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-brand-900 px-6 py-6 text-center" role="alert" data-testid="camera-error" data-kind={cameraError}>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-slate-400">
              <i className={`fas ${err.icon}`}></i>
            </div>
            <p className="text-sm font-medium text-slate-100">{err.title}</p>
            <p className="text-xs leading-relaxed text-slate-500">{err.text}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {cameraError !== 'insecure' && (
                <button type="button" onClick={resume} className={btnSecondary}>
                  <i className="fas fa-rotate-right text-xs"></i>
                  Tentar novamente
                </button>
              )}
              {!manualOpen && (
                <button type="button" onClick={() => setManualOpen(true)} className={btnSecondary}>
                  <i className="fas fa-keyboard text-xs"></i>
                  Código manual
                </button>
              )}
            </div>
          </div>
        )}

        {/* Feedback da validação (cobre a câmera por ~3 s) */}
        {result && (
          <div
            className={`absolute inset-0 flex animate-fade flex-col items-center justify-center gap-2 px-6 text-center motion-reduce:animate-none ${feedbackTone[result.kind]}`}
            role="status"
            aria-live="assertive"
            data-testid="scan-result"
            data-kind={result.kind}
          >
            <i className={`fas ${feedbackIcon[result.kind]} text-5xl`}></i>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{result.title}</p>
            {result.detail && <p className="max-w-xs text-sm opacity-90">{result.detail}</p>}
            {result.kind !== 'validating' && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                <div className="h-full origin-left bg-current opacity-70" style={{ animation: `scan-countdown ${COOLDOWN_MS}ms linear forwards` }}></div>
                <style>{`@keyframes scan-countdown{from{width:100%}to{width:0}}`}</style>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contingência manual */}
      <div className="mt-4">
        {!manualOpen ? (
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className={`text-xs text-slate-500 underline-offset-2 transition-colors duration-200 hover:text-slate-300 hover:underline ${FOCUS_RING} rounded`}
          >
            Problemas com a câmera? Inserir código manualmente
          </button>
        ) : (
          <form onSubmit={submitManual} className="flex items-center gap-2" data-testid="manual-form">
            <label htmlFor="manual-code" className="sr-only">Código do QR Code</label>
            <input
              id="manual-code"
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Cole ou digite o código"
              className={`${inputBase} ${inputOk} flex-1 font-mono`}
            />
            <button type="submit" disabled={!manualCode.trim() || Boolean(result)} className={btnPrimary}>
              Validar
            </button>
            <button type="button" onClick={() => { setManualOpen(false); setManualCode(''); }} className={`${btnSecondary} px-3`} aria-label="Fechar código manual">
              <i className="fas fa-xmark text-xs"></i>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
