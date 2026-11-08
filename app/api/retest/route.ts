import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { className, weekNumber, namesText } = await request.json();

    // 쉼표, 줄바꿈, 공백 기준으로 이름 배열 생성
    const names = namesText
      .split(/[\n,]+/)
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0);

    // 해당 반/주차의 기존 재시험 상태 초기화
    await supabase
      .from('student_logs')
      .update({ is_retest: false })
      .eq('class_name', className)
      .eq('week_number', weekNumber);

    // 입력받은 이름들에 대해 재시험 설정 (없으면 신규 생성)
    for (const name of names) {
      const { data } = await supabase
        .from('student_logs')
        .select('id')
        .eq('class_name', className)
        .eq('week_number', weekNumber)
        .eq('student_name', name);

      if (data && data.length > 0) {
        await supabase
          .from('student_logs')
          .update({ is_retest: true })
          .eq('id', data[0].id);
      } else {
        await supabase.from('student_logs').insert({
          class_name: className,
          week_number: weekNumber,
          student_name: name,
          is_retest: true,
        });
      }
    }

    return NextResponse.json({ success: true, count: names.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}