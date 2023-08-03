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
                             maxLinksCount = 50,
                             timeout = defaultTimeout
                           }) => {
  const timerName = 'MCULTURII took'
  console.info('Starting MCULTURII script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mculturii: []
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

  const baseUrl = 'http://www.cultura.ro'
  const rootUrl = 'http://www.cultura.ro/proiecte-acte-normative/'
  const response = await page.goto(rootUrl)
  if (response.status() === 503) {
    await page.goto(rootUrl)
  }
  console.info(`Navigated to ${page.url()} to fetch links`)
  console.info('-------------------')

  const links = []
  for await (const article of await page.locator('div#recomended-articles div.item.col-sm-4.col-xs-12').all()) {
    links.push(await article.locator('.recommended-title a').getAttribute('href'))
  }

  console.info(`Found ${links.length} links`)
  console.info('-------------------')

  let linkCounter = 0
  for await (const link of links) {
    await page.goto(`${baseUrl}${link}`)
    console.info(`Navigated to ${page.url()} to fetch data`)
    console.info('-------------------')
    pageCounter += 1
    let formattedArticleName = ''
    const articleDateParts = (await page.locator('.post-created').textContent()).trim().split(' ')
    const articleDate = `${articleDateParts[0].padStart(2, '0')}-${getMonthFromROString(articleDateParts[1])}-${articleDateParts[2]}`

    const unformattedArticleName = (await page.locator('.node__content [property="schema:text"] p:first-child strong').allTextContents())
      .filter(part => !!part.trim())
      .map(part => part.trim())
      .join(' ')

    if (!unformattedArticleName) {
      formattedArticleName = (await page.locator('.post-title').textContent()).trim()
    } else {
      formattedArticleName = `${unformattedArticleName[0].toUpperCase()}${unformattedArticleName.slice(1).toLowerCase()}`
    }

    formattedArticleName = formattedArticleName
      .replace(/(\r\n|\n|\r)/gm, ' ')
      .replace(/\s+/g, ' ')
      .replaceAll(`\n`, ' ')
      .replaceAll(`–`, '-')
      .replaceAll(/\u00a0/g, ' ')
      .replaceAll(/\2013/g, ' ')
      .trim()

    const docs = []
    for await (const docLink of await page.locator(`a[data-entity-type="file"][href*="/sites/default/files/"]`).all()) {
      const docUrl = await docLink.getAttribute('href')
      const docName = (await docLink.textContent())
        .replaceAll(`–`, '-')
        .replaceAll(/\u00a0/g, ' ')
        .replaceAll(/\2013/g, ' ')
        .trim()
      const docType = getDocumentType(docUrl)
      docs.push({
        date: articleDate,
        link: `${baseUrl}${docUrl}`,
        title: docName,
        type: docType
      })
      docCounter[docType] = (docCounter[docType] || 0) + 1
      documentCounter += 1
    }

    if (docs.length > 0) {
      output.mculturii.push({
        currentUrl: page.url(),
        date: articleDate,
        name: formattedArticleName,
        documents: docs
      })
    }

    if (linkCounter >= maxLinksCount) {
      break
    }
    linkCounter += 1
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mculturii, docCounter, documentCounter, pageCounter)

  return output
}
