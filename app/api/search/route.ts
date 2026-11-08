import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wznkoeycvchvuspzjzxz.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_E2mkgGdDmJ-gMf8uEGmL3w_261Gut2a';
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const { data, error } = await supabase
      .from('student_logs')
      .select('*')
      .ilike('student_name', `%${query}%`)
      .order('student_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ results: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}