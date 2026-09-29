import { createServerFn } from '@tanstack/react-start'
import { fetchOverview } from './core'

export const getStagingOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const [prod, staging] = await Promise.all([fetchOverview('prod'), fetchOverview('staging')])
  return { prod, staging }
})
