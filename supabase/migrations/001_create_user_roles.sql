-- Create enum type for user roles
CREATE TYPE user_role AS ENUM ('admin', 'content_manager', 'user');

-- Create user_profiles table to extend auth.users
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'user',
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_display_name CHECK (length(display_name) >= 2 AND length(display_name) <= 100)
);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, display_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on user_profiles
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        role = (SELECT role FROM user_profiles WHERE id = auth.uid())
    );

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all profiles (including roles)
CREATE POLICY "Admins can update all profiles" ON user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Content managers and admins can read other profiles (for collaboration)
CREATE POLICY "Content managers can read profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'content_manager')
        )
    );

-- Create permissions table for fine-grained access control
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique permission per role-resource-action combination
    UNIQUE(role, resource, action)
);

-- Insert default permissions
INSERT INTO role_permissions (role, resource, action) VALUES
    -- Admin permissions (full access)
    ('admin', 'users', 'read'),
    ('admin', 'users', 'update'),
    ('admin', 'users', 'delete'),
    ('admin', 'content', 'read'),
    ('admin', 'content', 'create'),
    ('admin', 'content', 'update'),
    ('admin', 'content', 'delete'),
    ('admin', 'content', 'publish'),
    ('admin', 'certificates', 'issue'),
    ('admin', 'certificates', 'revoke'),
    ('admin', 'analytics', 'read'),
    
    -- Content Manager permissions
    ('content_manager', 'content', 'read'),
    ('content_manager', 'content', 'create'),
    ('content_manager', 'content', 'update'),
    ('content_manager', 'users', 'read'),
    ('content_manager', 'analytics', 'read'),
    
    -- User permissions
    ('user', 'content', 'read'),
    ('user', 'profile', 'read'),
    ('user', 'profile', 'update'),
    ('user', 'progress', 'read'),
    ('user', 'progress', 'update');

-- Enable RLS on role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read permissions (needed for client-side permission checks)
CREATE POLICY "Anyone can read role permissions" ON role_permissions
    FOR SELECT USING (true);

-- Create helper function to check user permissions
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, check_resource TEXT, check_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    -- Get user role
    SELECT role INTO user_role_val
    FROM user_profiles
    WHERE id = user_id;
    
    -- Check if user has the specific permission
    RETURN EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role = user_role_val
        AND resource = check_resource
        AND action = check_action
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM user_profiles
    WHERE id = user_id;
    
    RETURN COALESCE(user_role_val, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 