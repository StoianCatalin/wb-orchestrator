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
  const timerName = 'MSANATATII took'
  console.info('Starting MSANATATII script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    msanatatii: []
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
  const baseUrl = 'https://www.ms.ro'
  const rootUrl = 'https://www.ms.ro/ro/transparenta-decizionala/acte-normative-in-transparenta/'
  const response = await page.goto(rootUrl)
  if (response.status() === 503) {
    await page.goto(rootUrl)
  }
  await page.locator('.modal-dialog button[type="submit"]').click()
  console.info(`Navigated to ${page.url()} to page count`)
  console.info('-------------------')
  pageCounter += 1
  const lastPageUrlParts = (await page.locator('ul.pagination li.page-item.px-1.pt-1 span').textContent()).split('/')
  const lastPageNumber = Number(lastPageUrlParts[lastPageUrlParts.length - 1])

  const links = []
  for await (const pageUrl of Array.from({ length: lastPageNumber }, (_, i) => `${rootUrl}?page=${i + 1}`)) {
    await page.goto(pageUrl)
    console.info(`Navigated to ${page.url()} to fetch links`)
    console.info('-------------------')
    pageCounter += 1

    for await (const link of await page.locator('h4 a[href^="/ro/transparenta-decizionala/acte-normative-in-transparenta/"]').all()) {
      links.push(await link.getAttribute('href'))
    }
  }

  for await (const link of links) {
    await page.goto(`${baseUrl}${link}`)
    console.info(`Navigated to ${page.url()} to fetch documents`)
    console.info('-------------------')
    pageCounter += 1
    const articleDateParts = (await page.locator('.article-date-wrapper').textContent()).trim().split(' ')
    const articleDate = `${articleDateParts[0].padStart(2, '0')}-${getMonthFromROString(articleDateParts[1])}-${articleDateParts[2]}`
    const documents = []

    for await (const docLink of await page.locator('.section.blog-post a[href^="/media/documents"]').all()) {
      const docUrl = await docLink.getAttribute('href')
      const docName = (await docLink.textContent()).trim()
      const docType = getDocumentType(docUrl)
      documents.push({
        date: articleDate,
        link: `${baseUrl}${docUrl}`,
        title: docName,
        type: docType
      })
      docCounter[docType] = (docCounter[docType] || 0) + 1
      documentCounter += 1
    }

    output.msanatatii.push({
      currentUrl: page.url(),
      date: articleDate,
      name: (await page.locator('h2.title.article').textContent()).trim(),
      documents
    })

    console.info(`Setting a timer of .25 seconds, as the nginx server is blocking requests if done too fast - 429 Too many requests`)
    console.info('-------------------')
    await page.waitForTimeout(250)
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.msanatatii, docCounter, documentCounter, pageCounter)

  return output
}
