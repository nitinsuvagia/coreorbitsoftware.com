import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email configuration - in production, use environment variables
const COREORBIT_EMAIL = process.env.COREORBIT_EMAIL || 'contact@coreorbit.io';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

// Generate email HTML template
const generateDemoEmailHTML = (data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  companySize: string;
  jobTitle: string;
  message: string;
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Demo Request</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚀 New Demo Request</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Someone wants to see CoreOrbit in action!</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">Contact Information</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Name</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600;">${data.firstName} ${data.lastName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Email</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;"><a href="mailto:${data.email}" style="color: #7c3aed;">${data.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Phone</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">${data.phone || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Company</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600;">${data.company}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Company Size</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">${data.companySize} employees</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Job Title</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">${data.jobTitle}</td>
            </tr>
          </table>
          
          ${data.message ? `
          <div style="margin-top: 24px;">
            <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">What they want to see:</h3>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; color: #4b5563; font-size: 14px; line-height: 1.6;">
              ${data.message}
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="mailto:${data.email}?subject=Your CoreOrbit Demo Request" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Reply to ${data.firstName}</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">This email was sent from the CoreOrbit website demo request form.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateContactEmailHTML = (data: {
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
}) => {
  const subjectLabels: Record<string, string> = {
    general: 'General Inquiry',
    sales: 'Sales & Pricing',
    support: 'Technical Support',
    partnership: 'Partnership Opportunities',
    billing: 'Billing Questions',
    feedback: 'Product Feedback',
    other: 'Other',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✉️ New Contact Message</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">${subjectLabels[data.subject] || data.subject}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">Contact Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Name</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Email</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;"><a href="mailto:${data.email}" style="color: #2563eb;">${data.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Phone</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">${data.phone || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Company</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">${data.company || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Topic</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">${subjectLabels[data.subject] || data.subject}</td>
            </tr>
          </table>
          
          <div style="margin-top: 24px;">
            <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">Message:</h3>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; color: #4b5563; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
${data.message}
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="mailto:${data.email}?subject=Re: ${subjectLabels[data.subject] || data.subject}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Reply to ${data.name.split(' ')[0]}</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">This email was sent from the CoreOrbit website contact form.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Auto-reply email for demo requests
const generateDemoAutoReplyHTML = (firstName: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Your Demo Request</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Thank You, ${firstName}!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 16px;">Your demo request has been received</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
            We're excited to show you how CoreOrbit can transform your HR operations! One of our product specialists will be in touch within 24 hours to schedule your personalized demo.
          </p>
          
          <div style="background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #7c3aed; margin: 0 0 16px 0; font-size: 16px;">What to expect in your demo:</h3>
            <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>AI-powered job creation & resume screening</li>
              <li>Complete recruitment pipeline management</li>
              <li>Digital onboarding workflows</li>
              <li>Employee management & 360° dashboards</li>
              <li>Attendance, leave & holiday management</li>
            </ul>
          </div>
          
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0;">
            In the meantime, feel free to explore our website to learn more about CoreOrbit's features.
          </p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="https://coreorbit.io" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">Visit Our Website</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">The CoreOrbit Team</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            <a href="mailto:contact@coreorbit.io" style="color: #7c3aed; text-decoration: none;">contact@coreorbit.io</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Auto-reply email for contact form
const generateContactAutoReplyHTML = (name: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>We've Received Your Message</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Message Received!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 16px;">Thank you for contacting us, ${name.split(' ')[0]}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
            We've received your message and appreciate you reaching out to us. Our team will review your inquiry and get back to you within 24-48 hours.
          </p>
          
          <div style="background: linear-gradient(135deg, #dbeafe 0%, #e9d5ff 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #2563eb; margin: 0 0 12px 0; font-size: 16px;">Need immediate assistance?</h3>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
              If your inquiry is urgent, you can reach our support team directly at <a href="mailto:support@coreorbit.io" style="color: #7c3aed;">support@coreorbit.io</a> or call us at <a href="tel:+18882673672" style="color: #7c3aed;">+1 (888) COREORBIT</a>.
            </p>
          </div>
          
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0;">
            Thank you for your interest in CoreOrbit!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">The CoreOrbit Team</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            <a href="mailto:contact@coreorbit.io" style="color: #2563eb; text-decoration: none;">contact@coreorbit.io</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    // Validate required fields based on form type
    if (type === 'demo') {
      if (!data.firstName || !data.lastName || !data.email || !data.company || !data.companySize || !data.jobTitle) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
    } else if (type === 'contact') {
      if (!data.name || !data.email || !data.subject || !data.message) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid form type' },
        { status: 400 }
      );
    }

    // Check if SMTP is configured
    if (!SMTP_USER || !SMTP_PASS) {
      // Return success even without email (for development)
      return NextResponse.json({ 
        success: true, 
        message: 'Form submitted successfully (email not sent - SMTP not configured)'
      });
    }

    const transporter = createTransporter();

    if (type === 'demo') {
      // Send notification email to CoreOrbit
      await transporter.sendMail({
        from: `"CoreOrbit Website" <${SMTP_USER}>`,
        to: COREORBIT_EMAIL,
        subject: `🚀 New Demo Request from ${data.firstName} ${data.lastName} - ${data.company}`,
        html: generateDemoEmailHTML(data),
      });

      // Send auto-reply to the user
      await transporter.sendMail({
        from: `"CoreOrbit" <${SMTP_USER}>`,
        to: data.email,
        subject: 'Your CoreOrbit Demo Request Confirmation',
        html: generateDemoAutoReplyHTML(data.firstName),
      });
    } else if (type === 'contact') {
      // Send notification email to CoreOrbit
      await transporter.sendMail({
        from: `"CoreOrbit Website" <${SMTP_USER}>`,
        to: COREORBIT_EMAIL,
        subject: `✉️ New Contact: ${data.subject} - ${data.name}`,
        html: generateContactEmailHTML(data),
      });

      // Send auto-reply to the user
      await transporter.sendMail({
        from: `"CoreOrbit" <${SMTP_USER}>`,
        to: data.email,
        subject: "We've Received Your Message - CoreOrbit",
        html: generateContactAutoReplyHTML(data.name),
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Form submitted successfully'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to process form submission' },
      { status: 500 }
    );
  }
}
