'use client'

import { useState, useEffect } from 'react'
import { Challenge, CreateChallengeDto, UpdateChallengeDto, Lesson, ChallengeType } from '@/types/content'
import { ContentService } from '@/lib/content'

interface ChallengeFormProps {
  challenge?: Challenge
  lessonId?: string
  onSave: (challenge: Challenge) => void
  onCancel: () => void
}

export default function ChallengeForm({ challenge, lessonId, onSave, onCancel }: ChallengeFormProps) {
  const [formData, setFormData] = useState({
    lesson_id: lessonId || challenge?.lesson_id || '',
    title: challenge?.title || '',
    description: challenge?.description || '',
    challenge_type: challenge?.challenge_type || 'quiz' as ChallengeType,
    content: challenge?.content || {},
    solution: challenge?.solution || {},
    hints: challenge?.hints || [],
    xp_reward: challenge?.xp_reward || 20,
    max_attempts: challenge?.max_attempts || 3,
    time_limit: challenge?.time_limit || 10,
    sort_order: challenge?.sort_order || 1
  })

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form fields for different challenge types
  const [hintsText, setHintsText] = useState(formData.hints.join('\n'))
  const [contentJson, setContentJson] = useState(JSON.stringify(formData.content, null, 2))
  const [solutionJson, setSolutionJson] = useState(JSON.stringify(formData.solution, null, 2))

  // Load lessons for selection
  useEffect(() => {
    const loadLessons = async () => {
      try {
        const lessonsData = await ContentService.getLessons()
        setLessons(lessonsData)
      } catch (error) {
        console.error('Failed to load lessons:', error)
        setError('Failed to load lessons')
      }
    }

    loadLessons()
  }, [])

  // Initialize challenge type specific content
  useEffect(() => {
    if (!challenge && formData.challenge_type) {
      let defaultContent = {}
      let defaultSolution = {}

      switch (formData.challenge_type) {
        case 'quiz':
          defaultContent = {
            question: '',
            options: ['', '', '', ''],
            multiple_correct: false
          }
          defaultSolution = {
            correct_answers: [0],
            explanation: ''
          }
          break
        case 'multiple_choice':
          defaultContent = {
            question: '',
            options: ['', '', '', ''],
            multiple_select: true
          }
          defaultSolution = {
            correct_answers: [0],
            explanation: ''
          }
          break
        case 'code':
          defaultContent = {
            problem_statement: '',
            starter_code: '',
            language: 'javascript',
            test_cases: [
              { input: '', expected_output: '', description: '' }
            ]
          }
          defaultSolution = {
            solution_code: '',
            explanation: ''
          }
          break
        case 'essay':
          defaultContent = {
            prompt: '',
            min_words: 100,
            max_words: 500,
            criteria: ['Clarity', 'Depth', 'Examples']
          }
          defaultSolution = {
            sample_answer: '',
            rubric: {
              'Clarity': 'Clear and well-structured response',
              'Depth': 'Demonstrates deep understanding',
              'Examples': 'Uses relevant examples'
            }
          }
          break
      }

      setFormData(prev => ({
        ...prev,
        content: defaultContent,
        solution: defaultSolution
      }))
      setContentJson(JSON.stringify(defaultContent, null, 2))
      setSolutionJson(JSON.stringify(defaultSolution, null, 2))
    }
  }, [formData.challenge_type, challenge])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Parse JSON fields
      let content, solution
      try {
        content = JSON.parse(contentJson)
        solution = JSON.parse(solutionJson)
      } catch (jsonError) {
        setError('Invalid JSON in content or solution fields')
        setLoading(false)
        return
      }

      // Parse hints from text
      const hints = hintsText.split('\n').filter(hint => hint.trim() !== '')

      let result: Challenge | null = null

      if (challenge) {
        // Update existing challenge
        const updateData: UpdateChallengeDto = {
          lesson_id: formData.lesson_id,
          title: formData.title,
          description: formData.description,
          challenge_type: formData.challenge_type,
          content,
          solution,
          hints,
          xp_reward: formData.xp_reward,
          max_attempts: formData.max_attempts || undefined,
          time_limit: formData.time_limit || undefined,
          sort_order: formData.sort_order
        }
        result = await ContentService.updateChallenge(challenge.id, updateData)
      } else {
        // Create new challenge
        const createData: CreateChallengeDto = {
          lesson_id: formData.lesson_id,
          title: formData.title,
          description: formData.description,
          challenge_type: formData.challenge_type,
          content,
          solution,
          hints,
          xp_reward: formData.xp_reward,
          max_attempts: formData.max_attempts || undefined,
          time_limit: formData.time_limit || undefined,
          sort_order: formData.sort_order
        }
        result = await ContentService.createChallenge(createData)
      }

      if (result) {
        onSave(result)
      } else {
        setError('Failed to save challenge')
      }
    } catch (error) {
      console.error('Error saving challenge:', error)
      setError(error instanceof Error ? error.message : 'Failed to save challenge')
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

  const renderChallengeTypeHelp = () => {
    switch (formData.challenge_type) {
      case 'quiz':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
            <strong>Quiz Challenge:</strong> Single or multiple correct answers from a list of options.
            <br />
            <strong>Content:</strong> {`{ question: string, options: string[], multiple_correct: boolean }`}
            <br />
            <strong>Solution:</strong> {`{ correct_answers: number[], explanation: string }`}
          </div>
        )
      case 'multiple_choice':
        return (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
            <strong>Multiple Choice:</strong> Select one or more correct answers.
            <br />
            <strong>Content:</strong> {`{ question: string, options: string[], multiple_select: boolean }`}
            <br />
            <strong>Solution:</strong> {`{ correct_answers: number[], explanation: string }`}
          </div>
        )
      case 'code':
        return (
          <div className="bg-purple-50 border border-purple-200 rounded-md p-3 text-sm">
            <strong>Code Challenge:</strong> Programming exercise with test cases.
            <br />
            <strong>Content:</strong> {`{ problem_statement: string, starter_code: string, language: string, test_cases: array }`}
            <br />
            <strong>Solution:</strong> {`{ solution_code: string, explanation: string }`}
          </div>
        )
      case 'essay':
        return (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm">
            <strong>Essay Challenge:</strong> Written response with word limits and criteria.
            <br />
            <strong>Content:</strong> {`{ prompt: string, min_words: number, max_words: number, criteria: string[] }`}
            <br />
            <strong>Solution:</strong> {`{ sample_answer: string, rubric: object }`}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          {challenge ? 'Edit Challenge' : 'Create New Challenge'}
        </h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Lesson Selection */}
        <div>
          <label htmlFor="lesson_id" className="block text-sm font-medium text-gray-700">
            Lesson *
          </label>
          <select
            id="lesson_id"
            name="lesson_id"
            value={formData.lesson_id}
            onChange={handleInputChange}
            required
            disabled={!!lessonId}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">Select a lesson</option>
            {lessons.map(lesson => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
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
            placeholder="Enter challenge title"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="Describe what this challenge tests or teaches"
          />
        </div>

        {/* Challenge Type */}
        <div>
          <label htmlFor="challenge_type" className="block text-sm font-medium text-gray-700">
            Challenge Type *
          </label>
          <select
            id="challenge_type"
            name="challenge_type"
            value={formData.challenge_type}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="quiz">Quiz</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="code">Code Challenge</option>
            <option value="essay">Essay</option>
          </select>
          <div className="mt-2">
            {renderChallengeTypeHelp()}
          </div>
        </div>

        {/* Content (JSON) */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            Content (JSON) *
          </label>
          <textarea
            id="content"
            value={contentJson}
            onChange={(e) => setContentJson(e.target.value)}
            required
            rows={8}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-mono text-sm"
            placeholder="Enter challenge content as JSON"
          />
        </div>

        {/* Solution (JSON) */}
        <div>
          <label htmlFor="solution" className="block text-sm font-medium text-gray-700">
            Solution (JSON) *
          </label>
          <textarea
            id="solution"
            value={solutionJson}
            onChange={(e) => setSolutionJson(e.target.value)}
            required
            rows={6}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-mono text-sm"
            placeholder="Enter expected solution as JSON"
          />
        </div>

        {/* Hints */}
        <div>
          <label htmlFor="hints" className="block text-sm font-medium text-gray-700">
            Hints (one per line)
          </label>
          <textarea
            id="hints"
            value={hintsText}
            onChange={(e) => setHintsText(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="Enter hints, one per line"
          />
        </div>

        {/* Settings Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* XP Reward */}
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
              placeholder="20"
            />
          </div>

          {/* Max Attempts */}
          <div>
            <label htmlFor="max_attempts" className="block text-sm font-medium text-gray-700">
              Max Attempts
            </label>
            <input
              type="number"
              id="max_attempts"
              name="max_attempts"
              value={formData.max_attempts}
              onChange={handleInputChange}
              min="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="3"
            />
          </div>

          {/* Time Limit */}
          <div>
            <label htmlFor="time_limit" className="block text-sm font-medium text-gray-700">
              Time Limit (min)
            </label>
            <input
              type="number"
              id="time_limit"
              name="time_limit"
              value={formData.time_limit}
              onChange={handleInputChange}
              min="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="10"
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
        </div>
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
          {loading ? 'Saving...' : (challenge ? 'Update Challenge' : 'Create Challenge')}
        </button>
      </div>
    </form>
  )
} 