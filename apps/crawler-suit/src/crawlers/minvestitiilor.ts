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
  const timerName = 'MINVESTITIILOR took'
  console.info('Starting MINVESTITIILOR script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    minvestitiilor: []
  }
  let documentCounter = 0
  let pageCounter = 0

  const urlsToParse = [
    'https://mfe.gov.ro/informatii-de-interes-public/acte-normative-in-consultare-publica/',
    'http://mfe.gov.ro/arhiva-acte-normative-in-consultare-publica-2022/',
    'http://mfe.gov.ro/arhiva-acte-normative-in-consultare-publica-2021/',
    'http://mfe.gov.ro/arhiva-acte-normative-in-consultare-publica-2020/',
    'http://mfe.gov.ro/arhiva-acte-normative-in-consultare-publica-2019/'
  ]

  await page.route('**/*', (route) =>
    route.request().resourceType() === 'image' ||
    route.request().url().endsWith('.css') ||
    route.request().url().endsWith('.js')
      ? route.abort()
      : route.continue()
  )

  const articlesTable = page.locator('table.footable.footable-loaded.no-paging')

  for await (const urlToParse of urlsToParse) {
    let articlesTableFound = false
    while (!articlesTableFound) {
      await page.goto(urlToParse, {
        timeout: 5 * 1000,
        waitUntil: 'networkidle'
      })
      console.info(`Navigated to ${page.url()} to fetch articles, dates, documents from table rows`)
      console.info('-------------------')
      pageCounter += 1

      articlesTableFound = await articlesTable.count() > 0
      if (articlesTableFound) {
        for await (const articleRow of await articlesTable.locator('tbody tr[style]').all()) {
          const articleName = await articleRow.locator('td').nth(1).textContent()
          const articleDateTimeParts = (await articleRow.locator('td').nth(2).textContent()).split(' ')
          const articleDateParts = articleDateTimeParts[0].split('-')
          const articleDate = `${articleDateParts[2]}-${articleDateParts[1]}-${articleDateParts[0]}`
          const articleDownloadLink = articleRow.locator('td').last().locator('a[href][role="link"]')
          const articleDownloadUrl = await articleDownloadLink.getAttribute('href')
          const articleType = getDocumentType(articleDownloadUrl)

          if (![undefined, ''].includes(articleDownloadUrl) && !articleDownloadUrl.endsWith('/')) {
            output.minvestitiilor.push({
              currentUrl: page.url(),
              date: articleDate,
              name: articleName
                .replace(/(\r\n|\n|\r)/gm, ' ')
                .replace(/\s+/g, ' ')
                .replaceAll(`\n`, ' ')
                .replaceAll(`–`, '-')
                .replaceAll(/\u00a0/g, ' ')
                .replaceAll(/\2013/g, ' ')
                .trim(),
              documents: [
                {
                  date: articleDate,
                  link: articleDownloadLink,
                  title: (articleName.split(' ') ?? [''])[0] ?? 'Act normativ',
                  type: articleType
                }
              ]
            })
            documentCounter += 1
            docCounter[articleType] = (docCounter[articleType] ?? 0) + 1
          }
        }
      } else {
        console.info(`${urlToParse} did not load properly, retrying...`)
        console.info('-------------------')
      }
    }
  }


  await teardown()
  console.timeEnd(timerName)
  outputReport(output.minvestitiilor, docCounter, documentCounter, pageCounter)

  return output
}
