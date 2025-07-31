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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Logo -->
        <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">
          <img src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" alt="ImmigrantAI" style="height: 60px; margin-bottom: 10px;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Welcome to ImmigrantAI!</h1>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          <h2 style="color: #2563eb; margin-top: 0;">Hello ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">I'm Sarah Chen, your virtual immigration attorney with 30 years of experience helping immigrants navigate the US immigration system.</p>
          
          <div style="background: #f3f4f6; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #1f2937;">🎉 You're all set! Here's what you get:</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li><strong>Instant expert guidance</strong> whenever you need it</li>
              <li><strong>Professional immigration advice</strong> from AI trained on 30+ years of experience</li>
              <li><strong>Document analysis and review</strong> to catch costly errors</li>
              <li><strong>24/7 availability</strong> for your immigration questions</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://myimmigrationai.com/chat" style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Start Your First Consultation</a>
          </div>
          
          <h3 style="color: #1f2937; margin-top: 30px;">Common questions I help with:</h3>
          <ul style="color: #374151; line-height: 1.8;">
            <li>Green card applications and renewals</li>
            <li>Visa applications (H1B, F1, J1, etc.)</li>
            <li>Citizenship and naturalization</li>
            <li>Family-based immigration</li>
            <li>Deportation defense strategies</li>
          </ul>
          
          <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #e5e7eb;">
            <p style="margin-bottom: 5px; color: #374151;">Best regards,</p>
            <p style="margin: 0;"><strong style="color: #1f2937; font-size: 16px;">Sarah Chen</strong></p>
            <p style="margin: 0; color: #6b7280;">Senior Immigration Attorney</p>
            <p style="margin: 0; color: #2563eb; font-weight: 600;">ImmigrantAI</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions? Reply to this email or visit our <a href="https://myimmigrationai.com" style="color: #2563eb;">help center</a>.</p>
        </div>
      </div>
    `
  }),

  subscriptionConfirmed: (userName: string) => ({
    subject: '🎉 Welcome to ImmigrantAI Premium - Unlimited Access Activated',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Logo -->
        <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
          <img src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" alt="ImmigrantAI" style="height: 60px; margin-bottom: 10px;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Premium Activated!</h1>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          <h2 style="color: #059669; margin-top: 0;">Congratulations ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">Your ImmigrantAI Premium subscription is now active and ready to supercharge your immigration journey.</p>
          
          <div style="background: #ecfdf5; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #059669;">
            <h3 style="margin-top: 0; color: #059669;">🔓 Premium Features Now Available:</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li><strong>Unlimited conversations</strong> with Sarah Chen</li>
              <li><strong>Document upload & comprehensive analysis</strong> - catch errors before submission</li>
              <li><strong>Priority support</strong> for urgent immigration matters</li>
              <li><strong>Detailed case strategies</strong> tailored to your specific situation</li>
              <li><strong>Advanced immigration form guidance</strong> step-by-step</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://myimmigrationai.com/chat" style="display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Access Premium Features</a>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="margin-top: 0; color: #1f2937;">Subscription Details:</h4>
            <p style="margin: 5px 0; color: #374151;"><strong>Plan:</strong> ImmigrantAI Premium</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Price:</strong> $14/month</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Billing:</strong> Monthly</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Next billing date:</strong> One month from today</p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">Thank you for trusting ImmigrantAI with your immigration journey. I'm here to help you navigate every step with confidence.</p>
          
          <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #e5e7eb;">
            <p style="margin-bottom: 5px; color: #374151;">Best regards,</p>
            <p style="margin: 0;"><strong style="color: #1f2937; font-size: 16px;">Sarah Chen</strong></p>
            <p style="margin: 0; color: #6b7280;">Senior Immigration Attorney</p>
            <p style="margin: 0; color: #059669; font-weight: 600;">ImmigrantAI</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions? Reply to this email or visit our <a href="https://myimmigrationai.com" style="color: #059669;">help center</a>.</p>
        </div>
      </div>
    `
  }),

  paymentReceipt: (userName: string, amount: string, invoiceUrl?: string) => ({
    subject: 'Payment Receipt - ImmigrantAI Premium Subscription',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Logo -->
        <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">
          <img src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" alt="ImmigrantAI" style="height: 60px; margin-bottom: 10px;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Payment Receipt</h1>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          <h2 style="color: #2563eb; margin-top: 0;">Thank you, ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">Your payment has been successfully processed. Here are your receipt details:</p>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937;"><strong>Service:</strong></td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #374151;">ImmigrantAI Premium Subscription</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937;"><strong>Amount:</strong></td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #374151; font-size: 18px; font-weight: bold;">$${amount}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937;"><strong>Date:</strong></td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #374151;">${new Date().toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #1f2937;"><strong>Status:</strong></td>
                <td style="padding: 12px 0; color: #059669; font-weight: bold;">✅ Paid</td>
              </tr>
            </table>
          </div>
          
          ${invoiceUrl ? `<div style="text-align: center; margin: 25px 0;">
            <a href="${invoiceUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">📄 Download Invoice</a>
          </div>` : ''}
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; color: #1e40af;"><strong>💡 Your premium features remain active.</strong></p>
            <p style="margin: 8px 0 0 0; color: #374151;">Continue getting expert immigration advice at <a href="https://myimmigrationai.com/chat" style="color: #2563eb; font-weight: bold;">myimmigrationai.com</a></p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">Thank you for choosing ImmigrantAI for your immigration needs. We're honored to be part of your journey.</p>
          
          <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #e5e7eb;">
            <p style="margin-bottom: 5px; color: #374151;">Best regards,</p>
            <p style="margin: 0;"><strong style="color: #1f2937; font-size: 16px;">The ImmigrantAI Team</strong></p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions about your payment? Reply to this email or visit our <a href="https://myimmigrationai.com" style="color: #2563eb;">support center</a>.</p>
        </div>
      </div>
    `
  })
};