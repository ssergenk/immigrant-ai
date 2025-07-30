import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
  console.log('💳 Stripe checkout API called')
  
  try {
    // Get authenticated user
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤 User authenticated:', user.email)

    // Check if user already has a premium subscription
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_status, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (userData?.subscription_status === 'premium') {
      return NextResponse.json({ error: 'User already has premium subscription' }, { status: 400 })
    }

    console.log('💰 Creating Stripe checkout session...')

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email || undefined,
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/chat?success=true`,
      cancel_url: `${request.nextUrl.origin}/chat?canceled=true`,
      metadata: {
        user_id: user.id,
        user_email: user.email || '',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    })

    console.log('✅ Stripe checkout session created:', session.id)

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })

  } catch (error) {
    console.error('💥 Stripe checkout error:', error)
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}