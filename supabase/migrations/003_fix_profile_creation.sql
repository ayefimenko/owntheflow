-- Fix profile creation by adding missing INSERT policy
-- Users can create their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Also ensure users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Grant INSERT permission to authenticated users
GRANT INSERT ON user_profiles TO authenticated; 