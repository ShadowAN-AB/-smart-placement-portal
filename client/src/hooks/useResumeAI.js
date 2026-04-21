import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';

const TOKEN_KEY = 'spp_token';

/**
 * Custom hook for managing the entire Resume AI lifecycle:
 * upload → analyze → poll status → fetch scores → ask questions
 */
export const useResumeAI = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState(null); // { status, filename, version, uploadedAt }
  const [companyScores, setCompanyScores] = useState([]);
  const [jobScores, setJobScores] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [ollamaHealth, setOllamaHealth] = useState(null);
  const [error, setError] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const pollRef = useRef(null);

  // ── Check Ollama health ──
  const checkHealth = useCallback(async () => {
    try {
      const data = await apiRequest('/api/ai/health');
      setOllamaHealth(data);
      return data;
    } catch {
      setOllamaHealth({ healthy: false, error: 'Cannot reach AI service' });
      return null;
    }
  }, []);

  // ── Get current resume status ──
  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiRequest('/api/ai/resume/status');
      setStatus(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // ── Upload a resume file ──
  const uploadResume = useCallback(async (file) => {
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const token = localStorage.getItem(TOKEN_KEY);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || ''}/api/ai/resume/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      await fetchStatus();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [fetchStatus]);

  // ── Analyze the latest resume ──
  const analyzeResume = useCallback(async (resumeId) => {
    setError('');
    setAnalyzing(true);

    try {
      const body = resumeId ? { resumeId } : {};
      const data = await apiRequest('/api/ai/resume/analyze', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // Auto-fetch scores after successful analysis
      await Promise.all([fetchCompanyScores(), fetchJobScores()]);
      await fetchStatus();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  // ── Fetch company fit scores ──
  const fetchCompanyScores = useCallback(async () => {
    try {
      const data = await apiRequest('/api/ai/fit/companies');
      setCompanyScores(data.companyFitScores || []);
      return data;
    } catch {
      // Not an error if no analysis exists yet
      return null;
    }
  }, []);

  // ── Fetch job fit scores ──
  const fetchJobScores = useCallback(async () => {
    try {
      const data = await apiRequest('/api/ai/fit/jobs');
      setJobScores(data.jobFitScores || []);
      setExtractedData(data.extractedData || null);
      return data;
    } catch {
      return null;
    }
  }, []);

  // ── Ask AI a question ──
  const askQuestion = useCallback(async (question) => {
    setAskLoading(true);
    try {
      const data = await apiRequest('/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question }),
      });

      setChatHistory((prev) => [
        ...prev,
        { type: 'user', text: question },
        {
          type: 'ai',
          text: data.answer,
          fromContext: data.fromContext,
          confidence: data.confidence,
        },
      ]);

      return data;
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { type: 'user', text: question },
        { type: 'ai', text: err.message, fromContext: false, confidence: 'none' },
      ]);
      throw err;
    } finally {
      setAskLoading(false);
    }
  }, []);

  // ── Poll status while analyzing ──
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const data = await fetchStatus();
      if (data && ['analyzed', 'failed', 'none'].includes(data.status)) {
        clearInterval(pollRef.current);
        pollRef.current = null;

        if (data.status === 'analyzed') {
          await Promise.all([fetchCompanyScores(), fetchJobScores()]);
        }
      }
    }, 2000);
  }, [fetchStatus, fetchCompanyScores, fetchJobScores]);

  // ── Clear polling on unmount ──
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Initial load ──
  useEffect(() => {
    fetchStatus();
    checkHealth();
    fetchCompanyScores();
    fetchJobScores();
  }, [fetchStatus, checkHealth, fetchCompanyScores, fetchJobScores]);

  return {
    // State
    uploading,
    analyzing,
    status,
    companyScores,
    jobScores,
    extractedData,
    ollamaHealth,
    error,
    askLoading,
    chatHistory,

    // Actions
    uploadResume,
    analyzeResume,
    fetchStatus,
    fetchCompanyScores,
    fetchJobScores,
    askQuestion,
    checkHealth,
    startPolling,
    clearError: () => setError(''),
    clearChat: () => setChatHistory([]),
  };
};
