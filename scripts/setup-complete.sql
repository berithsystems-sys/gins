-- TallyPrim Database Complete Setup
-- This file contains both schema creation and seed data
-- Paste all of this into PhpMyAdmin SQL tab and execute

-- ========================================
-- 1. CREATE TABLES (SCHEMA)
-- ========================================

CREATE TABLE IF NOT EXISTS `branches` (
  `id` varchar(50) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(100) NOT NULL,
  `email` varchar(100),
  `password` varchar(100),
  `gstin` varchar(50),
  `registrationType` varchar(50),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(50) NOT NULL,
  `username` varchar(50) NOT NULL UNIQUE,
  `password` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL,
  `branchId` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `account_groups` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `under` varchar(50),
  `branchId` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cost_centres` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `branchId` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `employees` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL UNIQUE,
  `designation` varchar(100),
  `salaryStructure` longtext,
  `branchId` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ledgers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `groupId` varchar(50),
  `group_name` varchar(100),
  `openingBalance` float DEFAULT 0,
  `balanceType` varchar(5) NOT NULL,
  `gstin` varchar(50),
  `gstType` varchar(50),
  `email` varchar(100),
  `pan` varchar(20),
  `branchId` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` varchar(50) NOT NULL,
  `number` varchar(50),
  `date` varchar(20) NOT NULL,
  `type` varchar(20) NOT NULL,
  `narration` longtext,
  `amount` float NOT NULL,
  `gstAmount` float DEFAULT 0,
  `igst` float DEFAULT 0,
  `cgst` float DEFAULT 0,
  `sgst` float DEFAULT 0,
  `branchId` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `vouchers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `voucher_entries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `voucherId` varchar(50),
  `ledgerId` varchar(50),
  `costCentreId` varchar(50),
  `amount` float NOT NULL,
  `type` varchar(5) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`voucherId`) REFERENCES `vouchers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`ledgerId`) REFERENCES `ledgers`(`id`),
  FOREIGN KEY (`costCentreId`) REFERENCES `cost_centres`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` varchar(50) NOT NULL,
  `userId` varchar(50),
  `username` varchar(50),
  `action` varchar(50),
  `timestamp` varchar(50),
  `branchId` varchar(50),
  `details` longtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bank_reconciliations` (
  `id` varchar(50) NOT NULL,
  `branchId` varchar(50),
  `reference` varchar(100),
  `date` varchar(20),
  `amount` float,
  `particulars` varchar(255),
  `txnType` varchar(5),
  `bankDate` varchar(20),
  `status` varchar(20) DEFAULT 'UNRECONCILED',
  `createdAt` varchar(50),
  `updatedAt` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bank_imports` (
  `id` varchar(50) NOT NULL,
  `branchId` varchar(50),
  `fileName` varchar(255),
  `rows` int DEFAULT 0,
  `importedAt` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pdcs` (
  `id` varchar(50) NOT NULL,
  `branchId` varchar(50),
  `payer` varchar(100),
  `amount` float,
  `chequeNo` varchar(50),
  `chequeDate` varchar(20),
  `status` varchar(20) DEFAULT 'PENDING',
  `createdAt` varchar(50),
  `updatedAt` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cheque_templates` (
  `id` varchar(50) NOT NULL,
  `branchId` varchar(50),
  `name` varchar(100),
  `template` longtext,
  `createdAt` varchar(50),
  `updatedAt` varchar(50),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 2. CREATE INDEXES
-- ========================================

CREATE INDEX idx_ledgers_branchId ON ledgers(branchId);
CREATE INDEX idx_ledgers_groupId ON ledgers(groupId);
CREATE INDEX idx_vouchers_branchId ON vouchers(branchId);
CREATE INDEX idx_vouchers_date ON vouchers(date);
CREATE INDEX idx_voucher_entries_voucherId ON voucher_entries(voucherId);
CREATE INDEX idx_voucher_entries_ledgerId ON voucher_entries(ledgerId);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_users_username ON users(username);

-- ========================================
-- 3. SEED DATA
-- ========================================

-- Insert default branch
INSERT INTO `branches` (`id`, `code`, `name`, `location`) VALUES
('1', 'HQ', 'Head Office', 'Main Office');

-- Insert default admin user
INSERT INTO `users` (`id`, `username`, `password`, `role`, `branchId`) VALUES
('admin_1', 'hi@ebc.com', 'helloworld', 'HQ', NULL);

-- Insert Chart of Accounts (Account Groups)
INSERT INTO `account_groups` (`id`, `name`, `under`, `branchId`) VALUES
('g_001', 'Fixed Assets', NULL, '1'),
('g_002', 'Current Assets', NULL, '1'),
('g_003', 'Investments', NULL, '1'),
('g_004', 'Current Liabilities', NULL, '1'),
('g_005', 'Loans (Liability)', NULL, '1'),
('g_006', 'Capital Account', NULL, '1'),
('g_007', 'Reserves and Surplus', NULL, '1'),
('g_008', 'Direct Income', NULL, '1'),
('g_009', 'Indirect Income', NULL, '1'),
('g_010', 'Sales Account', NULL, '1'),
('g_011', 'Direct Expenses', NULL, '1'),
('g_012', 'Indirect Expenses', NULL, '1'),
('g_013', 'Purchase Account', NULL, '1'),
('g_014', 'Suspense Account', NULL, '1'),
('g_015', 'Bank Accounts', NULL, '1'),
('g_016', 'Cash', NULL, '1');

-- Insert default Ledgers (Master Accounts)
INSERT INTO `ledgers` (`id`, `name`, `groupId`, `group_name`, `openingBalance`, `balanceType`, `branchId`) VALUES
('l_001', 'Cash', 'g_016', 'Cash', 0, 'Dr', '1'),
('l_002', 'Bank Account', 'g_015', 'Bank Accounts', 0, 'Dr', '1'),
('l_003', 'Service Income', 'g_008', 'Direct Income', 0, 'Cr', '1'),
('l_004', 'Consulting Income', 'g_008', 'Direct Income', 0, 'Cr', '1'),
('l_005', 'Other Income', 'g_009', 'Indirect Income', 0, 'Cr', '1'),
('l_006', 'Sales', 'g_010', 'Sales Account', 0, 'Cr', '1'),
('l_007', 'Salary Expenses', 'g_011', 'Direct Expenses', 0, 'Dr', '1'),
('l_008', 'Office Expenses', 'g_012', 'Indirect Expenses', 0, 'Dr', '1'),
('l_009', 'Utilities', 'g_012', 'Indirect Expenses', 0, 'Dr', '1'),
('l_010', 'Purchase', 'g_013', 'Purchase Account', 0, 'Dr', '1'),
('l_011', 'Land & Building', 'g_001', 'Fixed Assets', 0, 'Dr', '1'),
('l_012', 'Equipment', 'g_001', 'Fixed Assets', 0, 'Dr', '1'),
('l_013', 'Accounts Receivable', 'g_002', 'Current Assets', 0, 'Dr', '1'),
('l_014', 'Stock', 'g_002', 'Current Assets', 0, 'Dr', '1'),
('l_015', 'Accounts Payable', 'g_004', 'Current Liabilities', 0, 'Cr', '1'),
('l_016', 'Owner Capital', 'g_006', 'Capital Account', 0, 'Cr', '1'),
('l_017', 'Retained Earnings', 'g_007', 'Reserves and Surplus', 0, 'Cr', '1');
