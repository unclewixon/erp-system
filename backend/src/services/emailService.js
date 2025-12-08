import EmailSettings from '../models/EmailSettings.js';

class EmailService {
  constructor() {
    this.settings = null;
    this.brevoApiUrl = 'https://api.brevo.com/v3';
  }

  async loadSettings() {
    this.settings = await EmailSettings.getSettings();
    return this.settings;
  }

  async sendEmail({ to, subject, htmlContent, textContent, templateId, params }) {
    await this.loadSettings();

    if (!this.settings.isEnabled) {
      console.log('Email service is disabled');
      return { success: false, message: 'Email service is disabled' };
    }

    if (!this.settings.isConfigured()) {
      console.log('Email service is not configured');
      return { success: false, message: 'Email service is not configured' };
    }

    try {
      const emailData = {
        sender: {
          name: this.settings.brevo.senderName,
          email: this.settings.brevo.senderEmail,
        },
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        subject,
      };

      if (templateId) {
        emailData.templateId = templateId;
        emailData.params = params || {};
      } else {
        emailData.htmlContent = htmlContent;
        if (textContent) {
          emailData.textContent = textContent;
        }
      }

      const response = await fetch(`${this.brevoApiUrl}/smtp/email`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.settings.brevo.apiKey,
        },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email');
      }

      console.log(`Email sent successfully to ${to}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, message: error.message };
    }
  }

  async sendTestEmail(toEmail) {
    await this.loadSettings();

    if (!this.settings.isConfigured()) {
      return { success: false, message: 'Please configure API key and sender email first' };
    }

    try {
      const response = await fetch(`${this.brevoApiUrl}/smtp/email`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.settings.brevo.apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: this.settings.brevo.senderName,
            email: this.settings.brevo.senderEmail,
          },
          to: [{ email: toEmail }],
          subject: 'Test Email - ERP HR Manager',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">ERP HR Manager</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937; margin-top: 0;">Test Email Successful!</h2>
                <p style="color: #4b5563; line-height: 1.6;">
                  Congratulations! Your Brevo email integration is working correctly.
                </p>
                <p style="color: #4b5563; line-height: 1.6;">
                  This test email confirms that:
                </p>
                <ul style="color: #4b5563; line-height: 1.8;">
                  <li>Your API key is valid</li>
                  <li>Your sender email is verified</li>
                  <li>Email delivery is functioning</li>
                </ul>
                <div style="background: #dbeafe; border-radius: 8px; padding: 15px; margin-top: 20px;">
                  <p style="color: #1e40af; margin: 0; font-size: 14px;">
                    <strong>Sent at:</strong> ${new Date().toLocaleString()}
                  </p>
                </div>
              </div>
              <div style="background: #1f2937; padding: 20px; text-align: center;">
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                  ERP HR Manager - Powered by Brevo
                </p>
              </div>
            </div>
          `,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send test email');
      }

      // Update test result in settings
      await EmailSettings.findOneAndUpdate(
        { isGlobal: true },
        {
          lastTestedAt: new Date(),
          lastTestResult: { success: true, message: 'Test email sent successfully' },
        }
      );

      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      // Update test result in settings
      await EmailSettings.findOneAndUpdate(
        { isGlobal: true },
        {
          lastTestedAt: new Date(),
          lastTestResult: { success: false, message: error.message },
        }
      );

      return { success: false, message: error.message };
    }
  }

  // Verify API key by checking account info
  async verifyApiKey(apiKey) {
    try {
      const response = await fetch(`${this.brevoApiUrl}/account`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'api-key': apiKey,
        },
      });

      if (!response.ok) {
        return { success: false, message: 'Invalid API key' };
      }

      const account = await response.json();
      return {
        success: true,
        account: {
          email: account.email,
          companyName: account.companyName,
          plan: account.plan?.[0]?.type || 'Unknown',
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Get email sending statistics
  async getEmailStats(apiKey) {
    try {
      const response = await fetch(`${this.brevoApiUrl}/smtp/statistics/aggregatedReport`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'api-key': apiKey || this.settings?.brevo?.apiKey,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get email stats:', error);
      return null;
    }
  }

  // Template-based emails
  async sendWelcomeEmail(employee, tenant) {
    await this.loadSettings();
    if (!this.settings.templates.welcome.enabled) return;

    return this.sendEmail({
      to: employee.email,
      subject: this.settings.templates.welcome.subject
        .replace('{{companyName}}', tenant.name),
      htmlContent: this.generateWelcomeTemplate(employee, tenant),
    });
  }

  async sendPasswordResetEmail(user, resetToken, tenant) {
    await this.loadSettings();
    if (!this.settings.templates.passwordReset.enabled) return;

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    return this.sendEmail({
      to: user.email,
      subject: this.settings.templates.passwordReset.subject
        .replace('{{companyName}}', tenant?.name || 'ERP HR Manager'),
      htmlContent: this.generatePasswordResetTemplate(user, resetUrl, tenant),
    });
  }

  async sendLeaveStatusEmail(leave, employee, tenant) {
    await this.loadSettings();
    if (!this.settings.templates.leaveApproval.enabled) return;

    return this.sendEmail({
      to: employee.email,
      subject: this.settings.templates.leaveApproval.subject
        .replace('{{status}}', leave.status.charAt(0).toUpperCase() + leave.status.slice(1))
        .replace('{{companyName}}', tenant.name),
      htmlContent: this.generateLeaveStatusTemplate(leave, employee, tenant),
    });
  }

  async sendRosterLinkEmail(link, hod, tenant) {
    await this.loadSettings();
    if (!this.settings.templates.rosterLink.enabled) return;

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    return this.sendEmail({
      to: hod.email,
      subject: this.settings.templates.rosterLink.subject
        .replace('{{month}}', months[link.month - 1])
        .replace('{{year}}', link.year)
        .replace('{{companyName}}', tenant.name),
      htmlContent: this.generateRosterLinkTemplate(link, hod, tenant),
    });
  }

  async sendShiftSwapRequestEmail(request, toEmployee, tenant) {
    await this.loadSettings();
    if (!this.settings.templates.swapRequest.enabled) return;

    return this.sendEmail({
      to: toEmployee.email,
      subject: this.settings.templates.swapRequest.subject
        .replace('{{companyName}}', tenant.name),
      htmlContent: this.generateSwapRequestTemplate(request, toEmployee, tenant),
    });
  }

  // Template generators
  generateWelcomeTemplate(employee, tenant) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">${tenant.name}</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Welcome, ${employee.firstName}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            We're excited to have you join our team. Your account has been created successfully.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            You can now log in to the HR portal to view your schedule, request leave, and more.
          </p>
        </div>
      </div>
    `;
  }

  generatePasswordResetTemplate(user, resetUrl, tenant) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">${tenant?.name || 'ERP HR Manager'}</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Reset Your Password</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            You requested to reset your password. Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `;
  }

  generateLeaveStatusTemplate(leave, employee, tenant) {
    const statusColors = {
      approved: '#10b981',
      rejected: '#ef4444',
      pending: '#f59e0b',
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">${tenant.name}</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Leave Request ${leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${employee.firstName}, your leave request has been <strong style="color: ${statusColors[leave.status]}">${leave.status}</strong>.
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Type:</strong> ${leave.leaveType}</p>
            <p><strong>From:</strong> ${new Date(leave.startDate).toLocaleDateString()}</p>
            <p><strong>To:</strong> ${new Date(leave.endDate).toLocaleDateString()}</p>
            ${leave.adminComments ? `<p><strong>Comments:</strong> ${leave.adminComments}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  generateRosterLinkTemplate(link, hod, tenant) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const rosterUrl = `${process.env.FRONTEND_URL}/roster/${link.token}`;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">${tenant.name}</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Duty Roster Request</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${hod.firstName}, you have been requested to fill in the duty roster for your department.
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Period:</strong> ${months[link.month - 1]} ${link.year}</p>
            <p><strong>Expires:</strong> ${new Date(link.expiresAt).toLocaleDateString()}</p>
            ${link.notes ? `<p><strong>Notes:</strong> ${link.notes}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${rosterUrl}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Fill Duty Roster
            </a>
          </div>
        </div>
      </div>
    `;
  }

  generateSwapRequestTemplate(request, toEmployee, tenant) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">${tenant.name}</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Shift Swap Request</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${toEmployee.firstName}, you have received a shift swap request.
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>From:</strong> ${request.requester?.firstName} ${request.requester?.lastName}</p>
            <p><strong>Their Date:</strong> ${new Date(request.requesterSchedule?.date).toLocaleDateString()}</p>
            <p><strong>Your Date:</strong> ${new Date(request.targetSchedule?.date).toLocaleDateString()}</p>
            ${request.reason ? `<p><strong>Reason:</strong> ${request.reason}</p>` : ''}
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            Please log in to the HR portal to accept or decline this request.
          </p>
        </div>
      </div>
    `;
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
