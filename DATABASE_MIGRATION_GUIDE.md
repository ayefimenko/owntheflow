# 🗄️ Database Migration Guide for Role-Based Access

## Overview

This guide will help you set up the database schema for the role-based access control system in your Supabase project.

## Step 1: Access Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your `own-the-flow` project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

## Step 2: Run the Migration Script

Copy and paste the entire contents of `supabase/migrations/001_create_user_roles.sql` into the SQL editor and execute it.

**Important:** Run the entire script as one transaction to ensure consistency.

## Step 3: Verify the Migration

After running the migration, verify that the following were created:

### Tables Created:
- `user_profiles` - Stores user profile information and roles
- `role_permissions` - Defines permissions for each role

### Functions Created:
- `handle_new_user()` - Automatically creates user profiles on signup
- `update_updated_at_column()` - Updates timestamp on profile changes
- `user_has_permission()` - Checks if user has specific permission
- `get_user_role()` - Gets user's role

### Triggers Created:
- `on_auth_user_created` - Creates profile when user signs up
- `update_user_profiles_updated_at` - Updates timestamp on profile changes

### Indexes Created:
- `idx_user_profiles_role` - Performance index on user roles
- `idx_user_profiles_created_at` - Performance index on creation date

### RLS Policies:
- Users can read/update their own profiles
- Admins can read/update all profiles
- Content managers can read other profiles
- Role permissions are readable by all (for client-side checks)

## Step 3: Test the Setup

1. **Create a test user** through your application
2. **Check the `user_profiles` table** to see if the profile was created automatically
3. **Verify default role** is set to 'user'
4. **Test role functions** by running:
   ```sql
   SELECT get_user_role('your-user-id-here');
   SELECT user_has_permission('your-user-id-here', 'content', 'read');
   ```

## Step 4: Create Admin User (Optional)

To create your first admin user, you can manually update a user's role:

```sql
-- Replace 'your-user-id' with actual user ID from auth.users
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = 'your-user-id';
```

You can find user IDs in the **Authentication > Users** section of your Supabase dashboard.

## Step 5: Verify in Application

1. Start your Next.js application: `npm run dev`
2. Sign up for a new account
3. Check that the user profile shows the correct role and permissions
4. Verify that role-based UI components are working

## Troubleshooting

### Common Issues:

1. **"relation already exists" errors**: The migration has already been run
2. **Permission denied**: Make sure you're running as the project owner
3. **RLS errors**: Check that policies are correctly applied

### Reset Instructions (if needed):

To reset the migration completely:

```sql
-- WARNING: This will delete all user profile data
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS user_has_permission CASCADE;
DROP FUNCTION IF EXISTS get_user_role CASCADE;
```

Then re-run the migration.

## Next Steps

After successful migration:

1. ✅ Test user registration and profile creation
2. ✅ Verify role-based permissions in the UI
3. ✅ Create your first admin user
4. 🚀 Start building content management features!

## Support

If you encounter issues:
- Check the Supabase dashboard logs
- Verify RLS policies are active
- Ensure environment variables are correctly set
- Review the application console for errors 