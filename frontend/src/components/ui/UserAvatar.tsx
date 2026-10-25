import { initials } from '@/lib/format'
import { cloudinaryWidth } from '@/lib/image'

interface UserAvatarProps {
  src?: string
  name: string
  className?: string
  // Cloudinary width to request; raise it for large avatars.
  width?: number
}

// Fills its parent; the caller owns the wrapper (size, radius, neumorphic frame).
export default function UserAvatar({ src, name, className = '', width = 160 }: UserAvatarProps) {
  if (src) {
    return <img src={cloudinaryWidth(src, width)} alt={name} loading="lazy" className={`w-full h-full object-cover ${className}`} />
  }
  return (
    <div
      role="img"
      aria-label={name}
      className={`w-full h-full flex items-center justify-center font-bold text-[#3B82F6] ${className}`}
    >
      {initials(name)}
    </div>
  )
}
