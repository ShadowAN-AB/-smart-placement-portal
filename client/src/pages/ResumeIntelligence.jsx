import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResumeCompareView from '../components/ResumeCompareView';
import { useAuth } from '../context/AuthContext';
import { useResumeAI } from '../hooks/useResumeAI';

// -- primitives ---------------------------------------------------------

const Section = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`rounded-lg border border-zinc-200 bg-white ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-zinc-100">
        <div>
          {title && <h2 className="font-heading font-semibold text-zinc-900 text-base">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="px-5 sm:px-6 py-5">{children}</div>
  </section>
);

const Spinner = ({ label }) => (
  <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <span>{label || 'Loading…'}</span>
  </div>
);

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-md bg-zinc-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnAccent =
  'inline-flex items-center gap-1.5 rounded-md bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition';

const inputBase =
  'w-full rounded-md bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 hover:border-zinc-400';

// -- score helpers ------------------------------------------------------

const scoreTextClass = (v) => {
  if (v >= 80) return 'text-emerald-700';
  if (v >= 55) return 'text-zinc-900';
  if (v >= 35) return 'text-amber-700';
  return 'text-red-700';
};
const scoreBarClass = (v) => {
  if (v >= 80) return 'bg-emerald-600';
  if (v >= 55) return 'bg-zinc-900';
  if (v >= 35) return 'bg-amber-500';
  return 'bg-red-500';
};
const scoreStroke = (v) => {
  if (v >= 80) return '#059669';
  if (v >= 55) return '#18181b';
  if (v >= 35) return '#d97706';
  return '#dc2626';
};

const FactorBar = ({ label, value }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-zinc-500 w-20 shrink-0">{label}</span>
    <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${scoreBarClass(value)}`}
        style={{ width: `${Math.max(2, value)}%` }}
      />
    </div>
    <span className={`text-xs font-mono w-9 text-right tabular-nums ${scoreTextClass(value)}`}>
      {Math.round(value)}%
    </span>
  </div>
);

const ReadinessGauge = ({ score, label = 'Overall readiness' }) => {
  const value = Math.max(0, Math.min(100, Number(score || 0)));
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#f4f4f5" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={scoreStroke(value)}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-heading text-4xl font-bold tabular-nums ${scoreTextClass(value)}`}>
            {Math.round(value)}
          </span>
          <span className="text-xs text-zinc-500 mt-0.5">out of 100</span>
        </div>
      </div>
      <p className="text-xs uppercase tracking-wider text-zinc-500 mt-3">{label}</p>
    </div>
  );
};

const STATUS_STYLE = {
  none:      { label: 'No resume',      dot: 'bg-zinc-400',     pulse: false },
  uploaded:  { label: 'Uploaded',       dot: 'bg-zinc-900',     pulse: false },
  parsing:   { label: 'Parsing…',       dot: 'bg-amber-500',    pulse: true  },
  extracted: { label: 'Text extracted', dot: 'bg-zinc-900',     pulse: false },
  analyzed:  { label: 'Analyzed',       dot: 'bg-emerald-600',  pulse: false },
  failed:    { label: 'Failed',         dot: 'bg-red-600',      pulse: false },
};
const StatusIndicator = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.none;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
      <span className={`w-2 h-2 rounded-full ${s.dot} ${s.pulse ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  );
};

// -- light modal --------------------------------------------------------

const LightModal = ({ open, title, subtitle, onClose, children, widthClass = 'max-w-4xl' }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} bg-white border border-zinc-200 rounded-lg shadow-xl my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            {title && <h3 className="font-heading text-lg font-semibold text-zinc-900">{title}</h3>}
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// -- light AskAssistant --------------------------------------------------

const EXAMPLE_PROMPTS = [
  'Why is my score low for TCS?',
  'What skills should I learn to improve?',
  'Which company matches my projects best?',
  'How does my experience compare to job requirements?',
  'What certifications would help my profile?',
];

const AskAssistantLight = ({ chatHistory, askLoading, onAsk, onClear }) => {
  const [question, setQuestion] = useState('');
  const chatEndRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || askLoading) return;
    onAsk(question.trim());
    setQuestion('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[120px] max-h-[400px] pr-1">
        {chatHistory.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-500 mb-3">Try asking a question:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setQuestion(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-zinc-300 text-zinc-700 bg-white hover:border-emerald-500 hover:text-emerald-700 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed border ${
                msg.type === 'user'
                  ? 'bg-zinc-900 text-white border-zinc-900 rounded-br-md'
                  : 'bg-white text-zinc-800 border-zinc-200 rounded-bl-md'
              }`}
            >
              {msg.type === 'ai' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-medium tracking-wider uppercase text-emerald-700">Advisor</span>
                  {msg.fromContext && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800">From context</span>
                  )}
                  {msg.confidence === 'low' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">Low confidence</span>
                  )}
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {askLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-xs text-zinc-500">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your resume, scores or career…"
          disabled={askLoading}
          className={inputBase}
        />
        <button type="submit" disabled={askLoading || !question.trim()} className={btnPrimary}>
          Send
        </button>
        {chatHistory.length > 0 && (
          <button type="button" onClick={onClear} className={btnGhost}>
            Clear
          </button>
        )}
      </form>
    </div>
  );
};

