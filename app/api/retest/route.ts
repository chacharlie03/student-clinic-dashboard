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

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const { className, weekNumber, namesText } = await request.json();

    const inputNames = namesText
      .split(/[\n,]+/)
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0);

    // 1. 해당 반/주차 전체 학생의 is_retest를 일단 false로 초기화 (1회 쿼리)
    await supabase
      .from('student_logs')
      .update({ is_retest: false })
      .eq('class_name', className)
      .eq('week_number', Number(weekNumber));

    // 2. 입력받은 학생이 있으면 in 쿼리로 한 번에 is_retest = true 업데이트 (1회 쿼리)
    if (inputNames.length > 0) {
      await supabase
        .from('student_logs')
        .update({ is_retest: true })
        .eq('class_name', className)
        .eq('week_number', Number(weekNumber))
        .in('student_name', inputNames);
    }

    return NextResponse.json({ success: true, count: inputNames.length });
  } catch (err: any) {
    console.error('Retest update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}