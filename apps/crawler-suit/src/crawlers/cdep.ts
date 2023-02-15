import { getDate, setup, teardown } from '../helpers';

export const CDEP_crawler = async ({
                      timestamp = Date.now()
                    }) => {
  const timerName = 'CDEP took'
  console.log('Starting CDEP script...')
  console.time(timerName)
  let pdfsCount = 0
  const page = await setup()
  const output = {
    camera_deputatilor: []
  }
  const iframeTriggerPrefix = 'javascript:loadintoIframe('
  const baseUrl = 'https://www.cdep.ro'

  await page.goto(`https://www.cdep.ro/pls/caseta/eCaseta2015.OrdineZi?dat=${timestamp ? getDate(timestamp) : ''}`)
  console.log(`Navigated to ${page.url()}`)

  const visibleRows = page.locator('.grup-parlamentar-list.grupuri-parlamentare-list table').locator('tbody tr:not([style])')
  if (!await visibleRows.count()) {
    await teardown()
    console.timeEnd(timerName)
    console.error(`No data found for timestamp ${timestamp}. Exiting...`)
    return output
  }

  await page.getByLabel('dismiss cookie message').click()

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

      const pdfRows = frame.locator('tr[align="center"][valign="top"]')
      if (!await pdfRows.count()) {
        console.log(`Bad iframe @ ${baseUrl}${frameUrl}, skipping...`)
        continue
      }

      const plNameField = frame.locator('tr[bgcolor="#e0e0e0"] b')
      if (await plNameField.count()) {
        const frameOutput = {
          lawProject: {
            name: await plNameField.textContent(),
            pdf: []
          }
        }
        for await (const row of await pdfRows.all()) {
          const pdfLink = row.locator('a[target="PDF"]')
          if (await pdfLink.count()) {
            const pdfPath = encodeURI(await pdfLink.getAttribute('href'))
            frameOutput.lawProject.pdf.push({
              date: (await row.locator('> td:first-child:not([align])').textContent()).trim().replace(/&nbsp;/g, ''),
              link: pdfPath.startsWith(baseUrl) ? pdfPath : `${baseUrl}${pdfPath}`,
              name: (await row.locator('> td:nth-child(2)').textContent()).trim()
            })
            pdfsCount += 1
          }
        }
        output.camera_deputatilor.push(frameOutput)
      }
    }
  }
  await teardown()
  console.timeEnd(timerName)
  console.info(`Found ${pdfsCount} PDFs. Exiting...`)
  return output
}
