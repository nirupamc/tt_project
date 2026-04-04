'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Flame, TrendingUp } from 'lucide-react';

interface TimesheetWidgetProps {
  weeklyHours: number;
  targetHours?: number;
  streak: number;
}

export function TimesheetWidget({
  weeklyHours,
  targetHours = 35,
  streak,
}: TimesheetWidgetProps) {
  const percentage = Math.min((weeklyHours / targetHours) * 100, 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Weekly Timesheet
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* Circular Progress Ring */}
        <div className="relative w-44 h-44 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <motion.circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#6366f1"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-4xl font-bold text-gray-900"
            >
              {percentage.toFixed(0)}%
            </motion.div>
            <div className="text-xs text-gray-500 mt-1">of target</div>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current Hours</span>
            <span className="font-semibold text-gray-900">{weeklyHours.toFixed(1)}h</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Target Hours</span>
            <span className="font-semibold text-gray-900">{targetHours}h</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              Streak
            </span>
            <span className="font-semibold text-gray-900">{streak} days</span>
          </div>
        </div>

        {/* View Link */}
        <Link
          href="/dashboard/timesheet"
          className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1"
        >
          <TrendingUp className="h-4 w-4" />
          View full timesheet
        </Link>
      </CardContent>
    </Card>
  );
}
