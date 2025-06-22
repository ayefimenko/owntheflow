'use client'

import { useState, useEffect } from 'react'
import { ContentService } from '@/lib/content'
import type { Course, CreateCourseDto, UpdateCourseDto, LearningPath } from '@/types/content'

interface CourseFormProps {
  course?: Course // If provided, we're editing; if not, we're creating
  learningPathId?: string // Required when creating a new course
  onSave: (course: Course) => void
  onCancel: () => void
}

export default function CourseForm({ course, learningPathId, onSave, onCancel }: CourseFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    path_id: learningPathId || '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    sort_order: 0,
    estimated_hours: 0,
    status: 'draft' as 'draft' | 'published' | 'archived'
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([])

  // Load learning paths for dropdown
  useEffect(() => {
    const loadLearningPaths = async () => {
      try {
        const paths = await ContentService.getLearningPaths({ status: ['published'] })
        setLearningPaths(paths)
      } catch (error) {
        console.error('Error loading learning paths:', error)
      }
    }
    loadLearningPaths()
  }, [])

  // Initialize form with existing course data if editing
  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        slug: course.slug,
        description: course.description || '',
        path_id: course.path_id,
        difficulty: course.difficulty,
        sort_order: course.sort_order,
        estimated_hours: course.estimated_hours || 0,
        status: course.status
      })
    }
  }, [course])

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'title') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        slug: generateSlug(value)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'sort_order' || name === 'estimated_hours' ? parseInt(value) || 0 : value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let savedCourse: Course | null

      if (course) {
        // Update existing course
        const updateData: UpdateCourseDto = {
          ...formData,
          estimated_hours: formData.estimated_hours || undefined
        }
        savedCourse = await ContentService.updateCourse(course.id, updateData)
      } else {
        // Create new course
        const createData: CreateCourseDto = {
          ...formData,
          estimated_hours: formData.estimated_hours || undefined
        }
        savedCourse = await ContentService.createCourse(createData)
      }

      if (savedCourse) {
        onSave(savedCourse)
      } else {
        setError('Failed to save course')
      }
    } catch (error) {
      console.error('Error saving course:', error)
      setError(error instanceof Error ? error.message : 'Failed to save course')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Course Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          value={formData.title}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="Enter course title"
        />
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
          URL Slug *
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          required
          value={formData.slug}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="course-url-slug"
        />
        <p className="text-xs text-gray-500 mt-1">Auto-generated from title, but you can customize it</p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={formData.description}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="Describe what students will learn in this course"
        />
      </div>

      {/* Learning Path Selection */}
      {!course && (
        <div>
          <label htmlFor="path_id" className="block text-sm font-medium text-gray-700 mb-2">
            Learning Path *
          </label>
          <select
            id="path_id"
            name="path_id"
            required
            value={formData.path_id}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">Select a learning path</option>
            {learningPaths.map(path => (
              <option key={path.id} value={path.id}>
                {path.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Difficulty */}
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty *
          </label>
          <select
            id="difficulty"
            name="difficulty"
            required
            value={formData.difficulty}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-2">
            Order in Path
          </label>
          <input
            type="number"
            id="sort_order"
            name="sort_order"
            min="0"
            value={formData.sort_order}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="0"
          />
        </div>

        {/* Estimated Hours */}
        <div>
          <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Hours
          </label>
          <input
            type="number"
            id="estimated_hours"
            name="estimated_hours"
            min="0"
            value={formData.estimated_hours}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="0"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          id="status"
          name="status"
          required
          value={formData.status}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
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
          {loading ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
        </button>
      </div>
    </form>
  )
} 