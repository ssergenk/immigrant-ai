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
    subject: 'Welcome to ImmigrantAI - Your AI-Powered Immigration Assistant',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Logo -->
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);">
          <img src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" alt="ImmigrantAI" style="height: 100px; margin-bottom: 15px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Welcome to ImmigrantAI!</h1>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin-top: 0; font-size: 24px;">Hello ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">Welcome to ImmigrantAI, your AI-powered immigration guidance platform. Our advanced system is designed to help you navigate US immigration processes with confidence.</p>
          
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #1a1a2e;">
            <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">🚀 Your Platform Features:</h3>
            <ul style="color: #374151; line-height: 1.8; font-size: 15px;">
              <li><strong>AI-Powered Guidance:</strong> Instant answers to your immigration questions</li>
              <li><strong>Comprehensive Resources:</strong> Access to immigration forms, procedures, and requirements</li>
              <li><strong>Document Analysis:</strong> Upload and review your immigration documents</li>
              <li><strong>24/7 Availability:</strong> Get help whenever you need it</li>
              <li><strong>Multi-Language Support:</strong> Available in multiple languages</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://myimmigrationai.com/chat" style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">Start Your Immigration Journey</a>
          </div>
          
          <h3 style="color: #1a1a2e; margin-top: 35px; font-size: 18px;">Common Immigration Topics We Cover:</h3>
          <ul style="color: #374151; line-height: 1.8; font-size: 15px;">
            <li>Green card applications and renewals</li>
            <li>Visa applications (H1B, F1, J1, O1, and more)</li>
            <li>Citizenship and naturalization processes</li>
            <li>Family-based immigration</li>
            <li>Employment-based immigration</li>
            <li>Immigration form guidance and requirements</li>
          </ul>
          
          <div style="background: #fef3cd; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>⚠️ Important Disclaimer:</strong> ImmigrantAI provides AI-powered information and guidance for educational purposes. This is not legal advice. For complex cases or legal representation, please consult with a qualified immigration attorney.</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #e5e7eb;">
            <p style="margin-bottom: 5px; color: #374151;">Best regards,</p>
            <p style="margin: 0;"><strong style="color: #1a1a2e; font-size: 16px;">The ImmigrantAI Team</strong></p>
            <p style="margin: 0; color: #6b7280;">AI-Powered Immigration Guidance Platform</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 25px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions? Reply to this email or visit our <a href="https://myimmigrationai.com" style="color: #1a1a2e;">support center</a>.</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">© 2025 ImmigrantAI. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  subscriptionConfirmed: (userName: string) => ({
    subject: '🎉 ImmigrantAI Premium Activated - Enhanced Features Now Available',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Logo -->
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%);">
          <img src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" alt="ImmigrantAI" style="height: 100px; margin-bottom: 15px;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">Premium Activated!</h1>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #065f46; margin-top: 0; font-size: 24px;">Congratulations ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">Your ImmigrantAI Premium subscription is now active. You now have access to our most advanced immigration guidance features.</p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #059669;">
            <h3 style="margin-top: 0; color: #065f46; font-size: 20px;">🔓 Premium Features Unlocked:</h3>
            <ul style="color: #374151; line-height: 1.8; font-size: 15px;">
              <li><strong>Unlimited AI Conversations:</strong> No limits on your immigration questions</li>
              <li><strong>Advanced Document Analysis:</strong> Upload and get detailed document reviews</li>
              <li><strong>Priority Processing:</strong> Faster response times for your queries</li>
              <li><strong>Comprehensive Case Guidance:</strong> Step-by-step assistance for complex cases</li>
              <li><strong>Premium Support:</strong> Enhanced customer support when you need it</li>
              <li><strong>Form Completion Assistance:</strong> Detailed help with immigration forms</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://myimmigrationai.com/chat" style="display: inline-block; background: linear-gradient(135deg, #065f46 0%, #059669 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">Access Premium Features</a>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e2e8f0;">
            <h4 style="margin-top: 0; color: #1f2937; font-size: 16px;">📋 Subscription Details:</h4>
            <p style="margin: 8px 0; color: #374151;"><strong>Plan:</strong> ImmigrantAI Premium</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Monthly Fee:</strong> $14.00</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Billing Cycle:</strong> Monthly</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Next Billing Date:</strong> One month from today</p>
          </div>
          
          <div style="background: #fef3cd; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>⚠️ Important Reminder:</strong> ImmigrantAI provides AI-powered guidance for educational purposes. This service does not constitute legal advice or representation.</p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">Thank you for choosing ImmigrantAI Premium. We're committed to providing you with the most advanced AI-powered immigration guidance available.</p>
          
          <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #e5e7eb;">
            <p style="margin-bottom: 5px; color: #374151;">Best regards,</p>
            <p style="margin: 0;"><strong style="color: #1f2937; font-size: 16px;">The ImmigrantAI Team</strong></p>
            <p style="margin: 0; color: #6b7280;">AI-Powered Immigration Guidance Platform</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 25px 20px; text-text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions? Reply to this email or visit our <a href="https://myimmigrationai.com" style="color: #065f46;">support center</a>.</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">© 2025 ImmigrantAI. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  paymentReceipt: (userName: string, amount: string, invoiceUrl?: string) => ({
    subject: 'Payment Receipt - ImmigrantAI Premium Subscription',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Logo -->
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135df, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);">
          <img src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" alt="ImmigrantAI" style="height: 100px; margin-bottom: 15px;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">Payment Confirmation</h1>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin-top: 0; font-size: 24px;">Thank you, ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">Your payment has been successfully processed. Below are your transaction details for your records.</p>
          
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #cbd5e1;">
            <h3 style="margin-top: 0; color: #1a1a2e; font-size: 18px;">📄 Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937; font-weight: bold;">Service:</td>
                <td style="padding: 15px 0; border-bottom: 1px solid #e2e8f0; color: #374151;">ImmigrantAI Premium Subscription</td>
              </tr>
              <tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937; font-weight: bold;">Amount:</td>
                <td style="padding: 15px 0; border-bottom: 1px solid #e2e8f0; color: #059669; font-size: 20px; font-weight: bold;">$${amount}</td>
              </tr>
              <tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937; font-weight: bold;">Transaction Date:</td>
                <td style="padding: 15px 0; border-bottom: 1px solid #e2e8f0; color: #374151;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="padding: 15px 0; color: #1f2937; font-weight: bold;">Status:</td>
                <td style="padding: 15px 0; color: #059669; font-weight: bold;">✅ Successfully Processed</td>
              </tr>
            </table>
          </div>
          
          ${invoiceUrl ? `<div style="text-align: center; margin: 30px 0;">
            <a href="${invoiceUrl}" style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">📄 Download Invoice</a>
          </div>` : ''}
          
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #1a1a2e;">
            <p style="margin: 0; color: #1e3a8a; font-weight: bold;">💡 Your Premium Features Are Active</p>
            <p style="margin: 10px 0 0 0; color: #374151;">Continue accessing unlimited AI-powered immigration guidance at <a href="https://myimmigrationai.com/chat" style="color: #1a1a2e; font-weight: bold;">myimmigrationai.com</a></p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">Thank you for choosing ImmigrantAI for your immigration guidance needs. We appreciate your business and are here to support your immigration journey.</p>
          
          <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #e5e7eb;">
            <p style="margin-bottom: 5px; color: #374151;">Best regards,</p>
            <p style="margin: 0;"><strong style="color: #1f2937; font-size: 16px;">The ImmigrantAI Team</strong></p>
            <p style="margin: 0; color: #6b7280;">Customer Success Department</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 25px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions about your payment? Reply to this email or visit our <a href="https://myimmigrationai.com" style="color: #1a1a2e;">support center</a>.</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">© 2025 ImmigrantAI. All rights reserved.</p>
        </div>
      </div>
    `
  })
};