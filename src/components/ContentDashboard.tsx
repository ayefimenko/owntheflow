'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ContentService } from '@/lib/content'
import PermissionGuard, { AdminOnly } from './PermissionGuard'
import Modal from './Modal'
import ContentPreview from './ContentPreview'
import LearningPathForm from './LearningPathForm'
import CourseForm from './CourseForm'
import ModuleForm from './ModuleForm'
import LessonForm from './LessonForm'
import ChallengeForm from './ChallengeForm'
import CurriculumBuilder from './CurriculumBuilder'
import type { LearningPath, Course, Module, Lesson, Challenge, ContentStats } from '@/types/content'

// Component that allows both admin and content_manager - now properly handles client-side logic
function ContentEditorOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { userProfile, loading, hydrated } = useAuth()
  
  // Show loading state if auth is still loading or not hydrated
  if (!hydrated || loading) {
    return <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
  }

  // If no profile, user is not authenticated
  if (!userProfile) {
    return <>{fallback}</>
  }

  // Check if user has content editor permissions
  const isContentEditor = userProfile.role === 'admin' || userProfile.role === 'content_manager'
  
  return isContentEditor ? <>{children}</> : <>{fallback}</>
}

export default function ContentDashboard() {
  const { userProfile, isRole } = useAuth()
  const [stats, setStats] = useState<ContentStats | null>(null)
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'paths' | 'courses' | 'modules' | 'lessons' | 'challenges' | 'curriculum'>('overview')
  
  // Modal states
  const [showPathModal, setShowPathModal] = useState(false)
  const [editingPath, setEditingPath] = useState<LearningPath | undefined>(undefined)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | undefined>(undefined)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | undefined>(undefined)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | undefined>(undefined)
  
  // Preview modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewLesson, setPreviewLesson] = useState<Lesson | undefined>(undefined)

  // Memoized data loading function to prevent unnecessary re-renders
  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, pathsData, coursesData, modulesData, lessonsData, challengesData] = await Promise.all([
        ContentService.getContentStats(),
        ContentService.getLearningPaths({ limit: 10 }),
        ContentService.getCourses(),
        ContentService.getModules(),
        ContentService.getLessons(),
        ContentService.getChallenges()
      ])
      
      setStats(statsData)
      setPaths(pathsData)
      setCourses(coursesData)
      setModules(modulesData)
      setLessons(lessonsData)
      setChallenges(challengesData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Learning Path handlers
  const handleCreatePath = useCallback(() => {
    setEditingPath(undefined)
    setShowPathModal(true)
  }, [])

  const handleEditPath = useCallback((path: LearningPath) => {
    setEditingPath(path)
    setShowPathModal(true)
  }, [])

  const handlePathSaved = useCallback((savedPath: LearningPath) => {
    if (editingPath) {
      setPaths(prev => prev.map(p => p.id === savedPath.id ? savedPath : p))
    } else {
      setPaths(prev => [savedPath, ...prev])
    }
    setShowPathModal(false)
    setEditingPath(undefined)
    loadDashboardData() // Refresh stats
  }, [editingPath, loadDashboardData])

  const handleModalClose = useCallback(() => {
    setShowPathModal(false)
    setEditingPath(undefined)
  }, [])

  // Course handlers
  const handleCreateCourse = useCallback(() => {
    setEditingCourse(undefined)
    setShowCourseModal(true)
  }, [])

  const handleEditCourse = useCallback((course: Course) => {
    setEditingCourse(course)
    setShowCourseModal(true)
  }, [])

  const handleCourseSaved = useCallback((savedCourse: Course) => {
    if (editingCourse) {
      setCourses(prev => prev.map(c => c.id === savedCourse.id ? savedCourse : c))
    } else {
      setCourses(prev => [savedCourse, ...prev])
    }
    setShowCourseModal(false)
    setEditingCourse(undefined)
    loadDashboardData() // Refresh stats
  }, [editingCourse, loadDashboardData])

  const handleCourseModalClose = useCallback(() => {
    setShowCourseModal(false)
    setEditingCourse(undefined)
  }, [])

  // Module handlers
  const handleCreateModule = useCallback(() => {
    setEditingModule(undefined)
    setShowModuleModal(true)
  }, [])

  const handleEditModule = useCallback((module: Module) => {
    setEditingModule(module)
    setShowModuleModal(true)
  }, [])

  const handleModuleSaved = useCallback((savedModule: Module) => {
    if (editingModule) {
      setModules(prev => prev.map(m => m.id === savedModule.id ? savedModule : m))
    } else {
      setModules(prev => [savedModule, ...prev])
    }
    setShowModuleModal(false)
    setEditingModule(undefined)
    loadDashboardData() // Refresh stats
  }, [editingModule, loadDashboardData])

  const handleModuleModalClose = useCallback(() => {
    setShowModuleModal(false)
    setEditingModule(undefined)
  }, [])

  // Lesson handlers
  const handleCreateLesson = useCallback(() => {
    setEditingLesson(undefined)
    setShowLessonModal(true)
  }, [])

  const handleEditLesson = useCallback((lesson: Lesson) => {
    setEditingLesson(lesson)
    setShowLessonModal(true)
  }, [])

  const handleLessonSaved = useCallback((savedLesson: Lesson) => {
    if (editingLesson) {
      setLessons(prev => prev.map(l => l.id === savedLesson.id ? savedLesson : l))
    } else {
      setLessons(prev => [savedLesson, ...prev])
    }
    setShowLessonModal(false)
    setEditingLesson(undefined)
    loadDashboardData() // Refresh stats
  }, [editingLesson, loadDashboardData])

  const handleLessonModalClose = useCallback(() => {
    setShowLessonModal(false)
    setEditingLesson(undefined)
  }, [])

  // Challenge handlers
  const handleCreateChallenge = useCallback(() => {
    setEditingChallenge(undefined)
    setShowChallengeModal(true)
  }, [])

  const handleEditChallenge = useCallback((challenge: Challenge) => {
    setEditingChallenge(challenge)
    setShowChallengeModal(true)
  }, [])

  const handleChallengeSaved = useCallback((savedChallenge: Challenge) => {
    if (editingChallenge) {
      setChallenges(prev => prev.map(c => c.id === savedChallenge.id ? savedChallenge : c))
    } else {
      setChallenges(prev => [savedChallenge, ...prev])
    }
    setShowChallengeModal(false)
    setEditingChallenge(undefined)
    loadDashboardData() // Refresh stats
  }, [editingChallenge, loadDashboardData])

  const handleChallengeModalClose = useCallback(() => {
    setShowChallengeModal(false)
    setEditingChallenge(undefined)
  }, [])

  // Preview handlers
  const handlePreviewLesson = useCallback((lesson: Lesson) => {
    setPreviewLesson(lesson)
    setShowPreviewModal(true)
  }, [])

  const handlePreviewModalClose = useCallback(() => {
    setShowPreviewModal(false)
    setPreviewLesson(undefined)
  }, [])

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadDashboardData}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              type="button"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-300 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Content Management Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your learning content, courses, and challenges</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'curriculum', name: 'Curriculum Builder', icon: '🏗️' },
                { id: 'paths', name: 'Learning Paths', icon: '🛤️' },
                { id: 'courses', name: 'Courses', icon: '📚' },
                { id: 'modules', name: 'Modules', icon: '📋' },
                { id: 'lessons', name: 'Lessons', icon: '📖' },
                { id: 'challenges', name: 'Challenges', icon: '🎯' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  type="button"
                >
                  <span>{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} paths={paths} onCreatePath={handleCreatePath} />
        )}

        {activeTab === 'curriculum' && (
          <CurriculumBuilder 
            onRefresh={loadDashboardData}
            onEditPath={handleEditPath}
            onEditCourse={handleEditCourse}
            onEditModule={handleEditModule}
            onEditLesson={handleEditLesson}
            onEditChallenge={handleEditChallenge}
          />
        )}

        {activeTab === 'paths' && (
          <PathsTab paths={paths} onRefresh={loadDashboardData} onCreatePath={handleCreatePath} onEditPath={handleEditPath} />
        )}

        {activeTab === 'courses' && (
          <CoursesTab courses={courses} onRefresh={loadDashboardData} onCreateCourse={handleCreateCourse} onEditCourse={handleEditCourse} />
        )}

        {activeTab === 'modules' && (
          <ModulesTab modules={modules} onRefresh={loadDashboardData} onCreateModule={handleCreateModule} onEditModule={handleEditModule} />
        )}

        {activeTab === 'lessons' && (
          <LessonsTab lessons={lessons} onRefresh={loadDashboardData} onCreateLesson={handleCreateLesson} onEditLesson={handleEditLesson} onPreviewLesson={handlePreviewLesson} />
        )}

        {activeTab === 'challenges' && (
          <ChallengesTab challenges={challenges} onRefresh={loadDashboardData} onCreateChallenge={handleCreateChallenge} onEditChallenge={handleEditChallenge} />
        )}

        {/* Modals */}
        <Modal
          isOpen={showPathModal}
          onClose={handleModalClose}
          title={editingPath ? 'Edit Learning Path' : 'Create Learning Path'}
          size="lg"
        >
          <LearningPathForm
            path={editingPath}
            onSave={handlePathSaved}
            onCancel={handleModalClose}
          />
        </Modal>

        <Modal
          isOpen={showCourseModal}
          onClose={handleCourseModalClose}
          title={editingCourse ? 'Edit Course' : 'Create Course'}
          size="lg"
        >
          <CourseForm
            course={editingCourse}
            onSave={handleCourseSaved}
            onCancel={handleCourseModalClose}
          />
        </Modal>

        <Modal
          isOpen={showModuleModal}
          onClose={handleModuleModalClose}
          title={editingModule ? 'Edit Module' : 'Create Module'}
          size="lg"
        >
          <ModuleForm
            module={editingModule}
            onSave={handleModuleSaved}
            onCancel={handleModuleModalClose}
          />
        </Modal>

        <Modal
          isOpen={showLessonModal}
          onClose={handleLessonModalClose}
          title={editingLesson ? 'Edit Lesson' : 'Create Lesson'}
          size="lg"
        >
          <LessonForm
            lesson={editingLesson}
            onSave={handleLessonSaved}
            onCancel={handleLessonModalClose}
          />
        </Modal>

        <Modal
          isOpen={showChallengeModal}
          onClose={handleChallengeModalClose}
          title={editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
          size="xl"
        >
          <ChallengeForm
            challenge={editingChallenge}
            onSave={handleChallengeSaved}
            onCancel={handleChallengeModalClose}
          />
        </Modal>

        <Modal
          isOpen={showPreviewModal}
          onClose={handlePreviewModalClose}
          title="Lesson Preview"
          size="xl"
        >
          {previewLesson && (
            <ContentPreview lesson={previewLesson} />
          )}
        </Modal>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ 
  stats, 
  paths, 
  onCreatePath 
}: { 
  stats: ContentStats | null
  paths: LearningPath[]
  onCreatePath: () => void
}) {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Learning Paths"
          value={stats?.total_paths || 0}
          subtitle="Total learning paths"
          icon="🛤️"
          color="blue"
        />
        <StatCard
          title="Courses"
          value={stats?.total_courses || 0}
          subtitle="Total courses"
          icon="📚"
          color="green"
        />
        <StatCard
          title="Lessons"
          value={stats?.total_lessons || 0}
          subtitle="Total lessons"
          icon="📖"
          color="purple"
        />
        <StatCard
          title="Challenges"
          value={stats?.total_challenges || 0}
          subtitle="Total challenges"
          icon="🎯"
          color="orange"
        />
      </div>

      {/* Recent Paths */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Learning Paths</h3>
          <ContentEditorOnly>
            <button 
              onClick={onCreatePath}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors"
              type="button"
            >
              Create New Path
            </button>
          </ContentEditorOnly>
        </div>
        
        {paths.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No learning paths created yet</p>
            <ContentEditorOnly>
              <button 
                onClick={onCreatePath}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                type="button"
              >
                Create Your First Path
              </button>
            </ContentEditorOnly>
          </div>
        ) : (
          <div className="space-y-3">
            {paths.slice(0, 5).map((path) => (
              <div key={path.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-3 h-3 rounded-full
                    ${path.status === 'published' ? 'bg-green-500' : 
                      path.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-500'}
                  `} />
                  <div>
                    <h4 className="font-medium text-gray-900">{path.title}</h4>
                    <p className="text-sm text-gray-500">
                      {path.course_count} courses • {path.difficulty} • {path.estimated_hours}h
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`
                    px-2 py-1 text-xs rounded-full
                    ${path.status === 'published' ? 'bg-green-100 text-green-800' : 
                      path.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}
                  `}>
                    {path.status}
                  </span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm transition-colors" type="button">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Paths Tab Component
function PathsTab({ 
  paths, 
  onRefresh, 
  onCreatePath, 
  onEditPath 
}: { 
  paths: LearningPath[]
  onRefresh: () => void
  onCreatePath: () => void
  onEditPath: (path: LearningPath) => void
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Learning Paths</h2>
          <p className="text-gray-600">Manage your learning paths and their content</p>
        </div>
        <ContentEditorOnly>
          <button 
            onClick={onCreatePath}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            type="button"
          >
            Create Learning Path
          </button>
        </ContentEditorOnly>
      </div>

      {/* Paths List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {paths.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🛤️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No learning paths yet</h3>
            <p className="text-gray-500 mb-6">Create your first learning path to get started.</p>
            <ContentEditorOnly>
              <button 
                onClick={onCreatePath}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                type="button"
              >
                Create Learning Path
              </button>
            </ContentEditorOnly>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paths.map((path) => (
                  <tr key={path.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{path.title}</div>
                          <div className="text-sm text-gray-500">{path.short_description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${path.status === 'published' ? 'bg-green-100 text-green-800' : 
                          path.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}
                      `}>
                        {path.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {path.difficulty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {path.course_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(path.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                                            <button 
                      onClick={() => onEditPath(path)}
                      className="text-blue-600 hover:text-blue-700"
                      type="button"
                    >
                      Edit
                    </button>
                        <AdminOnly>
                          <button className="text-red-600 hover:text-red-700" type="button">Delete</button>
                        </AdminOnly>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color 
}: { 
  title: string
  value: number
  subtitle: string
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200'
  }

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}

// Courses Tab Component
function CoursesTab({ 
  courses, 
  onRefresh, 
  onCreateCourse, 
  onEditCourse 
}: { 
  courses: Course[]
  onRefresh: () => void
  onCreateCourse: () => void
  onEditCourse: (course: Course) => void
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Courses</h2>
          <p className="text-sm text-gray-600">Manage individual courses within learning paths</p>
        </div>
        <ContentEditorOnly>
          <button 
            onClick={onCreateCourse}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            type="button"
          >
            Create Course
          </button>
        </ContentEditorOnly>
      </div>

      {/* Courses List */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
          <p className="text-gray-500 mb-6">Create your first course to get started</p>
          <ContentEditorOnly>
            <button 
              onClick={onCreateCourse}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              type="button"
            >
              Create Course
            </button>
          </ContentEditorOnly>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">All Courses ({courses.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {courses.map((course) => (
              <div key={course.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{course.title}</h4>
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${course.status === 'published' ? 'bg-green-100 text-green-800' : 
                          course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {course.status}
                      </span>
                    </div>
                    {course.description && (
                      <p className="text-gray-600 mb-2">{course.description}</p>
                    )}
                                         <div className="flex items-center gap-4 text-sm text-gray-500">
                       <span>Order: {course.sort_order}</span>
                       {course.estimated_hours && <span>{course.estimated_hours} hours</span>}
                       <span>Updated {new Date(course.updated_at).toLocaleDateString()}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onEditCourse(course)}
                      className="text-blue-600 hover:text-blue-700"
                      type="button"
                    >
                      Edit
                    </button>
                    <AdminOnly>
                      <button className="text-red-600 hover:text-red-700" type="button">Delete</button>
                    </AdminOnly>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Modules Tab Component
function ModulesTab({ 
  modules, 
  onRefresh, 
  onCreateModule, 
  onEditModule 
}: { 
  modules: Module[]
  onRefresh: () => void
  onCreateModule: () => void
  onEditModule: (module: Module) => void
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Modules</h2>
          <p className="text-sm text-gray-600">Manage modules within courses</p>
        </div>
        <ContentEditorOnly>
          <button 
            onClick={onCreateModule}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            type="button"
          >
            Create Module
          </button>
        </ContentEditorOnly>
      </div>

      {/* Modules List */}
      {modules.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No modules yet</h3>
          <p className="text-gray-500 mb-6">Create your first module to get started</p>
          <ContentEditorOnly>
            <button 
              onClick={onCreateModule}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              type="button"
            >
              Create Module
            </button>
          </ContentEditorOnly>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">All Modules ({modules.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {modules.map((module) => (
              <div key={module.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{module.title}</h4>
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${module.status === 'published' ? 'bg-green-100 text-green-800' : 
                          module.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {module.status}
                      </span>
                    </div>
                    {module.description && (
                      <p className="text-gray-600 mb-2">{module.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Order: {module.sort_order}</span>
                      <span>{module.estimated_minutes} minutes</span>
                      <span>Updated {new Date(module.updated_at).toLocaleDateString()}</span>
                      {module.course && <span>Course: {module.course.title}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onEditModule(module)}
                      className="text-blue-600 hover:text-blue-700"
                      type="button"
                    >
                      Edit
                    </button>
                    <AdminOnly>
                      <button className="text-red-600 hover:text-red-700" type="button">Delete</button>
                    </AdminOnly>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Lessons Tab Component
function LessonsTab({ 
  lessons, 
  onRefresh, 
  onCreateLesson, 
  onEditLesson,
  onPreviewLesson
}: { 
  lessons: Lesson[]
  onRefresh: () => void
  onCreateLesson: () => void
  onEditLesson: (lesson: Lesson) => void
  onPreviewLesson: (lesson: Lesson) => void
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Lessons</h2>
          <p className="text-sm text-gray-600">Manage individual lessons within modules</p>
        </div>
        <ContentEditorOnly>
          <button 
            onClick={onCreateLesson}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            type="button"
          >
            Create Lesson
          </button>
        </ContentEditorOnly>
      </div>

      {/* Lessons List */}
      {lessons.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons yet</h3>
          <p className="text-gray-500 mb-6">Create your first lesson to get started</p>
          <ContentEditorOnly>
            <button 
              onClick={onCreateLesson}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              type="button"
            >
              Create Lesson
            </button>
          </ContentEditorOnly>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">All Lessons ({lessons.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{lesson.title}</h4>
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${lesson.lesson_type === 'video' ? 'bg-purple-100 text-purple-800' : 
                          lesson.lesson_type === 'interactive' ? 'bg-blue-100 text-blue-800' :
                          lesson.lesson_type === 'quiz' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {lesson.lesson_type}
                      </span>
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${lesson.status === 'published' ? 'bg-green-100 text-green-800' : 
                          lesson.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {lesson.status}
                      </span>
                    </div>
                    {lesson.summary && (
                      <p className="text-gray-600 mb-2">{lesson.summary}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Order: {lesson.sort_order}</span>
                      <span>{lesson.estimated_minutes} minutes</span>
                      <span>{lesson.xp_reward} XP</span>
                      <span>Updated {new Date(lesson.updated_at).toLocaleDateString()}</span>
                      {lesson.module && <span>Module: {lesson.module.title}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onPreviewLesson(lesson)}
                      className="text-green-600 hover:text-green-700"
                      type="button"
                    >
                      Preview
                    </button>
                    <button 
                      onClick={() => onEditLesson(lesson)}
                      className="text-blue-600 hover:text-blue-700"
                      type="button"
                    >
                      Edit
                    </button>
                    <AdminOnly>
                      <button className="text-red-600 hover:text-red-700" type="button">Delete</button>
                    </AdminOnly>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Challenges Tab Component
function ChallengesTab({ 
  challenges, 
  onRefresh, 
  onCreateChallenge, 
  onEditChallenge 
}: { 
  challenges: Challenge[]
  onRefresh: () => void
  onCreateChallenge: () => void
  onEditChallenge: (challenge: Challenge) => void
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Challenges</h2>
          <p className="text-sm text-gray-600">Manage interactive challenges within lessons</p>
        </div>
        <ContentEditorOnly>
          <button 
            onClick={onCreateChallenge}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            type="button"
          >
            Create Challenge
          </button>
        </ContentEditorOnly>
      </div>

      {/* Challenges List */}
      {challenges.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges yet</h3>
          <p className="text-gray-500 mb-6">Create your first challenge to get started</p>
          <ContentEditorOnly>
            <button 
              onClick={onCreateChallenge}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              type="button"
            >
              Create Challenge
            </button>
          </ContentEditorOnly>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">All Challenges ({challenges.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{challenge.title}</h4>
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${challenge.challenge_type === 'quiz' ? 'bg-blue-100 text-blue-800' : 
                          challenge.challenge_type === 'code' ? 'bg-purple-100 text-purple-800' :
                          challenge.challenge_type === 'essay' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'}
                      `}>
                        {challenge.challenge_type}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{challenge.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Order: {challenge.sort_order}</span>
                      <span>{challenge.xp_reward} XP</span>
                      {challenge.max_attempts && <span>Max attempts: {challenge.max_attempts}</span>}
                      {challenge.time_limit && <span>Time limit: {challenge.time_limit}m</span>}
                      <span>Updated {new Date(challenge.updated_at).toLocaleDateString()}</span>
                      {challenge.lesson && <span>Lesson: {challenge.lesson.title}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onEditChallenge(challenge)}
                      className="text-blue-600 hover:text-blue-700"
                      type="button"
                    >
                      Edit
                    </button>
                    <AdminOnly>
                      <button className="text-red-600 hover:text-red-700" type="button">Delete</button>
                    </AdminOnly>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 