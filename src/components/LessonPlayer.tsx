'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ContentService } from '@/lib/content'
import { useAuth } from '@/contexts/AuthContext'
import QuizEngine from './QuizEngine'
import type { Lesson, Module, Course, LearningPath, UserProgress, Challenge } from '@/types/content'

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

  // Add navigation state
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null)
  
  // Sprint 6: Quiz/Challenge state
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)

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

        // Load challenges for this lesson (Sprint 6)
        const challengesData = await ContentService.getChallenges(lessonData.id)
        setChallenges(challengesData)

        // Load module, course, and path data
        if (lessonData.module_id) {
          const moduleData = await ContentService.getModule(lessonData.module_id)
          if (moduleData) {
            setModule(moduleData)
            
            // Find next lesson in the same module
            if (moduleData.lessons) {
              const sortedLessons = moduleData.lessons
                .filter(l => l.status === 'published')
                .sort((a, b) => a.sort_order - b.sort_order)
              
              const currentIndex = sortedLessons.findIndex(l => l.id === lessonId)
              if (currentIndex >= 0 && currentIndex < sortedLessons.length - 1) {
                setNextLesson(sortedLessons[currentIndex + 1])
              }
            }
            
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

  const handleNextLesson = () => {
    if (nextLesson) {
      window.location.href = `/learn/lesson/${nextLesson.id}`
    }
  }

  // Sprint 6: Quiz handlers
  const handleStartQuiz = (challenge: Challenge) => {
    setCurrentChallenge(challenge)
    setShowQuiz(true)
  }

  const handleQuizComplete = (score: number, xpEarned: number) => {
    // Refresh progress after quiz completion
    if (user) {
      setTimeout(async () => {
        const progressData = await ContentService.getUserProgress(user.id)
        const lessonProgress = progressData.find(p => 
          p.content_id === lessonId && p.content_type === 'lesson'
        )
        setProgress(lessonProgress || null)
      }, 1000)
    }
    
    // Show success message
    console.log(`Quiz completed! Score: ${score}%, XP earned: ${xpEarned}`)
  }

  const handleNextQuiz = () => {
    if (!currentChallenge || !challenges.length) return
    
    const currentIndex = challenges.findIndex(c => c.id === currentChallenge.id)
    if (currentIndex >= 0 && currentIndex < challenges.length - 1) {
      setCurrentChallenge(challenges[currentIndex + 1])
    } else {
      // No more quizzes, close quiz mode
      setShowQuiz(false)
      setCurrentChallenge(null)
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

  // Show quiz engine if in quiz mode
  if (showQuiz && currentChallenge) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quiz Header */}
        <div className="mb-6">
          <nav className="text-sm text-gray-600 mb-4">
            <div className="flex items-center space-x-2">
              <Link href="/learn" className="hover:text-blue-600">Learning Catalog</Link>
              <span>→</span>
              <button 
                onClick={() => setShowQuiz(false)}
                className="hover:text-blue-600"
              >
                {lesson?.title}
              </button>
              <span>→</span>
              <span className="font-medium text-gray-900">{currentChallenge.title}</span>
            </div>
          </nav>
        </div>

        <QuizEngine 
          challenge={currentChallenge}
          onComplete={handleQuizComplete}
          onNext={challenges.findIndex(c => c.id === currentChallenge.id) < challenges.length - 1 ? handleNextQuiz : undefined}
        />
      </div>
    )
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
                {challenges.length > 0 && (
                  <span>🧠 {challenges.length} challenge{challenges.length > 1 ? 's' : ''}</span>
                )}
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

      {/* Sprint 6: Challenges Section */}
      {challenges.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🧠 Knowledge Challenges
          </h3>
          <p className="text-gray-600 mb-4">
            Test your understanding with these interactive challenges. Earn bonus XP for excellent performance!
          </p>
          
          <div className="grid gap-4">
            {challenges.map((challenge, index) => (
              <div 
                key={challenge.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">
                        {challenge.challenge_type === 'quiz' ? '❓' :
                         challenge.challenge_type === 'code' ? '💻' :
                         challenge.challenge_type === 'essay' ? '📝' : '🎯'}
                      </span>
                      <h4 className="font-medium text-gray-900">{challenge.title}</h4>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {challenge.challenge_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{challenge.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>💎 {challenge.xp_reward} XP</span>
                      {challenge.time_limit && <span>⏱️ {challenge.time_limit}m limit</span>}
                      {challenge.max_attempts && <span>🔄 {challenge.max_attempts} max attempts</span>}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleStartQuiz(challenge)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Start Challenge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                onClick={handleNextLesson}
                disabled={!nextLesson}
              >
                {nextLesson ? `Next: ${nextLesson.title}` : 'Last Lesson'} →
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