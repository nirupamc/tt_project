import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';

// GET tasks for a specific day
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; day: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, day: dayNumber } = await params;
    const supabase = createAdminClient();

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('project_id', projectId)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { message: 'You are not enrolled in this project' },
        { status: 403 }
      );
    }

    // Get project day
    const { data: projectDay, error: dayError } = await supabase
      .from('project_days')
      .select('*')
      .eq('project_id', projectId)
      .eq('day_number', parseInt(dayNumber))
      .single();

    if (dayError || !projectDay) {
      return NextResponse.json(
        { message: 'Day not found' },
        { status: 404 }
      );
    }

    // Get tasks for this day
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_day_id', projectDay.id)
      .order('created_at', { ascending: true });

    // Get user's completions for these tasks
    const taskIds = tasks?.map((t) => t.id) || [];
    const { data: completions } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', session.user.id)
      .in('task_id', taskIds);

    const completionMap = new Map(completions?.map((c) => [c.task_id, c]) || []);

    // Attach completion status to tasks
    const tasksWithCompletion = tasks?.map((task) => ({
      ...task,
      completion: completionMap.get(task.id) || null,
    }));

    return NextResponse.json({
      day: projectDay,
      tasks: tasksWithCompletion || [],
    });
  } catch (error) {
    console.error('Error fetching day tasks:', error);
    return NextResponse.json(
      { message: 'Failed to fetch day tasks' },
      { status: 500 }
    );
  }
}
