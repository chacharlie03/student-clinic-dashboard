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
    const { className, weekNumber, namesText } = await request.json();

    const names = namesText
      .split(/[\n,]+/)
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0);

    await supabase
      .from('student_logs')
      .update({ is_retest: false })
      .eq('class_name', className)
      .eq('week_number', weekNumber);

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