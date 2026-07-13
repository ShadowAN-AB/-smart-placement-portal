const escape = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (date) => {
  if (!date) return 'TBD';
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) + ' IST';
};

const layout = (title, bodyHtml) => `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
    <h2 style="color: #1A73E8; margin: 0 0 16px;">${escape(title)}</h2>
    ${bodyHtml}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 12px; color: #64748b;">Smart Placement Portal — automated notification</p>
  </div>
`;

const detailLine = (label, value) =>
  `<p style="margin: 4px 0;"><strong>${escape(label)}:</strong> ${escape(value)}</p>`;

const interviewScheduled = ({ role, interview, job, student, recruiter }) => {
  const recipientLabel = role === 'student' ? 'You have an interview scheduled' : 'Interview scheduled with candidate';
  const counterparty = role === 'student'
    ? `${recruiter?.name || 'Recruiter'} (${recruiter?.email || ''})`
    : `${student?.name || 'Candidate'} (${student?.email || ''})`;

  const body = `
    <p>Hi ${escape(role === 'student' ? student?.name : recruiter?.name)},</p>
    <p>An interview has been scheduled. Details below — an <strong>.ics</strong> file is attached; open it to add the event to your calendar.</p>
    ${detailLine('Role', job?.title)}
    ${detailLine('Company', job?.company)}
    ${detailLine(role === 'student' ? 'Interviewer' : 'Candidate', counterparty)}
    ${detailLine('When', formatDateTime(interview?.scheduledAt))}
    ${detailLine('Duration', `${interview?.duration || 30} minutes`)}
    ${detailLine('Format', interview?.meetingType)}
    ${interview?.meetingLink ? detailLine('Join link', interview.meetingLink) : ''}
    ${interview?.location ? detailLine('Location', interview.location) : ''}
    ${interview?.notes ? `<p style="margin-top: 12px;"><strong>Notes:</strong><br/>${escape(interview.notes)}</p>` : ''}
  `;

  return {
    subject: `${role === 'student' ? 'Interview scheduled' : 'Interview scheduled with candidate'}: ${job?.title || 'Position'} at ${job?.company || 'Company'}`,
    html: layout(recipientLabel, body),
    text: `${recipientLabel}\n\nRole: ${job?.title}\nCompany: ${job?.company}\nWhen: ${formatDateTime(interview?.scheduledAt)}\nDuration: ${interview?.duration} min\nFormat: ${interview?.meetingType}\n${interview?.meetingLink ? `Join: ${interview.meetingLink}\n` : ''}${interview?.location ? `Location: ${interview.location}\n` : ''}`,
  };
};

const interviewRescheduled = (opts) => {
  const t = interviewScheduled(opts);
  const noteBanner = '<p style="background: #FEF3C7; padding: 10px; border-radius: 6px; margin-bottom: 16px;"><strong>Note:</strong> This interview was rescheduled. The new time is below.</p>';
  return {
    subject: `Interview rescheduled: ${opts.job?.title || 'Position'} at ${opts.job?.company || 'Company'}`,
    html: t.html.replace('<p>Hi', noteBanner + '<p>Hi'),
    text: 'This interview was rescheduled.\n\n' + t.text,
  };
};

const interviewCancelled = ({ role, interview, job, student, recruiter, reason }) => {
  const recipient = role === 'student' ? student : recruiter;
  const body = `
    <p>Hi ${escape(recipient?.name)},</p>
    <p>The interview scheduled for <strong>${escape(formatDateTime(interview?.scheduledAt))}</strong> has been cancelled.</p>
    ${detailLine('Role', job?.title)}
    ${detailLine('Company', job?.company)}
    ${reason ? `<p style="margin-top: 12px;"><strong>Reason:</strong><br/>${escape(reason)}</p>` : ''}
  `;
  return {
    subject: `Interview cancelled: ${job?.title || 'Position'} at ${job?.company || 'Company'}`,
    html: layout('Interview cancelled', body),
    text: `Interview cancelled\n\nRole: ${job?.title}\nCompany: ${job?.company}\nWhen: ${formatDateTime(interview?.scheduledAt)}\n${reason ? `Reason: ${reason}` : ''}`,
  };
};

const passwordReset = ({ name, resetUrl }) => {
  const body = `
    <p>Hi ${escape(name || 'there')},</p>
    <p>We received a request to reset your Smart Placement Portal password. Click the link below to set a new one. This link expires in 1 hour.</p>
    <p style="margin: 20px 0;">
      <a href="${escape(resetUrl)}" style="display: inline-block; background: #1A73E8; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none;">Reset password</a>
    </p>
    <p style="font-size: 13px; color: #475569;">If you didn't request this, you can safely ignore this email — your password will stay the same.</p>
    <p style="font-size: 12px; color: #64748b; word-break: break-all;">If the button doesn't work, copy this URL into your browser:<br/>${escape(resetUrl)}</p>
  `;
  return {
    subject: 'Reset your Smart Placement Portal password',
    html: layout('Password reset', body),
    text: `Hi ${name || 'there'},\n\nWe received a request to reset your password. Open this link within 1 hour to set a new one:\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  };
};

module.exports = {
  interviewScheduled,
  interviewRescheduled,
  interviewCancelled,
  passwordReset,
};
