import {
  defaultTimeout,
  getDocumentType,
  outputReport,
  setup,
  teardown
} from '../helpers';

export const main = async ({
                             headless = true,
                             maxArticles = 100,
                             maxResults = 100,
                             timeout = defaultTimeout
                           }) => {
  const timer = Date.now()
  const timerName = 'MDezvoltarii took'
  console.info('Starting MDezvoltarii script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mdezvoltarii: []
  }
  await page.route('**/*', (route) =>
    route.request().url().includes('stylesheet?id')
      ? route.abort()
      : route.continue()
  )
  let documentCounter = 0
  let pageCounter = 0
  const baseUrl = 'https://www.mdlpa.ro/'
  const rootUrl = 'https://www.mdlpa.ro/pages/actenormativecaractergeneral'
  const response = await page.goto(rootUrl)
  if (response.status() === 503) {
    await page.goto(rootUrl)
  }
  const yearlyArchives = [
    'https://www.mdlpa.ro/pages/actenormativecaractergeneral'
  ]
  console.info(`Navigated to ${page.url()} to fetch links for the previous years' archives`)
  console.info('-------------------')
  const archivedYearsLinks = page.locator('a[role="link"][href*="pages/arhiva"]').filter({
    hasText: 'Arhiva'
  })
  for await (const archiveLink of await archivedYearsLinks.all()) {
    const archiveUrl = (await archiveLink.getAttribute('href')).replaceAll('../', '')
    yearlyArchives.push(`${baseUrl}${archiveUrl}`)
  }
  for await (const archiveUrl of yearlyArchives) {
    if (output.mdezvoltarii.length > maxArticles) {
      console.info(`Reached maximum results limit of ${maxArticles}, stop fetching article page links from ${archiveUrl}`)
      console.info('-------------------')
      break
    }
    await page.goto(archiveUrl)
    console.info(`Navigated to ${page.url()} to fetch pages links`)
    console.info('-------------------')
    pageCounter += 1
    const linksList = page.locator('div[class=""][data-raofz="16"] > ul[style]').first()
    const linksListItems = linksList.locator('li[data-raofz="16"]')
    for await (const listItem of await linksListItems.all()) {
      let linkDate = ''
      const link = listItem.locator('a[role="link"][data-raofz="16"]')
      const linkUrl = (await link.getAttribute('href')).replaceAll('../', '')
      const linkDateElement = listItem.locator('span[data-raofz="16"]')
      if (!await linkDateElement.count() || await linkDateElement.locator('a').count()) {
        const linkDateMatcher = (await listItem.textContent()).match(/\d{2}\/\d{2}\/\d{4}/)
        if (Array.isArray(linkDateMatcher) && linkDateMatcher.length > 0) {
          linkDate = linkDateMatcher[0].replaceAll('/', '-').trim()
        } else {
          linkDate = '-'
        }
      } else {
        linkDate = (await listItem.locator('span[data-raofz="16"]').textContent()).trim()
          .replaceAll('(', '')
          .replaceAll(')', '')
          .replaceAll('/', '-')
      }
      output.mdezvoltarii.push({
        currentUrl: `${baseUrl}${linkUrl}`,
        date: linkDate,
        name: (await link.textContent()).trim(),
        documents: []
      })
      if (output.mdezvoltarii.length > maxArticles) {
        console.info(`Reached maximum results limit of ${maxArticles}, stop fetching article page links...`)
        console.info('-------------------')
        break
      }
    }
  }
  console.info(`Found ${output.mdezvoltarii.length} items. Accessing each page to fetch documents links...`)
  console.info('-------------------')
  try {
    for await (const docPage of output.mdezvoltarii) {
      await page.goto(docPage.currentUrl)
      console.info(`Navigated to ${docPage.currentUrl} to fetch documents links`)
      console.info('-------------------')
      pageCounter += 1
      const docLinks = page.locator(`a[role="link"][href^="../../uploads"]`)
      for await (const docLink of await docLinks.all()) {
        const docUrl = (await docLink.getAttribute('href')).replaceAll('../../', '')
        const docType = getDocumentType(docUrl)
        if (!docCounter[docType]) {
          docCounter[docType] = 0
        }
        docCounter[docType] += 1
        documentCounter += 1
        docPage.documents.push({
          date: docPage.date,
          link: `${baseUrl}${docUrl}`,
          title: (await docLink.textContent()).trim(),
          type: docType
        })
      }
      if (documentCounter >= maxResults) {
        console.info(`Reached maximum results limit of ${maxResults}, stop accessing pages to fetch documents...`)
        console.info('-------------------')
        break
      }
      if (Date.now() - timer > timeout) {
        console.info(`Reached timeout limit of ${timeout}ms, stop fetching documents and gracefully exit`)
        console.info('-------------------')
        break
      }
    }
  } catch (error) {
    console.info(`General error while fetching documents links page...\nGracefully exiting...`)
    console.info('-------------------')
    console.error(error)
  }

  output.mdezvoltarii = output.mdezvoltarii.filter(docPage => docPage.documents.length > 0)

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mdezvoltarii, docCounter, documentCounter, pageCounter)

  return output
}
