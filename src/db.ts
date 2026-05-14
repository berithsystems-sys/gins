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

export interface Ledger {
  id: string;
  name: string;
  group_name?: string;
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

console.log('--- Environment Check ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_CLIENT:', process.env.DB_CLIENT);
console.log('PORT:', process.env.PORT);
console.log('-------------------------');

// Knex Configuration
const dbUser = process.env.DB_USER || process.env.DB_USERNAME;
const dbName = process.env.DB_NAME || process.env.DB_DATABASE;
const dbHost = process.env.DB_HOST;
let dbClient = process.env.DB_CLIENT || 'sqlite3';

// Validate DB_CLIENT - force sqlite3 if mysql2 isn't explicitly and correctly set
if (dbClient !== 'mysql2' && dbClient !== 'sqlite3') {
  console.warn(`WARNING: Invalid DB_CLIENT "${dbClient}" detected. Falling back to sqlite3.`);
  dbClient = 'sqlite3';
}

// FORCE SQLite if host is localhost/127.0.0.1 in AI Studio environment
if (dbClient === 'mysql2' && (!dbHost || dbHost === 'localhost' || dbHost === '127.0.0.1' || dbHost === '::1')) {
  console.warn('CRITICAL: Detected attempt to use MySQL on localhost. Falling back to SQLite for stability.');
  dbClient = 'sqlite3';
}

console.log('--- Database Config Debug ---');
console.log('Final Client Choice:', dbClient);
if (dbClient === 'sqlite3') {
  console.log('INFO: Using SQLite3 (database.sqlite)');
} else {
  if (!dbHost || dbHost === 'localhost' || dbHost === '127.0.0.1' || dbHost === '::1') {
    console.warn('CRITICAL WARNING: Connecting to MySQL on localhost/127.0.0.1/::1.');
    console.warn('This environment (AI Studio) DOES NOT have its own MySQL server.');
    console.warn('If your database is on Hostinger, you MUST use their Remote MySQL Hostname.');
    console.warn('Example: mysql.hostinger.com or your server IP.');
  }
  console.log('Host:', dbHost || '127.0.0.1 (Local - Likely will fail for remote DB)');
  console.log('User:', dbUser);
  console.log('Database:', dbName);
  console.log('Port:', process.env.DB_PORT || 3306);
}
console.log('-----------------------------');

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

  // Ledgers
  if (!(await db.schema.hasTable('ledgers'))) {
    await db.schema.createTable('ledgers', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('group_name').notNullable();
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
