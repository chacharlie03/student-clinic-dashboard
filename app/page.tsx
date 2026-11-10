'use client';

import { useState, useEffect } from 'react';

const CLASSES = ['중대1(금)', '중대1(토)', '중산1(토)', '중산1(일)'];
const SCHEDULE_OPTIONS = ['수업 후', '토요일 10시', '목 4시'];

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

  // 일정 수기 선택 및 실시간 저장 (드롭다운)
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

  // 인쇄 실행
  const handlePrint = () => {
    window.print();
  };

  // 현재 선택된 반의 logs
  const classLogs = logs.filter((l) => l.class_name === selectedClass);

  // 1. 테스트 미달 (재시험 대상자)
  const retestNames = classLogs
    .filter((l) => l.is_retest)
    .map((l) => l.student_name)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  // 2. 복습 미달 (복습과제 미수행 단독)
  const hwMissingNames = classLogs
    .filter((l) => l.is_hw_missing)
    .map((l) => l.student_name)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  // 3. 필수 미달 (필수과제 미달)
  const reqHwMissingNames = classLogs
    .filter((l) => l.is_req_hw_missing)
    .map((l) => l.student_name)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  // 4. 복습 대상 (교집합: 복습 과제 미수행 AND 재시험 대상자)
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
      {/* ────────────────── 인쇄 전용 CSS ────────────────── */}
      <style jsx global>{`
        @media print {
          /* 웹 UI 전부 숨김 */
          .no-print,
          header,
          footer,
          button,
          input,
          select {
            display: none !important;
          }

          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact;
          }

          main {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-only {
            display: block !important;
          }

          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }

          /* 각 명단 섹션 사이 페이지 분리 */
          .print-section {
            page-break-before: always;
            break-before: page;
          }

          .print-section:first-child {
            page-break-before: avoid;
            break-before: avoid;
          }

          /* 인쇄용 이름 요소 높이 0.7배 축소 조절 */
          .print-name-item {
            break-inside: avoid;
            page-break-inside: avoid;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            line-height: 0.9 !important;
          }
        }

        .print-only {
          display: none;
        }
      `}</style>

      {/* ────────────────── 1. 웹 화면 전용 대시보드 UI (no-print) ────────────────── */}
      <div className="no-print space-y-6">
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

        {/* 주차 및 수업 선택 탭 */}
        <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
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

        {/* 대시보드 표 상단 바 및 인쇄 버튼 */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden space-y-3 p-5">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-baseline gap-2">
              <h2 className="font-bold text-slate-900 text-lg">{selectedClass}</h2>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {selectedWeek}주차
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 shadow-md flex items-center gap-1.5 transition-colors"
              >
                🖨️ 교실 게시용 명단 인쇄
              </button>
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
          </div>

          {/* 대시보드 표 (웹 UI 셀 높이 0.7배 축소 반영) */}
          <div className="border rounded-lg overflow-x-auto shadow-inner">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b text-slate-700 font-bold">
                  <th className="py-1.5 px-3 border-r bg-slate-50 w-1/6">테스트 미달</th>
                  <th className="py-1.5 px-3 border-r bg-slate-50 w-1/6">복습 미달</th>
                  <th className="py-1.5 px-3 border-r bg-slate-50 w-1/6">필수 미달</th>
                  <th className="py-1.5 px-3 border-r bg-blue-100 text-blue-900 w-1/6">
                    복습 대상 ⭐
                  </th>
                  <th className="py-1.5 px-3 border-r bg-rose-100 text-rose-900 w-1/6">
                    클리닉 대상 ⭐
                  </th>
                  <th className="py-1.5 px-3 bg-amber-100 text-amber-900 w-1/6">
                    일정 (선택) ⭐
                  </th>
                </tr>
              </thead>
              <tbody className="align-top divide-y">
                {maxRows === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 px-3 text-center text-gray-400 font-medium">
                      해당 주차/반에 조건 대상자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: maxRows }).map((_, idx) => {
                    const clinicStudent = clinicTargetStudents[idx];

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1 px-2.5 border-r font-medium text-purple-700 bg-purple-50/30 leading-tight">
                          {retestNames[idx] || ''}
                        </td>
                        <td className="py-1 px-2.5 border-r font-medium text-orange-700 bg-orange-50/30 leading-tight">
                          {hwMissingNames[idx] || ''}
                        </td>
                        <td className="py-1 px-2.5 border-r font-medium text-red-700 bg-red-50/30 leading-tight">
                          {reqHwMissingNames[idx] || ''}
                        </td>
                        <td className="py-1 px-2.5 border-r font-bold text-blue-800 bg-blue-50/80 leading-tight">
                          {hwRemediationNames[idx] || ''}
                        </td>
                        <td className="py-1 px-2.5 border-r font-bold text-rose-800 bg-rose-50/80 leading-tight">
                          {clinicStudent ? clinicStudent.student_name : ''}
                        </td>
                        <td className="py-0.5 px-1 bg-amber-50/60">
                          {clinicStudent && (
                            <select
                              className="w-full py-0.5 px-1 border border-amber-300 rounded text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
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
      </div>

      {/* ────────────────── 2. 교실 게시용 인쇄 레이아웃 (print-only) ────────────────── */}
      <div className="print-only">
        {/* SECTION 1: 테스트 미달 */}
        <section className="print-section">
          <div className="border-b-4 border-black pb-4 mb-6 text-center">
            <h1 className="text-6xl font-black tracking-tight">테스트 미달</h1>
          </div>
          <div>
            {retestNames.length === 0 ? (
              <div className="py-20 text-center text-4xl font-bold text-gray-400">
                대상 없음
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-3 gap-x-12">
                {retestNames.map((name, i) => (
                  <div
                    key={i}
                    className="print-name-item border-b-2 border-black py-0.5 text-center font-extrabold"
                    style={{ fontSize: '75px', lineHeight: '0.9' }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: 필수 과제 미달 */}
        <section className="print-section">
          <div className="border-b-4 border-black pb-4 mb-6 text-center">
            <h1 className="text-6xl font-black tracking-tight">필수 과제 미달</h1>
          </div>
          <div>
            {reqHwMissingNames.length === 0 ? (
              <div className="py-20 text-center text-4xl font-bold text-gray-400">
                대상 없음
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-3 gap-x-12">
                {reqHwMissingNames.map((name, i) => (
                  <div
                    key={i}
                    className="print-name-item border-b-2 border-black py-0.5 text-center font-extrabold"
                    style={{ fontSize: '75px', lineHeight: '0.9' }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3: 복습 대상 */}
        <section className="print-section">
          <div className="border-b-4 border-black pb-4 mb-6 text-center">
            <h1 className="text-6xl font-black tracking-tight">복습 대상</h1>
          </div>
          <div>
            {hwRemediationNames.length === 0 ? (
              <div className="py-20 text-center text-4xl font-bold text-gray-400">
                대상 없음
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-3 gap-x-12">
                {hwRemediationNames.map((name, i) => (
                  <div
                    key={i}
                    className="print-name-item border-b-2 border-black py-0.5 text-center font-extrabold"
                    style={{ fontSize: '75px', lineHeight: '0.9' }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ────────────────── 3. 재시험 명단 복사-붙여넣기 팝업 ────────────────── */}
      {retestInputClass && (
        <div className="no-print fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
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