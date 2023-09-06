import {
  defaultTimeout,
  getDocumentType,
  getMonthFromROString,
  outputReport,
  setup,
  teardown,
} from '../helpers';

export const main = async ({
                             headless = true,
                             maxLinksCount = 125,
                             timeout = defaultTimeout
                           }) => {
  const timerName = 'MAGRICULTURII took'
  console.info('Starting MAGRICULTURII script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    magriculturii: []
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

  const baseUrl = 'https://www.madr.ro'
  const rootUrl = 'https://www.madr.ro/proiecte-de-acte-normative.html'
  const response = await page.goto(rootUrl)
  if (response.status() === 503) {
    await page.goto(rootUrl)
  }
  console.info(`Navigated to ${page.url()} to fetch page count`)
  console.info('-------------------')
  pageCounter += 1

  const lastStartIndexNumber = (await page.locator('div.k2Pagination ul li.pagination-end a').getAttribute('href'))
    .replace('/proiecte-de-acte-normative.html?start=', '')

  const indexes = Array.from({ length: Math.ceil(lastStartIndexNumber / 10) + 1 }, (_, i) => i * 10)
  const articles = page.locator('div.itemList div#itemListPrimary .catItemView.groupPrimary')
  let counter = 0
  const items = []
  while (true) {
    await page.goto(`${rootUrl}?start=${indexes[counter]}`)
    console.info(`Navigated to ${page.url()} to fetch links, documents`)
    console.info('-------------------')
    pageCounter += 1

    for await (const article of await articles.all()) {
      const itemDateParts = (await article.locator('div.catItemHeader .catItemDateCreated').textContent())
        .trim()
        .split(',')
      const itemDateHourParts = itemDateParts[1].trim().split(' ')
      const itemDate = `${itemDateHourParts[0]}-${getMonthFromROString(itemDateHourParts[1])}-${itemDateHourParts[2]}`
      const itemContentParts = (await article.locator('div.catItemBody .catItemIntroText p').first().innerHTML()).trim().split('<br>')
      const docs = []
      for await (const docLink of await article.locator('.catItemAttachments li a[href^="/proiecte-de-acte-normative/download/"]').all()) {
        const docHref = await docLink.getAttribute('href')
        const docTitle = await docLink.getAttribute('title')
        const docType = getDocumentType(docTitle)
        docs.push({
          date: itemDate,
          link: `${baseUrl}${docHref}`,
          title: docTitle,
          type: docType
        })
        documentCounter += 1
        docCounter[docType] = (docCounter[docType] || 0) + 1
      }
      const articleName = itemContentParts[0].split('În conformitate cu prevederile Legii')
      const item = {
        currentUrl: page.url(),
        date: itemDate,
        name: articleName[0]
          .trim()
          .replaceAll('&nbsp;', ' ')
          .replaceAll(`–`, '-')
          .replace(/(<([^>]+)>)/gi, ''),
        documents: docs
      }
      items.push(item)
    }
    output.magriculturii = [...output.magriculturii, ...items]
    if (items.length >= maxLinksCount) {
      break
    }
    counter +=1
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.magriculturii, docCounter, documentCounter, pageCounter)

  return output
}
