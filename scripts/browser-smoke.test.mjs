import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'

const baseUrl = process.env.OBSERVATORY_BASE_URL ?? 'http://localhost:3000'

test('replacement routes render separate environment data and read-only admin facts', async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH })
  try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))

    for (const [env, expected, absent] of [
      ['prod', 'gold.batch_release_metrics', 'silver.qc_results'],
      ['staging', 'silver.qc_results', 'gold.batch_release_metrics'],
    ]) {
      const response = await page.goto(new URL(`/assets?env=${env}`, baseUrl).href)
      assert.equal(response?.status(), 200, `${env} assets route should load`)
      const content = await page.locator('body').innerText()
      assert.ok(content.includes(expected), `${env} should display its own asset data`)
      assert.ok(!content.includes(absent), `${env} must not display the other environment's asset`)
    }

    for (const [env, expected, absent] of [
      ['prod', 'batch-prod-042', 'batch-stage-017'],
      ['staging', 'batch-stage-017', 'batch-prod-042'],
    ]) {
      await page.goto(new URL(`/query?env=${env}`, baseUrl).href)
      await page.locator('.cm-content').fill('SELECT 1;')
      await page.getByRole('button', { name: /^Run/ }).click()
      await page.getByText(expected, { exact: true }).waitFor({ timeout: 5000 })
      assert.ok(!(await page.locator('main').innerText()).includes(absent), `${env} query results must not contain the other environment's row`)
    }

    for (const path of [
      '/?env=prod',
      '/staging',
      '/incidents?env=prod',
      '/incidents/demo-prod-214?env=prod',
      '/incidents?env=staging',
      '/incidents/demo-stage-007?env=staging',
      '/assets?env=prod',
      '/assets/gold.batch_release_metrics?env=prod',
      '/assets?env=staging',
      '/assets/silver.qc_results?env=staging',
      '/pipelines?env=prod',
      '/pipelines/refresh-release-metrics?env=prod',
      '/pipelines/timeline?env=prod',
      '/pipelines?env=staging',
      '/pipelines/validate-qc-results?env=staging',
      '/pipelines/timeline?env=staging',
      '/branches?env=prod',
      '/branches?env=staging',
      '/settings?env=prod',
      '/settings/members',
      '/settings/audit-log',
    ]) {
      const response = await page.goto(new URL(path, baseUrl).href)
      assert.equal(response?.status(), 200, `${path} should render`)
      assert.ok((await page.locator('main').innerText()).trim().length > 0, `${path} should contain rendered screen content`)
    }

    await page.goto(new URL('/incidents?env=staging', baseUrl).href)
    const stagingIncidents = await page.locator('main').innerText()
    assert.ok(stagingIncidents.includes('demo-stage-007'))
    assert.ok(!stagingIncidents.includes('demo-prod-214'))

    await page.goto(new URL('/pipelines?env=staging', baseUrl).href)
    const stagingPipelines = await page.locator('main').innerText()
    assert.ok(stagingPipelines.includes('validate-qc-results'))
    assert.ok(!stagingPipelines.includes('refresh-release-metrics'))

    await page.goto(new URL('/settings/members', baseUrl).href)
    await page.getByText('Identity records are loaded from Phlo.', { exact: false }).waitFor()
    const identity = await page.locator('body').innerText()
    assert.ok(identity.includes('demo:operator'))
    assert.equal(await page.getByRole('button', { name: 'Invite unavailable' }).isDisabled(), true)
    assert.ok(identity.includes('demo-automation'))

    await page.goto(new URL('/settings/audit-log', baseUrl).href)
    await page.getByText('Verified · 0 records', { exact: true }).waitFor()
    await page.getByText('No audit records match these filters.', { exact: true }).waitFor()

    await page.goto(new URL('/branches?branch=missing-branch', baseUrl).href)
    await page.getByText('Branch unavailable', { exact: true }).waitFor()
    assert.ok(!(await page.locator('main').innerText()).includes('Head prod-a1b2c3'), 'a stale selection must not silently show the default branch')

    assert.deepEqual(errors, [], 'routes should not throw client-side errors')
  } finally {
    await browser.close()
  }
})
