import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { validarConvite } from '../../services/portariaService';
import { FOCUS_RING } from '../../constants/dashboard';
import { btnPrimary, btnSecondary, inputBase, inputOk } from '../../constants/ui';

const READER_ID = 'portaria-qr-reader';
const COOLDOWN_MS = 3000; // tempo do feedback na tela antes de liberar o próximo visitante
const REPEAT_GUARD_MS = 4000; // o mesmo código lido de novo logo após o feedback é ignorado
const START_TIMEOUT_MS = 12000; // sem resposta da câmera/permissão nesse prazo = erro (nunca fica preso em "Iniciando")
const LIST_TIMEOUT_MS = 8000; // idem para Html5Qrcode.getCameras()
const SLOW_HINT_MS = 4000; // depois disso mostra a dica sobre o pedido de permissão do navegador

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
  timeout: {
    icon: 'fa-hourglass-half',
    title: 'A câmera não respondeu',
    text: 'O navegador não liberou a câmera a tempo. Se apareceu um pedido de permissão, clique em Permitir e tente novamente.',
  },
  other: {
    icon: 'fa-triangle-exclamation',
    title: 'Não foi possível iniciar a câmera',
    text: 'Tente novamente ou use o código manual abaixo.',
  },
};

// html5-qrcode rejeita ora com Error, ora com string: junta nome + mensagem + texto para classificar
const errorText = (err) => [err?.name, err?.message, typeof err === 'string' ? err : ''].filter(Boolean).join(' ');

const classifyCameraError = (err) => {
  const text = errorText(err);
  if (/StartTimeout/i.test(text)) return 'timeout';
  if (/NotAllowed|Permission|denied/i.test(text)) return 'denied';
  if (/NotFound|DevicesNotFound|no camera|Requested device/i.test(text)) return 'nocamera';
  if (/NotReadable|TrackStart|in use|Could not start video/i.test(text)) return 'busy';
  return 'other';
};

// Promessa que nunca fica pendente para sempre
const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('A câmera não respondeu a tempo'), { name: 'StartTimeout' })), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });

