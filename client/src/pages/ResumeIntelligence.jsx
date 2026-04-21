import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AskAssistant from '../components/AskAssistant';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useResumeAI } from '../hooks/useResumeAI';

// ── Score color helper ──
const scoreColor = (score) => {
  if (score >= 80) return 'text-success';
  if (score >= 55) return 'text-intel-blue-light';
  if (score >= 35) return 'text-warning';
  return 'text-error';
};

const scoreBg = (score) => {
  if (score >= 80) return 'bg-success';
  if (score >= 55) return 'bg-intel-blue';
  if (score >= 35) return 'bg-warning';
  return 'bg-error';
};

// ── Factor Bar ──
const FactorBar = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-400 w-20 shrink-0">{label}</span>
    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${scoreBg(value)}`}
        style={{ width: `${Math.max(2, value)}%` }}
      />
    </div>
    <span className={`text-xs font-mono w-9 text-right ${scoreColor(value)}`}>
      {Math.round(value)}%
    </span>
  </div>
);

// ── Circular Gauge ──
const ReadinessGauge = ({ score, label = 'Overall Readiness' }) => {
  const value = Math.max(0, Math.min(100, Number(score || 0)));
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="54"
            fill="none" stroke="#1e293b" strokeWidth="10"
          />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={value >= 80 ? '#10B981' : value >= 55 ? '#1A73E8' : value >= 35 ? '#F59E0B' : '#EF4444'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${scoreColor(value)}`}>
            {Math.round(value)}%
          </span>
        </div>
      </div>
      <p className="text-sm text-slate-400 mt-2">{label}</p>
    </div>
  );
};

// ── Status indicator ──
const StatusIndicator = ({ status }) => {
  const statusConfig = {
    none: { label: 'No Resume', color: 'bg-slate-600', pulse: false },
    uploaded: { label: 'Uploaded', color: 'bg-intel-blue', pulse: false },
    parsing: { label: 'Parsing...', color: 'bg-warning', pulse: true },
    extracted: { label: 'Extracted', color: 'bg-intel-blue', pulse: false },
    analyzed: { label: 'Analyzed', color: 'bg-success', pulse: false },
    failed: { label: 'Failed', color: 'bg-error', pulse: false },
  };

  const config = statusConfig[status] || statusConfig.none;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-slate-300">{config.label}</span>
    </span>
  );
};

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

