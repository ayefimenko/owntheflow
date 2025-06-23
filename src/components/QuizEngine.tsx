'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ContentService } from '@/lib/content'
import { AIService } from '@/lib/ai'
import type { Challenge, UserProgress } from '@/types/content'

interface QuizEngineProps {
  challenge: Challenge
  onComplete: (score: number, xpEarned: number) => void
  onNext?: () => void
}

interface QuizAnswer {
  questionIndex: number
  answer: any
  isCorrect?: boolean
}

interface QuizState {
  currentQuestion: number
  answers: QuizAnswer[]
  showResults: boolean
  score: number
  timeRemaining?: number
  attempts: number
  isSubmitting: boolean
}

export default function QuizEngine({ challenge, onComplete, onNext }: QuizEngineProps) {
  const { user } = useAuth()
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    answers: [],
    showResults: false,
    score: 0,
    attempts: 0,
    isSubmitting: false
  })
  const [progress, setProgress] = useState<UserProgress | null>(null)

  // Extract questions from challenge content
  const questions = challenge.content?.questions || []
  const solution = challenge.solution || {}

  useEffect(() => {
    // Load existing progress
    async function loadProgress() {
      if (!user) return
      
      try {
        const progressData = await ContentService.getUserProgress(user.id)
        const challengeProgress = progressData.find(p => 
          p.content_id === challenge.id && p.content_type === 'challenge'
        )
        
        if (challengeProgress) {
          setProgress(challengeProgress)
          setQuizState(prev => ({ ...prev, attempts: challengeProgress.attempts }))
        }
      } catch (error) {
        console.error('Error loading quiz progress:', error)
      }
    }

    loadProgress()
  }, [user, challenge.id])

  // Timer for timed quizzes
  useEffect(() => {
    if (challenge.time_limit && !quizState.showResults) {
      const timer = setTimeout(() => {
        handleTimeUp()
      }, challenge.time_limit * 60 * 1000) // Convert minutes to milliseconds

      return () => clearTimeout(timer)
    }
  }, [challenge.time_limit, quizState.showResults])

  const handleTimeUp = () => {
    setQuizState(prev => ({ ...prev, showResults: true }))
    calculateAndSubmitScore()
  }

  const handleAnswer = (questionIndex: number, answer: any) => {
    setQuizState(prev => {
      const newAnswers = [...prev.answers]
      const existingIndex = newAnswers.findIndex(a => a.questionIndex === questionIndex)
      
      if (existingIndex >= 0) {
        newAnswers[existingIndex] = { questionIndex, answer }
      } else {
        newAnswers.push({ questionIndex, answer })
      }

      return { ...prev, answers: newAnswers }
    })
  }

  const handleNextQuestion = () => {
    if (quizState.currentQuestion < questions.length - 1) {
      setQuizState(prev => ({ ...prev, currentQuestion: prev.currentQuestion + 1 }))
    }
  }

  const handlePreviousQuestion = () => {
    if (quizState.currentQuestion > 0) {
      setQuizState(prev => ({ ...prev, currentQuestion: prev.currentQuestion - 1 }))
    }
  }

  const calculateAndSubmitScore = async () => {
    setQuizState(prev => ({ ...prev, isSubmitting: true }))

    try {
      let correctAnswers = 0
      const totalQuestions = questions.length
      const answersWithCorrectness: QuizAnswer[] = []

      // Score each question
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        const userAnswer = quizState.answers.find(a => a.questionIndex === i)
        const correctAnswer = solution.answers?.[i]

        if (!userAnswer) {
          answersWithCorrectness.push({ questionIndex: i, answer: null, isCorrect: false })
          continue
        }

        let isCorrect = false

        switch (question.type) {
          case 'multiple_choice':
          case 'single_choice':
            isCorrect = userAnswer.answer === correctAnswer
            break
          
          case 'drag_drop':
            // Compare drag-drop order/mapping
            isCorrect = JSON.stringify(userAnswer.answer) === JSON.stringify(correctAnswer)
            break
          
          case 'open_text':
            // Use AI to score open-text responses
            try {
              const aiScore = await AIService.scoreTextAnswer(
                question.question,
                userAnswer.answer,
                correctAnswer,
                question.rubric || 'Rate this answer on accuracy and completeness (0-100)'
              )
              isCorrect = aiScore >= 70 // 70% threshold for correct
            } catch (error) {
              console.error('AI scoring failed:', error)
              // Fallback to simple text matching
              isCorrect = userAnswer.answer.toLowerCase().includes(correctAnswer.toLowerCase())
            }
            break
          
          default:
            isCorrect = userAnswer.answer === correctAnswer
        }

        if (isCorrect) correctAnswers++
        answersWithCorrectness.push({ 
          questionIndex: i, 
          answer: userAnswer.answer, 
          isCorrect 
        })
      }

      const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100)
      
      // Variable XP based on performance (Sprint 6 feature)
      let xpEarned = 0
      if (scorePercentage >= 90) {
        xpEarned = challenge.xp_reward * 1.5 // Bonus for excellent performance
      } else if (scorePercentage >= 80) {
        xpEarned = challenge.xp_reward * 1.2 // Bonus for good performance
      } else if (scorePercentage >= 70) {
        xpEarned = challenge.xp_reward // Full XP for passing
      } else if (scorePercentage >= 50) {
        xpEarned = Math.round(challenge.xp_reward * 0.5) // Partial XP for attempt
      }
      // No XP for scores below 50%

      // Update progress
      if (user) {
        await ContentService.updateProgress(user.id, challenge.id, 'challenge', {
          status: scorePercentage >= 70 ? 'completed' : 'in_progress',
          completion_percentage: scorePercentage,
          score: scorePercentage,
          xp_earned: xpEarned
        })
      }

      setQuizState(prev => ({ 
        ...prev, 
        showResults: true, 
        score: scorePercentage,
        answers: answersWithCorrectness,
        attempts: prev.attempts + 1,
        isSubmitting: false
      }))

      onComplete(scorePercentage, xpEarned)
    } catch (error) {
      console.error('Error calculating quiz score:', error)
      setQuizState(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  const canRetake = () => {
    if (!challenge.max_attempts) return true
    return quizState.attempts < challenge.max_attempts
  }

  const handleRetake = () => {
    setQuizState({
      currentQuestion: 0,
      answers: [],
      showResults: false,
      score: 0,
      attempts: quizState.attempts,
      isSubmitting: false
    })
  }

  const getCurrentAnswer = () => {
    return quizState.answers.find(a => a.questionIndex === quizState.currentQuestion)
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-xl mb-4">⚠️</div>
        <p className="text-red-600">No questions found for this challenge.</p>
      </div>
    )
  }

  if (quizState.showResults) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className={`text-6xl mb-4 ${
              quizState.score >= 90 ? '🏆' :
              quizState.score >= 80 ? '🎉' :
              quizState.score >= 70 ? '👍' :
              quizState.score >= 50 ? '📚' : '💪'
            }`}>
              {quizState.score >= 90 ? '🏆' :
               quizState.score >= 80 ? '🎉' :
               quizState.score >= 70 ? '👍' :
               quizState.score >= 50 ? '📚' : '💪'}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {quizState.score >= 70 ? 'Challenge Completed!' : 'Keep Learning!'}
            </h2>
            
            <div className="text-4xl font-bold mb-2" style={{
              color: quizState.score >= 70 ? '#10B981' : '#F59E0B'
            }}>
              {quizState.score}%
            </div>
            
            <p className="text-gray-600">
              {quizState.score >= 90 && 'Outstanding performance! 🌟'}
              {quizState.score >= 80 && quizState.score < 90 && 'Great job! Well done! 🎯'}
              {quizState.score >= 70 && quizState.score < 80 && 'Good work! You passed! ✅'}
              {quizState.score >= 50 && quizState.score < 70 && 'Keep practicing to improve! 📈'}
              {quizState.score < 50 && 'Review the material and try again! 💡'}
            </p>
          </div>

          {/* XP Earned Display */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">XP Earned</span>
              <span className="text-lg font-bold text-blue-600">
                +{quizState.score >= 90 ? Math.round(challenge.xp_reward * 1.5) :
                   quizState.score >= 80 ? Math.round(challenge.xp_reward * 1.2) :
                   quizState.score >= 70 ? challenge.xp_reward :
                   quizState.score >= 50 ? Math.round(challenge.xp_reward * 0.5) : 0} XP
              </span>
            </div>
            {quizState.score >= 80 && (
              <div className="text-xs text-blue-600 mt-1">
                ⭐ Bonus XP for excellent performance!
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            {canRetake() && quizState.score < 100 && (
              <button
                onClick={handleRetake}
                className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                🔄 Retake Quiz
              </button>
            )}
            
            {onNext && (
              <button
                onClick={onNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue →
              </button>
            )}
          </div>

          {/* Attempt Info */}
          <div className="mt-4 text-center text-sm text-gray-500">
            Attempt {quizState.attempts} 
            {challenge.max_attempts && ` of ${challenge.max_attempts}`}
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[quizState.currentQuestion]
  const currentAnswer = getCurrentAnswer()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Progress Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{challenge.title}</h2>
            <div className="text-sm">
              Question {quizState.currentQuestion + 1} of {questions.length}
            </div>
          </div>
          
          <div className="w-full bg-blue-300 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${((quizState.currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
          
          {challenge.time_limit && (
            <div className="text-sm mt-2 opacity-90">
              ⏱️ Time limit: {challenge.time_limit} minutes
            </div>
          )}
        </div>

        {/* Question Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {currentQuestion.question}
            </h3>
            
            {currentQuestion.image_url && (
              <img 
                src={currentQuestion.image_url} 
                alt="Question illustration"
                className="w-full max-w-md mx-auto rounded-lg mb-4"
              />
            )}
          </div>

          {/* Question Type Rendering */}
          <div className="mb-6">
            {renderQuestionType(currentQuestion, currentAnswer?.answer, (answer) => 
              handleAnswer(quizState.currentQuestion, answer)
            )}
          </div>

          {/* Hints */}
          {challenge.hints && challenge.hints.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm font-medium text-yellow-800 mb-2">💡 Hint:</div>
              <div className="text-sm text-yellow-700">
                {challenge.hints[Math.min(quizState.attempts, challenge.hints.length - 1)]}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousQuestion}
              disabled={quizState.currentQuestion === 0}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-500">
              {quizState.answers.filter(a => a.answer !== null && a.answer !== undefined).length} of {questions.length} answered
            </div>

            {quizState.currentQuestion === questions.length - 1 ? (
              <button
                onClick={calculateAndSubmitScore}
                disabled={quizState.isSubmitting || quizState.answers.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {quizState.isSubmitting ? 'Submitting...' : '✅ Submit Quiz'}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Question type renderers
function renderQuestionType(question: any, currentAnswer: any, onAnswer: (answer: any) => void) {
  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="space-y-3">
          {question.options.map((option: string, index: number) => (
            <label key={index} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={Array.isArray(currentAnswer) && currentAnswer.includes(index)}
                onChange={(e) => {
                  const newAnswer = Array.isArray(currentAnswer) ? [...currentAnswer] : []
                  if (e.target.checked) {
                    newAnswer.push(index)
                  } else {
                    const indexToRemove = newAnswer.indexOf(index)
                    if (indexToRemove > -1) {
                      newAnswer.splice(indexToRemove, 1)
                    }
                  }
                  onAnswer(newAnswer)
                }}
                className="mr-3"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )

    case 'single_choice':
      return (
        <div className="space-y-3">
          {question.options.map((option: string, index: number) => (
            <label key={index} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name={`question_${question.id}`}
                checked={currentAnswer === index}
                onChange={() => onAnswer(index)}
                className="mr-3"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )

    case 'open_text':
      return (
        <textarea
          value={currentAnswer || ''}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-[100px]"
          rows={4}
        />
      )

    case 'drag_drop':
      return (
        <DragDropQuestion 
          question={question}
          currentAnswer={currentAnswer}
          onAnswer={onAnswer}
        />
      )

    default:
      return (
        <div className="text-center py-4 text-gray-500">
          Unsupported question type: {question.type}
        </div>
      )
  }
}

// Drag and Drop Component
function DragDropQuestion({ question, currentAnswer, onAnswer }: {
  question: any
  currentAnswer: any
  onAnswer: (answer: any) => void
}) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const items = question.items || []
  const zones = question.zones || []
  const mapping = currentAnswer || {}

  const handleDragStart = (item: string) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, zone: string) => {
    e.preventDefault()
    if (draggedItem) {
      const newMapping = { ...mapping }
      
      // Remove item from previous zone
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === draggedItem) {
          delete newMapping[key]
        }
      })
      
      // Add to new zone
      newMapping[zone] = draggedItem
      
      onAnswer(newMapping)
      setDraggedItem(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Items to drag */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Drag these items:</h4>
        <div className="flex flex-wrap gap-2">
          {items.filter((item: string) => !Object.values(mapping).includes(item)).map((item: string) => (
            <div
              key={item}
              draggable
              onDragStart={() => handleDragStart(item)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-md cursor-move hover:shadow-md transition-shadow"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Drop zones */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Drop zones:</h4>
        {zones.map((zone: string) => (
          <div
            key={zone}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, zone)}
            className="min-h-[60px] p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
          >
            <div className="font-medium text-gray-700 mb-2">{zone}</div>
            {mapping[zone] && (
              <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md inline-block">
                {mapping[zone]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 