import {
  defaultTimeout,
  getDocumentType,
  getMonthFromROString,
  outputReport,
  setup,
  teardown
} from '../helpers';

export const main = async ({
                             headless = true,
                             timeout = defaultTimeout
                           }) => {
  const timerName = 'MEconomiei took'
  console.info('Starting MEconomiei script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    meconomiei: []
  }
  let documentCounter = 0
  let pageCounter = 0
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'image' ||
    route.request().url().endsWith('.css') ||
    route.request().url().includes('stylesheet?id') ||
    route.request().url().endsWith('.js')
      ? route.abort()
      : route.continue()
  )
  const urlPrefix = 'https://economie.gov.ro/proiecte-de-acte-normative-aflate-in-consultare-publica/'
  const response = await page.goto(urlPrefix)
  if (response.status() === 503) {
    await page.goto(urlPrefix)
  }
  console.info(`Navigated to ${page.url()} to fetch last page from pagination`)
  console.info('-------------------')
  pageCounter += 1
  await page.locator('.cky-notice-btn-wrapper .cky-btn-accept').click()
  const mainWrapper = page.locator('article.page .pt-cv-wrapper')
  const lastPageNumber = Number(await mainWrapper.locator('.pt-cv-pagination .cv-pageitem-number').last().textContent())

  for await (const currentPageNumber of Array(lastPageNumber).keys()) {
    await page.goto(`${urlPrefix}?_page=${currentPageNumber + 1}`)
    console.info(`Navigated to ${page.url()} to fetch names, dates and documents`)
    console.info('-------------------')
    pageCounter += 1
    for await (const article of await mainWrapper.locator('.pt-cv-ifield').all()) {
      const articleDateParts = (await article.locator('.entry-date time').textContent())
        .trim()
        .split(' ')
      const articleDate = `${articleDateParts[0].padStart(2, '0')}-${getMonthFromROString(articleDateParts[1])}-${articleDateParts[2]}`
      const articleLink = article.locator('.pt-cv-title a')
      const item = {
        currentUrl: await articleLink.getAttribute('href'),
        date: articleDate,
        name: (await articleLink.textContent()).trim(),
        documents: []
      }
      for await (const docLink of await article.locator(
        '.pt-cv-content a[href^="https://economie.gov.ro/wp-content/uploads/"], .pt-cv-content a[href^="https://oldeconomie.gov.ro/images/"]')
        .all()
        ) {
        const documentLink = (await docLink.getAttribute('href')).replaceAll(' ', '%20')
        const documentType = getDocumentType(documentLink)
        item.documents.push({
          date: item.date,
          link: documentLink,
          title: (await docLink.textContent()).trim(),
          type: documentType
        })
        documentCounter += 1
        docCounter[documentType] = docCounter[documentType] + 1 || 1
      }
      output.meconomiei.push(item)
    }
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.meconomiei, docCounter, documentCounter, pageCounter)

  return output
}
