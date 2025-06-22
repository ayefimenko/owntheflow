-- ============================================================================
-- FIX CONTENT UPDATE POLICIES - Own The Flow
-- Run this SQL in your Supabase dashboard to fix status change issues
-- ============================================================================

-- Courses UPDATE Policies
CREATE POLICY "Authors can update own courses" ON courses
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can update any course" ON courses
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Content managers can update any course" ON courses
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'content_manager')
    );

-- Modules UPDATE Policies
CREATE POLICY "Authors can update own modules" ON modules
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can update any module" ON modules
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Content managers can update any module" ON modules
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'content_manager')
    );

-- Lessons UPDATE Policies
CREATE POLICY "Authors can update own lessons" ON lessons
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can update any lesson" ON lessons
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Content managers can update any lesson" ON lessons
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'content_manager')
    );

-- Challenges UPDATE Policies
CREATE POLICY "Authors can update own challenges" ON challenges
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can update any challenge" ON challenges
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Content managers can update any challenge" ON challenges
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'content_manager')
    ); 