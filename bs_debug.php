<?php
/**
 * Balance Sheet Debug Tool
 * Drop this file in your project root (same domain as your React app)
 * Access via: http://yoursite.com/bs_debug.php?branchId=OPTIONAL
 */

$branchId = $_GET['branchId'] ?? '';
$q        = $branchId ? '?branchId=' . urlencode($branchId) : '';

$endpoints = [
    'ledgers'        => "/api/ledgers{$q}",
    'vouchers'       => "/api/vouchers{$q}",
    'account-groups' => "/api/account-groups{$q}",
    'branches'       => '/api/branches',
];

// ── Known Balance Sheet groups (mirrors your React component) ─────────────────
$LIABILITY_GROUPS = [
    'Capital Account','Loans (Liability)','Current Liabilities',
    'Suspense Account','Reserves and Surplus','Bank OD',
    'Secured Loans','Unsecured Loans',
];
$ASSET_GROUPS = [
    'Fixed Assets','Investments','Current Assets','Bank Accounts',
    'Cash','Cash-in-Hand','Sundry Debtors','Stock-in-Hand',
    'Loans & Advances (Asset)','Deposits (Asset)','Miscellaneous Expenses (Asset)',
];
$ALL_BS_GROUPS = array_merge($LIABILITY_GROUPS, $ASSET_GROUPS);

// ── Fetch each endpoint via server-side curl ───────────────────────────────────
function fetchEndpoint(string $path): array {
    $base = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
    $url  = $base . $path;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);
    $body   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error  = curl_error($ch);
    curl_close($ch);

    $parsed = null;
    $parseError = null;
    if ($body !== false) {
        $parsed = json_decode($body, true);
        if ($parsed === null) $parseError = json_last_error_msg();
    }

    return [
        'url'        => $url,
        'status'     => $status,
        'curlError'  => $error,
        'rawBody'    => $body ?: '',
        'parsed'     => $parsed,
        'parseError' => $parseError,
        'isArray'    => is_array($parsed),
        'count'      => is_array($parsed) ? count($parsed) : null,
    ];
}

$results = [];
foreach ($endpoints as $name => $path) {
    $results[$name] = fetchEndpoint($path);
}

// ── Analyse ledger groups ──────────────────────────────────────────────────────
$ledgers      = $results['ledgers']['parsed'] ?? [];
$vouchers     = $results['vouchers']['parsed'] ?? [];
$groups       = $results['account-groups']['parsed'] ?? [];

$ledgerGroupNames = [];
foreach ((array)$ledgers as $l) {
    $g = $l['group_name'] ?? $l['group'] ?? null;
    if ($g) $ledgerGroupNames[$g] = ($ledgerGroupNames[$g] ?? 0) + 1;
}
$matchedGroups   = array_intersect_key($ledgerGroupNames, array_flip($ALL_BS_GROUPS));
$unmatchedGroups = array_diff_key($ledgerGroupNames, array_flip($ALL_BS_GROUPS));

// ── Quick balance calculation ──────────────────────────────────────────────────
function calcBalance(string $ledgerId, array $ledgers, array $vouchers): float {
    $ledger = null;
    foreach ($ledgers as $l) { if (($l['id'] ?? '') === $ledgerId) { $ledger = $l; break; } }
    if (!$ledger) return 0.0;

    $ob  = (float)($ledger['openingBalance'] ?? 0);
    $bal = ($ledger['balanceType'] ?? '') === 'Cr' ? -$ob : $ob;

    foreach ((array)$vouchers as $v) {
        foreach ((array)($v['entries'] ?? []) as $e) {
            if (($e['ledgerId'] ?? '') !== $ledgerId) continue;
            $amt  = (float)($e['amount'] ?? 0);
            $bal += ($e['type'] ?? '') === 'Dr' ? $amt : -$amt;
        }
    }
    return $bal;
}

$groupTotals = [];
foreach ($ALL_BS_GROUPS as $gn) {
    $total = 0.0;
    foreach ((array)$ledgers as $l) {
        if (($l['group_name'] ?? $l['group'] ?? '') === $gn) {
            $total += calcBalance($l['id'] ?? '', (array)$ledgers, (array)$vouchers);
        }
    }
    $groupTotals[$gn] = $total;
}

$liabTotal  = 0.0;
$assetTotal = 0.0;
foreach ($LIABILITY_GROUPS as $g) $liabTotal  += -($groupTotals[$g] ?? 0);
foreach ($ASSET_GROUPS    as $g) $assetTotal  +=  ($groupTotals[$g] ?? 0);

