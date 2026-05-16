/**
 * Script to clear demo data from the database
 * Keeps only Chart of Accounts structure and Ledger structure
 * 
 * Run with: npm run clear-demo-data
 */

import { db } from '../src/db.js';

async function clearDemoData() {
  try {
    console.log('🧹 Clearing demo data from database...\n');

    // Clear tables in order of dependencies (foreign keys)
    const tablesToClear = [
      'audit_logs',
      'voucher_entries',
      'vouchers',
      'bank_imports',
      'bank_reconciliations',
      'pdcs',
      'cheque_templates',
      'employees',
      'cost_centres',
      'users',
      'branches'
    ];

    for (const table of tablesToClear) {
      try {
        const count = await db(table).del();
        console.log(`✓ Cleared ${table} (${count} rows deleted)`);
      } catch (err) {
        console.log(`✗ Could not clear ${table} (table may not exist yet): ${err.message}`);
      }
    }

    console.log('\n✅ Demo data cleared successfully!');
    console.log('\nRemaining data:');
    
    // Show what's left
    const accountGroups = await db('account_groups').count('* as count').first();
    const ledgers = await db('ledgers').count('* as count').first();
    
    console.log(`  • Account Groups: ${accountGroups?.count || 0}`);
    console.log(`  • Ledgers: ${ledgers?.count || 0}`);
    
    console.log('\n📝 Next steps:');
    console.log('  1. Add your Chart of Accounts in the UI');
    console.log('  2. Create ledger entries for each account');
    console.log('  3. Set up user accounts and branches as needed');

  } catch (error) {
    console.error('❌ Error clearing demo data:', error);
    process.exit(1);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

clearDemoData();
