/**
 * Seed script to create default admin user and Chart of Accounts
 * Run with: npm run seed
 */

import { db } from '../src/db.js';

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with admin user and Chart of Accounts...\n');

    // 1. Create default branch if not exists
    const branchExists = await db('branches').where({ id: '1' }).first();
    if (!branchExists) {
      await db('branches').insert({
        id: '1',
        code: 'HQ',
        name: 'Head Office',
        location: 'Main Office'
      });
      console.log('✓ Created default branch (Head Office)');
    }

    // 2. Create default admin user
    const adminExists = await db('users').where({ username: 'hi@ebc.com' }).first();
    if (!adminExists) {
      await db('users').insert({
        id: 'admin_1',
        username: 'hi@ebc.com',
        password: 'helloworld', // In production, use bcrypt hashing
        role: 'HQ'
      });
      console.log('✓ Created admin user: hi@ebc.com');
    } else {
      console.log('⚠ Admin user already exists');
    }

    // 3. Seed Chart of Accounts (Standard Tally groups)
    const standardGroups = [
      // Assets
      { id: 'g_001', name: 'Fixed Assets', branchId: '1' },
      { id: 'g_002', name: 'Current Assets', branchId: '1' },
      { id: 'g_003', name: 'Investments', branchId: '1' },
      
      // Liabilities
      { id: 'g_004', name: 'Current Liabilities', branchId: '1' },
      { id: 'g_005', name: 'Loans (Liability)', branchId: '1' },
      
      // Equity
      { id: 'g_006', name: 'Capital Account', branchId: '1' },
      { id: 'g_007', name: 'Reserves and Surplus', branchId: '1' },
      
      // Income
      { id: 'g_008', name: 'Direct Income', branchId: '1' },
      { id: 'g_009', name: 'Indirect Income', branchId: '1' },
      { id: 'g_010', name: 'Sales Account', branchId: '1' },
      
      // Expenses
      { id: 'g_011', name: 'Direct Expenses', branchId: '1' },
      { id: 'g_012', name: 'Indirect Expenses', branchId: '1' },
      { id: 'g_013', name: 'Purchase Account', branchId: '1' },
      
      // Other
      { id: 'g_014', name: 'Suspense Account', branchId: '1' },
      { id: 'g_015', name: 'Bank Accounts', branchId: '1' },
      { id: 'g_016', name: 'Cash', branchId: '1' }
    ];

    // Check if groups already exist
    const existingGroups = await db('account_groups').where({ branchId: '1' }).count('* as count').first();
    
    if (!existingGroups || existingGroups.count === 0) {
      await db('account_groups').insert(standardGroups);
      console.log(`✓ Created ${standardGroups.length} Account Groups (Chart of Accounts)`);
    } else {
      console.log(`⚠ Account Groups already exist (${existingGroups.count} found)`);
    }

    // 4. Seed default ledgers under each group
    const defaultLedgers = [
      // Cash & Bank (g_016 - Cash, g_015 - Bank)
      { id: 'l_001', name: 'Cash', groupId: 'g_016', group_name: 'Cash', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      { id: 'l_002', name: 'Bank Account', groupId: 'g_015', group_name: 'Bank Accounts', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      
      // Income (g_008 - Direct, g_009 - Indirect, g_010 - Sales)
      { id: 'l_003', name: 'Service Income', groupId: 'g_008', group_name: 'Direct Income', openingBalance: 0, balanceType: 'Cr', branchId: '1' },
      { id: 'l_004', name: 'Consulting Income', groupId: 'g_008', group_name: 'Direct Income', openingBalance: 0, balanceType: 'Cr', branchId: '1' },
      { id: 'l_005', name: 'Other Income', groupId: 'g_009', group_name: 'Indirect Income', openingBalance: 0, balanceType: 'Cr', branchId: '1' },
      { id: 'l_006', name: 'Sales', groupId: 'g_010', group_name: 'Sales Account', openingBalance: 0, balanceType: 'Cr', branchId: '1' },
      
      // Expenses (g_011 - Direct, g_012 - Indirect, g_013 - Purchase)
      { id: 'l_007', name: 'Salary Expenses', groupId: 'g_011', group_name: 'Direct Expenses', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      { id: 'l_008', name: 'Office Expenses', groupId: 'g_012', group_name: 'Indirect Expenses', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      { id: 'l_009', name: 'Utilities', groupId: 'g_012', group_name: 'Indirect Expenses', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      { id: 'l_010', name: 'Purchase', groupId: 'g_013', group_name: 'Purchase Account', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      
      // Assets
      { id: 'l_011', name: 'Land & Building', groupId: 'g_001', group_name: 'Fixed Assets', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      { id: 'l_012', name: 'Equipment', groupId: 'g_001', group_name: 'Fixed Assets', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      { id: 'l_013', name: 'Accounts Receivable', groupId: 'g_002', group_name: 'Current Assets', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      { id: 'l_014', name: 'Stock', groupId: 'g_002', group_name: 'Current Assets', openingBalance: 0, balanceType: 'Dr', branchId: '1' },
      
      // Liabilities & Equity
      { id: 'l_015', name: 'Accounts Payable', groupId: 'g_004', group_name: 'Current Liabilities', openingBalance: 0, balanceType: 'Cr', branchId: '1' },
      { id: 'l_016', name: 'Owner Capital', groupId: 'g_006', group_name: 'Capital Account', openingBalance: 0, balanceType: 'Cr', branchId: '1' },
      { id: 'l_017', name: 'Retained Earnings', groupId: 'g_007', group_name: 'Reserves and Surplus', openingBalance: 0, balanceType: 'Cr', branchId: '1' }
    ];

    const existingLedgers = await db('ledgers').where({ branchId: '1' }).count('* as count').first();
    
    if (!existingLedgers || existingLedgers.count === 0) {
      await db('ledgers').insert(defaultLedgers);
      console.log(`✓ Created ${defaultLedgers.length} default Ledgers`);
    } else {
      console.log(`⚠ Ledgers already exist (${existingLedgers.count} found)`);
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  • Default Admin: hi@ebc.com / helloworld');
    console.log('  • Chart of Accounts: 16 groups');
    console.log('  • Default Ledgers: 17 accounts');
    console.log('\n🚀 You can now log in and start using the system!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedDatabase();
