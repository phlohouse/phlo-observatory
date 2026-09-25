// Dev helper: screenshot routes in light/dark, desktop/phone. Usage:
//   node scripts/screenshot.mjs http://localhost:3000 out-dir /,/incidents
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const [base = 'http://localhost:3000', out = 'shots', list = '/'] = process.argv.slice(2)
const routes = list.split(',')
mkdirSync(out, { recursive: true })
const sizes = { desktop: [1440, 960], phone: [390, 844] }
const browser = await chromium.launch()
for (const theme of ['light', 'dark']) {
  for (const [name, [w, h]] of Object.entries(sizes)) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme })
    await ctx.addInitScript((t) => localStorage.setItem('phlo-theme', t), theme)
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    for (const r of routes) {
      await page.goto(base + r, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      const file = `${out}/${(r.replace(/[/?=&$]/g, '_') || 'root')}-${name}-${theme}.png`
      await page.screenshot({ path: file })
      if (errors.length) console.log(r, name, theme, errors.splice(0).join(' | ').slice(0, 400))
    }
    await ctx.close()
  }
}
await browser.close()
