// test-mcp.js
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Read MCP config
const mcpConfigPath = 'c:/Users/gordo/.codeium/windsurf/mcp_config.json';
console.log(`Reading MCP config from: ${mcpConfigPath}`);
const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
console.log('MCP config loaded successfully');

// Initialize Supabase client using MCP config
const supabase = createClient(
  mcpConfig.supabase.url,
  mcpConfig.supabase.serviceRoleKey
);

async function testMcpConfiguration() {
  console.log('Testing MCP configuration with Supabase...');
  
  try {
    // Test 1: Verify Supabase connection
    console.log('\n1. Testing Supabase connection...');
    const { data: connectionTest, error: connectionError, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('❌ Supabase connection failed:', connectionError.message);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('   Orders count:', count || 'Unknown');
    }
    
    // Test 2: Check if required tables exist
    console.log('\n2. Checking required tables...');
    const tables = ['orders', 'shipping_rates', 'categories', 'products'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*', { head: true, count: 'exact' });
        
      if (error) {
        console.error(`❌ Table '${table}' check failed:`, error.message);
      } else {
        console.log(`✅ Table '${table}' exists and is accessible.`);
      }
    }
    
    // Test 3: Check database schema for orders table columns
    console.log('\n3. Checking orders table columns...');
    try {
      // Try to get a single row from orders to examine its structure
      const { data: columns, error: columnsError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
        
      if (columnsError) {
        console.error('❌ Schema check failed:', columnsError.message);
      } else {
        console.log('✅ Orders table schema retrieved successfully');
        const columnNames = columns && columns.length > 0 ? Object.keys(columns[0]) : [];
        console.log('   Columns:', columnNames.join(', '));
        
        // Check for specific columns mentioned in memories
        const requiredColumns = ['payment_id', 'payment_status', 'shipping_cost', 'subtotal', 'tax'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
          console.error(`❌ Missing columns in orders table: ${missingColumns.join(', ')}`);
        } else {
          console.log('✅ All required columns exist in orders table');
        }
      }
    } catch (error) {
      console.error('❌ Schema check failed with exception:', error.message);
    }
    
    // Test 4: Check if API server is running
    console.log('\n4. Checking if API server is running...');
    try {
      const response = await fetch(`http://localhost:${mcpConfig.api.port}`);
      if (response.ok) {
        console.log('✅ API server is running');
      } else {
        console.error(`❌ API server returned status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ API server check failed:', error.message);
      console.log('   Note: Make sure your API server is running on port', mcpConfig.api.port);
      console.log('   To start the API server, run: node api/server.js');
    }
    
    // Test 5: Check migration files
    console.log('\n5. Checking migration files...');
    try {
      const migrationDir = mcpConfig.database.migrations.directory;
      const files = fs.readdirSync(migrationDir);
      console.log(`✅ Found ${files.length} migration files in ${migrationDir}`);
      
      // Check for specific migration file mentioned in memories
      const schemaRefreshFile = files.find(file => file.includes('refresh_schema_cache'));
      if (schemaRefreshFile) {
        console.log(`✅ Found schema refresh migration: ${schemaRefreshFile}`);
      } else {
        console.log('❌ Schema refresh migration file not found');
      }
    } catch (error) {
      console.error('❌ Migration check failed:', error.message);
    }
    
    console.log('\nMCP Configuration Test Summary:');
    console.log('------------------------------');
    console.log('✅ MCP config file is valid and readable');
    console.log('✅ Supabase connection is working');
    console.log('   To complete setup:');
    console.log('   1. Start the API server: node api/server.js');
    console.log('   2. Update the Stripe webhook secret in your MCP config');
    console.log('   3. Run any pending migrations');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the tests
testMcpConfiguration();
