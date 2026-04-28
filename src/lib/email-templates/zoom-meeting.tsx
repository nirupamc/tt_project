export function zoomMeetingEmailHtml(opts: { join_url: string; meeting_id?: string | number; passcode?: string | null; dateLabel?: string; }) {
  const { join_url, meeting_id, passcode, dateLabel } = opts;
  const safePass = passcode ? `<p style="margin:0 0 8px 0"><strong>Passcode:</strong> ${passcode}</p>` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Daily Standup Meeting</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f7f7f8; margin:0; padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="padding:20px; text-align:center; background:#0A0A0A; color:#FFD700; font-weight:700;">
                Archway — Daily Standup
              </td>
            </tr>
            <tr>
              <td style="padding:28px; color:#0A0A0A;">
                <h1 style="margin:0 0 12px 0; font-size:20px;">Your daily standup meeting is ready</h1>
                <p style="margin:0 0 16px 0; color:#374151;">${dateLabel || "Today"} — join the meeting below:</p>

                <div style="text-align:center; margin:18px 0;">
                  <a href="${join_url}" style="display:inline-block; background:#111827; color:#FFD700; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Join Meeting</a>
                </div>

                <p style="margin:0 0 8px 0"><strong>Meeting ID:</strong> ${meeting_id ?? "—"}</p>
                ${safePass}

                <p style="margin-top:18px; color:#6B7280; font-size:13px;">Start time: 9:00 PM IST / 9:30 AM CT</p>

                <hr style="border:none; border-top:1px solid #EEF2F7; margin:20px 0;" />

                <p style="margin:0; color:#9CA3AF; font-size:12px;">This is an automated message from Archway. For support, contact your administrator.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px; background:#FAFAFB; text-align:center; font-size:12px; color:#9CA3AF;">© ${new Date().getFullYear()} TanTech LLC</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
