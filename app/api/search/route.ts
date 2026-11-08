import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: '학생 이름을 입력해 주세요.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('student_logs')
    .select('*')
    .eq('student_name', name)
    .order('week_number', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stats = {
    totalRecords: data.length,
    clinicCount: data.filter(i => i.is_clinic_target).length,
    hwMissingCount: data.filter(i => i.is_hw_missing).length,
    reqHwMissingCount: data.filter(i => i.is_req_hw_missing).length,
    history: data,
  };

  return NextResponse.json(stats);
}