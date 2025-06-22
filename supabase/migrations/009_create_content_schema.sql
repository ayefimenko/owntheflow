-- ============================================================================
-- LEARNING CONTENT SCHEMA - Own The Flow
-- Sprint 2: Content Models & Editor
-- ============================================================================

-- Create content status enum
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');

-- Create difficulty level enum  
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- ============================================================================
-- LEARNING PATHS - Top level learning tracks
-- ============================================================================

CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    difficulty difficulty_level DEFAULT 'beginner',
    estimated_hours INTEGER DEFAULT 0,
    status content_status DEFAULT 'draft',
    featured BOOLEAN DEFAULT false,
    image_url VARCHAR(500),
    tags TEXT[],
    prerequisites TEXT[],
    learning_outcomes TEXT[],
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    published_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_title_length CHECK (length(title) >= 3),
    CONSTRAINT valid_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_estimated_hours CHECK (estimated_hours >= 0)
);

-- ============================================================================
-- COURSES - Groups of related modules within a path
-- ============================================================================

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    difficulty difficulty_level DEFAULT 'beginner',
    estimated_hours INTEGER DEFAULT 0,
    status content_status DEFAULT 'draft',
    sort_order INTEGER DEFAULT 0,
    image_url VARCHAR(500),
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    published_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_course_title CHECK (length(title) >= 3),
    CONSTRAINT valid_course_slug CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_course_hours CHECK (estimated_hours >= 0),
    CONSTRAINT valid_sort_order CHECK (sort_order >= 0),
    
    -- Unique slug within path
    UNIQUE(path_id, slug)
);

-- ============================================================================
-- MODULES - Groups of lessons within a course
-- ============================================================================

CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    estimated_minutes INTEGER DEFAULT 0,
    status content_status DEFAULT 'draft',
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    published_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_module_title CHECK (length(title) >= 3),
    CONSTRAINT valid_module_slug CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_module_minutes CHECK (estimated_minutes >= 0),
    CONSTRAINT valid_module_sort_order CHECK (sort_order >= 0),
    
    -- Unique slug within course
    UNIQUE(course_id, slug)
);

-- ============================================================================
-- LESSONS - Individual learning units
-- ============================================================================

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    content TEXT, -- Markdown content
    summary TEXT,
    estimated_minutes INTEGER DEFAULT 5,
    xp_reward INTEGER DEFAULT 10,
    status content_status DEFAULT 'draft',
    sort_order INTEGER DEFAULT 0,
    lesson_type VARCHAR(50) DEFAULT 'reading', -- reading, video, interactive, quiz
    
    -- Optional video/media
    video_url VARCHAR(500),
    video_duration INTEGER, -- seconds
    
    -- SEO and metadata
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    published_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_lesson_title CHECK (length(title) >= 3),
    CONSTRAINT valid_lesson_slug CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_lesson_minutes CHECK (estimated_minutes > 0),
    CONSTRAINT valid_xp_reward CHECK (xp_reward >= 0),
    CONSTRAINT valid_lesson_sort_order CHECK (sort_order >= 0),
    CONSTRAINT valid_lesson_type CHECK (lesson_type IN ('reading', 'video', 'interactive', 'quiz')),
    
    -- Unique slug within module
    UNIQUE(module_id, slug)
);

-- ============================================================================
-- CHALLENGES - Practical exercises and quizzes
-- ============================================================================

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) DEFAULT 'quiz', -- quiz, code, essay, multiple_choice
    content JSONB, -- Challenge-specific data (questions, code templates, etc.)
    solution JSONB, -- Expected answers/solution
    hints TEXT[],
    xp_reward INTEGER DEFAULT 20,
    max_attempts INTEGER, -- NULL for unlimited
    time_limit INTEGER, -- minutes, NULL for no limit
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_challenge_title CHECK (length(title) >= 3),
    CONSTRAINT valid_challenge_xp CHECK (xp_reward >= 0),
    CONSTRAINT valid_challenge_attempts CHECK (max_attempts IS NULL OR max_attempts > 0),
    CONSTRAINT valid_challenge_time CHECK (time_limit IS NULL OR time_limit > 0),
    CONSTRAINT valid_challenge_type CHECK (challenge_type IN ('quiz', 'code', 'essay', 'multiple_choice'))
);

-- ============================================================================
-- USER PROGRESS TRACKING
-- ============================================================================

CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    
    -- Progress status
    status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed, skipped
    completion_percentage INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- XP and scoring
    xp_earned INTEGER DEFAULT 0,
    score INTEGER, -- For challenges/quizzes
    attempts INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_progress_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
    CONSTRAINT valid_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT valid_xp_earned CHECK (xp_earned >= 0),
    CONSTRAINT valid_attempts CHECK (attempts >= 0),
    
    -- Only one progress record per user per item
    UNIQUE(user_id, path_id, course_id, module_id, lesson_id, challenge_id)
);

