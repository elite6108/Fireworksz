import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupGallery() {
  console.log('Setting up gallery...');

  try {
    // 1. Create gallery table
    console.log('Creating gallery table...');
    const { error: tableError } = await supabase.rpc('create_gallery_table');
    
    if (tableError) {
      console.error('Error creating gallery table:', tableError);
      // If the table already exists, we can continue
      if (!tableError.message.includes('already exists')) {
        throw tableError;
      } else {
        console.log('Gallery table already exists, continuing...');
      }
    } else {
      console.log('Gallery table created successfully!');
    }

    // 2. Create gallery storage bucket
    console.log('Creating gallery storage bucket...');
    const { error: bucketError } = await supabase.storage.createBucket('gallery', {
      public: false,
      fileSizeLimit: 10485760, // 10MB
    });

    if (bucketError) {
      console.error('Error creating gallery bucket:', bucketError);
      // If the bucket already exists, we can continue
      if (!bucketError.message.includes('already exists')) {
        throw bucketError;
      } else {
        console.log('Gallery bucket already exists, continuing...');
      }
    } else {
      console.log('Gallery bucket created successfully!');
    }

    console.log('Gallery setup completed successfully!');
  } catch (error) {
    console.error('Error setting up gallery:', error);
  }
}

// Create stored procedure for creating gallery table
async function createStoredProcedure() {
  console.log('Creating stored procedure for gallery table...');

  const procedureSQL = `
  CREATE OR REPLACE FUNCTION create_gallery_table()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    -- Create gallery table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.gallery (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      category TEXT,
      tags TEXT[],
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      user_id UUID REFERENCES auth.users(id)
    );

    -- Create index on is_public for faster queries
    CREATE INDEX IF NOT EXISTS idx_gallery_is_public ON gallery(is_public);

    -- Enable Row Level Security
    ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

    -- Create policies
    DROP POLICY IF EXISTS "Public images are viewable by everyone" ON gallery;
    CREATE POLICY "Public images are viewable by everyone" 
    ON gallery FOR SELECT 
    USING (is_public = true);

    DROP POLICY IF EXISTS "Authenticated users can view all gallery images" ON gallery;
    CREATE POLICY "Authenticated users can view all gallery images" 
    ON gallery FOR SELECT 
    TO authenticated
    USING (true);

    DROP POLICY IF EXISTS "Admin users can manage gallery images" ON gallery;
    CREATE POLICY "Admin users can manage gallery images" 
    ON gallery FOR ALL 
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
  END;
  $$;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: procedureSQL });
    
    if (error) {
      console.error('Error creating stored procedure:', error);
      throw error;
    }
    
    console.log('Stored procedure created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating stored procedure:', error);
    return false;
  }
}

// Helper function to execute SQL directly
async function executeSQL(sql) {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error executing SQL:', error);
    return false;
  }
}

// Create exec_sql function if it doesn't exist
async function createExecSQLFunction() {
  console.log('Creating exec_sql function...');
  
  const functionSQL = `
  CREATE OR REPLACE FUNCTION exec_sql(sql text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    EXECUTE sql;
  END;
  $$;
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });
    
    if (error) {
      // If the function doesn't exist yet, we need to create it directly
      if (error.message.includes('does not exist')) {
        const { error: directError } = await supabase.from('_exec_sql').select('*').limit(1);
        
        if (directError) {
          console.error('Error creating exec_sql function directly:', directError);
          return false;
        }
        
        return true;
      }
      
      console.error('Error creating exec_sql function:', error);
      return false;
    }
    
    console.log('exec_sql function created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating exec_sql function:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    // First try to create the exec_sql function
    await createExecSQLFunction();
    
    // Then create the stored procedure
    const procedureCreated = await createStoredProcedure();
    
    if (procedureCreated) {
      // Finally set up the gallery
      await setupGallery();
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main();
