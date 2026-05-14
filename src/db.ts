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
let dbClient = process.env.DB_CLIENT || 'better-sqlite3';

// AI Studio environment check: default to better-sqlite3 if mysql2 isn't remote
if (dbClient !== 'mysql2') {
  dbClient = 'better-sqlite3';
}

// FORCE better-sqlite3 if host is localhost/127.0.0.1 in AI Studio environment
if (dbClient === 'mysql2' && (!dbHost || dbHost === 'localhost' || dbHost === '127.0.0.1' || dbHost === '::1')) {
  dbClient = 'better-sqlite3';
}

export const db = knex({
  client: dbClient,
  connection: dbClient === 'mysql2' ? {
    host: dbHost || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: dbUser,
    password: process.env.DB_PASSWORD,
    database: dbName,
    connectTimeout: 10000, 
  } : {
    filename: path.join(process.cwd(), 'database.sqlite')
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
    // Seed initial branches
    await db('branches').insert([
      { id: '101', code: 'BR001', name: 'Main City Branch', location: 'City Center' },
      { id: '102', code: 'BR002', name: 'East Side Church', location: 'East Suburb' }
    ]);
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

  // Ensure initial users exist (Seed even if table existed but was empty)
  try {
    const existingUsers = await db('users').select('id').limit(1);
    if (existingUsers.length === 0) {
      console.log("Seeding default users...");
      await db('users').insert([
        { id: '1', username: 'admin@tally.com', password: 'password', role: 'HQ' },
        { id: '2', username: 'branch@tally.com', password: 'password', role: 'BRANCH', branchId: '101' }
      ]);
      console.log("Default users seeded.");
    }
  } catch (err) {
    console.error("Error during user seeding:", err);
  }

  // Account Groups
  if (!(await db.schema.hasTable('account_groups'))) {
    await db.schema.createTable('account_groups', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('under'); // Parent group ID
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
    
    // Seed default Tally groups
    const defaultGroups = [
      'Capital Account', 'Current Assets', 'Current Liabilities', 'Fixed Assets', 
      'Investments', 'Loans (Liability)', 'Suspense Account', 'Sales Account', 
      'Purchase Account', 'Direct Income', 'Indirect Income', 'Direct Expenses', 
      'Indirect Expenses'
    ].map((name, index) => ({ id: `g_${index}`, name, branchId: '101' })); // Seed for first branch
    
    await db('account_groups').insert(defaultGroups);
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
    // Seed initial ledgers
    await db('ledgers').insert([
      { id: '1', name: 'Cash', group_name: 'Cash-in-hand', openingBalance: 0, balanceType: 'Dr', branchId: '101' },
      { id: '2', name: 'Tithe Collection', group_name: 'Direct Incomes', openingBalance: 0, balanceType: 'Cr', branchId: '101' }
    ]);
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
