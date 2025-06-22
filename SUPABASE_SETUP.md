# 🔧 Supabase Setup Guide for Own The Flow

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Node.js**: Ensure you have Node.js installed (version 16+ recommended)

## Step 1: Create Supabase Project

1. Log into your Supabase dashboard
2. Click "New Project"
3. Choose your organization
4. Set project name: `own-the-flow`
5. Set database password (save this securely)
6. Choose a region closest to your users
7. Click "Create new project"

## Step 2: Get API Keys

1. Once your project is created, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon (public) key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
   - **Service role key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` - keep this private!)

## Step 3: Configure Environment Variables

1. Create a `.env.local` file in your project root:
   ```bash
   touch .env.local
   ```

2. Add your Supabase credentials:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   
   # Optional: Service role key for admin operations
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Step 4: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add your local development URL: `http://localhost:3000`
3. Under **Redirect URLs**, add: `http://localhost:3000/**`
4. Enable **Email confirmations** if desired (recommended for production)

## Step 5: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. Click "Get Started" to test signup
4. Click "Sign In" to test login

## Step 6: Verify in Supabase Dashboard

1. Go to **Authentication** → **Users** in your Supabase dashboard
2. You should see any users you created during testing

## 🚨 Important Security Notes

- **Never commit `.env.local`** to version control
- **Keep your service role key private** - it has admin access
- **Use environment variables** for all sensitive data
- **Enable RLS (Row Level Security)** for production tables

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Double-check your `.env.local` file format
2. **"Failed to fetch"**: Verify your Supabase URL is correct
3. **"Email not confirmed"**: Check your email or disable email confirmation in Supabase dashboard
4. **CORS errors**: Ensure your site URL is configured in Supabase dashboard

### Debug Steps:

1. Check browser console for error messages
2. Verify environment variables are loaded: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`
3. Test API connection directly in Supabase dashboard

## 📚 Next Steps

Once authentication is working:
1. Set up user roles (admin, content manager, user)
2. Create database tables for courses and lessons
3. Configure Row Level Security policies
4. Add social authentication providers if needed

## 🆘 Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Own The Flow GitHub Issues](https://github.com/ayefimenko/owntheflow/issues) 