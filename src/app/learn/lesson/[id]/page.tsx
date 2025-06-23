import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LessonPlayer } from '@/components/LessonPlayer'
import { ContentService } from '@/lib/content'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  
  try {
    const lesson = await ContentService.getLesson(id)
    
    if (!lesson) {
      return {
        title: 'Lesson Not Found - Own The Flow'
      }
    }

    return {
      title: `${lesson.title} - Own The Flow`,
      description: lesson.summary || lesson.meta_description || `Learn ${lesson.title} with Own The Flow`,
    }
  } catch (error) {
    return {
      title: 'Lesson Not Found - Own The Flow'
    }
  }
}

export default async function LessonPage({ params }: Props) {
  const { id } = await params
  
  try {
    const lesson = await ContentService.getLesson(id)
    
    if (!lesson || lesson.status !== 'published') {
      notFound()
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <LessonPlayer lessonId={id} />
      </div>
    )
  } catch (error) {
    console.error('Error loading lesson:', error)
    notFound()
  }
} 