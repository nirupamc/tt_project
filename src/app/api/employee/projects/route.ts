import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';

// GET employee's enrolled projects
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get enrollments with project details
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('user_id', session.user.id);

    if (error) throw error;

    // For each project, calculate progress
    const projectsWithProgress = await Promise.all(
      (enrollments || []).map(async (enrollment) => {
        const project = enrollment.project;
        if (!project) return null;

        // Get total days with tasks
        const { count: totalDays } = await supabase
          .from('project_days')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        // Get completed days (where all required tasks are done)
        const { data: completedTasks } = await supabase
          .from('task_completions')
          .select('project_day_id')
          .eq('user_id', session.user.id);

        const completedDayIds = new Set(completedTasks?.map((t) => t.project_day_id) || []);

        return {
          ...project,
          progress: {
            completed_days: completedDayIds.size,
            total_days: totalDays || project.total_days,
          },
        };
      })
    );

    return NextResponse.json(projectsWithProgress.filter(Boolean));
  } catch (error) {
    console.error('Error fetching employee projects:', error);
    return NextResponse.json(
      { message: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
