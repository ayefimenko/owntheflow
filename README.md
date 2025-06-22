# Own The Flow - AI-Powered Learning Platform

A modern learning platform designed for business professionals to understand technical systems and collaborate confidently with developers.

## 🚀 Current Sprint Status

### ✅ Sprint 1: Core Setup & Authentication (COMPLETED)
- Next.js 15 + TypeScript + Tailwind CSS
- Supabase authentication with role-based access
- User profiles and permission system
- Comprehensive error handling

### ✅ Sprint 2: Content Management System (COMPLETED)
- Complete content hierarchy (Learning Path → Course → Module → Lesson → Challenge)
- Database schema with progress tracking and XP system
- Admin dashboard for content management
- Role-based permissions (Admin, Content Manager, User)

### 🚧 Sprint 3: AI Editor Assistant (IN PROGRESS)
- OpenAI GPT-4o integration for content generation
- Role-based content optimization (COO, PM, Project Manager, etc.)
- AI-powered content rewriting, summarization, and improvement
- Smart SEO meta generation

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- OpenAI API account (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ayefimenko/owntheflow.git
   cd owntheflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # OpenAI Configuration (Sprint 3 - AI Assistant)
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Get API Keys**
   - **Supabase**: Create a project at [supabase.com](https://supabase.com) and get your URL and anon key
   - **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

5. **Database Setup**
   Run the migrations in your Supabase project (located in `/supabase/migrations/`)

6. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## 🤖 AI Assistant Features (Sprint 3)

The AI Assistant provides intelligent content creation and editing capabilities:

### **Content Generation**
- Generate lesson content from titles
- Role-based content optimization for different audiences
- Automatic content improvement and enhancement

### **Target Audiences**
- **COO**: Operations-focused explanations with business impact
- **Product Manager**: User impact and feasibility considerations
- **Project Manager**: Timeline, risks, and delivery aspects
- **Founder/CEO**: Strategic and investment implications
- **Delivery Director**: Quality, scalability, and technical debt
- **General**: Simple explanations for business professionals

### **AI Capabilities**
- **Generate**: Create content from lesson titles
- **Rewrite**: Adapt content for specific roles/audiences
- **Improve**: Enhance writing quality and clarity
- **Summarize**: Auto-generate lesson summaries
- **SEO Meta**: Generate meta descriptions for search engines

### **Usage**
1. Navigate to `/content` (requires admin or content manager role)
2. Create or edit a lesson
3. Click the "🤖 Show AI" button to access AI features
4. Select your target audience
5. Use AI actions to generate or improve content

## 🏗️ Architecture

### **Tech Stack**
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **AI**: OpenAI GPT-4o
- **Editor**: React Markdown Editor with preview
- **Hosting**: Vercel-ready

### **Database Schema**
- Content hierarchy with proper relationships
- Row Level Security (RLS) policies
- Progress tracking and XP system
- Certificate generation with verification

### **Security**
- Role-based access control
- Protected routes and API endpoints
- Secure environment variable handling
- Content creation permissions

## 📋 Development Guidelines

### **Code Quality**
- Follow SOLID principles
- Maintain clean, organized code (files under 200-300 lines)
- Use TypeScript for type safety
- Implement proper error handling

### **Git Configuration**
```bash
git config user.email "ayefimenko1337@gmail.com"
git config user.name "Anton Efimenko"
```

### **Testing**
- Always restart the server after changes
- Test AI features with valid OpenAI API key
- Verify role-based access controls

## 🎯 Upcoming Features

### **Sprint 4: Curriculum Builder**
- Drag-and-drop course organization
- Reusable content components
- Content relationship management

### **Sprint 5: Learner Experience**
- Course navigation and progress tracking
- XP and achievement system
- Content consumption interface

### **Sprint 6: Assessment Engine**
- Interactive quizzes and challenges
- AI-powered evaluation
- Progress analytics

## 🚨 Troubleshooting

### **AI Features Not Working**
- Verify OpenAI API key is set in `.env.local`
- Check browser console for API errors
- Ensure you have sufficient OpenAI credits

### **Authentication Issues**
- Check Supabase configuration
- Verify environment variables
- Clear browser local storage if needed

### **Build Errors**
- Run `npm run build` to check for errors
- Fix ESLint warnings that cause build failures
- Ensure all imports are correct

## 📞 Support

For issues or questions:
- Check the development logs in `DEV_LOG.md`
- Review bug fixes in `BUG_FIXES_SUMMARY.md`
- Contact: ayefimenko1337@gmail.com

---

**Status**: ✅ Production Ready with AI Assistant  
**Current Version**: Sprint 3 Implementation  
**Last Updated**: December 2024
