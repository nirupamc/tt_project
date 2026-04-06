"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Flame, TrendingUp } from "lucide-react";

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
    <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
      <CardHeader>
        <CardTitle className="font-space text-sm font-medium text-[rgba(10,10,10,0.6)] flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#FFD700]" />
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
              stroke="rgba(255,215,0,0.15)"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <motion.circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#FFD700"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="font-bebas text-4xl text-[#0A0A0A]"
            >
              {percentage.toFixed(0)}%
            </motion.div>
            <div className="font-space text-xs text-[rgba(10,10,10,0.5)] mt-1">of target</div>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full space-y-2 mb-4">
          <div className="flex items-center justify-between font-space text-sm">
            <span className="text-[rgba(10,10,10,0.6)]">Current Hours</span>
            <span className="font-semibold text-[#0A0A0A]">
              {weeklyHours.toFixed(1)}h
            </span>
          </div>
          <div className="flex items-center justify-between font-space text-sm">
            <span className="text-[rgba(10,10,10,0.6)]">Target Hours</span>
            <span className="font-semibold text-[#0A0A0A]">{targetHours}h</span>
          </div>
          <div className="flex items-center justify-between font-space text-sm">
            <span className="text-[rgba(10,10,10,0.6)] flex items-center gap-1">
              <Flame className="h-3 w-3 text-[#FFD700]" />
              Streak
            </span>
            <span className="font-semibold text-[#0A0A0A]">{streak} days</span>
          </div>
        </div>

        {/* View Link */}
        <Link
          href="/dashboard/timesheet"
          className="w-full text-center font-space text-sm text-[#C8A800] hover:text-[#FFD700] font-medium flex items-center justify-center gap-1"
        >
          <TrendingUp className="h-4 w-4" />
          View full timesheet
        </Link>
      </CardContent>
    </Card>
  );
}