const ResumeIntelligence = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [showAllJobs, setShowAllJobs] = useState(false);

  const {
    uploading, analyzing, status, companyScores, jobScores,
    extractedData, ollamaHealth, error,
    askLoading, chatHistory,
    uploadResume, analyzeResume, askQuestion,
    clearError, clearChat, startPolling,
  } = useResumeAI();

  // ── Average score ──
  const avgScore = useMemo(() => {
    if (!jobScores.length) return 0;
    const sum = jobScores.reduce((acc, j) => acc + (j.score || 0), 0);
    return Math.round(sum / jobScores.length);
  }, [jobScores]);

  // ── Improvement suggestions ──
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

  // ── File handling ──
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
    } catch {
      // error is set in the hook
    }
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
    } catch {
      // error set in hook
    }
  };

  const displayedJobs = showAllJobs ? jobScores : jobScores.slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider text-intel-blue-light">Resume Intelligence</p>
            <h1 className="text-3xl font-heading font-bold">AI Career Analyzer</h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload your resume and get personalized company & job fit scores — all processed locally.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Ollama health */}
            <span className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${ollamaHealth?.healthy ? 'bg-success' : 'bg-error'}`} />
              <span className="text-slate-400">
                {ollamaHealth?.healthy ? `AI: ${ollamaHealth.model}` : 'AI: Offline'}
              </span>
            </span>
            <Button variant="ghost" onClick={() => navigate('/dashboard/student')}>
              ← Dashboard
            </Button>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error rounded-portal px-4 py-3 flex items-center justify-between">
            <p className="text-sm">{error}</p>
            <button onClick={clearError} className="text-error hover:text-white text-sm">×</button>
          </div>
        )}

        {/* ── Upload & Status Row ── */}
        <section className="grid lg:grid-cols-3 gap-5">

          {/* Upload Zone */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-heading font-bold">Upload Resume</h2>
              {status?.status && status.status !== 'none' && (
                <StatusIndicator status={status.status} />
              )}
            </div>

            <div
              className={`border-2 border-dashed rounded-portal p-8 text-center transition-colors cursor-pointer
                ${dragActive
                  ? 'border-intel-blue bg-intel-blue/5'
                  : 'border-slate-700 hover:border-slate-500'
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

              <div className="text-4xl mb-3">📄</div>
              <p className="text-slate-300 text-sm mb-1">
                {uploading ? 'Uploading...' : 'Drag & drop your resume here, or click to browse'}
              </p>
              <p className="text-slate-500 text-xs">PDF or DOCX • Max 10 MB</p>
            </div>

            {status?.status && status.status !== 'none' && (
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">
                    {status.filename} <span className="text-slate-500">v{status.version}</span>
                  </p>
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || ['parsing', 'extracted'].includes(status.status)}
                >
                  {analyzing ? 'Analyzing...' : '🔍 Analyze with AI'}
                </Button>
              </div>
            )}

            {analyzing && (
              <div className="mt-4">
                <LoadingSpinner label="AI is extracting and scoring your resume... This may take 30–60 seconds." />
                <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-intel-blue h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}
          </Card>

          {/* Readiness Score */}
          <Card className="flex flex-col items-center justify-center">
            {jobScores.length > 0 ? (
              <>
                <ReadinessGauge score={avgScore} />
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Average fit across {jobScores.length} jobs
                </p>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-3 opacity-30">📊</div>
                <p className="text-slate-400 text-sm">Upload & analyze your resume to see your readiness score</p>
              </div>
            )}
          </Card>
        </section>

        {/* ── Extracted Skills ── */}
        {extractedData && (
          <Card>
            <h2 className="text-xl font-heading font-bold mb-3">Extracted Profile</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">Skills ({extractedData.skills?.length || 0})</p>
                <div className="flex flex-wrap gap-1.5">
                  {(extractedData.skills || []).map((skill) => (
                    <span key={skill} className="px-2 py-0.5 text-xs rounded-full bg-intel-blue/20 text-intel-blue-light border border-intel-blue/30">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2">Education</p>
                {(extractedData.education || []).map((edu, i) => (
                  <p key={i} className="text-sm text-slate-300">
                    {edu.degree} {edu.field && `in ${edu.field}`} {edu.institution && `— ${edu.institution}`} {edu.year > 0 && `(${edu.year})`}
                  </p>
                ))}
                {!extractedData.education?.length && <p className="text-xs text-slate-500">Not found</p>}
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2">Experience</p>
                <p className="text-sm text-slate-300">
                  {extractedData.totalExperienceMonths
                    ? `${Math.round(extractedData.totalExperienceMonths / 12 * 10) / 10} years total`
                    : 'Not found'}
                </p>
                {(extractedData.certifications || []).length > 0 && (
                  <>
                    <p className="text-sm text-slate-400 mt-2 mb-1">Certifications</p>
                    {extractedData.certifications.map((cert, i) => (
                      <p key={i} className="text-xs text-slate-300">• {cert}</p>
                    ))}
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* ── Company Rankings & Suggestions ── */}
        {companyScores.length > 0 && (
          <section className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <Card>
                <h2 className="text-xl font-heading font-bold mb-4">Company Rankings</h2>
                <div className="space-y-3">
                  {companyScores.slice(0, 8).map((company, idx) => (
                    <div
                      key={company.company}
                      className="bg-slate-800/50 rounded-portal p-4 border border-slate-800 hover:border-slate-600 transition cursor-pointer"
                      onClick={() => setExpandedCompany(expandedCompany === idx ? null : idx)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-slate-500 w-6">#{idx + 1}</span>
                          <div>
                            <p className="font-semibold text-slate-100">{company.company}</p>
                            <p className="text-xs text-slate-400">{company.jobCount || 1} job{company.jobCount > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold ${scoreColor(company.score)}`}>
                            {Math.round(company.score)}%
                          </span>
                          <span className="text-slate-500 text-sm">{expandedCompany === idx ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {expandedCompany === idx && company.factors && (
                        <div className="mt-4 space-y-2 pt-3 border-t border-slate-700">
                          <FactorBar label="Skills" value={company.factors.skills || 0} />
                          <FactorBar label="Experience" value={company.factors.experience || 0} />
                          <FactorBar label="Salary" value={company.factors.salary || 0} />
                          <FactorBar label="Education" value={company.factors.education || 0} />
                          <FactorBar label="Projects" value={company.factors.projects || 0} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Improvement Suggestions */}
            <Card>
              <h3 className="font-heading font-bold text-lg mb-3">🎯 Improve Your Score</h3>
              {suggestions.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm">
                    Adding these skills could boost your average match across multiple jobs:
                  </p>
                  {suggestions.map(({ skill, count }) => (
                    <div key={skill} className="flex items-center justify-between bg-slate-800/50 rounded-portal px-3 py-2">
                      <span className="text-sm text-warning font-medium">{skill}</span>
                      <span className="text-xs text-slate-500">needed by {count} job{count > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Analyze your resume to get personalized suggestions.</p>
              )}
            </Card>
          </section>
        )}

        {/* ── Job Breakdown Table ── */}
        {jobScores.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-bold">Job Fit Breakdown</h2>
              {jobScores.length > 8 && (
                <button
                  onClick={() => setShowAllJobs(!showAllJobs)}
                  className="text-xs text-intel-blue-light hover:text-intel-blue transition"
                >
                  {showAllJobs ? 'Show less' : `Show all ${jobScores.length}`}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-3">Job</th>
                    <th className="py-2 pr-3">Company</th>
                    <th className="py-2 pr-3 text-right">Score</th>
                    <th className="py-2 pr-3">Matched Skills</th>
                    <th className="py-2">Missing Skills</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedJobs.map((job) => (
                    <tr key={job.jobId?._id || job.jobId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 pr-3 font-medium">{job.jobId?.title || job.jobTitle || '—'}</td>
                      <td className="py-3 pr-3 text-slate-300">{job.jobId?.company || job.company || '—'}</td>
                      <td className={`py-3 pr-3 text-right font-bold ${scoreColor(job.score)}`}>
                        {Math.round(job.score)}%
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {(job.matchedSkills || []).slice(0, 4).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 text-[10px] rounded-full bg-success/15 text-success border border-success/30">
                              {s}
                            </span>
                          ))}
                          {(job.matchedSkills || []).length > 4 && (
                            <span className="text-[10px] text-slate-500">+{job.matchedSkills.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {(job.missingSkills || []).slice(0, 4).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 text-[10px] rounded-full bg-warning/15 text-warning border border-warning/30">
                              {s}
                            </span>
                          ))}
                          {(job.missingSkills || []).length > 4 && (
                            <span className="text-[10px] text-slate-500">+{job.missingSkills.length - 4}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── AI Assistant ── */}
        {status?.status === 'analyzed' && (
          <Card>
            <AskAssistant
              chatHistory={chatHistory}
              askLoading={askLoading}
              onAsk={askQuestion}
              onClear={clearChat}
            />
          </Card>
        )}

        {/* ── Privacy Footer ── */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-600 flex items-center justify-center gap-2">
            <span>🔒</span>
            All processing happens locally. No data leaves your machine.
          </p>
        </div>
      </div>
    </main>
  );
};

export default ResumeIntelligence;
