import {
  defaultTimeout,
  getDate,
  getDocumentType,
  outputReport,
  setup,
  teardown,
} from '../helpers';

export const main = async ({
                             headless = true,
                             timeout = defaultTimeout,
                             timestamp = Date.now()
                           }) => {
  const timerName = 'CDEP-PL took'
  console.info('Starting CDEP-PL script...')
  console.info('-------------------')
  console.time(timerName)
  let documentCounter = 0
  let pageCounter = 0
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    camera_deputatilor_pl: []
  }
  await page.route('**/*', (route) =>
    route.request().url().includes('stylesheet?id')
      ? route.abort()
      : route.continue()
  )
  const today = new Date()
  const formattedToday = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`
  const baseUrl = 'https://www.cdep.ro'
  const rootUrl = `https://www.cdep.ro/pls/caseta/eCaseta2015.OrdineZi?dat=${timestamp ? getDate(timestamp) : ''}`
  const response = await page.goto(rootUrl)
  if (response.status() === 503) {
    await page.goto(rootUrl)
  }
  console.info(`Navigated to ${page.url()} to fetch links`)
  console.info('-------------------')
  pageCounter += 1
  const regNoPrefix = 'Nr. înregistrare:'
  const docsFieldName = 'Consultati:'
  const cookieButton = page.getByLabel('dismiss cookie message')
  if (await cookieButton.count()) {
    await cookieButton.click()
  }

  const rows = page.locator('.grup-parlamentar-list.grupuri-parlamentare-list table').locator('tbody tr:not([style])')
  if (!await rows.count()) {
    await teardown()
    console.timeEnd(timerName)
    console.error(`No data found for today. Exiting...`)
    return output
  }

  const links = []
  for await (const row of await rows.all()) {
    const rowLinks = (await row.locator('a[href][target="PROIECT"]').filter({
      hasText: 'Pl-x'
    }).all())
    for await (const link of rowLinks) {
      links.push(await link.getAttribute('href'))
    }
  }

  let currentLinkIndex = 0
  for await (const link of links) {
    await page.goto(`${baseUrl}${link}`)
    console.info(`Navigated to ${page.url()} to fetch details and documents`)
    console.info('-------------------')
    pageCounter += 1
    const fieldsContainer = page.locator('.detalii-initiativa').first()
    const historyTable = page.locator('.program-lucru-detalii > #olddiv > table')
    output.camera_deputatilor_pl.push({
      currentUrl: page.url(),
      date: formattedToday,
      name: (await page.locator('.boxTitle').textContent()).trim(),
      title: (await fieldsContainer.locator('h4').textContent()).trim(),
      fields: [],
      docHistory: []
    })
    const fieldRows = fieldsContainer.locator('> table:not([style]) > tbody > tr')
    let currentFieldIndex = 0
    for await (const fieldRow of await fieldRows.all()) {
      const fieldName = fieldRow.locator('> td').first()
      let fieldNameText = (await fieldName.textContent()).trim()
      const fieldValue = fieldRow.locator('> td').last()
      const fieldValueText = (await fieldValue.textContent()).trim()
      const fieldValueExternalLink = fieldValue.locator('a[href^="http"]')

      if (
        await fieldRow.locator('td').count() === 1 ||
        fieldNameText.toLowerCase().includes(regNoPrefix.toLowerCase()) ||
        !fieldValueText
      ) {
        continue
      }
      if (fieldNameText === docsFieldName) {
        const docsRows = fieldValue.locator('> table > tbody > tr')
        if (await docsRows.count()) {
          output.camera_deputatilor_pl[currentLinkIndex].fields.push({
            name: 'documents',
            value: []
          })
          for await (const docRow of await docsRows.all()) {
            const docLink = await docRow.locator('a[href]').getAttribute('href')
            const docType = getDocumentType(docLink)
            const docTitle = (await docRow.locator('> td').last().textContent()).trim()
            if (docType !== 'unknown') {
              output.camera_deputatilor_pl[currentLinkIndex].fields[currentFieldIndex].value.push({
                link: `${baseUrl}${docLink}`,
                title: docTitle,
                type: docType,
              })
              docCounter[docType] = docCounter[docType] ? docCounter[docType] + 1 : 1
              documentCounter += 1
            }
          }
        }
        continue
      }
      if (fieldNameText.startsWith('-')) {
        fieldNameText = `${regNoPrefix} ${fieldNameText.replace('- ', '')}`
      }

      output.camera_deputatilor_pl[currentLinkIndex].fields.push({
        name: fieldNameText
          .replaceAll(':', '')
          .replaceAll('-', ' -')
          .trim(),
        value: fieldValueText
          .replaceAll(`\n`, ' ')
          .replaceAll(/\u00a0/g, ' ')
          .trim(),
      })
      if (await fieldValueExternalLink.count()) {
        output.camera_deputatilor_pl[currentLinkIndex].fields[currentFieldIndex].link = await fieldValueExternalLink.getAttribute('href')
      }
      currentFieldIndex += 1
    }

    const historyRows = historyTable.locator('> tbody > tr:not([style])')
    let historyRowDateCache = formattedToday
    for await (const historyRow of await historyRows.all()) {
      const historyRowLinks = historyRow.locator('a[href^="/proiecte"], a[href^="/comisii"]')
      const currentHistoryRowDate = (await historyRow.locator('> td').first().textContent())
        .replaceAll('.', '-')
        .trim()
      if (currentHistoryRowDate != '') {
        historyRowDateCache = currentHistoryRowDate
      }
      if (!await historyRowLinks.count()) {
        continue
      }
      for await (const link of await historyRowLinks.all()) {
        const docLink = await link.getAttribute('href')
        const docTitle = (await link.locator('../..').locator('> td').last().textContent()).trim()
        const docType = getDocumentType(docLink)
        if (docType !== 'unknown') {
          output.camera_deputatilor_pl[currentLinkIndex].docHistory.push({
            date: historyRowDateCache,
            link: `${baseUrl}${docLink}`,
            title: docTitle,
            type: docType,
          })
          docCounter[docType] = docCounter[docType] ? docCounter[docType] + 1 : 1
          documentCounter += 1
        }
      }
    }
    currentLinkIndex += 1
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.camera_deputatilor_pl, docCounter, documentCounter, pageCounter)
  return output
}
