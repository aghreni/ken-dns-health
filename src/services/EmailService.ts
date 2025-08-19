import nodemailer from 'nodemailer';

export interface ValidationFailure {
    domain: string;
    record_type: string;
    expected_value: string;
    actual_values: any[];
}

export class EmailService {
    private transporter: nodemailer.Transporter;
    private recipients: string[];

    constructor() {
        // Get recipients from environment variable or use defaults
        const envRecipients = process.env.EMAIL_RECIPIENTS;
        if (envRecipients) {
            this.recipients = envRecipients.split(',').map(email => email.trim());
        } else {
            // Fallback to default recipients
            this.recipients = [
                'hardik.vyas@kenscio.com',
                'subhash@kenscio.com ',
                'ravi.kumar@kenscio.com',
                'devops.support@kenscio.com'
            ];
        }
        // Configure the email transporter
        // Allow running without email configuration in development
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('Warning: SMTP_USER and/or SMTP_PASS not set. Email notifications will be logged but not sent.');
            this.transporter = {
                sendMail: async (mailOptions: any) => {
                    console.log('Email notification would have been sent:', {
                        to: mailOptions.to,
                        subject: mailOptions.subject,
                        // Omit body for brevity in logs
                    });
                    return { messageId: 'mock-' + Date.now() };
                },
                verify: async () => true,
            } as any;
            return;
        }

        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            requireTLS: true,
            tls: {
                // For Gmail, we want to verify certificates
                rejectUnauthorized: true,
                minVersion: 'TLSv1.2'
            }
        });

        // Alternative configuration for SMTP (uncomment and modify as needed)
        /*
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.example.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        */
    }

    async sendValidationFailureAlert(failures: ValidationFailure[]): Promise<void> {
        if (failures.length === 0) {
            console.log('No DNS validation failures to report');
            return;
        }

        const subject = `DNS Validation Failures - ${failures.length} domain(s) failed`;
        const htmlBody = this.generateEmailBody(failures);

        const mailOptions = {
            from: `"DNS Monitor" <${process.env.SMTP_USER || 'dns-monitor@kenscio.com'}>`,
            to: this.recipients.filter(r => r.trim().length > 0).join(','),
            subject: subject,
            html: htmlBody
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('DNS validation failure alert sent:', info.messageId);
        } catch (error) {
            console.error('Failed to send DNS validation alert:', error);
            throw error;
        }
    }

    private generateEmailBody(failures: ValidationFailure[]): string {
        const failureRows = failures.map(failure => `
            <tr>
                <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">${failure.domain}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${failure.record_type}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-family: monospace;">${failure.expected_value}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-family: monospace;">
                    ${failure.actual_values.length > 0
                ? failure.actual_values.map(val =>
                    typeof val === 'object' ? JSON.stringify(val) : String(val)
                ).join('<br>')
                : '<em>No records found</em>'
            }
                </td>
            </tr>
        `).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>DNS Validation Failures</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin-bottom: 20px;">
                <h1 style="color: #dc3545; margin: 0 0 10px 0;">🚨 DNS Validation Alert</h1>
                <p style="margin: 0; font-size: 16px;">
                    DNS validation has detected <strong>${failures.length}</strong> failed record(s) that do not match the expected values.
                </p>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 5px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #dc3545; color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #c82333;">Domain</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #c82333;">Record Type</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #c82333;">Expected Value</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #c82333;">Actual Value(s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${failureRows}
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 5px; font-size: 14px;">
                <p style="margin: 0 0 10px 0;"><strong>What this means:</strong></p>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>The actual DNS records retrieved from the domain do not match the expected values configured in the system</li>
                    <li>This could indicate DNS configuration issues, record changes, or propagation delays</li>
                    <li>Please review and update the DNS settings for the affected domains</li>
                </ul>
            </div>

            <div style="margin-top: 20px; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6; padding-top: 15px;">
                <p style="margin: 0;">
                    This alert was generated automatically by the DNS Health Checker system at ${new Date().toLocaleString()}.
                    <br>
                    If you believe this is an error, please contact the system administrator.
                </p>
            </div>
        </body>
        </html>
        `;
    }

    // Test method to verify email configuration
    async testEmailConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            console.log('Email service is ready to send emails');
            return true;
        } catch (error) {
            console.error('Email service configuration error:', error);
            return false;
        }
    }
}
