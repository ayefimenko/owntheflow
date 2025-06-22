'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Lesson, CreateLessonDto, UpdateLessonDto, Module, ContentStatus, LessonType } from '@/types/content'
import { ContentService } from '@/lib/content'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.module_id) {
        setError('Please select a module')
        setLoading(false)
        return
      }

      if (!formData.title.trim()) {
        setError('Please enter a lesson title')
        setLoading(false)
        return
      }

      if (!formData.slug.trim()) {
        setError('Please enter a lesson slug')
        setLoading(false)
        return
      }

      let result: Lesson | null = null

      if (lesson) {
        // Update existing lesson
        const updateData: UpdateLessonDto = {
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
          meta_description: formData.meta_description || undefined,
          status: formData.status
        }
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

  const handleSaveAsDraft = async () => {
    const currentStatus = formData.status
    setFormData(prev => ({ ...prev, status: 'draft' }))
    
    // Create a form event to trigger submission
    const form = document.querySelector('form') as HTMLFormElement
    if (form) {
      const event = new Event('submit', { bubbles: true, cancelable: true })
      form.dispatchEvent(event)
    }
    
    // Restore original status if needed
    setTimeout(() => {
      setFormData(prev => ({ ...prev, status: currentStatus }))
    }, 100)
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {lesson ? 'Edit Lesson' : 'Create New Lesson'}
            </h3>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(formData.status)}`}>
                {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                disabled={!!moduleId || modules.length === 0}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none text-gray-900 ${
                  !formData.module_id && error 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              >
                <option value="">
                  {modules.length === 0 ? 'No modules available' : 'Select a module'}
                </option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
              {modules.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  Please create a module first before adding lessons.
                </p>
              )}
              {!formData.module_id && error && (
                <p className="mt-1 text-sm text-red-600">
                  Please select a module for this lesson.
                </p>
              )}
            </div>

            {/* Lesson Type */}
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

          {/* Title */}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
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
              Use Markdown syntax to format your lesson content. Click &quot;Show Preview&quot; to see how it will look.
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
              type="button"
              onClick={handleSaveAsDraft}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (lesson ? 'Update Lesson' : 'Create Lesson')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 