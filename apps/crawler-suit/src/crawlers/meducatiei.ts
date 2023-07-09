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
  const timerName = 'MEducatiei took'
  console.info('Starting MEducatiei script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    meducatiei: []
  }
  let documentCounter = 0
  let pageCounter = 0
  const baseUrl = 'https://www.edu.ro'
  await page.goto('https://www.edu.ro/proiecte-acte-normative')
  console.info(`Navigated to ${page.url()} to fetch pages`)
  console.info('-------------------')
  let nextPageLink = page.locator('li[class*="pager-next"] > a')
  const links = []

  do {
    console.info(`Navigated to ${page.url()} to fetch links`)
    console.info('-------------------')
    await page.waitForLoadState('networkidle')
    pageCounter += 1
    for await(const link of await page.locator('article[class~="node"] header h2 a[href]').all()) {
      links.push(await link.getAttribute('href'))
    }
    if (await nextPageLink.count()) {
      await nextPageLink.click()
    } else {
      break
    }
  } while (true)

  for await (const link of links) {
    if (!link.includes('https://')) {
      await page.goto(`${baseUrl}${link}`)
    } else {
      await page.goto(link)
    }
    await page.waitForLoadState('networkidle')
    console.info(`Navigated to ${page.url()} to fetch documents`)
    console.info('-------------------')
    pageCounter += 1
    const date = (await page.locator('.date-display-single').textContent())
      .trim()
      .replaceAll('.', '-')
    const documents = []
    for await (const docLink of await page.locator('.field-name-field-arhiva .field-item span.file a[href]').all()) {
      const docUrl = (await docLink.getAttribute('href'))
      const docType = getDocumentType(docUrl)
      documentCounter += 1
      docCounter[docType] = docCounter[docType] !== undefined ? docCounter[docType] + 1 : 1
      documents.push({
        date,
        link: docUrl,
        title: (await docLink.textContent()).trim(),
        type: docType
      })
    }
    output.meducatiei.push({
      currentUrl: page.url(),
      date,
      name: (await page.locator('#page-title.title').textContent()).trim(),
      documents
    })
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.meducatiei, docCounter, documentCounter, pageCounter)

  return output
}
