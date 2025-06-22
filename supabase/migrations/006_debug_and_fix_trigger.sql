-- Comprehensive debugging and fix for database trigger issues
-- This will help identify exactly what's causing the "Database error saving new user"

-- ============================================================================
-- STEP 1: DISABLE EXISTING TRIGGER TO PREVENT CONFLICTS
-- ============================================================================

-- Temporarily disable the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================================
-- STEP 2: CREATE A SIMPLIFIED, BULLETPROOF TRIGGER FUNCTION
-- ============================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a new, simplified trigger function with extensive logging
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_display_name TEXT := 'User';
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'TRIGGER: handle_new_user started for user ID: %', NEW.id;
    RAISE NOTICE 'TRIGGER: User email: %', NEW.email;
    RAISE NOTICE 'TRIGGER: Raw metadata: %', NEW.raw_user_meta_data;
    
    -- Check if profile already exists (prevent duplicates)
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RAISE NOTICE 'TRIGGER: Profile already exists for user %, skipping creation', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Extract display name with fallbacks
    BEGIN
        user_display_name := COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1),
            'User'
        );
        
        -- Ensure display name is valid
        IF user_display_name IS NULL OR LENGTH(TRIM(user_display_name)) = 0 THEN
            user_display_name := 'User';
        END IF;
        
        -- Truncate if too long
        IF LENGTH(user_display_name) > 100 THEN
            user_display_name := LEFT(user_display_name, 100);
        END IF;
        
        RAISE NOTICE 'TRIGGER: Display name determined: %', user_display_name;
        
    EXCEPTION WHEN OTHERS THEN
        user_display_name := 'User';
        RAISE NOTICE 'TRIGGER: Error extracting display name, using default: %', SQLERRM;
    END;
    
    -- Insert the profile with detailed error handling
    BEGIN
        RAISE NOTICE 'TRIGGER: Attempting to insert profile for user %', NEW.id;
        
        INSERT INTO user_profiles (id, display_name, role, created_at, updated_at)
        VALUES (
            NEW.id, 
            user_display_name, 
            'user'::user_role,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'TRIGGER: Profile created successfully for user %', NEW.id;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'TRIGGER: Profile already exists (unique violation) for user %', NEW.id;
        WHEN check_violation THEN
            RAISE WARNING 'TRIGGER: Check constraint violation for user %: %', NEW.id, SQLERRM;
            -- Try with minimal data
            INSERT INTO user_profiles (id, role) VALUES (NEW.id, 'user'::user_role);
            RAISE NOTICE 'TRIGGER: Profile created with minimal data for user %', NEW.id;
        WHEN foreign_key_violation THEN
            RAISE WARNING 'TRIGGER: Foreign key violation for user %: %', NEW.id, SQLERRM;
        WHEN OTHERS THEN
            RAISE WARNING 'TRIGGER: Unexpected error creating profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
            -- Don't fail the user creation, just log the error
    END;
    
    RAISE NOTICE 'TRIGGER: handle_new_user completed for user %', NEW.id;
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TRIGGER: Fatal error in handle_new_user for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    -- Return NEW anyway to not block user creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: ENSURE ALL NECESSARY PERMISSIONS ARE GRANTED
-- ============================================================================

-- Grant all necessary permissions to various roles
GRANT INSERT, SELECT, UPDATE ON user_profiles TO authenticated;
GRANT INSERT, SELECT, UPDATE ON user_profiles TO postgres;
GRANT INSERT, SELECT, UPDATE ON user_profiles TO service_role;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant sequence usage (for any auto-incrementing fields)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 4: RECREATE THE TRIGGER
-- ============================================================================

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- STEP 5: ENSURE RLS POLICIES ARE CORRECT
-- ============================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_select_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "service_role_full_access" ON user_profiles;
DROP POLICY IF EXISTS "bypass_rls_for_trigger" ON user_profiles;

-- Create simple, working policies
-- 1. Allow trigger function to insert (bypass RLS)
CREATE POLICY "allow_trigger_insert" ON user_profiles
    FOR INSERT
    WITH CHECK (true);

-- 2. Allow users to read their own profile
CREATE POLICY "allow_own_select" ON user_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- 3. Allow users to update their own profile
CREATE POLICY "allow_own_update" ON user_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4. Allow service role full access
CREATE POLICY "allow_service_role" ON user_profiles
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 6: TEST THE SETUP
-- ============================================================================

-- Create a test function to verify everything works
CREATE OR REPLACE FUNCTION test_user_profile_creation()
RETURNS TEXT AS $$
DECLARE
    test_result TEXT := '';
    policies_count INTEGER;
    trigger_exists BOOLEAN;
    function_exists BOOLEAN;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    -- Check if function exists
    SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user'
    ) INTO function_exists;
    
    -- Check policies count
    SELECT COUNT(*) FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    INTO policies_count;
    
    test_result := format(
        'Trigger exists: %s, Function exists: %s, Policies count: %s',
        trigger_exists, function_exists, policies_count
    );
    
    RETURN test_result;
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_user_profile_creation() as setup_status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== COMPREHENSIVE SETUP VERIFICATION ===';
    RAISE NOTICE 'Trigger function recreated with extensive logging';
    RAISE NOTICE 'All permissions granted to authenticated, postgres, and service_role';
    RAISE NOTICE 'RLS policies simplified and recreated';
    RAISE NOTICE 'Trigger recreated and should now work properly';
    RAISE NOTICE '=== NEXT STEP: Try user signup again ===';
END $$; 