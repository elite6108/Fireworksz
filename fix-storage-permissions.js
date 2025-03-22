// Script to fix storage permissions for gallery images
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStoragePermissions() {
  try {
    console.log('Starting storage permission fix...');

    // First, check if the gallery bucket exists and is public
    const { data: buckets, error: bucketError } = await supabase
      .from('storage.buckets')
      .select('*')
      .eq('id', 'gallery')
      .single();

    if (bucketError) {
      console.error('Error fetching gallery bucket:', bucketError);
      return;
    }

    if (!buckets) {
      console.log('Gallery bucket not found, creating it...');
      const { error: createError } = await supabase
        .from('storage.buckets')
        .insert({
          id: 'gallery',
          name: 'gallery',
          public: true,
          avif_autodetection: false
        });

      if (createError) {
        console.error('Error creating gallery bucket:', createError);
        return;
      }
    } else if (!buckets.public) {
      console.log('Updating gallery bucket to be public...');
      const { error: updateError } = await supabase
        .from('storage.buckets')
        .update({ public: true })
        .eq('id', 'gallery');

      if (updateError) {
        console.error('Error updating gallery bucket:', updateError);
        return;
      }
    }

    // Now run SQL to update the policies
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Authenticated users can upload gallery images" ON storage.objects;
        DROP POLICY IF EXISTS "Public can view public gallery images" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated users can view all gallery images" ON storage.objects;
        
        -- Create policy for uploads
        CREATE POLICY "Authenticated users can upload gallery images"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'gallery');
        
        -- Create policy for public viewing
        CREATE POLICY "Public can view public gallery images"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'gallery');
        
        -- Create policy for authenticated viewing
        CREATE POLICY "Authenticated users can view all gallery images"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'gallery');
      `
    });

    if (sqlError) {
      console.error('Error executing SQL to update policies:', sqlError);
      return;
    }

    console.log('Storage permissions fixed successfully!');
    console.log('Please clear your browser cache and refresh the page to see the images.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixStoragePermissions();
