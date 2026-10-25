// Two short bursts from the sides; skipped automatically when the user prefers reduced motion.
export async function fireConfetti() {
  const { default: confetti } = await import('canvas-confetti')
  const shoot = (x: number) => confetti({ particleCount: 90, spread: 75, startVelocity: 45, origin: { x, y: 0.6 }, disableForReducedMotion: true, zIndex: 100 })
  shoot(0.2)
  shoot(0.8)
}
