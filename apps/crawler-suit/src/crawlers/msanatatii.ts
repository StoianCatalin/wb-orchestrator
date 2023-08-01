import {
  defaultTimeout,
  getDocumentType,
  getMonthFromROString,
  outputReport,
  setup,
  teardown,
  throwIfNotOk
} from '../helpers';

export const main = async ({
                             headless = true,
                             maxLinksCount = 40,
                             timeout = defaultTimeout
                           }) => {
  const timerName = 'MSPORT took'
  console.info('Starting MSPORT script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    msport: []
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

  const rootUrl = 'https://sport.gov.ro/proiecte-legislative-in-dezbatere-publica/'
  throwIfNotOk(await page.goto(rootUrl))
  console.info(`Navigated to ${page.url()} to fetch links`)
  console.info('-------------------')
  pageCounter += 1

  await page.locator('a#cookie_action_close_header[role="button"]').click()

  const links = []
  let linkCounter = 0
  for await (const link of await page.locator('.wrapper a[href*="https://sport.gov.ro"]').all()) {
    if (linkCounter >= maxLinksCount) {
      break
    }
    links.push(link.getAttribute('href'))
    linkCounter += 1
  }

  for await (const link of links) {
    throwIfNotOk(await page.goto(link))
    console.info(`Navigated to ${page.url()} to fetch documents`)
    console.info('-------------------')
    pageCounter += 1

    const articleName = (await page.locator('h3.article-title').textContent())
      .trim()
      .replaceAll(`\n`, ' ')
      .replaceAll(`–`, '-')
      .replaceAll(/\u00a0/g, ' ')
      .replaceAll(/\2013/g, ' ')
      .trim()
    const articleDate = (await page.locator('div.article-date.cfx span.date').textContent())
      .trim()
      .replaceAll('.', '-')

    const documents = []
    const separateDocLinks = []
    for await (const document of await page.locator('div.article-content a[href*="https://sport.gov.ro"]').all()) {
      const documentUrl = await document.getAttribute('href')
      if (documentUrl.endsWith('/')) {
        separateDocLinks.push(documentUrl)
      } else {
        const documentName = (await document.textContent()).trim()
        const documentType = getDocumentType(documentUrl)
        documents.push({
          date: articleDate,
          link: documentUrl,
          title: documentName
            .replaceAll(`\n`, ' ')
            .replaceAll(`–`, '-')
            .replaceAll(/\u00a0/g, ' ')
            .replaceAll(/\2013/g, ' ')
            .trim(),
          type: getDocumentType(documentUrl)
        })
        documentCounter += 1
        docCounter[documentType] = (docCounter[documentType] || 0) + 1
      }
    }
    for await (const separateDocLink of separateDocLinks) {
      throwIfNotOk(await page.goto(separateDocLink))
      console.info(`Navigated to ${page.url()} to fetch the doc, as it's displayed on a separate attachment page`)
      console.info('-------------------')
      pageCounter += 1
      const documentLink = page.locator('div.article-content a[href*="https://sport.gov.ro"]')
      const documentUrl = await documentLink.getAttribute('href')
      const documentName = (await documentLink.textContent()).trim()
      const documentType = getDocumentType(documentUrl)
      documents.push({
        date: articleDate,
        link: documentUrl,
        title: documentName
          .replaceAll(`\n`, ' ')
          .replaceAll(`–`, '-')
          .replaceAll(/\u00a0/g, ' ')
          .replaceAll(/\2013/g, ' ')
          .trim(),
        type: getDocumentType(documentUrl)
      })
      documentCounter += 1
      docCounter[documentType] = (docCounter[documentType] || 0) + 1
    }
    if (documents.length > 0) {
      output.msport.push({
        currentUrl: page.url(),
        documents,
        date: articleDate,
        name: articleName,
      })
    }
  }


  await teardown()
  console.timeEnd(timerName)
  outputReport(output.msport, docCounter, documentCounter, pageCounter)

  return output
}
