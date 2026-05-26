/**
 * TallyPrime-style Voucher Entry Screen
 * 
 * Implements:
 * 1. Removed function of Sales and Purchase buttons (only Contra, Payment, Receipt, Journal).
 * 2. Directly type ledger name in ACCOUNT selected / auto-selected on exact typing or Enter.
 * 3. Soft, subtle, slightly glossy backgrounds for each voucher type (grey, slate, pearl, mist).
 * 4. Hitting Enter on empty/last row goes straight to Narration instead of adding new ledger rows.
 * 5. Accept Yes/No popup modal before saving.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface Ledger {
  id: string;
  name: string;
  group_name?: string;
  openingBalance?: number;
  balanceType?: 'Dr' | 'Cr';
}

interface Entry {
  ledgerId: string;
  amount: string;
  type: 'Dr' | 'Cr';
  tempSearch: string;
}

const DEFAULT_ENTRY: Entry = {
  ledgerId: '',
  amount: '',
  type: 'Dr',
  tempSearch: '',
};

type VoucherType = 'Contra' | 'Payment' | 'Receipt' | 'Journal';

// Subtle, sophisticated, slightly glossy background gradient palettes for each voucher type
const VOUCHER_THEMES: Record<VoucherType, { background: string; cardBg: string; shadow: string; headerColor: string }> = {
  Contra: {
    background: 'linear-gradient(135deg, #f1f3f6 0%, #e4e8ed 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    shadow: '0 8px 30px rgba(31, 78, 121, 0.08)',
    headerColor: '#2b4c6f',
  },
  Payment: {
    background: 'linear-gradient(135deg, #f7f5f2 0%, #ebe5df 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    shadow: '0 8px 30px rgba(122, 0, 0, 0.05)',
    headerColor: '#1f4e79',
  },
  Receipt: {
    background: 'linear-gradient(135deg, #f0f4f2 0%, #dfede5 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    shadow: '0 8px 30px rgba(0, 107, 0, 0.05)',
    headerColor: '#1d5e3a',
  },
  Journal: {
    background: 'linear-gradient(135deg, #f4f3f6 0%, #e5e3eb 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    shadow: '0 8px 30px rgba(100, 50, 150, 0.06)',
    headerColor: '#4d2b6f',
  },
};

const FONT    = `-apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
const BORDER  = '#b8c4cc';
const ROW_BDR = '#e0e6ee';

interface VoucherScreenProps {
  ledgers: Ledger[];
  onBack: () => void;
  onRefreshLedgers?: () => void;
}

export default function VoucherScreen({ ledgers, onBack, onRefreshLedgers }: VoucherScreenProps) {
  const [type, setType] = useState<VoucherType>('Payment');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState<Entry[]>([ { ...DEFAULT_ENTRY } ]);
  
  // Account field (for Single Entry Mode of Payment, Receipt, Contra)
  const [accountSearch, setAccountSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [showAccountDd, setShowAccountDd] = useState(false);
  const [acHighlightedIdx, setAcHighlightedIdx] = useState(0);

  // Particulars rows autocomplete dropdown indices
  const [activeRowDdIdx, setActiveRowDdIdx] = useState<number | null>(null);
  const [rowHighlightedIdx, setRowHighlightedIdx] = useState(0);

  // Configuration (single entry mode active by default for single account transactions)
  const [singleEntryMode, setSingleEntryMode] = useState(true);

  // Confirmation Yes/No popup state
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  const accountRef = useRef<HTMLInputElement>(null);
  const narrationRef = useRef<HTMLTextAreaElement>(null);

  // 1. Initial Account Field Auto-focus on entry
  useEffect(() => {
    if (singleEntryMode && type !== 'Journal') {
      accountRef.current?.focus();
    }
  }, [type, singleEntryMode]);

  // Filters for Cash / Bank groups in the Tally system for "Account" section
  const cashBankLedgers = useMemo(() => {
    return ledgers.filter(l => {
      const g = l.group_name?.toLowerCase() || '';
      const nameLower = (l.name || '').toLowerCase();
      return g.includes('cash') || g.includes('bank') || nameLower.includes('cash') || nameLower.includes('bank');
    });
  }, [ledgers]);

  // Standard selectable ledgers for row tables
  const rowLedgers = useMemo(() => {
    return ledgers.filter(l => l.id !== accountId);
  }, [ledgers, accountId]);

  // Compute live current balance of focused ledgers
  const formatBalance = (id: string) => {
    const l = ledgers.find(x => x.id === id);
    if (!l) return '0.00 Dr';
    return `${Math.abs(l.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${l.balanceType || 'Dr'}`;
  };

  // Switch voucher type
  const handleTypeChange = (t: VoucherType) => {
    setType(t);
    // Reset fields cleanly
    setEntries([{ ...DEFAULT_ENTRY }]);
    setAccountSearch('');
    setAccountId('');
    setNarration('');
    setShowAccountDd(false);
    setActiveRowDdIdx(null);
  };

  // Check matching / auto selection when typing in Account Search directly
  const filteredAccounts = useMemo(() => {
    const q = accountSearch.toLowerCase().trim();
    if (!q) return cashBankLedgers;
    return cashBankLedgers.filter(l => (l.name || '').toLowerCase().includes(q));
  }, [cashBankLedgers, accountSearch]);

  // Auto-fill account upon change when typing exact match
  useEffect(() => {
    const q = accountSearch.toLowerCase().trim();
    if (q) {
      const match = cashBankLedgers.find(l => (l.name || '').toLowerCase() === q);
      if (match && match.id !== accountId) {
        setAccountId(match.id);
      }
    }
  }, [accountSearch, cashBankLedgers, accountId]);

  // Add new ledger entry row (with default balance counter type Dr/Cr)
  const handleAddEntryRow = useCallback((currentEntriesList: Entry[]) => {
    const nextType: 'Dr' | 'Cr' = type === 'Receipt' ? 'Cr' : 'Dr';
    setEntries([...currentEntriesList, { ...DEFAULT_ENTRY, type: nextType }]);
    setTimeout(() => {
      const nextIdx = currentEntriesList.length;
      document.getElementById(`ledger-input-${nextIdx}`)?.focus();
    }, 40);
  }, [type]);

  // Remove ledger row
  const handleRemoveEntryRow = (idx: number) => {
    if (entries.length > 1) {
      setEntries(prev => prev.filter((_, i) => i !== idx));
    }
  };

  // Keyboard controls for Account input
  const handleAccountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowAccountDd(true);
      setAcHighlightedIdx(prev => Math.min(filteredAccounts.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAcHighlightedIdx(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredAccounts[acHighlightedIdx]) {
        const sel = filteredAccounts[acHighlightedIdx];
        setAccountId(sel.id);
        setAccountSearch(sel.name);
        setShowAccountDd(false);
        // Move focus directly to first ledger rows input
        setTimeout(() => {
          document.getElementById('ledger-input-0')?.focus();
        }, 50);
      } else if (accountSearch.trim()) {
        // Attempt exact fallback match or first match
        const bestMatch = filteredAccounts[0];
        if (bestMatch) {
          setAccountId(bestMatch.id);
          setAccountSearch(bestMatch.name);
          setShowAccountDd(false);
          setTimeout(() => {
            document.getElementById('ledger-input-0')?.focus();
          }, 50);
        }
      }
    } else if (e.key === 'Escape') {
      setShowAccountDd(false);
    }
  };

  // Select Row ledger
  const handleSelectRowLedger = (idx: number, l: Ledger) => {
    setEntries(prev => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        ledgerId: l.id,
        tempSearch: l.name
      };
      return next;
    });
    setActiveRowDdIdx(null);
    setTimeout(() => {
      document.getElementById(`amount-input-${idx}`)?.focus();
    }, 40);
  };

  // Main navigation action handler for ledger row field
  const handleRowLedgerKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const query = entries[idx].tempSearch || '';
    const filteredRows = rowLedgers.filter(l => (l.name || '').toLowerCase().includes(query.toLowerCase()));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveRowDdIdx(idx);
      setRowHighlightedIdx(prev => Math.min(filteredRows.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setRowHighlightedIdx(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      // Feature 4: Twice Enter - If the ledger input field is fully blank or empty, press Enter key to skip directly to Narration!
      if (!query.trim() && !entries[idx].ledgerId) {
        narrationRef.current?.focus();
        return;
      }

      if (activeRowDdIdx === idx && filteredRows[rowHighlightedIdx]) {
        handleSelectRowLedger(idx, filteredRows[rowHighlightedIdx]);
      } else if (entries[idx].ledgerId) {
        // Move directly to amount
        document.getElementById(`amount-input-${idx}`)?.focus();
      } else {
        // Auto-select first matching row ledger
        const firstMatch = filteredRows[0];
        if (firstMatch) {
          handleSelectRowLedger(idx, firstMatch);
        }
      }
    } else if (e.key === 'Escape') {
      setActiveRowDdIdx(null);
    }
  };

  // Row Amount Enter behavior
  const handleAmountKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Feature 4: Pressing Enter after completing amount: 
      // If we already filled this, pressing Enter when there are no more ledgers to enter goes to narration!
      // But if we want to add another ledger, we can go to next row ledger input.
      // Wait, the client says: "IF WE ENTER OR PRESS TWO TIME ENTER KEY THEN IT WILL GOES TO THE NARRATION, NO NEED TO ADD NEW LEDGER FIELD AGAIN. MEANS, BY PRESSING TWICE ENTER KEY IT WILL NOT ADD NEW LEDGER INSTEAD IT WILL GO TO THE NEXT NARRATION"
      // If amount isn't blank, we can create/focus the next row BUT if they hit Enter again on empty ledger input, it immediately jumps to Narration.
      if (entries[idx].amount.trim()) {
        const nextIdx = idx + 1;
        // Check if there is already a row for nextIdx
        if (nextIdx < entries.length) {
          document.getElementById(`ledger-input-${nextIdx}`)?.focus();
        } else {
          // Instead of auto-generating next field, let's create a blank row. Hitting enter again here will be blank and thus jump to Narration on Feature 4!
          // We add a new row
          handleAddEntryRow(entries);
        }
      }
    }
  };

  const handleOpenConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (singleEntryMode && type !== 'Journal' && !accountId) {
      alert('Please select an Account (Cash/Bank)');
      return;
    }
    // Verify at least one ledger entry is present
    const valid = entries.filter(item => item.ledgerId && item.amount);
    if (valid.length === 0) {
      alert('Please select at least one ledger with a valid amount');
      return;
    }
    setShowConfirmPopup(true);
  };

  const executeSaveVoucher = () => {
    setShowConfirmPopup(false);

    // Save Voucher into localStorage fallbacks & notify user
    const dateStr = date;
    const typeStr = type;
    const totalAmount = entries.reduce((acc, el) => acc + (parseFloat(el.amount) || 0), 0);

    // Save
    const storedVouchers = localStorage.getItem('tally_vouchers_v1') || '[]';
    const vouchersList = JSON.parse(storedVouchers);
    const newVoucher = {
      id: Math.random().toString(36).substring(2, 9),
      date: dateStr,
      type: typeStr,
      narration: narration,
      amount: totalAmount,
      entries: entries.map(x => ({
        ledgerId: x.ledgerId,
        amount: parseFloat(x.amount) || 0,
        type: x.type
      }))
    };
    vouchersList.push(newVoucher);
    localStorage.setItem('tally_vouchers_v1', JSON.stringify(vouchersList));

    // Save newly updated balances back for our mock system
    const storedLedgers = localStorage.getItem('tally_ledgers_v1') || '[]';
    let ledgersList: Ledger[] = JSON.parse(storedLedgers);
    if (!ledgersList.length) ledgersList = ledgers;

    // Adjust ledger balances by simple debit/credit accounting logic
    // Add debit to standard ledgers
    entries.forEach(e => {
      ledgersList = ledgersList.map(l => {
        if (l.id === e.ledgerId) {
          const transAmt = parseFloat(e.amount) || 0;
          const currentBal = l.openingBalance || 0;
          // Dr/Cr alignment calculations
          const factor = e.type === l.balanceType ? 1 : -1;
          const nextBal = currentBal + (transAmt * factor);
          return {
            ...l,
            openingBalance: Math.max(0, Math.abs(nextBal)),
            balanceType: nextBal >= 0 ? l.balanceType : (l.balanceType === 'Dr' ? 'Cr' : 'Dr')
          };
        }
        return l;
      });
    });

    // Same adjustments for Contra / Account select ledger
    if (accountId) {
      ledgersList = ledgersList.map(l => {
        if (l.id === accountId) {
          const transAmt = totalAmount;
          const currentBal = l.openingBalance || 0;
          // Since it's Single Entry Mode: Receipt adds to Account (debit), Payment subtracts (credit)
          const isDebitType = type === 'Receipt' || type === 'Contra'; 
          const entryType: 'Dr' | 'Cr' = isDebitType ? 'Dr' : 'Cr';
          const factor = entryType === l.balanceType ? 1 : -1;
          const nextBal = currentBal + (transAmt * factor);
          return {
            ...l,
            openingBalance: Math.max(0, Math.abs(nextBal)),
            balanceType: nextBal >= 0 ? l.balanceType : (l.balanceType === 'Dr' ? 'Cr' : 'Dr')
          };
        }
        return l;
      });
    }

    localStorage.setItem('tally_ledgers_v1', JSON.stringify(ledgersList));
    if (onRefreshLedgers) onRefreshLedgers();

    // Reset components & notify success
    alert('Voucher successfully created and ledger opening balances adjusted!');
    
    // Clear page
    setEntries([{ ...DEFAULT_ENTRY }]);
    setAccountSearch('');
    setAccountId('');
    setNarration('');
  };

  const curTheme = VOUCHER_THEMES[type];

  return (
    <div style={{ ...s.wrapper, background: curTheme.background }}>
      
      {/* ── Title Bar ── */}
      <div style={s.titleBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={s.btnX} onClick={onBack}>← Back to List</button>
          <span style={{ fontWeight: 700 }}>Voucher Entry Mode</span>
        </div>
        <span style={{ fontWeight: 800 }}>Bhavani Enterprises</span>
        <span style={{ opacity: 0.8, fontSize: 11 }}>Voucher No: 1A</span>
      </div>

      {/* ── Subheader Action Tab Bar ── */}
      <div style={s.tabBarRow} className="no-print">
        <div style={{ display: 'flex', gap: 2 }}>
          {(['Contra', 'Payment', 'Receipt', 'Journal'] as VoucherType[]).map(t => {
            const isSel = type === t;
            return (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                style={{
                  ...s.tabBtn,
                  background: isSel ? curTheme.headerColor : '#e6e9ed',
                  color: isSel ? '#fff' : '#1a1a1a',
                  boxShadow: isSel ? '0px -2px 10px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: isSel ? 700 : 500
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontStyle: 'italic', color: '#555' }}>Voucher Date :</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={s.dateInputSelect}
          />
        </div>
      </div>

      {/* ── Main Frame card ── */}
      <div style={{ ...s.contentCard, background: curTheme.cardBg, boxShadow: curTheme.shadow }}>
        
        {/* Single Entry Mode Account Selector (Only if not Journal page) */}
        {singleEntryMode && type !== 'Journal' && (
          <div style={s.accountBox}>
            <div style={s.accRowContainer}>
              <span style={s.labelBold}>Account (Cash/Bank)</span>
              <span style={{ padding: '0 8px', color: '#999' }}>:</span>
              
              <div style={{ position: 'relative', width: 340 }}>
                <input
                  ref={accountRef}
                  placeholder="Type Cash or Bank Ledger Name directly..."
                  value={accountSearch}
                  onChange={e => {
                    setAccountSearch(e.target.value);
                    setAccountId('');
                    setShowAccountDd(true);
                    setAcHighlightedIdx(0);
                  }}
                  onFocus={() => setShowAccountDd(true)}
                  onBlur={() => setTimeout(() => setShowAccountDd(false), 200)}
                  onKeyDown={handleAccountKeyDown}
                  style={s.accInput}
                />

                {/* Account Drodown list */}
                {showAccountDd && filteredAccounts.length > 0 && (
                  <div style={s.dropdownList}>
                    <div style={s.dropdownHdr}>List of Cash/Bank Accounts</div>
                    {filteredAccounts.map((item, idx) => {
                      const isHighlighted = idx === acHighlightedIdx;
                      return (
                        <div
                          key={item.id}
                          style={{
                            ...s.dropdownItem,
                            background: isHighlighted ? '#1f4e79' : 'transparent',
                            color: isHighlighted ? '#fff' : '#1a1a1a'
                          }}
                          onMouseDown={() => {
                            setAccountId(item.id);
                            setAccountSearch(item.name);
                            setShowAccountDd(false);
                            setTimeout(() => {
                              document.getElementById('ledger-input-0')?.focus();
                            }, 50);
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: 11, opacity: 0.8 }}>{formatBalance(item.id)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {accountId && (
              <div style={s.valRowBalance}>
                <span>Current Balance :</span>
                <span style={{ fontWeight: 700, marginLeft: 6, color: '#333' }}>{formatBalance(accountId)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Table Ledger Entry Section ── */}
        <div style={s.tableContainer}>
          <div style={s.tableHeaderRow}>
            <div style={{ ...s.th, flex: 2 }}>Particulars / Ledger Accounts</div>
            <div style={{ ...s.th, width: 150, textAlign: 'right' }}>Amount (Dr/Cr)</div>
          </div>

          <div style={s.tableContentBody}>
            {entries.map((item, idx) => {
              const query = item.tempSearch || '';
              const filteredRows = rowLedgers.filter(l => (l.name || '').toLowerCase().includes(query.toLowerCase()));
              const isDdActive = activeRowDdIdx === idx;

              return (
                <div key={idx} style={s.entryRow}>
                  {/* Particulars Selection Column */}
                  <div style={{ flex: 2, position: 'relative', borderRight: `1px solid ${ROW_BDR}`, padding: '4px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        id={`ledger-input-${idx}`}
                        placeholder="Type ledger name directly..."
                        value={item.tempSearch || (ledgers.find(l => l.id === item.ledgerId)?.name || '')}
                        onChange={e => {
                          const val = e.target.value;
                          setEntries(prev => {
                            const n = [...prev];
                            const match = ledgers.find(l => (l.name || '').toLowerCase() === val.toLowerCase());
                            n[idx] = { ...n[idx], tempSearch: val, ledgerId: match ? match.id : '' };
                            return n;
                          });
                          setActiveRowDdIdx(idx);
                          setRowHighlightedIdx(0);
                        }}
                        onFocus={() => {
                          setActiveRowDdIdx(idx);
                          setRowHighlightedIdx(0);
                        }}
                        onBlur={() => setTimeout(() => {
                          if (activeRowDdIdx === idx) setActiveRowDdIdx(null);
                        }, 200)}
                        onKeyDown={e => handleRowLedgerKeyDown(e, idx)}
                        style={s.rowInput}
                      />
                      {entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEntryRow(idx)}
                          style={s.rowDelBtn}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Current Balance Row status line below */}
                    {item.ledgerId && (
                      <div style={s.statusBalIndicator}>
                        <span>Balance : {formatBalance(item.ledgerId)}</span>
                      </div>
                    )}

                    {/* Autocomplete Dropdown list */}
                    {isDdActive && filteredRows.length > 0 && (
                      <div style={s.dropdownList}>
                        <div style={s.dropdownHdr}>List of Ledger Accounts</div>
                        {filteredRows.map((l, i) => {
                          const isHighlighted = i === rowHighlightedIdx;
                          return (
                            <div
                              key={l.id}
                              style={{
                                ...s.dropdownItem,
                                background: isHighlighted ? curTheme.headerColor : 'transparent',
                                color: isHighlighted ? '#fff' : '#1a1a1a'
                              }}
                              onMouseDown={() => handleSelectRowLedger(idx, l)}
                            >
                              <span style={{ fontWeight: 600 }}>{l.name}</span>
                              <span style={{ fontSize: 11, opacity: 0.8 }}>{formatBalance(l.id)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Width Amount Field Column */}
                  <div style={{ width: 150, padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <input
                      id={`amount-input-${idx}`}
                      type="number"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={e => {
                        const val = e.target.value;
                        setEntries(prev => {
                          const n = [...prev];
                          n[idx] = { ...n[idx], amount: val };
                          return n;
                        });
                      }}
                      onKeyDown={e => handleAmountKeyDown(e, idx)}
                      style={s.amountRowInput}
                    />
                    {item.amount && (
                      <span style={{ fontSize: 9, color: '#666', marginTop: 2, fontWeight: 'bold' }}>
                        {item.type}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={s.tableFooterTotal}>
            <div style={{ flex: 2, textAlign: 'right', paddingRight: 12, fontWeight: 700 }}>Total :</div>
            <div style={{ width: 150, textAlign: 'right', fontWeight: 800, color: '#1a1a1a', fontSize: 13 }}>
              ₹ {entries.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* ── Narration Entry Panel ── */}
        <div style={s.narrationBox}>
          <span style={s.labelBold}>Narration :</span>
          <textarea
            ref={narrationRef}
            rows={2}
            value={narration}
            onChange={e => setNarration(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleOpenConfirm();
              }
            }}
            placeholder="Enter standard narration context details..."
            style={s.narrationTextarea}
          />
        </div>

        {/* Action Button Controls */}
        <div style={s.actionRow}>
          <button
            type="button"
            onClick={() => handleAddEntryRow(entries)}
            style={s.addBtnLine}
          >
            + Add Particulars Row
          </button>
          
          <button
            type="button"
            onClick={handleOpenConfirm}
            style={{ ...s.submitPrimary, background: curTheme.headerColor }}
          >
            Accept (Ctrl+Enter)
          </button>
        </div>

      </div>

      {/* ── Feature 5: YES/NO Confirmation Popup Dialog ── */}
      {showConfirmPopup && (
        <div style={s.popupOverlay}>
          <div style={s.popupCard}>
            <div style={s.popupTitle}>Accept Voucher ?</div>
            <span style={s.popupSubtext}>Do you want to write and save these record transaction entries?</span>
            
            <div style={s.popupDetailsList}>
              <div style={s.popupDetailItem}>
                <span style={{ color: '#666' }}>Voucher Type</span>
                <span style={{ fontWeight: 'bold' }}>{type}</span>
              </div>
              <div style={s.popupDetailItem}>
                <span style={{ color: '#666' }}>Amount Total</span>
                <span style={{ fontWeight: 'bold', color: '#1d5e3a' }}>
                  ₹ {entries.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {accountId && (
                <div style={s.popupDetailItem}>
                  <span style={{ color: '#666' }}>Contra/Bank Account</span>
                  <span style={{ fontWeight: 'bold' }}>{accountSearch}</span>
                </div>
              )}
            </div>

            <div style={s.popupBtnRow}>
              <button
                type="button"
                onClick={executeSaveVoucher}
                style={s.popupBtnYes}
              >
                Yes (Enter)
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmPopup(false)}
                style={s.popupBtnNo}
              >
                No (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Bar Hint ── */}
      <div style={s.statusBarHint}>
        <span>Press Escape to reset search filters | Enter switches between active cells</span>
        <span>Keyboard: Enter twice on blank Particulars moves focus to Narration</span>
      </div>

    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  wrapper: {
    fontFamily: FONT,
    fontSize: 12,
    color: '#1a1a1a',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
    transition: 'background 0.3s ease',
  },
  titleBar: {
    background: '#1d2c3d',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 14px',
    fontSize: 11,
    flexShrink: 0,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  btnX: {
    background: '#dc3545',
    color: '#fff',
    border: 'none',
    padding: '3px 8px',
    borderRadius: 2,
    fontSize: 10,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: FONT,
  },
  tabBarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 14px',
    background: 'rgba(255, 255, 255, 0.5)',
    borderBottom: `1px solid ${BORDER}`,
    flexShrink: 0,
  },
  tabBtn: {
    border: 'none',
    padding: '6px 16px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: FONT,
    borderRadius: '2px 2px 0 0',
    transition: 'all 0.1s ease',
  },
  dateInputSelect: {
    border: `1px solid ${BORDER}`,
    background: '#fff',
    fontFamily: FONT,
    fontSize: 11,
    padding: '2px 4px',
    outline: 'none',
  },
  contentCard: {
    flex: 1,
    margin: '12px 14px',
    border: `1px solid ${BORDER}`,
    borderRadius: 3,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  accountBox: {
    background: 'rgba(0, 0, 0, 0.02)',
    borderBottom: `1px solid ${BORDER}`,
    padding: '12px 14px',
  },
  accRowContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  labelBold: {
    fontSize: 11,
    fontWeight: 700,
    color: '#333',
    width: 140,
    flexShrink: 0,
  },
  accInput: {
    width: '100%',
    border: 'none',
    borderBottom: `2px solid #1f4e79`,
    background: '#fffde5',
    outline: 'none',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: FONT,
    padding: '3px 6px',
    boxSizing: 'border-box',
    color: '#1a1a1a',
  },
  valRowBalance: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    marginLeft: 154,
    display: 'flex',
    alignItems: 'center',
  },
  tableContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    minHeight: 0,
  },
  tableHeaderRow: {
    display: 'flex',
    background: '#f1f3f6',
    borderBottom: `1px solid ${BORDER}`,
    fontWeight: 700,
    flexShrink: 0,
  },
  th: {
    padding: '6px 12px',
    fontSize: 11,
    color: '#333',
    fontWeight: 'bold',
  },
  tableContentBody: {
    flex: 1,
    overflowY: 'auto',
    background: '#fff',
  },
  entryRow: {
    display: 'flex',
    borderBottom: `1px solid ${ROW_BDR}`,
    minHeight: '34px',
    alignItems: 'stretch',
    background: '#fff',
  },
  rowInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 0',
    background: 'transparent',
    color: '#1a1a1a',
  },
  rowDelBtn: {
    background: 'none',
    border: 'none',
    color: '#dc3545',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 'bold',
    padding: '0 4px',
  },
  statusBalIndicator: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
    marginTop: -2,
    marginBottom: 4,
  },
  amountRowInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    textAlign: 'right',
    fontWeight: 700,
    fontFamily: FONT,
    background: 'transparent',
    padding: '4px 0',
    fontSize: 12,
    color: '#1a1a1a',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100%',
    maxHeight: 180,
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 2,
    zIndex: 99,
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    overflowY: 'auto',
  },
  dropdownHdr: {
    fontSize: 9,
    fontWeight: 'bold',
    background: '#f1f3f6',
    color: '#666',
    padding: '4px 8px',
    borderBottom: `1px solid ${BORDER}`,
  },
  dropdownItem: {
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    borderBottom: '1px solid #f1f3f6',
    transition: 'all 0.05s ease',
  },
  tableFooterTotal: {
    display: 'flex',
    background: '#f8fafc',
    borderTop: `2px solid ${BORDER}`,
    padding: '6px 0',
    flexShrink: 0,
  },
  narrationBox: {
    padding: '10px 14px',
    borderTop: `1px solid ${BORDER}`,
    background: '#fafbfc',
    display: 'flex',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  narrationTextarea: {
    flex: 1,
    marginLeft: 14,
    border: 'none',
    borderBottom: '1px solid #999',
    background: 'transparent',
    fontFamily: FONT,
    fontSize: 12,
    outline: 'none',
    resize: 'none',
    color: '#1a1a1a',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: '#f1f3f6',
    borderTop: `1px solid ${BORDER}`,
    flexShrink: 0,
  },
  addBtnLine: {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    cursor: 'pointer',
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 2,
    fontFamily: FONT,
  },
  submitPrimary: {
    color: '#fff',
    border: 'none',
    padding: '6px 18px',
    fontWeight: 'bold',
    fontSize: 11,
    borderRadius: 2,
    cursor: 'pointer',
    fontFamily: FONT,
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  popupOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCard: {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 3,
    padding: '20px 24px',
    width: 320,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    fontFamily: FONT,
    display: 'flex',
    flexDirection: 'column',
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  popupSubtext: {
    fontSize: 11,
    color: '#666',
    lineHeight: 1.4,
    marginBottom: 14,
  },
  popupDetailsList: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '8px 12px',
    borderRadius: 2,
    marginBottom: 16,
  },
  popupDetailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    margin: '4px 0',
  },
  popupBtnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
  popupBtnYes: {
    background: '#1d5e3a',
    color: '#fff',
    border: 'none',
    padding: '5px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: FONT,
    borderRadius: 2,
  },
  popupBtnNo: {
    background: '#e2e8f0',
    color: '#1a1a1a',
    border: 'none',
    padding: '5px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: FONT,
    borderRadius: 2,
  },
  statusBarHint: {
    background: '#1d2c3d',
    color: '#aaa',
    fontSize: 10,
    padding: '4px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
};
