import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
  console.log('🔔 Stripe webhook received')
  
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.log('❌ No Stripe signature found')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log('✅ Webhook signature verified:', event.type)
  } catch (err) {
    console.log('❌ Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Create Supabase client
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('💰 Checkout session completed:', session.id)

        if (session.mode === 'subscription' && session.customer && session.subscription) {
          const userId = session.metadata?.user_id
          
          if (!userId) {
            console.log('❌ No user_id in session metadata')
            break
          }

          console.log('👤 Upgrading user to premium:', userId)

          // Update user to premium status
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_status: 'premium',
              max_messages: 999999,
              stripe_customer_id: session.customer as string
            })
            .eq('id', userId)

          if (updateError) {
            console.error('❌ Error updating user:', updateError)
          } else {
            console.log('✅ User upgraded to premium successfully')
          }

          // Save subscription record
          const { error: subError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              status: 'active'
            })

          if (subError) {
            console.error('❌ Error saving subscription:', subError)
          } else {
            console.log('✅ Subscription record saved')
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('🔄 Subscription updated:', subscription.id)

        // Find user by customer ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (userError || !userData) {
          console.log('❌ User not found for customer:', subscription.customer)
          break
        }

        // Update subscription status
        const newStatus = subscription.status === 'active' ? 'premium' : 'free'
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: newStatus,
            max_messages: newStatus === 'premium' ? 999999 : 15
          })
          .eq('id', userData.id)

        if (updateError) {
          console.error('❌ Error updating subscription status:', updateError)
        } else {
          console.log('✅ Subscription status updated to:', newStatus)
        }

        // Update subscription record with null safety
        const updateData: any = {
          status: subscription.status
        }

        if (subscription.current_period_start) {
          updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString()
        }

        if (subscription.current_period_end) {
          updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString()
        }

        await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('❌ Subscription canceled:', subscription.id)

        // Find user by customer ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (userError || !userData) {
          console.log('❌ User not found for customer:', subscription.customer)
          break
        }

        // Downgrade user to free
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: 'canceled',
            max_messages: 15
          })
          .eq('id', userData.id)

        if (updateError) {
          console.error('❌ Error downgrading user:', updateError)
        } else {
          console.log('✅ User downgraded to free')
        }

        // Update subscription record
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id)

        break  
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('💥 Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}