/**
 * TallyPrime-style Day Book Screen
 * - Click any row → slide-in voucher detail panel with Edit / Void
 * - Edit opens inline VoucherEdit form (PUT /api/vouchers/:id)
 * - Void calls DELETE /api/vouchers/:id with proper error handling
 * - Keyboard shortcuts locked (capture phase) so F2/F5 don't hit browser
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
// Inline Voucher Edit Form
// ─────────────────────────────────────────────────────────────────────────────
function VoucherEditForm({ voucher, ledgers, branchId, onSaved, onCancel }) {
  const vs = VOUCHER_STYLES[voucher.type] || defaultStyle;
  const [date, setDate]         = useState(voucher.date?.slice(0, 10) || '');
  const [narration, setNarration] = useState(voucher.narration || '');
  const [entries, setEntries]   = useState(() =>
    (voucher.entries || []).map(e => ({
      ledgerId: e.ledgerId || '',
      amount:   String(e.amount || ''),
      type:     e.type || 'Dr',
      tempSearch: e.ledger_name || ledgers.find(l => l.id === e.ledgerId)?.name || '',
      methodAdjustment: e.methodAdjustment || 'On Account',
      refNo:    e.refNo || '',
    }))
  );
  const [saving, setSaving]       = useState(false);
  const [errMsg, setErrMsg]       = useState('');
  const [activeDD, setActiveDD]   = useState(null);
  const [hlIdx, setHlIdx]         = useState(0);

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
      {/* Mini title bar */}
      <div style={{ background: vs.header, color: '#fff', padding: '5px 10px', fontSize: 11, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Edit {voucher.type} Voucher — {voucher.number}</span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, opacity: 0.8 }}>✕</button>
      </div>

      <div style={{ padding: '10px 12px', background: vs.bodyBg }}>
        {/* Date & Narration */}
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

        {/* Entries table */}
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
                      if (e.key === 'ArrowDown') { e.preventDefault(); setHlIdx(p => Math.min(f.length-1, p+1)); }
                      if (e.key === 'ArrowUp')   { e.preventDefault(); setHlIdx(p => Math.max(0, p-1)); }
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

          {/* Add row */}
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
function VoucherDetailPanel({ voucher, ledgers, branchId, onClose, onVoid, onSaved }) {
  const [mode, setMode]         = useState('view'); // 'view' | 'edit'
  const [voidConfirm, setVoidConfirm] = useState(false);
  const [voiding, setVoiding]   = useState(false);
  const [voidErr, setVoidErr]   = useState('');

  const vs = VOUCHER_STYLES[voucher.type] || defaultStyle;

  const drAmt = (voucher.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
  const crAmt = (voucher.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);

  const handleVoid = async () => {
    setVoiding(true); setVoidErr('');
    try {
      const res = await fetch(`/api/vouchers/${voucher.id}`, { method: 'DELETE' });
      if (res.ok) {
        onVoid();
      } else {
        // Try to get the error message from the response
        let msg = `Server returned ${res.status}`;
        try {
          const data = await res.json();
          msg = data.error || data.message || msg;
        } catch {
          // response wasn't JSON — get text
          const txt = await res.text().catch(() => '');
          if (txt) msg = txt.slice(0, 120);
        }
        setVoidErr(msg);
        setVoidConfirm(false);
      }
    } catch (err) {
      setVoidErr(err.message);
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

  return (
    <div style={{ fontFamily: FONT, fontSize: 12 }}>
      {/* Header */}
      <div style={{ background: vs.header, color: '#fff', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 11 }}>
          {voucher.type} Voucher — {voucher.number}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, opacity: 0.8 }}>✕</button>
      </div>

      {/* Meta */}
      <div style={{ padding: '8px 12px', background: vs.bodyBg, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><span style={{ color: '#666', fontSize: 11 }}>Date: </span><strong>{fmtDate(voucher.date)}</strong></div>
          <div><span style={{ color: '#666', fontSize: 11 }}>No.: </span><strong>{voucher.number}</strong></div>
          <div><span style={{ color: '#666', fontSize: 11 }}>Type: </span><strong>{voucher.type}</strong></div>
        </div>
        {voucher.narration && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#555', fontStyle: 'italic' }}>"{voucher.narration}"</div>
        )}
      </div>

      {/* Entries */}
      <div style={{ background: '#fff' }}>
        <div style={{ display: 'flex', background: '#edf1f5', padding: '3px 0', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ flex: 1, padding: '0 10px', fontSize: 10, fontWeight: 700, color: '#555' }}>LEDGER</div>
          <div style={{ width: 50,  padding: '0 8px', fontSize: 10, fontWeight: 700, color: '#555', textAlign: 'center' }}>DR/CR</div>
          <div style={{ width: 110, padding: '0 10px', fontSize: 10, fontWeight: 700, color: '#555', textAlign: 'right' }}>AMOUNT</div>
        </div>
        {(voucher.entries || []).map((e, i) => {
          const name = e.ledger_name || ledgers.find(l => l.id === e.ledgerId)?.name || e.ledgerId;
          return (
            <div key={i} style={{ display: 'flex', borderBottom: `1px solid ${ROW_BORDER}`, background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
              <div style={{ flex: 1, padding: '4px 10px', fontWeight: 600, fontSize: 12 }}>{name}</div>
              <div style={{ width: 50, padding: '4px 8px', textAlign: 'center', fontSize: 11,
                color: e.type === 'Dr' ? '#1a3a6a' : '#6a1a1a', fontWeight: 700 }}>{e.type}</div>
              <div style={{ width: 110, padding: '4px 10px', textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                ₹{fmtAmount(e.amount)}
              </div>
            </div>
          );
        })}
        {/* Total row */}
        <div style={{ display: 'flex', borderTop: `2px solid ${BORDER}`, background: LIGHT_BG }}>
          <div style={{ flex: 1, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#555' }}>Total</div>
          <div style={{ width: 50 }} />
          <div style={{ width: 110, padding: '4px 10px', textAlign: 'right', fontSize: 12, fontWeight: 700 }}>
            ₹{fmtAmount(drAmt || voucher.amount)}
          </div>
        </div>
      </div>

      {/* Void error */}
      {voidErr && (
        <div style={{ margin: '8px 12px 0', padding: '5px 10px', background: '#fff0f0', border: '1px solid #f5a0a0', borderRadius: 2, fontSize: 11, color: '#c00', fontWeight: 600 }}>
          ✗ Void failed: {voidErr}
        </div>
      )}

      {/* Action buttons */}
      {!voidConfirm ? (
        <div style={{ padding: '10px 12px', display: 'flex', gap: 8, borderTop: `1px solid ${BORDER}`, background: vs.bodyBg }}>
          <button onClick={() => setMode('edit')}
            style={{ background: vs.header, color: '#fff', border: 'none', borderRadius: 2, padding: '5px 16px', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', flex: 1 }}>
            ✎ Edit Voucher
          </button>
          <button onClick={() => setVoidConfirm(true)}
            style={{ background: 'none', border: '1px solid #f5a0a0', borderRadius: 2, padding: '5px 14px', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', color: '#c00' }}>
            Void
          </button>
        </div>
      ) : (
        <div style={{ padding: '10px 12px', background: '#fff8f8', borderTop: `1px solid #f5a0a0` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#c00', marginBottom: 8 }}>
            ⚠ Permanently delete this voucher?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleVoid} disabled={voiding}
              style={{ background: '#c00000', color: '#fff', border: 'none', borderRadius: 2, padding: '5px 16px', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: voiding ? 'wait' : 'pointer', flex: 1, opacity: voiding ? 0.7 : 1 }}>
              {voiding ? 'Deleting…' : 'Yes, Void It'}
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
  const [vouchers, setVouchers]       = useState([]);
  const [ledgers, setLedgers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fromDate, setFromDate]       = useState(propFrom || initialDate || today);
  const [toDate, setToDate]           = useState(propTo   || initialDate || today);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [showPeriod, setShowPeriod]   = useState(false);
  const [panelWidth]                  = useState(380);
  const fromRef = useRef(null);
  const toRef   = useRef(null);

  // ── Fetch company
  useEffect(() => {
    if (branchId) {
      fetch('/api/branches').then(r => r.json())
        .then(branches => { const b = branches.find(b => b.id === branchId); if (b?.name) setCompanyName(b.name); })
        .catch(() => {});
    }
    fetch('/api/settings/company').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); }).catch(() => {});
  }, [branchId]);

  // ── Fetch ledgers (for name resolution in edit panel)
  useEffect(() => {
    const q = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/ledgers${q}`).then(r => r.json()).then(setLedgers).catch(() => {});
  }, [branchId]);

  // ── Fetch vouchers
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

  // ── Keyboard shortcuts — capture phase to block F2/F5 browser defaults
  useEffect(() => {
    const APP_KEYS = new Set(['F2', 'F5']);
    const h = (e) => {
      if (APP_KEYS.has(e.key)) e.preventDefault();
      if (e.altKey && ['p','e'].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === 'F2')  { setShowPeriod(p => !p); return; }
      if (e.key === 'F5')  { fetchData(); return; }
      if (e.key === 'Escape' && selectedVoucher) { setSelectedVoucher(null); return; }
      if (e.altKey && e.key.toLowerCase() === 'p') { window.print(); return; }
      if (e.altKey && e.key.toLowerCase() === 'e') { handleExport(); return; }
    };
    window.addEventListener('keydown', h, { capture: true });
    return () => window.removeEventListener('keydown', h, { capture: true });
  }, [vouchers, selectedVoucher, fetchData]);

  // ── Export CSV
  const handleExport = () => {
    const rows = [
      ['Date','Particulars','Vch Type','Vch No.','Debit Amount','Credit Amount'],
      ...vouchers.map(v => {
        const dr = (v.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
        const cr = (v.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);
        return [fmtDate(v.date), v.narration || '', v.type, v.number || '', dr || '', cr || ''];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `DayBook_${fromDate}_to_${toDate}.csv`;
    a.click();
  };

  // ── Totals
  const drTotal = vouchers.reduce((acc, v) => {
    const dr = (v.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
    return acc + (dr || v.amount || 0);
  }, 0);
  const crTotal = vouchers.reduce((acc, v) => {
    const cr = (v.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);
    return acc + cr;
  }, 0);

  const periodLabel = fromDate === toDate
    ? fmtDate(fromDate)
    : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`;

  // ── Refresh selected voucher after edit
  const handleSaved = () => {
    fetchData();
    // Re-select the updated voucher from fresh data
    setSelectedVoucher(null);
  };

  return (
    <div style={s.root}>
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white; } }
        .db-row:hover { background: #eef4fb !important; cursor: pointer; }
        .db-row.sel { background: ${HIGHLIGHT} !important; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
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
        <span style={s.reportPeriod}>{periodLabel}</span>
      </div>
      <div style={s.subHeader}>
        <span style={s.subTitle}>List of All Vouchers — click any row to view / edit</span>
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

      {/* Body: table + slide-in detail panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Main table */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', paddingRight: 90, transition: 'padding-right 0.25s' }}>
          <table style={s.table}>
            <thead>
              <tr style={s.theadRow}>
                <th style={{ ...s.th, width: 80,  textAlign: 'left'    }}>Date</th>
                <th style={{ ...s.th,             textAlign: 'left'    }}>Particulars</th>
                <th style={{ ...s.th, width: 100, textAlign: 'left'    }}>Vch Type</th>
                <th style={{ ...s.th, width: 80,  textAlign: 'center'  }}>Vch No.</th>
                <th style={{ ...s.th, width: 130, textAlign: 'right'   }}>
                  Debit Amount<br /><span style={s.subCol}>Inwards Qty</span>
                </th>
                <th style={{ ...s.th, width: 130, textAlign: 'right'   }}>
                  Credit Amount<br /><span style={s.subCol}>Outwards Qty</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 12 }}>Loading vouchers…</td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 12 }}>No vouchers found for this period.</td></tr>
              ) : vouchers.map(v => {
                const drAmt = (v.entries || []).filter(e => e.type === 'Dr').reduce((a, e) => a + e.amount, 0);
                const crAmt = (v.entries || []).filter(e => e.type === 'Cr').reduce((a, e) => a + e.amount, 0);
                const displayDr = drAmt || (crAmt === 0 ? v.amount : 0);
                const isSelected = selectedVoucher?.id === v.id;
                const vs = VOUCHER_STYLES[v.type];
                return (
                  <tr key={v.id}
                    className={`db-row${isSelected ? ' sel' : ''}`}
                    style={{ ...s.tr, background: isSelected ? HIGHLIGHT : '#fff', borderLeft: isSelected ? `3px solid ${vs?.tab || HEADER_BG}` : '3px solid transparent' }}
                    onClick={() => setSelectedVoucher(isSelected ? null : v)}
                  >
                    <td style={{ ...s.td, color: '#333' }}>{fmtDate(v.date)}</td>
                    <td style={{ ...s.td, fontWeight: 600, color: '#1a1a1a' }}>
                      {v.narration || <span style={{ fontStyle: 'italic', color: '#aaa' }}>(Blank)</span>}
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
                <td colSpan={4} style={{ ...s.tfoot, textAlign: 'right', paddingRight: 8, fontWeight: 700, fontSize: 11 }}>Grand Total</td>
                <td style={{ ...s.tfoot, textAlign: 'right', fontWeight: 700, borderTop: '2px solid #555' }}>{drTotal > 0 ? fmtAmount(drTotal) : ''}</td>
                <td style={{ ...s.tfoot, textAlign: 'right', fontWeight: 700, borderTop: '2px solid #555' }}>{crTotal > 0 ? fmtAmount(crTotal) : ''}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Slide-in Detail Panel */}
        {selectedVoucher && (
          <div className="no-print" style={{
            position: 'absolute', top: 0, right: 90, bottom: 0,
            width: panelWidth,
            background: '#fff',
            borderLeft: `2px solid ${BORDER}`,
            boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
            overflowY: 'auto',
            animation: 'slideIn 0.2s ease',
            zIndex: 50,
          }}>
            <VoucherDetailPanel
              voucher={selectedVoucher}
              ledgers={ledgers}
              branchId={branchId}
              onClose={() => setSelectedVoucher(null)}
              onVoid={() => { setSelectedVoucher(null); fetchData(); }}
              onSaved={handleSaved}
            />
          </div>
        )}

        {/* Right Button Panel */}
        <div style={s.rightPanel} className="no-print">
          {[
            { key: 'F2',    label: 'Period',  action: () => setShowPeriod(true) },
            { key: 'F3',    label: 'Company', action: () => {} },
            { key: 'F5',    label: 'Refresh', action: fetchData },
            { key: 'Alt+P', label: 'Print',   action: () => window.print() },
            { key: 'Alt+E', label: 'Export',  action: handleExport },
            { key: 'Esc',   label: 'Close',   action: () => setSelectedVoucher(null) },
            { key: 'F12',   label: 'Config',  action: () => {} },
          ].map(btn => (
            <button key={btn.key} onClick={btn.action} style={s.sideBtn}>
              <span style={s.sideBtnKey}>{btn.key}</span>
              <span style={s.sideBtnLabel}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div style={s.statusBar} className="no-print">
        <span style={{ color: '#aaa', fontSize: 10 }}>
          {loading ? 'Loading…' : `${vouchers.length} voucher${vouchers.length !== 1 ? 's' : ''}`}
          {selectedVoucher ? ` — viewing ${selectedVoucher.number}` : ''}
        </span>
        <span style={{ color: '#aaa', fontSize: 10 }}>F2: Period  |  F5: Refresh  |  Click row: View/Edit  |  Esc: Close panel</span>
      </div>
    </div>
  );
}

// ── Styles
const s = {
  root: {
    fontFamily: FONT, fontSize: 12, color: '#1a1a1a', background: '#fff',
    display: 'flex', flexDirection: 'column', height: '100%', position: 'relative',
    border: `1px solid ${BORDER}`, borderRadius: 2, overflow: 'hidden',
  },
  titleBar: {
    background: HEADER_BG, color: '#fff', display: 'flex', alignItems: 'center',
    padding: '3px 8px', fontSize: 11, fontWeight: 600, letterSpacing: 0.2, flexShrink: 0,
  },
  titleLeft:   { flex: 1, fontWeight: 700 },
  titleCenter: { flex: 2, textAlign: 'center', fontWeight: 700, fontSize: 12 },
  titleRight:  { flex: 1, textAlign: 'right', cursor: 'pointer', opacity: 0.7, fontSize: 13 },
  reportHeader: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    padding: '6px 12px 2px', background: '#fff', borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
  },
  reportTitle:  { fontSize: 14, fontWeight: 700 },
  reportPeriod: { fontSize: 12, fontWeight: 600, color: '#444' },
  subHeader:    { padding: '1px 12px 3px', background: '#fff', borderBottom: `2px solid ${BORDER}`, flexShrink: 0 },
  subTitle:     { fontSize: 11, fontStyle: 'italic', color: '#555' },
  table:        { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
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
  rightPanel: {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: 90,
    background: '#1a2a3a', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #0d1a2a',
  },
  sideBtn: {
    background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)',
    color: '#cdd5e0', cursor: 'pointer', display: 'flex', flexDirection: 'column',
    alignItems: 'flex-start', padding: '6px 8px', textAlign: 'left', fontFamily: FONT,
    transition: 'background 0.1s', flex: 1,
  },
  sideBtnKey:   { fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 700, lineHeight: 1.2 },
  sideBtnLabel: { fontSize: 11, color: '#d0dae6', fontWeight: 600, lineHeight: 1.3 },
  statusBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '3px 100px 3px 8px', background: '#1a2a3a', borderTop: '1px solid #0d1a2a',
    flexShrink: 0, height: 24,
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
