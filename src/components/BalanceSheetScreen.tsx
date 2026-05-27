/**
 * TallyPrime-style Balance Sheet A/c — v8 (FULL FIXED VERSION)
 * FIXES:
 * ✅ Handles snake_case + camelCase API responses
 * ✅ Auto-normalizes group names
 * ✅ Handles group_id mappings
 * ✅ Handles entry_type / type
 * ✅ Handles amount / entry_amount
 * ✅ Handles ledgerId / ledger_id
 * ✅ Handles voucherId / voucher_id
 * ✅ Shows rows even if balance = 0
 * ✅ Better debug logging
 * ✅ Prevents blank screen
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const LIABILITY_GROUPS = [
  'Capital Account',
  'Reserves & Surplus',
  'Loans (Liability)',
  'Current Liabilities',
  'Suspense Account',
];

const ASSET_GROUPS = [
  'Fixed Assets',
  'Investments',
  'Current Assets',
  'Misc. Expenses (Asset)',
];

const ALL_GROUPS = [...LIABILITY_GROUPS, ...ASSET_GROUPS];

const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,sans-serif`;

const HDR_BG = '#003b4a';

const BORDER = '#ccd5dd';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface Ledger {
  id: string;
  name: string;
  group: string;
  openingBalance?: number;
  balanceType?: 'Dr' | 'Cr';
}

interface Period {
  label: string;
  from: string;
  to: string;
}

interface Props {
  branchId?: string;
  onBack?: () => void;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const normalizeGroupName = (g: string = '') =>
  g
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/current asset$/i, 'current assets')
    .replace(/loan liability/i, 'loans (liability)')
    .replace(/fixed asset$/i, 'fixed assets');

const fmtAmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });

const isVoided = (v: any) =>
  v?.voided === true ||
  v?.voided === 1 ||
  v?.voided === '1';

const fmtDate = (iso: string) => {
  if (!iso) return '';

  const d = new Date(iso);

  return d.toLocaleDateString('en-GB');
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function BalanceSheetScreen({
  branchId,
  onBack,
}: Props) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState('');
  const [showDebug, setShowDebug] = useState(true);

  const [expanded, setExpanded] = useState<Set<string>>(
    new Set()
  );

  const [mainPeriod, setMainPeriod] = useState({
    from: '',
    to: '',
  });

  const rootRef = useRef<HTMLDivElement>(null);

  // ───────────────────────────────────────────────────────────
  // FETCH DATA
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
  }, [branchId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const q = branchId ? `?branchId=${branchId}` : '';

      const [lRes, vRes, eRes] = await Promise.all([
        fetch(`/api/ledgers${q}`),
        fetch(`/api/vouchers${q}`),
        fetch(`/api/voucher-entries${q}`),
      ]);

      const ledgerRaw = await lRes.json();
      const voucherRaw = await vRes.json();
      const entryRaw = await eRes.json();

      let dbg = '';

      dbg += `LEDGERS: ${
        Array.isArray(ledgerRaw) ? ledgerRaw.length : 0
      }\n`;

      dbg += `VOUCHERS: ${
        Array.isArray(voucherRaw) ? voucherRaw.length : 0
      }\n`;

      dbg += `ENTRIES: ${
        Array.isArray(entryRaw) ? entryRaw.length : 0
      }\n\n`;

      // ─────────────────────────────────────────
      // GROUP MAP
      // ─────────────────────────────────────────

      const groupIdMap: Record<string, string> = {};

      (ledgerRaw || []).forEach((l: any) => {
        const gid = l.group_id || l.groupId;

        const gname =
          l.group_name ||
          l.groupName ||
          l.group ||
          '';

        if (gid && gname) {
          groupIdMap[gid] = gname;
        }
      });

      dbg += `GROUP MAP:\n`;
      dbg += JSON.stringify(groupIdMap, null, 2);
      dbg += '\n\n';

      // ─────────────────────────────────────────
      // NORMALIZE LEDGERS
      // ─────────────────────────────────────────

      const normalizedLedgers: Ledger[] = (
        Array.isArray(ledgerRaw) ? ledgerRaw : []
      ).map((raw: any) => {
        let group =
          raw.group_name ||
          raw.groupName ||
          raw.group ||
          '';

        if (!group && raw.group_id) {
          group = groupIdMap[raw.group_id];
        }

        if (!group) {
          group = '[Unknown Group]';
        }

        return {
          id: String(raw.id),
          name: raw.name || raw.ledger_name || 'Unnamed',
          group,
          openingBalance: Number(
            raw.openingBalance ||
              raw.opening_balance ||
              0
          ),
          balanceType:
            raw.balanceType ||
            raw.balance_type ||
            'Dr',
        };
      });

      dbg += `NORMALIZED LEDGERS:\n`;

      normalizedLedgers.slice(0, 10).forEach((l) => {
        dbg += `${l.name} → ${l.group}\n`;
      });

      dbg += '\n';

      // ─────────────────────────────────────────
      // DATE RANGE
      // ─────────────────────────────────────────

      const vArr = (voucherRaw || []).filter(
        (v: any) => !isVoided(v)
      );

      const dates = vArr
        .map((v: any) => v.date?.slice(0, 10))
        .filter(Boolean)
        .sort();

      if (dates.length > 0) {
        setMainPeriod({
          from: dates[0],
          to: dates[dates.length - 1],
        });
      }

      // ─────────────────────────────────────────
      // ATTACH DATES TO ENTRIES
      // ─────────────────────────────────────────

      const voucherDateMap: Record<string, string> =
        {};

      vArr.forEach((v: any) => {
        voucherDateMap[v.id] = v.date?.slice(0, 10);
      });

      const normalizedEntries = (
        Array.isArray(entryRaw) ? entryRaw : []
      ).map((e: any) => ({
        ...e,
        _date:
          voucherDateMap[
            e.voucherId || e.voucher_id
          ] || '',
      }));

      dbg += `\nFIRST ENTRY:\n`;
      dbg += JSON.stringify(
        normalizedEntries[0],
        null,
        2
      );

      setLedgers(normalizedLedgers);
      setVouchers(vArr);
      setEntries(normalizedEntries);

      // ─────────────────────────────────────────
      // UNIQUE GROUPS
      // ─────────────────────────────────────────

      const uniqueGroups = [
        ...new Set(
          normalizedLedgers.map((l) => l.group)
        ),
      ];

      dbg += `\n\nUNIQUE GROUPS:\n`;

      uniqueGroups.forEach((g) => {
        dbg += `• ${g}\n`;
      });

      setDebug(dbg);
    } catch (err: any) {
      console.error(err);

      setDebug(String(err));

      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // CALCULATE BALANCE
  // ───────────────────────────────────────────────────────────

  const calcBalance = useCallback(
    (
      ledgerId: string,
      from: string,
      to: string
    ) => {
      const ledger = ledgers.find(
        (l) => l.id === ledgerId
      );

      if (!ledger) return 0;

      let running =
        ledger.balanceType === 'Cr'
          ? -Number(ledger.openingBalance || 0)
          : Number(ledger.openingBalance || 0);

      entries.forEach((e: any) => {
        const lid =
          e.ledgerId || e.ledger_id;

        if (String(lid) !== String(ledgerId))
          return;

        const d = e._date;

        if (from && d < from) return;

        if (to && d > to) return;

        const type =
          e.type || e.entry_type;

        const amount = Number(
          e.amount || e.entry_amount || 0
        );

        if (type === 'Dr') {
          running += amount;
        } else {
          running -= amount;
        }
      });

      return running;
    },
    [ledgers, entries]
  );

  // ───────────────────────────────────────────────────────────
  // GROUP TOTAL
  // ───────────────────────────────────────────────────────────

  const groupTotal = useCallback(
    (
      groupName: string,
      from: string,
      to: string
    ) => {
      return ledgers
        .filter(
          (l) =>
            normalizeGroupName(l.group) ===
            normalizeGroupName(groupName)
        )
        .reduce(
          (a, l) =>
            a +
            calcBalance(
              l.id,
              from,
              to
            ),
          0
        );
    },
    [ledgers, calcBalance]
  );

  // ───────────────────────────────────────────────────────────
  // GROUP LEDGERS
  // ───────────────────────────────────────────────────────────

  const groupLedgers = useCallback(
    (groupName: string) => {
      return ledgers.filter(
        (l) =>
          normalizeGroupName(l.group) ===
          normalizeGroupName(groupName)
      );
    },
    [ledgers]
  );

  // ───────────────────────────────────────────────────────────
  // TOGGLE GROUP
  // ───────────────────────────────────────────────────────────

  const toggleGroup = (g: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(g)) {
        next.delete(g);
      } else {
        next.add(g);
      }

      return next;
    });
  };

  // ───────────────────────────────────────────────────────────
  // RENDER GROUP
  // ───────────────────────────────────────────────────────────

  const renderGroup = (groupName: string) => {
    const total = groupTotal(
      groupName,
      mainPeriod.from,
      mainPeriod.to
    );

    const isExpanded = expanded.has(groupName);

    return (
      <React.Fragment key={groupName}>
        <tr
          onClick={() =>
            toggleGroup(groupName)
          }
          style={{
            cursor: 'pointer',
            borderBottom:
              '1px solid #e0e6ee',
          }}
        >
          <td
            style={{
              padding: 8,
              fontWeight: 700,
            }}
          >
            {isExpanded ? '−' : '+'} {groupName}
          </td>

          <td
            style={{
              padding: 8,
              textAlign: 'right',
              fontWeight: 700,
            }}
          >
            {fmtAmt(total)}
          </td>
        </tr>

        {isExpanded &&
          groupLedgers(groupName).map(
            (l) => {
              const bal = calcBalance(
                l.id,
                mainPeriod.from,
                mainPeriod.to
              );

              return (
                <tr
                  key={l.id}
                  style={{
                    background:
                      '#fafbff',
                  }}
                >
                  <td
                    style={{
                      padding:
                        '6px 8px 6px 28px',
                    }}
                  >
                    {l.name}
                  </td>

                  <td
                    style={{
                      padding: 8,
                      textAlign:
                        'right',
                    }}
                  >
                    {fmtAmt(bal)}
                  </td>
                </tr>
              );
            }
          )}
      </React.Fragment>
    );
  };

  // ───────────────────────────────────────────────────────────
  // TOTALS
  // ───────────────────────────────────────────────────────────

  const liabilityTotal =
    LIABILITY_GROUPS.reduce(
      (a, g) =>
        a +
        Math.abs(
          groupTotal(
            g,
            mainPeriod.from,
            mainPeriod.to
          )
        ),
      0
    );

  const assetTotal =
    ASSET_GROUPS.reduce(
      (a, g) =>
        a +
        Math.abs(
          groupTotal(
            g,
            mainPeriod.from,
            mainPeriod.to
          )
        ),
      0
    );

  // ───────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────

  return (
    <div
      ref={rootRef}
      style={{
        fontFamily: FONT,
        height: '100%',
        background: '#f3f3f3',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* HEADER */}

      <div
        style={{
          background: HDR_BG,
          color: '#fff',
          padding: '10px 16px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1 }}>
          BALANCE SHEET
        </div>

        <button
          onClick={onBack}
          style={{
            border: 0,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          ESC: BACK
        </button>
      </div>

      {/* BODY */}

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
        }}
      >
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: 20,
            }}
          >
            {/* LIABILITIES */}

            <div
              style={{
                background: '#fff',
                border:
                  '1px solid #ccd5dd',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse:
                    'collapse',
                }}
              >
                <thead>
                  <tr>
                    <th
                      colSpan={2}
                      style={{
                        padding: 10,
                        background:
                          '#eef4fb',
                        color: HDR_BG,
                        fontSize: 16,
                      }}
                    >
                      LIABILITIES
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {LIABILITY_GROUPS.map(
                    renderGroup
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td
                      style={{
                        padding: 10,
                        fontWeight: 700,
                      }}
                    >
                      TOTAL
                    </td>

                    <td
                      style={{
                        padding: 10,
                        textAlign:
                          'right',
                        fontWeight: 700,
                      }}
                    >
                      {fmtAmt(
                        liabilityTotal
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ASSETS */}

            <div
              style={{
                background: '#fff',
                border:
                  '1px solid #ccd5dd',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse:
                    'collapse',
                }}
              >
                <thead>
                  <tr>
                    <th
                      colSpan={2}
                      style={{
                        padding: 10,
                        background:
                          '#eef4fb',
                        color: HDR_BG,
                        fontSize: 16,
                      }}
                    >
                      ASSETS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {ASSET_GROUPS.map(
                    renderGroup
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td
                      style={{
                        padding: 10,
                        fontWeight: 700,
                      }}
                    >
                      TOTAL
                    </td>

                    <td
                      style={{
                        padding: 10,
                        textAlign:
                          'right',
                        fontWeight: 700,
                      }}
                    >
                      {fmtAmt(assetTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* DEBUG */}

        {showDebug && (
          <div
            style={{
              marginTop: 20,
              background: '#111',
              color: '#39ff14',
              padding: 16,
              fontFamily:
                'monospace',
              fontSize: 12,
              whiteSpace:
                'pre-wrap',
            }}
          >
            {debug}
          </div>
        )}
      </div>

      {/* FOOTER */}

      <div
        style={{
          background: HDR_BG,
          color: '#fff',
          padding: 8,
          fontSize: 12,
        }}
      >
        Period:
        {' '}
        {fmtDate(mainPeriod.from)}
        {' '}
        to
        {' '}
        {fmtDate(mainPeriod.to)}
      </div>
    </div>
  );
}
