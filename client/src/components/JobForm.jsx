import { useState } from 'react';
import { apiRequest } from '../utils/api';
import Button from './common/Button';

const initialState = {
  title: '',
  company: '',
  description: '',
  requiredSkills: '',
  minExperience: 0,
  minSalary: 0,
  maxSalary: 0,
};

const JobForm = ({ onCreated }) => {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.title.trim() || !form.company.trim() || !form.description.trim()) {
      setError('title, company and description are required');
      return;
    }

    if (!form.requiredSkills.trim()) {
      setError('At least one required skill is needed');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          requiredSkills: form.requiredSkills,
          minExperience: Number(form.minExperience || 0),
          minSalary: Number(form.minSalary || 0),
          maxSalary: Number(form.maxSalary || 0),
        }),
      });

      setForm(initialState);
      onCreated?.();
    } catch (err) {
      setError(err.message || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-portal p-5 space-y-3">
      <h3 className="text-lg font-heading text-slate-100 font-bold">Post New Job</h3>

      <input
        className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
        placeholder="Job title"
        value={form.title}
        onChange={(event) => updateField('title', event.target.value)}
      />
      <input
        className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
        placeholder="Company"
        value={form.company}
        onChange={(event) => updateField('company', event.target.value)}
      />
      <textarea
        className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
        placeholder="Description"
        value={form.description}
        onChange={(event) => updateField('description', event.target.value)}
      />
      <input
        className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
        placeholder="Skills (comma separated)"
        value={form.requiredSkills}
        onChange={(event) => updateField('requiredSkills', event.target.value)}
      />

      <div className="grid md:grid-cols-3 gap-3">
        <input
          type="number"
          min="0"
          className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
          placeholder="Min Exp"
          value={form.minExperience}
          onChange={(event) => updateField('minExperience', event.target.value)}
        />
        <input
          type="number"
          min="0"
          className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
          placeholder="Min Salary"
          value={form.minSalary}
          onChange={(event) => updateField('minSalary', event.target.value)}
        />
        <input
          type="number"
          min="0"
          className="w-full rounded-portal bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
          placeholder="Max Salary"
          value={form.maxSalary}
          onChange={(event) => updateField('maxSalary', event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <Button type="submit" disabled={saving}>
        {saving ? 'Posting...' : 'Post Job'}
      </Button>
    </form>
  );
};

export default JobForm;
