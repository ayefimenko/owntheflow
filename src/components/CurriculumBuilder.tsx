'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ContentService } from '@/lib/content'
import type { LearningPath, Course, Module, Lesson, Challenge } from '@/types/content'

// Types for curriculum tree
interface CurriculumItem {
  id: string
  type: 'path' | 'course' | 'module' | 'lesson' | 'challenge'
  title: string
  status: 'draft' | 'published' | 'archived'
  sort_order: number
  children?: CurriculumItem[]
  parent_id?: string
}

interface CurriculumBuilderProps {
  onRefresh?: () => void
  onEditPath?: (path: LearningPath) => void
  onEditCourse?: (course: Course) => void
  onEditModule?: (module: Module) => void
  onEditLesson?: (lesson: Lesson) => void
  onEditChallenge?: (challenge: Challenge) => void
}

// Sortable curriculum item component
function SortableCurriculumItem({ 
  item, 
  level = 0,
  onEdit
}: { 
  item: CurriculumItem
  level?: number
  onEdit: (item: CurriculumItem) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        bg-white border border-gray-200 rounded-md mb-2 transition-all duration-200
      `}
    >
      {/* Item Header */}
      <div 
        className="p-3 flex items-center justify-between hover:bg-gray-50"
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            ⋮⋮
          </div>

          {/* Expand/Collapse Button */}
          {item.children && item.children.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
              type="button"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          {/* Item Icon and Title */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">
              {item.type === 'path' ? '🛤️' : 
               item.type === 'course' ? '📚' : 
               item.type === 'module' ? '📋' : 
               item.type === 'lesson' ? '📖' : '🎯'}
            </span>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.title}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="capitalize">{item.type}</span>
                <span>•</span>
                <span>Order: {item.sort_order}</span>
                {item.children && (
                  <>
                    <span>•</span>
                    <span>{item.children.length} items</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <span className={`
            px-2 py-1 text-xs rounded-full font-medium
            ${item.status === 'published' ? 'bg-green-100 text-green-800' : 
              item.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
              'bg-gray-100 text-gray-800'}
          `}>
            {item.status}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onEdit(item)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            type="button"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && item.children && item.children.length > 0 && (
        <div className="pb-2">
          <SortableContext 
            items={item.children.map(child => child.id)}
            strategy={verticalListSortingStrategy}
          >
            {item.children.map((child) => (
              <SortableCurriculumItem
                key={child.id}
                item={child}
                level={level + 1}
                onEdit={onEdit}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  )
}

export default function CurriculumBuilder({ 
  onRefresh, 
  onEditPath, 
  onEditCourse, 
  onEditModule, 
  onEditLesson, 
  onEditChallenge 
}: CurriculumBuilderProps) {
  const [curriculumTree, setCurriculumTree] = useState<CurriculumItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<CurriculumItem | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Load curriculum data
  const loadCurriculumData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load all content data
      const [paths, courses, modules, lessons, challenges] = await Promise.all([
        ContentService.getLearningPaths(),
        ContentService.getCourses(),
        ContentService.getModules(),
        ContentService.getLessons(),
        ContentService.getChallenges(),
      ])

      // Build hierarchical tree structure
      const tree: CurriculumItem[] = paths.map(path => ({
        id: path.id,
        type: 'path' as const,
        title: path.title,
        status: path.status,
        sort_order: 0,
        children: courses
          .filter(course => course.path_id === path.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(course => ({
            id: course.id,
            type: 'course' as const,
            title: course.title,
            status: course.status,
            sort_order: course.sort_order,
            parent_id: path.id,
            children: modules
              .filter(module => module.course_id === course.id)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(module => ({
                id: module.id,
                type: 'module' as const,
                title: module.title,
                status: module.status,
                sort_order: module.sort_order,
                parent_id: course.id,
                children: lessons
                  .filter(lesson => lesson.module_id === module.id)
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map(lesson => ({
                    id: lesson.id,
                    type: 'lesson' as const,
                    title: lesson.title,
                    status: lesson.status,
                    sort_order: lesson.sort_order,
                    parent_id: module.id,
                    children: challenges
                      .filter(challenge => challenge.lesson_id === lesson.id)
                      .map(challenge => ({
                        id: challenge.id,
                        type: 'challenge' as const,
                        title: challenge.title,
                        status: 'draft' as const,
                        sort_order: 0,
                        parent_id: lesson.id,
                      }))
                  }))
              }))
          }))
      }))

      setCurriculumTree(tree)

    } catch (error) {
      console.error('Failed to load curriculum data:', error)
      setError('Failed to load curriculum data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    loadCurriculumData()
  }, [loadCurriculumData])

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    
    // Find the dragged item in the tree
    const findItem = (items: CurriculumItem[]): CurriculumItem | null => {
      for (const item of items) {
        if (item.id === active.id) {
          return item
        }
        if (item.children) {
          const found = findItem(item.children)
          if (found) {
            return found
          }
        }
      }
      return null
    }

    const draggedItem = findItem(curriculumTree)
    setDraggedItem(draggedItem)
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedItem(null)

    if (!over || active.id === over.id) {
      return
    }

    // Find source and destination items
    const findItemAndParent = (items: CurriculumItem[], id: string, parent: CurriculumItem | null = null): { item: CurriculumItem; parent: CurriculumItem | null; index: number } | null => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.id === id) {
          return { item, parent, index: i }
        }
        if (item.children) {
          const found = findItemAndParent(item.children, id, item)
          if (found) {
            return found
          }
        }
      }
      return null
    }

    const sourceInfo = findItemAndParent(curriculumTree, active.id as string)
    const destInfo = findItemAndParent(curriculumTree, over.id as string)

    if (!sourceInfo || !destInfo) {
      return
    }

    // Only allow reordering within the same parent
    if (sourceInfo.parent?.id !== destInfo.parent?.id) {
      console.log('Cross-parent dragging not supported yet')
      return
    }

    // Update the tree structure
    const newTree = [...curriculumTree]
    const parentItems = sourceInfo.parent ? 
      (sourceInfo.parent.children || []) : 
      newTree

    const newParentItems = arrayMove(parentItems, sourceInfo.index, destInfo.index)
    
    // Update sort orders
    newParentItems.forEach((item, index) => {
      item.sort_order = index + 1
    })

    if (sourceInfo.parent) {
      sourceInfo.parent.children = newParentItems
    } else {
      setCurriculumTree(newParentItems)
      return
    }

    setCurriculumTree(newTree)

    // Update sort orders in database
    try {
      const updatePromises = newParentItems.map(async (item) => {
        switch (item.type) {
          case 'course':
            return ContentService.updateCourse(item.id, { sort_order: item.sort_order })
          case 'module':
            return ContentService.updateModule(item.id, { sort_order: item.sort_order })
          case 'lesson':
            return ContentService.updateLesson(item.id, { sort_order: item.sort_order })
          default:
            return Promise.resolve()
        }
      })

      await Promise.all(updatePromises)
      console.log('✅ Sort orders updated successfully')
      
      if (onRefresh) {
        onRefresh()
      }

    } catch (error) {
      console.error('Failed to update sort orders:', error)
      // Revert the change
      loadCurriculumData()
    }
  }

  const handleEditItem = async (item: CurriculumItem) => {
    try {
      // Get the full item data before editing and call the appropriate handler
      switch (item.type) {
        case 'path':
          if (onEditPath) {
            const fullPath = await ContentService.getLearningPath(item.id)
            if (fullPath) {
              onEditPath(fullPath)
            }
          }
          break
        case 'course':
          if (onEditCourse) {
            const fullCourse = await ContentService.getCourse(item.id)
            if (fullCourse) {
              onEditCourse(fullCourse)
            }
          }
          break
        case 'module':
          if (onEditModule) {
            const fullModule = await ContentService.getModule(item.id)
            if (fullModule) {
              onEditModule(fullModule)
            }
          }
          break
        case 'lesson':
          if (onEditLesson) {
            const fullLesson = await ContentService.getLesson(item.id)
            if (fullLesson) {
              onEditLesson(fullLesson)
            }
          }
          break
        case 'challenge':
          if (onEditChallenge) {
            const fullChallenge = await ContentService.getChallenge(item.id)
            if (fullChallenge) {
              onEditChallenge(fullChallenge)
            }
          }
          break
        default:
          console.log('Unknown item type:', item.type)
      }
    } catch (error) {
      console.error('Failed to load item for editing:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading curriculum structure...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Curriculum</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadCurriculumData}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          type="button"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Curriculum Builder</h2>
          <p className="text-sm text-gray-600">
            Drag and drop to reorganize your learning content hierarchy
          </p>
        </div>
        <button
          onClick={loadCurriculumData}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          type="button"
        >
          <span>🔄</span>
          Refresh
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">📋 How to use the Curriculum Builder</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Drag the ⋮⋮ handle to reorder items within the same parent</li>
          <li>• Use the ▼ ▶ buttons to expand/collapse sections</li>
          <li>• Items are automatically sorted by their display order</li>
          <li>• Changes are saved immediately to the database</li>
        </ul>
      </div>

      {/* Curriculum Tree */}
      {curriculumTree.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🛤️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No learning paths yet</h3>
          <p className="text-gray-500 mb-6">Create your first learning path to build your curriculum</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={curriculumTree.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {curriculumTree.map((item) => (
                <SortableCurriculumItem
                  key={item.id}
                  item={item}
                  onEdit={handleEditItem}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              {draggedItem && (
                <div className="bg-white border border-gray-300 rounded-md shadow-lg p-3 opacity-95">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {draggedItem.type === 'path' ? '🛤️' : 
                       draggedItem.type === 'course' ? '📚' : 
                       draggedItem.type === 'module' ? '📋' : 
                       draggedItem.type === 'lesson' ? '📖' : '🎯'}
                    </span>
                    <span className="font-medium text-gray-900">{draggedItem.title}</span>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  )
} 