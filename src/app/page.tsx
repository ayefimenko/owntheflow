export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Brand Header */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🏄 Own The Flow
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Understand systems. Lead smarter.
          </p>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            An AI-powered online learning platform designed for business-oriented professionals — 
            COOs, Project Managers, Product Managers, Delivery Directors, and Founders — 
            who seek to understand technical systems, tools, and workflows.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 Target Audience</h3>
              <p className="text-gray-700">Business leaders who need to collaborate confidently with developers</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">🤖 AI-Powered</h3>
              <p className="text-gray-700">Personalized learning with intelligent mentorship and feedback</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">🏆 Gamified</h3>
              <p className="text-gray-700">XP system, levels, badges, and certificates with LinkedIn integration</p>
            </div>
          </div>
        </div>

        {/* Development Status */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🚧</span>
            </div>
            <div className="ml-3 text-left">
              <h3 className="text-sm font-medium text-yellow-800">
                Development in Progress
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                MVP Sprint 1: Core Setup & Auth - Next.js + Tailwind CSS ✅
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack Info */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Built with Next.js 15, Tailwind CSS, TypeScript, and Supabase</p>
        </div>
      </div>
    </div>
  );
}
