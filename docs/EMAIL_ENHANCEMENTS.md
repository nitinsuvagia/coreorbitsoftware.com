# Email Enhancement System - Complete Guide

## 🎯 Overview

The Email Enhancement System adds professional email templates, bulk sending, queue-based delivery, and retry logic to the OMS platform.

## ✨ New Features

### 1. **Professional HTML Email Templates**

Beautiful, responsive email templates for all platform communications:

- ✅ Welcome emails for new admins
- ✅ Password reset notifications
- ✅ Role change notifications
- ✅ Account suspension/activation alerts
- ✅ Custom messages with branding

**Template Features:**
- Responsive design (mobile-friendly)
- Professional branding with gradient headers
- Clear call-to-action buttons
- Information boxes and warnings
- Automatic text version generation

### 2. **Bulk Email Sending**

Send emails to multiple platform admins simultaneously:

- ✅ Send to up to 100 recipients at once
- ✅ Automatic batching and rate limiting
- ✅ Individual delivery tracking
- ✅ Audit logging for bulk operations

### 3. **Email Queue with Redis**

Reliable email delivery with retry logic:

- ✅ Redis-based job queue
- ✅ Automatic retry with exponential backoff
- ✅ Scheduled email delivery
- ✅ Failed email tracking
- ✅ Queue statistics and monitoring

### 4. **Enhanced Email Service**

Improved email functionality:

- ✅ Template-based sending
- ✅ Priority levels (high/normal/low)
- ✅ Queue or immediate delivery options
- ✅ Better error handling and logging

---

## 📧 Email Templates

### Available Templates

| Template | Use Case | Variables |
|----------|----------|-----------|
| `welcome` | New admin onboarding | firstName, email, username, role, resetPasswordUrl |
| `password-reset` | Password reset requests | firstName, resetUrl, expiryHours |
| `role-changed` | Role updates | firstName, oldRole, newRole, changedBy, changeDate |
| `account-suspended` | Account suspension | firstName, reason, suspendedBy, suspensionDate |
| `account-activated` | Account activation | firstName, activatedBy, activationDate, role |
| `custom-message` | General communications | firstName, subject, messageContent, actionUrl |

### Template Location

```
services/notification-service/templates/
├── platform/
│   ├── base.hbs (base layout)
│   ├── welcome.hbs
│   ├── password-reset.hbs
│   ├── role-changed.hbs
│   ├── account-suspended.hbs
│   ├── account-activated.hbs
│   └── custom-message.hbs
└── tenant/
    └── (tenant-specific templates)
```

### Using Templates

**Via API:**

