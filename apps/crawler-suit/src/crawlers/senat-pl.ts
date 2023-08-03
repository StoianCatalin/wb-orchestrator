import {
  defaultTimeout,
  getDate,
  getDocumentType,
  outputReport,
  setup,
  teardown
} from '../helpers';

export const main = async ({
                             headless = true,
                             timeout = defaultTimeout
                           }) => {
  const timerName = 'SENAT-PL took'
  console.info('Starting SENAT-PL script...')
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
    senat_pl: []
  }
  await page.route('**/*', (route) =>
    route.request().url().includes('stylesheet?id')
      ? route.abort()
      : route.continue()
  )
  const today = new Date()
  const formattedToday = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`

  const baseUrl = 'https://www.senat.ro/'
  const response = await page.goto(baseUrl)
  if (response.status() === 503) {
    await page.goto(baseUrl)
  }
  console.info(`Navigated to ${page.url()} to click on Expand button`)
  console.info('-------------------')
  pageCounter += 1
  const menu = page.locator('table.ProgramLucruGrid > tbody')
  const expandLinkText = 'LUCRĂRI ÎN COMISIILE PERMANENTE'
  const plenaryLinkText = 'Lucrări în PLENUL SENATULUI'
  const expandLink = menu.locator('> tr a[href^="javascript:"]').filter({
    hasText: expandLinkText
  })
  const plenaryLink = menu.locator('> tr a').filter({
    hasText: plenaryLinkText
  })
  const rowLinks = menu.locator('> tr > td > div > a[target][rel]')
  const hasExpandLink = !!(await expandLink.count())
  const hasPlenaryLink = !!(await plenaryLink.count())
  const links = []
  const initialLinks = []
  if (!hasExpandLink && !hasPlenaryLink) {
    await teardown()
    console.timeEnd(timerName)
    console.error(`No data found for today. Exiting...`)
    return output
  }
  if (hasPlenaryLink) {
    const plenaryLinkHref = await plenaryLink.getAttribute('href')
    links.push(`${baseUrl}${plenaryLinkHref}`)
  }
  if (hasExpandLink) {
    for await (const link of await rowLinks.all()) {
      initialLinks.push(await link.getAttribute('href'))
    }
    const getRowsResponse = page.waitForResponse(response =>
      response.url().includes('https://www.senat.ro/') &&
      response.request().method() === 'POST' &&
      response.status() === 200
    )
    await expandLink.click()
    await getRowsResponse
    await page.waitForTimeout(1000)
    pageCounter += 1
    const committeeLinks = rowLinks.filter({
      hasText: 'Comisia'
    })
    for await (const link of await committeeLinks.all()) {
      const linkHref = await link.getAttribute('href')
      if (!initialLinks.includes(linkHref)) {
        links.push(`${baseUrl}${linkHref}`)
      }
    }
  }
  const plLinks = new Set()
  for await (const link of links) {
    await page.goto(link)
    console.info(`Navigated to ${page.url()} to fetch links to PLs`)
    console.info('-------------------')
    pageCounter += 1
    const detailsTable = page.locator('#detalii_wrapper > table#detalii')
    if (!await detailsTable.count()) {
      continue
    }
    const tableLinks = detailsTable.locator('tbody > tr > td > a[href^="Legis/Lista.aspx"]')
    for await (const tableLink of await tableLinks.all()) {
      const tableLinkHref = await tableLink.getAttribute('href')
      plLinks.add(`${baseUrl}${tableLinkHref}`)
    }
  }
  let currentLinkIndex = 0
  const ignoredFields = [
    'Număr de înregistrare Senat',
    'Opiniile persoanelor interesate asupra propunerilor legislative aflate în consultare publică'
  ]
  for await (const plLink of plLinks.values()) {
    await page.goto(plLink)
    console.info(`Navigated to ${page.url()} to fetch PL details and documents`)
    console.info('-------------------')
    pageCounter += 1
    const fileLinks = page.locator('[role="tabpanel"] table td a[href^="javascript:__doPostBack"]')
    for await (const fileLink of await fileLinks.all()) {
      const getLegisResponse = page.waitForResponse(response =>
        response.url().includes('Legis/Lista.aspx') &&
        response.request().method() === 'POST' &&
        response.status() === 200
      )
      await fileLink.click()
      await getLegisResponse
      await page.waitForSelector('table.display.responsive-table.legislative-procedure-table')
      pageCounter += 1
      output.senat_pl.push({
        currentUrl: page.url(),
        date: formattedToday,
        name: (await page.locator('.not_k h4').first().textContent()).trim(),
        title: (await page.locator('.not_k p').first().textContent()).trim(),
        fields: [],
        docHistory: []
      })
      let currentFieldIndex = 0
      const fieldTables = page.locator('table.display.header-0.legislation-list-table')
      for await (const fieldTable of await fieldTables.all()) {
        const fieldRows = fieldTable.locator('tbody > tr')
        for await (const fieldRow of await fieldRows.all()) {
          const fieldNameCell = fieldRow.locator('td').nth(0)
          const fieldName = (await fieldNameCell.textContent())
            .trim()
            .replaceAll(':', '')
          const fieldValueCell = fieldRow.locator('td').nth(1)
          const fieldValue = (await fieldValueCell.textContent()).trim()
          if (ignoredFields.includes(fieldName)) {
            continue
          }
          const fieldValueLink = fieldValueCell.locator('a[href]')
          output.senat_pl[currentLinkIndex].fields[currentFieldIndex] = {
            name: fieldName,
            value: fieldValue,
            ...(
              await fieldValueLink.count() > 0
                ? {
                  link: await fieldValueLink.getAttribute('href')
                }
                : {}
            )
          }
          currentFieldIndex += 1
        }
      }
      const fileLinks = page.locator('a[href^="PDF"][target="_blank"]')
      if (await fileLinks.count()) {
        const docsField = {
          name: 'documents',
          value: []
        }
        for await (const fileLink of await fileLinks.all()) {
          const fileLinkHref = await fileLink.getAttribute('href')
          const fileLinkText = await fileLink.textContent()
          const fileLinkType = getDocumentType(fileLinkHref)
          docsField.value.push({
            link: `${baseUrl}Legis/${fileLinkHref.replaceAll('\\', '/')}`,
            title: fileLinkText
              .trim()
              .replace('- ', ''),
            type: fileLinkType
          })
          docCounter[fileLinkType] = docCounter[fileLinkType] ? docCounter[fileLinkType] + 1 : 1
          documentCounter += 1
        }
        output.senat_pl[currentLinkIndex].fields.push(docsField)
      }
      const historyTable = page.locator('table.display.responsive-table.legislative-procedure-table')
      if (await historyTable.count()) {
        const historyRows = historyTable.locator('> tbody > tr')
        for await (const historyRow of await historyRows.all()) {
          const rowDate = (await historyRow.locator('td').nth(0).textContent()).trim()
          const rowClass = await historyRow.getAttribute('class')
          if (rowClass.includes('CD-row')) {
            const cdepLinks = historyRow.locator('a[href^="http://www.cdep.ro/proiecte"], a[href^="http://www.cdep.ro/comisii"]')
            for await (const cdepLink of await cdepLinks.all()) {
              const cdepLinkHref = await cdepLink.getAttribute('href')
              const cdepLinkText = (await cdepLink.locator('../..').locator('> td').last().textContent())
                .trim()
              const cdepLinkType = getDocumentType(cdepLinkHref)
              output.senat_pl[currentLinkIndex].docHistory.push({
                date: rowDate,
                link: cdepLinkHref,
                title: cdepLinkText,
                type: cdepLinkType
              })
              docCounter[cdepLinkType] = docCounter[cdepLinkType] ? docCounter[cdepLinkType] + 1 : 1
              documentCounter += 1
            }
          } else if (rowClass.includes('SE-row') || rowClass.includes('PA-row')) {
            const senatLinks = historyRow.locator('a[href^="/legis/"]')
            for await (const senatLink of await senatLinks.all()) {
              const senatLinkHref = await senatLink.getAttribute('href')
              const senatLinkText = (await senatLink.textContent())
                .replaceAll(/\u00a0/g, ' ')
                .trim()
              const senatLinkType = getDocumentType(senatLinkHref)
              output.senat_pl[currentLinkIndex].docHistory.push({
                date: rowDate,
                link: `${baseUrl}${senatLinkHref.substring(1)}`,
                title: senatLinkText,
                type: senatLinkType
              })
              docCounter[senatLinkType] = docCounter[senatLinkType] ? docCounter[senatLinkType] + 1 : 1
              documentCounter += 1
            }
          }
        }
      }
      currentLinkIndex += 1
      await page.locator('a.nav-link[href="#profile"]').click()
    }
  }
  await teardown()
  console.timeEnd(timerName)
  outputReport(output.senat_pl, docCounter, documentCounter, pageCounter)
  return output
}
