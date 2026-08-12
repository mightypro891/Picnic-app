import { useEffect, useRef, useState } from 'react';
import { scanTicket, manualLookup } from '../../api/checkin.js';

const GATE_STORAGE_KEY = 'picnic_admin_gate';

export default function Scanner() {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [gate, setGate] = useState(() => localStorage.getItem(GATE_STORAGE_KEY) || 'Main Gate');
  const [editingGate, setEditingGate] = useState(false);
  const lastScanRef = useRef({ text: '', time: 0 });
  const gateRef = useRef(gate);

  useEffect(() => {
    gateRef.current = gate;
    localStorage.setItem(GATE_STORAGE_KEY, gate);
  }, [gate]);

  useEffect(() => {
    let cancelled = false;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode('qr-reader');
      html5QrRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => onScan(decodedText),
          () => {}
        )
        .catch(() => setCameraError('Could not access the camera. Use manual lookup below instead.'));
    });

    return () => {
      cancelled = true;
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onScan(token) {
    const now = Date.now();
    // Debounce repeated frames of the same code and avoid overlapping requests.
    if (busy || (token === lastScanRef.current.text && now - lastScanRef.current.time < 3000)) return;
    lastScanRef.current = { text: token, time: now };
    await runVerification(() => scanTicket(token, gateRef.current));
  }

  async function onManualSubmit(e) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await runVerification(() => manualLookup(manualCode.trim(), gateRef.current));
    setManualCode('');
  }

  async function runVerification(fn) {
    setBusy(true);
    try {
      const data = await fn();
      setResult(data);
    } catch (err) {
      setResult(err.payload || { result: 'INVALID', message: err.message });
    } finally {
      setBusy(false);
      // Auto-return to scanning after a moment so the organizer isn't stuck on the result screen.
      setTimeout(() => setResult((r) => (r ? null : r)), 3500);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Picnic Check-in</h1>
      <p style={{ marginBottom: 16 }}>Point the camera at the student's QR code.</p>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 20, maxWidth: 480, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📍 Gate:</span>
        {editingGate ? (
          <input
            className="input"
            style={{ maxWidth: 200 }}
            value={gate}
            autoFocus
            onChange={(e) => setGate(e.target.value)}
            onBlur={() => setEditingGate(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingGate(false)}
          />
        ) : (
          <>
            <span className="badge badge-approved">{gate}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingGate(true)}>
              Change
            </button>
          </>
        )}
        <p className="hint" style={{ margin: 0, width: '100%' }}>
          Every check-in is tagged with this gate name. All gates share the same ticket ledger, so a ticket
          scanned here can't also be scanned in at another gate.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 24, maxWidth: 480 }}>
        <div className="card" style={{ padding: 16, position: 'relative' }}>
          <div id="qr-reader" ref={scannerRef} style={{ width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }} />
          {cameraError && <p className="error" style={{ marginTop: 12 }}>{cameraError}</p>}

          {result && (
            <div className={`scan-result scan-result--${result.result?.toLowerCase()}`}>
              <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>
                {result.result === 'VALID' && '✓'}
                {result.result === 'ALREADY_CHECKED_IN' && '⚠️'}
                {result.result === 'INVALID' && '❌'}
              </p>
              <h2 style={{ fontSize: '1.2rem', margin: '0 0 4px' }}>
                {result.result === 'VALID' && 'VALID TICKET'}
                {result.result === 'ALREADY_CHECKED_IN' && 'ALREADY CHECKED IN'}
                {result.result === 'INVALID' && 'INVALID TICKET'}
              </h2>
              {result.ticket && (
                <>
                  <p style={{ margin: 0, fontWeight: 600 }}>{result.ticket.fullName} · {result.ticket.level} Level</p>
                  <p style={{ margin: 0 }}>Ticket: {result.ticket.ticketCode}</p>
                  {result.ticket.checkedInGate && (
                    <p style={{ margin: 0 }}>Gate: {result.ticket.checkedInGate}</p>
                  )}
                  {result.ticket.checkedInAt && (
                    <p style={{ margin: 0 }}>Checked in: {new Date(result.ticket.checkedInAt).toLocaleTimeString()}</p>
                  )}
                </>
              )}
              {!result.ticket && <p style={{ margin: 0 }}>{result.message}</p>}
            </div>
          )}
        </div>

        <form className="card" style={{ padding: 20 }} onSubmit={onManualSubmit}>
          <h2 style={{ fontSize: '1rem', marginBottom: 10 }}>Manual Ticket Lookup</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              placeholder="PIC-XXXXXX"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            />
            <button className="btn btn-primary" type="submit" disabled={busy}>Verify</button>
          </div>
          <p className="hint">Fallback if the camera isn't available — enter the ticket ID printed on the student's ticket.</p>
        </form>
      </div>

      <style>{`
        .scan-result {
          position: absolute;
          inset: 0;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
        }
        .scan-result--valid { background: rgba(31,111,78,0.96); color: #fff; }
        .scan-result--already_checked_in { background: rgba(168,114,27,0.96); color: #fff; }
        .scan-result--invalid { background: rgba(179,67,45,0.96); color: #fff; }
      `}</style>
    </div>
  );
}
