'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ContentService } from '@/lib/content'
import { useAuth } from '@/contexts/AuthContext'
import type { LearningPath, Course, Module, Lesson, UserProgress } from '@/types/content'

interface LearningPathDetailProps {
  pathId: string
}

export function LearningPathDetail({ pathId }: LearningPathDetailProps) {
  const [path, setPath] = useState<LearningPath | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    
    async function loadPathDetails() {
      try {
        setLoading(true)
        setError(null)

        const [pathData, coursesData] = await Promise.all([
          ContentService.getLearningPath(pathId),
          ContentService.getCourses(pathId)
        ])

        if (!isMounted) return // Prevent state updates if component unmounted

        if (!pathData) {
          throw new Error('Learning path not found')
        }

        setPath(pathData)
        setCourses(coursesData.filter(c => c.status === 'published'))
      } catch (err) {
        if (!isMounted) return
        
        console.error('Error loading path details:', err)
        setError('Failed to load learning path details. Please try again.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadPathDetails()
    
    return () => {
      isMounted = false
    }
  }, [pathId])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '🌱'
      case 'intermediate': return '⚡'
      case 'advanced': return '🔥'
      default: return '📚'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading learning path...</p>
        </div>
      </div>
    )
  }

  if (error || !path) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error || 'Learning path not found'}</p>
          <Link
            href="/learn"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Catalog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-4">
          <Link href="/learn" className="text-blue-600 hover:text-blue-700">
            ← Back to Learning Catalog
          </Link>
        </nav>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(path.difficulty)}`}>
              {getDifficultyIcon(path.difficulty)} {path.difficulty}
            </span>
            {path.featured && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                ⭐ Featured
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">{path.title}</h1>
          <p className="text-lg text-gray-600 mb-6">{path.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">⏱️ {path.estimated_hours}h</div>
              <div className="text-sm text-gray-500">Estimated Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">📚 {courses.length}</div>
              <div className="text-sm text-gray-500">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">🎯 0%</div>
              <div className="text-sm text-gray-500">Progress</div>
            </div>
          </div>

          {path.learning_outcomes && path.learning_outcomes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">What you'll learn:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {path.learning_outcomes.map((outcome, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span className="text-gray-700">{outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user ? (
            <div className="text-center">
              <button
                type="button"
                disabled={starting}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={async () => {
                  if (!user?.id || starting) return
                  
                  try {
                    setStarting(true)
                    setError(null) // Clear any previous errors
                    console.log('🚀 Starting learning path:', path.id)
                    
                    const firstLessonData = await ContentService.startLearningPath(user.id, path.id)
                    
                    if (firstLessonData) {
                      console.log('✅ Navigating to first lesson:', firstLessonData.lesson.id)
                      router.push(`/learn/lesson/${firstLessonData.lesson.id}`)
                    } else {
                      console.error('❌ No content available in this learning path')
                      setError('This learning path doesn\'t have any available content yet. Please check back later or contact support.')
                    }
                  } catch (error) {
                    console.error('❌ Error starting learning path:', error)
                    setError('Failed to start learning path. Please try again.')
                  } finally {
                    setStarting(false)
                  }
                }}
              >
                {starting ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting...
                  </>
                ) : (
                  '🚀 Start Learning Path'
                )}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 text-sm">
                  ⚠️ You need to sign in to start this learning path.
                </p>
              </div>
              <Link
                href="/?mode=signin"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold inline-block"
              >
                🔐 Sign In to Start Learning
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Course List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">📚 Course Curriculum</h2>
          <p className="text-gray-600 mt-1">
            {courses.length} course{courses.length !== 1 ? 's' : ''} in this learning path
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {courses.map((course, courseIndex) => (
            <div key={course.id} className="p-6">
              <div className="flex items-center space-x-4">
                <span className="text-lg">○</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {courseIndex + 1}. {course.title}
                  </h3>
                  <p className="text-sm text-gray-600">{course.short_description}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                    <span>⏱️ {course.estimated_hours}h</span>
                    <span>📋 modules coming soon</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 