import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Check, X, BookOpen, Clock, Award, Home } from 'lucide-react';

// API functions
const API_BASE_URL = 'http://localhost:8000'; // Adjust this to your FastAPI server URL

const fetchQuestionsByTopic = async (topic: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions_by_topic/${encodeURIComponent(topic)}`);
    console.log("Fetching questions for response:", response);
    if (!response.ok) {
      throw new Error('Failed to fetch questions');
    }
    const data = await response.json();
    console.log("Fetched questions for topic:", topic, data);
    return data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
};

const submitAttempt = async (
  questionId: number,
  errorType: string | null = null,
  explanation: string | null = null
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question_id: questionId,
        error_type: errorType,
        explanation: explanation,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit attempt');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting attempt:', error);
    throw error;
  }
};

type Question = {
  question_id: number;
  topic: string;
  question_img: string;
  answer_img: string;
};

type QuestionsProps = {
  topic: string | null;
  onBackToHome: () => void;
};

export default function Questions({ topic, onBackToHome }: QuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [isWorking, setIsWorking] = useState<boolean>(true);
  const [answerCorrect, setAnswerCorrect] = useState<boolean | null>(null);
  const [mistakeType, setMistakeType] = useState<string>('');
  const [mistakeDescription, setMistakeDescription] = useState<string>('');
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load questions when component mounts or topic changes
  useEffect(() => {
    const loadQuestions = async () => {
      if (!topic) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const fetchedQuestions = await fetchQuestionsByTopic(topic);
        if (fetchedQuestions.length === 0) {
          setError(`No questions found for ${topic}. Please try another topic.`);
        } else {
          setQuestions(fetchedQuestions);
        }
      } catch (err) {
        setError('Failed to load questions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [topic]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const currentQuestion = questions.length > 0 ? questions[currentQuestionIndex] : null;

  const handleFinishWorking = () => {
    setIsWorking(false);
    setShowSolution(true);
  };

  const handleAnswerSubmit = async () => {
    if (!currentQuestion) return;

    try {
      // Only send attempt to backend if answer is incorrect
      if (answerCorrect === false && mistakeType) {
        await submitAttempt(
          currentQuestion.question_id,
          mistakeType,
          mistakeDescription
        );
      }
      // Move to next question or finish session
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        resetQuestionState();
      } else {
        // Session complete
        alert('Session complete! Great work! 🎉');
        if (onBackToHome) {
          onBackToHome();
        }
      }
    } catch (error) {
      alert('Failed to save your answer. Please try again.');
    }
  };

  const resetQuestionState = () => {
    setShowSolution(false);
    setIsWorking(true);
    setAnswerCorrect(null);
    setMistakeType('');
    setMistakeDescription('');
    setStartTime(Date.now());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <p className="text-xl text-gray-600">Loading {topic} questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 border border-red-100 max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => onBackToHome && onBackToHome()}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2 mx-auto"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    );
  }

  // No questions available
  if (questions.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <p className="text-xl text-gray-600">No questions available for {topic}</p>
          <button
            onClick={() => onBackToHome && onBackToHome()}
            className="mt-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2 mx-auto"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Helper to resolve image URLs
  const getQuestionImgUrl = (img: string | undefined) =>
    img ? `/questions/${img}` : '';
  const getAnswerImgUrl = (img: string | undefined) =>
    img ? `/answers/${img}` : '';

  return (
    <div className="w-full h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4 border border-purple-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onBackToHome && onBackToHome()}
                className="w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
              >
                <Home className="w-6 h-6 text-white" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Study Session
                </h1>
                <p className="text-gray-600">
                  {topic}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="w-5 h-5" />
                <span className="font-mono text-lg">
                  {formatTime(timeSpent)}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of{' '}
                {questions.length}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>
                {Math.round(
                  ((currentQuestionIndex + 1) / questions.length) * 100
                )}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((currentQuestionIndex + 1) / questions.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 h-0">
          {/* Question Panel */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-purple-100 h-full flex flex-col overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Question</h2>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {topic}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 flex-1">
              <img
                src={getQuestionImgUrl(currentQuestion?.question_img)}
                alt="Question"
                className="w-full h-auto rounded-lg shadow-sm"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  if (img.nextSibling && img.nextSibling instanceof HTMLElement) {
                    (img.nextSibling as HTMLElement).style.display = 'block';
                  }
                }}
              />
              <div style={{ display: 'none' }} className="text-center p-8 text-gray-500">
                Question image not available
              </div>
            </div>

            {isWorking ? (
              <div className="text-center">
                <button
                  onClick={handleFinishWorking}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  I'm Done Working
                </button>
                <p className="text-gray-500 text-sm mt-2">
                  Take your time to solve the problem
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                >
                  {showSolution ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                  <span>
                    {showSolution ? 'Hide Solution' : 'Show Solution'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Solution/Feedback Panel */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-purple-100 h-full flex flex-col overflow-auto">
            {showSolution ? (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Solution
                </h2>

                <div className="bg-blue-50 rounded-xl p-4">
                  <img
                    src={getAnswerImgUrl(currentQuestion?.answer_img)}
                    alt="Solution"
                    className="w-full h-auto rounded-lg shadow-sm"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      if (img.nextSibling && img.nextSibling instanceof HTMLElement) {
                        (img.nextSibling as HTMLElement).style.display = 'block';
                      }
                    }}
                  />
                  <div style={{ display: 'none' }} className="text-center p-8 text-gray-500">
                    Solution image not available
                  </div>
                </div>

                {answerCorrect === null && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-700">
                      Was your answer correct?
                    </h3>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setAnswerCorrect(true)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                      >
                        <Check className="w-5 h-5" />
                        <span>Correct</span>
                      </button>
                      <button
                        onClick={() => setAnswerCorrect(false)}
                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                      >
                        <X className="w-5 h-5" />
                        <span>Incorrect</span>
                      </button>
                    </div>
                  </div>
                )}

                {answerCorrect === false && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-700">
                      What type of mistake was it?
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setMistakeType('silly')}
                        className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          mistakeType === 'silly'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        }`}
                      >
                        Silly Mistake
                      </button>
                      <button
                        onClick={() => setMistakeType('concept')}
                        className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          mistakeType === 'concept'
                            ? 'bg-red-500 text-white shadow-lg'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        Concept Issue
                      </button>
                    </div>

                    {mistakeType && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          What did you do wrong?
                        </label>
                        <textarea
                          value={mistakeDescription}
                          onChange={(e) =>
                            setMistakeDescription(e.target.value)
                          }
                          placeholder="Describe your mistake to help improve your learning..."
                          className="w-full h-24 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
                        />
                      </div>
                    )}
                  </div>
                )}

                {(answerCorrect === true ||
                  (answerCorrect === false &&
                    mistakeType &&
                    mistakeDescription)) && (
                  <button
                    onClick={handleAnswerSubmit}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-4 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                  >
                    <Award className="w-5 h-5" />
                    <span>
                      {currentQuestionIndex < questions.length - 1
                        ? 'Next Question'
                        : 'Finish Session'}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Solution will appear here</p>
                  <p className="text-sm">
                    Click "Show Solution" when you're ready
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}