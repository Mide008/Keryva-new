import { useState, useEffect, useCallback } from 'react'

function detectPlatform() {
  const ua = window.navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isFirefox = /Firefox|FxiOS/.test(ua)
  const isDesktopSafari = !isIOS && /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
  // Chrome, Edge, and Chromium-based browsers on Android and desktop are the
  // only ones that implement beforeinstallprompt. Firefox (any platform) and
  // desktop Safari never fire it — same gap as iOS, different browser.
  const noAutoPrompt = isIOS || isFirefox || isDesktopSafari
  return { isIOS, isSafari, isAndroid, isFirefox, isDesktopSafari, noAutoPrompt }
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [platform] = useState(detectPlatform)

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (isStandalone) setInstalled(true)

    // Skip listening on browsers that structurally never fire this event —
    // registering the listener there just wastes a subscription; it will
    // never fire, and we show manual instructions instead.
    if (platform.noAutoPrompt) return

    const onPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }
    const onInstalled = () => {
      setInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [platform.noAutoPrompt])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setCanInstall(false)
    return choice
  }, [deferredPrompt])

  return { canInstall, installed, promptInstall, platform }
}
