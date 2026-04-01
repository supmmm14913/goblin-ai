/**
 * Vanilla-JS lightbox — direct DOM injection, bypasses React entirely.
 * Uses setAttribute('style', ...) with native kebab-case CSS for maximum
 * browser compatibility. No camelCase JS style property issues.
 *
 * openLightbox(url, info?)
 *   url   — image URL
 *   info  — optional { prompt, model } for info panel
 */

const ID = '__goblin_lb__'

/* Set full style via attribute string (kebab-case CSS, not camelCase JS) */
function st(el, css) {
  el.setAttribute('style', css)
}

export function openLightbox(url, info = {}) {
  if (!url) return

  // Remove any existing lightbox
  const old = document.getElementById(ID)
  if (old) old.remove()

  let escFn

  function close() {
    const el = document.getElementById(ID)
    if (el) el.remove()
    if (escFn) window.removeEventListener('keydown', escFn)
  }

  escFn = function(e) { if (e.key === 'Escape') close() }
  window.addEventListener('keydown', escFn)

  /* ── Backdrop ──────────────────────────────────── */
  const backdrop = document.createElement('div')
  backdrop.id = ID
  st(backdrop, [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'bottom:0',
    'width:100%',
    'height:100%',
    'z-index:2147483647',
    'background:rgba(0,0,0,0.93)',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'overflow-y:auto',
    'padding:24px 16px',
    'box-sizing:border-box',
    'cursor:zoom-out',
    'font-family:Inter,system-ui,sans-serif',
  ].join(';'))
  backdrop.addEventListener('click', close)

  /* ── Card ──────────────────────────────────────── */
  const card = document.createElement('div')
  st(card, [
    'position:relative',
    'display:flex',
    'flex-direction:column',
    'align-items:stretch',
    'width:min(480px,92vw)',
    'background:#111114',
    'border-radius:18px',
    'overflow:hidden',
    'border:1px solid rgba(255,255,255,0.09)',
    'box-shadow:0 24px 80px rgba(0,0,0,0.8)',
    'cursor:default',
  ].join(';'))
  card.addEventListener('click', function(e) { e.stopPropagation() })

  /* ── Image ─────────────────────────────────────── */
  const img = document.createElement('img')
  img.src = url
  img.alt = '放大預覽'
  st(img, [
    'display:block',
    'width:100%',
    'max-height:60vh',
    'object-fit:contain',
    'background:#000',
  ].join(';'))

  /* ── Info panel ────────────────────────────────── */
  const panel = document.createElement('div')
  st(panel, 'padding:14px 16px;display:flex;flex-direction:column;gap:10px')

  const hasInfo = info.prompt || info.model

  if (hasInfo) {
    // Prompt row
    if (info.prompt) {
      const promptWrap = document.createElement('div')
      st(promptWrap, 'display:flex;flex-direction:column;gap:4px')

      const promptLabel = document.createElement('span')
      promptLabel.textContent = '提示詞'
      st(promptLabel, 'font-size:10px;color:rgba(255,255,255,0.35);font-weight:600;text-transform:uppercase;letter-spacing:0.06em')

      const promptRow = document.createElement('div')
      st(promptRow, 'display:flex;align-items:flex-start;gap:8px;background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 10px;border:1px solid rgba(255,255,255,0.07)')

      const promptText = document.createElement('span')
      promptText.textContent = info.prompt
      st(promptText, [
        'flex:1',
        'font-size:12px',
        'color:rgba(255,255,255,0.75)',
        'line-height:1.5',
        'word-break:break-word',
        'overflow:hidden',
        'display:-webkit-box',
        '-webkit-line-clamp:3',
        '-webkit-box-orient:vertical',
      ].join(';'))

      const copyBtn = document.createElement('button')
      copyBtn.textContent = '📋'
      copyBtn.title = '複製提示詞'
      st(copyBtn, 'background:none;border:none;cursor:pointer;font-size:14px;padding:2px;opacity:0.6;flex-shrink:0')
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation()
        navigator.clipboard.writeText(info.prompt).then(function() {
          copyBtn.textContent = '✅'
          setTimeout(function() { copyBtn.textContent = '📋' }, 1500)
        }).catch(function() {
          const ta = document.createElement('textarea')
          ta.value = info.prompt
          ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          ta.remove()
          copyBtn.textContent = '✅'
          setTimeout(function() { copyBtn.textContent = '📋' }, 1500)
        })
      })

      promptRow.appendChild(promptText)
      promptRow.appendChild(copyBtn)
      promptWrap.appendChild(promptLabel)
      promptWrap.appendChild(promptRow)
      panel.appendChild(promptWrap)
    }

    // Model row
    if (info.model) {
      const modelWrap = document.createElement('div')
      st(modelWrap, 'display:flex;align-items:center;gap:6px')

      const modelLabel = document.createElement('span')
      modelLabel.textContent = '模型'
      st(modelLabel, 'font-size:10px;color:rgba(255,255,255,0.3);font-weight:600;text-transform:uppercase;letter-spacing:0.06em')

      const modelBadge = document.createElement('span')
      modelBadge.textContent = info.model
      st(modelBadge, 'font-size:11px;color:#c8ff3e;background:rgba(200,255,62,0.1);border:1px solid rgba(200,255,62,0.2);border-radius:6px;padding:2px 8px;font-weight:600')

      modelWrap.appendChild(modelLabel)
      modelWrap.appendChild(modelBadge)
      panel.appendChild(modelWrap)
    }
  }

  /* ── Action buttons ─────────────────────────────── */
  const btnRow = document.createElement('div')
  st(btnRow, 'display:flex;gap:8px;padding-top:' + (hasInfo ? '4px' : '14px'))

  // Copy to generator (only if prompt exists)
  if (info.prompt) {
    const toGenBtn = document.createElement('button')
    toGenBtn.textContent = '⚡ 複製到生成器'
    st(toGenBtn, 'flex:1;background:#c8ff3e;color:#000;font-weight:800;font-size:13px;padding:10px 0;border-radius:10px;border:none;cursor:pointer;font-family:inherit')
    toGenBtn.addEventListener('click', function(e) {
      e.stopPropagation()
      const doNav = function() {
        window.location.href = '/generate?prompt=' + encodeURIComponent(info.prompt)
      }
      navigator.clipboard.writeText(info.prompt).then(doNav).catch(doNav)
    })
    btnRow.appendChild(toGenBtn)
  }

  // Download button
  const dlBtn = document.createElement('a')
  dlBtn.href      = url
  dlBtn.download  = 'goblin-ai.jpg'
  dlBtn.target    = '_blank'
  dlBtn.rel       = 'noreferrer'
  dlBtn.title     = '下載原圖'
  dlBtn.textContent = info.prompt ? '⬇' : '⬇  下載原圖'
  st(dlBtn, [
    'display:flex',
    'align-items:center',
    'justify-content:center',
    info.prompt ? 'width:42px' : 'flex:1',
    'padding:10px 0',
    'background:rgba(255,255,255,0.1)',
    'color:#fff',
    'font-weight:700',
    info.prompt ? 'font-size:16px' : 'font-size:13px',
    'border-radius:10px',
    'text-decoration:none',
    'border:1px solid rgba(255,255,255,0.15)',
    'cursor:pointer',
    'box-sizing:border-box',
  ].join(';'))
  dlBtn.addEventListener('click', function(e) { e.stopPropagation() })
  btnRow.appendChild(dlBtn)

  // Close button
  const clBtn = document.createElement('button')
  clBtn.textContent = '✕'
  st(clBtn, 'width:42px;background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.6);font-weight:700;font-size:16px;padding:10px 0;border-radius:10px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;font-family:inherit')
  clBtn.addEventListener('click', function(e) { e.stopPropagation(); close() })
  btnRow.appendChild(clBtn)

  panel.appendChild(btnRow)
  card.appendChild(img)
  card.appendChild(panel)
  backdrop.appendChild(card)
  document.body.appendChild(backdrop)
}
