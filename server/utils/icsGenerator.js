/**
 * Generate an .ics (iCalendar) file string for an interview event.
 *
 * @param {Object} options
 * @param {string} options.title       – Event title
 * @param {Date}   options.start       – Start datetime
 * @param {number} options.durationMin – Duration in minutes
 * @param {string} options.description – Event description
 * @param {string} options.location    – Physical or URL location
 * @param {string} options.organizer   – Organizer email
 * @param {string} options.attendee    – Attendee email
 * @returns {string} .ics file contents
 */
const generateICS = ({ title, start, durationMin, description, location, organizer, attendee }) => {
  const pad = (n) => String(n).padStart(2, '0');

  const toICSDate = (date) => {
    const d = new Date(date);
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  };

  const endDate = new Date(new Date(start).getTime() + durationMin * 60 * 1000);
  const now = new Date();
  const uid = `interview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@smartplacement`;

  const escapeText = (text) =>
    String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartPlacementPortal//Interview//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(now)}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(endDate)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`,
  ];

  if (organizer) {
    lines.push(`ORGANIZER;CN=Recruiter:mailto:${organizer}`);
  }
  if (attendee) {
    lines.push(`ATTENDEE;CN=Candidate;RSVP=TRUE:mailto:${attendee}`);
  }

  lines.push('STATUS:CONFIRMED', 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Interview Reminder', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
};

module.exports = { generateICS };
