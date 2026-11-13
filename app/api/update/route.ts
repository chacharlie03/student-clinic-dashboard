import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

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

function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Service Account 환경변수(GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)가 누락되었습니다.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function POST(request: Request) {
  try {
    const { spreadsheetId } = await request.json();
    if (!spreadsheetId) {
      return NextResponse.json({ error: '스프레드시트 ID가 필요합니다.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const sheets = getGoogleSheetsClient();

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

    // 2. 스프레드시트 메타데이터에서 실제 시트 탭 목록 조회
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = new Set(
      meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) as string[]
    );

    const newRecords: any[] = [];

    for (const className of CLASSES) {
      for (const week of WEEKS) {
        const targetSheetName = `${className} ${week}주차`;
        if (!sheetTitles.has(targetSheetName)) continue;

        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${targetSheetName}'!A2:Z100`,
        });

        const rows = res.data.values || [];
        for (const row of rows) {
          // B열(index 1): 학생 이름, J열(index 9): 복습과제, K열(index 10): 필수과제 점수 기준
          const studentName = (row[1] || '').trim();
          if (!studentName) continue;

          const hwVal = row[9];
          const reqHwVal = row[10];

          const isHwMissing = hwVal !== undefined && hwVal !== '' && Number(hwVal) === 0;
          const isReqHwMissing =
            reqHwVal !== undefined && reqHwVal !== '' && !isNaN(Number(reqHwVal)) && Number(reqHwVal) < 18;

          // 3. 기존 백업 데이터와 병합 (확정 상태, 일정, 재시험 여부 유지)
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

    // 4. 기존 데이터 교체 저장 (수기 확정 상태가 병합된 상태로 저장됨)
    if (newRecords.length > 0) {
      const { error: deleteError } = await supabase
        .from('student_logs')
        .delete()
        .neq('id', 0);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from('student_logs').insert(newRecords);
      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: `동기화 완료! 총 ${newRecords.length}건 반영 (기존 일정 및 확정 상태 보존됨)`,
    });
  } catch (err: any) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}