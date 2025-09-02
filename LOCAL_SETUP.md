# Local Development Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables (one-time):**
   ```bash
   # Install Vercel CLI if you haven't already
   npm i -g vercel
   
   # Link to your Vercel project
   vercel link
   
   # Pull environment variables from Vercel
   npm run setup:local
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server on default port (3000)
- `npm run dev:port` - Start development server on port 3004
- `npm run setup:local` - Pull environment variables from Vercel
- `npm run dev:fresh` - Setup env vars and start dev server

## Development Modes

### With Supabase (Recommended)
After running `npm run setup:local`, the app will connect to your Supabase database and provide full functionality.

### Without Supabase (Demo Mode)
If Supabase credentials are not configured, the app will:
- Show a yellow development mode banner
- Use demo sign types
- Save data to localStorage only
- Work perfectly for UI development and testing

## Environment Variables

The `.env.local` file (git-ignored) should contain:
```env
# Supabase (synced from Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Google Vision API (optional, for OCR)
GOOGLE_VISION_API_KEY=your-api-key-here
```

## Important Notes

- ✅ **Never commit `.env.local`** - It's automatically git-ignored
- ✅ **Use `vercel env pull`** to sync from production
- ✅ **Demo mode works** without any credentials for UI development
- ✅ **LocalStorage fallback** ensures work is never lost

## Troubleshooting

### "Supabase not configured" warning
This is normal in development without credentials. The app works fine with demo data.

### How to get Vercel environment variables
1. Make sure you're added to the Vercel project
2. Run `vercel login` to authenticate
3. Run `vercel link` to connect to the project
4. Run `vercel env pull .env.local` to sync variables

### Port already in use
Use `npm run dev:port` to run on port 3004 instead of 3000.

## Team Development

For new team members:
1. Clone the repository
2. Run `npm install`
3. Ask project owner for Vercel project access
4. Run `npm run setup:local` to get credentials
5. Start developing with `npm run dev`

The app works in demo mode even without Vercel access, perfect for UI development!