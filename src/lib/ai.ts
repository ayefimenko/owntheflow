import OpenAI from 'openai'

// AI Service for content generation and editing
export class AIService {
  private static client: OpenAI | null = null

  // Initialize OpenAI client
  private static initClient(): OpenAI | null {
    try {
      // Check if API key is available
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
      
      if (!apiKey) {
        console.warn('OpenAI API key not found. AI features will be disabled.')
        return null
      }

      if (!this.client) {
        this.client = new OpenAI({
          apiKey,
          dangerouslyAllowBrowser: true // For client-side usage
        })
      }

      return this.client
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error)
      return null
    }
  }

  // Check if AI service is available
  static isAvailable(): boolean {
    return this.initClient() !== null
  }

  // Role-based persona prompts for different target audiences
  private static getRolePersona(role: string): string {
    const personas: Record<string, string> = {
      'coo': 'You are explaining to a Chief Operating Officer who needs to understand technical concepts for business decisions. Use clear, business-focused language with operational impact examples.',
      'product_manager': 'You are explaining to a Product Manager who needs technical understanding to make product decisions. Focus on user impact, technical feasibility, and implementation considerations.',
      'project_manager': 'You are explaining to a Project Manager who needs to coordinate technical work. Emphasize timelines, risks, dependencies, and delivery aspects.',
      'founder': 'You are explaining to a Founder/CEO who needs high-level technical understanding for strategic decisions. Focus on business value, competitive advantage, and investment implications.',
      'delivery_director': 'You are explaining to a Delivery Director who manages technical delivery. Emphasize quality, scalability, technical debt, and operational considerations.',
      'general': 'You are explaining to a business professional with limited technical background. Use simple, clear language with practical examples.'
    }

    return personas[role] || personas['general']
  }

  // Summarize content
  static async summarizeContent(content: string, maxLength: number = 200): Promise<string | null> {
    const client = this.initClient()
    if (!client) return null

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a content summarization expert. Create concise, informative summaries that capture the key points. Keep summaries under ${maxLength} characters.`
          },
          {
            role: 'user',
            content: `Please summarize this content:\n\n${content}`
          }
        ],
        max_tokens: Math.floor(maxLength / 2), // Rough estimate for token limit
        temperature: 0.3
      })

      return response.choices[0]?.message?.content?.trim() || null
    } catch (error) {
      console.error('Failed to summarize content:', error)
      return null
    }
  }

  // Rewrite content for specific role/audience
  static async rewriteForRole(content: string, role: string): Promise<string | null> {
    const client = this.initClient()
    if (!client) return null

    try {
      const persona = this.getRolePersona(role)
      
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${persona}\n\nRewrite the following content to be perfectly suited for this audience. Maintain the core information but adjust the tone, examples, and level of technical detail appropriately. Use markdown formatting.`
          },
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 2000,
        temperature: 0.4
      })

      return response.choices[0]?.message?.content?.trim() || null
    } catch (error) {
      console.error('Failed to rewrite content:', error)
      return null
    }
  }

  // Improve writing quality and clarity
  static async improveWriting(content: string): Promise<string | null> {
    const client = this.initClient()
    if (!client) return null

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical writer and editor. Improve the clarity, flow, and engagement of the content while maintaining all technical accuracy. Fix grammar, improve sentence structure, and enhance readability. Keep the same markdown formatting and structure.'
          },
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })

      return response.choices[0]?.message?.content?.trim() || null
    } catch (error) {
      console.error('Failed to improve writing:', error)
      return null
    }
  }

  // Generate content based on a topic and role
  static async generateContent(topic: string, role: string, contentType: 'lesson' | 'module' | 'course' = 'lesson'): Promise<string | null> {
    const client = this.initClient()
    if (!client) return null

    try {
      const persona = this.getRolePersona(role)
      
      const contentPrompts = {
        'lesson': 'Create a comprehensive lesson that includes an introduction, main concepts, practical examples, and key takeaways.',
        'module': 'Create an outline for a learning module that breaks down the topic into logical lessons.',
        'course': 'Create a course overview that outlines the learning objectives, target audience, and module structure.'
      }

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `${persona}\n\n${contentPrompts[contentType]} Use markdown formatting for clear structure and readability. Focus on practical, actionable content that helps business professionals understand and apply technical concepts.`
          },
          {
            role: 'user',
            content: `Create content about: ${topic}`
          }
        ],
        max_tokens: 2500,
        temperature: 0.6
      })

      return response.choices[0]?.message?.content?.trim() || null
    } catch (error) {
      console.error('Failed to generate content:', error)
      return null
    }
  }

  // Generate meta description for SEO
  static async generateMetaDescription(title: string, content: string): Promise<string | null> {
    const client = this.initClient()
    if (!client) return null

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert. Create compelling meta descriptions that are 150-160 characters long, include relevant keywords, and encourage clicks while accurately describing the content.'
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nContent summary: ${content.substring(0, 500)}...`
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      })

      return response.choices[0]?.message?.content?.trim() || null
    } catch (error) {
      console.error('Failed to generate meta description:', error)
      return null
    }
  }

  // Suggest lesson improvements
  static async suggestImprovements(content: string): Promise<string[] | null> {
    const client = this.initClient()
    if (!client) return null

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an instructional design expert. Analyze the lesson content and provide 3-5 specific, actionable suggestions for improvement. Focus on clarity, engagement, practical application, and learning effectiveness. Return suggestions as a JSON array of strings.'
          },
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 500,
        temperature: 0.4
      })

      const suggestions = response.choices[0]?.message?.content?.trim()
      if (!suggestions) return null

      try {
        return JSON.parse(suggestions)
      } catch {
        // Fallback: split by lines if JSON parsing fails
        return suggestions.split('\n').filter(line => line.trim().length > 0)
      }
    } catch (error) {
      console.error('Failed to suggest improvements:', error)
      return null
    }
  }
}

// Export available roles for UI
export const AI_ROLES = [
  { value: 'coo', label: 'COO (Operations Focus)' },
  { value: 'product_manager', label: 'Product Manager' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'founder', label: 'Founder/CEO' },
  { value: 'delivery_director', label: 'Delivery Director' },
  { value: 'general', label: 'General Business Professional' }
] as const

export type AIRole = typeof AI_ROLES[number]['value'] 