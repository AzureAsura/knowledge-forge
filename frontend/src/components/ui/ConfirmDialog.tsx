interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Mount it only while open: the ref callback opens the native modal on mount.
export default function ConfirmDialog({ title, message, confirmLabel, pending, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal()
      }}
      onCancel={onCancel}
      className="m-auto w-[min(92vw,420px)] bg-base neu-raised rounded-[24px] p-6 space-y-4 text-[#4B5563] backdrop:bg-[#1F2937]/30"
    >
      <h2 className="text-[17px] font-extrabold text-[#1F2937]">{title}</h2>
      <p className="text-[13px] leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-base neu-raised-sm neu-hover rounded-[12px] text-[13px] font-bold text-[#4B5563] transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="px-4 py-2 bg-[#EF4444] text-white rounded-[12px] neu-raised-sm text-[13px] font-bold hover:bg-[#DC2626] active:scale-95 disabled:opacity-60 disabled:pointer-events-none transition-all"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
