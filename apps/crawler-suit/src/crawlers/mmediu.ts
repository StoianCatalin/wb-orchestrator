import {
  defaultTimeout,
  getDocumentType,
  outputReport,
  getMonthFromROString,
  setup,
  teardown
} from '../helpers';

export const main = async ({
                      headless = true,
                      maxPages = 10,
                      timeout = defaultTimeout
                    }) => {
  const timerName = 'MMediu took'
  console.info('Starting MMediu script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mmediu: []
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
  const baseUrl = 'http://www.mmediu.ro'
  const rootUrl = 'http://www.mmediu.ro/categories/view/proiecte-de-acte-normative/41/page:'
  const links = []
  for await (const pageNumber of Array(maxPages).keys()) {
    await page.goto(`${rootUrl}${pageNumber + 1}`)
    console.info(`Navigated to ${page.url()} to fetch pages`)
    console.info('-------------------')
    pageCounter += 1
    for await (const link of await page.locator('article h3.title a').all()) {
      links.push(`${baseUrl}${(await link.getAttribute('href')).trim()}`)
    }
  }
  for await (const link of links) {
    await page.goto(link)
    await page.waitForLoadState('networkidle')
    console.info(`Navigated to ${page.url()} to fetch documents`)
    console.info('-------------------')
    pageCounter += 1
    const documentLinks = await page.locator('div.text a[href^="/app/webroot/uploads/"]')
    if ((await documentLinks.count()) === 0) {
      console.info(`${page.url()} has no documents that can be fetched. Continuing...`)
      console.info('-------------------')
      continue
    }
    const dateParts = (await page.locator('div.date div.col-sm-6').first().textContent())
      .replace('Data publicarii :', '')
      .trim()
      .split(' ')
    const date = `${dateParts[0]}-${getMonthFromROString(dateParts[1])}-${dateParts[2]}`
    const item = {
      currentUrl: page.url(),
      date,
      name: (await page.locator('h1.title').textContent()).trim(),
      documents: []
    }
    for await (const documentLink of await documentLinks.all()) {
      const documentHref = (await documentLink.getAttribute('href')).trim()
        .replaceAll(' ', '%20')
      item.documents.push({
        date,
        link: `${baseUrl}${documentHref}`,
        title: (await documentLink.textContent()).trim(),
        type: getDocumentType(documentHref),
      })
    }
    if (item.documents.length) {
      output.mmediu.push(item)
      documentCounter += item.documents.length
      item.documents.forEach((document) => {
        docCounter[document.type] = docCounter[document.type] ? docCounter[document.type] + 1 : 1
      })
    }
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output, docCounter, documentCounter, pageCounter)

  return output
}
