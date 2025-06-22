'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { Lesson, LessonType } from '@/types/content'

// Dynamically import markdown preview to avoid SSR issues
const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
)

interface ContentPreviewProps {
  lesson: Partial<Lesson>
  className?: string
}

export default function ContentPreview({ lesson, className = '' }: ContentPreviewProps) {
  const [videoError, setVideoError] = useState(false)

  const getYouTubeEmbedUrl = (url: string) => {
    // Convert YouTube watch URLs to embed URLs
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    const match = url.match(youtubeRegex)
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`
    }
    return url
  }

  const renderVideoContent = () => {
    if (!lesson.video_url) {
      return (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM5 8a1 1 0 000 2h8a1 1 0 100-2H5z" />
            </svg>
          </div>
          <p className="text-gray-500">No video URL provided</p>
        </div>
      )
    }

    if (videoError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-red-800 font-medium">Video Load Error</p>
              <p className="text-red-600 text-sm">Unable to load video from: {lesson.video_url}</p>
            </div>
          </div>
        </div>
      )
    }

    const embedUrl = getYouTubeEmbedUrl(lesson.video_url)

    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          title={lesson.title || 'Video content'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => setVideoError(true)}
        />
        {lesson.video_duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {lesson.video_duration} min
          </div>
        )}
      </div>
    )
  }

  const renderInteractiveContent = () => {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="text-blue-500 mr-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-blue-900">Interactive Content</h3>
        </div>
        <div className="prose prose-blue max-w-none">
          {lesson.content ? (
            <MarkdownPreview source={lesson.content} />
          ) : (
            <p className="text-blue-700">Interactive content will be displayed here</p>
          )}
        </div>
      </div>
    )
  }

  const renderQuizContent = () => {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="text-green-500 mr-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-green-900">Quiz Content</h3>
        </div>
        <div className="prose prose-green max-w-none">
          {lesson.content ? (
            <MarkdownPreview source={lesson.content} />
          ) : (
            <p className="text-green-700">Quiz questions and content will be displayed here</p>
          )}
        </div>
      </div>
    )
  }

  const renderReadingContent = () => {
    return (
      <div className="prose prose-gray max-w-none">
        {lesson.content ? (
          <MarkdownPreview source={lesson.content} />
        ) : (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500">No content available</p>
          </div>
        )}
      </div>
    )
  }

  const renderContent = () => {
    switch (lesson.lesson_type) {
      case 'video':
        return renderVideoContent()
      case 'interactive':
        return renderInteractiveContent()
      case 'quiz':
        return renderQuizContent()
      case 'reading':
      default:
        return renderReadingContent()
    }
  }

  const getLessonTypeIcon = (type: LessonType) => {
    switch (type) {
      case 'video':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM5 8a1 1 0 000 2h8a1 1 0 100-2H5z" />
          </svg>
        )
      case 'interactive':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
        )
      case 'quiz':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        )
      case 'reading':
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="text-gray-400">
                {getLessonTypeIcon(lesson.lesson_type || 'reading')}
              </div>
              <span className="text-sm text-gray-500 capitalize">
                {lesson.lesson_type || 'reading'} lesson
              </span>
              {lesson.status && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(lesson.status)}`}>
                  {lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {lesson.title || 'Untitled Lesson'}
            </h1>
            {lesson.summary && (
              <p className="text-gray-600 leading-relaxed">
                {lesson.summary}
              </p>
            )}
          </div>
        </div>

        {/* Lesson Metadata */}
        <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
          {lesson.estimated_minutes && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {lesson.estimated_minutes} min
            </div>
          )}
          {lesson.xp_reward && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {lesson.xp_reward} XP
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderContent()}
      </div>
    </div>
  )
} 