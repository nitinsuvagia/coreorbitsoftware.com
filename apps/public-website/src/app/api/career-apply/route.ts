import { NextRequest, NextResponse } from 'next/server';

const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, linkedIn, message, jobTitle, jobSlug } = body;

    if (!firstName || !lastName || !email || !jobTitle) {
      return NextResponse.json(
        { error: 'First name, last name, email, and job title are required' },
        { status: 400 }
      );
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4910bc;">New Job Application - ${escapeHtml(jobTitle)}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee; width: 140px;">Position</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(jobTitle)}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Name</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Email</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          ${phone ? `<tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">Phone</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(phone)}</td></tr>` : ''}
          ${linkedIn ? `<tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee;">LinkedIn</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;"><a href="${escapeHtml(linkedIn)}">${escapeHtml(linkedIn)}</a></td></tr>` : ''}
        </table>
        ${message ? `
        <div style="margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #333;">Cover Letter / Message</h3>
          <p style="margin: 0; color: #555; white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
        ` : ''}
        <p style="margin-top: 20px; padding: 12px; background: #fff3cd; border-radius: 8px; color: #856404; font-size: 14px;">
          <strong>Note:</strong> The candidate uploaded a resume/CV. Please check your application tracking system or request the file via email at <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>.
        </p>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">This application was submitted from the CoreOrbit website careers page.</p>
      </div>
    `;

    const textBody = `New Job Application\n\nPosition: ${jobTitle}\nName: ${firstName} ${lastName}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}${linkedIn ? `\nLinkedIn: ${linkedIn}` : ''}${message ? `\n\nCover Letter:\n${message}` : ''}`;

    const res = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/platform/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'career@coreorbitsoftware.com',
        subject: `[Job Application] ${jobTitle} - ${firstName} ${lastName}`,
        message: textBody,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('Notification service error:', errData);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Career apply error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