// ── Helper: status badge ──────────────────────────────────────────────────────
function badge(int $status): string {
    if ($status === 200) return '<span class="ok">✔ 200 OK</span>';
    if ($status === 0)   return '<span class="err">✘ No response (CURL failed)</span>';
    return "<span class='warn'>⚠ HTTP {$status}</span>";
}
function yn(bool $v): string { return $v ? '<span class="ok">YES</span>' : '<span class="err">NO</span>'; }
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Balance Sheet Debug</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:monospace;font-size:12px;background:#0f172a;color:#e2e8f0;padding:16px}
  h1{font-size:16px;color:#38bdf8;margin-bottom:4px}
  h2{font-size:13px;color:#7dd3fc;margin:18px 0 6px;border-bottom:1px solid #1e3a5f;padding-bottom:4px}
  h3{font-size:12px;color:#bae6fd;margin:10px 0 4px}
  .card{background:#1e293b;border:1px solid #334155;border-radius:6px;padding:12px;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
  th{background:#0f172a;color:#7dd3fc;text-align:left;padding:4px 8px;border-bottom:1px solid #334155}
  td{padding:3px 8px;border-bottom:1px solid #1e3a5f;vertical-align:top}
  tr:hover td{background:#1a2a40}
  .ok{color:#4ade80;font-weight:bold}
  .err{color:#f87171;font-weight:bold}
  .warn{color:#fbbf24;font-weight:bold}
  pre{background:#0f172a;border:1px solid #334155;padding:8px;border-radius:4px;overflow:auto;max-height:180px;font-size:10px;color:#94a3b8;margin-top:4px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .tag{display:inline-block;background:#0d3352;color:#7dd3fc;border-radius:3px;padding:0 5px;font-size:10px}
  .balance-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1e3a5f}
  .bal-name{color:#94a3b8}
  .bal-val{color:#e2e8f0;font-weight:bold}
  .bal-zero{color:#475569}
  .summary-row{display:flex;justify-content:space-between;padding:5px 0;font-weight:bold;color:#38bdf8;border-top:1px solid #334155;margin-top:4px}
  .diff-ok{color:#4ade80}
  .diff-err{color:#f87171}
  .pill{display:inline-block;border-radius:10px;padding:1px 8px;font-size:10px;margin-right:4px}
  .pill-g{background:#14532d;color:#4ade80}
  .pill-r{background:#7f1d1d;color:#f87171}
  .pill-y{background:#713f12;color:#fbbf24}
</style>
</head>
<body>

<h1>⚙ Balance Sheet — Debug Page</h1>
<p style="color:#64748b;margin-bottom:12px">
  Branch: <span class="tag"><?= $branchId ?: '(all)' ?></span> &nbsp;
  Time: <span class="tag"><?= date('Y-m-d H:i:s') ?></span> &nbsp;
  PHP: <span class="tag"><?= PHP_VERSION ?></span>
</p>

<!-- ═══ SECTION 1: API Endpoints ════════════════════════════════════════════ -->
<h2>1. API Endpoint Health</h2>
<div class="grid2">
<?php foreach ($results as $name => $r): ?>
<div class="card">
  <h3><?= htmlspecialchars($name) ?></h3>
  <table>
    <tr><td>Status</td><td><?= badge($r['status']) ?></td></tr>
    <tr><td>URL</td><td style="color:#7dd3fc"><?= htmlspecialchars($r['url']) ?></td></tr>
    <?php if ($r['curlError']): ?><tr><td>cURL Error</td><td class="err"><?= htmlspecialchars($r['curlError']) ?></td></tr><?php endif; ?>
    <tr><td>Is Array?</td><td><?= yn($r['isArray']) ?></td></tr>
    <?php if ($r['isArray']): ?><tr><td>Record Count</td><td><strong><?= $r['count'] ?></strong></td></tr><?php endif; ?>
    <?php if ($r['parseError']): ?><tr><td>JSON Error</td><td class="err"><?= htmlspecialchars($r['parseError']) ?></td></tr><?php endif; ?>
  </table>
  <?php if (!$r['isArray'] && $r['rawBody']): ?>
  <pre><?= htmlspecialchars(substr($r['rawBody'], 0, 500)) ?></pre>
  <?php endif; ?>
</div>
<?php endforeach; ?>
</div>

<!-- ═══ SECTION 2: Ledger Group Analysis ════════════════════════════════════ -->
<h2>2. Ledger Group Analysis</h2>
<div class="grid2">

  <div class="card">
    <h3>✔ Matched BS Groups (will show on Balance Sheet)</h3>
    <?php if (empty($matchedGroups)): ?>
      <p class="err" style="padding:8px 0">No ledger groups match the expected BS group names!</p>
    <?php else: foreach ($matchedGroups as $gn => $cnt): ?>
      <div class="balance-row">
        <span class="bal-name"><?= htmlspecialchars($gn) ?></span>
        <span class="tag"><?= $cnt ?> ledger<?= $cnt>1?'s':'' ?></span>
      </div>
    <?php endforeach; endif; ?>
  </div>

  <div class="card">
    <h3>⚠ Unmatched Groups (will NOT appear — name mismatch?)</h3>
    <?php if (empty($unmatchedGroups)): ?>
      <p class="ok" style="padding:8px 0">All ledger groups match. 🎉</p>
    <?php else: foreach ($unmatchedGroups as $gn => $cnt): ?>
      <div class="balance-row">
        <span class="warn"><?= htmlspecialchars($gn) ?></span>
        <span class="tag pill-y"><?= $cnt ?> ledger<?= $cnt>1?'s':'' ?></span>
      </div>
    <?php endforeach; endif; ?>
    <?php if (!empty($unmatchedGroups)): ?>
    <p style="color:#fbbf24;margin-top:8px;font-size:10px">
      ⚠ These group names don't match the hardcoded list in BalanceSheetScreen.<br>
      Fix: either rename the groups in DB, or add them to LIABILITY_GROUPS / ASSET_GROUPS in the React component.
    </p>
    <?php endif; ?>
  </div>
</div>

<!-- ═══ SECTION 3: Ledger Field Check ══════════════════════════════════════ -->
<h2>3. Ledger Field Check (first 10 ledgers)</h2>
<div class="card">
<?php if (empty($ledgers)): ?>
  <p class="err">No ledgers returned. Check /api/ledgers endpoint.</p>
<?php else: ?>
  <table>
    <thead><tr><th>id</th><th>name</th><th>group_name</th><th>group</th><th>openingBalance</th><th>balanceType</th><th>branchId</th><th>Resolved Group</th></tr></thead>
    <tbody>
    <?php foreach (array_slice((array)$ledgers, 0, 10) as $l):
      $gn = $l['group_name'] ?? $l['group'] ?? null;
      $inBS = in_array($gn, $ALL_BS_GROUPS);
    ?>
    <tr>
      <td style="color:#64748b"><?= htmlspecialchars($l['id'] ?? '—') ?></td>
      <td><?= htmlspecialchars($l['name'] ?? '—') ?></td>
      <td><?= htmlspecialchars($l['group_name'] ?? '—') ?></td>
      <td><?= htmlspecialchars($l['group'] ?? '—') ?></td>
      <td><?= htmlspecialchars($l['openingBalance'] ?? '0') ?></td>
      <td><?= htmlspecialchars($l['balanceType'] ?? '—') ?></td>
      <td style="color:#64748b"><?= htmlspecialchars($l['branchId'] ?? '—') ?></td>
      <td><?= $gn ? ($inBS ? "<span class='ok'>{$gn}</span>" : "<span class='warn'>{$gn} ⚠</span>") : "<span class='err'>MISSING</span>" ?></td>
    </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  <?php if (count($ledgers) > 10): ?>
  <p style="color:#64748b;margin-top:6px">… and <?= count($ledgers)-10 ?> more ledgers (showing first 10 only)</p>
  <?php endif; ?>
<?php endif; ?>
</div>

<!-- ═══ SECTION 4: Voucher Entry Check ══════════════════════════════════════ -->
<h2>4. Voucher / Entry Check (first 5 vouchers)</h2>
<div class="card">
<?php if (empty($vouchers)): ?>
  <p class="warn">No vouchers returned. Balance sheet will show only opening balances.</p>
<?php else: ?>
  <table>
    <thead><tr><th>id</th><th>date</th><th>type</th><th>narration</th><th>entries count</th><th>entries structure</th></tr></thead>
    <tbody>
    <?php foreach (array_slice((array)$vouchers, 0, 5) as $v):
      $entries = $v['entries'] ?? null;
      $isArr   = is_array($entries);
      $cnt     = $isArr ? count($entries) : '—';
      $sample  = $isArr && !empty($entries) ? array_keys($entries[0]) : [];
      $hasMandatory = $isArr && !empty($entries) &&
        isset($entries[0]['ledgerId']) && isset($entries[0]['amount']) && isset($entries[0]['type']);
    ?>
    <tr>
      <td style="color:#64748b"><?= htmlspecialchars($v['id'] ?? '—') ?></td>
      <td><?= htmlspecialchars($v['date'] ?? '—') ?></td>
      <td><?= htmlspecialchars($v['type'] ?? '—') ?></td>
      <td style="color:#64748b;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><?= htmlspecialchars($v['narration'] ?? '—') ?></td>
      <td><?= $isArr ? $cnt : "<span class='err'>NOT an array</span>" ?></td>
      <td>
        <?php if (!$isArr): ?>
          <span class="err">entries field missing or not array</span>
        <?php elseif (empty($entries)): ?>
          <span class="warn">empty entries array</span>
        <?php else: ?>
          Keys: <span class="tag"><?= implode(', ', $sample) ?></span>
          <?= $hasMandatory ? "<span class='ok'> ✔ ledgerId+amount+type present</span>" : "<span class='err'> ✘ missing required field(s)</span>" ?>
        <?php endif; ?>
      </td>
    </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php endif; ?>
</div>

<!-- ═══ SECTION 5: Computed Balances ════════════════════════════════════════ -->
<h2>5. Computed Group Balances</h2>
<div class="grid2">

  <div class="card">
    <h3>Liabilities</h3>
    <?php foreach ($LIABILITY_GROUPS as $g):
      $val = -($groupTotals[$g] ?? 0);
      $hasData = array_key_exists($g, $matchedGroups);
    ?>
    <div class="balance-row">
      <span class="bal-name <?= $hasData?'':'diff-err' ?>"><?= htmlspecialchars($g) ?></span>
      <span class="<?= $val!=0?'bal-val':'bal-zero' ?>">
        <?= $val!=0 ? '₹'.number_format(abs($val),2) . ($val<0?' (Cr)':' (Dr)') : '—' ?>
      </span>
    </div>
    <?php endforeach; ?>
    <div class="summary-row">
      <span>TOTAL</span>
      <span>₹<?= number_format($liabTotal, 2) ?></span>
    </div>
  </div>

  <div class="card">
    <h3>Assets</h3>
    <?php foreach ($ASSET_GROUPS as $g):
      $val = $groupTotals[$g] ?? 0;
      $hasData = array_key_exists($g, $matchedGroups);
    ?>
    <div class="balance-row">
      <span class="bal-name <?= $hasData?'':'diff-err' ?>"><?= htmlspecialchars($g) ?></span>
      <span class="<?= $val!=0?'bal-val':'bal-zero' ?>">
        <?= $val!=0 ? '₹'.number_format(abs($val),2) . ($val<0?' (Cr)':' (Dr)') : '—' ?>
      </span>
    </div>
    <?php endforeach; ?>
    <div class="summary-row">
      <span>TOTAL</span>
      <span>₹<?= number_format($assetTotal, 2) ?></span>
    </div>
  </div>
</div>

<!-- Tally check -->
<div class="card" style="margin-top:0">
  <?php $diff = abs($liabTotal - $assetTotal); ?>
  <div style="display:flex;align-items:center;gap:16px">
    <span style="font-size:13px;font-weight:bold">Balance Sheet Tally:</span>
    <?php if ($diff < 0.01): ?>
      <span class="ok" style="font-size:13px">✔ BALANCED — Liabilities = Assets = ₹<?= number_format($liabTotal,2) ?></span>
    <?php else: ?>
      <span class="err" style="font-size:13px">✘ OUT OF BALANCE — Difference: ₹<?= number_format($diff,2) ?></span>
      <span style="color:#64748b;font-size:10px">(Liabilities: <?= number_format($liabTotal,2) ?> | Assets: <?= number_format($assetTotal,2) ?>)</span>
    <?php endif; ?>
  </div>
</div>

<!-- ═══ SECTION 6: Diagnosis Summary ════════════════════════════════════════ -->
<h2>6. Diagnosis Summary</h2>
<div class="card">
<?php
$issues = [];
foreach ($results as $n => $r) {
    if ($r['status'] !== 200)        $issues[] = "❌ /api/{$n} returned HTTP {$r['status']}";
    if (!$r['isArray'])              $issues[] = "❌ /api/{$n} response is not a JSON array";
    if ($r['curlError'])             $issues[] = "❌ /api/{$n} cURL error: {$r['curlError']}";
}
if (empty($ledgers))                 $issues[] = "❌ Zero ledgers returned — Balance Sheet will be blank";
if (empty($matchedGroups))           $issues[] = "❌ No ledger group names match expected BS groups";
if (!empty($unmatchedGroups))        $issues[] = "⚠ Unmatched group names: " . implode(', ', array_keys($unmatchedGroups));
if (empty($vouchers))                $issues[] = "ℹ No vouchers — only opening balances will appear";
if ($diff >= 0.01)                   $issues[] = "⚠ Balance sheet does not tally (diff ₹" . number_format($diff,2) . ")";

if (empty($issues)):
?>
  <p class="ok" style="font-size:13px">✔ Everything looks good — if the React screen is blank, the issue is in the React component, not the APIs.</p>
<?php else: foreach ($issues as $issue): ?>
  <div style="padding:3px 0;border-bottom:1px solid #1e3a5f"><?= htmlspecialchars($issue) ?></div>
<?php endforeach; endif; ?>
</div>

<p style="color:#334155;margin-top:16px;font-size:10px">
  🗑 Delete this file before deploying to production.
</p>
</body>
</html>
