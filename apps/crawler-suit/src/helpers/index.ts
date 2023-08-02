import { chromium } from 'playwright';

/** @type {import('playwright').Browser} */
let browser
/** @type {import('playwright').BrowserContext} */
let context
/** @type {import('playwright').Page} */
let page

const defaultTimeout = 4 * 60 * 1000

const setup = async ({
                       headless = true,
                       timeout = defaultTimeout
                     } = {}) => {
  browser = await chromium.launch({
    // args: ['--ignore-certificate-errors', '--disable-http2'],
    headless,
    timeout,
    proxy: {
      server: '89.38.8.130:88',
    }
  })
  context = await browser.newContext({
    // ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188'
  })
  page = await context.newPage()
  return {
    context,
    page
  }
}

const teardown = async (waitForMs = 0) => {
  await page.waitForTimeout(waitForMs)
  await context.close()
  await browser.close()
}

const throwIfNotOk = (response) => {
  if (!response.ok()) {
    throw new Error(`Response from ${response.request().url()} not ok: ${response.status()} ${response.statusText()}`)
  }
}

const getDate = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  const dateParts = date.toISOString().split('T')[0].split('-')
  return `${dateParts[0]}${dateParts[1]}${dateParts[2]}`
}

const getMonthFromROString = (month) => {
  switch (month.toLowerCase()) {
    case 'ianuarie':
    case 'ian':
      return '01'
    case 'februarie':
    case 'feb':
      return '02'
    case 'martie':
    case 'mar':
      return '03'
    case 'aprilie':
    case 'apr':
      return '04'
    case 'mai':
      return '05'
    case 'iunie':
    case 'iun':
      return '06'
    case 'iulie':
    case 'iul':
      return '07'
    case 'august':
    case 'aug':
      return '08'
    case 'septembrie':
    case 'sept':
      return '09'
    case 'octombrie':
    case 'oct':
      return '10'
    case 'noiembrie':
    case 'noi':
      return '11'
    case 'decembrie':
    case 'dec':
      return '12'
    default:
      return '00'
  }
}
const knownDocumentTypes = ['pdf', 'doc', 'docx', 'odt', 'odm', 'xls', 'xlsx', 'ods', 'rar', 'zip']
const getDocumentType = (url) => {
  const urlParts = url.split('.')
  switch (urlParts[urlParts.length - 1].toLowerCase()) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'bmp':
    case 'tif':
    case 'tiff':
      return 'image'
    case 'pdf':
      return 'pdf'
    case 'doc':
    case 'docx':
    case 'odt':
    case 'odm':
      return 'doc'
    case 'xls':
    case 'xlsx':
    case 'ods':
      return 'xls'
    case '7z':
    case 'rar':
    case 'zip':
      return 'archive'
    case 'vsd':
      return 'visio'
    default:
      return 'unknown'
  }
}

const outputReport = (outputArray, docCounter, documentCounter, pageCounter) => {
  if (outputArray.length !== 0) {
    console.info(`Parsed ${pageCounter} pages and found ${documentCounter} items out of which`)
    const docTypesCount = Object.keys(docCounter).length
    Object.entries(docCounter).forEach(([type, count], index) => {
      console.info(`\t${count} ${count === 1 ? 'is' : 'are'} ${type.toUpperCase()}${
        index === docTypesCount - 1
          ? '.'
          : (index === docTypesCount - 2 ? ' and' : ',')
      }`)
    })
  } else {
    console.info('Found no items. Something must have gone wrong. 😔')
  }
}

export {
  defaultTimeout,
  getDate,
  getDocumentType,
  getMonthFromROString,
  knownDocumentTypes,
  outputReport,
  setup,
  teardown,
  throwIfNotOk
}