import { useState, type AnimationEvent, type SyntheticEvent } from 'react'

// Lets a native <dialog> play its exit animation before it is unmounted: closing only sets `data-closing`
// (the CSS in index.css animates it), and the parent's onClose runs when that animation ends.
export function useAnimatedClose(onClose: () => void) {
  const [closing, setClosing] = useState(false)

  // With reduced motion there is no animation, so animationend would never fire: close right away.
  const requestClose = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onClose()
    else setClosing(true)
  }

  return {
    requestClose,
    dialogProps: {
      'data-closing': closing || undefined,
      onCancel: (e: SyntheticEvent) => {
        e.preventDefault() // keep the dialog open while it animates out
        requestClose()
      },
      onAnimationEnd: (e: AnimationEvent<HTMLDialogElement>) => {
        if (closing && e.target === e.currentTarget) onClose()
      },
    },
  }
}
