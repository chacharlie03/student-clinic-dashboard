'use client';

interface HeaderProps {
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  handleSyncAll: () => void;
  loading: boolean;
  syncStatus: string;
}

export default function Header({
  spreadsheetId,
  setSpreadsheetId,
  handleSyncAll,
  loading,
  syncStatus,
}: HeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold">김정화T 테스트 결과 및 클리닉 명단</h1>
          <p className="text-xs text-slate-400 mt-1">
            김정화T 명단 프로그램 made by 차찰리.
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
            className="px-4 py-2 bg-blue-600 text-sm font-semibold rounded hover:bg-blue-500 disabled:bg-slate-700 whitespace-nowrap transition-colors"
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
    </header>
  );
}