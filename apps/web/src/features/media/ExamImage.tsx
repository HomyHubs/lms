import { useEffect, useState } from 'react'

/** Lazy thumbnail; click opens the full image over the page (Esc or click closes). */
export function ExamImage({ src, alt, className = 'max-h-48' }: { src: string; alt: string; className?: string }): React.ReactElement {
  const [zoomed, setZoomed] = useState(false)
  useEffect(() => {
    if (!zoomed) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setZoomed(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [zoomed])
  return (
    <>
      <button type="button" aria-label={`Phóng to ${alt}`} onClick={() => setZoomed(true)} className="cursor-zoom-in">
        <img src={src} alt={alt} loading="lazy" className={`${className} rounded border border-slate-200 object-contain`} />
      </button>
      {zoomed && (
        <div role="dialog" aria-label={alt} onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/70 p-4">
          <img src={src} alt={alt} className="max-h-full max-w-full rounded bg-white object-contain" />
        </div>
      )}
    </>
  )
}
