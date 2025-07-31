import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailData) {
  try {
    const data = await resend.emails.send({
      from: 'ImmigrantAI <noreply@myimmigrationai.com>',
      to: [to],
      subject,
      html,
    });
    
    console.log('✅ Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error };
  }
}

// Email Templates
export const emailTemplates = {
  welcome: (userName: string) => ({
    subject: 'Welcome to ImmigrantAI - Your Virtual Immigration Attorney',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to ImmigrantAI, ${userName}!</h2>
        <p>I'm Sarah Chen, your virtual immigration attorney with 30 years of experience helping immigrants navigate the US immigration system.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">🎉 You're all set! Here's what you get:</h3>
          <ul>
            <li><strong>15 free messages</strong> to get started</li>
            <li><strong>Expert immigration advice</strong> from AI trained on 30+ years of experience</li>
            <li><strong>Document analysis</strong> (premium feature)</li>
            <li><strong>Unlimited access</strong> with premium subscription ($14/month)</li>
          </ul>
        </div>
        
        <p><strong>Ready to start?</strong> <a href="https://myimmigrationai.com/chat" style="color: #2563eb;">Begin your first consultation</a></p>
        
        <p>Common questions I help with:</p>
        <ul>
          <li>Green card applications and renewals</li>
          <li>Visa applications (H1B, F1, J1, etc.)</li>
          <li>Citizenship and naturalization</li>
          <li>Family-based immigration</li>
          <li>Deportation defense strategies</li>
        </ul>
        
        <p>Best regards,<br>
        <strong>Sarah Chen</strong><br>
        Senior Immigration Attorney<br>
        ImmigrantAI</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">Questions? Reply to this email or visit our <a href="https://myimmigrationai.com">help center</a>.</p>
      </div>
    `
  }),

  subscriptionConfirmed: (userName: string) => ({
    subject: '🎉 Welcome to ImmigrantAI Premium - Unlimited Access Activated',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Premium Subscription Activated!</h2>
        <p>Congratulations ${userName}! Your ImmigrantAI Premium subscription is now active.</p>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3 style="margin-top: 0; color: #059669;">🔓 Premium Features Now Available:</h3>
          <ul>
            <li><strong>Unlimited messages</strong> with Sarah Chen</li>
            <li><strong>Document upload & analysis</strong> - catch errors before submission</li>
            <li><strong>Priority support</strong> for urgent immigration matters</li>
            <li><strong>Detailed case strategies</strong> tailored to your situation</li>
          </ul>
        </div>
        
        <p><strong>Start using premium features:</strong> <a href="https://myimmigrationai.com/chat" style="color: #059669;">Go to your dashboard</a></p>
        
        <p>Your subscription: <strong>$14/month</strong> - billed monthly<br>
        Next billing date: One month from today</p>
        
        <p>Thank you for trusting ImmigrantAI with your immigration journey!</p>
        
        <p>Best regards,<br>
        <strong>Sarah Chen</strong><br>
        Senior Immigration Attorney<br>
        ImmigrantAI</p>
      </div>
    `
  }),

  paymentReceipt: (userName: string, amount: string, invoiceUrl?: string) => ({
    subject: 'Payment Receipt - ImmigrantAI Premium Subscription',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Payment Receipt</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for your payment. Here are the details:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Service:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">ImmigrantAI Premium</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">$${amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Date:</strong></td>
              <td style="padding: 8px 0;">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        
        ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color: #2563eb;">Download detailed invoice</a></p>` : ''}
        
        <p>Your premium features remain active. Continue getting expert immigration advice at <a href="https://myimmigrationai.com/chat">myimmigrationai.com</a></p>
        
        <p>Thank you for choosing ImmigrantAI!</p>
        
        <p>Best regards,<br>
        <strong>The ImmigrantAI Team</strong></p>
      </div>
    `
  })
};