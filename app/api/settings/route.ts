import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://wznkoeycvchvuspzjzxz.supabase.co';
const DEFAULT_KEY = 'sb_publishable_E2mkgGdDmJ-gMf8uEGmL3w_261Gut2a';
const DEFAULT_OPTIONS = ['수업 후', '토요일 10시', '목 4시'];

function getSupabase() {
  let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  let key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

  if (typeof url === 'string') url = url.trim().replace(/^["']|["']$/g, '');
  if (typeof key === 'string') key = key.trim().replace(/^["']|["']$/g, '');

  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) url = DEFAULT_URL;
  if (!key) key = DEFAULT_KEY;

  return createClient(url, key);
}

// DB에서 일정 옵션 불러오기
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'schedule_options')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({
      options: Array.isArray(data?.value) ? data.value : DEFAULT_OPTIONS,
    });
  } catch (err: any) {
    console.error('Settings GET error:', err);
    return NextResponse.json({ options: DEFAULT_OPTIONS });
  }
}

// DB에 일정 옵션 저장하기
export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const { options } = await request.json();

    if (!Array.isArray(options)) {
      return NextResponse.json({ error: 'Invalid options format' }, { status: 400 });
    }

    const { error } = await supabase.from('app_settings').upsert({
      key: 'schedule_options',
      value: options,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ success: true, options });
  } catch (err: any) {
    console.error('Settings POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}