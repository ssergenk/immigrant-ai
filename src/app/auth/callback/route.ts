import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Define your production site URL from environment variable
  // Use a fallback to VERCEL_URL if NEXT_PUBLIC_SITE_URL is not set (good practice)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000'; // Added a robust fallback

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      // Corrected redirect: Use the explicit siteUrl
      return NextResponse.redirect(`${siteUrl}/?error=auth_error`)
    }
  }

  // Corrected redirect: Use the explicit siteUrl
  return NextResponse.redirect(`${siteUrl}/chat`)
}