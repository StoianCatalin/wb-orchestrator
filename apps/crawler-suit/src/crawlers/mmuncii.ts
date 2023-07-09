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
  const timerName = 'MMUNCII took'
  console.info('Starting MMUNCII script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mmuncii: []
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

  const baseUrl = 'https://mmuncii.ro'
  const rootUrl = 'https://mmuncii.ro/j33/index.php/ro/transparenta/proiecte-in-dezbatere'

  await page.goto(rootUrl)
  console.info(`Navigated to ${page.url()} to fetch articles`)
  console.info('-------------------')
  pageCounter += 1

  const articleUrls = []
  const articles = page.locator('table.category.table.table-striped.table-bordered tbody a[href*="/j33/index.php/ro/transparenta/proiecte-in-dezbatere"]')
  for await (const articleUrl of await articles.all()) {
    articleUrls.push(await articleUrl.getAttribute('href'))
  }

  for await (const articleUrl of articleUrls) {
    await page.goto(`${baseUrl}${articleUrl}`)
    console.info(`Navigated to ${page.url()} to fetch documents`)
    console.info('-------------------')
    pageCounter += 1

    const articleName = (await page.locator('.page-header h2').textContent())
      .trim()
    const articleDateWrapper = page.locator('.item-page div[itemprop="articleBody"] p').filter({
      hasText: 'Publicat'
    })
    const articleDateWrapperContent = (await articleDateWrapper.first().textContent())
      .trim()
    const articleDateMatch = articleDateWrapperContent.match(/[0-9]{2}([.])[0-9]{2}[.][0-9]{4}/)
    let articleDate = ''
    if (Array.isArray(articleDateMatch) && articleDateMatch.length > 0) {
      articleDate = articleDateMatch[0].replaceAll('.', '-')
    }
    const docs = []
    for await (const docLink of await page.locator('.item-page div[itemprop="articleBody"] p a[href*="/j33/"]').all()) {
      const docUrl = await docLink.getAttribute('href')
      const docName = (await docLink.locator('..').textContent()).trim()
      const docType = getDocumentType(docUrl)
      docs.push({
        date: articleDate,
        link: docUrl,
        title: docName
          .replaceAll(`–`, '-')
          .replaceAll(/\u00a0/g, ' ')
          .replaceAll(/\2013/g, ' ')
          .trim(),
        type: docType
      })
      documentCounter += 1
      docCounter[docType] = (docCounter[docType] || 0) + 1
    }
    if (docs.length > 0) {
      output.mmuncii.push({
        currentUrl: page.url(),
        date: articleDate,
        name: articleName
          .replaceAll(`–`, '-')
          .replaceAll(/\u00a0/g, ' ')
          .replaceAll(/\2013/g, ' ')
          .trim(),
        documents: docs
      })
    }
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mmuncii, docCounter, documentCounter, pageCounter)

  return output
}
