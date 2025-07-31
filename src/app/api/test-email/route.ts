import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, name, type } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    let result;
    const userName = name || 'Test User';

    switch (type) {
      case 'welcome':
        const welcomeEmail = emailTemplates.welcome(userName);
        result = await sendEmail({
          to: email,
          subject: welcomeEmail.subject,
          html: welcomeEmail.html
        });
        break;

      case 'subscription':
        const subEmail = emailTemplates.subscriptionConfirmed(userName);
        result = await sendEmail({
          to: email,
          subject: subEmail.subject,
          html: subEmail.html
        });
        break;

      case 'receipt':
        const receiptEmail = emailTemplates.paymentReceipt(userName, '14.00');
        result = await sendEmail({
          to: email,
          subject: receiptEmail.subject,
          html: receiptEmail.html
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid email type. Use: welcome, subscription, or receipt' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: result.success,
      message: result.success ? `${type} email sent successfully!` : `${type} email failed`,
      error: result.success ? null : result.error,
      emailSentTo: email
    });

  } catch (error) {
    console.error('Test email API error:', error);
    return NextResponse.json({ error: 'API error occurred' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Test API',
    usage: 'POST with { "email": "test@example.com", "name": "Test User", "type": "welcome|subscription|receipt" }'
  });
}