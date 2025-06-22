'use client'

import { useState, useEffect } from 'react'
import { Module, CreateModuleDto, UpdateModuleDto, Course, ContentStatus } from '@/types/content'
import { ContentService } from '@/lib/content'

interface ModuleFormProps {
  module?: Module
  courseId?: string
  onSave: (module: Module) => void
  onCancel: () => void
}

export default function ModuleForm({ module, courseId, onSave, onCancel }: ModuleFormProps) {
  const [formData, setFormData] = useState({
    course_id: courseId || module?.course_id || '',
    title: module?.title || '',
    slug: module?.slug || '',
    description: module?.description || '',
    short_description: module?.short_description || '',
    estimated_minutes: module?.estimated_minutes || 30,
    sort_order: module?.sort_order || 1,
    status: module?.status || 'draft' as ContentStatus
  })

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load courses for selection
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const coursesData = await ContentService.getCourses()
        setCourses(coursesData)
      } catch (error) {
        console.error('Failed to load courses:', error)
        setError('Failed to load courses')
      }
    }

    loadCourses()
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && !module) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.title, module])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let result: Module | null = null

      if (module) {
        // Update existing module - only include changed fields
        const updateData: UpdateModuleDto = {}
        
        if (formData.course_id !== module.course_id) {
          updateData.course_id = formData.course_id
        }
        if (formData.title !== module.title) {
          updateData.title = formData.title
        }
        if (formData.slug !== module.slug) {
          updateData.slug = formData.slug
        }
        if (formData.description !== (module.description || '')) {
          updateData.description = formData.description || undefined
        }
        if (formData.short_description !== (module.short_description || '')) {
          updateData.short_description = formData.short_description || undefined
        }
        if (formData.estimated_minutes !== module.estimated_minutes) {
          updateData.estimated_minutes = formData.estimated_minutes
        }
        if (formData.sort_order !== module.sort_order) {
          updateData.sort_order = formData.sort_order
        }
        if (formData.status !== module.status) {
          updateData.status = formData.status
        }

        // Only proceed if there are actual changes
        if (Object.keys(updateData).length === 0) {
          // No changes detected - this is not an error, just show a message
          console.log('No changes detected in module form')
          onSave(module) // Call onSave with the existing module to close the form
          return
        }

        console.log('Updating module with data:', updateData)
        result = await ContentService.updateModule(module.id, updateData)
      } else {
        // Create new module
        const createData: CreateModuleDto = {
          course_id: formData.course_id,
          title: formData.title,
          slug: formData.slug,
          description: formData.description || undefined,
          short_description: formData.short_description || undefined,
          estimated_minutes: formData.estimated_minutes,
          sort_order: formData.sort_order
        }
        result = await ContentService.createModule(createData)
      }

      if (result) {
        onSave(result)
      } else {
        setError('Failed to save module')
      }
    } catch (error) {
      console.error('Error saving module:', error)
      setError(error instanceof Error ? error.message : 'Failed to save module')
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          {module ? 'Edit Module' : 'Create New Module'}
        </h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Course Selection */}
        <div>
          <label htmlFor="course_id" className="block text-sm font-medium text-gray-700">
            Course *
          </label>
          <select
            id="course_id"
            name="course_id"
            value={formData.course_id}
            onChange={handleInputChange}
            required
            disabled={!!courseId} // Disable if courseId is provided (creating from course context)
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">Select a course</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
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
            placeholder="Enter module title"
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
            placeholder="module-slug"
          />
        </div>

        {/* Short Description */}
        <div>
          <label htmlFor="short_description" className="block text-sm font-medium text-gray-700">
            Short Description
          </label>
          <textarea
            id="short_description"
            name="short_description"
            value={formData.short_description}
            onChange={handleInputChange}
            rows={2}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="Brief description for cards and previews"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="Detailed description of the module"
          />
        </div>

        {/* Estimated Minutes */}
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
            placeholder="30"
          />
        </div>

        {/* Sort Order */}
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
            placeholder="1"
          />
        </div>

        {/* Status (only show for existing modules) */}
        {module && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : (module ? 'Update Module' : 'Create Module')}
        </button>
      </div>
    </form>
  )
} 