// O <div> alvo precisa estar no DOM antes de Html5Qrcode.start(); espera até ~1,5 s por ele
const waitForReader = async () => {
  for (let i = 0; i < 30; i += 1) {
    const el = document.getElementById(READER_ID);
    if (el?.isConnected) return el;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw Object.assign(new Error('Elemento do leitor não encontrado'), { name: 'ReaderMissing' });
};

// Prefere câmera traseira pelo nome; senão a última da lista (em celulares costuma ser a traseira)
const rankCameras = (cameras) => {
  const score = (c) => (/back|rear|environment|traseira|trás/i.test(c.label || '') ? 2 : /front|frontal|user/i.test(c.label || '') ? 0 : 1);
  return cameras.map((c, i) => ({ c, i })).sort((a, b) => score(b.c) - score(a.c) || b.i - a.i).map((x) => x.c);
};

const STOP_TIMEOUT_MS = 2500; // stop() de uma instância meio iniciada pode nunca resolver: não prende a fila

const safeStop = async (scanner) => {
  if (!scanner) return;
  try {
    const state = scanner.getState();
    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
      await Promise.race([scanner.stop(), new Promise((resolve) => setTimeout(resolve, STOP_TIMEOUT_MS))]);
    }
  } catch {
    /* já parado */
  }
  try {
    scanner.clear();
  } catch {
    /* já limpo */
  }
  // sobras de uma tentativa que falhou (vídeo/canvas) não podem acumular no alvo
  const el = document.getElementById(READER_ID);
  if (el) el.innerHTML = '';
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
  const failedRef = useRef(false); // última partida falhou: a fila NÃO reinicia sozinha (só "Tentar novamente")
  const busyRef = useRef(false); // true = validando ou exibindo feedback
  const lastRef = useRef({ code: '', until: 0 });
  const timerRef = useRef(null);
  const onValidatedRef = useRef(onValidated);
  onValidatedRef.current = onValidated;

  const [phase, setPhase] = useState('starting'); // starting | scanning | paused | error
  const [cameraError, setCameraError] = useState(null);
  const [cameraDetail, setCameraDetail] = useState('');
  const [slow, setSlow] = useState(false);
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
      setCameraDetail('');
    });

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      safeSet(() => {
        setCameraError('insecure');
        setPhase('error');
      });
      return;
    }

    const attempt = { cancelled: false, scanners: [] };
    const config = {
      fps: 10,
      qrbox: (w, h) => {
        const side = Math.floor(Math.min(w, h) * 0.7);
        return { width: side, height: side };
      },
    };
    const onDecode = (text) => handleCodeRef.current(text);

    // Uma instância por tentativa. start() nunca fica pendente: estoura em START_TIMEOUT_MS.
    const tryStart = async (cameraIdOrConstraints) => {
      const scanner = new Html5Qrcode(READER_ID, { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
      attempt.scanners.push(scanner);
      const starting = scanner.start(cameraIdOrConstraints, config, onDecode, () => {});
      // Se uma tentativa "pendurada" resolver tarde demais, a câmera é solta (não fica ligada sem dono)
      starting.then(() => attempt.cancelled && safeStop(scanner), () => {});
      try {
        await withTimeout(starting, START_TIMEOUT_MS);
        return scanner;
      } catch (err) {
        await safeStop(scanner);
        throw err;
      }
    };

    try {
      await waitForReader();
      if (wantRef.current !== 'on' || !mountedRef.current) return; // desmontou/pausou enquanto esperava

      let scanner = null;
      try {
        // facingMode não-exato: traseira quando existe; em notebook/PC cai na webcam disponível.
        // Isto também dispara o pedido de permissão.
        scanner = await tryStart({ facingMode: 'environment' });
      } catch (firstErr) {
        const kind = classifyCameraError(firstErr);
        if (kind === 'denied' || kind === 'timeout') throw firstErr;
        // Fallback: lista as câmeras e tenta uma a uma (câmera única, nomes estranhos, traseira indisponível...)
        const cameras = await withTimeout(Html5Qrcode.getCameras(), LIST_TIMEOUT_MS);
        if (!cameras?.length) throw Object.assign(new Error('Nenhuma câmera encontrada'), { name: 'NotFoundError' });
        let lastErr = firstErr;
        for (const cam of rankCameras(cameras)) {
          if (wantRef.current !== 'on' || !mountedRef.current) return;
          try {
            scanner = await tryStart(cam.id);
            break;
          } catch (err) {
            lastErr = err;
            if (classifyCameraError(err) === 'timeout') throw err;
          }
        }
        if (!scanner) throw lastErr;
      }

      scannerRef.current = scanner; // se pediram parada nesse meio-tempo, o próximo item da fila a executa
      if (wantRef.current !== 'on' || !mountedRef.current) return;
      safeSet(() => setPhase('scanning'));
    } catch (err) {
      attempt.cancelled = true;
      failedRef.current = true;
      scannerRef.current = null;
      // eslint-disable-next-line no-console
      console.warn('[QrScanner] falha ao iniciar a câmera:', err);
      // Mostra o erro ANTES de limpar: a tela nunca fica em "Iniciando câmera..." por causa da limpeza
      safeSet(() => {
        setCameraError(classifyCameraError(err));
        setCameraDetail(errorText(err).trim().slice(0, 140));
        setPhase('error');
      });
      await Promise.all(attempt.scanners.map(safeStop));
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
      if (wantRef.current === 'on' && !scannerRef.current && !failedRef.current) await startCamera();
      else if (wantRef.current === 'off' && scannerRef.current) await stopCamera();
      if (wantRef.current === 'off' && !scannerRef.current) {
        safeSet(() => setPhase((p) => (p === 'error' ? p : 'paused')));
      }
    });
  }, [startCamera, stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    wantRef.current = 'on';
    failedRef.current = false;
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
    failedRef.current = false; // ação explícita do usuário: tenta de novo
    sync();
  }, [sync]);

  // Dica enquanto aguarda: normalmente é o pedido de permissão do navegador
  useEffect(() => {
    setSlow(false);
    if (phase !== 'starting') return undefined;
    const t = setTimeout(() => setSlow(true), SLOW_HINT_MS);
    return () => clearTimeout(t);
  }, [phase]);

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
            {slow && (
              <p className="max-w-[16rem] text-center text-xs text-slate-500" data-testid="camera-slow-hint">
                Se o navegador pedir permissão para usar a câmera, clique em <span className="text-slate-300">Permitir</span>.
              </p>
            )}
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
            {cameraDetail && <p className="break-all font-mono text-[10px] text-slate-600" data-testid="camera-detail">{cameraDetail}</p>}
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
