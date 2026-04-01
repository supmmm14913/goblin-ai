/**
 * Vanilla-JS lightbox utility.
 * Directly injects/removes a DOM overlay — no React state, no Portal.
 * Cannot be blocked by z-index, overflow:hidden, or stacking contexts.
 */

const LIGHTBOX_ID = '__goblin_lightbox__'

export function openLightbox(url) {
  if (!url) return
  closeLightbox() // remove any existing one first

  /* ── Overlay (backdrop) ─────────────────── */
  const overlay = document.createElement('div')
  overlay.id = LIGHTBOX_ID
  Object.assign(overlay.style, {
    position:       'fixed',
    inset:          '0',
    zIndex:         '2147483647',   // max possible z-index
    background:     'rgba(0,0,0,0.92)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '20px',
    cursor:         'zoom-out',
    animation:      'none',
  })
  overlay.addEventListener('click', closeLightbox)

  // ESC key
  const escHandler = (e) => { if (e.key === 'Escape') closeLightbox() }
  overlay._escHandler = escHandler
  window.addEventListener('keydown', escHandler)

  /* ── Inner container (stop propagation) ── */
  const inner = document.createElement('div')
  Object.assign(inner.style, {
    position:       'relative',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            '14px',
    maxWidth:       '92vw',
    cursor:         'default',
  })
  inner.addEventListener('click', (e) => e.stopPropagation())

  /* ── Close ✕ button ────────────────────── */
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  Object.assign(closeBtn.style, {
    position:   'absolute',
    top:        '-44px',
    right:      '0',
    background: 'none',
    border:     'none',
    color:      'rgba(255,255,255,0.7)',
    fontSize:   '30px',
    cursor:     'pointer',
    lineHeight: '1',
    padding:    '4px',
  })
  closeBtn.addEventListener('click', closeLightbox)

  /* ── Image ──────────────────────────────── */
  const img = document.createElement('img')
  img.src = url
  img.alt = '放大預覽'
  Object.assign(img.style, {
    maxWidth:     '92vw',
    maxHeight:    'calc(90vh - 80px)',
    objectFit:    'contain',
    borderRadius: '14px',
    boxShadow:    '0 8px 60px rgba(0,0,0,0.9)',
    display:      'block',
    cursor:       'default',
  })

  /* ── Action row ─────────────────────────── */
  const btnRow = document.createElement('div')
  Object.assign(btnRow.style, { display: 'flex', gap: '10px' })

  // Download
  const dlLink = document.createElement('a')
  dlLink.href = url
  dlLink.download = 'goblin-ai.jpg'
  dlLink.target = '_blank'
  dlLink.rel = 'noreferrer'
  dlLink.textContent = '⬇  下載原圖'
  dlLink.addEventListener('click', (e) => e.stopPropagation())
  Object.assign(dlLink.style, {
    background:     '#c8ff3e',
    color:          '#000',
    fontWeight:     '700',
    fontSize:       '13px',
    padding:        '9px 22px',
    borderRadius:   '10px',
    textDecoration: 'none',
    display:        'inline-flex',
    alignItems:     'center',
    cursor:         'pointer',
  })

  // Close (bottom)
  const closeBtn2 = document.createElement('button')
  closeBtn2.textContent = '關閉'
  closeBtn2.addEventListener('click', closeLightbox)
  Object.assign(closeBtn2.style, {
    background:   'rgba(255,255,255,0.1)',
    color:        '#fff',
    fontWeight:   '600',
    fontSize:     '13px',
    padding:      '9px 22px',
    borderRadius: '10px',
    border:       '1px solid rgba(255,255,255,0.18)',
    cursor:       'pointer',
  })

  btnRow.appendChild(dlLink)
  btnRow.appendChild(closeBtn2)

  inner.appendChild(closeBtn)
  inner.appendChild(img)
  inner.appendChild(btnRow)
  overlay.appendChild(inner)

  document.body.appendChild(overlay)
}

export function closeLightbox() {
  const el = document.getElementById(LIGHTBOX_ID)
  if (!el) return
  if (el._escHandler) window.removeEventListener('keydown', el._escHandler)
  el.remove()
}
