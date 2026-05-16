import knex from 'knex';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Interfaces for Frontend & Server
export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'HQ' | 'BRANCH';
  branchId?: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  location: string;
  email?: string;
  password?: string;
  gstin?: string;
  registrationType?: 'Regular' | 'Composition';
}

export interface AccountGroup {
  id: string;
  name: string;
  under?: string; // id of parent group
  branchId: string;
}

export interface Ledger {
  id: string;
  name: string;
  groupId?: string; 
  group_name?: string; 
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  branchId: string;
  gstType?: string;
  gstin?: string;
  email?: string;
  pan?: string;
}

export interface CostCentre {
  id: string;
  name: string;
  branchId: string;
}

export interface Employee {
  id: string;
  name: string;
  code: string;
  designation: string;
  salaryStructure: string; // JSON string
  branchId: string;
}

export interface Voucher {
  id: string;
  number?: string;
  date: string;
  type: 'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase' | 'Credit Note' | 'Debit Note';
  narration: string;
  amount: number;
  branchId: string;
  gstAmount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  entries?: VoucherEntry[];
}

export interface VoucherEntry {
  ledgerId: string;
  amount: number;
  type: 'Dr' | 'Cr';
  costCentreId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  timestamp: string;
  branchId?: string;
  details?: string;
}

// Knex Configuration
const dbUser = process.env.DB_USER || process.env.DB_USERNAME;
const dbName = process.env.DB_NAME || process.env.DB_DATABASE;
const dbHost = process.env.DB_HOST;
const dbClient = 'mysql2'; // Force MySQL2 for PhpMyAdmin compatibility

export const db = knex({
  client: 'mysql2',
  connection: {
    host: dbHost || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: dbUser,
    password: process.env.DB_PASSWORD,
    database: dbName,
    connectTimeout: 10000,
  },
  useNullAsDefault: true,
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 10000,
  }
});

export async function initDB() {
  // Branches
  if (!(await db.schema.hasTable('branches'))) {
    await db.schema.createTable('branches', (table) => {
      table.string('id').primary();
      table.string('code').notNullable();
      table.string('name').notNullable();
      table.string('location').notNullable();
      table.string('email');
      table.string('password');
      table.string('gstin');
      table.string('registrationType');
    });
  }

  // Users
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.string('id').primary();
      table.string('username').unique().notNullable();
      table.string('password').notNullable();
      table.string('role').notNullable();
      table.string('branchId').references('id').inTable('branches');
    });
  }

  // Account Groups (Chart of Accounts)
  if (!(await db.schema.hasTable('account_groups'))) {
    await db.schema.createTable('account_groups', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('under'); // Parent group ID
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  // Cost Centres
  if (!(await db.schema.hasTable('cost_centres'))) {
    await db.schema.createTable('cost_centres', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  // Employees
  if (!(await db.schema.hasTable('employees'))) {
    await db.schema.createTable('employees', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('code').unique().notNullable();
      table.string('designation');
      table.text('salaryStructure');
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  // Ledgers
  if (!(await db.schema.hasTable('ledgers'))) {
    await db.schema.createTable('ledgers', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('groupId'); 
      table.string('group_name'); 
      table.float('openingBalance').defaultTo(0);
      table.string('balanceType').notNullable();
      table.string('gstin');
      table.string('gstType');
      table.string('email');
      table.string('pan');
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  // Vouchers
  if (!(await db.schema.hasTable('vouchers'))) {
    await db.schema.createTable('vouchers', (table) => {
      table.string('id').primary();
      table.string('number');
      table.string('date').notNullable();
      table.string('type').notNullable();
      table.text('narration');
      table.float('amount').notNullable();
      table.float('gstAmount').defaultTo(0);
      table.float('igst').defaultTo(0);
      table.float('cgst').defaultTo(0);
      table.float('sgst').defaultTo(0);
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  // Voucher Entries (Relational child of Vouchers)
  if (!(await db.schema.hasTable('voucher_entries'))) {
    await db.schema.createTable('voucher_entries', (table) => {
      table.increments('id').primary();
      table.string('voucherId').references('id').inTable('vouchers').onDelete('CASCADE');
      table.string('ledgerId').references('id').inTable('ledgers');
      table.string('costCentreId').references('id').inTable('cost_centres');
      table.float('amount').notNullable();
      table.string('type').notNullable(); // Dr or Cr
    });
  }

  // Audit Logs
  if (!(await db.schema.hasTable('audit_logs'))) {
    await db.schema.createTable('audit_logs', (table) => {
      table.string('id').primary();
      table.string('userId');
      table.string('username');
      table.string('action');
      table.string('timestamp');
      table.string('branchId');
      table.string('details');
    });
  }

  // Bank Reconciliations
  if (!(await db.schema.hasTable('bank_reconciliations'))) {
    await db.schema.createTable('bank_reconciliations', (table) => {
      table.string('id').primary();
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
      table.string('reference'); // optional reference / voucher id
      table.string('date'); // statement date
      table.float('amount');
      table.string('particulars');
      table.string('txnType'); // CR or DR
      table.string('bankDate'); // reconciled date (nullable)
      table.string('status').defaultTo('UNRECONCILED'); // UNRECONCILED, RECONCILED
      table.string('createdAt');
      table.string('updatedAt');
    });
  }

  // Bank Imports metadata
  if (!(await db.schema.hasTable('bank_imports'))) {
    await db.schema.createTable('bank_imports', (table) => {
      table.string('id').primary();
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
      table.string('fileName');
      table.integer('rows').defaultTo(0);
      table.string('importedAt');
    });
  }

  // Post-Dated Cheques (PDCs)
  if (!(await db.schema.hasTable('pdcs'))) {
    await db.schema.createTable('pdcs', (table) => {
      table.string('id').primary();
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
      table.string('payer');
      table.float('amount');
      table.string('chequeNo');
      table.string('chequeDate');
      table.string('status').defaultTo('PENDING'); // PENDING, CLEARED, BOUNCED
      table.string('createdAt');
      table.string('updatedAt');
    });
  }

  // Cheque templates (for printing)
  if (!(await db.schema.hasTable('cheque_templates'))) {
    await db.schema.createTable('cheque_templates', (table) => {
      table.string('id').primary();
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
      table.string('name');
      table.text('template');
      table.string('createdAt');
      table.string('updatedAt');
    });
  }

  // Migration for new columns if table already existed
  try {
    const columns = await db('ledgers').columnInfo();
    if (!columns.gstType) {
      await db.schema.table('ledgers', (table) => {
        table.string('gstType');
        table.string('email');
        table.string('pan');
      });
      console.log("Migrated ledgers table with new columns.");
    }
  } catch (e) {
    console.error("Migration failed:", e);
  }
}
