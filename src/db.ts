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
}

export interface AccountGroup {
  id: string;
  name: string;
  under?: string; // id of parent group
  branchId: string;
}

export interface UnitOfMeasure {
  id: string;
  type: 'Simple' | 'Compound';
  symbol: string;
  formalName: string;
  decimalPlaces: number;
  branchId: string;
}

export interface StockGroup {
  id: string;
  name: string;
  under?: string;
  branchId: string;
}

export interface StockItem {
  id: string;
  name: string;
  alias?: string;
  under?: string; // stock group id
  unitId: string;
  openingBalance: number;
  ratePerUnit: number;
  branchId: string;
}

export interface Ledger {
  id: string;
  name: string;
  groupId?: string; 
  group_name?: string; // Legacy support
  group?: string; // Legacy support
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  branchId: string;
}

export interface Voucher {
  id: string;
  number?: string;
  date: string;
  type: 'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase';
  narration: string;
  amount: number;
  branchId: string;
  entries?: {
    ledgerId: string;
    amount: number;
    type: 'Dr' | 'Cr';
  }[];
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

  // Units of Measure
  if (!(await db.schema.hasTable('units_of_measure'))) {
    await db.schema.createTable('units_of_measure', (table) => {
      table.string('id').primary();
      table.string('type').notNullable(); // Simple or Compound
      table.string('symbol').notNullable();
      table.string('formalName').notNullable();
      table.integer('decimalPlaces').defaultTo(0);
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  // Stock Groups
  if (!(await db.schema.hasTable('stock_groups'))) {
    await db.schema.createTable('stock_groups', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('under');
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  // Stock Items
  if (!(await db.schema.hasTable('stock_items'))) {
    await db.schema.createTable('stock_items', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('alias');
      table.string('under'); // Stock Group ID
      table.string('unitId').references('id').inTable('units_of_measure');
      table.float('openingBalance').defaultTo(0);
      table.float('ratePerUnit').defaultTo(0);
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  // Ledgers
  if (!(await db.schema.hasTable('ledgers'))) {
    await db.schema.createTable('ledgers', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('groupId'); // Replaces group_name
      table.string('group_name'); // Compatibility
      table.float('openingBalance').defaultTo(0);
      table.string('balanceType').notNullable();
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
      table.string('branchId').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  // Voucher Entries (Relational child of Vouchers)
  if (!(await db.schema.hasTable('voucher_entries'))) {
    await db.schema.createTable('voucher_entries', (table) => {
      table.increments('id').primary();
      table.string('voucherId').references('id').inTable('vouchers').onDelete('CASCADE');
      table.string('ledgerId').references('id').inTable('ledgers');
      table.string('stockItemId').references('id').inTable('stock_items');
      table.float('quantity');
      table.float('rate');
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
}
