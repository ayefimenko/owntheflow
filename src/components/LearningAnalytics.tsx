'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const LearningAnalytics: React.FC = () => {
  const { userProfile } = useAuth();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Learning Analytics</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Personal analytics dashboard coming soon...</p>
        <p className="text-sm text-gray-500 mt-2">
          Track your progress, view insights, and get personalized recommendations.
        </p>
      </div>
    </div>
  );
};

export default LearningAnalytics; 