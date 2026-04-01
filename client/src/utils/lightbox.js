/**
 * Vanilla-JS lightbox — direct DOM injection, bypasses React entirely.
 * Uses explicit individual style properties (no CSS shorthand like `inset`)
 * for maximum browser compatibility.
 *
 * openLightbox(url, info?)
 *   url   — image URL
 *   info  — optional { prompt, model, type } for info panel
 */

const ID = '__goblin_lb__'

function css(el, styles) {
  Object.keys(styles).forEach(k => { el.style[k] = styles[k] })
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
  css(backdrop, {
    position:        'fixed',
    top:             '0',
    left:            '0',
    right:           '0',
    bottom:          '0',
    width:           '100%',
    height:          '100%',
    zIndex:          '2147483647',
    background:      'rgba(0,0,0,0.93)',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    overflowY:       'auto',
    padding:         '24px 16px',
    boxSizing:       'border-box',
    cursor:          'zoom-out',
    fontFamily:      'Inter, system-ui, sans-serif',
  })
  backdrop.addEventListener('click', close)

  /* ── Card (stops propagation) ──────────────────── */
  const card = document.createElement('div')
  css(card, {
    position:       'relative',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'stretch',
    width:          'min(480px, 92vw)',
    background:     '#111114',
    borderRadius:   '18px',
    overflow:       'hidden',
    border:         '1px solid rgba(255,255,255,0.09)',
    boxShadow:      '0 24px 80px rgba(0,0,0,0.8)',
    cursor:         'default',
  })
  card.addEventListener('click', function(e) { e.stopPropagation() })

  /* ── Image ─────────────────────────────────────── */
  const img = document.createElement('img')
  img.src = url
  img.alt = '放大預覽'
  css(img, {
    display:      'block',
    width:        '100%',
    maxHeight:    '60vh',
    objectFit:    'contain',
    background:   '#000',
  })

  /* ── Info panel (shown only if prompt/model provided) ─ */
  const panel = document.createElement('div')
  css(panel, {
    padding:   '14px 16px',
    display:   'flex',
    flexDirection: 'column',
    gap:       '10px',
  })

  const hasInfo = info.prompt || info.model

  if (hasInfo) {
    // ── Prompt row
    if (info.prompt) {
      const promptWrap = document.createElement('div')
      css(promptWrap, { display: 'flex', flexDirection: 'column', gap: '4px' })

      const promptLabel = document.createElement('span')
      promptLabel.textContent = '提示詞'
      css(promptLabel, { fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' })

      const promptRow = document.createElement('div')
      css(promptRow, { display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.07)' })

      const promptText = document.createElement('span')
      promptText.textContent = info.prompt
      css(promptText, {
        flex: '1',
        fontSize:    '12px',
        color:       'rgba(255,255,255,0.75)',
        lineHeight:  '1.5',
        wordBreak:   'break-word',
        display:     '-webkit-box',
        webkitLineClamp: '3',
        webkitBoxOrient: 'vertical',
        overflow:    'hidden',
      })
      promptText.style['-webkit-line-clamp'] = '3'
      promptText.style['-webkit-box-orient'] = 'vertical'

      // Copy prompt button
      const copyBtn = document.createElement('button')
      copyBtn.textContent = '📋'
      copyBtn.title = '複製提示詞'
      css(copyBtn, {
        background:  'none',
        border:      'none',
        cursor:      'pointer',
        fontSize:    '14px',
        padding:     '2px',
        opacity:     '0.6',
        flexShrink:  '0',
      })
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation()
        navigator.clipboard.writeText(info.prompt).then(function() {
          copyBtn.textContent = '✅'
          setTimeout(function() { copyBtn.textContent = '📋' }, 1500)
        }).catch(function() {
          // Fallback for older browsers
          const ta = document.createElement('textarea')
          ta.value = info.prompt
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
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

    // ── Model row
    if (info.model) {
      const modelWrap = document.createElement('div')
      css(modelWrap, { display: 'flex', alignItems: 'center', gap: '6px' })

      const modelLabel = document.createElement('span')
      modelLabel.textContent = '模型'
      css(modelLabel, { fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' })

      const modelBadge = document.createElement('span')
      modelBadge.textContent = info.model
      css(modelBadge, {
        fontSize:     '11px',
        color:        '#c8ff3e',
        background:   'rgba(200,255,62,0.1)',
        border:       '1px solid rgba(200,255,62,0.2)',
        borderRadius: '6px',
        padding:      '2px 8px',
        fontWeight:   '600',
      })

      modelWrap.appendChild(modelLabel)
      modelWrap.appendChild(modelBadge)
      panel.appendChild(modelWrap)
    }
  }

  // ── Action buttons
  const btnRow = document.createElement('div')
  css(btnRow, {
    display:       'flex',
    gap:           '8px',
    paddingTop:    hasInfo ? '4px' : '14px',
    paddingBottom: '0',
    paddingLeft:   hasInfo ? '0' : '0',
  })

  // Copy to generator (only if prompt)
  if (info.prompt) {
    const toGenBtn = document.createElement('button')
    toGenBtn.textContent = '⚡ 複製到生成器'
    css(toGenBtn, {
      flex:         '1',
      background:   '#c8ff3e',
      color:        '#000',
      fontWeight:   '800',
      fontSize:     '13px',
      padding:      '10px 0',
      borderRadius: '10px',
      border:       'none',
      cursor:       'pointer',
      fontFamily:   'inherit',
    })
    toGenBtn.addEventListener('click', function(e) {
      e.stopPropagation()
      // Copy prompt to clipboard then navigate to generator
      const doNav = function() {
        const encoded = encodeURIComponent(info.prompt)
        window.location.href = '/generate?prompt=' + encoded
      }
      navigator.clipboard.writeText(info.prompt).then(doNav).catch(doNav)
    })
    btnRow.appendChild(toGenBtn)
  }

  // Download
  const dlBtn = document.createElement('a')
  dlBtn.href                 = url
  dlBtn.download             = 'goblin-ai.jpg'
  dlBtn.target               = '_blank'
  dlBtn.rel                  = 'noreferrer'
  dlBtn.textContent          = '⬇'
  dlBtn.title                = '下載原圖'
  css(dlBtn, {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          info.prompt ? '42px' : 'auto',
    flex:           info.prompt ? 'none' : '1',
    padding:        info.prompt ? '10px 0' : '10px 0',
    background:     'rgba(255,255,255,0.1)',
    color:          '#fff',
    fontWeight:     '700',
    fontSize:       info.prompt ? '16px' : '13px',
    borderRadius:   '10px',
    textDecoration: 'none',
    border:         '1px solid rgba(255,255,255,0.15)',
    cursor:         'pointer',
    boxSizing:      'border-box',
  })
  if (!info.prompt) dlBtn.textContent = '⬇  下載原圖'
  dlBtn.addEventListener('click', function(e) { e.stopPropagation() })
  btnRow.appendChild(dlBtn)

  // Close button
  const clBtn = document.createElement('button')
  clBtn.textContent    = '✕'
  css(clBtn, {
    width:       '42px',
    background:  'rgba(255,255,255,0.07)',
    color:       'rgba(255,255,255,0.6)',
    fontWeight:  '700',
    fontSize:    '16px',
    padding:     '10px 0',
    borderRadius:'10px',
    border:      '1px solid rgba(255,255,255,0.1)',
    cursor:      'pointer',
    fontFamily:  'inherit',
  })
  clBtn.addEventListener('click', function(e) { e.stopPropagation(); close() })
  btnRow.appendChild(clBtn)

  panel.appendChild(btnRow)

  card.appendChild(img)
  card.appendChild(panel)
  backdrop.appendChild(card)
  document.body.appendChild(backdrop)
}
