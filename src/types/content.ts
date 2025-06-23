// Content Management Types - Own The Flow
// Matches the database schema from migration 009_create_content_schema.sql

export type ContentStatus = 'draft' | 'published' | 'archived'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type LessonType = 'reading' | 'video' | 'interactive' | 'quiz'
export type ChallengeType = 'quiz' | 'code' | 'essay' | 'multiple_choice'
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped'
export type CertificateType = 'completion' | 'achievement'
export type CertificateStatus = 'issued' | 'revoked'

// Learning Path
export interface LearningPath {
  id: string
  title: string
  slug: string
  description?: string
  short_description?: string
  difficulty: DifficultyLevel
  estimated_hours: number
  status: ContentStatus
  featured: boolean
  image_url?: string
  tags: string[]
  prerequisites: string[]
  learning_outcomes: string[]
  
  // Metadata
  created_by?: string
  updated_by?: string
  published_by?: string
  published_at?: string
  created_at: string
  updated_at: string
  
  // Relationships (populated via joins)
  courses?: Course[]
  course_count?: number
}

// Course
export interface Course {
  id: string
  path_id: string
  title: string
  slug: string
  description?: string
  short_description?: string
  difficulty: DifficultyLevel
  estimated_hours: number
  status: ContentStatus
  sort_order: number
  image_url?: string
  
  // Metadata
  created_by?: string
  updated_by?: string
  published_by?: string
  published_at?: string
  created_at: string
  updated_at: string
  
  // Relationships
  path?: LearningPath
  modules?: Module[]
  module_count?: number
}

// Module
export interface Module {
  id: string
  course_id: string
  title: string
  slug: string
  description?: string
  short_description?: string
  estimated_minutes: number
  status: ContentStatus
  sort_order: number
  
  // Metadata
  created_by?: string
  updated_by?: string
  published_by?: string
  published_at?: string
  created_at: string
  updated_at: string
  
  // Relationships
  course?: Course
  lessons?: Lesson[]
  lesson_count?: number
}

// Lesson
export interface Lesson {
  id: string
  module_id: string
  title: string
  slug: string
  content?: string // Markdown content
  summary?: string
  estimated_minutes: number
  xp_reward: number
  status: ContentStatus
  sort_order: number
  lesson_type: LessonType
  
  // Optional media
  video_url?: string
  video_duration?: number // seconds
  
  // SEO
  meta_title?: string
  meta_description?: string
  
  // Metadata
  created_by?: string
  updated_by?: string
  published_by?: string
  published_at?: string
  created_at: string
  updated_at: string
  
  // Relationships
  module?: Module
  challenges?: Challenge[]
  challenge_count?: number
}

// Challenge
export interface Challenge {
  id: string
  lesson_id: string
  title: string
  description: string
  challenge_type: ChallengeType
  content: any // JSONB - challenge-specific data
  solution: any // JSONB - expected answers
  hints: string[]
  xp_reward: number
  max_attempts?: number
  time_limit?: number // minutes
  sort_order: number
  
  // Metadata
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
  
  // Relationships
  lesson?: Lesson
}

// User Progress
export interface UserProgress {
  id: string
  user_id: string
  content_id: string
  content_type: 'path' | 'course' | 'module' | 'lesson' | 'challenge'
  
  // Progress data
  status: ProgressStatus
  completion_percentage: number
  time_spent?: number // minutes
  
  // Timestamps
  started_at?: string
  completed_at?: string
  updated_at: string
  
  // Scoring
  xp_earned: number
  score?: number
  attempts: number
  
  created_at: string
}

// User XP
export interface UserXP {
  id: string
  user_id: string
  total_xp: number
  current_level: number
  current_streak: number
  longest_streak: number
  created_at: string
  updated_at: string
}

// XP Level
export interface XPLevel {
  level_id: number
  title: string
  xp_required: number
  badge_icon: string
  badge_color: string
}

// Certificate
export interface Certificate {
  id: string
  user_id: string
  path_id?: string
  course_id?: string
  
  // Certificate data
  certificate_type: CertificateType
  title: string
  description?: string
  verification_code: string
  status: CertificateStatus
  
  // Metadata
  issued_by?: string
  issued_at: string
  revoked_by?: string
  revoked_at?: string
  
  // Relationships
  path?: LearningPath
  course?: Course
}

// Content Creation/Update DTOs
export interface CreateLearningPathDto {
  title: string
  slug: string
  description?: string
  short_description?: string
  difficulty: DifficultyLevel
  estimated_hours?: number
  featured?: boolean
  image_url?: string
  tags?: string[]
  prerequisites?: string[]
  learning_outcomes?: string[]
}

export interface UpdateLearningPathDto extends Partial<CreateLearningPathDto> {
  status?: ContentStatus
}

export interface CreateCourseDto {
  path_id: string
  title: string
  slug: string
  description?: string
  short_description?: string
  difficulty: DifficultyLevel
  estimated_hours?: number
  sort_order?: number
  image_url?: string
}

export interface UpdateCourseDto extends Partial<CreateCourseDto> {
  status?: ContentStatus
}

export interface CreateModuleDto {
  course_id: string
  title: string
  slug: string
  description?: string
  short_description?: string
  estimated_minutes?: number
  sort_order?: number
}

export interface UpdateModuleDto extends Partial<CreateModuleDto> {
  status?: ContentStatus
}

export interface CreateLessonDto {
  module_id: string
  title: string
  slug: string
  content?: string
  summary?: string
  estimated_minutes?: number
  xp_reward?: number
  lesson_type?: LessonType
  sort_order?: number
  video_url?: string
  video_duration?: number
  meta_title?: string
  meta_description?: string
}

export interface UpdateLessonDto extends Partial<CreateLessonDto> {
  status?: ContentStatus
}

export interface CreateChallengeDto {
  lesson_id: string
  title: string
  description: string
  challenge_type: ChallengeType
  content: any
  solution: any
  hints?: string[]
  xp_reward?: number
  max_attempts?: number
  time_limit?: number
  sort_order?: number
}

export interface UpdateChallengeDto extends Partial<CreateChallengeDto> {}

// Progress tracking
export interface UpdateProgressDto {
  status?: ProgressStatus
  completion_percentage?: number
  xp_earned?: number
  score?: number
}

// Search and filtering
export interface ContentSearchParams {
  query?: string
  status?: ContentStatus[]
  difficulty?: DifficultyLevel[]
  tags?: string[]
  created_by?: string
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'difficulty'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Content statistics
export interface ContentStats {
  total_paths: number
  total_courses: number
  total_modules: number
  total_lessons: number
  total_challenges: number
  published_paths: number
  published_courses: number
  published_modules: number
  published_lessons: number
  total_users: number
  active_users: number
}

// User learning stats
export interface UserLearningStats {
  total_xp: number
  current_level: number
  paths_completed: number
  courses_completed: number
  lessons_completed: number
  challenges_completed: number
  certificates_earned: number
  current_streak: number
  longest_streak: number
  total_study_time: number // minutes
}

// Error handling types
export interface ServiceError {
  code: string
  message: string
  details?: any
  operation?: string
}

export interface ValidationError extends ServiceError {
  field?: string
  value?: any
}

export interface ApiResponse<T> {
  data?: T
  error?: ServiceError
  success: boolean
}

// Rate limiting types
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

// Enhanced auth types
export interface AuthContext {
  user: any | null // Use any for now to avoid circular imports
  userProfile: any | null // Use any for now to avoid circular imports
  loading: boolean
  hydrated: boolean
} 