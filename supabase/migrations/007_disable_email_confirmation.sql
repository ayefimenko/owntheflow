-- Temporarily disable email confirmation to eliminate it as a source of signup errors
-- This will allow us to test if the trigger is working properly

-- Check current auth settings
DO $$
BEGIN
    RAISE NOTICE '=== DISABLING EMAIL CONFIRMATION FOR TESTING ===';
    RAISE NOTICE 'This is temporary to isolate the database trigger issue';
    RAISE NOTICE 'Email confirmation can be re-enabled after fixing the core problem';
END $$;

-- Note: Email confirmation settings are typically managed through the Supabase dashboard
-- or environment variables, not SQL. This file serves as documentation that
-- email confirmation should be temporarily disabled for testing.

-- Alternative approach: Create a simple test to verify user creation works
CREATE OR REPLACE FUNCTION test_manual_user_creation()
RETURNS TEXT AS $$
DECLARE
    test_user_id UUID;
    test_email TEXT := 'test@example.com';
    profile_created BOOLEAN := FALSE;
BEGIN
    -- Generate a test UUID
    test_user_id := gen_random_uuid();
    
    RAISE NOTICE 'Testing manual profile creation for user ID: %', test_user_id;
    
    -- Try to manually create a profile (simulating what the trigger should do)
    BEGIN
        INSERT INTO user_profiles (id, display_name, role, created_at, updated_at)
        VALUES (
            test_user_id,
            'Test User',
            'user'::user_role,
            NOW(),
            NOW()
        );
        
        profile_created := TRUE;
        RAISE NOTICE 'Manual profile creation succeeded';
        
        -- Clean up the test profile
        DELETE FROM user_profiles WHERE id = test_user_id;
        RAISE NOTICE 'Test profile cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Manual profile creation failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        profile_created := FALSE;
    END;
    
    IF profile_created THEN
        RETURN 'SUCCESS: Manual profile creation works - trigger should work too';
    ELSE
        RETURN 'FAILED: Manual profile creation failed - there is a deeper issue';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Run the manual test
SELECT test_manual_user_creation() as manual_test_result; 