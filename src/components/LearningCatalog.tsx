'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ContentService } from '@/lib/content'
import { useAuth } from '@/contexts/AuthContext'
import type { LearningPath, DifficultyLevel } from '@/types/content'

interface LearningCatalogProps {
  className?: string
}

export function LearningCatalog({ className = '' }: LearningCatalogProps) {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('')
  const { user } = useAuth()

  // Load published learning paths
  useEffect(() => {
    async function loadPaths() {
      try {
        setLoading(true)
        setError(null)
        
        const params = {
          status: ['published' as const],
          query: searchQuery || undefined,
          difficulty: difficultyFilter ? [difficultyFilter as DifficultyLevel] : undefined,
          sort_by: 'created_at' as const,
          sort_order: 'desc' as const
        }
        
        const data = await ContentService.getLearningPaths(params)
        setPaths(data)
      } catch (err) {
        console.error('Error loading learning paths:', err)
        setError('Failed to load learning paths. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadPaths()
  }, [searchQuery, difficultyFilter])

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
      <div className={`${className}`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading learning paths...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search learning paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Learning Paths Grid */}
      {paths.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📚</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No learning paths found</h3>
          <p className="text-gray-500">
            {searchQuery || difficultyFilter 
              ? 'Try adjusting your search or filters.' 
              : 'Learning paths will appear here once they\'re published.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paths.map((path) => (
            <div key={path.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {path.image_url && (
                <div className="h-48 bg-gray-200">
                  <img
                    src={path.image_url}
                    alt={path.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(path.difficulty)}`}>
                    {getDifficultyIcon(path.difficulty)} {path.difficulty}
                  </span>
                  {path.featured && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      ⭐ Featured
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{path.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {path.short_description || path.description}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>⏱️ {path.estimated_hours || 0}h</span>
                  <span>📚 {(path as any).course_count || 0} courses</span>
                </div>
                
                {path.learning_outcomes && path.learning_outcomes.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">You'll learn:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {path.learning_outcomes.slice(0, 3).map((outcome, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span>{outcome}</span>
                        </li>
                      ))}
                      {path.learning_outcomes.length > 3 && (
                        <li className="text-gray-400 text-xs">
                          +{path.learning_outcomes.length - 3} more outcomes
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                
                <Link
                  href={`/learn/${path.slug}`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  {user ? 'Start Learning' : 'View Path'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 