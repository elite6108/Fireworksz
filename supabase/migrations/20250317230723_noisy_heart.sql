/*
  # Update user role to admin

  1. Changes
    - Set role to 'admin' for specific user email
    - Add admin role to user_metadata

  2. Security
    - Only updates a single specific user
    - Maintains existing RLS policies
*/

DO $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  )
  WHERE email = 'gordo6108@gmail.com';
END $$;