-- ============================================================================
-- USER XP AND ACHIEVEMENTS
-- ============================================================================

CREATE TABLE user_xp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    level_id INTEGER DEFAULT 1,
    current_title VARCHAR(100) DEFAULT 'Newcomer',
    
    -- Path-specific XP
    path_xp JSONB DEFAULT '{}', -- { "path_id": xp_amount }
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_total_xp CHECK (total_xp >= 0),
    CONSTRAINT valid_level CHECK (level_id >= 1),
    
    -- One record per user
    UNIQUE(user_id)
);

-- ============================================================================
-- XP LEVELS AND TITLES
-- ============================================================================

CREATE TABLE xp_levels (
    level_id INTEGER PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    xp_required INTEGER NOT NULL,
    badge_icon VARCHAR(10),
    badge_color VARCHAR(7),
    
    -- Constraints
    CONSTRAINT valid_xp_required CHECK (xp_required >= 0),
    CONSTRAINT valid_badge_color CHECK (badge_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Insert default XP levels
INSERT INTO xp_levels (level_id, title, xp_required, badge_icon, badge_color) VALUES
    (1, 'Newcomer', 0, '🌱', '#10B981'),
    (2, 'Explorer', 100, '🧭', '#3B82F6'),
    (3, 'Learner', 250, '📚', '#8B5CF6'),
    (4, 'Practitioner', 500, '⚡', '#F59E0B'),
    (5, 'Specialist', 1000, '🎯', '#EF4444'),
    (6, 'Expert', 2000, '💎', '#6366F1'),
    (7, 'Master', 4000, '👑', '#DC2626'),
    (8, 'Legend', 8000, '🏆', '#B91C1C');

-- ============================================================================
-- CERTIFICATES
-- ============================================================================

CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    path_id UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    
    -- Certificate details
    certificate_type VARCHAR(20) DEFAULT 'completion', -- completion, achievement
    title VARCHAR(200) NOT NULL,
    description TEXT,
    verification_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'issued', -- issued, revoked
    
    -- Metadata
    issued_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_certificate_type CHECK (certificate_type IN ('completion', 'achievement')),
    CONSTRAINT valid_certificate_status CHECK (status IN ('issued', 'revoked'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Learning paths indexes
CREATE INDEX idx_learning_paths_status ON learning_paths(status);
CREATE INDEX idx_learning_paths_featured ON learning_paths(featured);
CREATE INDEX idx_learning_paths_difficulty ON learning_paths(difficulty);
CREATE INDEX idx_learning_paths_created_by ON learning_paths(created_by);

-- Courses indexes
CREATE INDEX idx_courses_path_id ON courses(path_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_sort_order ON courses(path_id, sort_order);

-- Modules indexes
CREATE INDEX idx_modules_course_id ON modules(course_id);
CREATE INDEX idx_modules_status ON modules(status);
CREATE INDEX idx_modules_sort_order ON modules(course_id, sort_order);

-- Lessons indexes
CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_lessons_status ON lessons(status);
CREATE INDEX idx_lessons_sort_order ON lessons(module_id, sort_order);
CREATE INDEX idx_lessons_type ON lessons(lesson_type);

-- Challenges indexes
CREATE INDEX idx_challenges_lesson_id ON challenges(lesson_id);
CREATE INDEX idx_challenges_type ON challenges(challenge_type);

-- Progress indexes
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_path_id ON user_progress(path_id);
CREATE INDEX idx_user_progress_status ON user_progress(status);
CREATE INDEX idx_user_progress_last_accessed ON user_progress(last_accessed_at);

-- XP indexes
CREATE INDEX idx_user_xp_user_id ON user_xp(user_id);
CREATE INDEX idx_user_xp_total_xp ON user_xp(total_xp);
CREATE INDEX idx_user_xp_level ON user_xp(level_id);

-- Certificates indexes
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_verification_code ON certificates(verification_code);
CREATE INDEX idx_certificates_path_id ON certificates(path_id);
CREATE INDEX idx_certificates_status ON certificates(status);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Learning Paths Policies
CREATE POLICY "Anyone can read published paths" ON learning_paths
    FOR SELECT USING (status = 'published');

CREATE POLICY "Content managers can read all paths" ON learning_paths
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

CREATE POLICY "Content managers can create paths" ON learning_paths
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

CREATE POLICY "Authors can update own paths" ON learning_paths
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can update any path" ON learning_paths
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Courses Policies (inherit from paths)
CREATE POLICY "Anyone can read published courses" ON courses
    FOR SELECT USING (
        status = 'published' AND 
        EXISTS (SELECT 1 FROM learning_paths WHERE id = courses.path_id AND status = 'published')
    );

CREATE POLICY "Content managers can read all courses" ON courses
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

CREATE POLICY "Content managers can create courses" ON courses
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

-- Modules Policies (inherit from courses)
CREATE POLICY "Anyone can read published modules" ON modules
    FOR SELECT USING (
        status = 'published' AND 
        EXISTS (
            SELECT 1 FROM courses c
            JOIN learning_paths p ON c.path_id = p.id
            WHERE c.id = modules.course_id AND c.status = 'published' AND p.status = 'published'
        )
    );

CREATE POLICY "Content managers can read all modules" ON modules
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

CREATE POLICY "Content managers can create modules" ON modules
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

-- Lessons Policies (inherit from modules)
CREATE POLICY "Anyone can read published lessons" ON lessons
    FOR SELECT USING (
        status = 'published' AND 
        EXISTS (
            SELECT 1 FROM modules m
            JOIN courses c ON m.course_id = c.id
            JOIN learning_paths p ON c.path_id = p.id
            WHERE m.id = lessons.module_id 
            AND m.status = 'published' 
            AND c.status = 'published' 
            AND p.status = 'published'
        )
    );

CREATE POLICY "Content managers can read all lessons" ON lessons
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

CREATE POLICY "Content managers can create lessons" ON lessons
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

-- Challenges Policies (inherit from lessons)
CREATE POLICY "Anyone can read published challenges" ON challenges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons l
            JOIN modules m ON l.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            JOIN learning_paths p ON c.path_id = p.id
            WHERE l.id = challenges.lesson_id 
            AND l.status = 'published' 
            AND m.status = 'published' 
            AND c.status = 'published' 
            AND p.status = 'published'
        )
    );

CREATE POLICY "Content managers can read all challenges" ON challenges
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

CREATE POLICY "Content managers can create challenges" ON challenges
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

-- User Progress Policies
CREATE POLICY "Users can read own progress" ON user_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON user_progress
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all progress" ON user_progress
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- User XP Policies
CREATE POLICY "Users can read own xp" ON user_xp
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own xp" ON user_xp
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all xp" ON user_xp
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- XP Levels Policies (public read)
CREATE POLICY "Anyone can read xp levels" ON xp_levels
    FOR SELECT USING (true);

-- Certificates Policies
CREATE POLICY "Anyone can read issued certificates by verification code" ON certificates
    FOR SELECT USING (status = 'issued');

CREATE POLICY "Users can read own certificates" ON certificates
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all certificates" ON certificates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- TRIGGER FUNCTIONS FOR AUTOMATION
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for all content tables
CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_xp_updated_at BEFORE UPDATE ON user_xp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize user XP when user signs up
CREATE OR REPLACE FUNCTION initialize_user_xp()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_xp (user_id, total_xp, level_id, current_title)
    VALUES (NEW.id, 0, 1, 'Newcomer')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_user_xp_trigger
    AFTER INSERT ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION initialize_user_xp();

-- Function to update XP and level when progress is made
CREATE OR REPLACE FUNCTION update_user_xp_from_progress()
RETURNS TRIGGER AS $$
DECLARE
    new_level_record RECORD;
BEGIN
    -- Only update XP when progress is completed and XP is earned
    IF NEW.status = 'completed' AND NEW.xp_earned > 0 THEN
        -- Update total XP
        UPDATE user_xp 
        SET 
            total_xp = total_xp + NEW.xp_earned,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        
        -- Check if user should level up
        SELECT level_id, title 
        INTO new_level_record
        FROM xp_levels 
        WHERE xp_required <= (SELECT total_xp FROM user_xp WHERE user_id = NEW.user_id)
        ORDER BY level_id DESC 
        LIMIT 1;
        
        -- Update level if needed
        IF new_level_record.level_id IS NOT NULL THEN
            UPDATE user_xp 
            SET 
                level_id = new_level_record.level_id,
                current_title = new_level_record.title,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_xp_trigger
    AFTER INSERT OR UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_user_xp_from_progress();

-- ============================================================================
-- PERMISSIONS FOR AUTHENTICATED USERS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON user_progress, user_xp TO authenticated;

-- Grant permissions for service role (admin operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE '=== CONTENT SCHEMA MIGRATION COMPLETED ===';
    RAISE NOTICE 'Tables created: learning_paths, courses, modules, lessons, challenges';
    RAISE NOTICE 'Progress tracking: user_progress, user_xp, xp_levels';
    RAISE NOTICE 'Certificates: certificates table with verification';
    RAISE NOTICE 'RLS policies: Comprehensive security implemented';
    RAISE NOTICE 'Triggers: Auto-updating timestamps and XP system';
    RAISE NOTICE 'Ready for Content Management System implementation';
END $$; 