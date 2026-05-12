import fs from 'fs/promises';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database.json');

export interface Ledger {
  id: string;
  name: string;
  group: string;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface Voucher {
  id: string;
  number: string;
  date: string;
  type: 'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase';
  narration: string;
  amount: number;
  entries: {
    ledgerId: string;
    amount: number;
    type: 'Dr' | 'Cr';
  }[];
}

interface DB {
  companies: any[];
  ledgers: Ledger[];
  vouchers: Voucher[];
}

const initialData: DB = {
  companies: [{ id: '1', name: 'ABC TRADING CO.', financialYear: '2024-2025' }],
  ledgers: [
    { id: '1', name: 'Cash', group: 'Cash-in-hand', openingBalance: 0, balanceType: 'Dr' },
    { id: '2', name: 'Bank Account', group: 'Bank Accounts', openingBalance: 10000, balanceType: 'Dr' }
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
