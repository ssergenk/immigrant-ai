import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { sendEmail, emailTemplates } from '@/lib/email'

// Define the type for the data you're updating in the 'subscriptions' table
type SubscriptionUpdate = {
  status: string;
  current_period_start?: string; // Optional, as it's conditionally added
  current_period_end?: string;   // Optional, as it's conditionally added
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil', // Ensure this API version is recent enough to reflect the change
});

export async function POST(request: NextRequest) {
  console.log('🔔 Stripe webhook received');

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.log('❌ No Stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    console.log('❌ Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Create Supabase client
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💰 Checkout session completed:', session.id);

        if (session.mode === 'subscription' && session.customer && session.subscription) {
          const userId = session.metadata?.user_id;

          if (!userId) {
            console.log('❌ No user_id in session metadata');
            break;
          }

          console.log('👤 Upgrading user to premium:', userId);

          // Get user details for email
          const { data: userData, error: userFetchError } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', userId)
            .single();

          // Update user to premium status
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_status: 'premium',
              max_messages: 999999,
              stripe_customer_id: session.customer as string
            })
            .eq('id', userId);

          if (updateError) {
            console.error('❌ Error updating user:', updateError);
          } else {
            console.log('✅ User upgraded to premium successfully');
          }

          // Save subscription record
          const { error: subError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              status: 'active'
            });

          if (subError) {
            console.error('❌ Error saving subscription:', subError);
          } else {
            console.log('✅ Subscription record saved');
          }

          // Send subscription confirmation email
          if (userData && userData.email && !userFetchError) {
            const userName = userData.full_name || 'there';
            const confirmationEmail = emailTemplates.subscriptionConfirmed(userName);
            
            const emailResult = await sendEmail({
              to: userData.email,
              subject: confirmationEmail.subject,
              html: confirmationEmail.html
            });

            if (emailResult.success) {
              console.log('✅ Subscription confirmation email sent');
            } else {
              console.error('❌ Failed to send confirmation email:', emailResult.error);
            }
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💳 Payment succeeded for invoice:', invoice.id);

        // Get customer details
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        
        if (customer && !customer.deleted && customer.email) {
          // Find user by customer ID
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name')
            .eq('stripe_customer_id', invoice.customer as string)
            .single();

          const userName = userData?.full_name || 'there';
          const amount = (invoice.amount_paid / 100).toString(); // Convert cents to dollars
          
          const receiptEmail = emailTemplates.paymentReceipt(
            userName, 
            amount, 
            invoice.hosted_invoice_url || undefined
          );
          
          const emailResult = await sendEmail({
            to: customer.email,
            subject: receiptEmail.subject,
            html: receiptEmail.html
          });

          if (emailResult.success) {
            console.log('✅ Payment receipt email sent');
          } else {
            console.error('❌ Failed to send receipt email:', emailResult.error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Subscription updated:', subscription.id);

        // Find user by customer ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (userError || !userData) {
          console.log('❌ User not found for customer:', subscription.customer);
          break;
        }

        // Update subscription status for the user
        const newStatus = subscription.status === 'active' ? 'premium' : 'free';

        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: newStatus,
            max_messages: newStatus === 'premium' ? 999999 : 15
          })
          .eq('id', userData.id);

        if (updateError) {
          console.error('❌ Error updating subscription status for user:', updateError);
        } else {
          console.log('✅ Subscription status updated to:', newStatus);
        }

        // Update subscription record with null safety
        const updateData: SubscriptionUpdate = {
          status: subscription.status
        };

        // Access current_period_start and current_period_end from the first subscription item
        if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
          const firstSubscriptionItem = subscription.items.data[0];

          if (firstSubscriptionItem.current_period_start) {
            updateData.current_period_start = new Date(firstSubscriptionItem.current_period_start * 1000).toISOString();
          }

          if (firstSubscriptionItem.current_period_end) {
            updateData.current_period_end = new Date(firstSubscriptionItem.current_period_end * 1000).toISOString();
          }
        } else {
          console.warn('⚠️ No subscription items found for updated subscription:', subscription.id);
        }

        await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Subscription canceled:', subscription.id);

        // Find user by customer ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (userError || !userData) {
          console.log('❌ User not found for customer:', subscription.customer);
          break;
        }

        // Downgrade user to free
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: 'canceled',
            max_messages: 15
          })
          .eq('id', userData.id);

        if (updateError) {
          console.error('❌ Error downgrading user:', updateError);
        } else {
          console.log('✅ User downgraded to free');
        }

        // Update subscription record
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}