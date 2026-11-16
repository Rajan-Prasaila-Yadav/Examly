import { randomBytes, createHash } from 'crypto';
import nodemailer from 'nodemailer';

type RecoveryConfig = { apiKey: string; from: string; origin: string; gmail?: { user: string; pass: string } };

export function recoveryConfiguration(): RecoveryConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM_ADDRESS?.trim();
  try {
    const frontend = new URL(process.env.FRONTEND_URL || '');
    if (frontend.username || frontend.password) return null;
    if (frontend.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && frontend.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(frontend.hostname))) return null;
    if (process.env.MAIL_PROVIDER === 'gmail') {
      const user = process.env.GMAIL_USER?.trim();
      const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
      if (!user || !/^[^\s<>@]+@gmail\.com$/i.test(user) || !pass || pass.length !== 16) return null;
      return { apiKey: '', from: `Examly <${user}>`, origin: frontend.origin, gmail: { user, pass } };
    }
    if (!apiKey || !from) return null;
    if (process.env.NODE_ENV === 'production' && /@resend\.dev\b/i.test(from)) return null;
    return { apiKey, from, origin: frontend.origin };
  } catch { return null; }
}

// Await delivery acceptance within the HTTP request; no long-lived worker needed.
export async function sendPasswordRecovery(app: any, user: { id: string; email: string }, config: NonNullable<ReturnType<typeof recoveryConfiguration>>, ip: string) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const record = await app.prisma.passwordResetToken.create({ data: {
    userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000), ipAddress: ip,
  } });
  const link = new URL('/forgot-password', config.origin);
  link.searchParams.set('token', token);
  const email = {
    from: config.from, to: [user.email], subject: 'Reset your Examly password',
    text: `Reset your Examly password using this link: ${link.toString()}\n\nThis link expires in 60 minutes and can be used once. If you did not request this, ignore this email.`,
  };
  try {
    if (config.gmail) {
      const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true, auth: config.gmail,
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      });
      try {
        const result = await transport.sendMail(email);
        if (!result.accepted?.length || result.rejected?.length) throw new Error('Recipient rejected by mail provider');
        app.log.info({ event: 'PASSWORD_RESET_EMAIL_ACCEPTED', provider: 'gmail', messageId: result.messageId }, 'Password reset email accepted by provider');
        return result.messageId;
      } catch (error: any) {
        app.log.error({ event: 'PASSWORD_RESET_EMAIL_REJECTED', provider: 'gmail', code: error.code || 'SMTP_ERROR' }, 'Check Gmail App Password and sending limits');
        throw error;
      } finally { transport.close(); }
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `password-reset/${record.id}` },
      body: JSON.stringify(email),
    });
    const body = await response.json() as { id?: string; name?: string; message?: string };
    if (!response.ok || !body.id) {
      // Log only status/code, never the email body, token, or provider message.
      const reason = /only send testing emails|own email address/i.test(body.message || '') ? 'SANDBOX_RECIPIENT_RESTRICTION'
        : /domain.*not verified|verify.*domain/i.test(body.message || '') ? 'SENDER_DOMAIN_NOT_VERIFIED'
        : /api key/i.test(body.message || '') ? 'API_KEY_REJECTED' : 'PROVIDER_REJECTED';
      app.log.error({ event: 'PASSWORD_RESET_EMAIL_REJECTED', status: response.status, code: body.name, reason }, 'Password reset email rejected by provider');
      throw new Error('Email provider rejected password recovery');
    }
    app.log.info({ event: 'PASSWORD_RESET_EMAIL_ACCEPTED', messageId: body.id }, 'Password reset email accepted by provider');
    return body.id;
  } catch (error) {
    // Do not invalidate previous working links when a new delivery fails.
    await app.prisma.passwordResetToken.updateMany({ where: { id: record.id, isConsumed: false }, data: { isConsumed: true, consumedAt: new Date() } });
    throw error;
  }
}
