const resendEndpoint = 'https://api.resend.com/emails';

export type EmailDelivery = 'resend' | 'development';

export async function sendPasswordResetEmail(
  recipient: string,
  resetUrl: string,
): Promise<EmailDelivery> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Password reset email is not configured');
    }
    return 'development';
  }

  const response = await fetch(resendEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: 'Reset your Applytics password',
      text: `Use this link to reset your Applytics password. It expires in 30 minutes and can be used once:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Use the link below to reset your Applytics password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 30 minutes and can be used once. If you did not request this, you can ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Resend rejected the password reset email (${response.status}): ${detail}`);
  }
  return 'resend';
}
