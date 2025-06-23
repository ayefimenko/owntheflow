import { Metadata } from 'next'
import { LearningCatalog } from '@/components/LearningCatalog'

export const metadata: Metadata = {
  title: 'Learning Catalog - Own The Flow',
  description: 'Browse learning paths and start your journey to master technical skills as a business professional',
}

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              🏄 Learning Catalog
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Understand systems. Lead smarter. Choose your learning path.
            </p>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LearningCatalog />
      </div>
    </div>
  )
} 