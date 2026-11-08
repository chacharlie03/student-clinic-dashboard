import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wznkoeycvchvuspzjzxz.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_E2mkgGdDmJ-gMf8uEGmL3w_261Gut2a';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') ? Number(searchParams.get('week')) : 1;

    const { data, error } = await supabase
      .from('student_logs')
      .select('*')
      .eq('week_number', week)
      .order('student_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ logs: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}