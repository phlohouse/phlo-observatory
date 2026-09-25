/**
 * Server functions for the Assets area. Today they read fixtures; later the list comes from the
 * Nessie catalog + Dagster asset materializations and the detail from Iceberg metadata.
 */
import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import * as core from '../fixtures/core'
import { assetDetail, materializeWindow } from '../fixtures/assets'

export const getAssetList = createServerFn({ method: 'GET' }).handler(async () => ({
  assets: core.assets,
  totals: core.assetTotals,
}))

export const getAssetDetail = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const asset = core.assets.find((a) => a.id === id)
    if (!asset) throw notFound()
    const incidents = core.incidents.filter((i) => i.assetId === id && i.status !== 'resolved')
    return {
      asset,
      incidents,
      detail: assetDetail(asset),
      window: materializeWindow[id] ?? { from: '2026-09-24 08:00', to: 'now' },
    }
  })
