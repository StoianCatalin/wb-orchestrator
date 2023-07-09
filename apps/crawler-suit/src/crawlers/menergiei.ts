import {
  defaultTimeout,
  getDocumentType,
  getMonthFromROString,
  outputReport,
  setup,
  teardown
} from '../helpers';

export const main = async ({
                      headless = true,
                      timeout = defaultTimeout
                    }) => {
  const timerName = 'MENERGIEI took'
  console.info('Starting MENERGIEI script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    menergiei: []
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
  const urlPrefix = 'https://energie.gov.ro/category/transparenta-institutionala/transparenta-decizionala/page/1/'
  await page.goto(urlPrefix)
  console.info(`Navigated to ${page.url()} to fetch pages`)
  console.info('-------------------')

  const nextPageLink = page.locator('.pag li.pag-next a')
  do {
    await page.waitForLoadState('networkidle')
    console.info(`Navigated to ${page.url()} to fetch links`)
    console.info('-------------------')
    for await (const article of await page.locator('.grey-section .container article').all()) {
      const articleDateParts = (await article.locator('.project-label').first().textContent())
        .trim()
        .split(' ')
      const articleDate = `${articleDateParts[0]}-${getMonthFromROString(articleDateParts[1])}-${articleDateParts[2]}`
      const articleLink = article.locator('.project-title a').first()
      output.menergiei.push({
        currentUrl: await articleLink.getAttribute('href'),
        date: articleDate,
        name: (await articleLink.textContent())
          .trim()
          .replaceAll(/\u00a0/g, ' '),
        documents: []
      })
    }
    if (await nextPageLink.count()) {
      pageCounter += 1
      await nextPageLink.click()
    } else {
      break;
    }
  } while (true)

  for await (const item of output.menergiei) {
    await page.goto(item.currentUrl)
    // await page.waitForLoadState('networkidle')
    console.info(`Navigated to ${page.url()} to fetch documents`)
    console.info('-------------------')
    pageCounter += 1
    for await (const docElement of await page.locator('.grey-section .container .attached-document').all()) {
      const docLinkElement = docElement.locator('a.call-to-action').first()
      const docLinkUrl = await docLinkElement.getAttribute('href')
      const docType = getDocumentType(docLinkUrl)
      item.documents.push({
        date: (await docElement.locator('div.date-wrap span.date').textContent())
          .trim()
          .replaceAll('.', '-'),
        link: docLinkUrl,
        title: (await docElement.locator('.description').first().textContent())
          .trim()
          .replaceAll(/\u00a0/g, ' '),
        type: docType
      })
      documentCounter += 1
      docCounter[docType] = docCounter[docType] ? docCounter[docType] + 1 : 1
    }
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.menergiei, docCounter, documentCounter, pageCounter)

  return output
}
