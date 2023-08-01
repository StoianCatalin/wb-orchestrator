import {
  defaultTimeout,
  getDocumentType,
  outputReport,
  setup,
  teardown,
  throwIfNotOk
} from '../helpers';

export const main = async ({
                             headless = true,
                             timeout = defaultTimeout
                           }) => {
  const timerName = 'MCERCETARII took'
  console.info('Starting MCERCETARII script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mcercetarii: []
  }
  let documentCounter = 0
  let pageCounter = 0
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'image' ||
    route.request().url().endsWith('.css') ||
    route.request().url().endsWith('.js')
      ? route.abort()
      : route.continue()
  )

  const rootUrl = 'https://www.mcid.gov.ro/transparenta-decizionala-2/'

  throwIfNotOk(await page.goto(rootUrl))
  console.info(`Navigated to ${page.url()} to fetch articles, dates & documents`)
  console.info('-------------------')
  pageCounter += 1

  await page.locator('div.cky-consent-container button.cky-btn.cky-btn-accept').click()

  for await (const toggleLink of await page.locator('.elementor-toggle .elementor-tab-title').all()) {
    const tabControls = await toggleLink.getAttribute('aria-controls')
    await toggleLink.click()
    const table = page.locator(`[id*="${tabControls}"]`).locator('table[width][cellpadding][cellspacing][border]')
    await table.waitFor({
      state: 'visible'
    })
    const tableRows = await table.locator('tbody tr:not(:first-child)').all()
    console.info(`Found ${tableRows.length} rows in table`)
    console.info('-------------------')
    let rowIndex = 0
    for await (const row of tableRows) {
      console.info(`Processing row ${rowIndex += 1} of ${tableRows.length}`)
      console.info('-------------------')
      const articleDate = (await row.locator('td').nth(0).textContent())
        .trim()
        .replaceAll('.', '-')
      const articleHasParagraph = (await row.locator('td').nth(1).locator('p').count()) > 0
      let articleName = ''
      if (articleHasParagraph) {
        articleName = (await row.locator('td').nth(1).locator('p:first-child').textContent())
      } else {
        articleName = (await row.locator('td').nth(1).textContent())
      }
      articleName = articleName
        .replaceAll(`–`, '-')
        .replaceAll(/\u00a0/g, ' ')
        .replaceAll(/\2013/g, ' ')
        .trim()

      const docs = []
      for await (const docLink of await row.locator('td').nth(1).locator('a[href]').all()) {
        const docUrl = await docLink.getAttribute('href')
        const docName = (await docLink.textContent())
          .trim()
        const docType = getDocumentType(docUrl)
        if (docType !== 'unknown') {
          docs.push({
            date: articleDate,
            link: docUrl,
            title: docName,
            type: docType
          })
          documentCounter += 1
          docCounter[docType] = (docCounter[docType] || 0) + 1
        }
      }
      if (docs.length) {
        output.mcercetarii.push({
          currentUrl: page.url(),
          date: articleDate,
          documents: docs,
          name: articleName
        })
      }
    }
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mcercetarii, docCounter, documentCounter, pageCounter)

  return output
}
