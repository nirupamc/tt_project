import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';

// GET employee's timesheets
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: timesheets, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        project:projects(id, title)
      `)
      .eq('user_id', session.user.id)
      .order('work_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json(timesheets || []);
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return NextResponse.json(
      { message: 'Failed to fetch timesheets' },
      { status: 500 }
    );
  }
}