\`\`\`typescript
// Send templated email
await sendTemplatedEmail(
  { email: 'admin@example.com', name: 'John Doe' },
  'welcome', // template name
  {
    firstName: 'John',
    email: 'admin@example.com',
    username: 'john.doe',
    role: 'SUPER_ADMIN',
    resetPasswordUrl: 'https://platform.omsystem.com/reset/abc123',
  },
  {
    emailType: 'platform',
    priority: 'high',
  }
);
\`\`\`

**Via Notification Service API:**

\`\`\`bash
curl -X POST http://localhost:3006/api/notifications/platform/email \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "admin@example.com",
    "subject": "Welcome to OMS Platform",
    "message": "Your account has been created..."
  }'
\`\`\`

---

## 📨 Bulk Email Sending

### Send to Multiple Admins

**API Endpoint:**

\`\`\`
POST /api/platform-admin/email/bulk
\`\`\`

**Request:**

\`\`\`json
{
  "userIds": [
    "user-id-1",
    "user-id-2",
    "user-id-3"
  ],
  "subject": "Important Platform Update",
  "message": "Hello! We have an important update to share..."
}
\`\`\`

**Response:**

\`\`\`json
{
  "success": true,
  "message": "Email sent to 3 admins",
  "data": {
    "sent": 3,
    "failed": 0,
    "results": [
      { "success": true, "messageId": "msg-123" },
      { "success": true, "messageId": "msg-124" },
      { "success": true, "messageId": "msg-125" }
    ]
  }
}
\`\`\`

### Features

- ✅ Automatic filtering of inactive/deleted users
- ✅ Batch processing (50 emails per batch by default)
- ✅ Rate limiting for SMTP providers
- ✅ Individual delivery tracking
- ✅ Audit log creation

### Usage Example

\`\`\`typescript
// In your frontend
const sendBulkEmail = async (userIds: string[]) => {
  const response = await fetch('/api/platform-admin/email/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userIds,
      subject: 'System Maintenance Notice',
      message: 'Our system will be undergoing maintenance...',
    }),
  });
  
  const result = await response.json();
  console.log(\`Sent to \${result.data.sent} admins\`);
};
\`\`\`

---

## 🔄 Email Queue System

### How It Works

1. **Queue Email** → Email is added to Redis queue
2. **Process Queue** → Background worker picks up emails
3. **Send Email** → Email is sent via SMTP
4. **Success** → Marked as completed (kept for 24 hours)
5. **Failure** → Retry with exponential backoff
6. **Max Retries** → Move to failed queue (kept for 7 days)

### Queue Email

\`\`\`typescript
import { queueEmail } from './services/queue.service';

// Queue for immediate delivery
const jobId = await queueEmail({
  to: { email: 'admin@example.com' },
  subject: 'Test Email',
  templateName: 'welcome',
  data: { firstName: 'John' },
  emailType: 'platform',
});

// Schedule for later
const jobId = await queueEmail(
  emailInput,
  {
    scheduledFor: new Date('2026-01-15T10:00:00Z'),
    maxAttempts: 5,
  }
);
\`\`\`

### Check Job Status

\`\`\`typescript
import { getEmailJobStatus } from './services/queue.service';

const status = await getEmailJobStatus(jobId);

if (status) {
  console.log(\`Success: \${status.success}\`);
  console.log(\`Attempts: \${status.attempts}\`);
  if (status.error) {
    console.log(\`Error: \${status.error}\`);
  }
}
\`\`\`

### Queue Statistics

\`\`\`bash
# Get queue stats
curl http://localhost:3006/api/notifications/queue/stats
\`\`\`

\`\`\`json
{
  "success": true,
  "data": {
    "queued": 5,
    "processing": 2,
    "scheduled": 3,
    "failed": 1
  }
}
\`\`\`

### Retry Configuration

**Default Settings:**

- Max Attempts: 3
- Initial Delay: 1000ms
- Backoff Strategy: Exponential (2x each retry)

**Retry Schedule Example:**

- Attempt 1: Immediate
- Attempt 2: After 1 second
- Attempt 3: After 2 seconds
- Attempt 4: After 4 seconds

**Configuration (.env):**

\`\`\`bash
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY_MS=1000
EMAIL_QUEUE_PROCESS_INTERVAL=5000
\`\`\`

---

## 🔧 API Reference

### Platform Admin Endpoints

#### Send Email to Single Admin

\`\`\`
POST /api/platform-admin/:userId/email
\`\`\`

**Body:**
\`\`\`json
{
  "subject": "Account Update",
  "message": "Your account has been updated"
}
\`\`\`

#### Send Bulk Email

\`\`\`
POST /api/platform-admin/email/bulk
\`\`\`

**Body:**
\`\`\`json
{
  "userIds": ["id1", "id2", "id3"],
  "subject": "Important Notice",
  "message": "Please read this important message"
}
\`\`\`

### Notification Service Endpoints

#### Send Platform Email

\`\`\`
POST /api/notifications/platform/email
\`\`\`

**Body:**
\`\`\`json
{
  "to": "admin@example.com",
  "subject": "Test Email",
  "message": "Email content",
  "html": "<p>HTML content</p>"
}
\`\`\`

#### Send Bulk Platform Email

\`\`\`
POST /api/notifications/platform/email/bulk
\`\`\`

**Body:**
\`\`\`json
{
  "recipients": ["admin1@example.com", "admin2@example.com"],
  "subject": "Bulk Message",
  "message": "Message content"
}
\`\`\`

#### Get Queue Stats

\`\`\`
GET /api/notifications/queue/stats
\`\`\`

---

## 📊 Monitoring & Debugging

### Check Email Logs

\`\`\`bash
# Notification service logs
docker logs -f notification-service

# Filter for email-related logs
docker logs notification-service 2>&1 | grep -i "email"
\`\`\`

### View Audit Logs

\`\`\`sql
-- View bulk email operations
SELECT * FROM platform_audit_logs 
WHERE action = 'BULK_EMAIL' 
ORDER BY timestamp DESC 
LIMIT 20;

-- View failed email attempts
SELECT * FROM platform_audit_logs 
WHERE action LIKE '%EMAIL_FAILED%' 
ORDER BY timestamp DESC;
\`\`\`

### Redis Queue Inspection

\`\`\`bash
# Connect to Redis
redis-cli

# View queue lengths
LLEN email:queue
LLEN email:processing

# View scheduled emails
ZCARD email:scheduled

# View queued emails
LRANGE email:queue 0 -1
\`\`\`

---

## 🚀 Deployment

### Update Environment Variables

Add to your \`.env\` file:

\`\`\`bash
# Email Queue Configuration
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY_MS=1000
EMAIL_QUEUE_PROCESS_INTERVAL=5000

# Template Configuration
TEMPLATE_PATH=/app/services/notification-service/templates

# Existing email config...
PLATFORM_SMTP_HOST=smtp.gmail.com
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_USER=itsupport@omsystem.com
PLATFORM_SMTP_PASS=your-app-password
\`\`\`

### Rebuild Services

\`\`\`bash
# Rebuild notification service
docker compose -f docker-compose.yml up -d --build notification-service

# Rebuild auth service
docker compose -f docker-compose.yml up -d --build auth-service

# Or rebuild all
docker compose -f docker-compose.yml up -d --build
\`\`\`

### Verify Setup

\`\`\`bash
# Check if templates are loaded
docker logs notification-service | grep "templates preloaded"

# Check if queue processor is running
docker logs notification-service | grep "queue processor started"

# Check email connection
docker logs notification-service | grep "SMTP connection"
\`\`\`

---

## 📝 Examples

### Example 1: Send Welcome Email

\`\`\`typescript
import { sendTemplatedEmail } from './services/email.service';

await sendTemplatedEmail(
  { email: 'newadmin@example.com', name: 'Jane Doe' },
  'welcome',
  {
    firstName: 'Jane',
    email: 'newadmin@example.com',
    username: 'jane.doe',
    role: 'ADMIN_USER',
    resetPasswordUrl: 'https://platform.example.com/reset/token123',
  },
  { emailType: 'platform', priority: 'high' }
);
\`\`\`

### Example 2: Bulk Email to All Active Admins

\`\`\`typescript
// In platform admin panel
const sendToAllActive = async () => {
  // Get all active admin IDs
  const response = await fetch('/api/platform-admin?status=ACTIVE');
  const { data } = await response.json();
  const userIds = data.map((admin: any) => admin.id);
  
  // Send bulk email
  await fetch('/api/platform-admin/email/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userIds,
      subject: 'Platform Update Announcement',
      message: 'We are excited to announce new features...',
    }),
  });
};
\`\`\`

### Example 3: Schedule Email for Later

\`\`\`typescript
import { queueEmail } from './services/queue.service';

// Schedule for tomorrow at 9 AM
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(9, 0, 0, 0);

await queueEmail(
  {
    to: { email: 'admin@example.com' },
    templateName: 'custom-message',
    data: {
      firstName: 'Admin',
      subject: 'Scheduled Maintenance Reminder',
      messageContent: 'This is a reminder that maintenance is scheduled for tomorrow.',
    },
    emailType: 'platform',
  },
  { scheduledFor: tomorrow }
);
\`\`\`

---

## 🔍 Troubleshooting

### Templates Not Loading

**Problem:** Templates not found or not rendering

**Solution:**
\`\`\`bash
# Check template path
echo $TEMPLATE_PATH

# Verify template files exist
ls -la services/notification-service/templates/platform/

# Check logs
docker logs notification-service | grep template
\`\`\`

### Queue Not Processing

**Problem:** Emails stuck in queue

**Solution:**
\`\`\`bash
# Check if queue processor is running
docker logs notification-service | grep "queue processor"

# Check Redis connection
docker logs notification-service | grep redis

# Manually process queue
curl -X POST http://localhost:3006/api/notifications/queue/process
\`\`\`

### Bulk Email Failures

**Problem:** Some emails in bulk not sending

**Solution:**
\`\`\`sql
-- Check audit logs for details
SELECT * FROM platform_audit_logs 
WHERE action = 'BULK_EMAIL_FAILED' 
ORDER BY timestamp DESC 
LIMIT 10;
\`\`\`

---

## 📈 Performance Tips

1. **Use Queue for Large Batches**
   - For >50 emails, enable queue: \`useQueue: true\`
   - Prevents timeout and allows retry

2. **Rate Limiting**
   - Gmail: 500/day, SendGrid: 100/day (free), AWS SES: 14/sec
   - Adjust \`EMAIL_BATCH_SIZE\` accordingly

3. **Template Caching**
   - Templates are cached after first load
   - Restart service to reload templates

4. **Monitor Queue Size**
   - Keep queue size < 1000 for optimal performance
   - Use \`GET /queue/stats\` to monitor

---

## 🎯 Best Practices

1. **Always use templates** for professional appearance
2. **Enable queue** for reliability
3. **Monitor audit logs** for failed deliveries
4. **Test emails** before bulk sending
5. **Use priority** for time-sensitive emails
6. **Schedule** maintenance notifications during off-hours

---

## 🔒 Security

- ✅ Audit logging for all email operations
- ✅ Input validation and sanitization
- ✅ Rate limiting to prevent abuse
- ✅ Recipient validation (active users only)
- ✅ SMTP authentication
- ✅ TLS/SSL encryption

---

## 📚 Additional Resources

- [Email Configuration Guide](./EMAIL_CONFIGURATION.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Quick Start](./QUICK_START_EMAIL.md)
- [API Documentation](./API_DOCUMENTATION.md)

---

## Support

For issues or questions:
- Check logs: \`docker logs notification-service\`
- Review audit logs in database
- Test SMTP connection independently
- Consult troubleshooting section above
