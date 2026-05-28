-- Align chart of accounts with Tally-style cash & bank groups (MariaDB / phpMyAdmin)
-- Safe to run multiple times — only inserts missing group names per branch.
-- Database: u698772346_tallyebccs (or your active DB)

-- Bank Accounts (per branch)
INSERT INTO `account_groups` (`id`, `name`, `under`, `branchId`)
SELECT CONCAT(b.`id`, '_grp_bank'), 'Bank Accounts', NULL, b.`id`
FROM `branches` b
WHERE NOT EXISTS (
  SELECT 1 FROM `account_groups` ag
  WHERE ag.`branchId` = b.`id` AND ag.`name` = 'Bank Accounts'
);

-- Cash-in-hand (per branch)
INSERT INTO `account_groups` (`id`, `name`, `under`, `branchId`)
SELECT CONCAT(b.`id`, '_grp_cash'), 'Cash-in-hand', NULL, b.`id`
FROM `branches` b
WHERE NOT EXISTS (
  SELECT 1 FROM `account_groups` ag
  WHERE ag.`branchId` = b.`id` AND ag.`name` = 'Cash-in-hand'
);

-- Optional: legacy "Cash" group alias (only if you still have ledgers under name 'Cash')
INSERT INTO `account_groups` (`id`, `name`, `under`, `branchId`)
SELECT CONCAT(b.`id`, '_grp_cash_legacy'), 'Cash', NULL, b.`id`
FROM `branches` b
WHERE NOT EXISTS (
  SELECT 1 FROM `account_groups` ag
  WHERE ag.`branchId` = b.`id` AND ag.`name` = 'Cash'
);

-- Verify
SELECT b.`code`, b.`name` AS branch_name, ag.`name` AS group_name
FROM `branches` b
LEFT JOIN `account_groups` ag ON ag.`branchId` = b.`id`
WHERE ag.`name` IN ('Bank Accounts', 'Cash-in-hand', 'Cash')
ORDER BY b.`code`, ag.`name`;
