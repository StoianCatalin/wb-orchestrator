import { chromium } from 'playwright';

/** @var Browser  */
let browser
/** @var BrowserContext */
let context
/** @var Page */
let page

const defaultTimeout = 4 * 60 * 1000

export const setup = async ({ headless = true, timeout = defaultTimeout } = {}) => {
  browser = await chromium.launch({
    headless,
    timeout
  })
  context = await browser.newContext()
  page = await context.newPage()
  return page
}

export const teardown = async (waitForMs = 0) => {
  await page.waitForTimeout(waitForMs)
  await context.close()
  await browser.close()
}

export const getDate = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  const dateParts = date.toISOString().split('T')[0].split('-')
  return `${dateParts[0]}${dateParts[1]}${dateParts[2]}`
}
