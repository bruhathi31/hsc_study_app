"use client"
import React, { useState, useEffect } from 'react';
import { Home, TrendingUp, Brain, AlertCircle, CheckCircle, Clock, Award, Download, RefreshCw, BookOpen } from 'lucide-react';

// API functions for report generation
const API_BASE_URL = 'http://localhost:8000'; // Adjust this to your FastAPI server URL

const fetchAllAttempts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/attempts`);
    if (!response.ok) {
      throw new Error('Failed to fetch attempts');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching attempts:', error);
    return [];
  }
};

const generateAIReport = async (attempts: Attempt[]) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attempts }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate AI report');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error generating AI report:', error);
    throw error;
  }
};

type Attempt = {
  id: number;
  question_id: number;
  error_type: string;
  explanation: string | null;
  question: { topic: string; question_id: number };
  timestamp: string;
};

type TopicStats = {
  topic: string;
  attempted: number;
  correct: number;
  accuracy: number;
};

type Stats = {
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  sillyMistakes: number;
  conceptErrors: number;
  topicBreakdown: TopicStats[];
};

type ReportPageProps = {
  onBackToHome: () => void;
};

export default function ReportPage({ onBackToHome }: ReportPageProps) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [aiReport, setAiReport] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    totalCorrect: 0,
    accuracy: 0,
    sillyMistakes: 0,
    conceptErrors: 0,
    topicBreakdown: [],
  });

  // Load attempts and generate report
  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch from backend, fallback to mock data
      let fetchedAttempts = await fetchAllAttempts();
    
      
      setAttempts(fetchedAttempts);
      calculateStats(fetchedAttempts);
      
      // Generate AI report
      await generateReport(fetchedAttempts);
      
    } catch (err) {
      setError('Failed to load report data');
      
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (attemptsData: Attempt[]) => {
    setGenerating(true);
    
    try {
      const report = await generateAIReport(attemptsData);
      setAiReport(report.report);
    } catch (err) {
      console.error('Using mock AI report due to error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const calculateStats = (attemptsData: ({ id: number; question_id: number; error_type: string; explanation: string; question: { topic: string; question_id: number; }; timestamp: string; } | { id: number; question_id: number; error_type: string; explanation: null; question: { topic: string; question_id: number; }; timestamp: string; })[]) => {
    const totalQuestions = attemptsData.length;
    const totalCorrect = attemptsData.filter(a => a.error_type === 'none').length;
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const sillyMistakes = attemptsData.filter(a => a.error_type === 'silly').length;
    const conceptErrors = attemptsData.filter(a => a.error_type === 'concept').length;

    // Group by topic
    const topicMap: { [topic: string]: { attempted: number; correct: number } } = {};
    attemptsData.forEach((attempt: { question: { topic: string; }; error_type: string; }) => {
      const topic = attempt.question?.topic || 'Unknown';
      if (!topicMap[topic]) {
        topicMap[topic] = { attempted: 0, correct: 0 };
      }
      topicMap[topic].attempted++;
      if (attempt.error_type === 'none') {
        topicMap[topic].correct++;
      }
    });

    const topicBreakdown = Object.entries(topicMap).map(([topic, data]) => ({
      topic,
      attempted: data.attempted,
      correct: data.correct,
      accuracy: Math.round((data.correct / data.attempted) * 100)
    }));

    setStats({
      totalQuestions,
      totalCorrect,
      accuracy,
      sillyMistakes,
      conceptErrors,
      topicBreakdown
    });
  };

  const formatAIReport = (report: string) => {
    const lines = report.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        // Main headings
        return (
          <h3 key={index} className="text-lg font-bold text-gray-800 mt-6 mb-3">
            {line.replace(/\*\*/g, '')}
          </h3>
        );
      } else if (line.startsWith('- **') && line.includes('**:')) {
        // Sub-points with bold labels
        const parts = line.split('**:');
        const label = parts[0].replace('- **', '');
        const content = parts[1];
        return (
          <div key={index} className="mb-2">
            <span className="font-semibold text-purple-700">• {label}:</span>
            <span className="text-gray-700">{content}</span>
          </div>
        );
      } else if (line.startsWith('•')) {
        // Bullet points
        return (
          <div key={index} className="mb-1 text-gray-700 ml-4">
            {line}
          </div>
        );
      } else if (line.trim() === '') {
        return <div key={index} className="mb-2" />;
      } else {
        return (
          <p key={index} className="text-gray-700 mb-2">
            {line}
          </p>
        );
      }
    });
  };

  const exportReport = () => {
    const reportText = `STUDY REVISION REPORT
Generated on: ${new Date().toLocaleDateString()}

STATISTICS:
- Total Questions: ${stats.totalQuestions}
- Correct Answers: ${stats.totalCorrect}
- Overall Accuracy: ${stats.accuracy}%
- Silly Mistakes: ${stats.sillyMistakes}
- Concept Errors: ${stats.conceptErrors}

TOPIC BREAKDOWN:
${stats.topicBreakdown.map(topic => 
  `- ${topic.topic}: ${topic.correct}/${topic.attempted} (${topic.accuracy}%)`
).join('\n')}

AI ANALYSIS:
${aiReport}`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full h-screen  bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <p className="text-xl text-gray-600">Generating your personalized report...</p>
          <p className="text-gray-500 mt-2">Analyzing your practice data with AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Study Report</h1>
              <p className="text-gray-600">AI-powered analysis of your learning progress</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => generateReport(attempts)}
              disabled={generating}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Regenerating...' : 'Regenerate'}</span>
            </button>
            <button
              onClick={exportReport}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Export</span>
            </button>
            <button
              onClick={onBackToHome}
              className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">Total Questions</h3>
                <p className="text-2xl font-bold text-purple-600">{stats.totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">Silly Mistakes</h3>
                <p className="text-2xl font-bold text-orange-600">{stats.sillyMistakes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">Concept Errors</h3>
                <p className="text-2xl font-bold text-red-600">{stats.conceptErrors}</p>
              </div>
            </div>
          </div>
        </div>

          

          {/* AI Analysis */}
          <div className=" w-full h-screen bg-white rounded-2xl shadow-xl p-8 border border-purple-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Brain className="w-6 h-6 mr-2 text-purple-500" />
              AI Analysis & Recommendations
            </h2>
            
            {generating ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">AI is analyzing your mistakes...</p>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {formatAIReport(aiReport)}
              </div>
            )}
          </div>
        </div>

        {/* Recent Mistakes */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-purple-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Clock className="w-6 h-6 mr-2 text-purple-500" />
            Recent Mistakes
          </h2>
          
          <div className="space-y-4">
            {attempts.filter(a => a.error_type !== 'none').slice(0, 5).map((attempt, index) => (
              <div key={index} className={`p-4 rounded-xl border ${
                attempt.error_type === 'silly' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      attempt.error_type === 'silly' 
                        ? 'bg-orange-200 text-orange-800' 
                        : 'bg-red-200 text-red-800'
                    }`}>
                      {attempt.error_type === 'silly' ? 'Silly Mistake' : 'Concept Error'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{attempt.question?.topic}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(attempt.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className={`text-sm ${
                  attempt.error_type === 'silly' ? 'text-orange-700' : 'text-red-700'
                }`}>
                  {attempt.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
  );
}