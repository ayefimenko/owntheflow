'use client'

import { useState, useEffect } from 'react'
import { ContentService } from '@/lib/content'
import type { LearningPath, CreateLearningPathDto, UpdateLearningPathDto } from '@/types/content'

interface LearningPathFormProps {
  path?: LearningPath // If provided, we're editing; if not, we're creating
  onSave: (path: LearningPath) => void
  onCancel: () => void
}

export default function LearningPathForm({ path, onSave, onCancel }: LearningPathFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    estimated_hours: 0,
    prerequisites: [] as string[],
    learning_outcomes: [] as string[],
    status: 'draft' as 'draft' | 'published' | 'archived'
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form with existing path data if editing
  useEffect(() => {
    if (path) {
      setFormData({
        title: path.title,
        description: path.description || '',
        difficulty: path.difficulty,
        estimated_hours: path.estimated_hours || 0,
        prerequisites: path.prerequisites || [],
        learning_outcomes: path.learning_outcomes || [],
        status: path.status
      })
    }
  }, [path])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let savedPath: LearningPath

      if (path) {
        // Update existing path
        const updateData: UpdateLearningPathDto = {
          ...formData,
          estimated_hours: formData.estimated_hours || undefined,
          prerequisites: formData.prerequisites.length > 0 ? formData.prerequisites : undefined,
          learning_outcomes: formData.learning_outcomes.length > 0 ? formData.learning_outcomes : undefined
        }
        const updatedPath = await ContentService.updateLearningPath(path.id, updateData)
        if (!updatedPath) throw new Error('Failed to update learning path')
        savedPath = updatedPath
      } else {
        // Create new path
        const createData: CreateLearningPathDto = {
          ...formData,
          slug: formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          estimated_hours: formData.estimated_hours || undefined,
          prerequisites: formData.prerequisites.length > 0 ? formData.prerequisites : undefined,
          learning_outcomes: formData.learning_outcomes.length > 0 ? formData.learning_outcomes : undefined
        }
        const createdPath = await ContentService.createLearningPath(createData)
        if (!createdPath) throw new Error('Failed to create learning path')
        savedPath = createdPath
      }

      onSave(savedPath)
    } catch (err: any) {
      setError(err.message || 'Failed to save learning path')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimated_hours' ? parseInt(value) || 0 : value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          value={formData.title}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="Enter learning path title"
        />
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
          placeholder="Describe what learners will achieve in this path"
        />
      </div>

      {/* Difficulty and Estimated Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Prerequisites */}
      <div>
        <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700 mb-2">
          Prerequisites
        </label>
        <textarea
          id="prerequisites"
          name="prerequisites"
          rows={3}
          value={formData.prerequisites.join('\n')}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            prerequisites: e.target.value.split('\n').filter(item => item.trim())
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="Enter each prerequisite on a new line"
        />
      </div>

      {/* Learning Outcomes */}
      <div>
        <label htmlFor="learning_outcomes" className="block text-sm font-medium text-gray-700 mb-2">
          Learning Outcomes
        </label>
        <textarea
          id="learning_outcomes"
          name="learning_outcomes"
          rows={3}
          value={formData.learning_outcomes.join('\n')}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            learning_outcomes: e.target.value.split('\n').filter(item => item.trim())
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="Enter each learning outcome on a new line"
        />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
          Status *
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
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : (path ? 'Update Path' : 'Create Path')}
        </button>
      </div>
    </form>
  )
} 