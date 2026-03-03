/* =========================================================
   TH8 SENSE — DATETIME UTILS (Bangkok / UTC+7)
   ใช้เป็นตัวกลางทั้งระบบ
========================================================= */

export type Nullable<T> = T | null | undefined

/* =========================================================
   INTERNAL HELPERS
========================================================= */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function safeDate(input: Nullable<string | number | Date>): Date | null {
  if (!input) return null
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/* =========================================================
   CORE: UTC → BANGKOK
========================================================= */

export function toBangkokDate(input: Nullable<string | number | Date>): Date | null {
  const d = safeDate(input)
  if (!d) return null

  // convert to UTC ms first
  const utc = d.getTime() + d.getTimezoneOffset() * 60000

  // add UTC+7
  return new Date(utc + 7 * 60 * 60000)
}

/* =========================================================
   STANDARD FORMATS (ใช้ทั่วระบบ)
========================================================= */

/**
 * 2026-02-22 19:30:17
 */
export function formatTsBKK(input: Nullable<string | number | Date>): string {
  const d = toBangkokDate(input)
  if (!d) return '—'

  const y = d.getFullYear()
  const mo = pad2(d.getMonth() + 1)
  const da = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())

  return `${y}-${mo}-${da} ${hh}:${mm}:${ss}`
}

/**
 * 2026-02-22 (date only)
 */
export function formatDateBKK(input: Nullable<string | number | Date>): string {
  const d = toBangkokDate(input)
  if (!d) return '—'

  const y = d.getFullYear()
  const mo = pad2(d.getMonth() + 1)
  const da = pad2(d.getDate())

  return `${y}-${mo}-${da}`
}

/**
 * 19:30:17 (time only)
 */
export function formatTimeBKK(input: Nullable<string | number | Date>): string {
  const d = toBangkokDate(input)
  if (!d) return ''

  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())

  return `${hh}:${mm}:${ss}`
}

/**
 * key สำหรับ group audit timeline
 * เช่น 2026-02-22
 */
export function dateKeyBKK(input: Nullable<string | number | Date>): string {
  const d = toBangkokDate(input)
  if (!d) return 'Unknown date'

  const y = d.getFullYear()
  const mo = pad2(d.getMonth() + 1)
  const da = pad2(d.getDate())

  return `${y}-${mo}-${da}`
}

/* =========================================================
   RELATIVE TIME (สำหรับ UI modern)
========================================================= */

export function timeAgoBKK(input: Nullable<string | number | Date>): string {
  const d = toBangkokDate(input)
  if (!d) return ''

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()

  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `${sec}s ago`

  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`

  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`

  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

/* =========================================================
   SAFE FIELD RESOLVER (ใช้กับ aggregate/view)
   กัน undefined → "—"
========================================================= */

export function safeText(v: any, fallback = '—'): string {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

export function safeNumber(v: any, fallback = 0): number {
  const n = Number(v)
  if (Number.isNaN(n)) return fallback
  return n
}

/* =========================================================
   CASE HEADER HELPERS
   ใช้ normalize จาก aggregate → UI
========================================================= */

export function resolveCaseUpdatedAt(ts: Nullable<string>): string {
  return formatTsBKK(ts)
}

export function resolveCaseDateKey(ts: Nullable<string>): string {
  return dateKeyBKK(ts)
}