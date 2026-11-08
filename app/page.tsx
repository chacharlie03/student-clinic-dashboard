'use client';

import { useState, useEffect } from 'react';

const CLASSES = ['중대1(금)', '중대1(토)', '중산1(토)', '중산1(일)'];

export default function Dashboard() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(1);
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

  // 일정 직접 입력 및 실시간 저장
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

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6 font-sans">
      {/* 상단 컨트롤 바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold">주차별 전 반 조건 대상자 집계 대시보드</h1>
          <p className="text-xs text-slate-400 mt-1">모든 대상자 명단이 가나다(오름차순) 순으로 정렬되어 위에서부터 촘촘하게 표시됩니다.</p>
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

      {syncStatus && <div className="p-3 bg-blue-50 text-blue-800 text-xs font-medium rounded-lg">{syncStatus}</div>}

      {/* 주차 선택 탭 */}
      <div className="flex items-center gap-2 border-b pb-4">
        <span className="text-xs font-bold text-slate-500 mr-2">주차 선택:</span>
        {[1, 2, 3, 4, 5, 6].map((w) => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedWeek === w ? 'bg-slate-800 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {w}주차
          </button>
        ))}
      </div>

      {/* 4개 반 집계 표 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CLASSES.map((className) => {
          const classLogs = logs.filter((l) => l.class_name === className);

          // 1. 각 조건별 학생 명단 추출 및 가나다(오름차순) 정렬 (.sort(localeCompare))
          const hwMissingNames = classLogs
            .filter((l) => l.is_hw_missing)
            .map((l) => l.student_name)
            .sort((a, b) => a.localeCompare(b, 'ko'));

          const retestNames = classLogs
            .filter((l) => l.is_retest)
            .map((l) => l.student_name)
            .sort((a, b) => a.localeCompare(b, 'ko'));

          const hwRemediationNames = classLogs
            .filter((l) => l.is_hw_missing && l.is_retest)
            .map((l) => l.student_name)
            .sort((a, b) => a.localeCompare(b, 'ko'));

          const reqHwMissingNames = classLogs
            .filter((l) => l.is_req_hw_missing)
            .map((l) => l.student_name)
            .sort((a, b) => a.localeCompare(b, 'ko'));

          // F열: 클리닉 대상자 (C ∪ E) 객체 배열을 가나다순 정렬
          const clinicTargetStudents = classLogs
            .filter((l) => l.is_retest || l.is_req_hw_missing)
            .sort((a, b) => a.student_name.localeCompare(b.student_name, 'ko'));

          // 2. 가장 긴 목록의 행 개수 계산
          const maxRows = Math.max(
            hwMissingNames.length,
            retestNames.length,
            hwRemediationNames.length,
            reqHwMissingNames.length,
            clinicTargetStudents.length
          );

          return (
            <div key={className} className="bg-white border rounded-xl shadow-sm overflow-hidden space-y-3 p-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-slate-800 text-base">
                  {className} <span className="text-xs font-normal text-slate-500">({selectedWeek}주차)</span>
                </h3>
                <button
                  onClick={() => {
                    setRetestInputClass(className);
                    setRetestText(retestNames.join('\n'));
                  }}
                  className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded hover:bg-purple-200"
                >
                  📋 재시험 명단 붙여넣기
                </button>
              </div>

              {/* 오름차순 정렬 표 */}
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-2.5 border-r">복습과제 미수행</th>
                      <th className="p-2.5 border-r">재시험자</th>
                      <th className="p-2.5 border-r">복습과제 대상</th>
                      <th className="p-2.5 border-r">필수과제 미달</th>
                      <th className="p-2.5 border-r">클리닉 대상자</th>
                      <th className="p-2.5">일정 (수기입력)</th>
                    </tr>
                  </thead>
                  <tbody className="align-top divide-y">
                    {maxRows === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-400">
                          해당 주차 조건 대상자가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      Array.from({ length: maxRows }).map((_, idx) => {
                        const clinicStudent = clinicTargetStudents[idx];

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            {/* B열: 복습 과제 미수행자 (가나다순) */}
                            <td className="p-2 border-r font-medium text-orange-700">
                              {hwMissingNames[idx] || ''}
                            </td>

                            {/* C열: 재시험자 (가나다순) */}
                            <td className="p-2 border-r font-medium text-purple-700">
                              {retestNames[idx] || ''}
                            </td>

                            {/* D열: 복습 과제 대상자 (가나다순) */}
                            <td className="p-2 border-r font-medium text-blue-700">
                              {hwRemediationNames[idx] || ''}
                            </td>

                            {/* E열: 필수 과제 미달자 (가나다순) */}
                            <td className="p-2 border-r font-medium text-red-700">
                              {reqHwMissingNames[idx] || ''}
                            </td>

                            {/* F열: 클리닉 대상자 (가나다순) */}
                            <td className="p-2 border-r font-bold text-rose-800 bg-rose-50/50">
                              {clinicStudent ? clinicStudent.student_name : ''}
                            </td>

                            {/* G열: 일정 수기 입력 (가나다순 정렬된 F열 학생 매핑) */}
                            <td className="p-1.5">
                              {clinicStudent && (
                                <input
                                  type="text"
                                  placeholder="예: 오늘, 토 10시"
                                  className="w-full p-1 border rounded text-xs bg-white text-slate-800 focus:border-blue-500"
                                  value={clinicStudent.clinic_schedule || ''}
                                  onChange={(e) =>
                                    handleScheduleChange(clinicStudent.id, e.target.value)
                                  }
                                />
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
          );
        })}
      </div>

      {/* 재시험 명단 복사-붙여넣기 팝업 창 */}
      {retestInputClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-sm">
              [{retestInputClass} {selectedWeek}주차] 재시험 명단 붙여넣기
            </h3>
            <p className="text-xs text-gray-500">
              엑셀이나 카카오톡에서 복사한 학생 이름 목록을 아래에 붙여넣으세요. (줄바꿈 또는 쉼표 구분)
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