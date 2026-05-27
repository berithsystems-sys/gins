/**
 * TallyPrime-style Day Book Screen
 * FIXES applied in this version:
 *   FIX-A  Full-height table — scroll area fills all space between sub-header
 *          and status bar regardless of row count.
 *   FIX-B  Soft-delete void — PATCH voided:true; permanent DELETE is gone.
 *          Filter toggle: Active / Voided / All.
 *   FIX-C  ArrowRight focuses the detail panel; ArrowLeft returns to table.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, isValid, parseISO } from 'date-fns';

const FONT       = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
const HEADER_BG  = '#1f4e79';
const HIGHLIGHT  = '#ffd966';
const ROW_BORDER = '#e0e6ee';
const LIGHT_BG   = '#f0f4f8';
const BORDER     = '#b0b8c4';

const VOUCHER_STYLES = {
  Contra:  { header: '#1f4e79', tab: '#2e75b6', bodyBg: '#f0f4f8', rowBg: '#f7f9fb' },
  Payment: { header: '#2d4a22', tab: '#4a7c3f', bodyBg: '#f0f5f0', rowBg: '#f6faf5' },
  Receipt: { header: '#4a2222', tab: '#8b3a3a', bodyBg: '#fdf0f0', rowBg: '#fdf6f6' },
  Journal: { header: '#3d3225', tab: '#7a6040', bodyBg: '#f8f4ee', rowBg: '#faf7f2' },
};
const defaultStyle = VOUCHER_STYLES.Payment;

const VOID_FILTERS = ['Active', 'Voided', 'All'];

function fmtDate(iso) {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, 'd-MMM-yy');
  } catch { return iso; }
}
function fmtAmount(n) {
  if (!n && n !== 0) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Voucher Edit Form (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function VoucherEditForm({ voucher, ledgers, branchId, onSaved, onCancel }) {
  const vs = VOUCHER_STYLES[voucher.type] || defaultStyle;
  const [date, setDate]           = useState(voucher.date?.slice(0, 10) || '');
  const [narration, setNarration] = useState(voucher.narration || '');
  const [entries, setEntries]     = useState(() =>
    (voucher.entries || []).map(e => ({
      ledgerId: e.ledgerId || '',
      amount:   String(e.amount || ''),
      type:     e.type || 'Dr',
      tempSearch: e.ledger_name || ledgers.find(l => l.id === e.ledgerId)?.name || '',
      methodAdjustment: e.methodAdjustment || 'On Account',
      refNo:    e.refNo || '',
    }))
  );
  const [saving, setSaving]     = useState(false);
  const [errMsg, setErrMsg]     = useState('');
  const [activeDD, setActiveDD] = useState(null);
  const [hlIdx, setHlIdx]       = useState(0);

  const getFiltered = (search) => {
    const s = (search || '').toLowerCase();
    return ledgers.filter(l => l.name.toLowerCase().includes(s));
  };

  const updateEntry = (idx, patch) =>
    setEntries(prev => { const n = [...prev]; n[idx] = { ...n[idx], ...patch }; return n; });

  const handleSelectLedger = (idx, ledger) => {
    updateEntry(idx, { ledgerId: ledger.id, tempSearch: ledger.name });
    setActiveDD(null);
    setTimeout(() => document.getElementById(`edit-amt-${idx}`)?.focus(), 20);
  };

  const handleSave = async () => {
    const valid = entries.filter(e => e.ledgerId && e.amount);
    if (!valid.length) { setErrMsg('No valid entries to save.'); return; }
    setSaving(true); setErrMsg('');
    try {
      const payload = {
        date,
        narration,
        branchId,
        entries: valid.map(e => ({
          ledgerId: e.ledgerId,
          amount: Number(e.amount),
          type: e.type,
          methodAdjustment: e.methodAdjustment,
          refNo: e.refNo,
        })),
      };
      const res = await fetch(`/api/vouchers/${voucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrMsg(data.error || `Server error ${res.status}`);
      }
    } catch (err) {
      setErrMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontFamily: FONT, fontSize: 12 }}>
      <div style={{ background: vs.header, color: '#fff', padding: '5px 10px', fontSize: 11, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Edit {voucher.type} Voucher — {voucher.number}</span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, opacity: 0.8 }}>✕</button>
      </div>

      <div style={{ padding: '10px 12px', background: vs.bodyBg }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={eS.label}>Date</label>
            <span style={eS.colon}>:</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...eS.input, width: 130, fontWeight: 700 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <label style={eS.label}>Narration</label>
            <span style={eS.colon}>:</span>
            <input type="text" value={narration} onChange={e => setNarration(e.target.value)}
              style={{ ...eS.input, flex: 1 }} placeholder="Narration..." />
          </div>
        </div>

        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ display: 'flex', background: '#e8ecf0', borderBottom: `1px solid ${BORDER}`, padding: '3px 0' }}>
            <div style={{ flex: 1, padding: '0 8px', fontSize: 11, fontWeight: 700 }}>Ledger Account</div>
            <div style={{ width: 70, padding: '0 8px', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>Dr/Cr</div>
            <div style={{ width: 120, padding: '0 8px', fontSize: 11, fontWeight: 700, textAlign: 'right' }}>Amount</div>
            <div style={{ width: 28 }} />
          </div>

          {entries.map((entry, idx) => {
            const filtered = getFiltered(entry.tempSearch);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${ROW_BORDER}`, background: vs.rowBg, position: 'relative' }}>
                <div style={{ flex: 1, padding: '3px 8px', position: 'relative' }}>
                  <input
                    id={`edit-lgr-${idx}`}
                    type="text"
                    value={entry.tempSearch}
                    onChange={e => {
                      const match = ledgers.find(l => l.name.toLowerCase() === e.target.value.toLowerCase());
                      updateEntry(idx, { tempSearch: e.target.value, ledgerId: match ? match.id : '' });
                      setActiveDD(idx); setHlIdx(0);
                    }}
                    onFocus={() => { setActiveDD(idx); setHlIdx(0); }}
                    onBlur={() => setTimeout(() => setActiveDD(null), 180)}
                    onKeyDown={e => {
                      const f = getFiltered(entry.tempSearch);
                      if (e.key === 'ArrowDown') { e.preventDefault(); setHlIdx(p => Math.min(f.length - 1, p + 1)); }
                      if (e.key === 'ArrowUp')   { e.preventDefault(); setHlIdx(p => Math.max(0, p - 1)); }
                      if ((e.key === 'Enter' || e.key === 'Tab') && activeDD === idx && f[hlIdx]) {
                        e.preventDefault(); handleSelectLedger(idx, f[hlIdx]);
                      }
                      if (e.key === 'Escape') setActiveDD(null);
                    }}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 700, fontFamily: FONT, width: '100%' }}
                    placeholder="Select ledger..."
                    autoComplete="off"
                  />
                  {activeDD === idx && (
                    <div style={{ position: 'absolute', zIndex: 300, left: 0, top: '100%', width: 320, background: '#fff', border: `1px solid ${BORDER}`, boxShadow: '2px 4px 12px rgba(0,0,0,0.15)', maxHeight: 180, overflowY: 'auto' }}>
                      <div style={{ background: HEADER_BG, color: '#fff', padding: '3px 8px', fontSize: 10, fontWeight: 700 }}>List of Ledger Accounts</div>
                      {filtered.length === 0 && <div style={{ padding: '6px 8px', fontSize: 11, color: '#888', fontStyle: 'italic' }}>No matches</div>}
                      {filtered.map((l, i) => (
                        <div key={l.id} onMouseDown={() => handleSelectLedger(idx, l)}
                          style={{ padding: '4px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: hlIdx === i ? '#b3d9ff' : 'transparent', borderBottom: `1px solid #eee` }}>
                          {l.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ width: 70, padding: '3px 4px', textAlign: 'center' }}>
                  <select value={entry.type} onChange={e => updateEntry(idx, { type: e.target.value })}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', color: entry.type === 'Dr' ? '#1a3a6a' : '#6a1a1a', width: '100%', textAlign: 'center' }}>
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
                <div style={{ width: 120, padding: '3px 8px' }}>
                  <input id={`edit-amt-${idx}`} type="number" value={entry.amount}
                    onChange={e => updateEntry(idx, { amount: e.target.value })}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 700, fontFamily: FONT, textAlign: 'right', width: '100%' }}
                    placeholder="0.00" />
                </div>
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {entries.length > 1 && (
                    <button onClick={() => setEntries(p => p.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ padding: '4px 8px', background: vs.bodyBg }}>
            <button onClick={() => setEntries(p => [...p, { ledgerId: '', amount: '', type: 'Dr', tempSearch: '', methodAdjustment: 'On Account', refNo: '' }])}
              style={{ background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 2, color: '#555', cursor: 'pointer', fontSize: 11, padding: '2px 10px', fontFamily: FONT }}>
              + Add Line
            </button>
          </div>
        </div>

        {errMsg && <div style={{ color: '#c00', fontSize: 11, marginBottom: 6, fontWeight: 600 }}>✗ {errMsg}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ background: vs.header, color: '#fff', border: 'none', borderRadius: 2, padding: '5px 18px', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={onCancel}
            style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 2, padding: '5px 14px', fontSize: 12, fontFamily: FONT, cursor: 'pointer', color: '#555' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const eS = {
  label: { fontSize: 11, color: '#555', fontStyle: 'italic', whiteSpace: 'nowrap' },
  colon: { fontSize: 11, color: '#555' },
  input: {
    border: 'none', borderBottom: '1px solid #aaa', background: 'transparent',
    outline: 'none', fontSize: 12, fontFamily: FONT, padding: '1px 2px', color: '#1a1a1a',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Voucher Detail Side Panel
// ─────────────────────────────────────────────────────────────────────────────
function VoucherDetailPanel({ voucher, ledgers, branchId, onClose, onVoid, onSaved, panelRef }) {
  const [mode, setMode]               = useState('view');
  const [voidConfirm, setVoidConfirm] = useState(false);
  const [voiding, setVoiding]         = useState(false);
  const [voidErr, setVoidErr]         = useState('');

  const vs = VOUCHER_STYLES[voucher.type] || defaultStyle;
  const drAmt = (voucher.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);

  // ── FIX-B: Soft-delete void — PATCH voided:true only. No DELETE fallback.
  const handleVoid = async () => {
    setVoiding(true); setVoidErr('');
    try {
      const qs = branchId ? `?branchId=${branchId}` : '';
      const res = await fetch(`/api/vouchers/${voucher.id}${qs}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voided: true, voidedAt: new Date().toISOString() }),
      });

      if (res.ok) { onVoid(); return; }

      let msg = '';
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        msg = data.error || data.message || '';
      } else {
        msg = (await res.text().catch(() => '')).slice(0, 200);
      }
      if (!msg) {
        if (res.status === 404) msg = 'Voucher not found (404). It may have already been voided.';
        else if (res.status === 403) msg = 'You do not have permission to void this voucher (403).';
        else if (res.status === 405) msg = 'Server does not support soft-void (405). Please update server.ts with the PATCH route.';
        else msg = `Server returned ${res.status} ${res.statusText || ''}`.trim();
      }
      setVoidErr(msg);
      setVoidConfirm(false);
    } catch (err) {
      setVoidErr(`Network error: ${err.message}`);
      setVoidConfirm(false);
    } finally {
      setVoiding(false);
    }
  };

  if (mode === 'edit') {
    return (
      <VoucherEditForm
        voucher={voucher}
        ledgers={ledgers}
        branchId={branchId}
        onSaved={() => { setMode('view'); onSaved(); }}
        onCancel={() => setMode('view')}
      />
    );
  }

  const isVoided = !!(voucher.voided || voucher.voided === 1);

  return (
    <div ref={panelRef} tabIndex={-1} style={{ fontFamily: FONT, fontSize: 12, outline: 'none' }}>
      <div style={{ background: vs.header, color: '#fff', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 11 }}>
          {voucher.type} Voucher — {voucher.number}
          {isVoided && <span style={{ marginLeft: 8, background: '#c00', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 2, letterSpacing: 0.5 }}>VOIDED</span>}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, opacity: 0.8 }}>✕</button>
      </div>

      <div style={{ padding: '8px 12px', background: isVoided ? '#fff4f4' : vs.bodyBg, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><span style={{ color: '#666', fontSize: 11 }}>Date: </span><strong style={isVoided ? { textDecoration: 'line-through', color: '#aaa' } : {}}>{fmtDate(voucher.date)}</strong></div>
          <div><span style={{ color: '#666', fontSize: 11 }}>No.: </span><strong style={isVoided ? { textDecoration: 'line-through', color: '#aaa' } : {}}>{voucher.number}</strong></div>
          <div><span style={{ color: '#666', fontSize: 11 }}>Type: </span><strong>{voucher.type}</strong></div>
        </div>
        {voucher.narration && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#555', fontStyle: 'italic' }}>"{voucher.narration}"</div>
        )}
        {isVoided && voucher.voidedAt && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#c00', fontWeight: 600 }}>
            Voided on {fmtDate(voucher.voidedAt)}
          </div>
        )}
      </div>

      <div style={{ background: isVoided ? '#fff8f8' : '#fff', opacity: isVoided ? 0.7 : 1 }}>
        <div style={{ display: 'flex', background: '#edf1f5', padding: '3px 0', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ flex: 1, padding: '0 10px', fontSize: 10, fontWeight: 700, color: '#555' }}>LEDGER</div>
          <div style={{ width: 50, padding: '0 8px', fontSize: 10, fontWeight: 700, color: '#555', textAlign: 'center' }}>DR/CR</div>
          <div style={{ width: 110, padding: '0 10px', fontSize: 10, fontWeight: 700, color: '#555', textAlign: 'right' }}>AMOUNT</div>
        </div>
        {(voucher.entries || []).map((e, i) => {
          const name = e.ledger_name || ledgers.find(l => l.id === e.ledgerId)?.name || e.ledgerId;
          return (
            <div key={i} style={{ display: 'flex', borderBottom: `1px solid ${ROW_BORDER}`, background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
              <div style={{ flex: 1, padding: '4px 10px', fontWeight: 600, fontSize: 12, textDecoration: isVoided ? 'line-through' : 'none', color: isVoided ? '#aaa' : '#1a1a1a' }}>{name}</div>
              <div style={{ width: 50, padding: '4px 8px', textAlign: 'center', fontSize: 11, color: e.type === 'Dr' ? '#1a3a6a' : '#6a1a1a', fontWeight: 700 }}>{e.type}</div>
              <div style={{ width: 110, padding: '4px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: isVoided ? '#aaa' : '#1a1a1a' }}>₹{fmtAmount(e.amount)}</div>
            </div>
          );
        })}
        <div style={{ display: 'flex', borderTop: `2px solid ${BORDER}`, background: LIGHT_BG }}>
          <div style={{ flex: 1, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#555' }}>Total</div>
          <div style={{ width: 50 }} />
          <div style={{ width: 110, padding: '4px 10px', textAlign: 'right', fontSize: 12, fontWeight: 700 }}>
            ₹{fmtAmount(drAmt || voucher.amount)}
          </div>
        </div>
      </div>

      {voidErr && (
        <div style={{ margin: '8px 12px 0', padding: '6px 10px', background: '#fff0f0', border: '1px solid #f5a0a0', borderRadius: 2, fontSize: 11, color: '#900', fontWeight: 600, lineHeight: 1.5 }}>
          ✗ {voidErr}
        </div>
      )}

      {!isVoided && !voidConfirm && (
        <div style={{ padding: '10px 12px', display: 'flex', gap: 8, borderTop: `1px solid ${BORDER}`, background: vs.bodyBg }}>
          <button onClick={() => setMode('edit')}
            style={{ background: vs.header, color: '#fff', border: 'none', borderRadius: 2, padding: '5px 16px', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', flex: 1 }}>
            ✎ Edit Voucher
          </button>
          <button onClick={() => { setVoidErr(''); setVoidConfirm(true); }}
            style={{ background: 'none', border: '1px solid #f5a0a0', borderRadius: 2, padding: '5px 14px', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', color: '#c00' }}>
            Void
          </button>
        </div>
      )}

      {isVoided && (
        <div style={{ padding: '10px 12px', borderTop: `1px solid #f5a0a0`, background: '#fff8f8' }}>
          <div style={{ fontSize: 11, color: '#900', fontWeight: 600, marginBottom: 6 }}>This voucher has been voided and is excluded from reports.</div>
          <button
            onClick={async () => {
              try {
                const qs = branchId ? `?branchId=${branchId}` : '';
                const res = await fetch(`/api/vouchers/${voucher.id}${qs}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ voided: false, voidedAt: null }),
                });
                if (res.ok) onSaved();
                else setVoidErr('Failed to restore voucher.');
              } catch (err) {
                setVoidErr(`Network error: ${err.message}`);
              }
            }}
            style={{ background: HEADER_BG, color: '#fff', border: 'none', borderRadius: 2, padding: '5px 14px', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer' }}>
            ↩ Restore Voucher
          </button>
        </div>
      )}

      {!isVoided && voidConfirm && (
        <div style={{ padding: '10px 12px', background: '#fff8f8', borderTop: `1px solid #f5a0a0` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#c00', marginBottom: 4 }}>
            ⚠ Mark this voucher as voided?
          </div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
            The voucher will be kept in the database but excluded from reports. You can restore it later.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleVoid} disabled={voiding}
              style={{ background: '#c00000', color: '#fff', border: 'none', borderRadius: 2, padding: '5px 16px', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: voiding ? 'wait' : 'pointer', flex: 1, opacity: voiding ? 0.7 : 1 }}>
              {voiding ? 'Voiding…' : 'Yes, Void It'}
            </button>
            <button onClick={() => { setVoidConfirm(false); setVoidErr(''); }}
              style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 2, padding: '5px 14px', fontSize: 12, fontFamily: FONT, cursor: 'pointer', color: '#555' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Day Book Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function DayBookScreen({ branchId, initialDate, fromDate: propFrom, toDate: propTo, user }) {
  const today = new Date().toISOString().slice(0, 10);
  const [vouchers, setVouchers]               = useState([]);
  const [ledgers, setLedgers]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [fromDate, setFromDate]               = useState(propFrom || initialDate || today);
  const [toDate, setToDate]                   = useState(propTo   || initialDate || today);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [focusedIdx, setFocusedIdx]           = useState(-1);
  const [panelFocused, setPanelFocused]       = useState(false);
  const [companyName, setCompanyName]         = useState('');
  const [showPeriod, setShowPeriod]           = useState(false);
  const [voidFilter, setVoidFilter]           = useState('Active');

  const tableBodyRef = useRef(null);
  const panelRef     = useRef(null);
  const fromRef      = useRef(null);
  const toRef        = useRef(null);

  useEffect(() => {
    if (branchId) {
      fetch('/api/branches').then(r => r.json())
        .then(branches => { const b = branches.find(b => b.id === branchId); if (b?.name) setCompanyName(b.name); })
        .catch(() => {});
    }
    fetch('/api/settings/company').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); }).catch(() => {});
  }, [branchId]);

  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/ledgers${q}`).then(r => r.json()).then(setLedgers).catch(() => {});
  }, [branchId]);

  const fetchData = useCallback(() => {
    setLoading(true);
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/vouchers${q}`)
      .then(r => r.json())
      .then(data => {
        const filtered = data.filter(v => {
          if (!v.date) return false;
          const d = v.date.slice(0, 10);
          return d >= fromDate && d <= toDate;
        });
        filtered.sort((a, b) => {
          const dd = a.date.localeCompare(b.date);
          return dd !== 0 ? dd : (a.number || '').localeCompare(b.number || '');
        });
        setVouchers(filtered);
      })
      .catch(() => setVouchers([]))
      .finally(() => setLoading(false));
  }, [branchId, fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Normalise voided — DB returns 0/1 for SQLite, true/false for MySQL
  const isVoided = (v) => v.voided === true || v.voided === 1;

  const displayedVouchers = vouchers.filter(v => {
    if (voidFilter === 'Active')  return !isVoided(v);
    if (voidFilter === 'Voided')  return  isVoided(v);
    return true;
  });

  useEffect(() => {
    if (displayedVouchers.length === 0) { setFocusedIdx(-1); return; }
    setFocusedIdx(prev => prev < 0 ? -1 : Math.min(prev, displayedVouchers.length - 1));
  }, [displayedVouchers.length]);

  useEffect(() => {
    if (focusedIdx < 0) return;
    tableBodyRef.current?.querySelector(`[data-row-idx="${focusedIdx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedIdx]);

  useEffect(() => {
    if (panelFocused && selectedVoucher) panelRef.current?.focus();
  }, [panelFocused, selectedVoucher]);

  useEffect(() => {
    const APP_KEYS = new Set(['F2', 'F5']);
    const h = (e) => {
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (APP_KEYS.has(e.key)) e.preventDefault();
      if (e.altKey && ['p', 'e'].includes(e.key.toLowerCase())) e.preventDefault();

      if (e.key === 'F2') { setShowPeriod(p => !p); return; }
      if (e.key === 'F5') { fetchData(); return; }
      if (e.altKey && e.key.toLowerCase() === 'p') { window.print(); return; }
      if (e.altKey && e.key.toLowerCase() === 'e') { handleExport(); return; }

      if (!inInput && !showPeriod) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (panelFocused) return;
          setFocusedIdx(prev => {
            const next = Math.min(displayedVouchers.length - 1, prev + 1);
            setSelectedVoucher(displayedVouchers[next] || null);
            return next;
          });
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (panelFocused) return;
          setFocusedIdx(prev => {
            const next = Math.max(0, prev - 1);
            setSelectedVoucher(displayedVouchers[next] || null);
            return next;
          });
          return;
        }
        if (e.key === 'ArrowRight' && selectedVoucher && !panelFocused) {
          e.preventDefault(); setPanelFocused(true); return;
        }
        if (e.key === 'ArrowLeft' && panelFocused) {
          e.preventDefault(); setPanelFocused(false);
          tableBodyRef.current?.querySelector(`[data-row-idx="${focusedIdx}"]`)?.focus();
          return;
        }
        if (e.key === 'Enter' && focusedIdx >= 0 && !panelFocused) {
          e.preventDefault();
          const v = displayedVouchers[focusedIdx];
          setSelectedVoucher(sel => sel?.id === v?.id ? null : v || null);
          setPanelFocused(false);
          return;
        }
      }

      if (e.key === 'Escape') {
        if (panelFocused) { setPanelFocused(false); tableBodyRef.current?.querySelector(`[data-row-idx="${focusedIdx}"]`)?.focus(); return; }
        if (selectedVoucher) { setSelectedVoucher(null); setPanelFocused(false); return; }
        if (showPeriod) { setShowPeriod(false); return; }
      }
    };
    window.addEventListener('keydown', h, { capture: true });
    return () => window.removeEventListener('keydown', h, { capture: true });
  }, [displayedVouchers, selectedVoucher, focusedIdx, fetchData, showPeriod, panelFocused]);

  const handleExport = () => {
    const rows = [
      ['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Debit Amount', 'Credit Amount', 'Voided'],
      ...displayedVouchers.map(v => {
        const dr = (v.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
        const cr = (v.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);
        return [fmtDate(v.date), v.narration || '', v.type, v.number || '', dr || '', cr || '', isVoided(v) ? 'Yes' : ''];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `DayBook_${fromDate}_to_${toDate}.csv`;
    a.click();
  };

  const activeForTotals = displayedVouchers.filter(v => !isVoided(v));
  const drTotal = activeForTotals.reduce((acc, v) => {
    const dr = (v.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
    return acc + (dr || v.amount || 0);
  }, 0);
  const crTotal = activeForTotals.reduce((acc, v) => {
    return acc + (v.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);
  }, 0);

  const periodLabel = fromDate === toDate ? fmtDate(fromDate) : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`;
  const handleSaved = () => { fetchData(); setSelectedVoucher(null); };

  return (
    /*
     * FIX-A: Root uses display:flex + flexDirection:column.
     * The body section gets flex:1 + minHeight:0, which forces it to fill
     * all remaining space between the fixed header rows and the status bar.
     * The scroll wrapper inside uses height:100% so the background always
     * extends to the bottom even when there are few rows.
     */
    <div style={s.root} tabIndex={0}
      onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') e.preventDefault(); }}
    >
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white; } }
        .db-row:hover { background: #eef4fb !important; cursor: pointer; }
        .db-row.sel    { background: ${HIGHLIGHT} !important; }
        .db-row.focused:not(.sel) { background: #deeeff !important; outline: none; }
        .db-row.voided-row { opacity: 0.55; }
        .db-row.voided-row td { text-decoration: line-through; color: #999 !important; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .db-row { outline: none; }
        .void-filter-btn { border: 1px solid ${BORDER}; background: #eef2f7; color: #555; font-family: ${FONT}; font-size: 10px; font-weight: 600; padding: 2px 9px; cursor: pointer; transition: background 0.1s; }
        .void-filter-btn:first-child { border-radius: 2px 0 0 2px; }
        .void-filter-btn:last-child  { border-radius: 0 2px 2px 0; }
        .void-filter-btn + .void-filter-btn { border-left: none; }
        .void-filter-btn.active { background: ${HEADER_BG}; color: #fff; border-color: ${HEADER_BG}; }

        /* FIX-A: ensure the table scroll area covers full height visually */
        .db-scroll-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          background: #fff;
          /* background extends behind the sticky tfoot even when rows are few */
        }
        .db-table-wrap {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          background: #fff;
        }
        .db-table-wrap table {
          flex: 1;
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }
        /* Make the tbody grow to fill remaining table space visually */
        .db-table-wrap tbody::after {
          content: '';
          display: table-row;
          height: 100%;
        }
      `}</style>

      {/* Title Bar */}
      <div style={s.titleBar}>
        <span style={s.titleLeft}>Day Book</span>
        <span style={s.titleCenter}>{companyName || '…'}</span>
        <span style={s.titleRight}>✕</span>
      </div>

      {/* Report Header */}
      <div style={s.reportHeader}>
        <span style={s.reportTitle}>Day Book</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#777', fontStyle: 'italic' }}>Show:</span>
            <div style={{ display: 'flex' }}>
              {VOID_FILTERS.map(f => (
                <button key={f} className={`void-filter-btn${voidFilter === f ? ' active' : ''}`}
                  onClick={() => { setVoidFilter(f); setSelectedVoucher(null); }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <span style={s.reportPeriod}>{periodLabel}</span>
        </div>
      </div>
      <div style={s.subHeader}>
        <span style={s.subTitle}>List of All Vouchers — click a row or use ↑↓ to navigate · → to open panel · ← to return</span>
      </div>

      {/* Period Modal */}
      {showPeriod && (
        <div style={s.modalOverlay} className="no-print">
          <div style={s.modal}>
            <div style={s.modalTitle}>Change Period (F2)</div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={s.periodRow}>
                <label style={s.periodLabel}>From Date :</label>
                <input ref={fromRef} type="date" value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); toRef.current?.focus(); } }}
                  style={s.periodInput} autoFocus />
              </div>
              <div style={s.periodRow}>
                <label style={s.periodLabel}>To Date :</label>
                <input ref={toRef} type="date" value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setShowPeriod(false); fetchData(); } }}
                  style={s.periodInput} />
              </div>
            </div>
            <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowPeriod(false); fetchData(); }} style={s.btnYes}>Accept</button>
              <button onClick={() => setShowPeriod(false)} style={s.btnNo}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body — FIX-A: flex:1 + minHeight:0 forces this to fill all remaining height ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {/* Scroll area — FIX-A: transitions margin-right when panel opens */}
        <div
          className="db-scroll-area"
          style={{
            transition: 'margin-right 0.25s',
            marginRight: selectedVoucher ? 382 : 0,
          }}
        >
          {/* FIX-A: wrapper fills full height so bg/border extends even with 0 rows */}
          <div className="db-table-wrap">
            <table>
              <thead>
                <tr style={s.theadRow}>
                  <th style={{ ...s.th, width: 80,  textAlign: 'left'   }}>Date</th>
                  <th style={{ ...s.th,             textAlign: 'left'   }}>Particulars</th>
                  <th style={{ ...s.th, width: 100, textAlign: 'left'   }}>Vch Type</th>
                  <th style={{ ...s.th, width: 80,  textAlign: 'center' }}>Vch No.</th>
                  <th style={{ ...s.th, width: 130, textAlign: 'right'  }}>
                    Debit Amount<br /><span style={s.subCol}>Inwards Qty</span>
                  </th>
                  <th style={{ ...s.th, width: 130, textAlign: 'right'  }}>
                    Credit Amount<br /><span style={s.subCol}>Outwards Qty</span>
                  </th>
                </tr>
              </thead>

              <tbody ref={tableBodyRef}>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 12 }}>Loading vouchers…</td></tr>
                ) : displayedVouchers.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 12 }}>No vouchers found for this period.</td></tr>
                ) : displayedVouchers.map((v, rowIdx) => {
                  const drAmt    = (v.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
                  const crAmt    = (v.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);
                  const displayDr = drAmt || (crAmt === 0 ? v.amount : 0);
                  const isSelected = selectedVoucher?.id === v.id;
                  const isFocused  = focusedIdx === rowIdx;
                  const voided     = isVoided(v);
                  const vs         = VOUCHER_STYLES[v.type];
                  return (
                    <tr
                      key={v.id}
                      data-row-idx={rowIdx}
                      tabIndex={0}
                      className={`db-row${isSelected ? ' sel' : ''}${isFocused && !isSelected ? ' focused' : ''}${voided ? ' voided-row' : ''}`}
                      style={{
                        ...s.tr,
                        background: isSelected ? HIGHLIGHT : isFocused ? '#deeeff' : '#fff',
                        borderLeft: isSelected ? `3px solid ${vs?.tab || HEADER_BG}` : isFocused ? `3px solid #5590cc` : '3px solid transparent',
                      }}
                      onClick={() => {
                        setFocusedIdx(rowIdx);
                        setPanelFocused(false);
                        setSelectedVoucher(isSelected ? null : v);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          const next = Math.min(displayedVouchers.length - 1, rowIdx + 1);
                          setFocusedIdx(next);
                          setSelectedVoucher(displayedVouchers[next]);
                          tableBodyRef.current?.querySelector(`[data-row-idx="${next}"]`)?.focus();
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          const next = Math.max(0, rowIdx - 1);
                          setFocusedIdx(next);
                          setSelectedVoucher(displayedVouchers[next]);
                          tableBodyRef.current?.querySelector(`[data-row-idx="${next}"]`)?.focus();
                        }
                        if (e.key === 'ArrowRight' && selectedVoucher) { e.preventDefault(); setPanelFocused(true); }
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPanelFocused(false); setSelectedVoucher(isSelected ? null : v); }
                        if (e.key === 'Escape') { setPanelFocused(false); setSelectedVoucher(null); }
                      }}
                      onFocus={() => setFocusedIdx(rowIdx)}
                    >
                      <td style={{ ...s.td, color: '#333' }}>{fmtDate(v.date)}</td>
                      <td style={{ ...s.td, fontWeight: 600, color: '#1a1a1a' }}>
                        {v.narration || <span style={{ fontStyle: 'italic', color: '#aaa' }}>(Blank)</span>}
                        {voided && <span style={{ marginLeft: 6, fontSize: 9, color: '#c00', fontWeight: 700, border: '1px solid #f5a0a0', padding: '0 3px', borderRadius: 2, verticalAlign: 'middle' }}>VOID</span>}
                      </td>
                      <td style={{ ...s.td, color: '#555', fontStyle: 'italic' }}>{v.type}</td>
                      <td style={{ ...s.td, textAlign: 'center', color: '#333' }}>{v.number || ''}</td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: displayDr ? 600 : 400 }}>
                        {displayDr ? fmtAmount(displayDr) : ''}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: crAmt ? 600 : 400 }}>
                        {crAmt ? fmtAmount(crAmt) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr style={s.tfootRow}>
                  <td colSpan={4} style={{ ...s.tfoot, textAlign: 'right', paddingRight: 8, fontWeight: 700, fontSize: 11 }}>
                    Grand Total {voidFilter !== 'Active' && <span style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 10 }}>(active only)</span>}
                  </td>
                  <td style={{ ...s.tfoot, textAlign: 'right', fontWeight: 700, borderTop: '2px solid #555' }}>{drTotal > 0 ? fmtAmount(drTotal) : ''}</td>
                  <td style={{ ...s.tfoot, textAlign: 'right', fontWeight: 700, borderTop: '2px solid #555' }}>{crTotal > 0 ? fmtAmount(crTotal) : ''}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Slide-in Detail Panel */}
        {selectedVoucher && (
          <div className="no-print" style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 380,
            background: '#fff',
            borderLeft: `2px solid ${panelFocused ? '#5590cc' : BORDER}`,
            boxShadow: panelFocused ? '-4px 0 20px rgba(85,144,204,0.25)' : '-4px 0 20px rgba(0,0,0,0.12)',
            overflowY: 'auto',
            animation: 'slideIn 0.2s ease',
            zIndex: 50,
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
            onClick={() => setPanelFocused(true)}
          >
            <VoucherDetailPanel
              voucher={selectedVoucher}
              ledgers={ledgers}
              branchId={branchId}
              panelRef={panelRef}
              onClose={() => { setSelectedVoucher(null); setPanelFocused(false); }}
              onVoid={() => { setSelectedVoucher(null); setPanelFocused(false); fetchData(); }}
              onSaved={handleSaved}
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={s.statusBar} className="no-print">
        <span style={{ color: '#aaa', fontSize: 10 }}>
          {loading ? 'Loading…' : `${displayedVouchers.length} voucher${displayedVouchers.length !== 1 ? 's' : ''} [${voidFilter}]`}
          {selectedVoucher ? ` — viewing ${selectedVoucher.number}${isVoided(selectedVoucher) ? ' (voided)' : ''}` : ''}
          {focusedIdx >= 0 && displayedVouchers[focusedIdx] ? ` — row ${focusedIdx + 1} of ${displayedVouchers.length}` : ''}
          {panelFocused ? ' — panel focused' : ''}
        </span>
        <span style={{ color: '#aaa', fontSize: 10 }}>↑↓ Navigate  |  →/← Panel  |  Enter: Open  |  Esc: Close  |  F2: Period  |  F5: Refresh</span>
      </div>
    </div>
  );
}

