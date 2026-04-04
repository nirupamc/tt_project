import { Badge } from '@/components/ui/badge';
import type { TaskType } from '@/types';
import { FileText, Code, HelpCircle, Video } from 'lucide-react';

const taskTypeConfig: Record<TaskType, { icon: React.ReactNode; color: string; label: string }> = {
  reading: {
    icon: <FileText className="h-3 w-3" />,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    label: 'Reading',
  },
  coding: {
    icon: <Code className="h-3 w-3" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    label: 'Coding',
  },
  quiz: {
    icon: <HelpCircle className="h-3 w-3" />,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    label: 'Quiz',
  },
  video: {
    icon: <Video className="h-3 w-3" />,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    label: 'Video',
  },
};

interface TaskBadgeProps {
  type: TaskType;
  showIcon?: boolean;
  className?: string;
}

export function TaskBadge({ type, showIcon = true, className }: TaskBadgeProps) {
  const config = taskTypeConfig[type];

  return (
    <Badge variant="secondary" className={`${config.color} ${className}`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
