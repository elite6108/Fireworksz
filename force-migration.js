// force-migration.js
// Script to force-apply a migration directly to Supabase

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const supabaseUrl = 'https://ajqjufxcwoektjdogogq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const migrationFile = path.join(__dirname, 'supabase', 'migrations', '20250321243000_fix_orders_rls_policies.sql');

// Initialize Supabase client with service role key (admin privileges)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSql = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute the entire migration as a single SQL statement
    console.log('Executing migration SQL...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });
    
    if (error) {
      console.error('Error executing migration:', error);
      
      // Try an alternative approach - create a stored procedure first
      console.log('Trying alternative approach...');
      
      // Create a stored procedure to execute our SQL
      const createProcedureResult = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE PROCEDURE apply_analytics_migration()
          LANGUAGE plpgsql
          AS $$
          BEGIN
            -- Migration SQL will be inserted here
            ${migrationSql}
          END;
          $$;
        `
      });
      
      if (createProcedureResult.error) {
        console.error('Error creating procedure:', createProcedureResult.error);
        return;
      }
      
      // Execute the procedure
      console.log('Executing migration via stored procedure...');
      const execProcedureResult = await supabase.rpc('exec_sql', {
        sql: 'CALL apply_analytics_migration();'
      });
      
      if (execProcedureResult.error) {
        console.error('Error executing procedure:', execProcedureResult.error);
        return;
      }
      
      console.log('Migration executed via stored procedure');
    } else {
      console.log('Migration executed successfully');
    }
    
    // Update the migration history table
    console.log('Updating migration history...');
    const { error: historyError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
        VALUES (
          '20250321243000', 
          'fix_orders_rls_policies', 
          'Applied manually via force-migration.js'
        )
        ON CONFLICT (version) DO NOTHING;
      `
    });
    
    if (historyError) {
      console.error('Error updating migration history:', historyError);
    } else {
      console.log('Migration history updated successfully');
    }
    
    // Verify the migration
    console.log('\nVerifying migration...');
    const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'public';`
    });
    
    if (schemaError) {
      console.error('Error verifying schema:', schemaError);
    } else {
      console.log('Public schema verification:', schemaData);
    }
    
    const { data: tableData, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
    });
    
    if (tableError) {
      console.error('Error verifying tables:', tableError);
    } else {
      console.log('Public tables:', tableData);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Execute the migration
applyMigration();
