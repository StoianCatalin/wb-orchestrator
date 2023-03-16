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
                             timeout = defaultTimeout,
                             timestamp = Date.now()
                           }) => {
  const timerName = 'CDEP took'
  console.info('Starting CDEP script...')
  console.info('-------------------')
  console.time(timerName)
  let documentCounter = 0
  let pageCounter = 0
  const docCounter = {}
  const {page} = await setup({
    headless,
    timeout
  })
  const output = {
    camera_deputatilor: []
  }
  const iframeTriggerPrefix = 'javascript:loadintoIframe('
  const baseUrl = 'https://www.cdep.ro'

  await page.goto(`https://www.cdep.ro/pls/caseta/eCaseta2015.OrdineZi?dat=${timestamp ? getDate(timestamp) : ''}`)
  console.info(`Navigated to ${page.url()}`)
  console.info('-------------------')

  const visibleRows = page.locator('.grup-parlamentar-list.grupuri-parlamentare-list table').locator('tbody tr:not([style])')
  if (!await visibleRows.count()) {
    await teardown()
    console.timeEnd(timerName)
    console.error(`No data found for timestamp ${timestamp}. Exiting...`)
    return output
  }

  await page.getByLabel('dismiss cookie message').click()
  // console.log(await page.locator('div#olddiv').locator('div[align="right"]').all());
  const dateOfSession = (await page.locator('div#olddiv').locator('div[align="right"]').filter({
    hasText: 'Aprobata:'
  }).textContent()).replace(/Aprobata: /, '').trim().replaceAll('.', '-')

  for await (const row of await visibleRows.all()) {
    const toggleFrameTrigger = row.locator(`a[href^="${iframeTriggerPrefix}"]`)

    if (await toggleFrameTrigger.count()) {
      const [frameId, frameUrl] =
        (await toggleFrameTrigger.getAttribute('href'))
          .replace(iframeTriggerPrefix, '')
          .replace(/'|\)/g, '')
          .split(', ')
      await toggleFrameTrigger.click()
      await page.waitForSelector(`iframe#frame${frameId}[src^="${frameUrl}"]:visible`)
      await page.waitForResponse(response => response.url().endsWith(frameUrl))
      await page.waitForLoadState('networkidle')
      const frame = page.frameLocator(`iframe#frame${frameId}[src^="${frameUrl}"]`)

      const documentRows = frame.locator('tr[align="center"][valign="top"]')
      pageCounter += 1
      if (!await documentRows.count()) {
        console.info(`Bad iframe @ ${baseUrl}${frameUrl}, skipping...`)
        console.info('-------------------')
        continue
      }

      const plNameField = frame.locator('tr[bgcolor="#e0e0e0"] b')
      if (await plNameField.count()) {
        const frameOutput = {
          currentUrl: `${baseUrl}${frameUrl}`,
          date: dateOfSession,
          name: await plNameField.textContent(),
          documents: [],
        }
        for await (const row of await documentRows.all()) {
          const documentLink = row.locator('a[target="PDF"]')
          if (await documentLink.count()) {
            const documentPath = encodeURI(await documentLink.getAttribute('href'))
            const docType = getDocumentType(documentPath)
            if (!docCounter[docType]) {
              docCounter[docType] = 0
            }
            docCounter[docType] += 1
            frameOutput.documents.push({
              date: (await row.locator('> td:first-child:not([align])').textContent()).trim().replace(/&nbsp;/g, ''),
              link: documentPath.startsWith(baseUrl) ? documentPath : `${baseUrl}${documentPath}`,
              title: (await row.locator('> td:nth-child(2)').textContent()).trim(),
              type: docType
            })
            documentCounter += 1
          }
        }
        console.info(`Found ${frameOutput.documents.length} documents for ${frameOutput.name}`)
        console.info('-------------------')
        output.camera_deputatilor.push(frameOutput)
      }
    }
  }
  await teardown()
  console.timeEnd(timerName)
  outputReport(output.camera_deputatilor, docCounter, documentCounter, pageCounter)
  return output
}
