import { supabase } from './supabase'
import type { 
  LearningPath, 
  Course, 
  Module, 
  Lesson, 
  Challenge,
  UserProgress,
  UserXP,
  XPLevel,
  Certificate,
  CreateLearningPathDto,
  UpdateLearningPathDto,
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  CreateChallengeDto,
  UpdateChallengeDto,
  UpdateProgressDto,
  ContentSearchParams,
  ContentStats,
  UserLearningStats
} from '@/types/content'

// Input validation and sanitization helpers
function validateString(value: any, minLength: number = 1, maxLength: number = 255): string {
  if (typeof value !== 'string') {
    throw new Error('Value must be a string')
  }
  
  const trimmed = value.trim()
  if (trimmed.length < minLength) {
    throw new Error(`Value must be at least ${minLength} characters`)
  }
  if (trimmed.length > maxLength) {
    throw new Error(`Value must be no more than ${maxLength} characters`)
  }
  
  return trimmed
}

function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const trimmed = email.trim().toLowerCase()
  
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format')
  }
  
  return trimmed
}

function validateUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(id)) {
    throw new Error('Invalid UUID format')
  }
  
  return id
}

function sanitizeHTML(html: string): string {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

// Cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

// Cache TTL in milliseconds
const CACHE_TTL = {
  STATS: 5 * 60 * 1000, // 5 minutes
  LEVELS: 60 * 60 * 1000, // 1 hour
  CONTENT: 2 * 60 * 1000, // 2 minutes
}

// Helper function to get from cache or execute function
async function withCache<T>(
  key: string, 
  fn: () => Promise<T>, 
  ttl: number = CACHE_TTL.CONTENT
): Promise<T> {
  const cached = cache.get(key)
  
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T
  }
  
  try {
    const data = await fn()
    cache.set(key, { data, timestamp: Date.now(), ttl })
    return data
  } catch (error) {
    // If we have stale cached data, return it as fallback
    if (cached) {
      console.warn(`Using stale cache for ${key} due to error:`, error)
      return cached.data as T
    }
    throw error
  }
}

// Helper function to clear cache entries
function clearCache(pattern?: string) {
  if (!pattern) {
    cache.clear()
    return
  }
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

// Basic rate limiting for client-side operations
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number = 30 // requests per minute
  private readonly windowMs: number = 60 * 1000 // 1 minute

  canMakeRequest(key: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < this.windowMs)
    
    if (recentRequests.length >= this.maxRequests) {
      return false
    }
    
    recentRequests.push(now)
    this.requests.set(key, recentRequests)
    return true
  }
}

const rateLimiter = new RateLimiter()

// Enhanced error handling
function handleError(operation: string, error: any): void {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Log full error details only in development
  if (isDevelopment) {
    console.error(`ContentService.${operation}:`, error)
  } else {
    // In production, log only safe information
    console.error(`ContentService operation failed: ${operation}`)
  }
  
  // TODO: In production, send error to monitoring service
  // Example: Sentry.captureException(error, { tags: { operation } })
}

// Database connection validation
function validateSupabase(): boolean {
  if (!supabase) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Supabase client not initialized')
    }
    return false
  }
  return true
}

export class ContentService {
  // ============================================================================
  // LEARNING PATHS
  // ============================================================================

