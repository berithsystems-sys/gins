/**
 * Database Connection Diagnostic Script
 * Run with: npm run test-db
 * 
 * This script tests if your database connection is working properly
 */

import 'dotenv/config';
import { db } from '../src/db.js';

async function testConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  const config = db.client.config.connection;
  
  console.log('📋 Connection Configuration:');
  console.log(`  • Client: ${db.client.config.client}`);
  console.log(`  • Host: ${config.host || 'N/A'}`);
  console.log(`  • Port: ${config.port || 'N/A'}`);
  console.log(`  • User: ${config.user || 'N/A'}`);
  console.log(`  • Database: ${config.database || 'N/A'}`);
  console.log();

  try {
    console.log('⏳ Attempting connection...');
    
    // Test basic connection
    const result = await db.raw('SELECT 1 as connected');
    console.log('✅ Connection successful!\n');

    // Check tables
    console.log('📊 Checking database tables...');
    const tables = await db.raw(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [config.database]);
    
    const tableList = tables[0].map((t) => t.TABLE_NAME);
    console.log(`Found ${tableList.length} tables:`);
    tableList.forEach((t) => console.log(`  • ${t}`));
    console.log();

    // Check for required tables
    const requiredTables = ['users', 'branches', 'account_groups', 'ledgers'];
    const missingTables = requiredTables.filter(t => !tableList.includes(t));
    
    if (missingTables.length > 0) {
      console.log('⚠️  Missing required tables:');
      missingTables.forEach(t => console.log(`  • ${t}`));
      console.log('\n❌ Please run the SQL setup script in PhpMyAdmin!');
    } else {
      console.log('✅ All required tables exist!\n');
      
      // Check for admin user
      try {
        const adminUser = await db('users').where({ username: 'hi@ebc.com' }).first();
        if (adminUser) {
          console.log('✅ Admin user found: hi@ebc.com');
        } else {
          console.log('⚠️  Admin user not found. Did you run the SQL seed?');
          const userCount = await db('users').count('* as count').first();
          console.log(`   Users in database: ${userCount?.count || 0}`);
        }
      } catch (e) {
        console.log(`⚠️  Could not query users table: ${e.message}`);
      }
    }

    console.log('\n✅ Database connection is working!');
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ Connection failed!');
    console.error(`Error: ${err.message}`);
    console.error(`Code: ${err.code}\n`);
    
    if (err.code === 'ECONNREFUSED') {
      console.log('💡 This usually means:');
      console.log('   1. MySQL server is not running');
      console.log('   2. The hostname is incorrect');
      console.log('   3. The port is blocked by firewall');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Authentication failed. Check:');
      console.log('   1. DB_USER is correct');
      console.log('   2. DB_PASSWORD is correct');
      console.log('   3. The user has access to this database');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Database does not exist. Check:');
      console.log('   1. DB_NAME is correct');
      console.log('   2. The database exists in PhpMyAdmin');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.log('💡 Cannot resolve hostname. Check:');
      console.log('   1. DB_HOST is correct (e.g., srv1994.hstgr.io)');
      console.log('   2. Your internet connection is working');
      console.log('   3. DNS resolution is working');
    }
    
    process.exit(1);
  }
}

testConnection();
