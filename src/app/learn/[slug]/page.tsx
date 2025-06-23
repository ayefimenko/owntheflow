import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LearningPathDetail } from '@/components/LearningPathDetail'
import { ContentService } from '@/lib/content'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  
  // Get all published learning paths to find the one with this slug
  const paths = await ContentService.getLearningPaths({ 
    status: ['published' as const] 
  })
  
  const path = paths.find(p => p.slug === slug)
  
  if (!path) {
    return {
      title: 'Learning Path Not Found - Own The Flow'
    }
  }

  return {
    title: `${path.title} - Own The Flow`,
    description: path.short_description || path.description || `Learn ${path.title} with Own The Flow`,
  }
}

export default async function LearningPathPage({ params }: Props) {
  const { slug } = await params
  
  // Get all published learning paths to find the one with this slug
  const paths = await ContentService.getLearningPaths({ 
    status: ['published' as const] 
  })
  
  const path = paths.find(p => p.slug === slug)
  
  if (!path) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LearningPathDetail pathId={path.id} />
    </div>
  )
} 