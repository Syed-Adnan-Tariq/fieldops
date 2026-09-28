import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: any = null;

  constructor(private readonly config: ConfigService) {
    this.initTransporter();
  }

  private async initTransporter() {
    try {
      const nodemailer = await import('nodemailer');
      const host = this.config.get('SMTP_HOST');
      const port = this.config.get<number>('SMTP_PORT', 587);
      const user = this.config.get('SMTP_USER');
      const pass = this.config.get('SMTP_PASS');

      if (!host || !user || !pass) {
        this.logger.warn('SMTP not configured — email notifications disabled. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host, port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('Email transporter initialized');
    } catch (e) {
      this.logger.warn('nodemailer not available — email notifications disabled');
    }
  }

  async sendJobAssigned(opts: {
    workerEmail: string; workerName: string;
    jobTitle: string; jobAddress: string;
    scheduledStart?: string; jobId: string;
  }) {
    await this.send({
      to: opts.workerEmail,
      subject: `New Job Assigned: ${opts.jobTitle}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1D4ED8;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:white;margin:0">⚡ FieldOps — New Job Assigned</h2>
          </div>
          <div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px">
            <p>Hi <strong>${opts.workerName}</strong>,</p>
            <p>You have been assigned a new job:</p>
            <div style="background:#f8fafc;border-left:4px solid #1D4ED8;padding:16px;margin:16px 0;border-radius:4px">
              <h3 style="margin:0 0 8px;color:#1e293b">${opts.jobTitle}</h3>
              <p style="margin:0;color:#64748b">📍 ${opts.jobAddress}</p>
              ${opts.scheduledStart ? `<p style="margin:8px 0 0;color:#64748b">🕐 Scheduled: ${new Date(opts.scheduledStart).toLocaleString()}</p>` : ''}
            </div>
            <p>Open the FieldOps mobile app to view full details and accept the job.</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:32px">This is an automated notification from FieldOps.</p>
          </div>
        </div>`,
    });
  }

  async sendJobDispatched(opts: {
    workerEmail: string; workerName: string;
    jobTitle: string; jobAddress: string; jobId: string;
  }) {
    await this.send({
      to: opts.workerEmail,
      subject: `Job Dispatched — Action Required: ${opts.jobTitle}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#F59E0B;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:white;margin:0">📤 FieldOps — Job Dispatched</h2>
          </div>
          <div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px">
            <p>Hi <strong>${opts.workerName}</strong>,</p>
            <p>Your job has been dispatched. Please head to the location:</p>
            <div style="background:#fffbeb;border-left:4px solid #F59E0B;padding:16px;margin:16px 0;border-radius:4px">
              <h3 style="margin:0 0 8px;color:#1e293b">${opts.jobTitle}</h3>
              <p style="margin:0;color:#64748b">📍 ${opts.jobAddress}</p>
            </div>
            <p>Open the FieldOps mobile app and mark the job as <strong>In Progress</strong> when you start.</p>
          </div>
        </div>`,
    });
  }

  async sendJobCompleted(opts: {
    adminEmail: string; workerName: string;
    jobTitle: string; jobAddress: string;
    completedAt: string; jobId: string;
    clientEmail?: string; signerName?: string;
  }) {
    const targets = [opts.adminEmail];
    if (opts.clientEmail) targets.push(opts.clientEmail);

    for (const email of targets) {
      await this.send({
        to: email,
        subject: `Job Completed: ${opts.jobTitle}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#10B981;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="color:white;margin:0">✅ FieldOps — Job Completed</h2>
            </div>
            <div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px">
              <div style="background:#f0fdf4;border-left:4px solid #10B981;padding:16px;margin:0 0 16px;border-radius:4px">
                <h3 style="margin:0 0 8px;color:#1e293b">${opts.jobTitle}</h3>
                <p style="margin:0;color:#64748b">📍 ${opts.jobAddress}</p>
                <p style="margin:8px 0 0;color:#64748b">👷 Completed by: ${opts.workerName}</p>
                <p style="margin:4px 0 0;color:#64748b">🕐 ${new Date(opts.completedAt).toLocaleString()}</p>
                ${opts.signerName ? `<p style="margin:4px 0 0;color:#64748b">✍️ Signed by: ${opts.signerName}</p>` : ''}
              </div>
              <p style="color:#94a3b8;font-size:12px">This is an automated proof of completion from FieldOps.</p>
            </div>
          </div>`,
      });
    }
  }

  private async send(opts: { to: string; subject: string; html: string }) {
    if (!this.transporter) return;
    try {
      const from = this.config.get('SMTP_FROM', 'noreply@fieldops.app');
      await this.transporter.sendMail({ from, ...opts });
      this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
    } catch (e: any) {
      this.logger.error(`Failed to send email to ${opts.to}: ${e.message}`);
    }
  }
}
