import {
  defaultTimeout,
  getDocumentType,
  outputReport,
  setup,
  teardown,
  throwIfNotOk
} from '../helpers';

export const main = async ({
                             headless = true,
                             timeout = defaultTimeout
                           }) => {
  const timerName = 'MAI took'
  console.info('Starting MAI script...')
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mai: []
  }
  let documentCounter = 0
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'image' ||
    route.request().url().endsWith('.css') ||
    route.request().url().endsWith('.js')
      ? route.abort()
      : route.continue()
  )
  throwIfNotOk(await page.goto('https://www.mai.gov.ro/informatii-publice/transparenta-decizionala/'))
  console.info(`Navigated to ${page.url()} to fetch documents`)
  console.info('-------------------')
  const linkLocator = 'a[href^="https://webapp.mai.gov.ro"]'
  const items = []
  for await (const child of await page.locator('.entry-content > div[style], .entry-content > p').all()) {
    const tagName = await child.evaluate(node => node.tagName)
    if (tagName === 'DIV') {
      items.push({
        currentUrl: page.url(),
        date: (await child.textContent()).split(' - ')[1].replaceAll('.', '-'),
        name: '',
        documents: []
      })
    } else if (tagName === 'P') {
      const content = (await child.textContent()).trim()
      const currentIndex = items.length - 1
      if (content !== '' && items[currentIndex] !== undefined) {
        if (await child.locator(linkLocator).count() > 0) {
          const documentLink = (await child.locator(linkLocator).first().getAttribute('href')).replaceAll(' ', '%20')
          const documentTitle = content.split('(')[0].trim()
          const documentType = getDocumentType(documentLink)
          if (documentTitle !== '' && documentType !== 'unknown') {
            items[currentIndex].documents.push({
              date: items[currentIndex].date,
              link: documentLink,
              title: documentTitle,
              type: documentType
            })
            documentCounter += 1
            docCounter[documentType] = docCounter[documentType] === undefined
              ? 1
              : docCounter[documentType] + 1
          }
        } else if (items[currentIndex].name === '') {
          const name = content.trim()
          if (name !== '') {
            items[currentIndex].name = name.replaceAll('[...]', '').trim()
            console.info(`Found item #${currentIndex + 1} with name '${items[currentIndex].name}'`)
            console.info('-------------------')
          }
        }
      }
    }
  }
  output.mai = items

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mai, docCounter, documentCounter, 1)

  return output
}