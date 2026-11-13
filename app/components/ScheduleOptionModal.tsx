'use client';

import { useState } from 'react';

interface ScheduleOptionModalProps {
  options: string[];
  onSave: (newOptions: string[]) => void;
  onClose: () => void;
}

export default function ScheduleOptionModal({
  options,
  onSave,
  onClose,
}: ScheduleOptionModalProps) {
  const [items, setItems] = useState<string[]>(options);
  const [newInput, setNewInput] = useState('');

  const handleAdd = () => {
    if (!newInput.trim()) return;
    if (items.includes(newInput.trim())) {
      alert('이미 존재하는 항목입니다.');
      return;
    }
    setItems([...items, newInput.trim()]);
    setNewInput('');
  };

  const handleRemove = (opt: string) => {
    setItems(items.filter((i) => i !== opt));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm no-print">
      <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
        <h3 className="font-bold text-slate-800 text-sm">⚙️ 일정 드롭다운 선택지 편집</h3>
        <p className="text-xs text-gray-500">
          대시보드 일정 선택 박스에 들어갈 항목을 수기로 추가/삭제하세요.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="예: 금 5시, 수업 전"
            className="flex-1 p-2 border rounded text-xs focus:outline-none focus:border-blue-500"
            value={newInput}
            onChange={(e) => setNewInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-500"
          >
            추가
          </button>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded p-2 bg-slate-50">
          {items.map((opt) => (
            <div
              key={opt}
              className="flex justify-between items-center p-1.5 bg-white rounded border text-xs text-slate-700"
            >
              <span>{opt}</span>
              <button
                onClick={() => handleRemove(opt)}
                className="text-red-500 hover:text-red-700 font-bold px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded hover:bg-gray-200"
          >
            취소
          </button>
          <button
            onClick={() => {
              onSave(items);
              onClose();
            }}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-500"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}