import {
  defaultTimeout,
  getDocumentType,
  outputReport,
  setup,
  teardown,
  getMonthFromROString
} from '../helpers';

const pageUrls = [
  'https://www.mae.ro/node/2011'
]

export const main = async ({
                      headless = true,
                      timeout = defaultTimeout
                    }) => {
  const timerName = 'MAE took'
  console.info('Starting MAE script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mae: []
  }
  const baseUrl = 'https://www.mae.ro'
  let documentCounter = 0
  let pageCounter = 0
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'image' ||
    route.request().url().endsWith('.js')
      ? route.abort()
      : route.continue()
  )
  for await (const pageUrl of pageUrls) {
    await page.goto(pageUrl)
    console.info(`Navigated to ${page.url()} to fetch documents`)
    console.info('-------------------')
    pageCounter += 1
    for await (const table of await page.locator('div.art table').all()) {
      const item = {
        currentUrl: page.url(),
        date: '',
        name: '',
        documents: []
      }
      let rowIndex = 0
      const dateRow = table.locator('tr').filter({
        hasText: 'Publicat:'
      })
      const dateParts = (await dateRow.locator('strong').locator('..').filter({
        hasText: 'Publicat:'
      }).textContent())
        .replace('Publicat: ', '')
        .replaceAll(/\u00a0/g, ' ')
        .trim()
        .split(' ')
      item.date = `${dateParts[0]}-${getMonthFromROString(dateParts[1])}-${dateParts[2]}`
      for await (const tableRow of await table.locator('tr').all()) {
        const tableCell = tableRow.locator('td').first()
        const cellLink = tableCell.locator('a[href^="/sites/default/files"]')
        if (rowIndex === 0) {
          const linkMap = {}
          for await (const link of await cellLink.all()) {
            const linkHref = await link.getAttribute('href')
            if ((await link.textContent()).trim() === '') {
              continue
            }
            if (linkMap[linkHref] === undefined) {
              linkMap[linkHref] = []
            }
            linkMap[linkHref].push(
              (await link.evaluate(node => node.innerText))
                .replaceAll(/\u00a0/g, ' ')
                .replaceAll(/\n/g, ' ')
                .replaceAll(/\t/g, ' ')
                .trim()
            )
          }
          for await (const linkHref of Object.keys(linkMap)) {
            item.name = linkMap[linkHref].join(' ')
            const docType = getDocumentType(linkHref)
            item.documents.push({
              date: item.date,
              link: `${baseUrl}${linkHref}`,
              title: item.name,
              type: docType
            })
            docCounter[docType] = (docCounter[docType] || 0) + 1
            documentCounter += 1
          }
        } else {
          for await (const link of await cellLink.all()) {
            const linkHref = await link.getAttribute('href')
            const docType = getDocumentType(linkHref)
            item.documents.push({
              date: item.date,
              link: `${baseUrl}${linkHref}`,
              title: (await link.evaluate(node => node.innerText))
                .replaceAll(/\u00a0/g, ' ')
                .replaceAll(/\n/g, ' ')
                .replaceAll(/\t/g, ' ')
                .trim(),
              type: docType
            })
            docCounter[docType] = (docCounter[docType] || 0) + 1
            documentCounter += 1
          }
        }
        rowIndex += 1
      }

      output.mae.push(item)
    }
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mae, docCounter, documentCounter, pageCounter)
  return output
}

module.exports = {
  main
}