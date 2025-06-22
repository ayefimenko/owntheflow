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

// Helper function to validate Supabase availability
function validateSupabase(): boolean {
  if (!supabase?.from) {
    console.warn('Content service not available')
    return false
  }
  return true
}

// Helper function to handle common errors
function handleError(operation: string, error: any): void {
  console.error(`Error in ${operation}:`, error.message || error)
  
  // In production, you might want to send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: logErrorToService(operation, error)
  }
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

  static async getUserProgress(userId: string, contentId?: string): Promise<UserProgress[]> {
    try {
      if (!validateSupabase()) return []

      const cacheKey = `user_progress_${userId}_${contentId || 'all'}`
      
      return await withCache(cacheKey, async () => {
        let query = supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId)

        if (contentId) {
          query = query.eq('content_id', contentId)
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

      const { data: result, error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
          ...data,
          updated_at: new Date().toISOString()
        })
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
            user:user_profiles(display_name, avatar_url)
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
          current_streak: 0,
          longest_streak: 0,
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
          current_level: xpData?.current_level || 1,
          paths_completed: completedProgress.filter((p: any) => p.content_type === 'path').length,
          courses_completed: completedProgress.filter((p: any) => p.content_type === 'course').length,
          lessons_completed: completedProgress.filter((p: any) => p.content_type === 'lesson').length,
          challenges_completed: completedProgress.filter((p: any) => p.content_type === 'challenge').length,
          certificates_earned: certificatesCount,
          current_streak: xpData?.current_streak || 0,
          longest_streak: xpData?.longest_streak || 0,
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
        current_streak: 0,
        longest_streak: 0,
        total_study_time: 0
      }
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

      // Update all courses in this learning path
      const { error: coursesError } = await supabase
        .from('courses')
        .update(updateData)
        .eq('path_id', pathId)

      if (coursesError) {
        console.error('Error cascading status to courses:', coursesError)
        throw new Error(`Failed to cascade status to courses: ${coursesError.message}`)
      }

      // Update all modules in courses of this learning path
      const { error: modulesError } = await supabase
        .from('modules')
        .update(updateData)
        .in('course_id', 
          supabase.from('courses').select('id').eq('path_id', pathId)
        )

      if (modulesError) {
        console.error('Error cascading status to modules:', modulesError)
        throw new Error(`Failed to cascade status to modules: ${modulesError.message}`)
      }

      // Update all lessons in modules of courses in this learning path
      const { error: lessonsError } = await supabase
        .from('lessons')
        .update(updateData)
        .in('module_id',
          supabase
            .from('modules')
            .select('id')
            .in('course_id', 
              supabase.from('courses').select('id').eq('path_id', pathId)
            )
        )

      if (lessonsError) {
        console.error('Error cascading status to lessons:', lessonsError)
        throw new Error(`Failed to cascade status to lessons: ${lessonsError.message}`)
      }

      // Update all challenges in lessons of modules of courses in this learning path
      const { error: challengesError } = await supabase
        .from('challenges')
        .update(updateData)
        .in('lesson_id',
          supabase
            .from('lessons')
            .select('id')
            .in('module_id',
              supabase
                .from('modules')
                .select('id')
                .in('course_id', 
                  supabase.from('courses').select('id').eq('path_id', pathId)
                )
            )
        )

      if (challengesError) {
        console.error('Error cascading status to challenges:', challengesError)
        throw new Error(`Failed to cascade status to challenges: ${challengesError.message}`)
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

      // Update all lessons in modules of this course
      const { error: lessonsError } = await supabase
        .from('lessons')
        .update(updateData)
        .in('module_id',
          supabase.from('modules').select('id').eq('course_id', courseId)
        )

      if (lessonsError) {
        console.error('Error cascading status to lessons:', lessonsError)
        throw new Error(`Failed to cascade status to lessons: ${lessonsError.message}`)
      }

      // Update all challenges in lessons of modules of this course
      const { error: challengesError } = await supabase
        .from('challenges')
        .update(updateData)
        .in('lesson_id',
          supabase
            .from('lessons')
            .select('id')
            .in('module_id',
              supabase.from('modules').select('id').eq('course_id', courseId)
            )
        )

      if (challengesError) {
        console.error('Error cascading status to challenges:', challengesError)
        throw new Error(`Failed to cascade status to challenges: ${challengesError.message}`)
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

      // Update all challenges in lessons of this module
      const { error: challengesError } = await supabase
        .from('challenges')
        .update(updateData)
        .in('lesson_id',
          supabase.from('lessons').select('id').eq('module_id', moduleId)
        )

      if (challengesError) {
        console.error('Error cascading status to challenges:', challengesError)
        throw new Error(`Failed to cascade status to challenges: ${challengesError.message}`)
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
} 