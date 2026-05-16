-- TallyPrim Database Schema
-- Auto-generated from Knex.js configuration
-- Import this SQL file into your PhpMyAdmin database

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
  FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE
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

-- Add indexes for better query performance
CREATE INDEX idx_ledgers_branchId ON ledgers(branchId);
CREATE INDEX idx_ledgers_groupId ON ledgers(groupId);
CREATE INDEX idx_vouchers_branchId ON vouchers(branchId);
CREATE INDEX idx_vouchers_date ON vouchers(date);
CREATE INDEX idx_voucher_entries_voucherId ON voucher_entries(voucherId);
CREATE INDEX idx_voucher_entries_ledgerId ON voucher_entries(ledgerId);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_users_username ON users(username);
