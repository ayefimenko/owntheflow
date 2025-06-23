import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LearningPathDetail } from '@/components/LearningPathDetail'
import { ContentService } from '@/lib/content'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  
  try {
    const path = await ContentService.getLearningPathBySlug(slug)
    
    if (!path || path.status !== 'published') {
      return {
        title: 'Learning Path Not Found - Own The Flow',
      }
    }

    return {
      title: `${path.title} - Own The Flow`,
      description: path.short_description || path.description,
    }
  } catch (error) {
    return {
      title: 'Learning Path Not Found - Own The Flow',
    }
  }
}

export default async function LearningPathPage({ params }: Props) {
  const { slug } = await params
  
  try {
    const path = await ContentService.getLearningPathBySlug(slug)
    
    if (!path || path.status !== 'published') {
      notFound()
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <LearningPathDetail pathSlug={slug} />
      </div>
    )
  } catch (error) {
    console.error('Error loading learning path:', error)
    notFound()
  }
} 