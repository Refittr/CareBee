import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "CareBee <onboarding@resend.dev>";

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

  const { error } = await resend.emails.send({
    from: FROM,
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
            <span style="color:#1c1917;">Care</span><span style="color:#f59e0b;">Bee</span>
          </span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#fff;border:1px solid #e7e4df;border-radius:16px;padding:40px 32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c1917;">
            You've been invited to join ${householdName}
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#78716c;line-height:1.6;">
            <strong style="color:#1c1917;">${inviterName}</strong> has invited you to join their household on CareBee — a private, secure place to keep care records for the people you love.
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
              <a href="${inviteLink}" style="display:inline-block;background:#f59e0b;color:#fff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:-0.2px;">
                Accept invitation
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;text-align:center;line-height:1.6;">
            This link expires in 7 days. If you weren't expecting this invitation, you can ignore this email.<br>
            If the button doesn't work, copy this link: <a href="${inviteLink}" style="color:#a8a29e;">${inviteLink}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) throw new Error(error.message);
}
