# Email Configuration Guide

## Overview

The Office Management System uses **two separate email configurations**:

1. **Platform Emails** - For platform admin communications (from `itsupport@omsystem.com`)
2. **Tenant Emails** - For tenant-specific communications (from tenant-configured email accounts)

## Email Configuration Options

### Option 1: Gmail SMTP (Recommended for Testing)

#### For Platform Emails (itsupport@omsystem.com)

1. **Create/Use Gmail Account**
   - Email: `itsupport@omsystem.com`
   - Or use your existing Gmail account for testing

2. **Enable 2-Factor Authentication**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification

3. **Generate App-Specific Password**
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Name it "OMS Platform Email"
   - Copy the 16-character password

4. **Update Environment Variables**

```bash
# Platform Email Configuration
PLATFORM_SMTP_HOST=smtp.gmail.com
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_SECURE=true
PLATFORM_SMTP_USER=itsupport@omsystem.com
PLATFORM_SMTP_PASS=your-16-char-app-password
PLATFORM_FROM_EMAIL=itsupport@omsystem.com
PLATFORM_FROM_NAME=OMS Platform Support
```

#### For Tenant Emails (Default Configuration)

Follow the same process for your tenant default email:

```bash
# Tenant Email Configuration
TENANT_SMTP_HOST=smtp.gmail.com
TENANT_SMTP_PORT=587
TENANT_SMTP_SECURE=true
TENANT_SMTP_USER=noreply@omsystem.com
TENANT_SMTP_PASS=your-16-char-app-password
TENANT_FROM_EMAIL=noreply@omsystem.com
TENANT_FROM_NAME=Office Management System
```

---

### Option 2: AWS SES (Recommended for Production)

#### Setup Steps

1. **Verify Email Addresses/Domains**
   - Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
   - Navigate to "Verified identities"
   - Click "Create identity"
   - Choose "Email address" or "Domain"
   - For Platform: Verify `itsupport@omsystem.com`
   - For Tenant: Verify your domain `omsystem.com`

2. **Move Out of Sandbox** (For Production)
   - By default, SES is in sandbox mode (can only send to verified emails)
   - Request production access: SES Console → Account dashboard → Request production access
   - Explain your use case

3. **Create SMTP Credentials**
   - Go to SES Console → SMTP settings
   - Click "Create SMTP credentials"
   - Download and save the credentials

4. **Update Environment Variables**

```bash
# Platform Email via AWS SES
PLATFORM_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_SECURE=true
PLATFORM_SMTP_USER=your-ses-smtp-username
PLATFORM_SMTP_PASS=your-ses-smtp-password
PLATFORM_FROM_EMAIL=itsupport@omsystem.com
PLATFORM_FROM_NAME=OMS Platform Support

# Tenant Email via AWS SES
TENANT_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
TENANT_SMTP_PORT=587
TENANT_SMTP_SECURE=true
TENANT_SMTP_USER=your-ses-smtp-username
TENANT_SMTP_PASS=your-ses-smtp-password
TENANT_FROM_EMAIL=noreply@omsystem.com
TENANT_FROM_NAME=Office Management System

# Email Provider
EMAIL_PROVIDER=smtp

# AWS Configuration
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@omsystem.com
AWS_SES_FROM_NAME=Office Management System
```

---

### Option 3: Other SMTP Providers

#### Microsoft 365 / Outlook

```bash
PLATFORM_SMTP_HOST=smtp.office365.com
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_SECURE=true
PLATFORM_SMTP_USER=itsupport@omsystem.com
PLATFORM_SMTP_PASS=your-password
```

#### SendGrid

```bash
PLATFORM_SMTP_HOST=smtp.sendgrid.net
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_SECURE=true
PLATFORM_SMTP_USER=apikey
PLATFORM_SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun

```bash
PLATFORM_SMTP_HOST=smtp.mailgun.org
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_SECURE=true
PLATFORM_SMTP_USER=your-mailgun-smtp-username
PLATFORM_SMTP_PASS=your-mailgun-smtp-password
```

---

## Email Flow Architecture

### Platform Admin Emails

```
Platform Admin Action (auth-service)
    ↓
Notification Service API (/api/notifications/platform/email)
    ↓
Email Service (uses PLATFORM email config)
    ↓
SMTP Server (itsupport@omsystem.com)
    ↓
Recipient
```

**Use Cases:**
- User management notifications
- Password reset emails to platform admins
- System announcements from platform
- Admin role changes
- Account suspension notifications

### Tenant Module Emails

```
Tenant Action (any tenant service)
    ↓
