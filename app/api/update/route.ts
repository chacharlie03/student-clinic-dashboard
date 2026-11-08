import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { id, is_retest, clinic_schedule } = await request.json();

    const { data, error } = await supabase
      .from('student_logs')
      .update({ is_retest, clinic_schedule })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, updated: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}