// src/lib/usageLimits.js

// Daily caps per feature, matching the beta fair-use plan. Adjust here only —
// every page reads from this single source of truth.
export const DAILY_LIMITS = {
  explain: 15,       // scripture explanation / preaching / counselling / youth lenses
  inspire: 10,        // Inspire + Topic Search combined
  sermon: 8,
  sundayPack: 8,
  studyGuide: 7,
  warfare: 9,
  socialPack: 8,
  devotional: 10,
  confessions: 10,
  prayerScripture: 10,
}

const STORAGE_KEY = 'keryva_usage_v1'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (raw.date !== todayStr()) return { date: todayStr(), counts: {} }
    return raw
  } catch {
    return { date: todayStr(), counts: {} }
  }
}

function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

/** Returns { used, limit, remaining, exhausted } without consuming a use. */
export function getUsage(feature) {
  const limit = DAILY_LIMITS[feature] ?? 10
  const state = load()
  const used = state.counts[feature] || 0
  return { used, limit, remaining: Math.max(0, limit - used), exhausted: used >= limit }
}

/**
 * Attempts to consume one use of `feature`. Returns the same shape as
 * getUsage, plus `allowed` — check `allowed` before making the AI call.
 */
export function tryConsume(feature) {
  const state = load()
  const limit = DAILY_LIMITS[feature] ?? 10
  const used = state.counts[feature] || 0
  if (used >= limit) {
    return { allowed: false, used, limit, remaining: 0, exhausted: true }
  }
  state.counts[feature] = used + 1
  persist(state)
  return { allowed: true, used: used + 1, limit, remaining: limit - used - 1, exhausted: used + 1 >= limit }
}

/** Human-readable "X of Y remaining today" string. */
export function usageLabel(feature) {
  const { used, limit } = getUsage(feature)
  return `${Math.max(0, limit - used)} of ${limit} remaining today`
}
