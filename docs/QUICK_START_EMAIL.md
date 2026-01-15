# Quick Start: Email Configuration

## Gmail Setup (5 Minutes)

### Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the prompts to enable it

### Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Name: "OMS Platform Email"
4. Click "Generate"
5. **Copy the 16-character password** (you won't see it again!)

### Step 3: Update Your .env File

For **Platform Emails** (itsupport@omsystem.com):

\`\`\`bash
PLATFORM_SMTP_HOST=smtp.gmail.com
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_SECURE=true
PLATFORM_SMTP_USER=itsupport@omsystem.com
PLATFORM_SMTP_PASS=xxxx xxxx xxxx xxxx  # Paste your 16-char password
PLATFORM_FROM_EMAIL=itsupport@omsystem.com
PLATFORM_FROM_NAME=OMS Platform Support
\`\`\`

For **Tenant Emails** (noreply@omsystem.com):

\`\`\`bash
TENANT_SMTP_HOST=smtp.gmail.com
TENANT_SMTP_PORT=587
TENANT_SMTP_SECURE=true
TENANT_SMTP_USER=noreply@omsystem.com
TENANT_SMTP_PASS=xxxx xxxx xxxx xxxx  # Paste your 16-char password
TENANT_FROM_EMAIL=noreply@omsystem.com
TENANT_FROM_NAME=Office Management System
\`\`\`

Also add:

\`\`\`bash
EMAIL_PROVIDER=smtp
NOTIFICATION_SERVICE_URL=http://notification-service:3006
\`\`\`

### Step 4: Rebuild Services

\`\`\`bash
docker compose -f docker-compose.yml up -d --build auth-service notification-service
\`\`\`

### Step 5: Test It!

1. Open your platform admin panel
2. Go to Users
3. Click on any user
4. Click "Send Email"
5. Enter a subject and message
6. Click "Send"
7. Check your inbox!

---

## Troubleshooting

### "Authentication failed"

- Make sure you're using the **App Password**, not your regular Gmail password
- Remove any spaces from the password in .env

### "Connection timeout"

- Check your firewall allows outbound connections on port 587
- Try changing `PLATFORM_SMTP_SECURE=false`

### Still not working?

Check the logs:

\`\`\`bash
docker logs notification-service
docker logs auth-service
\`\`\`

---

## What Emails Go Through Which Account?

### Platform Account (itsupport@omsystem.com)

✅ Used for:
- Platform admin password resets
- User role change notifications
- Account suspension notices
- Admin-to-admin emails
- System announcements to platform admins

### Tenant Account (tenant-specific or noreply@omsystem.com)

✅ Used for:
- Employee onboarding emails
- Task assignment notifications
- Leave request approvals
- Client communications
- Project updates
- All tenant module emails

---

## Production Recommendations

For production, use **AWS SES** instead of Gmail:
- Higher sending limits (14 emails/second vs 500/day)
- Better deliverability
- Professional email infrastructure
- Lower cost at scale

See [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md) for AWS SES setup.

---

## Need Help?

- Full documentation: [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md)
- Implementation details: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- Check logs: \`docker logs notification-service\`
