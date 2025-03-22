// test-migration.js
import fetch from 'node-fetch';

// Configuration
const SUPABASE_URL = 'https://ajqjufxcwoektjdogogq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcWp1Znhjd29la3RqZG9nb2dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjI1MTcwNSwiZXhwIjoyMDU3ODI3NzA1fQ.p3zTMoJmFNii-RpnDWwJc5Fm_pQUwBvVabEZ1EUGAZk';

// SQL to execute
const sql = `
-- This is a direct test migration
-- It adds a comment to the products table and creates a simple index

-- Add a comment to the products table
COMMENT ON TABLE products IS 'Products available for purchase - updated March 21, 2025';

-- Add a simple index that definitely doesn't exist
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- Return success message
SELECT 'Migration successfully applied' as result;
`;

async function runMigration() {
  try {
    console.log('Executing SQL migration...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        query_text: sql
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SQL execution failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Migration executed successfully!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Error executing migration:', error);
  }
}

runMigration();
