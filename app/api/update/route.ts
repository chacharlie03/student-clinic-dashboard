import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://wznkoeycvchvuspzjzxz.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_E2mkgGdDmJ-gMf8uEGmL3w_261Gut2a';
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
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