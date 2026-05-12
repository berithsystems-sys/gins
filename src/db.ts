import fs from 'fs/promises';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database.json');

export interface User {
  id: string;
  username: string;
  password: string; // Plain text for this prototype, but note for user
  role: 'HQ' | 'BRANCH';
  branchId?: string; // HQ has no specific branchId or accesses all
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
  group: string;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  branchId: string;
}

export interface Voucher {
  id: string;
  number: string;
  date: string;
  type: 'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase';
  narration: string;
  amount: number;
  branchId: string;
  entries: {
    ledgerId: string;
    amount: number;
    type: 'Dr' | 'Cr';
  }[];
}

interface DB {
  users: User[];
  branches: Branch[];
  ledgers: Ledger[];
  vouchers: Voucher[];
}

const initialData: DB = {
  users: [
    { id: '1', username: 'hq_admin', password: 'password', role: 'HQ' },
    { id: '2', username: 'branch_a', password: 'password', role: 'BRANCH', branchId: '101' }
  ],
  branches: [
    { id: '101', code: 'BR001', name: 'Main City Branch', location: 'City Center' },
    { id: '102', code: 'BR002', name: 'East Side Church', location: 'East Suburb' }
  ],
  ledgers: [
    { id: '1', name: 'Cash', group: 'Cash-in-hand', openingBalance: 0, balanceType: 'Dr', branchId: '101' },
    { id: '2', name: 'Tithe Collection', group: 'Direct Incomes', openingBalance: 0, balanceType: 'Cr', branchId: '101' }
  ],
  vouchers: []
};

export async function getDB(): Promise<DB> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

export async function saveDB(data: DB) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}
