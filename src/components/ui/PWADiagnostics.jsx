// src/components/ui/PWADiagnostics.jsx
import { useState, useEffect } from 'react'

async function runDiagnostics() {
  const results = []

  // 1. HTTPS / secure context
  results.push({
    check: 'Secure context (HTTPS)',
    pass: window.isSecureContext,
    detail: window.isSecureContext ? location.protocol : `Running on ${location.protocol} — installability requires HTTPS (localhost is exempt)`,
  })

  // 2. Manifest link present in the document
  const manifestLink = document.querySelector('link[rel="manifest"]')
  results.push({
    check: 'Manifest link tag present',
    pass: !!manifestLink,
    detail: manifestLink ? manifestLink.href : 'No <link rel="manifest"> found in the page head',
  })

  // 3. Manifest actually fetchable and valid JSON
  let manifestData = null
  if (manifestLink) {
    try {
      const res = await fetch(manifestLink.href, { cache: 'no-store' })
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok) {
        results.push({ check: 'Manifest fetch succeeds', pass: false, detail: `HTTP ${res.status} fetching ${manifestLink.href}` })
      } else {
        manifestData = await res.json()
        results.push({ check: 'Manifest fetch succeeds', pass: true, detail: `HTTP 200, content-type: ${contentType}` })
      }
    } catch (e) {
      results.push({ check: 'Manifest fetch succeeds', pass: false, detail: `Fetch threw: ${e.message}` })
    }
  }

  // 4. Manifest required fields
  if (manifestData) {
    const hasName = !!(manifestData.name || manifestData.short_name)
    results.push({ check: 'Manifest has name/short_name', pass: hasName, detail: manifestData.name || manifestData.short_name || 'missing' })
    const validDisplay = ['standalone', 'fullscreen', 'minimal-ui'].includes(manifestData.display)
    results.push({ check: 'Manifest display mode is installable', pass: validDisplay, detail: `display: "${manifestData.display}"` })
    const hasStartUrl = !!manifestData.start_url
    results.push({ check: 'Manifest has start_url', pass: hasStartUrl, detail: manifestData.start_url || 'missing' })

    // 5. Icons — Chrome requires at least a 192px AND a 512px icon
    const icons = manifestData.icons || []
    const has192 = icons.some(i => (i.sizes || '').includes('192'))
    const has512 = icons.some(i => (i.sizes || '').includes('512'))
    results.push({ check: 'Manifest declares a 192px icon', pass: has192, detail: icons.map(i => i.sizes).join(', ') || 'no icons array' })
    results.push({ check: 'Manifest declares a 512px icon', pass: has512, detail: has512 ? 'present' : 'missing — this alone blocks install on Chrome/Edge' })

    // 6. Each declared icon actually loads
    for (const icon of icons.slice(0, 6)) {
      try {
        const iconUrl = new URL(icon.src, location.origin).href
        const res = await fetch(iconUrl, { cache: 'no-store' })
        results.push({
          check: `Icon loads: ${icon.src}`,
          pass: res.ok && (res.headers.get('content-type') || '').startsWith('image'),
          detail: res.ok ? `HTTP 200, ${res.headers.get('content-type')}, ${res.headers.get('content-length') || '?'} bytes` : `HTTP ${res.status}`,
        })
      } catch (e) {
        results.push({ check: `Icon loads: ${icon.src}`, pass: false, detail: e.message })
      }
    }
  }

  // 7. Service worker support + registration
  const swSupported = 'serviceWorker' in navigator
  results.push({ check: 'Browser supports service workers', pass: swSupported, detail: swSupported ? 'yes' : 'no — this browser cannot install PWAs at all' })
  if (swSupported) {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      results.push({
        check: 'Service worker is registered',
        pass: !!reg,
        detail: reg ? `scope: ${reg.scope}, active: ${!!reg.active}` : 'No service worker registered for this page — install will never fire without one',
      })
      if (reg) {
        results.push({
          check: 'Service worker is active (not just installing)',
          pass: reg.active?.state === 'activated',
          detail: `state: ${reg.active?.state || reg.installing?.state || reg.waiting?.state || 'unknown'}`,
        })
      }
    } catch (e) {
      results.push({ check: 'Service worker is registered', pass: false, detail: e.message })
    }
  }

  // 8. Already installed?
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  results.push({ check: 'Currently running in standalone (installed) mode', pass: standalone, detail: standalone ? 'yes — already installed' : 'no — running in a browser tab' })

  // 9. beforeinstallprompt support signal (Chromium only — absence here on a
  // Chromium browser after all above checks pass usually means the browser's
  // engagement heuristic hasn't been met yet, not a site defect)
  results.push({
    check: 'beforeinstallprompt capability',
    pass: 'onbeforeinstallprompt' in window,
    detail: 'onbeforeinstallprompt' in window
      ? 'Browser supports the install prompt API — if all checks above pass and you still see nothing, this browser may be waiting on its own engagement heuristic (e.g. requires a prior visit or time-on-site) before it will fire the prompt.'
      : 'This browser does not implement beforeinstallprompt at all (Firefox, Safari never do — this is a browser policy, not a site defect).',
  })

  return results
}

export default function PWADiagnostics() {
  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    const r = await runDiagnostics()
    setResults(r)
    setRunning(false)
  }

  useEffect(() => { run() }, [])

  const failCount = results?.filter(r => !r.pass).length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
          Checks every real installability requirement Chrome/Edge/Brave enforce — no guessing.
        </p>
        <button onClick={run} disabled={running} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
          {running ? '…' : '↺ Re-run'}
        </button>
      </div>
      {results && (
        <>
          <div style={{
            padding: '8px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
            background: failCount === 0 ? 'var(--sage-100)' : 'var(--terra-100)',
            color: failCount === 0 ? 'var(--sage-600)' : 'var(--terra-600)',
          }}>
            {failCount === 0 ? 'All checks pass — install should be available.' : `${failCount} check${failCount === 1 ? '' : 's'} failed — this is the actual reason install isn't offered.`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8, background: r.pass ? 'transparent' : 'var(--terra-100)', border: `1px solid ${r.pass ? 'var(--border-subtle)' : 'rgba(168,90,72,0.25)'}` }}>
                <span style={{ flexShrink: 0 }}>{r.pass ? '✅' : '❌'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{r.check}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', wordBreak: 'break-word' }}>{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            If something here fails and you're not sure why, screenshot this list — it's the real diagnosis, not a guess.
          </p>
        </>
      )}
    </div>
  )
}
