import { session, app } from 'electron'
import type { Settings } from '@shared/types'

export async function applyProxy(network: Settings['network']): Promise<void> {
  const { proxyMode, proxyUrl, proxyBypass, pacUrl } = network

  const config: Electron.ProxyConfig = {}

  switch (proxyMode) {
    case 'system':
      config.mode = 'system'
      break
    case 'direct':
      config.mode = 'direct'
      break
    case 'manual':
      config.mode = 'fixed_servers'
      config.proxyRules = proxyUrl ?? ''
      config.proxyBypassRules = proxyBypass ?? 'localhost,127.0.0.1'
      break
    case 'pac':
      config.mode = 'pac_script'
      config.pacScript = pacUrl ?? ''
      break
  }

  await session.defaultSession.setProxy(config)
}

export function applyCustomCa(certPath: string | undefined): void {
  if (!certPath) return
  app.commandLine.appendSwitch('ssl-version-min', 'tls1.2')
  // Specific CA handling is done via session.setCertificateVerifyProc in index.ts
}
