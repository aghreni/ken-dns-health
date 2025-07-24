# DNS Validation Email Alert System

## Overview

The DNS Health Checker now includes an automated email alert system that sends notifications whenever the `/validate-all-dns` endpoint detects DNS validation failures. This system helps administrators stay informed about DNS configuration issues in real-time.

## Features

- **Automatic Alert Triggering**: Emails are sent automatically when DNS validation failures are detected
- **Detailed Failure Information**: Each email contains specific details about what records failed validation
- **Professional HTML Formatting**: Clean, easy-to-read email format with proper styling
- **Multiple Recipients**: Configured to send alerts to multiple email addresses
- **Error Handling**: Email failures don't interrupt the main validation process

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Email Configuration
EMAIL_USER=your-email@gmail.com           # Sender email address
EMAIL_PASS=your-app-password              # App-specific password (for Gmail)
SMTP_HOST=smtp.gmail.com                  # SMTP server (optional)
SMTP_PORT=587                             # SMTP port (optional)
```

### Gmail Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `EMAIL_PASS`

### Other Email Providers

You can modify the email service configuration in `src/services/EmailService.ts` to use other SMTP providers:

```typescript
// Example for other SMTP providers
this.transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

## Recipients

The system is currently configured to send alerts to:

- hardik.vyas@kenscio.com
- harsha.hs@kenscio.com

To modify recipients, edit the `recipients` array in `src/services/EmailService.ts`.

## Email Content

### Subject Line

`DNS Validation Failures - X domain(s) failed`

### Email Body Includes

- **Alert Header**: Clear indication of DNS validation failures
- **Failure Table**: Detailed breakdown of each failure including:
  - Domain name
  - DNS record type (A, MX, TXT, etc.)
  - Expected value
  - Actual value(s) retrieved
- **Explanation Section**: What the failures mean and suggested actions
- **Timestamp**: When the alert was generated

### Sample Email Content

```
🚨 DNS Validation Alert
DNS validation has detected 2 failed record(s) that do not match the expected values.

Domain          | Record Type | Expected Value              | Actual Value(s)
example.com     | A          | 192.168.1.1                | 10.0.0.1
test.com        | MX         | mail.test.com              | No records found
```

## How It Works

1. **Validation Trigger**: When `/validate-all-dns` endpoint is called
2. **Failure Detection**: System compares expected vs actual DNS records
3. **Failure Collection**: All mismatched records are collected
4. **Email Generation**: Professional HTML email is generated with failure details
5. **Alert Dispatch**: Email is sent to configured recipients
6. **Error Handling**: If email fails, error is logged but validation continues

## API Integration

The email alert system is automatically integrated with the existing `/validate-all-dns` endpoint. No additional API calls are required.

```bash
# Trigger DNS validation with automatic email alerts
curl -H "Authorization: Bearer your-token" http://localhost:3000/validate-all-dns
```

## Testing

### Test Email Configuration

You can test the email service configuration:

```typescript
const emailService = new EmailService();
const isReady = await emailService.testEmailConnection();
console.log("Email service ready:", isReady);
```

### Test Alert Email

To manually test the alert system, you can trigger it from the application:

```typescript
const emailService = new EmailService();
const testFailures = [
  {
    domain: "test.example.com",
    record_type: "A",
    expected_value: "192.168.1.1",
    actual_values: ["10.0.0.1"],
  },
];

await emailService.sendValidationFailureAlert(testFailures);
```

## Security Considerations

- **App Passwords**: Use app-specific passwords rather than your main email password
- **Environment Variables**: Never commit email credentials to version control
- **Rate Limiting**: The system only sends emails when failures are detected
- **Secure Transport**: All email communications use TLS encryption

## Troubleshooting

### Common Issues

1. **Authentication Failed**

   - Verify app password is correct
   - Ensure 2FA is enabled for Gmail
   - Check EMAIL_USER format

2. **Connection Timeout**

   - Verify SMTP_HOST and SMTP_PORT
   - Check firewall settings
   - Test network connectivity

3. **No Emails Received**
   - Check spam folder
   - Verify recipient email addresses
   - Test with `testEmailConnection()` method

### Debug Logging

The service includes detailed console logging:

- Email sending attempts
- Configuration errors
- Delivery confirmations

## Performance Impact

- **Minimal Overhead**: Email sending is asynchronous and doesn't block validation
- **Error Isolation**: Email failures don't affect DNS validation results
- **Selective Sending**: Emails are only sent when failures are detected

## Future Enhancements

Potential improvements to consider:

- Email templates for different failure types
- Rate limiting to prevent email spam
- Email digest functionality for multiple checks
- Integration with other notification systems (Slack, Teams, etc.)
- Customizable recipient lists per domain
