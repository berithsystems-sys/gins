-- Clear Demo Data Script for TallyPrim
-- This script removes all demo/test data while preserving the structure

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Clear all demo data (except account groups and ledgers which should be preserved)
DELETE FROM audit_logs;
DELETE FROM voucher_entries;
DELETE FROM vouchers;
DELETE FROM bank_imports;
DELETE FROM bank_reconciliations;
DELETE FROM pdcs;
DELETE FROM cheque_templates;
DELETE FROM employees;
DELETE FROM cost_centres;

-- Clear demo ledgers (optional - keep only structure)
-- DELETE FROM ledgers;

-- Keep only essential users (remove branch demo users)
DELETE FROM users;

-- Keep only essential branches (remove demo branches)
DELETE FROM branches;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify tables are empty (except account_groups and ledgers)
SELECT 'audit_logs' as table_name, COUNT(*) as count FROM audit_logs
UNION ALL
SELECT 'voucher_entries', COUNT(*) FROM voucher_entries
UNION ALL
SELECT 'vouchers', COUNT(*) FROM vouchers
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'branches', COUNT(*) FROM branches
UNION ALL
SELECT 'account_groups', COUNT(*) FROM account_groups
UNION ALL
SELECT 'ledgers', COUNT(*) FROM ledgers;