Notification Service API (/api/notifications/email)
    ↓
Email Service (uses TENANT email config)
    ↓
SMTP Server (tenant-specific or default)
    ↓
Recipient (employees/clients)
```

**Use Cases:**
- Employee onboarding
- Task assignments
- Leave approvals
- Client communications
- Project notifications

---

## Testing Email Configuration

### 1. Test SMTP Connection

```bash
# Using Node.js (create test-email.js)
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'itsupport@omsystem.com',
    pass: 'your-app-password',
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});
```

### 2. Send Test Email via API

```bash
# Test Platform Email
curl -X POST http://localhost:3006/api/notifications/platform/email \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "test@example.com",
    "subject": "Test Platform Email",
    "message": "This is a test email from the platform."
  }'
```

### 3. Check Logs

Monitor the notification service logs:

```bash
docker logs -f notification-service
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failed

**Error:** `Invalid login: 535-5.7.8 Username and Password not accepted`

**Solutions:**
- Double-check username and password
- For Gmail: Use App-Specific Password, not your regular password
- Enable "Less secure app access" (not recommended) OR use App Passwords

#### 2. Connection Timeout

**Error:** `Connection timeout`

**Solutions:**
- Check firewall rules (allow outbound on port 587/465)
- Verify SMTP_HOST is correct
- Try port 465 with `SMTP_SECURE=true` or port 587 with `SMTP_SECURE=false`

#### 3. TLS/SSL Issues

**Error:** `unable to verify the first certificate`

**Solutions:**
- Set `SMTP_SECURE=false` for port 587 (uses STARTTLS)
- Set `SMTP_SECURE=true` for port 465 (uses SSL/TLS)

#### 4. Rate Limiting

**Error:** Too many emails sent

**Solutions:**
- Gmail: 500 emails/day (free), 2000/day (Google Workspace)
- Implement delay between emails
- Use a dedicated email service provider for high volume

---

## Environment Variables Reference

### Required Variables

```bash
# Notification Service URL
NOTIFICATION_SERVICE_URL=http://notification-service:3006

# Email Provider
EMAIL_PROVIDER=smtp

# Platform Email (for platform admin communications)
PLATFORM_SMTP_HOST=smtp.gmail.com
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_SECURE=true
PLATFORM_SMTP_USER=itsupport@omsystem.com
PLATFORM_SMTP_PASS=your-app-password
PLATFORM_FROM_EMAIL=itsupport@omsystem.com
PLATFORM_FROM_NAME=OMS Platform Support

# Tenant Email (for tenant module communications)
TENANT_SMTP_HOST=smtp.gmail.com
TENANT_SMTP_PORT=587
TENANT_SMTP_SECURE=true
TENANT_SMTP_USER=noreply@omsystem.com
TENANT_SMTP_PASS=your-app-password
TENANT_FROM_EMAIL=noreply@omsystem.com
TENANT_FROM_NAME=Office Management System
```

### Optional Variables

```bash
# AWS SES (if using SES instead of SMTP)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_FROM_EMAIL=noreply@omsystem.com
AWS_SES_FROM_NAME=Office Management System
```

---

## Docker Deployment

When rebuilding services with new email configuration:

```bash
# Rebuild and restart services
docker compose -f docker-compose.yml up -d --build auth-service notification-service

# Or rebuild all services
docker compose -f docker-compose.yml up -d --build

# Check logs
docker compose logs -f notification-service
docker compose logs -f auth-service
```

---

## Security Best Practices

1. **Never commit credentials** - Use `.env` files (already in `.gitignore`)
2. **Use App-Specific Passwords** - Don't use your main email password
3. **Rotate credentials regularly** - Change passwords every 90 days
4. **Use environment-specific configs** - Different credentials for dev/staging/production
5. **Enable MFA** - For all email accounts used
6. **Monitor email activity** - Set up alerts for unusual sending patterns
7. **Use dedicated email services** - For production, use AWS SES, SendGrid, etc.

---

## Next Steps

1. ✅ Configure your email accounts (Gmail/AWS SES)
2. ✅ Update environment variables in `.env` file
3. ✅ Rebuild services: `docker compose up -d --build auth-service notification-service`
4. ✅ Test email functionality using the platform admin panel
5. ✅ Monitor logs for any errors
6. ✅ Set up DNS records (SPF, DKIM, DMARC) for production

---

## Support

For issues:
- Check notification-service logs: `docker logs notification-service`
- Check auth-service logs: `docker logs auth-service`
- Verify SMTP connection using test script above
- Review audit logs in the database for email send attempts
