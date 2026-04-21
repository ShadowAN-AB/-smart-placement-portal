import { useRef, useState } from 'react';
import Button from './common/Button';

const EXAMPLE_PROMPTS = [
  'Why is my score low for TCS?',
  'What skills should I learn to improve?',
  'Which company matches my projects best?',
  'How does my experience compare to job requirements?',
  'What certifications would help my profile?',
];

const AskAssistant = ({ chatHistory, askLoading, onAsk, onClear }) => {
  const [question, setQuestion] = useState('');
  const chatEndRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || askLoading) return;
    onAsk(question.trim());
    setQuestion('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleExampleClick = (prompt) => {
    setQuestion(prompt);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-intel-blue to-purple-500 text-white text-xs">
              AI
            </span>
            Placement Advisor
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">Answers only from your resume & available jobs</p>
        </div>
        {chatHistory.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Chat body */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[120px] max-h-[400px] pr-1 scrollbar-thin">
        {chatHistory.length === 0 && (
          <div className="text-center py-6">
            <p className="text-slate-400 text-sm mb-3">Try asking a question:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleExampleClick(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 
                    hover:border-intel-blue hover:text-intel-blue-light transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.type === 'user'
                  ? 'bg-intel-blue text-white rounded-br-md'
                  : 'bg-slate-800 text-slate-200 rounded-bl-md border border-slate-700'
              }`}
            >
              {msg.type === 'ai' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-br from-intel-blue to-purple-500 inline-block" />
                  {msg.fromContext && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success border border-success/30">
                      From Context
                    </span>
                  )}
                  {msg.confidence === 'low' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning border border-warning/30">
                      Low Confidence
                    </span>
                  )}
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {askLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-intel-blue animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-intel-blue animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-intel-blue animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="text-xs text-slate-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your resume, scores, or career..."
          disabled={askLoading}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-portal px-4 py-2.5 text-sm text-slate-100
            placeholder:text-slate-500 focus:outline-none focus:border-intel-blue transition
            disabled:opacity-50"
        />
        <Button type="submit" disabled={askLoading || !question.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
};

export default AskAssistant;
