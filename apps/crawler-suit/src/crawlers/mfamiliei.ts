import {
  defaultTimeout,
  getDocumentType,
  outputReport,
  setup,
  teardown
} from '../helpers';

export const main = async ({
                      headless = true,
                      timeout = defaultTimeout
                    }) => {
  const timerName = 'MFAMILIEI took'
  console.info('Starting MFAMILIEI script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mfamiliei: []
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

  const rootUrl = 'https://mfamilie.gov.ro/1/proiecte-de-acte-normative-2/'

  await page.goto(rootUrl)
  console.info(`Navigated to ${page.url()} to fetch page count`)
  console.info('-------------------')
  pageCounter += 1

  await page.locator('#wt-cli-accept-all-btn').click()

  const lastPageNumber = Number(await page.locator('.page-links a[href].post-page-numbers:last-child').textContent())

  for await (const pageNumber of Array.from({ length: lastPageNumber }, (_, i) => i + 1)) {
    await page.goto(`${rootUrl}page/${pageNumber}/`)
    console.info(`Navigated to ${page.url()} to fetch articles, dates & documents`)
    console.info('-------------------')
    pageCounter += 1

    let articleCounter = 0

    const articlesWrapper = page.locator('article.page.type-page')
    const articleDates = await articlesWrapper.locator('p span[style] b').filter({
      hasText: "Data publicării: "
    }).all()

    const articles = await articlesWrapper.locator('blockquote').all()

    const items = []

    for await (const article of articles) {
      const articleDate = (await articleDates[articleCounter].textContent())
        .replace('Data publicării: ', '')
        .replaceAll('.', '-')
      const articleName = (await article.locator('p').first().textContent())
        .trim()
        .replace('ANUNȚ – ', '')
      const docs = []

      for await (const doc of await article.locator('ul').last().locator('li a[href]').all()) {
        const docName = (await doc.textContent()).trim()
        const docUrl = await doc.getAttribute('href')
        const docType = getDocumentType(docUrl)
        docs.push({
          date: articleDate,
          link: docUrl,
          title: docName,
          type: docType
        })
        documentCounter += 1
        docCounter[docType] = (docCounter[docType] || 0) + 1
      }
      if (docs.length > 0) {
        items.push({
          currentUrl: page.url(),
          date: articleDate,
          documents: docs,
          name: articleName,
        })
      }

      articleCounter += 1
    }
    output.mfamiliei = [...output.mfamiliei, ...items]
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mfamiliei, docCounter, documentCounter, pageCounter)

  return output
}
