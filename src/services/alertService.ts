import nodemailer from 'nodemailer';
import axios from 'axios';
import { Alert } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Multi-channel alerting service: console, file (via logger), email, webhook
 */
class AlertService {
  private emailTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

  constructor() {
    if (config.email.host && config.email.user && config.email.pass) {
      this.emailTransporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
    }
  }

  async send(alert: Alert): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const channel of alert.channels) {
      switch (channel) {
        case 'console':
          promises.push(this.sendConsole(alert));
          break;
        case 'file':
          promises.push(this.sendFile(alert));
          break;
        case 'email':
          promises.push(this.sendEmail(alert));
          break;
        case 'webhook':
          promises.push(this.sendWebhook(alert));
          break;
      }
    }

    await Promise.allSettled(promises);
  }

  private async sendConsole(alert: Alert): Promise<void> {
    const icons: Record<string, string> = {
      low: '🔵',
      medium: '🟡',
      high: '🔴',
      critical: '🚨',
    };
    const icon = icons[alert.severity] || '⚠️';
    console.log(`\n${icon} [${alert.severity.toUpperCase()}] ${alert.description}`);
    console.log(`   Time: ${alert.timestamp.toISOString()} | Type: ${alert.type} | IP: ${alert.sourceIP || 'N/A'}`);
  }

  private async sendFile(alert: Alert): Promise<void> {
    logger.warn(`ALERT [${alert.severity}] ${alert.type}: ${alert.description}`, {
      alertId: alert.id,
      sourceIP: alert.sourceIP,
      timestamp: alert.timestamp,
      metadata: alert.metadata,
    });
  }

  private async sendEmail(alert: Alert): Promise<void> {
    if (!this.emailTransporter || !config.email.to) return;

    try {
      await this.emailTransporter.sendMail({
        from: config.email.user,
        to: config.email.to,
        subject: `[IDS Alert] ${alert.severity.toUpperCase()}: ${alert.type}`,
        html: this.buildEmailHTML(alert),
      });
      logger.info('Email alert sent', { alertId: alert.id, to: config.email.to });
    } catch (err) {
      logger.error('Failed to send email alert', { error: (err as Error).message });
    }
  }

  private buildEmailHTML(alert: Alert): string {
    return `
      <h2>🚨 IDS Alert — ${alert.severity.toUpperCase()}</h2>
      <table border="1" cellpadding="5" style="border-collapse:collapse">
        <tr><td><strong>Alert ID</strong></td><td>${alert.id}</td></tr>
        <tr><td><strong>Type</strong></td><td>${alert.type}</td></tr>
        <tr><td><strong>Severity</strong></td><td>${alert.severity}</td></tr>
        <tr><td><strong>Description</strong></td><td>${alert.description}</td></tr>
        <tr><td><strong>Source IP</strong></td><td>${alert.sourceIP || 'N/A'}</td></tr>
        <tr><td><strong>Timestamp</strong></td><td>${alert.timestamp.toISOString()}</td></tr>
      </table>
      ${alert.metadata ? `<pre>${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
    `;
  }

  private async sendWebhook(alert: Alert): Promise<void> {
    if (!config.webhook.url) return;

    try {
      // Format for Slack/Discord (both support the `text` field)
      const payload = {
        text: `🚨 *IDS Alert [${alert.severity.toUpperCase()}]* — ${alert.type}`,
        attachments: [
          {
            color: alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'good',
            fields: [
              { title: 'Description', value: alert.description, short: false },
              { title: 'Source IP', value: alert.sourceIP || 'N/A', short: true },
              { title: 'Timestamp', value: alert.timestamp.toISOString(), short: true },
            ],
          },
        ],
      };

      await axios.post(config.webhook.url, payload, { timeout: 5000 });
      logger.info('Webhook alert sent', { alertId: alert.id });
    } catch (err) {
      logger.error('Failed to send webhook alert', { error: (err as Error).message });
    }
  }
}

export const alertService = new AlertService();