// -- page ---------------------------------------------------------------

const ResumeIntelligence = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [versions, setVersions] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparePair, setComparePair] = useState({ a: '', b: '' });

  const {
    uploading, analyzing, status, companyScores, jobScores,
    extractedData, ollamaHealth, error,
    askLoading, chatHistory,
    uploadResume, analyzeResume, askQuestion,
    clearError, clearChat, startPolling,
    fetchVersions, compareResumes,
  } = useResumeAI();

  const refreshVersions = useCallback(async () => {
    const list = await fetchVersions();
    setVersions(list);
    return list;
  }, [fetchVersions]);

  useEffect(() => { refreshVersions(); }, [refreshVersions]);
  useEffect(() => { if (status?.status === 'analyzed') refreshVersions(); }, [status?.status, refreshVersions]);

  const openCompare = () => {
    if (versions.length < 2) return;
    setComparePair({ a: versions[1].resumeId, b: versions[0].resumeId });
    setCompareOpen(true);
  };

  const avgScore = useMemo(() => {
    if (!jobScores.length) return 0;
    const sum = jobScores.reduce((acc, j) => acc + (j.score || 0), 0);
    return Math.round(sum / jobScores.length);
  }, [jobScores]);

  const suggestions = useMemo(() => {
    if (!jobScores.length) return [];
    const missingCount = new Map();
    jobScores.forEach((j) => {
      (j.missingSkills || []).forEach((skill) => {
        missingCount.set(skill, (missingCount.get(skill) || 0) + 1);
      });
    });
    return [...missingCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count]) => ({ skill, count }));
  }, [jobScores]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or DOCX file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be under 10 MB.');
      return;
    }
    try {
      await uploadResume(file);
    } catch {}
  }, [uploadResume]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    try {
      startPolling();
      await analyzeResume();
    } catch {}
  };

  const displayedJobs = showAllJobs ? jobScores : jobScores.slice(0, 8);

  const initials = (user?.name || 'S')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-stone-50 text-zinc-900 font-sans">
      {/* Top bar */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white font-heading font-bold text-sm">N</span>
            <div className="hidden sm:block">
              <p className="font-heading font-bold text-sm tracking-tight leading-none">
                Nexus<span className="text-emerald-600">.</span>
              </p>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">Resume intelligence</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <button onClick={() => navigate('/dashboard/student')} className="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
              Dashboard
            </button>
            <button className="px-3 py-1.5 rounded-md text-zinc-900 bg-zinc-100 font-medium">Resume AI</button>
            <button onClick={() => navigate('/interviews')} className="px-3 py-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
              Interviews
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs rounded-full border border-zinc-200 bg-white px-2.5 py-1">
              <span className={`w-2 h-2 rounded-full ${ollamaHealth?.healthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-zinc-600">
                {ollamaHealth?.healthy ? `AI online · ${ollamaHealth.model}` : 'AI offline'}
              </span>
            </span>
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white text-xs font-semibold">
                {initials}
              </div>
              <button onClick={logout} className={`${btnGhost} ml-1`}>Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Resume intelligence</p>
          <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                Your resume, <span className="italic font-medium text-zinc-700">quantified.</span>
              </h1>
              <p className="mt-1 text-sm text-zinc-500 max-w-lg">
                Upload once — we extract your skills, education and experience, then score you against every open role.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={openCompare}
                disabled={versions.length < 2}
                title={versions.length < 2 ? 'Upload and analyze a second resume to enable comparison' : ''}
                className={btnGhost}
              >
                Compare versions
              </button>
              <button onClick={() => navigate('/dashboard/student')} className={btnGhost}>
                ← Dashboard
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-700 hover:text-red-900 font-semibold">×</button>
          </div>
        )}

        {/* Upload + readiness */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Section
            className="lg:col-span-2"
            title="Upload resume"
            subtitle="PDF or DOCX · max 10 MB"
            action={status?.status && status.status !== 'none' ? <StatusIndicator status={status.status} /> : null}
          >
            <div
              className={`rounded-md border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/60'
                  : 'border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-zinc-500" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-800">
                {uploading ? 'Uploading…' : 'Drop your resume here or click to browse'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">We never share your document.</p>
            </div>

            {status?.status && status.status !== 'none' && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {status.filename}{' '}
                    <span className="text-xs text-zinc-500 font-normal">v{status.version}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Ready to analyze with AI.</p>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || ['parsing', 'extracted'].includes(status.status)}
                  className={btnAccent}
                >
                  {analyzing ? 'Analyzing…' : 'Analyze with AI'}
                </button>
              </div>
            )}

            {analyzing && (
              <div className="mt-4">
                <Spinner label="Extracting and scoring your resume — this may take 30–60 seconds." />
                <div className="mt-2 w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}
          </Section>

          <Section title="Readiness score" subtitle={jobScores.length ? `Averaged across ${jobScores.length} roles` : 'Score appears once analyzed'}>
            {jobScores.length > 0 ? (
              <div className="py-2">
                <ReadinessGauge score={avgScore} />
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6h13m-13 6h-4V5h4m0 6h13V5H9m0 12v-6" />
                  </svg>
                </div>
                <p className="mt-3 text-sm text-zinc-500">Upload and analyze a resume to see your readiness score.</p>
              </div>
            )}
          </Section>
        </div>

        {/* Extracted profile */}
        {extractedData && (
          <Section title="Extracted profile" subtitle="What the AI pulled from your resume">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Skills ({extractedData.skills?.length || 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(extractedData.skills || []).map((skill) => (
                    <span key={skill} className="px-2 py-0.5 text-xs rounded border border-zinc-200 bg-zinc-100 text-zinc-700">
                      {skill}
                    </span>
                  ))}
                  {!extractedData.skills?.length && <span className="text-xs text-zinc-400">Not found.</span>}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Education</p>
                {(extractedData.education || []).map((edu, i) => (
                  <p key={i} className="text-sm text-zinc-800 leading-relaxed">
                    {edu.degree}{edu.field && ` in ${edu.field}`}
                    {edu.institution && <span className="text-zinc-500"> — {edu.institution}</span>}
                    {edu.year > 0 && <span className="text-zinc-500"> ({edu.year})</span>}
                  </p>
                ))}
                {!extractedData.education?.length && <p className="text-xs text-zinc-400">Not found.</p>}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Experience</p>
                <p className="text-sm text-zinc-800">
                  {extractedData.totalExperienceMonths
                    ? `${Math.round(extractedData.totalExperienceMonths / 12 * 10) / 10} years total`
                    : 'Not found.'}
                </p>
                {(extractedData.certifications || []).length > 0 && (
                  <>
                    <p className="text-xs uppercase tracking-wider text-zinc-500 mt-4 mb-1">Certifications</p>
                    <ul className="space-y-0.5">
                      {extractedData.certifications.map((cert, i) => (
                        <li key={i} className="text-sm text-zinc-700">· {cert}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Company rankings + suggestions */}
        {companyScores.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Section title="Company rankings" subtitle="Best-fit companies based on your profile">
                <ul className="space-y-3">
                  {companyScores.slice(0, 8).map((company, idx) => {
                    const isOpen = expandedCompany === idx;
                    return (
                      <li
                        key={company.company}
                        className="rounded-md border border-zinc-200 bg-white hover:border-zinc-300 transition"
                      >
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                          onClick={() => setExpandedCompany(isOpen ? null : idx)}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="font-heading font-bold text-zinc-400 w-6 tabular-nums text-sm">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-900 truncate">{company.company}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {company.jobCount || 1} role{company.jobCount > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`font-heading text-2xl font-bold tabular-nums ${scoreTextClass(company.score)}`}>
                              {Math.round(company.score)}%
                            </span>
                            <svg viewBox="0 0 24 24" fill="none" className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                            </svg>
                          </div>
                        </button>
                        {isOpen && company.factors && (
                          <div className="border-t border-zinc-100 px-4 py-3 space-y-2 bg-zinc-50/60">
                            <FactorBar label="Skills" value={company.factors.skills || 0} />
                            <FactorBar label="Experience" value={company.factors.experience || 0} />
                            <FactorBar label="Salary" value={company.factors.salary || 0} />
                            <FactorBar label="Education" value={company.factors.education || 0} />
                            <FactorBar label="Projects" value={company.factors.projects || 0} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Section>
            </div>

            <Section title="Improve your score" subtitle="Skills that would lift multiple matches">
              {suggestions.length > 0 ? (
                <ul className="space-y-2">
                  {suggestions.map(({ skill, count }) => (
                    <li
                      key={skill}
                      className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2"
                    >
                      <span className="text-sm font-medium text-zinc-900 capitalize">{skill}</span>
                      <span className="text-xs text-zinc-500">
                        needed by {count} role{count > 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">Analyze your resume to get personalized suggestions.</p>
              )}
            </Section>
          </div>
        )}

        {/* Job breakdown */}
        {jobScores.length > 0 && (
          <Section
            title="Job fit breakdown"
            subtitle={`${jobScores.length} scored role${jobScores.length > 1 ? 's' : ''}`}
            action={
              jobScores.length > 8 ? (
                <button
                  onClick={() => setShowAllJobs(!showAllJobs)}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 transition"
                >
                  {showAllJobs ? 'Show less' : `Show all ${jobScores.length}`}
                </button>
              ) : null
            }
          >
            <div className="overflow-x-auto -mx-5 sm:-mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                    <th className="px-5 sm:px-6 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium text-right">Score</th>
                    <th className="px-3 py-2 font-medium">Matched skills</th>
                    <th className="px-5 sm:px-6 py-2 font-medium">Missing skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {displayedJobs.map((job) => (
                    <tr key={job.jobId?._id || job.jobId} className="hover:bg-zinc-50">
                      <td className="px-5 sm:px-6 py-3 font-medium text-zinc-900">
                        {job.jobId?.title || job.jobTitle || '—'}
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        {job.jobId?.company || job.company || '—'}
                      </td>
                      <td className={`px-3 py-3 text-right font-bold tabular-nums ${scoreTextClass(job.score)}`}>
                        {Math.round(job.score)}%
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(job.matchedSkills || []).slice(0, 4).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 text-[10px] rounded border border-emerald-200 bg-emerald-50 text-emerald-800">
                              {s}
                            </span>
                          ))}
                          {(job.matchedSkills || []).length > 4 && (
                            <span className="text-[10px] text-zinc-500">+{job.matchedSkills.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 sm:px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(job.missingSkills || []).slice(0, 4).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 text-[10px] rounded border border-amber-200 bg-amber-50 text-amber-800">
                              {s}
                            </span>
                          ))}
                          {(job.missingSkills || []).length > 4 && (
                            <span className="text-[10px] text-zinc-500">+{job.missingSkills.length - 4}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Assistant */}
        {status?.status === 'analyzed' && (
          <Section
            title="Placement advisor"
            subtitle="Answers only from your resume and available jobs"
            action={
              chatHistory.length > 0 ? (
                <button onClick={clearChat} className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition">
                  Clear chat
                </button>
              ) : null
            }
          >
            <AskAssistantLight
              chatHistory={chatHistory}
              askLoading={askLoading}
              onAsk={askQuestion}
              onClear={clearChat}
            />
          </Section>
        )}

        {/* Privacy footer */}
        <p className="text-center text-xs text-zinc-500 pt-2">
          All processing happens on our servers under your account. Your document is not shared.
        </p>
      </main>

      <LightModal
        open={compareOpen}
        title="Compare versions"
        subtitle="Diff two resume uploads to see what changed"
        onClose={() => setCompareOpen(false)}
      >
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Before (A)</label>
              <select
                value={comparePair.a}
                onChange={(e) => setComparePair((prev) => ({ ...prev, a: e.target.value }))}
                className={inputBase}
              >
                {versions.map((v) => (
                  <option key={`a-${v.resumeId}`} value={v.resumeId}>
                    v{v.version} · {v.filename} · avg {v.avgScore}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">After (B)</label>
              <select
                value={comparePair.b}
                onChange={(e) => setComparePair((prev) => ({ ...prev, b: e.target.value }))}
                className={inputBase}
              >
                {versions.map((v) => (
                  <option key={`b-${v.resumeId}`} value={v.resumeId}>
                    v{v.version} · {v.filename} · avg {v.avgScore}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          {comparePair.a === comparePair.b ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Choose two different versions to compare.
            </p>
          ) : (
            <ResumeCompareView
              resumeA={comparePair.a}
              resumeB={comparePair.b}
              onClose={() => setCompareOpen(false)}
              compareResumes={compareResumes}
              versions={versions}
            />
          )}
        </div>
      </LightModal>
    </div>
  );
};

export default ResumeIntelligence;
