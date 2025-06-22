'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Lesson, CreateLessonDto, UpdateLessonDto, Module, ContentStatus, LessonType } from '@/types/content'
import { ContentService } from '@/lib/content'
import { AIService, AI_ROLES, AIRole } from '@/lib/ai'

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

interface LessonFormProps {
  lesson?: Lesson
  moduleId?: string
  onSave: (lesson: Lesson) => void
  onCancel: () => void
}

export default function LessonForm({ lesson, moduleId, onSave, onCancel }: LessonFormProps) {
  const [formData, setFormData] = useState({
    module_id: moduleId || lesson?.module_id || '',
    title: lesson?.title || '',
    slug: lesson?.slug || '',
    content: lesson?.content || '',
    summary: lesson?.summary || '',
    estimated_minutes: lesson?.estimated_minutes || 15,
    xp_reward: lesson?.xp_reward || 10,
    lesson_type: lesson?.lesson_type || 'reading' as LessonType,
    sort_order: lesson?.sort_order || 1,
    video_url: lesson?.video_url || '',
    video_duration: lesson?.video_duration || 0,
    meta_title: lesson?.meta_title || '',
    meta_description: lesson?.meta_description || '',
    status: lesson?.status || 'draft' as ContentStatus
  })

  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // AI Assistant states
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<AIRole>('general')
  const [showAiPanel, setShowAiPanel] = useState(false)

  // Load modules for selection
  useEffect(() => {
    const loadModules = async () => {
      try {
        const modulesData = await ContentService.getModules()
        setModules(modulesData)
      } catch (error) {
        console.error('Failed to load modules:', error)
        setError('Failed to load modules')
      }
    }

    loadModules()
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && !lesson) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.title, lesson])

  // Auto-generate meta_title from title if not set
  useEffect(() => {
    if (formData.title && !formData.meta_title) {
      setFormData(prev => ({ ...prev, meta_title: formData.title }))
    }
  }, [formData.title, formData.meta_title])

  // AI Assistant Functions
  const handleAiAction = async (action: 'summarize' | 'rewrite' | 'improve' | 'generate' | 'meta') => {
    if (!AIService.isAvailable()) {
      setAiError('AI service is not available. Please check your OpenAI API key.')
      return
    }

    setAiLoading(true)
    setAiError(null)

    try {
      let result: string | null = null

      switch (action) {
        case 'summarize':
          if (!formData.content.trim()) {
            setAiError('Please add some content to summarize')
            return
          }
          result = await AIService.summarizeContent(formData.content)
          if (result) {
            setFormData(prev => ({ ...prev, summary: result as string }))
          }
          break

        case 'rewrite':
          if (!formData.content.trim()) {
            setAiError('Please add some content to rewrite')
            return
          }
          result = await AIService.rewriteForRole(formData.content, selectedRole)
          if (result) {
            setFormData(prev => ({ ...prev, content: result as string }))
          }
          break

        case 'improve':
          if (!formData.content.trim()) {
            setAiError('Please add some content to improve')
            return
          }
          result = await AIService.improveWriting(formData.content)
          if (result) {
            setFormData(prev => ({ ...prev, content: result as string }))
          }
          break

        case 'generate':
          if (!formData.title.trim()) {
            setAiError('Please add a lesson title to generate content')
            return
          }
          result = await AIService.generateContent(formData.title, selectedRole, 'lesson')
          if (result) {
            setFormData(prev => ({ ...prev, content: result as string }))
          }
          break

        case 'meta':
          if (!formData.title.trim() || !formData.content.trim()) {
            setAiError('Please add a title and content to generate meta description')
            return
          }
          result = await AIService.generateMetaDescription(formData.title, formData.content)
          if (result) {
            setFormData(prev => ({ ...prev, meta_description: result as string }))
          }
          break
      }

      if (!result) {
        setAiError('AI service returned no results. Please try again.')
      }

    } catch (error) {
      console.error('AI action failed:', error)
      setAiError(error instanceof Error ? error.message : 'AI operation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.module_id) {
        setError('Please select a module')
        return
      }

      if (!formData.title.trim()) {
        setError('Please enter a lesson title')
        return
      }

      if (!formData.slug.trim()) {
        setError('Please enter a lesson slug')
        return
      }

      let result: Lesson | null = null

      if (lesson) {
        // Update existing lesson - only include changed fields
        const updateData: UpdateLessonDto = {}
        
        if (formData.module_id !== lesson.module_id) {
          updateData.module_id = formData.module_id
        }
        if (formData.title !== lesson.title) {
          updateData.title = formData.title
        }
        if (formData.slug !== lesson.slug) {
          updateData.slug = formData.slug
        }
        if (formData.content !== (lesson.content || '')) {
          updateData.content = formData.content || undefined
        }
        if (formData.summary !== (lesson.summary || '')) {
          updateData.summary = formData.summary || undefined
        }
        if (formData.estimated_minutes !== lesson.estimated_minutes) {
          updateData.estimated_minutes = formData.estimated_minutes
        }
        if (formData.xp_reward !== lesson.xp_reward) {
          updateData.xp_reward = formData.xp_reward
        }
        if (formData.lesson_type !== lesson.lesson_type) {
          updateData.lesson_type = formData.lesson_type
        }
        if (formData.sort_order !== lesson.sort_order) {
          updateData.sort_order = formData.sort_order
        }
        if (formData.video_url !== (lesson.video_url || '')) {
          updateData.video_url = formData.video_url || undefined
        }
        if (formData.video_duration !== (lesson.video_duration || 0)) {
          updateData.video_duration = formData.video_duration || undefined
        }
        if (formData.meta_title !== (lesson.meta_title || '')) {
          updateData.meta_title = formData.meta_title || undefined
        }
        if (formData.meta_description !== (lesson.meta_description || '')) {
          updateData.meta_description = formData.meta_description || undefined
        }
        if (formData.status !== lesson.status) {
          updateData.status = formData.status
        }

        // Only proceed if there are actual changes
        if (Object.keys(updateData).length === 0) {
          // No changes detected - this is not an error, just show a message
          console.log('No changes detected in lesson form')
          onSave(lesson) // Call onSave with the existing lesson to close the form
          return
        }

        console.log('Updating lesson with data:', updateData)
        result = await ContentService.updateLesson(lesson.id, updateData)
      } else {
        // Create new lesson
        const createData: CreateLessonDto = {
          module_id: formData.module_id,
          title: formData.title,
          slug: formData.slug,
          content: formData.content || undefined,
          summary: formData.summary || undefined,
          estimated_minutes: formData.estimated_minutes,
          xp_reward: formData.xp_reward,
          lesson_type: formData.lesson_type,
          sort_order: formData.sort_order,
          video_url: formData.video_url || undefined,
          video_duration: formData.video_duration || undefined,
          meta_title: formData.meta_title || undefined,
          meta_description: formData.meta_description || undefined
        }
        result = await ContentService.createLesson(createData)
      }

      if (result) {
        onSave(result)
      } else {
        setError('Failed to save lesson')
      }
    } catch (error) {
      console.error('Error saving lesson:', error)
      setError(error instanceof Error ? error.message : 'Failed to save lesson')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleContentChange = (value?: string) => {
    setFormData(prev => ({
      ...prev,
      content: value || ''
    }))
  }

  const getStatusBadgeColor = (status: ContentStatus) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Display */}
        {(error || aiError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error || aiError}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {lesson ? 'Edit Lesson' : 'Create New Lesson'}
              </h2>
              {lesson && (
                <div className="flex items-center mt-2 space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(lesson.status)}`}>
                    {lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Created {new Date(lesson.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* AI Assistant Toggle */}
            {AIService.isAvailable() && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>AI Assistant</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    showAiPanel 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🤖 {showAiPanel ? 'Hide' : 'Show'} AI
                </button>
              </div>
            )}
          </div>

          {/* AI Assistant Panel */}
          {showAiPanel && AIService.isAvailable() && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-3">🤖 AI Assistant</h3>
              
              {/* Role Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Target Audience
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as AIRole)}
                  className="block w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  {AI_ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Action Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleAiAction('generate')}
                  disabled={aiLoading}
                  className="flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {aiLoading ? '⏳' : '✨'} Generate
                </button>
                
                <button
                  type="button"
                  onClick={() => handleAiAction('rewrite')}
                  disabled={aiLoading}
                  className="flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {aiLoading ? '⏳' : '🎯'} Rewrite
                </button>
                
                <button
                  type="button"
                  onClick={() => handleAiAction('improve')}
                  disabled={aiLoading}
                  className="flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {aiLoading ? '⏳' : '📝'} Improve
                </button>
                
                <button
                  type="button"
                  onClick={() => handleAiAction('summarize')}
                  disabled={aiLoading}
                  className="flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {aiLoading ? '⏳' : '📋'} Summarize
                </button>
                
                <button
                  type="button"
                  onClick={() => handleAiAction('meta')}
                  disabled={aiLoading}
                  className="flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {aiLoading ? '⏳' : '🔍'} SEO Meta
                </button>
              </div>
            </div>
          )}

          {/* Module Selection */}
          <div>
            <label htmlFor="module_id" className="block text-sm font-medium text-gray-700">
              Module *
            </label>
            <select
              id="module_id"
              name="module_id"
              value={formData.module_id}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="">Select a module</option>
              {modules.map(module => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Enter lesson title"
              />
            </div>

            <div>
              <label htmlFor="lesson_type" className="block text-sm font-medium text-gray-700">
                Lesson Type *
              </label>
              <select
                id="lesson_type"
                name="lesson_type"
                value={formData.lesson_type}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="reading">Reading</option>
                <option value="video">Video</option>
                <option value="interactive">Interactive</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug *
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="lesson-url-slug"
            />
          </div>

          {/* Summary */}
          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
              Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="Brief summary of the lesson content"
            />
          </div>

          {/* Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Content
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <MDEditor
                value={formData.content}
                onChange={handleContentChange}
                preview={showPreview ? 'preview' : 'edit'}
                height={400}
                data-color-mode="light"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Use Markdown syntax to format your lesson content.
            </p>
          </div>

          {/* Video URL (if video lesson) */}
          {formData.lesson_type === 'video' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="video_url" className="block text-sm font-medium text-gray-700">
                  Video URL
                </label>
                <input
                  type="url"
                  id="video_url"
                  name="video_url"
                  value={formData.video_url}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div>
                <label htmlFor="video_duration" className="block text-sm font-medium text-gray-700">
                  Video Duration (minutes)
                </label>
                <input
                  type="number"
                  id="video_duration"
                  name="video_duration"
                  value={formData.video_duration}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>
          )}

          {/* Lesson Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="estimated_minutes" className="block text-sm font-medium text-gray-700">
                Estimated Minutes *
              </label>
              <input
                type="number"
                id="estimated_minutes"
                name="estimated_minutes"
                value={formData.estimated_minutes}
                onChange={handleInputChange}
                required
                min="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="xp_reward" className="block text-sm font-medium text-gray-700">
                XP Reward *
              </label>
              <input
                type="number"
                id="xp_reward"
                name="xp_reward"
                value={formData.xp_reward}
                onChange={handleInputChange}
                required
                min="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700">
                Sort Order *
              </label>
              <input
                type="number"
                id="sort_order"
                name="sort_order"
                value={formData.sort_order}
                onChange={handleInputChange}
                required
                min="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* SEO Settings */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">SEO Settings</h4>
            <div className="space-y-4">
              <div>
                <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700">
                  Meta Title
                </label>
                <input
                  type="text"
                  id="meta_title"
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={handleInputChange}
                  maxLength={60}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="SEO title for search engines"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.meta_title.length}/60 characters
                </p>
              </div>
              <div>
                <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700">
                  Meta Description
                </label>
                <textarea
                  id="meta_description"
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleInputChange}
                  maxLength={160}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="SEO description for search engines"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.meta_description.length}/160 characters
                </p>
              </div>
            </div>
          </div>

          {/* Publishing Status */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Publishing</h4>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Only published lessons are visible to learners
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (lesson ? 'Update Lesson' : 'Create Lesson')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 