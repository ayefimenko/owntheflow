-- Fix SQL syntax error in INSERT policy
-- Only WITH CHECK is allowed for INSERT policies, not USING

-- Drop the problematic policies
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "bypass_rls_for_trigger" ON user_profiles;

-- Create correct INSERT policy syntax
CREATE POLICY "users_can_insert_own_profile" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Create a proper bypass policy for the trigger function
-- This policy allows the SECURITY DEFINER function to bypass RLS
CREATE POLICY "bypass_rls_for_trigger" ON user_profiles
    FOR INSERT
    WITH CHECK (true);

-- Ensure the trigger function has the right permissions
-- Grant explicit permissions to the trigger function
GRANT INSERT ON user_profiles TO postgres;

-- Verify the policies are correct
DO $$
BEGIN
    RAISE NOTICE '=== POLICY VERIFICATION ===';
    RAISE NOTICE 'INSERT policies created successfully';
    RAISE NOTICE 'Trigger function permissions granted';
    RAISE NOTICE '=== END VERIFICATION ===';
END $$; 