# Applying the Analytics Migration Manually

Since we're encountering issues with the Supabase migration system, here's how to apply the new analytics migration directly through the Supabase SQL Editor.

## Step 1: Access the Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Log in to your account
3. Select your project (ajqjufxcwoektjdogogq)

## Step 2: Open the SQL Editor

1. In the left sidebar, click on "SQL Editor"
2. Click "New Query" to create a new SQL query

## Step 3: Copy and Paste the Migration SQL

Copy the entire contents of the file `supabase\migrations\20250321234758_create_analytics_system.sql` and paste it into the SQL Editor.

## Step 4: Execute the SQL

Click the "Run" button to execute the SQL statements.

## Step 5: Verify the Migration

After running the SQL, you can verify that the analytics system was created correctly by running these queries:

```sql
-- Check if the analytics schema was created
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'analytics';

-- Check if the tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'analytics';

-- Check if the function was created
SELECT proname, prosrc FROM pg_proc WHERE proname = 'calculate_session_duration';

-- Check if the view was created
SELECT table_name FROM information_schema.views WHERE table_schema = 'analytics';

-- Check if the RLS policies were created
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'analytics';
```

## Step 6: Update the Migration History (Optional)

If you want to mark this migration as applied in the migration history table, you can run:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20250321234758', 
  'create_analytics_system', 
  '-- Contents of your migration file here'
)
ON CONFLICT (version) DO NOTHING;
```

## Conclusion

By applying the migration directly through the SQL Editor, you can bypass any issues with the Supabase migration system while still getting your schema changes applied to the database.
