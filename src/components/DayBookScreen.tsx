/**
 * TallyPrime-style Day Book Screen  v3
 *
 * FIX 1 — Full-height: root uses position:absolute;inset:0 — fills any parent.
 * FIX 2 — ArrowRight moves real DOM focus to the close button inside the panel.
 *          ArrowLeft/Esc returns focus to the table row.
 * FIX 3 — Void is a soft-delete: PATCH /api/vouchers/:id/void  {voided,voidedAt}
 *          Filter toggle: Active / Voided / All
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
  try { const d = parseISO(iso); return isValid(d) ? format(d, 'd-MMM-yy') : iso; }
  catch { return iso; }
}
function fmtAmount(n) {
  if (!n && n !== 0) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Edit Form
// ─────────────────────────────────────────────────────────────────────────────
function VoucherEditForm({ voucher, ledgers, branchId, onSaved, onCancel }) {
  const vs = VOUCHER_STYLES[voucher.type] || defaultStyle;
  const [date, setDate]           = useState(voucher.date?.slice(0, 10) || '');
  const [narration, setNarration] = useState(voucher.narration || '');
  const [entries, setEntries]     = useState(() =>
    (voucher.entries || []).map(e => ({
      ledgerId: e.ledgerId || '',
      amount: String(e.amount || ''),
      type: e.type || 'Dr',
      tempSearch: e.ledger_name || ledgers.find(l => l.id === e.ledgerId)?.name || '',
      methodAdjustment: e.methodAdjustment || 'On Account',
      refNo: e.refNo || '',
    }))
  );
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [activeDD, setActiveDD] = useState(null);
  const [hlIdx, setHlIdx]   = useState(0);

  const getFiltered = search => ledgers.filter(l => l.name.toLowerCase().includes((search || '').toLowerCase()));
  const updateEntry = (idx, patch) => setEntries(prev => { const n = [...prev]; n[idx] = { ...n[idx], ...patch }; return n; });
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
      const res = await fetch(`/api/vouchers/${voucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, narration, branchId,
          entries: valid.map(e => ({ ledgerId: e.ledgerId, amount: Number(e.amount), type: e.type, methodAdjustment: e.methodAdjustment, refNo: e.refNo })),
        }),
      });
      if (res.ok) onSaved();
      else { const d = await res.json().catch(() => ({})); setErrMsg(d.error || `Server error ${res.status}`); }
    } catch (err) { setErrMsg(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ fontFamily: FONT, fontSize: 12 }}>
      <div style={{ background: vs.header, color: '#fff', padding: '5px 10px', fontSize: 11, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Edit {voucher.type} Voucher — {voucher.number}</span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
      </div>
      <div style={{ padding: '10px 12px', background: vs.bodyBg }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={eS.label}>Date</label><span style={eS.colon}>:</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...eS.input, width: 130, fontWeight: 700 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <label style={eS.label}>Narration</label><span style={eS.colon}>:</span>
            <input type="text" value={narration} onChange={e => setNarration(e.target.value)} style={{ ...eS.input, flex: 1 }} placeholder="Narration..." />
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
                  <input id={`edit-lgr-${idx}`} type="text" value={entry.tempSearch}
                    onChange={e => { const m = ledgers.find(l => l.name.toLowerCase() === e.target.value.toLowerCase()); updateEntry(idx, { tempSearch: e.target.value, ledgerId: m ? m.id : '' }); setActiveDD(idx); setHlIdx(0); }}
                    onFocus={() => { setActiveDD(idx); setHlIdx(0); }}
                    onBlur={() => setTimeout(() => setActiveDD(null), 180)}
                    onKeyDown={e => {
                      const f = getFiltered(entry.tempSearch);
                      if (e.key === 'ArrowDown') { e.preventDefault(); setHlIdx(p => Math.min(f.length - 1, p + 1)); }
                      if (e.key === 'ArrowUp')   { e.preventDefault(); setHlIdx(p => Math.max(0, p - 1)); }
                      if ((e.key === 'Enter' || e.key === 'Tab') && activeDD === idx && f[hlIdx]) { e.preventDefault(); handleSelectLedger(idx, f[hlIdx]); }
                      if (e.key === 'Escape') setActiveDD(null);
                    }}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 700, fontFamily: FONT, width: '100%' }}
                    placeholder="Select ledger..." autoComplete="off" />
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
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', color: entry.type === 'Dr' ? '#1a3a6a' : '#6a1a1a', width: '100%' }}>
                    <option value="Dr">Dr</option><option value="Cr">Cr</option>
                  </select>
                </div>
                <div style={{ width: 120, padding: '3px 8px' }}>
                  <input id={`edit-amt-${idx}`} type="number" value={entry.amount}
                    onChange={e => updateEntry(idx, { amount: e.target.value })}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontWeight: 700, fontFamily: FONT, textAlign: 'right', width: '100%' }}
                    placeholder="0.00" />
                </div>
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {entries.length > 1 && <button onClick={() => setEntries(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 11 }}>✕</button>}
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
          <button onClick={onCancel} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 2, padding: '5px 14px', fontSize: 12, fontFamily: FONT, cursor: 'pointer', color: '#555' }}>
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
  input: { border: 'none', borderBottom: '1px solid #aaa', background: 'transparent', outline: 'none', fontSize: 12, fontFamily: FONT, padding: '1px 2px', color: '#1a1a1a' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Voucher Detail Panel
// closeBtnRef — passed in from parent so ArrowRight can focus it directly
// ─────────────────────────────────────────────────────────────────────────────
function VoucherDetailPanel({ voucher, ledgers, branchId, onClose, onVoid, onSaved, closeBtnRef }) {
  const [mode, setMode]           = useState('view');
  const [voidConfirm, setVoidConfirm] = useState(false);
  const [voiding, setVoiding]     = useState(false);
  const [voidErr, setVoidErr]     = useState('');
  const vs = VOUCHER_STYLES[voucher.type] || defaultStyle;
  const isVoided = !!voucher.voided;
  const drAmt = (voucher.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);

  // FIX 3: PATCH /api/vouchers/:id/void
  const handleVoid = async () => {
    setVoiding(true); setVoidErr('');
    try {
      const qs = branchId ? `?branchId=${branchId}` : '';
      const res = await fetch(`/api/vouchers/${voucher.id}/void${qs}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voided: true, voidedAt: new Date().toISOString() }),
      });
      if (res.ok) { onVoid(); return; }
      const ct = res.headers.get('content-type') || '';
      let msg = ct.includes('json')
        ? ((await res.json().catch(() => ({}))).error || '')
        : (await res.text().catch(() => '')).slice(0, 200);
      if (!msg) msg = `Server returned ${res.status}`;
      setVoidErr(msg); setVoidConfirm(false);
    } catch (err) { setVoidErr(`Network error: ${err.message}`); setVoidConfirm(false); }
    finally { setVoiding(false); }
  };

  const handleRestore = async () => {
    try {
      const qs = branchId ? `?branchId=${branchId}` : '';
      const res = await fetch(`/api/vouchers/${voucher.id}/void${qs}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voided: false, voidedAt: null }),
      });
      if (res.ok) onSaved();
      else setVoidErr('Failed to restore voucher.');
    } catch (err) { setVoidErr(`Network error: ${err.message}`); }
  };

  if (mode === 'edit') {
    return <VoucherEditForm voucher={voucher} ledgers={ledgers} branchId={branchId}
      onSaved={() => { setMode('view'); onSaved(); }} onCancel={() => setMode('view')} />;
  }

  return (
    <div style={{ fontFamily: FONT, fontSize: 12 }}>
      <div style={{ background: vs.header, color: '#fff', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 11 }}>
          {voucher.type} Voucher — {voucher.number}
          {isVoided && <span style={{ marginLeft: 8, background: '#c00', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 2 }}>VOIDED</span>}
        </span>
        {/* FIX 2: closeBtnRef here — this is the first button ArrowRight focuses */}
        <button ref={closeBtnRef} onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, opacity: 0.8 }}>✕</button>
      </div>

      <div style={{ padding: '8px 12px', background: isVoided ? '#fff4f4' : vs.bodyBg, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><span style={{ color: '#666', fontSize: 11 }}>Date: </span>
            <strong style={isVoided ? { textDecoration: 'line-through', color: '#aaa' } : {}}>{fmtDate(voucher.date)}</strong></div>
          <div><span style={{ color: '#666', fontSize: 11 }}>No.: </span>
            <strong style={isVoided ? { textDecoration: 'line-through', color: '#aaa' } : {}}>{voucher.number}</strong></div>
          <div><span style={{ color: '#666', fontSize: 11 }}>Type: </span><strong>{voucher.type}</strong></div>
        </div>
        {voucher.narration && <div style={{ marginTop: 4, fontSize: 11, color: '#555', fontStyle: 'italic' }}>"{voucher.narration}"</div>}
        {isVoided && voucher.voidedAt && <div style={{ marginTop: 4, fontSize: 10, color: '#c00', fontWeight: 600 }}>Voided on {fmtDate(voucher.voidedAt)}</div>}
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
          <div style={{ width: 110, padding: '4px 10px', textAlign: 'right', fontSize: 12, fontWeight: 700 }}>₹{fmtAmount(drAmt || voucher.amount)}</div>
        </div>
      </div>

      {voidErr && (
        <div style={{ margin: '8px 12px 0', padding: '6px 10px', background: '#fff0f0', border: '1px solid #f5a0a0', borderRadius: 2, fontSize: 11, color: '#900', fontWeight: 600, lineHeight: 1.5 }}>
          ✗ {voidErr}
        </div>
      )}

      {isVoided ? (
        <div style={{ padding: '10px 12px', borderTop: `1px solid #f5a0a0`, background: '#fff8f8' }}>
          <div style={{ fontSize: 11, color: '#900', fontWeight: 600, marginBottom: 6 }}>This voucher is voided and excluded from reports.</div>
          <button onClick={handleRestore}
            style={{ background: HEADER_BG, color: '#fff', border: 'none', borderRadius: 2, padding: '5px 14px', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer' }}>
            ↩ Restore Voucher
          </button>
        </div>
      ) : !voidConfirm ? (
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
      ) : (
        <div style={{ padding: '10px 12px', background: '#fff8f8', borderTop: `1px solid #f5a0a0` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#c00', marginBottom: 4 }}>⚠ Mark this voucher as voided?</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Kept in database, excluded from reports. Restorable later.</div>
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
export default function DayBookScreen({ branchId, initialDate, fromDate: propFrom, toDate: propTo }) {
  const today = new Date().toISOString().slice(0, 10);
  const [vouchers, setVouchers]               = useState([]);
  const [ledgers, setLedgers]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [fromDate, setFromDate]               = useState(propFrom || initialDate || today);
  const [toDate, setToDate]                   = useState(propTo   || initialDate || today);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [focusedIdx, setFocusedIdx]           = useState(-1);
  const [panelActive, setPanelActive]         = useState(false); // FIX 2
  const [companyName, setCompanyName]         = useState('');
  const [showPeriod, setShowPeriod]           = useState(false);
  const [voidFilter, setVoidFilter]           = useState('Active'); // FIX 3

  const tableBodyRef = useRef(null);
  const closeBtnRef  = useRef(null);  // FIX 2: ref forwarded into the panel header
  const fromRef      = useRef(null);
  const toRef        = useRef(null);

  useEffect(() => {
    if (branchId) {
      fetch('/api/branches').then(r => r.json())
        .then(bs => { const b = bs.find(b => b.id === branchId); if (b?.name) setCompanyName(b.name); }).catch(() => {});
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

  // FIX 3: client-side filter
  const displayedVouchers = vouchers.filter(v => {
    if (voidFilter === 'Active') return !v.voided;
    if (voidFilter === 'Voided') return !!v.voided;
    return true;
  });

  useEffect(() => {
    if (displayedVouchers.length === 0) { setFocusedIdx(-1); return; }
    setFocusedIdx(p => p < 0 ? -1 : Math.min(p, displayedVouchers.length - 1));
  }, [displayedVouchers.length]);

  useEffect(() => {
    if (focusedIdx < 0) return;
    tableBodyRef.current?.querySelector(`[data-row-idx="${focusedIdx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedIdx]);

  // FIX 2: when panelActive becomes true, move real DOM focus to the close button
  useEffect(() => {
    if (panelActive && selectedVoucher) {
      // delay by one frame so the panel has mounted / ref is attached
      const id = setTimeout(() => closeBtnRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [panelActive, selectedVoucher?.id]);

  // Global keyboard
  useEffect(() => {
    const h = e => {
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'F2') { e.preventDefault(); setShowPeriod(p => !p); return; }
      if (e.key === 'F5') { e.preventDefault(); fetchData(); return; }

      if (inInput || showPeriod) return;

      // ── Panel has focus ──
      if (panelActive) {
        if (e.key === 'ArrowLeft' || e.key === 'Escape') {
          e.preventDefault();
          setPanelActive(false);
          setTimeout(() => {
            tableBodyRef.current?.querySelector(`[data-row-idx="${focusedIdx}"]`)?.focus();
          }, 10);
        }
        // All other keys (Tab, Enter, etc.) flow naturally inside the panel
        return;
      }

      // ── Table has focus ──
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx(prev => {
          const next = Math.min(displayedVouchers.length - 1, prev < 0 ? 0 : prev + 1);
          setSelectedVoucher(displayedVouchers[next] || null);
          tableBodyRef.current?.querySelector(`[data-row-idx="${next}"]`)?.focus();
          return next;
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx(prev => {
          const next = Math.max(0, prev - 1);
          setSelectedVoucher(displayedVouchers[next] || null);
          tableBodyRef.current?.querySelector(`[data-row-idx="${next}"]`)?.focus();
          return next;
        });
        return;
      }
      // FIX 2: ArrowRight opens panel AND moves DOM focus into it
      if (e.key === 'ArrowRight' && selectedVoucher) {
        e.preventDefault();
        setPanelActive(true); // useEffect above will call closeBtnRef.current.focus()
        return;
      }
      if (e.key === 'Enter' && focusedIdx >= 0) {
        e.preventDefault();
        const v = displayedVouchers[focusedIdx];
        if (selectedVoucher?.id === v?.id) { setSelectedVoucher(null); }
        else { setSelectedVoucher(v || null); setPanelActive(false); }
        return;
      }
      if (e.key === 'Escape') {
        if (selectedVoucher) { setSelectedVoucher(null); setPanelActive(false); return; }
        if (showPeriod) { setShowPeriod(false); return; }
      }
    };
    window.addEventListener('keydown', h, { capture: true });
    return () => window.removeEventListener('keydown', h, { capture: true });
  }, [displayedVouchers, selectedVoucher, focusedIdx, fetchData, showPeriod, panelActive]);

  const handleExport = () => {
    const rows = [
      ['Date','Particulars','Vch Type','Vch No.','Debit Amount','Credit Amount','Voided'],
      ...displayedVouchers.map(v => {
        const dr=(v.entries||[]).filter(e=>e.type==='Dr').reduce((a,e)=>a+e.amount,0);
        const cr=(v.entries||[]).filter(e=>e.type==='Cr').reduce((a,e)=>a+e.amount,0);
        return [fmtDate(v.date),v.narration||'',v.type,v.number||'',dr||'',cr||'',v.voided?'Yes':''];
      }),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n')],{type:'text/csv'}));
    a.download = `DayBook_${fromDate}_to_${toDate}.csv`;
    a.click();
  };

  const activeForTotals = displayedVouchers.filter(v => !v.voided);
  const drTotal = activeForTotals.reduce((acc,v)=>acc+((v.entries||[]).filter(e=>e.type==='Dr').reduce((a,e)=>a+e.amount,0)||v.amount||0),0);
  const crTotal = activeForTotals.reduce((acc,v)=>acc+(v.entries||[]).filter(e=>e.type==='Cr').reduce((a,e)=>a+e.amount,0),0);
  const periodLabel = fromDate===toDate ? fmtDate(fromDate) : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`;

  return (
    <>
      <style>{`
        /* ── FIX 1: position:absolute;inset:0 fills any parent regardless of its height ── */
        .db-root {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          font-family: ${FONT}; font-size: 12px; color: #1a1a1a; background: #fff;
          border: 1px solid ${BORDER}; border-radius: 2px; overflow: hidden;
        }
        @media print { .no-print{display:none!important} body{background:white} }
        .db-row { outline:none; border-bottom:1px solid ${ROW_BORDER}; transition:background .08s; border-left:3px solid transparent; }
        .db-row:hover { background:#eef4fb!important; cursor:pointer; }
        .db-row.sel   { background:${HIGHLIGHT}!important; }
        .db-row.foc:not(.sel) { background:#deeeff!important; }
        .db-row.void-row td:not(.no-strike) { text-decoration:line-through; color:#bbb!important; }
        .void-badge { display:none; margin-left:5px; font-size:9px; color:#c00;
          border:1px solid #f5a0a0; padding:0 3px; border-radius:2px; vertical-align:middle; font-style:normal; }
        .db-row.void-row .void-badge { display:inline; }
        .vf-btn { border:1px solid ${BORDER}; background:#eef2f7; color:#555;
          font-family:${FONT}; font-size:10px; font-weight:600; padding:2px 9px; cursor:pointer; }
        .vf-btn:first-child{border-radius:2px 0 0 2px}
        .vf-btn:last-child {border-radius:0 2px 2px 0}
        .vf-btn+.vf-btn{border-left:none}
        .vf-btn.act{background:${HEADER_BG};color:#fff;border-color:${HEADER_BG}}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        /* ── FIX 1: panel-wrap uses absolute, not relative to body ── */
        .panel-wrap {
          position: absolute; top: 0; right: 0; bottom: 0; width: 380px;
          background: #fff; border-left: 2px solid ${BORDER};
          box-shadow: -4px 0 20px rgba(0,0,0,.12);
          overflow-y: auto; animation: slideIn .2s ease; z-index: 50;
          transition: border-color .15s, box-shadow .15s;
        }
        .panel-wrap.act { border-left-color:#5590cc; box-shadow:-4px 0 20px rgba(85,144,204,.3); }
      `}</style>

      <div className="db-root">
        {/* Title bar */}
        <div style={{ background:HEADER_BG, color:'#fff', display:'flex', alignItems:'center', padding:'3px 8px', fontSize:11, fontWeight:600, flexShrink:0 }}>
          <span style={{ flex:1, fontWeight:700 }}>Day Book</span>
          <span style={{ flex:2, textAlign:'center', fontWeight:700, fontSize:12 }}>{companyName||'…'}</span>
          <span style={{ flex:1, textAlign:'right', opacity:.7, fontSize:13, cursor:'pointer' }}>✕</span>
        </div>

        {/* Report header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 12px 3px', background:'#fff', borderBottom:`1px solid ${BORDER}`, flexShrink:0 }}>
          <span style={{ fontSize:14, fontWeight:700 }}>Day Book</span>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:10, color:'#777', fontStyle:'italic' }}>Show:</span>
            <div style={{ display:'flex' }}>
              {VOID_FILTERS.map(f=>(
                <button key={f} className={`vf-btn${voidFilter===f?' act':''}`}
                  onClick={()=>{ setVoidFilter(f); setSelectedVoucher(null); setPanelActive(false); }}>{f}</button>
              ))}
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:'#444' }}>{periodLabel}</span>
          </div>
        </div>
        <div style={{ padding:'1px 12px 3px', background:'#fff', borderBottom:`2px solid ${BORDER}`, flexShrink:0 }}>
          <span style={{ fontSize:11, fontStyle:'italic', color:'#555' }}>↑↓ rows · → panel · ← back · Enter toggle · F2 period · F5 refresh</span>
        </div>

        {/* Period modal */}
        {showPeriod && (
          <div className="no-print" style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.4)' }}>
            <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:2, boxShadow:'0 8px 32px rgba(0,0,0,.25)', width:340, overflow:'hidden' }}>
              <div style={{ background:HEADER_BG, color:'#fff', padding:'5px 12px', fontSize:12, fontWeight:700 }}>Change Period (F2)</div>
              <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <label style={{ fontSize:12, color:'#444', width:90, fontStyle:'italic', fontWeight:500 }}>From Date :</label>
                  <input ref={fromRef} type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();toRef.current?.focus();} }}
                    style={{ flex:1, border:'none', borderBottom:'1px solid #999', outline:'none', fontSize:13, fontWeight:700, fontFamily:FONT, padding:'2px', background:'transparent' }} autoFocus />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <label style={{ fontSize:12, color:'#444', width:90, fontStyle:'italic', fontWeight:500 }}>To Date :</label>
                  <input ref={toRef} type="date" value={toDate} onChange={e=>setToDate(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'){setShowPeriod(false);fetchData();} }}
                    style={{ flex:1, border:'none', borderBottom:'1px solid #999', outline:'none', fontSize:13, fontWeight:700, fontFamily:FONT, padding:'2px', background:'transparent' }} />
                </div>
              </div>
              <div style={{ padding:'8px 16px 12px', display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button onClick={()=>{setShowPeriod(false);fetchData();}} style={{ background:'none', border:'none', color:'#00c', cursor:'pointer', fontSize:13, fontWeight:700, textDecoration:'underline' }}>Accept</button>
                <button onClick={()=>setShowPeriod(false)} style={{ background:'none', border:'none', color:'#c00', cursor:'pointer', fontSize:13, fontWeight:700, textDecoration:'underline' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        {/* FIX 1: flex:1 + min-height:0 is the correct CSS pattern for a flex
            child to shrink and scroll rather than overflow. position:relative
            is required so the absolutely-positioned panel-wrap stays inside. */}
        <div style={{ flex:1, minHeight:0, position:'relative', display:'flex' }}>

          {/* Scrollable table area */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'auto',
            marginRight: selectedVoucher ? 382 : 0, transition:'margin-right .2s' }}>
            {/* min-height:100% makes the white bg fill even with 1 row */}
            <div style={{ minHeight:'100%', display:'flex', flexDirection:'column' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
                <thead>
                  <tr style={{ background:LIGHT_BG, borderBottom:`1px solid ${BORDER}`, position:'sticky', top:0, zIndex:10 }}>
                    <th style={{ ...th, width:80,  textAlign:'left'   }}>Date</th>
                    <th style={{ ...th,             textAlign:'left'   }}>Particulars</th>
                    <th style={{ ...th, width:100, textAlign:'left'   }}>Vch Type</th>
                    <th style={{ ...th, width:80,  textAlign:'center' }}>Vch No.</th>
                    <th style={{ ...th, width:130, textAlign:'right'  }}>Debit Amount<br/><span style={{ fontSize:10,fontWeight:400,color:'#777',fontStyle:'italic' }}>Inwards Qty</span></th>
                    <th style={{ ...th, width:130, textAlign:'right'  }}>Credit Amount<br/><span style={{ fontSize:10,fontWeight:400,color:'#777',fontStyle:'italic' }}>Outwards Qty</span></th>
                  </tr>
                </thead>
                <tbody ref={tableBodyRef}>
                  {loading ? (
                    <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'#888', fontStyle:'italic' }}>Loading vouchers…</td></tr>
                  ) : displayedVouchers.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'#888', fontStyle:'italic' }}>No vouchers found for this period.</td></tr>
                  ) : displayedVouchers.map((v, rowIdx) => {
                    const drAmt = (v.entries||[]).filter(e=>e.type==='Dr').reduce((a,e)=>a+e.amount,0);
                    const crAmt = (v.entries||[]).filter(e=>e.type==='Cr').reduce((a,e)=>a+e.amount,0);
                    const displayDr = drAmt||(crAmt===0?v.amount:0);
                    const isSel  = selectedVoucher?.id===v.id;
                    const isFoc  = focusedIdx===rowIdx;
                    const isVoid = !!v.voided;
                    const vs2 = VOUCHER_STYLES[v.type];
                    return (
                      <tr key={v.id} data-row-idx={rowIdx} tabIndex={0}
                        className={`db-row${isSel?' sel':''}${isFoc&&!isSel?' foc':''}${isVoid?' void-row':''}`}
                        style={{
                          background: isSel?HIGHLIGHT:isFoc?'#deeeff':'#fff',
                          borderLeft: isSel?`3px solid ${vs2?.tab||HEADER_BG}`:isFoc?'3px solid #5590cc':'3px solid transparent',
                        }}
                        onClick={()=>{ setFocusedIdx(rowIdx); setPanelActive(false); setSelectedVoucher(isSel?null:v); }}
                        onFocus={()=>setFocusedIdx(rowIdx)}
                        onKeyDown={e=>{
                          if(e.key==='ArrowDown'){ e.preventDefault(); const nx=Math.min(displayedVouchers.length-1,rowIdx+1); setFocusedIdx(nx); setSelectedVoucher(displayedVouchers[nx]); tableBodyRef.current?.querySelector(`[data-row-idx="${nx}"]`)?.focus(); }
                          if(e.key==='ArrowUp'){   e.preventDefault(); const nx=Math.max(0,rowIdx-1); setFocusedIdx(nx); setSelectedVoucher(displayedVouchers[nx]); tableBodyRef.current?.querySelector(`[data-row-idx="${nx}"]`)?.focus(); }
                          if(e.key==='ArrowRight'&&selectedVoucher){ e.preventDefault(); setPanelActive(true); }
                          if(e.key==='Enter'||e.key===' '){ e.preventDefault(); setPanelActive(false); setSelectedVoucher(isSel?null:v); }
                          if(e.key==='Escape'){ setPanelActive(false); setSelectedVoucher(null); }
                        }}
                      >
                        <td style={td}>{fmtDate(v.date)}</td>
                        <td style={{ ...td, fontWeight:600, color:'#1a1a1a' }}>
                          {v.narration||<span style={{ fontStyle:'italic', color:'#aaa' }}>(Blank)</span>}
                          <span className="void-badge">VOID</span>
                        </td>
                        <td style={{ ...td, color:'#555', fontStyle:'italic' }}>{v.type}</td>
                        <td style={{ ...td, textAlign:'center' }}>{v.number||''}</td>
                        <td style={{ ...td, textAlign:'right', fontWeight:displayDr?600:400 }}>{displayDr?fmtAmount(displayDr):''}</td>
                        <td style={{ ...td, textAlign:'right', fontWeight:crAmt?600:400 }}>{crAmt?fmtAmount(crAmt):''}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background:LIGHT_BG, borderTop:`1px solid ${BORDER}`, position:'sticky', bottom:0 }}>
                    <td colSpan={4} style={{ ...td, textAlign:'right', fontWeight:700 }}>Grand Total</td>
                    <td style={{ ...td, textAlign:'right', fontWeight:700, borderTop:'2px solid #555' }}>{drTotal>0?fmtAmount(drTotal):''}</td>
                    <td style={{ ...td, textAlign:'right', fontWeight:700, borderTop:'2px solid #555' }}>{crTotal>0?fmtAmount(crTotal):''}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Slide-in detail panel */}
          {selectedVoucher && (
            <div className={`panel-wrap no-print${panelActive?' act':''}`}
              onMouseDown={()=>setPanelActive(true)}>
              <VoucherDetailPanel
                voucher={selectedVoucher}
                ledgers={ledgers}
                branchId={branchId}
                closeBtnRef={closeBtnRef}
                onClose={()=>{ setSelectedVoucher(null); setPanelActive(false); }}
                onVoid={()=>{ setSelectedVoucher(null); setPanelActive(false); fetchData(); }}
                onSaved={()=>{ fetchData(); setSelectedVoucher(null); }}
              />
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="no-print" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 8px', background:'#1a2a3a', borderTop:'1px solid #0d1a2a', flexShrink:0, height:24 }}>
          <span style={{ color:'#aaa', fontSize:10 }}>
            {loading?'Loading…':`${displayedVouchers.length} voucher${displayedVouchers.length!==1?'s':''} [${voidFilter}]`}
            {selectedVoucher?` — ${selectedVoucher.number}${selectedVoucher.voided?' (voided)':''}${panelActive?' ◀ panel':''}`:''}
            {focusedIdx>=0&&displayedVouchers[focusedIdx]?` — row ${focusedIdx+1}/${displayedVouchers.length}`:''}
          </span>
          <span style={{ color:'#aaa', fontSize:10 }}>↑↓ rows · → panel · ← back · Enter toggle · Esc close · F2 period · F5 refresh</span>
        </div>
      </div>
    </>
  );
}

const th = { padding:'4px 8px', fontSize:11, fontWeight:700, color:'#333', borderBottom:`1px solid ${BORDER}`, borderRight:`1px solid ${ROW_BORDER}`, background:LIGHT_BG, whiteSpace:'nowrap', verticalAlign:'top', lineHeight:1.4 };
const td = { padding:'3px 8px', fontSize:12, verticalAlign:'middle', borderRight:`1px solid ${ROW_BORDER}`, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.5, color:'#333' };
