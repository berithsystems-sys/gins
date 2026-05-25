-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 25, 2026 at 09:27 AM
-- Server version: 11.8.6-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u698772346_tallyebccs`
--

-- --------------------------------------------------------

--
-- Table structure for table `account_groups`
--

CREATE TABLE `account_groups` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `under` varchar(50) DEFAULT NULL,
  `branchId` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `account_groups`
--

INSERT INTO `account_groups` (`id`, `name`, `under`, `branchId`) VALUES
('1778957578260_g_0', 'Capital Account', NULL, '1778957578260'),
('1778957578260_g_1', 'Current Assets', NULL, '1778957578260'),
('1778957578260_g_10', 'Indirect Income', NULL, '1778957578260'),
('1778957578260_g_11', 'Direct Expenses', NULL, '1778957578260'),
('1778957578260_g_12', 'Indirect Expenses', NULL, '1778957578260'),
('1778957578260_g_2', 'Current Liabilities', NULL, '1778957578260'),
('1778957578260_g_3', 'Fixed Assets', NULL, '1778957578260'),
('1778957578260_g_4', 'Investments', NULL, '1778957578260'),
('1778957578260_g_5', 'Loans (Liability)', NULL, '1778957578260'),
('1778957578260_g_6', 'Suspense Account', NULL, '1778957578260'),
('1778957578260_g_7', 'Sales Account', NULL, '1778957578260'),
('1778957578260_g_8', 'Purchase Account', NULL, '1778957578260'),
('1778957578260_g_9', 'Direct Income', NULL, '1778957578260');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` varchar(50) NOT NULL,
  `userId` varchar(50) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `action` varchar(50) DEFAULT NULL,
  `timestamp` varchar(50) DEFAULT NULL,
  `branchId` varchar(50) DEFAULT NULL,
  `details` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `userId`, `username`, `action`, `timestamp`, `branchId`, `details`) VALUES
