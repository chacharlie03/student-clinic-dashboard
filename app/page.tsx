'use client';

import { useState, useEffect } from 'react';

const CLASSES = ['중대1(금)', '중대1(토)', '중산1(토)', '중산1(일)'];
const SCHEDULE_OPTIONS = ['수업 후', '토 10시', '목 4시'];

export default function Dashboard() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedClass, setSelectedClass] = useState('중대1(금)');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // 재시험 명단 복사-붙여넣기 팝업 상태
  const [retestInputClass, setRetestInputClass] = useState<string | null>(null);
  const [retestText, setRetestText] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes?week=${selectedWeek}`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedWeek]);

  // 구글 시트 전체 동기화
  const handleSyncAll = async () => {
    if (!spreadsheetId) {
      alert('스프레드시트 ID를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setSyncStatus('구글 시트 데이터 수집 중...');

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId }),
      });

      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setSyncStatus(data.message);
        fetchLogs();
      } else {
        setSyncStatus(`동기화 실패: ${data.error}`);
      }
    } catch (err: any) {
      setLoading(false);
      setSyncStatus(`동기화 오류: ${err.message}`);
    }
  };

  // 일정 직접 선택 및 실시간 저장 (드롭다운)
  const handleScheduleChange = async (id: number, clinic_schedule: string) => {
    setLogs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, clinic_schedule } : item))
    );

    const target = logs.find((l) => l.id === id);
    if (target) {
      await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_retest: target.is_retest, clinic_schedule }),
      });
    }
  };

  // 재시험 명단 복사-붙여넣기 적용
  const handleApplyRetestNames = async () => {
    if (!retestInputClass) return;
    setLoading(true);

    await fetch('/api/retest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        className: retestInputClass,
        weekNumber: selectedWeek,
        namesText: retestText,
      }),
    });

    setRetestInputClass(null);
    setRetestText('');
    fetchLogs();
  };

  // 현재 선택된 반의 logs
  const classLogs = logs.filter((l) => l.class_name === selectedClass);

  // 각 조건별 학생 명단 추출 및 가나다(오름차순) 정렬
  const retestNames = classLogs
    .filter((l) => l.is_retest)
    .map((l) => l.student_name)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const hwMissingNames = classLogs
    .filter((l) => l.is_hw_missing)
    .map((l) => l.student_name)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const reqHwMissingNames = classLogs
    .filter((l) => l.is_req_hw_missing)
    .map((l) => l.student_name)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const hwRemediationNames = classLogs
    .filter((l) => l.is_hw_missing && l.is_retest)
    .map((l) => l.student_name)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const clinicTargetStudents = classLogs
    .filter((l) => l.is_retest || l.is_req_hw_missing)
    .sort((a, b) => a.student_name.localeCompare(b.student_name, 'ko'));

  const maxRows = Math.max(
    retestNames.length,
    hwMissingNames.length,
    reqHwMissingNames.length,
    hwRemediationNames.length,
    clinicTargetStudents.length
  );

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6 font-sans">
      {/* 상단 컨트롤 바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold">주차별 전 반 조건 대상자 집계 대시보드</h1>
          <p className="text-xs text-slate-400 mt-1">
            선택된 반의 대상자 명단이 오름차순으로 정렬되어 깔끔하게 표시됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="스프레드시트 ID 입력"
            className="p-2 text-sm rounded bg-slate-800 text-white border border-slate-700 w-72 focus:outline-none"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
          />
          <button
            onClick={handleSyncAll}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-sm font-semibold rounded hover:bg-blue-500 disabled:bg-slate-700 whitespace-nowrap"
          >
            전체 동기화
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="p-3 bg-blue-50 text-blue-800 text-xs font-medium rounded-lg">
          {syncStatus}
        </div>
      )}

      {/* 필터 조율 바: 주차 선택 및 반 선택 */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        {/* 주차 선택 탭 */}
        <div className="flex items-center gap-2 border-b pb-3">
          <span className="text-xs font-bold text-slate-500 w-16">주차 선택:</span>
          <div className="flex gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5, 6].map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedWeek === w
                    ? 'bg-slate-800 text-white shadow'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {w}주차
              </button>
            ))}
          </div>
        </div>

        {/* 반 선택 탭 */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-500 w-16">수업 선택:</span>
          <div className="flex gap-1.5 flex-wrap">
            {CLASSES.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedClass(c)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedClass === c
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 선택된 반 집계 단독 표 */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-bold text-slate-900 text-lg">{selectedClass}</h2>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {selectedWeek}주차
            </span>
          </div>
          <button
            onClick={() => {
              setRetestInputClass(selectedClass);
              setRetestText(retestNames.join('\n'));
            }}
            className="px-3.5 py-1.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-200 transition-colors"
          >
            📋 재시험 명단 붙여넣기
          </button>
        </div>

        {/* 개선된 업무 순서 표 (선생님 확인 영역 색상 강조) */}
        <div className="border rounded-lg overflow-x-auto shadow-inner">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b text-slate-700 font-bold">
                <th className="p-3 border-r bg-slate-50 w-1/6">테스트 미달</th>
                <th className="p-3 border-r bg-slate-50 w-1/6">복습 미달</th>
                <th className="p-3 border-r bg-slate-50 w-1/6">필수 미달</th>
                {/* 💡 선생님 확인 영역 (우측 강조 영역) */}
                <th className="p-3 border-r bg-blue-100 text-blue-900 w-1/6">
                  복습 대상 ⭐
                </th>
                <th className="p-3 border-r bg-rose-100 text-rose-900 w-1/6">
                  클리닉 대상 ⭐
                </th>
                <th className="p-3 bg-amber-100 text-amber-900 w-1/6">
                  일정 (선택) ⭐
                </th>
              </tr>
            </thead>
            <tbody className="align-top divide-y">
              {maxRows === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400 font-medium">
                    해당 주차/반에 조건 대상자가 없습니다.
                  </td>
                </tr>
              ) : (
                Array.from({ length: maxRows }).map((_, idx) => {
                  const clinicStudent = clinicTargetStudents[idx];

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. 테스트 미달 (재시험자) */}
                      <td className="p-2.5 border-r font-medium text-purple-700 bg-purple-50/30">
                        {retestNames[idx] || ''}
                      </td>

                      {/* 2. 복습 미달 (복습과제 미수행) */}
                      <td className="p-2.5 border-r font-medium text-orange-700 bg-orange-50/30">
                        {hwMissingNames[idx] || ''}
                      </td>

                      {/* 3. 필수 미달 (필수과제 미달) */}
                      <td className="p-2.5 border-r font-medium text-red-700 bg-red-50/30">
                        {reqHwMissingNames[idx] || ''}
                      </td>

                      {/* 4. 복습 대상 (선생님 영역 - 파란색 배경 강조) */}
                      <td className="p-2.5 border-r font-bold text-blue-800 bg-blue-50/80">
                        {hwRemediationNames[idx] || ''}
                      </td>

                      {/* 5. 클리닉 대상 (선생님 영역 - 분홍색 배경 강조) */}
                      <td className="p-2.5 border-r font-bold text-rose-800 bg-rose-50/80">
                        {clinicStudent ? clinicStudent.student_name : ''}
                      </td>

                      {/* 6. 일정 드롭다운 선택지 (선생님 영역 - 노란색 배경 강조) */}
                      <td className="p-1.5 bg-amber-50/60">
                        {clinicStudent && (
                          <select
                            className="w-full p-1.5 border border-amber-300 rounded text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                            value={clinicStudent.clinic_schedule || ''}
                            onChange={(e) =>
                              handleScheduleChange(clinicStudent.id, e.target.value)
                            }
                          >
                            <option value="">선택 안 함</option>
                            {SCHEDULE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 재시험 명단 복사-붙여넣기 팝업 창 */}
      {retestInputClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-sm">
              [{retestInputClass} {selectedWeek}주차] 재시험 명단 붙여넣기
            </h3>
            <p className="text-xs text-gray-500">
              엑셀이나 카카오톡에서 복사한 학생 이름 목록을 아래에 붙여넣으세요. (줄바꿈 구분)
            </p>
            <textarea
              rows={8}
              className="w-full p-3 border rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500"
              placeholder={'강진영\n고은호\n곽율아'}
              value={retestText}
              onChange={(e) => setRetestText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRetestInputClass(null)}
                className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleApplyRetestNames}
                className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-500"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}