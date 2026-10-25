import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/env.js';

export interface EmailMessagePayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailDeliveryResult {
  accepted: boolean;
  mode: 'smtp' | 'fallback';
  messageId?: string;
  errorCategory?: 'timeout' | 'auth' | 'network' | 'unknown';
}

export interface EmailServiceOptions {
  transporter?: Transporter;
  onSendFallback?: (payload: EmailMessagePayload) => void;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private onSendFallback?: (payload: EmailMessagePayload) => void;
  public fallbackSentEmails: EmailMessagePayload[] = [];
  public lastDeliveryResult: EmailDeliveryResult | null = null;

  constructor(options?: EmailServiceOptions) {
    this.onSendFallback = options?.onSendFallback;

    if (options?.transporter) {
      this.transporter = options.transporter;
    } else if (config.smtp.host) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });
    }
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST || config.smtp.host;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || String(config.smtp.port), 10),
        secure: (process.env.SMTP_SECURE || String(config.smtp.secure)) === 'true',
        auth: (process.env.SMTP_USER || config.smtp.user)
          ? {
              user: process.env.SMTP_USER || config.smtp.user,
              pass: process.env.SMTP_PASS || config.smtp.pass,
            }
          : undefined,
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });
      return this.transporter;
    }
    return null;
  }

  private async deliver(payload: EmailMessagePayload): Promise<EmailDeliveryResult> {
    const transporter = this.getTransporter();
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || config.smtp.from,
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
        });
        console.log(`[EmailService] SMTP relay accepted email for ${payload.to} [MessageId: ${info.messageId}]`);
        const result: EmailDeliveryResult = { accepted: true, mode: 'smtp', messageId: info.messageId };
        this.lastDeliveryResult = result;
        return result;
      } catch (err: unknown) {
        let errorCategory: 'timeout' | 'auth' | 'network' | 'unknown' = 'unknown';
        const errMsg = err instanceof Error ? err.message : '';
        const errCode = (err as { code?: string })?.code;
        if (errCode === 'ETIMEDOUT' || errMsg.includes('timeout')) {
          errorCategory = 'timeout';
        } else if (errCode === 'EAUTH' || errMsg.includes('Invalid login') || errMsg.includes('Username and Password not accepted')) {
          errorCategory = 'auth';
        } else if (errCode === 'ECONNREFUSED' || errCode === 'ENOTFOUND') {
          errorCategory = 'network';
        }
        console.error(`[EmailService] SMTP relay rejected email to ${payload.to} (category: ${errorCategory}, code: ${errCode || 'none'})`);
        const result: EmailDeliveryResult = { accepted: false, mode: 'smtp', errorCategory };
        this.lastDeliveryResult = result;
        return result;
      }
    }

    // Safe fallback mode when SMTP is unconfigured (development, local preview, offline tests)
    this.fallbackSentEmails.push(payload);
    if (this.onSendFallback) {
      this.onSendFallback(payload);
    } else {
      console.log(`[EmailService:Fallback] [Dev Preview] To: ${payload.to} | Subject: "${payload.subject}"`);
    }
    const result: EmailDeliveryResult = { accepted: true, mode: 'fallback' };
    this.lastDeliveryResult = result;
    return result;
  }

  /**
   * Internal delivery for verification email.
   */
  public async deliverVerificationEmail(
    email: string,
    token: string,
    returnUrl?: string
  ): Promise<EmailDeliveryResult> {
    const baseUrl = config.appUrl.replace(/\/+$/, '');
    const params = new URLSearchParams({ token });
    if (returnUrl) {
      params.set('returnUrl', returnUrl);
    }
    const verificationUrl = `${baseUrl}/verify-email?${params.toString()}`;

    const text = [
      'Drawzware — Verify your email',
      '==============================',
      '',
      'Welcome to Drawzware System Design Canvas!',
      'Please verify your email address to enable real-time cloud collaboration and workspace sharing:',
      '',
      verificationUrl,
      '',
      'Note: This link expires in 24 hours.',
      'Personal diagramming is 100% offline and always free.',
      'If you did not sign up for Drawzware, you can safely ignore this email.',
    ].join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your Drawzware email</title>
        </head>
        <body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
          <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06);">
            <!-- Brand Header -->
            <div style="padding: 24px 28px; background: #0f172a; border-bottom: 1px solid #1e293b; display: flex; align-items: center;">
              <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Drawzware</span>
              <span style="font-size: 12px; color: #94a3b8; margin-left: 8px;">Studio</span>
            </div>

            <!-- Content -->
            <div style="padding: 32px 28px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.02em;">
                Verify your email address
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                Welcome to Drawzware! Click the button below to verify your email and activate cloud collaboration, real-time sync, and workspace invitations.
              </p>

              <div style="margin: 28px 0;">
                <a href="${verificationUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);">
                  Verify Email Address
                </a>
              </div>

              <p style="font-size: 12.5px; line-height: 1.5; color: #64748b; margin: 0 0 8px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; line-height: 1.4; color: #6366f1; word-break: break-all; margin: 0 0 24px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                ${verificationUrl}
              </p>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
                  This link expires in 24 hours. If you did not create an account on Drawzware, you can safely ignore this email.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.deliver({
      to: email,
      subject: 'Verify your Drawzware email',
      text,
      html,
    });
  }

  /**
   * Send email address verification link (returns boolean for full backward-compatibility with existing tests and callers).
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    returnUrl?: string
  ): Promise<boolean> {
    const res = await this.deliverVerificationEmail(email, token, returnUrl);
    return res.accepted;
  }

  async sendVerificationEmailResult(
    email: string,
    token: string,
    returnUrl?: string
  ): Promise<EmailDeliveryResult> {
    return this.deliverVerificationEmail(email, token, returnUrl);
  }

  /**
   * Internal delivery for password reset email.
   */
  public async deliverPasswordResetEmail(
    email: string,
    token: string,
    returnUrl?: string
  ): Promise<EmailDeliveryResult> {
    const baseUrl = config.appUrl.replace(/\/+$/, '');
    const params = new URLSearchParams({ token });
    if (returnUrl) {
      params.set('returnUrl', returnUrl);
    }
    const resetUrl = `${baseUrl}/reset-password?${params.toString()}`;

    const text = [
      'Drawzware — Reset your password',
      '===============================',
      '',
      'You requested a password reset for your Drawzware account.',
      'Click the link below to set a new password:',
      '',
      resetUrl,
      '',
      'Note: This link expires in 1 hour.',
      'If you did not request a password reset, you can safely ignore this email.',
    ].join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your Drawzware password</title>
        </head>
        <body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
          <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06);">
            <!-- Brand Header -->
            <div style="padding: 24px 28px; background: #0f172a; border-bottom: 1px solid #1e293b;">
              <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Drawzware</span>
              <span style="font-size: 12px; color: #94a3b8; margin-left: 8px;">Security</span>
            </div>

            <!-- Content -->
            <div style="padding: 32px 28px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.02em;">
                Reset your password
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                We received a request to reset your password. Click the button below to choose a new password.
              </p>

              <div style="margin: 28px 0;">
                <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);">
                  Reset Password
                </a>
              </div>

              <p style="font-size: 12.5px; line-height: 1.5; color: #64748b; margin: 0 0 8px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; line-height: 1.4; color: #6366f1; word-break: break-all; margin: 0 0 24px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                ${resetUrl}
              </p>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
                  This link expires in 1 hour. If you did not request a password reset, your password remains unchanged and you can safely ignore this email.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.deliver({
      to: email,
      subject: 'Reset your Drawzware password',
      text,
      html,
    });
  }

  /**
   * Send password reset link (returns boolean for full backward-compatibility with existing tests and callers).
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    returnUrl?: string
  ): Promise<boolean> {
    const res = await this.deliverPasswordResetEmail(email, token, returnUrl);
    return res.accepted;
  }

  async sendPasswordResetEmailResult(
    email: string,
    token: string,
    returnUrl?: string
  ): Promise<EmailDeliveryResult> {
    return this.deliverPasswordResetEmail(email, token, returnUrl);
  }

  /**
   * Internal delivery for workspace invitation email.
   */
  public async deliverInvitationEmail(
    email: string,
    invitationId: string,
    workspaceName: string,
    inviterName: string,
    role: string,
    returnUrl?: string
  ): Promise<EmailDeliveryResult> {
    const baseUrl = config.appUrl.replace(/\/+$/, '');
    const params = new URLSearchParams({ id: invitationId });
    if (returnUrl) {
      params.set('returnUrl', returnUrl);
    }
    const invitationUrl = `${baseUrl}/invitations?${params.toString()}`;
    const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);

    const text = [
      `Workspace Invitation — ${workspaceName}`,
      '======================================',
      '',
      `${inviterName} invited you to join "${workspaceName}" on Drawzware with ${capitalizedRole} access.`,
      'Click the link below to accept the invitation and start collaborating:',
      '',
      invitationUrl,
      '',
      'Note: This invitation is single-use and expires in 7 days.',
    ].join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Workspace Invitation</title>
        </head>
        <body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
          <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06);">
            <!-- Brand Header -->
            <div style="padding: 24px 28px; background: #0f172a; border-bottom: 1px solid #1e293b;">
              <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Drawzware</span>
              <span style="font-size: 12px; color: #94a3b8; margin-left: 8px;">Collaboration</span>
            </div>

            <!-- Content -->
            <div style="padding: 32px 28px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.02em;">
                You've been invited to collaborate
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
                <strong>${inviterName}</strong> invited you to collaborate on the workspace <strong>"${workspaceName}"</strong> with <strong>${capitalizedRole}</strong> permissions.
              </p>

              <div style="margin: 28px 0;">
                <a href="${invitationUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);">
                  Accept Invitation
                </a>
              </div>

              <p style="font-size: 12.5px; line-height: 1.5; color: #64748b; margin: 0 0 8px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; line-height: 1.4; color: #6366f1; word-break: break-all; margin: 0 0 24px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                ${invitationUrl}
              </p>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
                  This invitation is bound to ${email} and expires in 7 days.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.deliver({
      to: email,
      subject: `You've been invited to join "${workspaceName}" on Drawzware`,
      text,
      html,
    });
  }

  /**
   * Send workspace collaboration invitation link (returns boolean for full backward-compatibility with existing tests and callers).
   */
  async sendInvitationEmail(
    email: string,
    invitationId: string,
    workspaceName: string,
    inviterName: string,
    role: string,
    returnUrl?: string
  ): Promise<boolean> {
    const res = await this.deliverInvitationEmail(
      email,
      invitationId,
      workspaceName,
      inviterName,
      role,
      returnUrl
    );
    return res.accepted;
  }

  async sendInvitationEmailResult(
    email: string,
    invitationId: string,
    workspaceName: string,
    inviterName: string,
    role: string,
    returnUrl?: string
  ): Promise<EmailDeliveryResult> {
    return this.deliverInvitationEmail(
      email,
      invitationId,
      workspaceName,
      inviterName,
      role,
      returnUrl
    );
  }
}

export const emailService = new EmailService();
