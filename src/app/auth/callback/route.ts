import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates } from '@/lib/email'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // Define your production site URL from environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000'

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${siteUrl}/?error=auth_error`)
      }

      // Check if this is a new user and send welcome email
      if (data.user) {
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('id', data.user.id)
          .single()

        // If user doesn't exist in our users table, it's a new signup
        if (userError && userError.code === 'PGRST116') {
          console.log('🎉 New user signup detected, sending welcome email')
          
          // Create user record (this might already exist from your signup flow)
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'User',
              subscription_status: 'free',
              message_count: 0,
              max_messages: 15
            })

          if (insertError) {
            console.error('❌ Error creating user record:', insertError)
          }

          // Send welcome email
          if (data.user.email) {
            const userName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'there'
            const welcomeEmail = emailTemplates.welcome(userName)
            
            const emailResult = await sendEmail({
              to: data.user.email,
              subject: welcomeEmail.subject,
              html: welcomeEmail.html
            })

            if (emailResult.success) {
              console.log('✅ Welcome email sent successfully')
            } else {
              console.error('❌ Failed to send welcome email:', emailResult.error)
            }
          }
        } else if (existingUser) {
          console.log('👋 Existing user login:', existingUser.email)
        }
      }

    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(`${siteUrl}/?error=auth_error`)
    }
  }

  return NextResponse.redirect(`${siteUrl}/chat`)
}