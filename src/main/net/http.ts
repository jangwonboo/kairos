import { net } from 'electron'

export async function httpGet<T>(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
  retryCount = 2
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    if (attempt > 0) {
      await sleep(500 * 2 ** (attempt - 1))
    }

    try {
      const data = await fetchOnce<T>(url, headers, timeoutMs)
      return data
    } catch (err) {
      lastError = err
    }
  }

  throw lastError
}

function fetchOnce<T>(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const req = net.fetch(url, {
      signal: controller.signal,
      headers
    })

    req
      .then((res) => {
        clearTimeout(timer)
        if (!res.ok) {
          reject(Object.assign(new Error(`HTTP ${res.status}`), { status: res.status }))
          return
        }
        return res.json() as Promise<T>
      })
      .then((data) => data && resolve(data))
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
