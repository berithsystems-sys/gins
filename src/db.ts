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

// Knex Configuration
export const db = knex({
  client: process.env.DB_CLIENT || 'sqlite3',
  connection: process.env.DB_CLIENT === 'mysql2' ? {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  } : {
    filename: path.join(process.cwd(), 'database.sqlite')
  },
  useNullAsDefault: true,
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
    // Seed initial users
    await db('users').insert([
      { id: '1', username: 'hq_admin', password: 'password', role: 'HQ' },
      { id: '2', username: 'branch_a', password: 'password', role: 'BRANCH', branchId: '101' }
    ]);
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
