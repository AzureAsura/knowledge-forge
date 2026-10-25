interface ErrorStateProps {
  title: string
  message?: string
  onRetry?: () => void
}

export default function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div className="bg-base neu-raised rounded-[28px] p-8 text-center space-y-3">
      <h1 className="text-2xl font-bold text-[#1F2937]">{title}</h1>
      {message && <p className="text-[14px] text-[#6B7280]">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 bg-[#3B82F6] text-white px-5 py-2.5 rounded-[14px] neu-raised-sm text-[14px] font-bold hover:bg-[#2563EB] active:scale-95 transition-all"
        >
          Try again
        </button>
      )}
    </div>
  )
}
