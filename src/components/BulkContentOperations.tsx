'use client'

import { useState } from 'react'
import { ContentService } from '@/lib/content'
import type { } from '@/types/content'

interface BulkContentOperationsProps {
  selectedItems: {
    type: 'path' | 'course' | 'module' | 'lesson'
    id: string
    title: string
  }[]
  onOperationComplete: () => void
  onCancel: () => void
}

export default function BulkContentOperations({ 
  selectedItems, 
  onOperationComplete, 
  onCancel 
}: BulkContentOperationsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [operation, setOperation] = useState<'publish' | 'draft' | 'archive' | null>(null)

  const handleBulkOperation = async (op: 'publish' | 'draft' | 'archive') => {
    if (selectedItems.length === 0) {
      return
    }

    // Confirmation for destructive operations
    if (op === 'archive') {
      const confirmed = window.confirm(
        `Are you sure you want to archive ${selectedItems.length} content item(s)? This will make them unavailable to learners.`
      )
      if (!confirmed) {
        return
      }
    }

    setLoading(true)
    setError(null)
    setOperation(op)

    try {
      const operations = selectedItems.map(async (item) => {
        switch (op) {
          case 'publish':
            switch (item.type) {
              case 'path':
                return ContentService.updateLearningPath(item.id, { status: 'published' })
              case 'course':
                return ContentService.updateCourse(item.id, { status: 'published' })
              case 'module':
                return ContentService.updateModule(item.id, { status: 'published' })
              case 'lesson':
                return ContentService.updateLesson(item.id, { status: 'published' })
            }
            break
          case 'draft':
            switch (item.type) {
              case 'path':
                return ContentService.updateLearningPath(item.id, { status: 'draft' })
              case 'course':
                return ContentService.updateCourse(item.id, { status: 'draft' })
              case 'module':
                return ContentService.updateModule(item.id, { status: 'draft' })
              case 'lesson':
                return ContentService.updateLesson(item.id, { status: 'draft' })
            }
            break
          case 'archive':
            switch (item.type) {
              case 'path':
                return ContentService.updateLearningPath(item.id, { status: 'archived' })
              case 'course':
                return ContentService.updateCourse(item.id, { status: 'archived' })
              case 'module':
                return ContentService.updateModule(item.id, { status: 'archived' })
              case 'lesson':
                return ContentService.updateLesson(item.id, { status: 'archived' })
            }
            break

        }
      })

      await Promise.all(operations)
      
      console.log(`✅ Bulk ${op} operation completed successfully`)
      onOperationComplete()

    } catch (error) {
      console.error(`Failed to perform bulk ${op}:`, error)
      setError(`Failed to ${op} selected items. Please try again.`)
    } finally {
      setLoading(false)
      setOperation(null)
    }
  }

  const groupedItems = selectedItems.reduce((groups, item) => {
    if (!groups[item.type]) {
      groups[item.type] = []
    }
    groups[item.type].push(item)
    return groups
  }, {} as Record<string, typeof selectedItems>)

  const getOperationDescription = (op: string) => {
    switch (op) {
      case 'publish': return 'Make content available to learners'
      case 'draft': return 'Save as draft (not visible to learners)'
      case 'archive': return 'Archive content (hidden but not deleted)'

      default: return ''
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          Bulk Operations ({selectedItems.length} items selected)
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
          type="button"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
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

      {/* Selected Items Summary */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Selected Items:</h4>
        <div className="space-y-2">
          {Object.entries(groupedItems).map(([type, items]) => (
            <div key={type} className="flex items-center gap-2 text-sm">
              <span className="font-medium capitalize">{type}s:</span>
              <span className="text-gray-600">{items.length} items</span>
              <div className="text-xs text-gray-500">
                ({items.map(item => item.title).join(', ')})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operation Buttons */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Available Operations:</h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Publish */}
            <button
              onClick={() => handleBulkOperation('publish')}
              disabled={loading}
              className="flex flex-col items-center p-4 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="button"
            >
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm font-medium text-green-800">Publish</div>
              <div className="text-xs text-green-600 text-center mt-1">
                {getOperationDescription('publish')}
              </div>
            </button>

            {/* Draft */}
            <button
              onClick={() => handleBulkOperation('draft')}
              disabled={loading}
              className="flex flex-col items-center p-4 border border-yellow-200 rounded-lg hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="button"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="text-sm font-medium text-yellow-800">Set to Draft</div>
              <div className="text-xs text-yellow-600 text-center mt-1">
                {getOperationDescription('draft')}
              </div>
            </button>

            {/* Archive */}
            <button
              onClick={() => handleBulkOperation('archive')}
              disabled={loading}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="button"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="text-sm font-medium text-gray-800">Archive</div>
              <div className="text-xs text-gray-600 text-center mt-1">
                {getOperationDescription('archive')}
              </div>
            </button>


          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-sm text-gray-600">
              Performing {operation} operation...
            </span>
          </div>
        )}

        {/* Cancel Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
} 