  static async getLearningPaths(params?: ContentSearchParams): Promise<LearningPath[]> {
    try {
      if (!validateSupabase()) return []

      const cacheKey = `learning_paths_${JSON.stringify(params || {})}`
      
      return await withCache(cacheKey, async () => {
        let query = supabase
          .from('learning_paths')
          .select(`
            *,
            courses:courses(count)
          `)

        // Apply filters
        if (params?.status) {
          query = query.in('status', params.status)
        }
        if (params?.difficulty) {
          query = query.in('difficulty', params.difficulty)
        }
        if (params?.query) {
          query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`)
        }

        // Apply sorting
        const sortBy = params?.sort_by || 'created_at'
        const sortOrder = params?.sort_order || 'desc'
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })

        // Apply pagination
        if (params?.limit) {
          query = query.limit(params.limit)
        }
        if (params?.offset) {
          query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch learning paths: ${error.message}`)
        }

        return data?.map((path: any) => ({
          ...path,
          course_count: path.courses?.[0]?.count || 0
        })) || []
      })
    } catch (error) {
      handleError('getLearningPaths', error)
      return []
    }
  }

  static async getLearningPath(id: string): Promise<LearningPath | null> {
    try {
      if (!validateSupabase()) return null

      const cacheKey = `learning_path_${id}`
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('learning_paths')
          .select(`
            *,
            courses:courses(
              *,
              modules:modules(count)
            )
          `)
          .eq('id', id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch learning path: ${error.message}`)
        }

        return data
      })
    } catch (error) {
      handleError('getLearningPath', error)
      return null
    }
  }

  static async getLearningPathBySlug(slug: string): Promise<LearningPath | null> {
    try {
      if (!validateSupabase()) return null

      const cacheKey = `learning_path_slug_${slug}`
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('learning_paths')
          .select(`
            *,
            courses:courses(
              *,
              modules:modules(
                *,
                lessons:lessons(*)
              )
            )
          `)
          .eq('slug', slug)
          .maybeSingle()

        if (error) {
          throw new Error(`Failed to fetch learning path: ${error.message}`)
        }

        return data
      })
    } catch (error) {
      handleError('getLearningPathBySlug', error)
      return null
    }
  }

  static async createLearningPath(data: CreateLearningPathDto): Promise<LearningPath | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      const { data: result, error } = await supabase
        .from('learning_paths')
        .insert({
          ...data,
          created_by: user.data.user.id
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create learning path: ${error.message}`)
      }

      // Clear relevant cache entries
      clearCache('learning_paths')
      clearCache('stats')

      return result
    } catch (error) {
      handleError('createLearningPath', error)
      return null
    }
  }

  static async updateLearningPath(id: string, data: UpdateLearningPathDto): Promise<LearningPath | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      // Check if learning path exists first
      const { data: existingPath, error: checkError } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (checkError) {
        throw new Error(`Failed to verify learning path: ${checkError.message}`)
      }

      if (!existingPath) {
        throw new Error('Learning path not found')
      }

      // Check for changes to avoid unnecessary updates
      const hasChanges = Object.keys(data).some(key => {
        return data[key as keyof UpdateLearningPathDto] !== existingPath[key as keyof typeof existingPath]
      })

      if (!hasChanges) {
        console.log('No changes detected for learning path:', id)
        return existingPath as LearningPath
      }

      // If slug is being changed, validate uniqueness
      if (data.slug && data.slug !== existingPath.slug) {
        const { data: duplicateCheck, error: duplicateError } = await supabase
          .from('learning_paths')
          .select('id')
          .eq('slug', data.slug)
          .neq('id', id)
          .maybeSingle()

        if (duplicateError) {
          throw new Error(`Failed to check slug uniqueness: ${duplicateError.message}`)
        }

        if (duplicateCheck) {
          throw new Error(`A learning path with slug "${data.slug}" already exists`)
        }
      }

      // Prepare update data
      const updateData: any = {
        ...data,
        updated_by: user.data.user.id
      }

      // If status is being changed to 'published', set published metadata
      if (data.status === 'published') {
        updateData.published_by = user.data.user.id
        updateData.published_at = new Date().toISOString()
      }

      const { data: result, error } = await supabase
        .from('learning_paths')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to update learning path: ${error.message}`)
      }

      if (!result) {
        // If no result returned, fetch the current data as fallback
        console.warn('Update returned no data, fetching current learning path data')
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('learning_paths')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (fallbackError) {
          throw new Error(`Failed to fetch updated learning path: ${fallbackError.message}`)
        }

        if (!fallbackResult) {
          throw new Error('Learning path not found after update')
        }

        // Clear relevant cache entries
        clearCache('learning_paths')
        clearCache(`learning_path_${id}`)
        clearCache('stats')

        return fallbackResult
      }

      // Cascade status changes to child content if status changed to draft or archived
      if (data.status && (data.status === 'draft' || data.status === 'archived')) {
        await ContentService.cascadeStatusFromLearningPath(id, data.status)
      }

      // Clear relevant cache entries
      clearCache('learning_paths')
      clearCache(`learning_path_${id}`)
      clearCache('stats')

      return result
    } catch (error) {
      handleError('updateLearningPath', error)
      return null
    }
  }

  // ============================================================================
  // COURSES
  // ============================================================================

  static async getCourses(pathId?: string): Promise<Course[]> {
    try {
      if (!validateSupabase()) return []

      const cacheKey = `courses_${pathId || 'all'}`
      
      return await withCache(cacheKey, async () => {
        let query = supabase
          .from('courses')
          .select(`
            *,
            path:learning_paths(*),
            modules:modules(count)
          `)
          .order('sort_order', { ascending: true })

        if (pathId) {
          query = query.eq('path_id', pathId)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch courses: ${error.message}`)
        }

        return data?.map((course: any) => ({
          ...course,
          module_count: course.modules?.[0]?.count || 0
        })) || []
      })
    } catch (error) {
      handleError('getCourses', error)
      return []
    }
  }

  static async getCourse(id: string): Promise<Course | null> {
    try {
      if (!validateSupabase()) return null

      const cacheKey = `course_${id}`
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            path:learning_paths(*),
            modules:modules(
              *,
              lessons:lessons(count)
            )
          `)
          .eq('id', id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch course: ${error.message}`)
        }

        return data
      })
    } catch (error) {
      handleError('getCourse', error)
      return null
    }
  }

  static async createCourse(data: CreateCourseDto): Promise<Course | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      const { data: result, error } = await supabase
        .from('courses')
        .insert({
          ...data,
          created_by: user.data.user.id
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create course: ${error.message}`)
      }

      // Clear relevant cache entries
      clearCache('courses')
      clearCache('learning_paths')
      clearCache('stats')

      return result
    } catch (error) {
      handleError('createCourse', error)
      return null
    }
  }

  static async updateCourse(id: string, data: UpdateCourseDto): Promise<Course | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      // Check if course exists first
      const { data: existingCourse, error: checkError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (checkError) {
        throw new Error(`Failed to verify course: ${checkError.message}`)
      }

      if (!existingCourse) {
        throw new Error('Course not found')
      }

      // Check for changes to avoid unnecessary updates
      const hasChanges = Object.keys(data).some(key => {
        return data[key as keyof UpdateCourseDto] !== existingCourse[key as keyof typeof existingCourse]
      })

      if (!hasChanges) {
        console.log('No changes detected for course:', id)
        return existingCourse as Course
      }

      // If slug is being changed, validate uniqueness within the same learning path
      if (data.slug && data.slug !== existingCourse.slug) {
        const { data: duplicateCheck, error: duplicateError } = await supabase
          .from('courses')
          .select('id')
          .eq('path_id', existingCourse.path_id)
          .eq('slug', data.slug)
          .neq('id', id)
          .maybeSingle()

        if (duplicateError) {
          throw new Error(`Failed to check slug uniqueness: ${duplicateError.message}`)
        }

        if (duplicateCheck) {
          throw new Error(`A course with slug "${data.slug}" already exists in this learning path`)
        }
      }

      // Prepare update data
      const updateData: any = {
        ...data,
        updated_by: user.data.user.id
      }

      // If status is being changed to 'published', set published metadata
      if (data.status === 'published') {
        updateData.published_by = user.data.user.id
        updateData.published_at = new Date().toISOString()
      }

      const { data: result, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to update course: ${error.message}`)
      }

      if (!result) {
        // If no result returned, fetch the current data as fallback
        console.warn('Update returned no data, fetching current course data')
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (fallbackError) {
          throw new Error(`Failed to fetch updated course: ${fallbackError.message}`)
        }

        if (!fallbackResult) {
          throw new Error('Course not found after update')
        }

        // Clear relevant cache entries
        clearCache('courses')
        clearCache(`course_${id}`)
        clearCache('learning_paths')
        clearCache('stats')

        return fallbackResult
      }

      // Cascade status changes to child content if status changed to draft or archived
      if (data.status && (data.status === 'draft' || data.status === 'archived')) {
        await ContentService.cascadeStatusFromCourse(id, data.status)
      }

      // Clear relevant cache entries
      clearCache('courses')
      clearCache(`course_${id}`)
      clearCache('learning_paths')
      clearCache('stats')

      return result
    } catch (error) {
      handleError('updateCourse', error)
      return null
    }
  }

  // ============================================================================
  // MODULES
  // ============================================================================

  static async getModules(courseId?: string): Promise<Module[]> {
    try {
      if (!validateSupabase()) return []

      const cacheKey = `modules_${courseId || 'all'}`
      
      return await withCache(cacheKey, async () => {
        let query = supabase
          .from('modules')
          .select(`
            *,
            course:courses(*),
            lessons:lessons(count)
          `)
          .order('sort_order', { ascending: true })

        if (courseId) {
          query = query.eq('course_id', courseId)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch modules: ${error.message}`)
        }

        return data?.map((module: any) => ({
          ...module,
          lesson_count: module.lessons?.[0]?.count || 0
        })) || []
      })
    } catch (error) {
      handleError('getModules', error)
      return []
    }
  }

  static async getModule(id: string): Promise<Module | null> {
    try {
      if (!validateSupabase()) return null

      const cacheKey = `module_${id}`
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('modules')
          .select(`
            *,
            course:courses(*),
            lessons:lessons(
              *,
              challenges:challenges(count)
            )
          `)
          .eq('id', id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch module: ${error.message}`)
        }

        return data
      })
    } catch (error) {
      handleError('getModule', error)
      return null
    }
  }

  static async createModule(data: CreateModuleDto): Promise<Module | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      const { data: result, error } = await supabase
        .from('modules')
        .insert({
          ...data,
          created_by: user.data.user.id
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create module: ${error.message}`)
      }

      // Clear relevant cache entries
      clearCache('modules')
      clearCache('courses')
      clearCache('stats')

      return result
    } catch (error) {
      handleError('createModule', error)
      return null
    }
  }

  static async updateModule(id: string, data: UpdateModuleDto): Promise<Module | null> {
    try {
      if (!validateSupabase()) return null

      console.log(`Updating module ${id} with data:`, data)

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      // Check if there are any changes to apply
      if (Object.keys(data).length === 0) {
        throw new Error('No data provided for update')
      }

      // First, check if the module exists and get current data
      const { data: existingModule, error: fetchError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (fetchError) {
        throw new Error(`Error fetching module: ${fetchError.message}`)
      }

      if (!existingModule) {
        throw new Error('Module not found')
      }

      // If updating slug, check for conflicts within the same course
      if (data.slug && data.slug !== existingModule.slug) {
        const courseId = data.course_id || existingModule.course_id
        
        const { data: conflictCheck, error: conflictError } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', courseId)
          .eq('slug', data.slug)
          .neq('id', id)
          .limit(1)

        if (conflictError) {
          throw new Error(`Error checking slug uniqueness: ${conflictError.message}`)
        }
        
        if (conflictCheck && conflictCheck.length > 0) {
          throw new Error(`A module with slug "${data.slug}" already exists in this course`)
        }
      }

      // Prepare update data
      const updateData: any = {
        ...data,
        updated_by: user.data.user.id
      }

      // If status is being changed to 'published', set published metadata
      if (data.status === 'published') {
        updateData.published_by = user.data.user.id
        updateData.published_at = new Date().toISOString()
      }

      // Perform the update
      const { data: result, error } = await supabase
        .from('modules')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        throw new Error(`Failed to update module: ${error.message}`)
      }

      // If no rows were returned, it could mean no changes were needed
      // Let's fetch the current module to verify it exists and return it
      if (!result || result.length === 0) {
        const { data: currentModule, error: fetchError } = await supabase
          .from('modules')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (fetchError) {
          throw new Error(`Failed to fetch module after update: ${fetchError.message}`)
        }

        if (!currentModule) {
          throw new Error('Module not found')
        }

        // Return the current module data since no changes were made
        return currentModule
      }

      // Return the first result if we got an array
      const updatedModule = Array.isArray(result) ? result[0] : result

      // Cascade status changes to child content if status changed to draft or archived
      if (data.status && (data.status === 'draft' || data.status === 'archived')) {
        await ContentService.cascadeStatusFromModule(id, data.status)
      }

      // Clear relevant cache entries
      clearCache('modules')
      clearCache(`module_${id}`)
      clearCache('courses')
      clearCache('stats')

      return updatedModule
    } catch (error) {
      handleError('updateModule', error)
      return null
    }
  }

  // ============================================================================
  // LESSONS
  // ============================================================================

  static async getLessons(moduleId?: string): Promise<Lesson[]> {
    try {
      if (!validateSupabase()) return []

      const cacheKey = `lessons_${moduleId || 'all'}`
      
      return await withCache(cacheKey, async () => {
        let query = supabase
          .from('lessons')
          .select(`
            *,
            module:modules(*),
            challenges:challenges(count)
          `)
          .order('sort_order', { ascending: true })

        if (moduleId) {
          query = query.eq('module_id', moduleId)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch lessons: ${error.message}`)
        }

        return data?.map((lesson: any) => ({
          ...lesson,
          challenge_count: lesson.challenges?.[0]?.count || 0
        })) || []
      })
    } catch (error) {
      handleError('getLessons', error)
      return []
    }
  }

  static async getLesson(id: string): Promise<Lesson | null> {
    try {
      if (!validateSupabase()) return null

      const cacheKey = `lesson_${id}`
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('lessons')
          .select(`
            *,
            module:modules(*),
            challenges:challenges(*)
          `)
          .eq('id', id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch lesson: ${error.message}`)
        }

        return data
      })
    } catch (error) {
      handleError('getLesson', error)
      return null
    }
  }

  static async createLesson(data: CreateLessonDto): Promise<Lesson | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      // Validate required fields
      if (!data.module_id || data.module_id.trim() === '') {
        throw new Error('Module ID is required')
      }

      if (!data.title || data.title.trim() === '') {
        throw new Error('Title is required')
      }

      if (!data.slug || data.slug.trim() === '') {
        throw new Error('Slug is required')
      }

      const { data: result, error } = await supabase
        .from('lessons')
        .insert({
          ...data,
          created_by: user.data.user.id
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create lesson: ${error.message}`)
      }

      // Clear relevant cache entries
      clearCache('lessons')
      clearCache('modules')
      clearCache('stats')

      return result
    } catch (error) {
      handleError('createLesson', error)
      return null
    }
  }

  static async updateLesson(id: string, data: UpdateLessonDto): Promise<Lesson | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      // Validate required fields if they are being updated
      if (data.module_id !== undefined && (!data.module_id || data.module_id.trim() === '')) {
        throw new Error('Module ID is required')
      }

      if (data.title !== undefined && (!data.title || data.title.trim() === '')) {
        throw new Error('Title is required')
      }

      if (data.slug !== undefined && (!data.slug || data.slug.trim() === '')) {
        throw new Error('Slug is required')
      }

      // Check if there are any changes to apply
      if (Object.keys(data).length === 0) {
        throw new Error('No data provided for update')
      }

      // First, check if the lesson exists and get current data
      const { data: existingLesson, error: fetchError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (fetchError) {
        throw new Error(`Error fetching lesson: ${fetchError.message}`)
      }

      if (!existingLesson) {
        throw new Error('Lesson not found')
      }

      // If updating slug, check for conflicts within the same module
      if (data.slug && data.slug !== existingLesson.slug) {
        const moduleId = data.module_id || existingLesson.module_id
        
        const { data: conflictCheck, error: conflictError } = await supabase
          .from('lessons')
          .select('id')
          .eq('module_id', moduleId)
          .eq('slug', data.slug)
          .neq('id', id)
          .limit(1)

        if (conflictError) {
          throw new Error(`Error checking slug uniqueness: ${conflictError.message}`)
        }
        
        if (conflictCheck && conflictCheck.length > 0) {
          throw new Error(`A lesson with slug "${data.slug}" already exists in this module`)
        }
      }

      // Prepare update data
      const updateData: any = {
        ...data,
        updated_by: user.data.user.id
      }

      // If status is being changed to 'published', set published metadata
      if (data.status === 'published') {
        updateData.published_by = user.data.user.id
        updateData.published_at = new Date().toISOString()
      }

      // Perform the update
      const { data: result, error } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        throw new Error(`Failed to update lesson: ${error.message}`)
      }

      // If no rows were returned, it could mean no changes were needed
      // Let's fetch the current lesson to verify it exists and return it
      if (!result || result.length === 0) {
        const { data: currentLesson, error: fetchError } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (fetchError) {
          throw new Error(`Failed to fetch lesson after update: ${fetchError.message}`)
        }

        if (!currentLesson) {
          throw new Error('Lesson not found')
        }

        // Return the current lesson data since no changes were made
        return currentLesson
      }

      // Return the first result if we got an array
      const updatedLesson = Array.isArray(result) ? result[0] : result

      // Cascade status changes to child content if status changed to draft or archived
      if (data.status && (data.status === 'draft' || data.status === 'archived')) {
        await ContentService.cascadeStatusFromLesson(id, data.status)
      }

      // Clear relevant cache entries
      clearCache('lessons')
      clearCache(`lesson_${id}`)
      clearCache('modules')
      clearCache('stats')

      return updatedLesson
    } catch (error) {
      handleError('updateLesson', error)
      return null
    }
  }

  // ============================================================================
  // CHALLENGES
  // ============================================================================

  static async getChallenges(lessonId?: string): Promise<Challenge[]> {
    try {
      if (!validateSupabase()) return []

      const cacheKey = `challenges_${lessonId || 'all'}`
      
      return await withCache(cacheKey, async () => {
        let query = supabase
          .from('challenges')
          .select(`
            *,
            lesson:lessons(*)
          `)
          .order('sort_order', { ascending: true })

        if (lessonId) {
          query = query.eq('lesson_id', lessonId)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch challenges: ${error.message}`)
        }

        return data || []
      })
    } catch (error) {
      handleError('getChallenges', error)
      return []
    }
  }

  static async getChallenge(id: string): Promise<Challenge | null> {
    try {
      if (!validateSupabase()) return null

      const cacheKey = `challenge_${id}`
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            lesson:lessons(*)
          `)
          .eq('id', id)
          .single()

        if (error) {
          throw new Error(`Failed to fetch challenge: ${error.message}`)
        }

        return data
      })
    } catch (error) {
      handleError('getChallenge', error)
      return null
    }
  }

  static async createChallenge(data: CreateChallengeDto): Promise<Challenge | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      const { data: result, error } = await supabase
        .from('challenges')
        .insert({
          ...data,
          created_by: user.data.user.id
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create challenge: ${error.message}`)
      }

      // Clear relevant cache entries
      clearCache('challenges')
      clearCache('lessons')
      clearCache('stats')

      return result
    } catch (error) {
      handleError('createChallenge', error)
      return null
    }
  }

  static async updateChallenge(id: string, data: UpdateChallengeDto): Promise<Challenge | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      // Check if there are any changes to apply
      if (Object.keys(data).length === 0) {
        throw new Error('No data provided for update')
      }

      // First, check if the challenge exists and get current data
      const { data: existingChallenge, error: fetchError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (fetchError) {
        throw new Error(`Error fetching challenge: ${fetchError.message}`)
      }

      if (!existingChallenge) {
        throw new Error('Challenge not found')
      }

      // Prepare update data
      const updateData = {
        ...data,
        updated_by: user.data.user.id
      }

      // Perform the update
      const { data: result, error } = await supabase
        .from('challenges')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        throw new Error(`Failed to update challenge: ${error.message}`)
      }

      // If no rows were returned, it could mean no changes were needed
      // Let's fetch the current challenge to verify it exists and return it
      if (!result || result.length === 0) {
        const { data: currentChallenge, error: fetchError } = await supabase
          .from('challenges')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (fetchError) {
          throw new Error(`Failed to fetch challenge after update: ${fetchError.message}`)
        }

        if (!currentChallenge) {
          throw new Error('Challenge not found')
        }

        // Return the current challenge data since no changes were made
        return currentChallenge
      }

      // Return the first result if we got an array
      const updatedChallenge = Array.isArray(result) ? result[0] : result

      // Clear relevant cache entries
      clearCache('challenges')
      clearCache(`challenge_${id}`)
      clearCache('lessons')
      clearCache('stats')

      return updatedChallenge
    } catch (error) {
      handleError('updateChallenge', error)
      return null
    }
  }



  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================

  static async getUserProgress(userId: string, contentId?: string, contentType?: 'path' | 'course' | 'module' | 'lesson' | 'challenge'): Promise<UserProgress[]> {
    try {
      if (!validateSupabase()) return []

      const cacheKey = `user_progress_${userId}_${contentId || 'all'}_${contentType || 'all'}`
      
      return await withCache(cacheKey, async () => {
        let query = supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId)

        if (contentId && contentType) {
          const contentColumn = `${contentType === 'path' ? 'path' : contentType}_id`
          query = query.eq(contentColumn, contentId)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch user progress: ${error.message}`)
        }

        return data || []
      }, CACHE_TTL.CONTENT / 2) // Shorter cache for progress data
    } catch (error) {
      handleError('getUserProgress', error)
      return []
    }
  }

  static async updateProgress(
    userId: string,
    contentId: string,
    contentType: 'path' | 'course' | 'module' | 'lesson' | 'challenge',
    data: UpdateProgressDto
  ): Promise<UserProgress | null> {
    try {
      if (!validateSupabase()) return null

      // Map content type to the correct column name
      const contentColumn = `${contentType === 'path' ? 'path' : contentType}_id`
      
      // Create progress record with the correct column structure
      const progressData: any = {
        user_id: userId,
        [contentColumn]: contentId,
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: result, error } = await supabase
        .from('user_progress')
        .upsert(progressData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update progress: ${error.message}`)
      }

      // Clear relevant cache entries
      clearCache(`user_progress_${userId}`)
      clearCache(`user_stats_${userId}`)

      return result
    } catch (error) {
      handleError('updateProgress', error)
      return null
    }
  }

  // ============================================================================
  // XP AND LEVELS
  // ============================================================================

  static async getUserXP(userId: string): Promise<UserXP | null> {
    try {
      if (!validateSupabase()) return null

      const cacheKey = `user_xp_${userId}`
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('user_xp')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw new Error(`Failed to fetch user XP: ${error.message}`)
        }

        return data
      }, CACHE_TTL.CONTENT / 2) // Shorter cache for XP data
    } catch (error) {
      handleError('getUserXP', error)
      return null
    }
  }

  static async getXPLevels(): Promise<XPLevel[]> {
    try {
      if (!validateSupabase()) return []

      const cacheKey = 'xp_levels'
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('xp_levels')
          .select('*')
          .order('level', { ascending: true })

        if (error) {
          throw new Error(`Failed to fetch XP levels: ${error.message}`)
        }

        return data || []
      }, CACHE_TTL.LEVELS)
    } catch (error) {
      handleError('getXPLevels', error)
      return []
    }
  }

  // ============================================================================
  // CERTIFICATES
  // ============================================================================

  static async getUserCertificates(userId: string): Promise<Certificate[]> {
    try {
      if (!validateSupabase()) return []

      const cacheKey = `user_certificates_${userId}`
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', userId)
          .order('issued_at', { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch user certificates: ${error.message}`)
        }

        return data || []
      })
    } catch (error) {
      handleError('getUserCertificates', error)
      return []
    }
  }

  static async getCertificateByCode(verificationCode: string): Promise<Certificate | null> {
    try {
      if (!validateSupabase()) return null

      const cacheKey = `certificate_${verificationCode}`
      
      return await withCache(cacheKey, async () => {
        const { data, error } = await supabase
          .from('certificates')
          .select(`
            *,
            user:user_profiles(display_name, avatar_url),
            path:learning_paths(title, description),
            course:courses(title, description)
          `)
          .eq('verification_code', verificationCode)
          .single()

        if (error) {
          throw new Error(`Failed to fetch certificate: ${error.message}`)
        }

        return data
      })
    } catch (error) {
      handleError('getCertificateByCode', error)
      return null
    }
  }

  /**
   * Issue a certificate for completing a learning path or course
   */
  static async issueCertificate(
    userId: string,
    contentId: string,
    contentType: 'path' | 'course',
    certificateType: 'completion' | 'achievement' = 'completion'
  ): Promise<Certificate | null> {
    try {
      if (!validateSupabase()) return null

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      // Generate unique verification code
      const verificationCode = await this.generateVerificationCode()

      // Get content details for certificate
      const contentTable = contentType === 'path' ? 'learning_paths' : 'courses'
      const { data: content, error: contentError } = await supabase
        .from(contentTable)
        .select('title, description')
        .eq('id', contentId)
        .single()

      if (contentError || !content) {
        throw new Error(`Failed to fetch ${contentType} details: ${contentError?.message}`)
      }

      // Create certificate record
      const certificateData = {
        user_id: userId,
        ...(contentType === 'path' ? { path_id: contentId } : { course_id: contentId }),
        certificate_type: certificateType,
        title: `${certificateType === 'completion' ? 'Certificate of Completion' : 'Achievement Certificate'} - ${content.title}`,
        description: `This certifies that the learner has successfully completed ${content.title}`,
        verification_code: verificationCode,
        status: 'issued' as const,
        issued_by: user.data.user.id,
        issued_at: new Date().toISOString()
      }

      const { data: certificate, error } = await supabase
        .from('certificates')
        .insert(certificateData)
        .select(`
          *,
          user:user_profiles(display_name, avatar_url),
          path:learning_paths(title, description),
          course:courses(title, description)
        `)
        .single()

      if (error) {
        throw new Error(`Failed to issue certificate: ${error.message}`)
      }

      // Clear relevant cache entries
      clearCache(`user_certificates_${userId}`)
      clearCache(`user_stats_${userId}`)

      return certificate
    } catch (error) {
      handleError('issueCertificate', error)
      return null
    }
  }

  /**
   * Revoke a certificate (admin only)
   */
  static async revokeCertificate(certificateId: string, reason?: string): Promise<boolean> {
    try {
      if (!validateSupabase()) return false

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.data.user.id)
        .single()

      if (profileError || profile?.role !== 'admin') {
        throw new Error('Only admins can revoke certificates')
      }

      const { error } = await supabase
        .from('certificates')
        .update({
          status: 'revoked',
          revoked_by: user.data.user.id,
          revoked_at: new Date().toISOString()
        })
        .eq('id', certificateId)

      if (error) {
        throw new Error(`Failed to revoke certificate: ${error.message}`)
      }

      // Clear cache
      clearCache('certificate_')

      return true
    } catch (error) {
      handleError('revokeCertificate', error)
      return false
    }
  }

  /**
   * Generate a unique verification code for certificates
   */
  private static async generateVerificationCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const length = 12
    
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      let code = ''
      for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length))
      }

      // Format as XXX-XXX-XXX-XXX
      const formattedCode = code.match(/.{1,3}/g)?.join('-') || code

      // Check if code already exists
      const { data, error } = await supabase
        .from('certificates')
        .select('id')
        .eq('verification_code', formattedCode)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error(`Failed to check verification code uniqueness: ${error.message}`)
      }

      if (!data) {
        return formattedCode
      }

      attempts++
    }

    throw new Error('Failed to generate unique verification code after maximum attempts')
  }

  /**
   * Check if user has completed a learning path (all courses and lessons completed)
   */
  static async checkPathCompletion(userId: string, pathId: string): Promise<boolean> {
    try {
      if (!validateSupabase()) return false

      // Get all published courses in the path
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('path_id', pathId)
        .eq('status', 'published')

      if (coursesError || !courses) {
        return false
      }

      if (courses.length === 0) {
        return false // Path has no courses
      }

      const courseIds = courses.map((c: { id: string }) => c.id)

      // Get all published modules in these courses
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id')
        .in('course_id', courseIds)
        .eq('status', 'published')

      if (modulesError || !modules) {
        return false
      }

      if (modules.length === 0) {
        return false // Courses have no modules
      }

      const moduleIds = modules.map((m: { id: string }) => m.id)

      // Get all published lessons in these modules
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds)
        .eq('status', 'published')

      if (lessonsError || !lessons) {
        return false
      }

      if (lessons.length === 0) {
        return false // Modules have no lessons
      }

      const lessonIds = lessons.map((l: { id: string }) => l.id)

      // Check user progress for all lessons
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('lesson_id, status')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds)
        .eq('status', 'completed')

      if (progressError) {
        return false
      }

      // User has completed the path if they completed all required lessons
      return (progress?.length || 0) === lessonIds.length
    } catch (error) {
      handleError('checkPathCompletion', error)
      return false
    }
  }

  /**
   * Automatically issue certificates when path/course is completed
   */
  static async autoIssueCertificateOnCompletion(
    userId: string,
    contentId: string,
    contentType: 'path' | 'course'
  ): Promise<Certificate | null> {
    try {
      // Check if certificate already exists
      const existing = await this.getUserCertificates(userId)
      const hasExisting = existing.some(cert => {
        return contentType === 'path' ? cert.path_id === contentId : cert.course_id === contentId
      })

      if (hasExisting) {
        return null // Certificate already issued
      }

      // Check if content is actually completed
      const isCompleted = contentType === 'path' 
        ? await this.checkPathCompletion(userId, contentId)
        : await this.checkCourseCompletion(userId, contentId)

      if (isCompleted) {
        return await this.issueCertificate(userId, contentId, contentType)
      }

      return null
    } catch (error) {
      handleError('autoIssueCertificateOnCompletion', error)
      return null
    }
  }

  /**
   * Check if user has completed a course (all modules and lessons completed)
   */
  static async checkCourseCompletion(userId: string, courseId: string): Promise<boolean> {
    try {
      if (!validateSupabase()) return false

      // Get all published modules in the course
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId)
        .eq('status', 'published')

      if (modulesError || !modules) {
        return false
      }

      if (modules.length === 0) {
        return false // Course has no modules
      }

      const moduleIds = modules.map((m: { id: string }) => m.id)

      // Get all published lessons in these modules
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds)
        .eq('status', 'published')

      if (lessonsError || !lessons) {
        return false
      }

      if (lessons.length === 0) {
        return false // Modules have no lessons
      }

      const lessonIds = lessons.map((l: { id: string }) => l.id)

      // Check user progress for all lessons
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('lesson_id, status')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds)
        .eq('status', 'completed')

      if (progressError) {
        return false
      }

      // User has completed the course if they completed all required lessons
      return (progress?.length || 0) === lessonIds.length
    } catch (error) {
      handleError('checkCourseCompletion', error)
      return false
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  static async getContentStats(): Promise<ContentStats> {
    try {
      if (!validateSupabase()) {
        return {
          total_paths: 0,
          total_courses: 0,
          total_modules: 0,
          total_lessons: 0,
          total_challenges: 0,
          published_paths: 0,
          published_courses: 0,
          published_modules: 0,
          published_lessons: 0,
          total_users: 0,
          active_users: 0
        }
      }

      const cacheKey = 'content_stats'
      
      return await withCache(cacheKey, async () => {
        const [
          pathsResult,
          coursesResult,
          modulesResult,
          lessonsResult,
          challengesResult,
          usersResult
        ] = await Promise.allSettled([
          supabase.from('learning_paths').select('id, status', { count: 'exact' }),
          supabase.from('courses').select('id, status', { count: 'exact' }),
          supabase.from('modules').select('id, status', { count: 'exact' }),
          supabase.from('lessons').select('id, status', { count: 'exact' }),
          supabase.from('challenges').select('id', { count: 'exact' }),
          supabase.from('user_profiles').select('id, last_active_at', { count: 'exact' })
        ])

        const getCount = (result: any) => result.status === 'fulfilled' ? result.value.count || 0 : 0
        const getData = (result: any) => result.status === 'fulfilled' ? result.value.data || [] : []

        const pathsData = getData(pathsResult)
        const coursesData = getData(coursesResult)
        const modulesData = getData(modulesResult)
        const lessonsData = getData(lessonsResult)
        const usersData = getData(usersResult)

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        return {
          total_paths: getCount(pathsResult),
          total_courses: getCount(coursesResult),
          total_modules: getCount(modulesResult),
          total_lessons: getCount(lessonsResult),
          total_challenges: getCount(challengesResult),
          published_paths: pathsData.filter((p: any) => p.status === 'published').length,
          published_courses: coursesData.filter((c: any) => c.status === 'published').length,
          published_modules: modulesData.filter((m: any) => m.status === 'published').length,
          published_lessons: lessonsData.filter((l: any) => l.status === 'published').length,
          total_users: getCount(usersResult),
          active_users: usersData.filter((u: any) => 
            u.last_active_at && new Date(u.last_active_at) > thirtyDaysAgo
          ).length
        }
      }, CACHE_TTL.STATS)
    } catch (error) {
      handleError('getContentStats', error)
      return {
        total_paths: 0,
        total_courses: 0,
        total_modules: 0,
        total_lessons: 0,
        total_challenges: 0,
        published_paths: 0,
        published_courses: 0,
        published_modules: 0,
        published_lessons: 0,
        total_users: 0,
        active_users: 0
      }
    }
  }

  static async getUserLearningStats(userId: string): Promise<UserLearningStats> {
    try {
      if (!validateSupabase()) {
        return {
          total_xp: 0,
          current_level: 1,
          paths_completed: 0,
          courses_completed: 0,
          lessons_completed: 0,
          challenges_completed: 0,
          certificates_earned: 0,
          total_study_time: 0
        }
      }

      const cacheKey = `user_stats_${userId}`
      
      return await withCache(cacheKey, async () => {
        const [
          xpResult,
          progressResult,
          certificatesResult
        ] = await Promise.allSettled([
          supabase.from('user_xp').select('*').eq('user_id', userId).single(),
          supabase.from('user_progress').select('*').eq('user_id', userId),
          supabase.from('certificates').select('id', { count: 'exact' }).eq('user_id', userId)
        ])

        const xpData = xpResult.status === 'fulfilled' ? xpResult.value.data : null
        const progressData = progressResult.status === 'fulfilled' ? progressResult.value.data || [] : []
        const certificatesCount = certificatesResult.status === 'fulfilled' ? certificatesResult.value.count || 0 : 0

        const completedProgress = progressData.filter((p: any) => p.completed_at)

        return {
          total_xp: xpData?.total_xp || 0,
          current_level: xpData?.level_id || 1,
          paths_completed: completedProgress.filter((p: any) => p.content_type === 'path').length,
          courses_completed: completedProgress.filter((p: any) => p.content_type === 'course').length,
          lessons_completed: completedProgress.filter((p: any) => p.content_type === 'lesson').length,
          challenges_completed: completedProgress.filter((p: any) => p.content_type === 'challenge').length,
          certificates_earned: certificatesCount,
          total_study_time: progressData.reduce((total: number, p: any) => total + (p.time_spent || 0), 0)
        }
      }, CACHE_TTL.CONTENT / 2) // Shorter cache for user stats
    } catch (error) {
      handleError('getUserLearningStats', error)
      return {
        total_xp: 0,
        current_level: 1,
        paths_completed: 0,
        courses_completed: 0,
        lessons_completed: 0,
        challenges_completed: 0,
        certificates_earned: 0,
        total_study_time: 0
      }
    }
  }

  // ============================================================================
  // LEARNING PATH NAVIGATION
  // ============================================================================

  /**
   * Gets the first lesson in a learning path by traversing the hierarchy:
   * Learning Path → First Course → First Module → First Lesson
   */
  static async getFirstLessonInPath(pathId: string): Promise<{ lesson: Lesson; courseId: string; moduleId: string } | null> {
    try {
      if (!validateSupabase()) return null

      // Get the first published course in the learning path
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, sort_order')
        .eq('path_id', pathId)
        .eq('status', 'published')
        .order('sort_order')
        .limit(1)

      if (coursesError) {
        console.error('Error fetching courses:', coursesError.message)
        return null
      }

      if (!courses || courses.length === 0) {
        return null
      }

      const firstCourse = courses[0]

      // Get the first published module in the course
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id, title, sort_order')
        .eq('course_id', firstCourse.id)
        .eq('status', 'published')
        .order('sort_order')
        .limit(1)

      if (modulesError) {
        console.error('Error fetching modules:', modulesError.message)
        return null
      }

      if (!modules || modules.length === 0) {
        return null
      }

      const firstModule = modules[0]

      // Get the first published lesson in the module
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', firstModule.id)
        .eq('status', 'published')
        .order('sort_order')
        .limit(1)

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError.message)
        return null
      }

      if (!lessons || lessons.length === 0) {
        return null
      }

      return {
        lesson: lessons[0],
        courseId: firstCourse.id,
        moduleId: firstModule.id
      }
    } catch (error) {
      handleError('getFirstLessonInPath', error)
      return null
    }
  }

  /**
   * Starts a learning path for a user by:
   * 1. Creating initial progress record
   * 2. Returning the first lesson to navigate to
   */
  static async startLearningPath(userId: string, pathId: string): Promise<{ lesson: Lesson; courseId: string; moduleId: string } | null> {
    try {
      if (!validateSupabase()) return null

      // Get the first lesson
      const firstLessonData = await this.getFirstLessonInPath(pathId)
      if (!firstLessonData) {
        return null
      }

      // Create progress record for the learning path
      await this.updateProgress(userId, pathId, 'path', {
        status: 'in_progress',
        completion_percentage: 0,
        xp_earned: 0
      })

      console.log(`✅ Started learning path ${pathId} for user ${userId}`)
      return firstLessonData
    } catch (error) {
      handleError('startLearningPath', error)
      return null
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  static clearCache(pattern?: string): void {
    clearCache(pattern)
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    }
  }

  // ============================================================================
  // CASCADE STATUS CHANGE FUNCTIONS
  // ============================================================================

  /**
   * Cascades status changes from a learning path to all its child content
   * When a learning path is set to draft/archived, all courses, modules, lessons, and challenges follow
   */
  static async cascadeStatusFromLearningPath(pathId: string, newStatus: 'draft' | 'archived'): Promise<void> {
    try {
      if (!validateSupabase()) return

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      const updateData = {
        status: newStatus,
        updated_by: user.data.user.id,
        updated_at: new Date().toISOString()
      }

      // Get all course IDs for this learning path
      const { data: courses, error: coursesSelectError } = await supabase
        .from('courses')
        .select('id')
        .eq('path_id', pathId)

      if (coursesSelectError) {
        throw new Error(`Failed to get courses: ${coursesSelectError.message}`)
      }

      const courseIds = courses?.map((c: { id: string }) => c.id) || []

      // Update all courses in this learning path
      if (courseIds.length > 0) {
        const { error: coursesError } = await supabase
          .from('courses')
          .update(updateData)
          .in('id', courseIds)

        if (coursesError) {
          console.error('Error cascading status to courses:', coursesError)
          throw new Error(`Failed to cascade status to courses: ${coursesError.message}`)
        }

        // Get all module IDs for these courses
        const { data: modules, error: modulesSelectError } = await supabase
          .from('modules')
          .select('id')
          .in('course_id', courseIds)

        if (modulesSelectError) {
          throw new Error(`Failed to get modules: ${modulesSelectError.message}`)
        }

                 const moduleIds = modules?.map((m: { id: string }) => m.id) || []

        // Update all modules in these courses
        if (moduleIds.length > 0) {
          const { error: modulesError } = await supabase
            .from('modules')
            .update(updateData)
            .in('id', moduleIds)

          if (modulesError) {
            console.error('Error cascading status to modules:', modulesError)
            throw new Error(`Failed to cascade status to modules: ${modulesError.message}`)
          }

          // Get all lesson IDs for these modules
          const { data: lessons, error: lessonsSelectError } = await supabase
            .from('lessons')
            .select('id')
            .in('module_id', moduleIds)

          if (lessonsSelectError) {
            throw new Error(`Failed to get lessons: ${lessonsSelectError.message}`)
          }

                     const lessonIds = lessons?.map((l: { id: string }) => l.id) || []

          // Update all lessons in these modules
          if (lessonIds.length > 0) {
            const { error: lessonsError } = await supabase
              .from('lessons')
              .update(updateData)
              .in('id', lessonIds)

            if (lessonsError) {
              console.error('Error cascading status to lessons:', lessonsError)
              throw new Error(`Failed to cascade status to lessons: ${lessonsError.message}`)
            }

            // Update all challenges in these lessons
            const { error: challengesError } = await supabase
              .from('challenges')
              .update(updateData)
              .in('lesson_id', lessonIds)

            if (challengesError) {
              console.error('Error cascading status to challenges:', challengesError)
              throw new Error(`Failed to cascade status to challenges: ${challengesError.message}`)
            }
          }
        }
      }

      console.log(`✅ Successfully cascaded status '${newStatus}' from learning path ${pathId} to all child content`)

    } catch (error) {
      console.error('Error in cascadeStatusFromLearningPath:', error)
      throw error
    }
  }

  /**
   * Cascades status changes from a course to all its child content
   * When a course is set to draft/archived, all modules, lessons, and challenges follow
   */
  static async cascadeStatusFromCourse(courseId: string, newStatus: 'draft' | 'archived'): Promise<void> {
    try {
      if (!validateSupabase()) return

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      const updateData = {
        status: newStatus,
        updated_by: user.data.user.id,
        updated_at: new Date().toISOString()
      }

      // Update all modules in this course
      const { error: modulesError } = await supabase
        .from('modules')
        .update(updateData)
        .eq('course_id', courseId)

      if (modulesError) {
        console.error('Error cascading status to modules:', modulesError)
        throw new Error(`Failed to cascade status to modules: ${modulesError.message}`)
      }

      // Get all module IDs for this course
      const { data: modules, error: modulesSelectError } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId)

      if (modulesSelectError) {
        throw new Error(`Failed to get modules: ${modulesSelectError.message}`)
      }

      const moduleIds = modules?.map((m: { id: string }) => m.id) || []

      // Update all lessons in modules of this course
      if (moduleIds.length > 0) {
        const { error: lessonsError } = await supabase
          .from('lessons')
          .update(updateData)
          .in('module_id', moduleIds)

        if (lessonsError) {
          console.error('Error cascading status to lessons:', lessonsError)
          throw new Error(`Failed to cascade status to lessons: ${lessonsError.message}`)
        }

        // Get all lesson IDs for these modules
        const { data: lessons, error: lessonsSelectError } = await supabase
          .from('lessons')
          .select('id')
          .in('module_id', moduleIds)

        if (lessonsSelectError) {
          throw new Error(`Failed to get lessons: ${lessonsSelectError.message}`)
        }

        const lessonIds = lessons?.map((l: { id: string }) => l.id) || []

        // Update all challenges in lessons of modules of this course
        if (lessonIds.length > 0) {
          const { error: challengesError } = await supabase
            .from('challenges')
            .update(updateData)
            .in('lesson_id', lessonIds)

          if (challengesError) {
            console.error('Error cascading status to challenges:', challengesError)
            throw new Error(`Failed to cascade status to challenges: ${challengesError.message}`)
          }
        }
      }

      console.log(`✅ Successfully cascaded status '${newStatus}' from course ${courseId} to all child content`)

    } catch (error) {
      console.error('Error in cascadeStatusFromCourse:', error)
      throw error
    }
  }

  /**
   * Cascades status changes from a module to all its child content
   * When a module is set to draft/archived, all lessons and challenges follow
   */
  static async cascadeStatusFromModule(moduleId: string, newStatus: 'draft' | 'archived'): Promise<void> {
    try {
      if (!validateSupabase()) return

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      const updateData = {
        status: newStatus,
        updated_by: user.data.user.id,
        updated_at: new Date().toISOString()
      }

      // Update all lessons in this module
      const { error: lessonsError } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('module_id', moduleId)

      if (lessonsError) {
        console.error('Error cascading status to lessons:', lessonsError)
        throw new Error(`Failed to cascade status to lessons: ${lessonsError.message}`)
      }

      // Get all lesson IDs for this module
      const { data: lessons, error: lessonsSelectError } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', moduleId)

      if (lessonsSelectError) {
        throw new Error(`Failed to get lessons: ${lessonsSelectError.message}`)
      }

      const lessonIds = lessons?.map((l: { id: string }) => l.id) || []

      // Update all challenges in lessons of this module
      if (lessonIds.length > 0) {
        const { error: challengesError } = await supabase
          .from('challenges')
          .update(updateData)
          .in('lesson_id', lessonIds)

        if (challengesError) {
          console.error('Error cascading status to challenges:', challengesError)
          throw new Error(`Failed to cascade status to challenges: ${challengesError.message}`)
        }
              }

      console.log(`✅ Successfully cascaded status '${newStatus}' from module ${moduleId} to all child content`)

    } catch (error) {
      console.error('Error in cascadeStatusFromModule:', error)
      throw error
    }
  }

  /**
   * Cascades status changes from a lesson to all its child content
   * When a lesson is set to draft/archived, all challenges follow
   */
  static async cascadeStatusFromLesson(lessonId: string, newStatus: 'draft' | 'archived'): Promise<void> {
    try {
      if (!validateSupabase()) return

      const user = await supabase.auth.getUser()
      if (!user.data.user?.id) {
        throw new Error('User not authenticated')
      }

      const updateData = {
        status: newStatus,
        updated_by: user.data.user.id,
        updated_at: new Date().toISOString()
      }

      // Update all challenges in this lesson
      const { error: challengesError } = await supabase
        .from('challenges')
        .update(updateData)
        .eq('lesson_id', lessonId)

      if (challengesError) {
        console.error('Error cascading status to challenges:', challengesError)
        throw new Error(`Failed to cascade status to challenges: ${challengesError.message}`)
      }

      console.log(`✅ Successfully cascaded status '${newStatus}' from lesson ${lessonId} to all child content`)

    } catch (error) {
      console.error('Error in cascadeStatusFromLesson:', error)
      throw error
    }
  }

  // ============================================================================
  // ANALYTICS & INSIGHTS
  // ============================================================================

  /**
   * Get comprehensive analytics data for the platform
   */
  static async getAnalytics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalPaths: number;
    totalLessons: number;
    totalCertificates: number;
    avgSessionTime: number;
    completionRate: number;
    retentionRate: number;
    totalXpEarned: number;
    avgXpPerUser: number;
    topPerformers: Array<{
      id: string;
      name: string;
      email: string;
      totalXp: number;
      level: number;
      title: string;
    }>;
    popularPaths: Array<{
      id: string;
      title: string;
      enrollments: number;
      completions: number;
      avgRating: number;
    }>;
    recentActivities: Array<{
      id: string;
      type: 'lesson_completed' | 'path_started' | 'certificate_earned' | 'level_up';
      userName: string;
      contentTitle: string;
      timestamp: string;
    }>;
    dailyActiveUsers: Array<{
      date: string;
      users: number;
    }>;
    weeklyProgress: Array<{
      week: string;
      lessonsCompleted: number;
      xpEarned: number;
    }>;
  }> {
    try {
      if (!validateSupabase()) {
        throw new Error('Database connection not available')
      }

      const cacheKey = `analytics_${timeRange}`
      
      return await withCache(cacheKey, async () => {
        // Calculate date range
        const endDate = new Date()
        const startDate = new Date()
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
        startDate.setDate(endDate.getDate() - days)

        // Execute multiple queries in parallel for better performance
        const [
          totalUsersResult,
          activeUsersResult,
          totalPathsResult,
          totalLessonsResult,
          totalCertificatesResult,
          xpStatsResult,
          topPerformersResult,
          popularPathsResult,
          recentActivitiesResult,
          progressStatsResult
        ] = await Promise.allSettled([
          // Total users
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          
          // Active users (users with progress in time range)
          supabase
            .from('user_progress')
            .select('user_id', { count: 'exact', head: true })
            .gte('last_accessed_at', startDate.toISOString())
            .lte('last_accessed_at', endDate.toISOString()),
          
          // Total learning paths
          supabase.from('learning_paths').select('id', { count: 'exact', head: true }),
          
          // Total lessons
          supabase.from('lessons').select('id', { count: 'exact', head: true }),
          
          // Total certificates
          supabase.from('certificates').select('id', { count: 'exact', head: true }),
          
          // XP statistics
          supabase
            .from('user_xp')
            .select('total_xp')
            .order('total_xp', { ascending: false }),
          
          // Top performers
          supabase
            .from('user_xp')
            .select(`
              user_id,
              total_xp,
              level_id,
              current_title,
              user_profiles!inner(
                id,
                first_name,
                last_name,
                email
              )
            `)
            .order('total_xp', { ascending: false })
            .limit(10),
          
          // Popular paths with enrollment data
          supabase
            .from('learning_paths')
            .select(`
              id,
              title,
              user_progress(user_id, status)
            `)
            .eq('status', 'published')
            .limit(10),
          
          // Recent activities
          supabase
            .from('user_progress')
            .select(`
              id,
              status,
              completed_at,
              user_profiles!inner(first_name, last_name),
              learning_paths(title),
              courses(title),
              lessons(title)
            `)
            .eq('status', 'completed')
            .gte('completed_at', startDate.toISOString())
            .order('completed_at', { ascending: false })
            .limit(20),
          
          // Weekly progress data
          supabase
            .from('user_progress')
            .select('completed_at, xp_earned, status')
            .eq('status', 'completed')
            .gte('completed_at', startDate.toISOString())
            .order('completed_at', { ascending: false })
        ])

        // Helper function to safely extract data
        const getCount = (result: any) => result.status === 'fulfilled' ? result.value.count || 0 : 0
        const getData = (result: any) => result.status === 'fulfilled' ? result.value.data || [] : []

        // Process results
        const totalUsers = getCount(totalUsersResult)
        const activeUsers = getCount(activeUsersResult)
        const totalPaths = getCount(totalPathsResult)
        const totalLessons = getCount(totalLessonsResult)
        const totalCertificates = getCount(totalCertificatesResult)

        // XP statistics
        const xpData = getData(xpStatsResult)
        const totalXpEarned = xpData.reduce((sum: number, user: any) => sum + (user.total_xp || 0), 0)
        const avgXpPerUser = totalUsers > 0 ? Math.round(totalXpEarned / totalUsers) : 0

        // Top performers
        const topPerformersData = getData(topPerformersResult)
        const topPerformers = topPerformersData.map((user: any) => ({
          id: user.user_id,
          name: `${user.user_profiles.first_name} ${user.user_profiles.last_name}`.trim(),
          email: user.user_profiles.email,
          totalXp: user.total_xp || 0,
          level: user.level_id || 1,
          title: user.current_title || 'Newcomer'
        }))

        // Popular paths
        const popularPathsData = getData(popularPathsResult)
        const popularPaths = popularPathsData.map((path: any) => {
          const progressData = path.user_progress || []
          const enrollments = progressData.length
          const completions = progressData.filter((p: any) => p.status === 'completed').length
          
          return {
            id: path.id,
            title: path.title,
            enrollments,
            completions,
            avgRating: 4.5 // Mock rating - implement actual rating system later
          }
        }).sort((a: any, b: any) => b.enrollments - a.enrollments)

        // Recent activities
        const recentActivitiesData = getData(recentActivitiesResult)
        const recentActivities = recentActivitiesData.map((activity: any) => {
          const userName = `${activity.user_profiles.first_name} ${activity.user_profiles.last_name}`.trim()
          const contentTitle = activity.learning_paths?.title || activity.courses?.title || activity.lessons?.title || 'Unknown'
          
          return {
            id: activity.id,
            type: 'lesson_completed' as const,
            userName,
            contentTitle,
            timestamp: new Date(activity.completed_at).toLocaleString()
          }
        })

        // Weekly progress
        const progressData = getData(progressStatsResult)
        const weeklyProgress = this.processWeeklyProgress(progressData, startDate, endDate)

        // Calculate completion rate
        const completionRate = popularPaths.length > 0 
          ? Math.round(popularPaths.reduce((sum: number, path: any) => 
              sum + (path.enrollments > 0 ? (path.completions / path.enrollments) * 100 : 0), 0
            ) / popularPaths.length)
          : 0

        // Mock data for fields that need more complex implementation
        const avgSessionTime = 25 // minutes - implement actual session tracking
        const retentionRate = 78 // percentage - implement actual retention calculation
        const dailyActiveUsers = this.generateMockDailyActiveUsers(days)

        return {
          totalUsers,
          activeUsers,
          totalPaths,
          totalLessons,
          totalCertificates,
          avgSessionTime,
          completionRate,
          retentionRate,
          totalXpEarned,
          avgXpPerUser,
          topPerformers,
          popularPaths,
          recentActivities,
          dailyActiveUsers,
          weeklyProgress
        }
      }, CACHE_TTL.STATS)

    } catch (error) {
      handleError('getAnalytics', error)
      throw new Error('Failed to load analytics data')
    }
  }

  /**
   * Process weekly progress data for analytics
   */
  private static processWeeklyProgress(progressData: any[], startDate: Date, endDate: Date): Array<{
    week: string;
    lessonsCompleted: number;
    xpEarned: number;
  }> {
    const weeks: Map<string, { lessonsCompleted: number; xpEarned: number }> = new Map()
    
    progressData.forEach(progress => {
      const completedDate = new Date(progress.completed_at)
      const weekStart = new Date(completedDate)
      weekStart.setDate(completedDate.getDate() - completedDate.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      
      const existing = weeks.get(weekKey) || { lessonsCompleted: 0, xpEarned: 0 }
      existing.lessonsCompleted += 1
      existing.xpEarned += progress.xp_earned || 0
      weeks.set(weekKey, existing)
    })

    return Array.from(weeks.entries()).map(([week, data]) => ({
      week,
      ...data
    })).sort((a, b) => a.week.localeCompare(b.week))
  }

  /**
   * Generate mock daily active users data
   * TODO: Implement actual daily active user tracking
   */
  private static generateMockDailyActiveUsers(days: number): Array<{
    date: string;
    users: number;
  }> {
    const data = []
    const baseUsers = 45
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      // Generate realistic-looking data with some variance
      const variance = Math.random() * 20 - 10 // ±10 users
      const users = Math.max(1, Math.round(baseUsers + variance))
      
      data.push({
        date: date.toISOString().split('T')[0],
        users
      })
    }
    
    return data
  }

} 