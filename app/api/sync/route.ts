import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CLASSES = ['중대1(금)', '중대1(토)', '중산1(토)', '중산1(일)'];
const WEEKS = [1, 2, 3, 4, 5, 6];

export async function POST(request: Request) {
  try {
    const { spreadsheetId } = await request.json();
    if (!spreadsheetId) {
      return NextResponse.json({ error: '스프레드시트 ID가 필요합니다.' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'google-key.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheetTitles = (spreadsheetInfo.data.sheets || [])
      .map(s => s.properties?.title)
      .filter((title): title is string => Boolean(title));

    // 기존 수기 입력 데이터(일정, 재시험여부) 백업
    const { data: existingLogs } = await supabase.from('student_logs').select('*');
    const existingMap = new Map<string, { is_retest: boolean; schedule: string }>();
    if (existingLogs) {
      existingLogs.forEach(item => {
        const key = `${item.class_name}_${item.week_number}_${item.student_name}`;
        existingMap.set(key, { is_retest: item.is_retest, schedule: item.clinic_schedule || '' });
      });
    }

    const allLogs: any[] = [];
    let syncedSheetsCount = 0;

    for (const className of CLASSES) {
      for (const week of WEEKS) {
        const sheetTitle = `${className} ${week}주차`;
        if (!existingSheetTitles.includes(sheetTitle)) continue;

        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetTitle}'!E2:J`,
          });

          const rows = response.data.values || [];
          for (const row of rows) {
            const name = row[0] ? String(row[0]).trim() : '';
            if (!name) continue;

            const taskA = Number(row[2] || 0);
            const taskB = Number(row[3] || 0);
            const taskC = Number(row[4] || 0);
            const reviewTask = Number(row[5] || 0);

            const totalScore = taskA + taskB + taskC;

            // 기존 백업값 불러오기
            const backupKey = `${className}_${week}_${name}`;
            const backup = existingMap.get(backupKey);

            allLogs.push({
              class_name: className,
              week_number: week,
              student_name: name,
              is_hw_missing: reviewTask === 0,
              is_req_hw_missing: totalScore < 18,
              is_retest: backup ? backup.is_retest : false,
              clinic_schedule: backup ? backup.schedule : '',
            });
          }
          syncedSheetsCount++;
        } catch (e) {
          continue;
        }
      }
    }

    await supabase.from('student_logs').delete().neq('id', 0);
    if (allLogs.length > 0) {
      const { error } = await supabase.from('student_logs').insert(allLogs);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: `동기화 완료! 총 ${syncedSheetsCount}개 시트 (${allLogs.length}건 데이터) 수집 완료.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}