('1778956660389', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-16T18:37:40.389Z', NULL, 'Successful SQL Login: HQ'),
('1778957059266', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-16T18:44:19.266Z', NULL, 'Successful SQL Login: HQ'),
('1778957187668', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-16T18:46:27.668Z', NULL, 'Successful SQL Login: HQ'),
('1778957500313', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-16T18:51:40.313Z', NULL, 'Successful SQL Login: HQ'),
('1778957521337', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-16T18:52:01.337Z', NULL, 'Successful SQL Login: HQ'),
('1778957585739', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-16T18:53:05.739Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1778957705753', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-16T18:55:05.753Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1778957964736', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-16T18:59:24.736Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1778958219188', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-16T19:03:39.188Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1778958225532', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-16T19:03:45.532Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1778958233045', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-16T19:03:53.045Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1778958337348', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-16T19:05:37.348Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1778958342317', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-16T19:05:42.317Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1778959093540', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-16T19:18:13.540Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1778959338749', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-16T19:22:18.749Z', NULL, 'Successful SQL Login: HQ'),
('1778959496382', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-16T19:24:56.382Z', NULL, 'Successful SQL Login: HQ'),
('1778999431886', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-17T06:30:31.886Z', NULL, 'Successful SQL Login: HQ'),
('1779036167060', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-17T16:42:47.060Z', NULL, 'Successful SQL Login: HQ'),
('1779036186294', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-17T16:43:06.294Z', NULL, 'Successful SQL Login: HQ'),
('1779036196969', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-17T16:43:16.969Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1779036229658', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-17T16:43:49.658Z', NULL, 'Successful SQL Login: HQ'),
('1779036363441', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-17T16:46:03.441Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1779036497026', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-17T16:48:17.026Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1779038617853', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-17T17:23:37.853Z', '1778957578260', 'Successful SQL Login: BRANCH'),
('1779040066025', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-17T17:47:46.025Z', NULL, 'Successful SQL Login: HQ'),
('1779041605016', 'admin_1', 'hi@ebc.com', 'LOGIN', '2026-05-17T18:13:25.016Z', NULL, 'Successful SQL Login: HQ'),
('1779603829005', '1778957578266_user', 'hi@ginom.com', 'LOGIN', '2026-05-24T06:23:49.005Z', '1778957578260', 'Successful SQL Login: BRANCH');

-- --------------------------------------------------------

--
-- Table structure for table `bank_imports`
--

CREATE TABLE `bank_imports` (
  `id` varchar(50) NOT NULL,
  `branchId` varchar(50) DEFAULT NULL,
  `fileName` varchar(255) DEFAULT NULL,
  `rows` int(11) DEFAULT 0,
  `importedAt` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_reconciliations`
--

CREATE TABLE `bank_reconciliations` (
  `id` varchar(50) NOT NULL,
  `branchId` varchar(50) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `date` varchar(20) DEFAULT NULL,
  `amount` float DEFAULT NULL,
  `particulars` varchar(255) DEFAULT NULL,
  `txnType` varchar(5) DEFAULT NULL,
  `bankDate` varchar(20) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'UNRECONCILED',
  `createdAt` varchar(50) DEFAULT NULL,
  `updatedAt` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` varchar(50) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  `gstin` varchar(50) DEFAULT NULL,
  `registrationType` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `code`, `name`, `location`, `email`, `password`, `gstin`, `registrationType`) VALUES
('1778957578260', 'hi@ginom.com', 'GINOM', 'lamka', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `cheque_templates`
--

CREATE TABLE `cheque_templates` (
  `id` varchar(50) NOT NULL,
  `branchId` varchar(50) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `template` longtext DEFAULT NULL,
  `createdAt` varchar(50) DEFAULT NULL,
  `updatedAt` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cost_centres`
--

CREATE TABLE `cost_centres` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `branchId` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `cost_centres`
--

INSERT INTO `cost_centres` (`id`, `name`, `branchId`) VALUES
('1778957624539', 'BYF', '1778957578260'),
('1778999549433', 'TBUC', '1778957578260');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `salaryStructure` longtext DEFAULT NULL,
  `branchId` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ledgers`
--

CREATE TABLE `ledgers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `groupId` varchar(50) DEFAULT NULL,
  `group_name` varchar(100) DEFAULT NULL,
  `openingBalance` float DEFAULT 0,
  `balanceType` varchar(5) NOT NULL,
  `gstin` varchar(50) DEFAULT NULL,
  `gstType` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `pan` varchar(20) DEFAULT NULL,
  `branchId` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `ledgers`
--

INSERT INTO `ledgers` (`id`, `name`, `groupId`, `group_name`, `openingBalance`, `balanceType`, `gstin`, `gstType`, `email`, `pan`, `branchId`) VALUES
('1778957617586', 'MOTHER ACCOUNTS', '1778957578260_g_0', 'Capital Account', 0, 'Dr', '', 'Regular', '', '', '1778957578260'),
('1778999541252', 'TITHE', '1778957578260_g_10', 'Indirect Income', 0, 'Dr', '', 'Regular', '', '', '1778957578260');

-- --------------------------------------------------------

--
-- Table structure for table `pdcs`
--

CREATE TABLE `pdcs` (
  `id` varchar(50) NOT NULL,
  `branchId` varchar(50) DEFAULT NULL,
  `payer` varchar(100) DEFAULT NULL,
  `amount` float DEFAULT NULL,
  `chequeNo` varchar(50) DEFAULT NULL,
  `chequeDate` varchar(20) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'PENDING',
  `createdAt` varchar(50) DEFAULT NULL,
  `updatedAt` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL,
  `branchId` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `branchId`) VALUES
('1778957578266_user', 'hi@ginom.com', 'khemkhem', 'BRANCH', '1778957578260'),
('admin_1', 'hi@ebc.com', 'helloworld', 'HQ', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `vouchers`
--

CREATE TABLE `vouchers` (
  `id` varchar(50) NOT NULL,
  `number` varchar(50) DEFAULT NULL,
  `date` varchar(20) NOT NULL,
  `type` varchar(20) NOT NULL,
  `narration` longtext DEFAULT NULL,
  `amount` float NOT NULL,
  `gstAmount` float DEFAULT 0,
  `igst` float DEFAULT 0,
  `cgst` float DEFAULT 0,
  `sgst` float DEFAULT 0,
  `branchId` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_entries`
--

CREATE TABLE `voucher_entries` (
  `id` int(11) NOT NULL,
  `voucherId` varchar(50) DEFAULT NULL,
  `ledgerId` varchar(50) DEFAULT NULL,
  `costCentreId` varchar(50) DEFAULT NULL,
  `amount` float NOT NULL,
  `type` varchar(5) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `account_groups`
--
ALTER TABLE `account_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branchId` (`branchId`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_logs_timestamp` (`timestamp`);

--
-- Indexes for table `bank_imports`
--
ALTER TABLE `bank_imports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branchId` (`branchId`);

--
-- Indexes for table `bank_reconciliations`
--
ALTER TABLE `bank_reconciliations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branchId` (`branchId`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cheque_templates`
--
ALTER TABLE `cheque_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branchId` (`branchId`);

--
-- Indexes for table `cost_centres`
--
ALTER TABLE `cost_centres`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branchId` (`branchId`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `branchId` (`branchId`);

--
-- Indexes for table `ledgers`
--
ALTER TABLE `ledgers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ledgers_branchId` (`branchId`),
  ADD KEY `idx_ledgers_groupId` (`groupId`);

--
-- Indexes for table `pdcs`
--
ALTER TABLE `pdcs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branchId` (`branchId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `branchId` (`branchId`),
  ADD KEY `idx_users_username` (`username`);

--
-- Indexes for table `vouchers`
--
ALTER TABLE `vouchers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vouchers_branchId` (`branchId`),
  ADD KEY `idx_vouchers_date` (`date`);

--
-- Indexes for table `voucher_entries`
--
ALTER TABLE `voucher_entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `costCentreId` (`costCentreId`),
  ADD KEY `idx_voucher_entries_voucherId` (`voucherId`),
  ADD KEY `idx_voucher_entries_ledgerId` (`ledgerId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `voucher_entries`
--
ALTER TABLE `voucher_entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `account_groups`
--
ALTER TABLE `account_groups`
  ADD CONSTRAINT `account_groups_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `bank_imports`
--
ALTER TABLE `bank_imports`
  ADD CONSTRAINT `bank_imports_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `bank_reconciliations`
--
ALTER TABLE `bank_reconciliations`
  ADD CONSTRAINT `bank_reconciliations_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cheque_templates`
--
ALTER TABLE `cheque_templates`
  ADD CONSTRAINT `cheque_templates_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cost_centres`
--
ALTER TABLE `cost_centres`
  ADD CONSTRAINT `cost_centres_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ledgers`
--
ALTER TABLE `ledgers`
  ADD CONSTRAINT `ledgers_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pdcs`
--
ALTER TABLE `pdcs`
  ADD CONSTRAINT `pdcs_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `vouchers`
--
ALTER TABLE `vouchers`
  ADD CONSTRAINT `vouchers_ibfk_1` FOREIGN KEY (`branchId`) REFERENCES `vouchers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `voucher_entries`
--
ALTER TABLE `voucher_entries`
  ADD CONSTRAINT `voucher_entries_ibfk_1` FOREIGN KEY (`voucherId`) REFERENCES `vouchers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `voucher_entries_ibfk_2` FOREIGN KEY (`ledgerId`) REFERENCES `ledgers` (`id`),
  ADD CONSTRAINT `voucher_entries_ibfk_3` FOREIGN KEY (`costCentreId`) REFERENCES `cost_centres` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
