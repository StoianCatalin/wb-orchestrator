import {
  defaultTimeout,
  getDocumentType,
  outputReport,
  setup,
  teardown,
} from '../helpers';

export const main = async ({
                             headless = true,
                             timeout = defaultTimeout
                           }) => {
  const timerName = 'MAPN took'
  console.info('Starting MAPN script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mapn: []
  }
  let documentCounter = 0
  let pageCounter = 0
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'image' ||
    route.request().url().includes('stylesheet?id') ||
    route.request().url().endsWith('.css')
      ? route.abort()
      : route.continue()
  )

  const rootUrl = 'https://sg.mapn.ro/transparenta'
  const response = await page.goto(rootUrl)
  if (response.status() === 503) {
    await page.goto(rootUrl)
  }
  console.info(`Navigated to ${page.url()} to change years filter`)
  console.info('-------------------')
  pageCounter += 1
  const years = [
    '2023',
    '2022',
    '2021',
    '2020',
    '2019',
    '2018'
  ]
  const yearSelect = page.locator('select[name="filter_year"]')
  const yearSelectButton = page.locator('button[type="submit"]')
  for await (const year of years) {
    await yearSelect.selectOption({ value: year })
    const yearSelectResponse = page.waitForResponse(response =>
      response.url().includes('filterProjects') &&
      response.request().method() === 'POST' &&
      response.status() === 200
    )
    await yearSelectButton.click()
    await yearSelectResponse
    console.info(`Changed year to ${year}`)
    console.info('-------------------')
    pageCounter += 1
    for await (const article of await page.locator('#filter-row .col-xs-12.col-sm-12').all()) {
      const articleDate = (await article.locator('strong i').filter({
        hasText: 'DATA AFISĂRII: '
      }).textContent())
        .replaceAll('(', '')
        .replaceAll(')', '')
        .replaceAll('DATA AFISĂRII:', '')
        .trim()
      const item = {
        currentUrl: page.url(),
        date: articleDate,
        documents: [],
        name: (await article.locator('strong').first().textContent())
          .trim()
      }
      for await (const link of await article.locator('a[href^="https://sg.mapn.ro/proiecte/"]').all()) {
        const docLink = await link.getAttribute('href')
        const docType = getDocumentType(docLink)
        if (docType !== 'unknown') {
          item.documents.push({
            date: articleDate,
            link: docLink,
            title: (await link.textContent()).trim(),
            type: docType
          })
          documentCounter += 1
          docCounter[docType] = docCounter[docType] ? docCounter[docType] + 1 : 1
        }
      }
      output.mapn.push(item)
    }
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mapn, docCounter, documentCounter, pageCounter)
  return output
}
