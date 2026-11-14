import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://wznkoeycvchvuspzjzxz.supabase.co';
const DEFAULT_KEY = 'sb_publishable_E2mkgGdDmJ-gMf8uEGmL3w_261Gut2a';

const CLASSES = ['중대1(금)', '중대1(토)', '중산1(토)', '중산1(일)'];
const WEEKS = [1, 2, 3, 4, 5, 6];

function getSupabase() {
  let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  let key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

  if (typeof url === 'string') url = url.trim().replace(/^["']|["']$/g, '');
  if (typeof key === 'string') key = key.trim().replace(/^["']|["']$/g, '');

  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) url = DEFAULT_URL;
  if (!key) key = DEFAULT_KEY;

  return createClient(url, key);
}

// 빈칸/공백/비숫자(결석 등) 여부를 엄격하게 걸러내는 숫자 파서
function parseValidScore(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const trimmed = String(val).trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
}

export async function POST(request: Request) {
  try {
    const { spreadsheetId } = await request.json();
    if (!spreadsheetId) {
      return NextResponse.json({ error: '스프레드시트 ID가 필요합니다.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. 기존 DB에 저장된 수기 입력 데이터(일정, 확정 상태, 재시험 여부) 백업 조회
    const { data: existingLogs, error: fetchError } = await supabase
      .from('student_logs')
      .select('class_name, week_number, student_name, is_retest, clinic_schedule, is_confirmed');

    if (fetchError) throw fetchError;

    const preservedMap = new Map<
      string,
      { is_retest: boolean; clinic_schedule: string; is_confirmed: boolean }
    >();

    if (existingLogs) {
      for (const row of existingLogs) {
        const key = `${row.class_name}_${row.week_number}_${row.student_name}`;
        preservedMap.set(key, {
          is_retest: Boolean(row.is_retest),
          clinic_schedule: row.clinic_schedule || '',
          is_confirmed: Boolean(row.is_confirmed),
        });
      }
    }

    const newRecords: any[] = [];

    // 2. 공개 구글 시트 gviz JSON 엔드포인트로 시트별 데이터 조회
    for (const className of CLASSES) {
      for (const week of WEEKS) {
        const targetSheetName = `${className} ${week}주차`;
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          targetSheetName
        )}`;

        const res = await fetch(url);
        if (!res.ok) continue;

        const text = await res.text();
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.status === 'error') continue;

        const rows = parsed.table?.rows || [];

        for (const rowObj of rows) {
          const cells = rowObj.c || [];
          // B열(index 1): 학생 이름
          const studentName = (cells[1]?.v ?? '').toString().trim();
          if (!studentName || studentName === '이름' || studentName === '학생명') continue;

          // J열(index 9): 복습과제 점수, K열(index 10): 필수과제 점수
          const hwScore = parseValidScore(cells[9]?.v);
          const reqHwScore = parseValidScore(cells[10]?.v);

          // 빈칸(null)이나 문자("결석" 등)는 제외하고, 유효 숫자가 있을 때만 미달 판정
          const isHwMissing = hwScore !== null && hwScore === 0;
          const isReqHwMissing = reqHwScore !== null && reqHwScore < 18;

          // 3. 기존 백업 데이터와 병합
          const key = `${className}_${week}_${studentName}`;
          const saved = preservedMap.get(key);

          newRecords.push({
            class_name: className,
            week_number: week,
            student_name: studentName,
            is_hw_missing: isHwMissing,
            is_req_hw_missing: isReqHwMissing,
            is_retest: saved ? saved.is_retest : false,
            clinic_schedule: saved ? saved.clinic_schedule : '',
            is_confirmed: saved ? saved.is_confirmed : false,
          });
        }
      }
    }

    if (newRecords.length === 0) {
      return NextResponse.json(
        { error: '시트에서 데이터를 찾지 못했습니다. 시트 공유 설정(링크가 있는 모든 사용자 뷰어)과 시트 탭 이름을 확인해 주세요.' },
        { status: 400 }
      );
    }

    // 4. 기존 데이터 교체 저장
    const { error: deleteError } = await supabase.from('student_logs').delete().neq('id', 0);
    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase.from('student_logs').insert(newRecords);
    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: `동기화 완료! 총 ${newRecords.length}건 반영 (결석/빈칸 제외 및 확정 상태 보존됨)`,
    });
  } catch (err: any) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}