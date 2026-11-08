import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://wznkoeycvchvuspzjzxz.supabase.co';
const DEFAULT_KEY = 'sb_publishable_E2mkgGdDmJ-gMf8uEGmL3w_261Gut2a';

function getSupabase() {
  let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  let key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

  if (typeof url === 'string') url = url.trim().replace(/^["']|["']$/g, '');
  if (typeof key === 'string') key = key.trim().replace(/^["']|["']$/g, '');

  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) url = DEFAULT_URL;
  if (!key) key = DEFAULT_KEY;

  return createClient(url, key);
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const week = weekParam ? Number(weekParam) : 1;

    // Supabase 데이터베이스 조회
    const { data, error } = await supabase
      .from('student_logs')
      .select('*')
      .eq('week_number', week)
      .order('student_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ logs: data || [] });
  } catch (err: any) {
    console.error('Fetch classes logs error:', err);
    return NextResponse.json({ error: err.message, logs: [] }, { status: 500 });
  }
}