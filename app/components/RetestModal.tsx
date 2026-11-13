'use client';

interface RetestModalProps {
  className: string;
  weekNumber: number;
  retestText: string;
  setRetestText: (text: string) => void;
  onApply: () => void;
  onClose: () => void;
}

export default function RetestModal({
  className,
  weekNumber,
  retestText,
  setRetestText,
  onApply,
  onClose,
}: RetestModalProps) {
  return (
    <div className="no-print fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <h3 className="font-bold text-slate-800 text-sm">
          [{className} {weekNumber}주차] 재시험 명단 붙여넣기
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
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-xs font-semibold rounded hover:bg-gray-200"
          >
            취소
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-500"
          >
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}