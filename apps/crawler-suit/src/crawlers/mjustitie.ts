import {
  defaultTimeout,
  getDocumentType,
  outputReport,
  setup,
  teardown,
  throwIfNotOk,
} from '../helpers';

export const main = async ({
                             headless = true,
                             timeout = defaultTimeout
                           }) => {
  const timerName = 'MJustitiei took'
  console.info('Starting MJustitiei script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mjustitiei: []
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
  throwIfNotOk(await page.goto('https://www.just.ro/informatii-de-interes-public/acte-normative/proiecte-in-dezbatere/'))
  console.info(`Navigated to ${page.url()} to titles, dates & links`)
  console.info('-------------------')
  pageCounter += 1
  await page.waitForSelector('#ct-ultimate-gdpr-cookie-accept')
  await page.locator('#ct-ultimate-gdpr-cookie-accept').click()
  const items = []
  for await (const article of await page.locator('.brz-posts .brz-posts__item').all()) {
    const articleLink = await article.locator('a').getAttribute('href')
    const articleTitle = (await article.locator('[data-population="brizy_dc_post_title"]').textContent())
      .trim()
      .replaceAll('–', '-')
    const articleDate = (await article.locator('[data-population="brizy_dc_post_date"]').textContent())
      .trim()
      .replaceAll('/', '-')

    items.push({
      currentUrl: articleLink,
      date: articleDate,
      documents: [],
      name: articleTitle
    })
  }
  let currentIndex = 0
  for await (const item of items) {
    throwIfNotOk(await page.goto(item.currentUrl))
    console.info(`Navigated to ${page.url()} to fetch documents`)
    console.info('-------------------')
    pageCounter += 1
    const documentDate = (await page.locator('[data-population="brizy_dc_post_date"]').textContent())
      .trim()
      .replaceAll('/', '-')
    const documents = []
    for await (const link of await page.locator('.brz-section__content a[href^="https://www.just.ro/wp-content/uploads/"]').all()) {
      const documentLink = (await link.getAttribute('href')).replaceAll(' ', '%20')
      const documentTitle = (await link.textContent()).trim().replaceAll('–', '-')
      const documentType = getDocumentType(documentLink)
      if (documentTitle !== '') {
        documents.push({
          date: documentDate,
          link: documentLink,
          title: documentTitle,
          type: documentType
        })
        documentCounter += 1
        docCounter[documentType] = docCounter[documentType] + 1 || 1
      }
    }
    items[currentIndex].documents = documents
    currentIndex += 1
  }

  output.mjustitiei = items

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mjustitiei, docCounter, documentCounter, pageCounter)

  return output
}
