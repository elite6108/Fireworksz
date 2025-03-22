# Testing Supabase Migrations

## Direct SQL Test Migration

Copy and paste the following SQL into the Supabase SQL Editor in the dashboard:

```sql
-- This is a direct test migration
-- It adds a comment to the products table and creates a simple index

-- Add a comment to the products table
COMMENT ON TABLE products IS 'Products available for purchase - updated March 21, 2025';

-- Add a simple index that definitely doesn't exist
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- Verify the changes
SELECT obj_description('products'::regclass, 'pg_class') as table_comment;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products' AND indexname = 'idx_products_updated_at';
```

## Instructions for Testing

1. Log in to the Supabase dashboard at https://app.supabase.com
2. Navigate to your project: "ajqjufxcwoektjdogogq"
3. Go to the SQL Editor
4. Create a new query
5. Paste the SQL above
6. Run the query
7. Verify that the comment was added and the index was created

## Verifying Migration Success

After running the SQL, you should see:
- A table comment for the products table
- A new index called `idx_products_updated_at` on the products table

## Conclusion

If the SQL executes successfully and you can see the comment and index, then your Supabase database is working correctly for direct SQL execution. The issue with the migration system is likely related to the migration history table or the way migrations are being tracked, not with the ability to execute SQL on the database.
