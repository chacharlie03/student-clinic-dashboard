'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import MainDashboard from './components/MainDashboard';
import ClinicScheduleView from './components/ClinicScheduleView';
import RetestModal from './components/RetestModal';
import ScheduleOptionModal from './components/ScheduleOptionModal';

const CLASSES = ['중대1(금)', '중대1(토)', '중산1(토)', '중산1(일)'];
const DEFAULT_SCHEDULE_OPTIONS = ['수업 후', '토요일 10시', '목 4시'];

export default function Dashboard() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedClass, setSelectedClass] = useState('중대1(금)');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clinic_schedule'>('dashboard');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // 일정 드롭다운 옵션 상태
  const [scheduleOptions, setScheduleOptions] = useState<string[]>(DEFAULT_SCHEDULE_OPTIONS);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);

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

  // 일정 드롭다운 선택 및 실시간 DB 저장
  const handleScheduleChange = async (id: number, clinic_schedule: string) => {
    setLogs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, clinic_schedule } : item))
    );

    const target = logs.find((l) => l.id === id);
    if (target) {
      await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_retest: target.is_retest,
          clinic_schedule,
          is_confirmed: Boolean(target.is_confirmed),
        }),
      });
    }
  };

  // 확정 버튼 토글 및 실시간 DB 저장
  const handleConfirmToggle = async (id: number) => {
    const target = logs.find((l) => l.id === id);
    if (!target) return;

    if (!target.clinic_schedule && !target.is_confirmed) {
      alert('일정을 먼저 선택한 뒤 확정을 눌러주세요.');
      return;
    }

    const nextConfirmed = !target.is_confirmed;

    setLogs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_confirmed: nextConfirmed } : item))
    );

    await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        is_retest: target.is_retest,
        clinic_schedule: target.clinic_schedule || '',
        is_confirmed: nextConfirmed,
      }),
    });
  };

  // 재시험 명단 적용
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

  const handlePrint = () => {
    window.print();
  };

  const classLogs = logs.filter((l) => l.class_name === selectedClass);
  const retestNames = classLogs.filter((l) => l.is_retest).map((l) => l.student_name);

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6 font-sans">
      <style jsx global>{`
        @media print {
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
          .print-section {
            page-break-before: always;
            break-before: page;
          }
          .print-section:first-child {
            page-break-before: avoid;
            break-before: avoid;
          }
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

      {/* 상단 타이틀 바 */}
      <Header
        spreadsheetId={spreadsheetId}
        setSpreadsheetId={setSpreadsheetId}
        handleSyncAll={handleSyncAll}
        loading={loading}
        syncStatus={syncStatus}
      />

      {/* 주차 및 뷰 모드 / 반 선택 조율 바 */}
      <div className="no-print bg-white border rounded-xl p-4 shadow-sm space-y-3">
        {/* 모드 전환 탭 */}
        <div className="flex border-b pb-3 gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📊 반별 통합 대시보드
          </button>
          <button
            onClick={() => setActiveTab('clinic_schedule')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'clinic_schedule'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            🗓️ 목·토 클리닉 오는데이 명단
          </button>
        </div>

        {/* 주차 선택 */}
        <div className="flex items-center gap-2 border-b pb-3 pt-1">
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

        {/* 반 선택 (통합 대시보드 모드일 때만 표시) */}
        {activeTab === 'dashboard' && (
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
        )}
      </div>

      {/* 선택된 모드 뷰 출력 */}
      {activeTab === 'dashboard' ? (
        <MainDashboard
          selectedClass={selectedClass}
          selectedWeek={selectedWeek}
          classLogs={classLogs}
          scheduleOptions={scheduleOptions}
          handleScheduleChange={handleScheduleChange}
          handleConfirmToggle={handleConfirmToggle}
          handlePrint={handlePrint}
          openRetestModal={() => {
            setRetestInputClass(selectedClass);
            setRetestText(retestNames.join('\n'));
          }}
          openOptionModal={() => setIsOptionModalOpen(true)}
        />
      ) : (
        <ClinicScheduleView logs={logs} selectedWeek={selectedWeek} />
      )}

      {/* 팝업 모달 관리 */}
      {retestInputClass && (
        <RetestModal
          className={retestInputClass}
          weekNumber={selectedWeek}
          retestText={retestText}
          setRetestText={setRetestText}
          onApply={handleApplyRetestNames}
          onClose={() => setRetestInputClass(null)}
        />
      )}

      {isOptionModalOpen && (
        <ScheduleOptionModal
          options={scheduleOptions}
          onSave={(newOpts) => setScheduleOptions(newOpts)}
          onClose={() => setIsOptionModalOpen(false)}
        />
      )}
    </main>
  );
}