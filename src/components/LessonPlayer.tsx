'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ContentService } from '@/lib/content'
import { useAuth } from '@/contexts/AuthContext'
import type { Lesson, Module, Course, LearningPath, UserProgress } from '@/types/content'

// Dynamically import the markdown preview to avoid SSR issues
const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded"></div> }
)

interface LessonPlayerProps {
  lessonId: string
}

export function LessonPlayer({ lessonId }: LessonPlayerProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [module, setModule] = useState<Module | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [path, setPath] = useState<LearningPath | null>(null)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingComplete, setMarkingComplete] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    async function loadLessonData() {
      try {
        setLoading(true)
        setError(null)

        const lessonData = await ContentService.getLesson(lessonId)
        if (!lessonData || lessonData.status !== 'published') {
          throw new Error('Lesson not found or not published')
        }

        setLesson(lessonData)

        // Load module, course, and path data
        if (lessonData.module_id) {
          const moduleData = await ContentService.getModule(lessonData.module_id)
          if (moduleData) {
            setModule(moduleData)
            
            if (moduleData.course_id) {
              const courseData = await ContentService.getCourse(moduleData.course_id)
              if (courseData) {
                setCourse(courseData)
                
                if (courseData.path_id) {
                  const pathData = await ContentService.getLearningPath(courseData.path_id)
                  if (pathData) {
                    setPath(pathData)
                  }
                }
              }
            }
          }
        }

        // Load user progress if authenticated
        if (user) {
          const progressData = await ContentService.getUserProgress(user.id)
          const lessonProgress = progressData.find(p => 
            p.content_id === lessonId && p.content_type === 'lesson'
          )
          setProgress(lessonProgress || null)
        }
      } catch (err) {
        console.error('Error loading lesson:', err)
        setError('Failed to load lesson. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadLessonData()
  }, [lessonId, user])

  const handleMarkComplete = async () => {
    if (!user || !lesson) return

    try {
      setMarkingComplete(true)
      
      await ContentService.updateProgress(user.id, lesson.id, 'lesson', {
        status: 'completed',
        completion_percentage: 100,
        xp_earned: lesson.xp_reward
      })

      // Refresh progress
      const progressData = await ContentService.getUserProgress(user.id)
      const lessonProgress = progressData.find(p => 
        p.content_id === lessonId && p.content_type === 'lesson'
      )
      setProgress(lessonProgress || null)
    } catch (error) {
      console.error('Error marking lesson complete:', error)
    } finally {
      setMarkingComplete(false)
    }
  }

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥'
      case 'reading': return '📖'
      case 'interactive': return '⚡'
      case 'quiz': return '🧠'
      default: return '📚'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error || 'Lesson not found'}</p>
          <Link
            href="/learn"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Learning Catalog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="mb-6 text-sm">
        <div className="flex items-center space-x-2 text-gray-600">
          <Link href="/learn" className="hover:text-blue-600">
            Learning Catalog
          </Link>
          <span>→</span>
          {path && (
            <>
              <Link href={`/learn/${path.slug}`} className="hover:text-blue-600">
                {path.title}
              </Link>
              <span>→</span>
            </>
          )}
          {course && (
            <>
              <span className="text-gray-500">{course.title}</span>
              <span>→</span>
            </>
          )}
          {module && (
            <>
              <span className="text-gray-500">{module.title}</span>
              <span>→</span>
            </>
          )}
          <span className="font-medium text-gray-900">{lesson.title}</span>
        </div>
      </nav>

      {/* Lesson Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getLessonTypeIcon(lesson.lesson_type)}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span>⏱️ {lesson.estimated_minutes} min</span>
                <span>💎 {lesson.xp_reward} XP</span>
                <span>📝 {lesson.lesson_type}</span>
              </div>
            </div>
          </div>
          
          {progress?.status === 'completed' && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              ✅ Completed
            </span>
          )}
        </div>

        {lesson.summary && (
          <p className="text-gray-600 mb-4">{lesson.summary}</p>
        )}
      </div>

      {/* Lesson Content */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        {lesson.video_url && (
          <div className="aspect-video bg-gray-900 mb-6">
            <iframe
              src={lesson.video_url}
              className="w-full h-full"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        )}

        <div className="p-6">
          {lesson.content ? (
                         <div className="prose prose-lg max-w-none">
               <MarkdownPreview 
                 source={lesson.content} 
                 style={{ backgroundColor: 'transparent' }}
               />
             </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📝</div>
              <p>Lesson content will be available soon.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lesson Actions */}
      {user && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {progress?.status === 'completed' ? (
                <span className="text-green-600">
                  ✅ You completed this lesson and earned {lesson.xp_reward} XP!
                </span>
              ) : (
                <span>
                  Complete this lesson to earn {lesson.xp_reward} XP
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              {progress?.status !== 'completed' && (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={markingComplete}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {markingComplete ? 'Saving...' : '✅ Mark Complete'}
                </button>
              )}
              
              <button
                type="button"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                onClick={() => {
                  // TODO: Navigate to next lesson
                  console.log('Next lesson')
                }}
              >
                Next Lesson →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login prompt for non-authenticated users */}
      {!user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="text-blue-600 text-xl mb-2">🔒</div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Sign in to track your progress</h3>
          <p className="text-blue-700 mb-4">
            Create an account to save your progress, earn XP, and get certificates.
          </p>
          <Link
            href="/?auth=signin"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In
          </Link>
        </div>
      )}
    </div>
  )
} 