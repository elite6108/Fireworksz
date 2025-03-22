import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://ajqjufxcwoektjdogogq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRLSFix() {
  try {
    console.log('Reading SQL file...');
    const sqlFilePath = path.join(__dirname, 'fix_gallery_rls.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Applying RLS policy updates...');
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error('Error applying RLS fixes:', error);
      return;
    }

    console.log('RLS policies updated successfully!');
    console.log(data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Execute the function
applyRLSFix();
