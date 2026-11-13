'use client';

interface MainDashboardProps {
  selectedClass: string;
  selectedWeek: number;
  classLogs: any[];
  scheduleOptions: string[];
  handleScheduleChange: (id: number, schedule: string) => void;
  handleConfirmToggle: (id: number) => void;
  handlePrint: () => void;
  openRetestModal: () => void;
  openOptionModal: () => void;
}

export default function MainDashboard({
  selectedClass,
  selectedWeek,
  classLogs,
  scheduleOptions,
  handleScheduleChange,
  handleConfirmToggle,
  handlePrint,
  openRetestModal,
  openOptionModal,
}: MainDashboardProps) {
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
    <div>
      {/* 웹 화면 전용 표 */}
      <div className="no-print bg-white border rounded-xl shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-bold text-slate-900 text-lg">{selectedClass}</h2>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {selectedWeek}주차
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openOptionModal}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              ⚙️ 일정 항목 편집
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 shadow-md flex items-center gap-1.5 transition-colors"
            >
              🖨️ 교실 게시용 명단 인쇄
            </button>
            <button
              onClick={openRetestModal}
              className="px-3.5 py-1.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-200 transition-colors"
            >
              📋 재시험 명단 붙여넣기
            </button>
          </div>
        </div>

        {/* 0.7배 높이 축소 대시보드 표 */}
        <div className="border rounded-lg overflow-x-auto shadow-inner">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b text-slate-700 font-bold">
                <th className="py-1.5 px-3 border-r bg-slate-50 w-[15%]">테스트 미달</th>
                <th className="py-1.5 px-3 border-r bg-slate-50 w-[15%]">복습 미달</th>
                <th className="py-1.5 px-3 border-r bg-slate-50 w-[15%]">필수 미달</th>
                <th className="py-1.5 px-3 border-r bg-blue-100 text-blue-900 w-[15%]">복습 대상 ⭐</th>
                <th className="py-1.5 px-3 border-r bg-rose-100 text-rose-900 w-[16%]">클리닉 대상 ⭐</th>
                <th className="py-1.5 px-3 bg-amber-100 text-amber-900 w-[24%]">일정 및 확정 ⭐</th>
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
                  const isConfirmed = Boolean(clinicStudent?.is_confirmed);

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
                      <td className={`py-0.5 px-1.5 ${isConfirmed ? 'bg-emerald-50/80' : 'bg-amber-50/60'}`}>
                        {clinicStudent && (
                          <div className="flex items-center gap-1.5">
                            <select
                              disabled={isConfirmed}
                              className={`flex-1 py-0.5 px-1 border rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                isConfirmed
                                  ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                  : 'bg-white text-slate-800 border-amber-300 cursor-pointer'
                              }`}
                              value={clinicStudent.clinic_schedule || ''}
                              onChange={(e) => handleScheduleChange(clinicStudent.id, e.target.value)}
                            >
                              <option value="">선택 안 함</option>
                              {scheduleOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleConfirmToggle(clinicStudent.id)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors ${
                                isConfirmed
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {isConfirmed ? '확정 ✓' : '확정'}
                            </button>
                          </div>
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

      {/* 교실 게시용 3페이지 분리 인쇄 레이아웃 */}
      <div className="print-only">
        <section className="print-section">
          <div className="border-b-4 border-black pb-4 mb-6 text-center">
            <h1 className="text-6xl font-black tracking-tight">테스트 미달</h1>
          </div>
          <div>
            {retestNames.length === 0 ? (
              <div className="py-20 text-center text-4xl font-bold text-gray-400">대상 없음</div>
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

        <section className="print-section">
          <div className="border-b-4 border-black pb-4 mb-6 text-center">
            <h1 className="text-6xl font-black tracking-tight">필수 과제 미달</h1>
          </div>
          <div>
            {reqHwMissingNames.length === 0 ? (
              <div className="py-20 text-center text-4xl font-bold text-gray-400">대상 없음</div>
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

        <section className="print-section">
          <div className="border-b-4 border-black pb-4 mb-6 text-center">
            <h1 className="text-6xl font-black tracking-tight">복습 대상</h1>
          </div>
          <div>
            {hwRemediationNames.length === 0 ? (
              <div className="py-20 text-center text-4xl font-bold text-gray-400">대상 없음</div>
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
    </div>
  );
}