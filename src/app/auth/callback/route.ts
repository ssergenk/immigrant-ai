import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates } from '@/lib/email'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
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

      if (data.user) {
        console.log('🔍 Checking if user exists:', data.user.email)
        
        // Check if user exists in our users table
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id, email, full_name, created_at')
          .eq('id', data.user.id)
          .single()

        console.log('👤 User lookup result:', { existingUser, userError })

        if (!existingUser || userError) {
          console.log('🎉 NEW USER DETECTED - Creating record and sending welcome email')
          
          const userName = data.user.user_metadata?.full_name || 
                          data.user.user_metadata?.name || 
                          data.user.email?.split('@')[0] || 'User'
          
          // Create user record
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: userName,
              subscription_status: 'free',
              message_count: 0,
              max_messages: 15
            })

          if (insertError) {
            console.error('❌ Error creating user record:', insertError)
          } else {
            console.log('✅ User record created successfully')
          }

          // Send welcome email
          if (data.user.email) {
            console.log('📧 Sending welcome email to:', data.user.email)
            
            const welcomeEmail = emailTemplates.welcome(userName)
            
            const emailResult = await sendEmail({
              to: data.user.email,
              subject: welcomeEmail.subject,
              html: welcomeEmail.html
            })

            if (emailResult.success) {
              console.log('✅ Welcome email sent successfully to:', data.user.email)
            } else {
              console.error('❌ Failed to send welcome email:', emailResult.error)
            }
          }
        } else {
          console.log('👋 Existing user login:', existingUser.email, '(created:', existingUser.created_at, ')')
        }
      }

    } catch (error) {
      console.error('💥 Error in auth callback:', error)
      return NextResponse.redirect(`${siteUrl}/?error=auth_error`)
    }
  }

  return NextResponse.redirect(`${siteUrl}/chat`)
}