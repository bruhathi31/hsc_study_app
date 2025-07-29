"use client"

import React, { useState } from 'react';
import HomePage from '../components/Home';
import Questions from '../components/Questions';
import ReportPage from '../components/ReportPage';

// Main App Component
export default function Page() {
  // Determines which page to display
  const [currentPage, setCurrentPage] = useState<'home' | 'study' | 'report'>('home');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Handler functions
  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setCurrentPage('study');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setSelectedTopic(null);
  };

  const handleGenerateReport = () => {
    setCurrentPage('report');
  };

  // Render the appropriate component based on the current page
  let pageContent;
  switch (currentPage) {
    case 'home':
      pageContent = <HomePage onTopicSelect={handleTopicSelect} onGenerateReport={handleGenerateReport} />;
      break;
    case 'study':
      pageContent = <Questions topic={selectedTopic} onBackToHome={handleBackToHome} />;
      break;
    case 'report':
      pageContent = <ReportPage onBackToHome={handleBackToHome} />;
      break;
    default:
      pageContent = <HomePage onTopicSelect={handleTopicSelect} onGenerateReport={handleGenerateReport} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      {pageContent}
    </div>
  );
}
