// Script to apply a test migration directly using Supabase JavaScript client
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL || 'https://ajqjufxcwoektjdogogq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyTestMigration() {
  console.log('Applying test migration...');
  
  try {
    // Execute our test migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query_text: `
        -- This is an extremely simple test migration
        -- It just adds a comment to an existing table and creates an index
        
        -- Add a comment to the products table
        COMMENT ON TABLE products IS 'Products available for purchase - updated March 21, 2025';
        
        -- Add a simple index that definitely doesn't exist
        CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
        
        -- Return success message
        SELECT 'Migration successfully applied' as result;
      `
    });
    
    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }
    
    console.log('Migration successfully applied!');
    console.log('Result:', data);
    
    // Now verify that our changes were applied
    const { data: verifyData, error: verifyError } = await supabase
      .from('pg_indexes')
      .select('*')
      .eq('indexname', 'idx_products_updated_at');
    
    if (verifyError) {
      console.error('Error verifying migration:', verifyError);
    } else {
      console.log('Verification result:', verifyData);
      console.log('Index created:', verifyData.length > 0 ? 'Yes' : 'No');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Run the migration
applyTestMigration();
