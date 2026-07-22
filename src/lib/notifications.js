// src/lib/notifications.js
//
// Honest scope: browsers give websites (even installed PWAs) no reliable way
// to wake up and fire a notification at a specific clock time while fully
// closed, without a server sending a real Web Push message. This scheduler
// checks the saved reminder time whenever the app is open (foreground) or
// briefly backgrounded, and fires a real notification through the service
// worker at that point. It will not fire if the phone hasn't opened the app
// at all that day — that gap can only be closed with Web Push + a backend.

const LAST_FIRED_KEY = 'rhema_notif_last_fired'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

async function fire(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      reg.showNotification(title, { body, tag, icon: '/icons/icon-192.png', badge: '/icons/badge-96.png' })
    } else {
      new Notification(title, { body, tag, icon: '/icons/icon-192.png' })
    }
  } catch {}
}

export function checkScheduledNotifications(user) {
  if (!user?.notifs?.daily) return
  const [h, m] = (user.notifTime || '07:00').split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  const last = localStorage.getItem(LAST_FIRED_KEY)
  const today = todayStr()
  if (last === today) return
  if (now >= target) {
    fire('Keryva — Daily Verse', "Your scripture for today is ready. Open the app to read it.", 'daily-verse')
    localStorage.setItem(LAST_FIRED_KEY, today)
  }
}

export function startNotificationScheduler(getUser) {
  checkScheduledNotifications(getUser())
  const id = setInterval(() => checkScheduledNotifications(getUser()), 60 * 1000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkScheduledNotifications(getUser())
  })
  return () => clearInterval(id)
}
