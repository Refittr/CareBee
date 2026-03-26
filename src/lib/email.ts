async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("[email] BREVO_API_KEY is not set — cannot send email");
  }

  const fromEmail = process.env.FROM_EMAIL ?? "noreply@mycarebee.co.uk";
  const fromName = process.env.FROM_NAME ?? "CareBee";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo error: ${body}`);
  }
}

export async function sendInviteEmail({
  to,
  householdName,
  inviterName,
  role,
  inviteLink,
}: {
  to: string;
  householdName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
}) {
  const roleLabel =
    role === "editor" ? "Editor (can view and edit records)"
    : role === "viewer" ? "Viewer (can view records)"
    : role === "emergency_only" ? "Emergency only (can view emergency summaries)"
    : role;

  await sendEmail({
    to,
    subject: `You've been invited to join ${householdName} on CareBee`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f6f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;">
            <span style="color:#1c1917;">Care</span><span style="color:#E8A817;">Bee</span>
          </span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#fff;border:1px solid #e7e4df;border-radius:16px;padding:40px 32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c1917;">
            You've been invited to join ${householdName}
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#78716c;line-height:1.6;">
            <strong style="color:#1c1917;">${inviterName}</strong> has invited you to join their household on CareBee, a private, secure place to keep care records for the people you love.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e4df;border-radius:8px;padding:16px;margin-bottom:24px;">
            <tr>
              <td style="font-size:13px;color:#78716c;">Household</td>
              <td style="font-size:13px;font-weight:600;color:#1c1917;text-align:right;">${householdName}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#78716c;padding-top:8px;">Your role</td>
              <td style="font-size:13px;font-weight:600;color:#1c1917;text-align:right;padding-top:8px;">${roleLabel}</td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${inviteLink}" style="display:inline-block;background:#E8A817;color:#fff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:-0.2px;">
                Accept invitation
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;text-align:center;line-height:1.6;">
            This link expires in 7 days. If you were not expecting this invitation, you can ignore this email.<br>
            If the button does not work, copy this link: <a href="${inviteLink}" style="color:#a8a29e;">${inviteLink}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
}: {
  to: string;
  name: string;
  resetLink: string;
}) {
  await sendEmail({
    to,
    subject: "Reset your CareBee password",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f6f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;">
            <span style="color:#1c1917;">Care</span><span style="color:#E8A817;">Bee</span>
          </span>
        </td></tr>
        <tr><td style="background:#fff;border:1px solid #e7e4df;border-radius:16px;padding:40px 32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c1917;">Reset your password</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#78716c;line-height:1.6;">Hi ${name}, click the button below to set a new password for your CareBee account.</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${resetLink}" style="display:inline-block;background:#E8A817;color:#fff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 32px;border-radius:8px;">
                Reset password
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;text-align:center;line-height:1.6;">
            This link expires in 24 hours. If you did not request a password reset, you can ignore this email.<br>
            If the button does not work, copy this link: <a href="${resetLink}" style="color:#a8a29e;">${resetLink}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Reset your CareBee password: ${resetLink}`,
  });
}

export async function sendConfirmationEmail({
  to,
  name,
  confirmLink,
}: {
  to: string;
  name: string;
  confirmLink: string;
}) {
  await sendEmail({
    to,
    subject: "Confirm your CareBee account",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f6f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;">
            <span style="color:#1c1917;">Care</span><span style="color:#E8A817;">Bee</span>
          </span>
        </td></tr>
        <tr><td style="background:#fff;border:1px solid #e7e4df;border-radius:16px;padding:40px 32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c1917;">Confirm your account</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#78716c;line-height:1.6;">Hi ${name}, click the button below to confirm your CareBee account and get started.</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${confirmLink}" style="display:inline-block;background:#E8A817;color:#fff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 32px;border-radius:8px;">
                Confirm account
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;text-align:center;line-height:1.6;">
            If the button does not work, copy this link: <a href="${confirmLink}" style="color:#a8a29e;">${confirmLink}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `Confirm your CareBee account: ${confirmLink}`,
  });
}

export async function sendNewSignupEmail({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await sendEmail({
    to: adminEmail,
    subject: `New signup: ${name ?? email}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f6f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;">
            <span style="color:#1c1917;">Care</span><span style="color:#E8A817;">Bee</span>
          </span>
        </td></tr>
        <tr><td style="background:#fff;border:1px solid #e7e4df;border-radius:16px;padding:40px 32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1c1917;">🎉 New signup</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e4df;border-radius:8px;padding:16px;">
            <tr>
              <td style="font-size:13px;color:#78716c;padding-bottom:8px;">Name</td>
              <td style="font-size:13px;font-weight:600;color:#1c1917;text-align:right;padding-bottom:8px;">${name ?? "—"}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#78716c;">Email</td>
              <td style="font-size:13px;font-weight:600;color:#1c1917;text-align:right;">
                <a href="mailto:${email}" style="color:#E8A817;">${email}</a>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `New signup: ${name ?? "—"} (${email})`,
  });
}

export async function sendContactEmail({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error("[email] ADMIN_EMAIL is not set");
  }

  await sendEmail({
    to: adminEmail,
    subject: `New contact message from ${name}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f6f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;">
            <span style="color:#1c1917;">Care</span><span style="color:#E8A817;">Bee</span>
          </span>
        </td></tr>
        <tr><td style="background:#fff;border:1px solid #e7e4df;border-radius:16px;padding:40px 32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1c1917;">New contact message</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e4df;border-radius:8px;padding:16px;margin-bottom:24px;">
            <tr>
              <td style="font-size:13px;color:#78716c;padding-bottom:8px;">Name</td>
              <td style="font-size:13px;font-weight:600;color:#1c1917;text-align:right;padding-bottom:8px;">${name}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#78716c;">Email</td>
              <td style="font-size:13px;font-weight:600;color:#1c1917;text-align:right;">
                <a href="mailto:${email}" style="color:#E8A817;">${email}</a>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1c1917;">Message</p>
          <p style="margin:0;font-size:15px;color:#44403c;line-height:1.7;white-space:pre-wrap;">${message}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `New contact message from ${name} (${email}):\n\n${message}`,
  });
}
