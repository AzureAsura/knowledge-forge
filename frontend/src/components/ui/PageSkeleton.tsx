export default function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="bg-base neu-raised rounded-[28px] h-40" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-base neu-raised rounded-[28px] h-48" />
        <div className="bg-base neu-raised rounded-[28px] h-48" />
        <div className="bg-base neu-raised rounded-[28px] h-48" />
      </div>
    </div>
  )
}
