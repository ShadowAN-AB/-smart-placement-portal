import { useState } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

const InterviewScheduleModal = ({ open, onClose, application, onSchedule }) => {
  const [form, setForm] = useState({
    date: '',
    time: '',
    duration: '30',
    meetingType: 'video',
    meetingLink: '',
    location: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.date || !form.time) {
      setError('Please select a date and time.');
      return;
    }

    const scheduledAt = new Date(`${form.date}T${form.time}:00`);
    if (scheduledAt <= new Date()) {
      setError('Interview must be scheduled in the future.');
      return;
    }

    if (form.meetingType === 'video' && !form.meetingLink.trim()) {
      setError('Please provide a meeting link for video interviews.');
      return;
    }

    if (form.meetingType === 'in-person' && !form.location.trim()) {
      setError('Please provide a location for in-person interviews.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSchedule({
        applicationId: application._id,
        scheduledAt: scheduledAt.toISOString(),
        duration: Number(form.duration),
        meetingType: form.meetingType,
        meetingLink: form.meetingLink.trim(),
        location: form.location.trim(),
        notes: form.notes.trim(),
      });
      setForm({ date: '', time: '', duration: '30', meetingType: 'video', meetingLink: '', location: '', notes: '' });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  // Default date to tomorrow
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Modal open={open} title="Schedule Interview" onClose={onClose}>
      <div className="space-y-4">
        {/* Candidate info */}
        {application ? (
          <div className="bg-slate-800/50 rounded-portal p-3 border border-slate-700/50">
            <p className="text-sm text-slate-400">Scheduling interview for</p>
            <p className="text-slate-100 font-semibold">{application.studentId?.name || 'Student'}</p>
            <p className="text-slate-400 text-sm">{application.studentId?.email || ''}</p>
            <p className="text-xs text-intel-blue-light mt-1">
              Match Score: {Math.round(application.matchScore || 0)}%
            </p>
          </div>
        ) : null}

        {/* Date & Time row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Date *</label>
            <input
              type="date"
              min={getMinDate()}
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Time *</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => handleChange('time', e.target.value)}
              className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
            />
          </div>
        </div>

        {/* Duration & Type row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Duration</label>
            <select
              value={form.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Type</label>
            <select
              value={form.meetingType}
              onChange={(e) => handleChange('meetingType', e.target.value)}
              className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
            >
              <option value="video">📹 Video Call</option>
              <option value="phone">📞 Phone Call</option>
              <option value="in-person">🏢 In-Person</option>
            </select>
          </div>
        </div>

        {/* Conditional meeting link or location */}
        {form.meetingType === 'video' ? (
          <div>
            <label className="block text-sm text-slate-300 mb-1">Meeting Link *</label>
            <input
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={form.meetingLink}
              onChange={(e) => handleChange('meetingLink', e.target.value)}
              className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
            />
          </div>
        ) : null}

        {form.meetingType === 'in-person' ? (
          <div>
            <label className="block text-sm text-slate-300 mb-1">Location *</label>
            <input
              type="text"
              placeholder="Room 302, Main Building"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
            />
          </div>
        ) : null}

        {form.meetingType === 'phone' ? (
          <div>
            <label className="block text-sm text-slate-300 mb-1">Phone Number / Instructions</label>
            <input
              type="text"
              placeholder="We will call you at your registered number"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
            />
          </div>
        ) : null}

        {/* Notes */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">Notes for candidate (optional)</label>
          <textarea
            rows={2}
            placeholder="Prepare a 5-min intro about your recent project..."
            value={form.meetingType === 'phone' ? '' : form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 resize-none"
          />
        </div>

        {error ? <p className="text-sm text-error">{error}</p> : null}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Scheduling...' : '📅 Schedule Interview'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InterviewScheduleModal;
