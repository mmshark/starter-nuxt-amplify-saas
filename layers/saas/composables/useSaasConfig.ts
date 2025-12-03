import type { SaasConfig } from '../types/saas'

export function useSaasConfig(): SaasConfig {
  const appConfig = useAppConfig()
  return appConfig.saas as SaasConfig
}