// ── Styles
const s = {
  root: {
    fontFamily: FONT, fontSize: 12, color: '#1a1a1a', background: '#fff',
    display: 'flex', flexDirection: 'column',
    // FIX-A: height:100% works when parent has a height; add min-height as fallback
    height: '100%', minHeight: 0,
    position: 'relative',
    border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden',
  },
  titleBar: {
    background: HEADER_BG, color: '#fff', display: 'flex', alignItems: 'center',
    padding: '3px 8px', fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    flexShrink: 0,  // never shrink — always visible
  },
  titleLeft:   { flex: 1, fontWeight: 700 },
  titleCenter: { flex: 2, textAlign: 'center', fontWeight: 700, fontSize: 12 },
  titleRight:  { flex: 1, textAlign: 'right', cursor: 'pointer', opacity: 0.7, fontSize: 13 },
  reportHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 12px 3px', background: '#fff', borderBottom: `1px solid ${BORDER}`,
    flexShrink: 0,
  },
  reportTitle:  { fontSize: 14, fontWeight: 700 },
  reportPeriod: { fontSize: 12, fontWeight: 600, color: '#444' },
  subHeader:    { padding: '1px 12px 3px', background: '#fff', borderBottom: `2px solid ${BORDER}`, flexShrink: 0 },
  subTitle:     { fontSize: 11, fontStyle: 'italic', color: '#555' },
  theadRow:     { background: LIGHT_BG, borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 10 },
  th: {
    padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#333',
    borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${ROW_BORDER}`,
    background: LIGHT_BG, whiteSpace: 'nowrap', verticalAlign: 'top', lineHeight: 1.4,
  },
  subCol: { fontSize: 10, fontWeight: 400, color: '#777', fontStyle: 'italic' },
  tr:  { borderBottom: `1px solid ${ROW_BORDER}`, transition: 'background 0.08s' },
  td: {
    padding: '3px 8px', fontSize: 12, verticalAlign: 'middle',
    borderRight: `1px solid ${ROW_BORDER}`, whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.5,
  },
  tfootRow: { background: LIGHT_BG, borderTop: `1px solid ${BORDER}`, position: 'sticky', bottom: 0 },
  tfoot:    { padding: '4px 8px', fontSize: 12, borderRight: `1px solid ${ROW_BORDER}` },
  statusBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '3px 8px', background: '#1a2a3a', borderTop: '1px solid #0d1a2a',
    flexShrink: 0, height: 24,   // always pinned to bottom, never squeezed
  },
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 300, display: 'flex',
    alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)',
  },
  modal: {
    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2,
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)', width: 340, overflow: 'hidden',
  },
  modalTitle:   { background: HEADER_BG, color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 700 },
  periodRow:    { display: 'flex', alignItems: 'center', gap: 8 },
  periodLabel:  { fontSize: 12, color: '#444', width: 90, fontStyle: 'italic', fontWeight: 500 },
  periodInput:  {
    flex: 1, border: 'none', borderBottom: '1px solid #999', outline: 'none',
    fontSize: 13, fontWeight: 700, fontFamily: FONT, padding: '2px 2px',
    background: 'transparent', color: '#1a1a1a',
  },
  btnYes: { background: 'none', border: 'none', color: '#0000cc', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px' },
  btnNo:  { background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: 'underline', padding: '2px 4px' },
};
