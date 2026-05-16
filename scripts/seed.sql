-- TallyPrim Database Seed Data
-- Default Admin User and Chart of Accounts
-- Import this after running schema.sql

-- 1. Create default branch
INSERT INTO `branches` (`id`, `code`, `name`, `location`) VALUES
('1', 'HQ', 'Head Office', 'Main Office');

-- 2. Create default admin user
INSERT INTO `users` (`id`, `username`, `password`, `role`, `branchId`) VALUES
('admin_1', 'hi@ebc.com', 'helloworld', 'HQ', NULL);

-- 3. Create Chart of Accounts (Account Groups)
INSERT INTO `account_groups` (`id`, `name`, `under`, `branchId`) VALUES
-- Assets
('g_001', 'Fixed Assets', NULL, '1'),
('g_002', 'Current Assets', NULL, '1'),
('g_003', 'Investments', NULL, '1'),

-- Liabilities
('g_004', 'Current Liabilities', NULL, '1'),
('g_005', 'Loans (Liability)', NULL, '1'),

-- Equity
('g_006', 'Capital Account', NULL, '1'),
('g_007', 'Reserves and Surplus', NULL, '1'),

-- Income
('g_008', 'Direct Income', NULL, '1'),
('g_009', 'Indirect Income', NULL, '1'),
('g_010', 'Sales Account', NULL, '1'),

-- Expenses
('g_011', 'Direct Expenses', NULL, '1'),
('g_012', 'Indirect Expenses', NULL, '1'),
('g_013', 'Purchase Account', NULL, '1'),

-- Other
('g_014', 'Suspense Account', NULL, '1'),
('g_015', 'Bank Accounts', NULL, '1'),
('g_016', 'Cash', NULL, '1');

-- 4. Create default Ledgers (Master accounts)
INSERT INTO `ledgers` (`id`, `name`, `groupId`, `group_name`, `openingBalance`, `balanceType`, `branchId`) VALUES
-- Cash & Bank
('l_001', 'Cash', 'g_016', 'Cash', 0, 'Dr', '1'),
('l_002', 'Bank Account', 'g_015', 'Bank Accounts', 0, 'Dr', '1'),

-- Income
('l_003', 'Service Income', 'g_008', 'Direct Income', 0, 'Cr', '1'),
('l_004', 'Consulting Income', 'g_008', 'Direct Income', 0, 'Cr', '1'),
('l_005', 'Other Income', 'g_009', 'Indirect Income', 0, 'Cr', '1'),
('l_006', 'Sales', 'g_010', 'Sales Account', 0, 'Cr', '1'),

-- Expenses
('l_007', 'Salary Expenses', 'g_011', 'Direct Expenses', 0, 'Dr', '1'),
('l_008', 'Office Expenses', 'g_012', 'Indirect Expenses', 0, 'Dr', '1'),
('l_009', 'Utilities', 'g_012', 'Indirect Expenses', 0, 'Dr', '1'),
('l_010', 'Purchase', 'g_013', 'Purchase Account', 0, 'Dr', '1'),

-- Assets
('l_011', 'Land & Building', 'g_001', 'Fixed Assets', 0, 'Dr', '1'),
('l_012', 'Equipment', 'g_001', 'Fixed Assets', 0, 'Dr', '1'),
('l_013', 'Accounts Receivable', 'g_002', 'Current Assets', 0, 'Dr', '1'),
('l_014', 'Stock', 'g_002', 'Current Assets', 0, 'Dr', '1'),

-- Liabilities & Equity
('l_015', 'Accounts Payable', 'g_004', 'Current Liabilities', 0, 'Cr', '1'),
('l_016', 'Owner Capital', 'g_006', 'Capital Account', 0, 'Cr', '1'),
('l_017', 'Retained Earnings', 'g_007', 'Reserves and Surplus', 0, 'Cr', '1');
