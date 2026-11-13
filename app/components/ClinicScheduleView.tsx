'use client';

interface StudentLog {
  id: number;
  class_name: string;
  student_name: string;
  clinic_schedule?: string;
  is_retest: boolean;
  is_req_hw_missing: boolean;
}

interface ClinicScheduleViewProps {
  logs: StudentLog[];
  selectedWeek: number;
}

// 시트 이름/반 이름에서 학교 추출 (예: '중대1(금)' -> '중대', '중산1(토)' -> '중산')
function extractSchoolName(className: string): string {
  const match = className.match(/^(중대|중산|[가-힣A-Za-z0-9]+?)(?=\d|\()/);
  return match ? match[1] : className;
}

export default function ClinicScheduleView({ logs, selectedWeek }: ClinicScheduleViewProps) {
  // 클리닉 대상자 중 일정이 잡힌 학생 필터링
  const scheduledStudents = logs.filter(
    (l) => (l.is_retest || l.is_req_hw_missing) && l.clinic_schedule
  );

  // 목요일 및 토요일 일정 학생 분리
  const thursdayStudents = scheduledStudents
    .filter((l) => l.clinic_schedule?.includes('목'))
    .sort((a, b) => a.student_name.localeCompare(b.student_name, 'ko'));

  const saturdayStudents = scheduledStudents
    .filter((l) => l.clinic_schedule?.includes('토'))
    .sort((a, b) => a.student_name.localeCompare(b.student_name, 'ko'));

  const otherStudents = scheduledStudents
    .filter((l) => !l.clinic_schedule?.includes('목') && !l.clinic_schedule?.includes('토'))
    .sort((a, b) => a.student_name.localeCompare(b.student_name, 'ko'));

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs">
        📌 <strong>{selectedWeek}주차 목/토 클리닉 방문 예정 명단</strong>입니다. (학교명은 수업 이름에서 자동으로 추출됩니다)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 목요일 방문 명단 */}
        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <span>🗓️ 목요일 클리닉</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                {thursdayStudents.length}명
              </span>
            </h3>
          </div>
          {thursdayStudents.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">목요일 클리닉 학생이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {thursdayStudents.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs"
                >
                  <span className="font-bold text-slate-800">
                    [{extractSchoolName(s.class_name)}] {s.student_name}
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                    {s.clinic_schedule}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 토요일 방문 명단 */}
        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <span>🗓️ 토요일 클리닉</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {saturdayStudents.length}명
              </span>
            </h3>
          </div>
          {saturdayStudents.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">토요일 클리닉 학생이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {saturdayStudents.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs"
                >
                  <span className="font-bold text-slate-800">
                    [{extractSchoolName(s.class_name)}] {s.student_name}
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                    {s.clinic_schedule}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 기타 일정 (수업 후 등) */}
      {otherStudents.length > 0 && (
        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-3">
          <h4 className="font-bold text-slate-700 text-xs">기타 일정 (수업 후 등)</h4>
          <div className="flex flex-wrap gap-2">
            {otherStudents.map((s) => (
              <span
                key={s.id}
                className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded border"
              >
                [{extractSchoolName(s.class_name)}] {s.student_name} ({s.clinic_schedule})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}