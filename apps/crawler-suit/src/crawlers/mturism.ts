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
  const timerName = 'MTURISM took'
  console.info('Starting MTURISM script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mturism: []
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
  const baseUrl = 'https://turism.gov.ro/web/category/consultare-publica/'
  await page.goto(baseUrl)
  console.info(`Navigated to ${page.url()} to fetch page count`)
  pageCounter += 1
  const lastPageUrlParts = (await page.locator('.pag-last a').getAttribute('href')).split('/')
  const lastPageNumber = Number(lastPageUrlParts[lastPageUrlParts.length - 2])

  console.info(`Found ${lastPageNumber} pages`)
  console.info('-------------------')

  const articleLinks = []
  for await (const pageUrl of Array.from({ length: lastPageNumber }, (_, i) => `${baseUrl}page/${i + 1}/`)) {
    await page.goto(pageUrl)
    console.info(`Navigated to ${page.url()} to fetch links`)
    console.info('-------------------')
    pageCounter += 1
    const articles = await page.locator('.blog-title a').filter({
      hasText: 'Proiect',
    }).all()
    for await (const articleLink of articles) {
      const articleTitle = (await articleLink.textContent()).toLowerCase()
      if (
        articleTitle.includes('dezbatere') ||
        articleTitle.includes('proiecte') ||
        articleTitle.includes('consultare')
      ) {
        continue
      }
      articleLinks.push(await articleLink.getAttribute('href'))
    }
  }
  console.info(`Found ${articleLinks.length} links`)
  console.info('-------------------')

  for await (const articleLink of articleLinks) {
    await page.goto(articleLink)
    const currentPageUrl = page.url()
    console.info(`Navigated to ${currentPageUrl} to fetch documents`)
    console.info('-------------------')
    pageCounter += 1
    const currentDate = currentPageUrl.replace('https://turism.gov.ro/web/', '').split('/').reduce((acc, currentPart, index) => {
      if (index < 3) {
        acc.push(currentPart)
      }
      return acc
    }, []).reverse().join('-')

    let articleName = ''
    const headerArticleName = page.locator('.entry-content h2')
    const possibleArticleName = page.locator('.entry-content p:not(:first-child) strong')
    const docLinks = page.locator('.entry-content a[href*="https://turism.gov.ro/web/wp-content/uploads/"]')
    if (await docLinks.count() > 0) {
      if (await headerArticleName.count()) {
        articleName = (await headerArticleName.textContent()).trim()
      } else if (await possibleArticleName.count()) {
        articleName = (await possibleArticleName.allTextContents()).join().trim()
      } else {
        console.log(`Could not find article name for ${currentPageUrl}. Using the first document name instead.`)
        articleName = (await docLinks.first().textContent()).trim()
      }
      const docs = []
      for await (const docLink of await docLinks.all()) {
        const docUrl = await docLink.getAttribute('href')
        const docName = (await docLink.textContent()).trim()
          .replaceAll(`\n`, ' ')
          .replaceAll(`–`, '-')
          .replaceAll(/\u00a0/, ' ')
          .replaceAll(/\2013/g, ' ')
        const docType = getDocumentType(docUrl)
        docs.push({
          date: currentDate,
          link: docUrl,
          title: docName,
          type: docType
        })
        docCounter[docName] = (docCounter[docName] || 0) + 1
        documentCounter += 1
      }

      output.mturism.push({
        currentUrl: currentPageUrl,
        date: currentDate,
        name: articleName
          .replaceAll(`\n`, ' ')
          .replaceAll(`–`, '-')
          .replaceAll(/\u00a0/g, ' ')
          .replaceAll(/\2013/g, ' '),
        documents: docs
      })
    }
  }
  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mturism, docCounter, documentCounter, pageCounter)

  return output
}
