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
                             timeout = defaultTimeout,
                           }) => {
  const timerName = "MFinante took"
  console.info("Starting MFinante script...")
  console.time(timerName)
  const docCounter = {}
  const { page } = await setup({
    headless,
    timeout
  })
  const output = {
    mfinante: []
  }
  let documentCounter = 0
  const baseUrl = 'https://mfinante.gov.ro'
  const pagePrefix = `https://mfinante.gov.ro/ro/acasa/transparenta/proiecte-acte-normative
?p_p_id=com_liferay_asset_publisher_web_portlet_AssetPublisherPortlet_INSTANCE_Bg185RyrkUe4
&p_p_lifecycle=0
&p_p_state=normal
&p_p_mode=view
&_com_liferay_asset_publisher_web_portlet_AssetPublisherPortlet_INSTANCE_Bg185RyrkUe4_delta=20
&p_r_p_resetCur=false
&_com_liferay_asset_publisher_web_portlet_AssetPublisherPortlet_INSTANCE_Bg185RyrkUe4_cur=`

  throwIfNotOk(await page.goto('https://mfinante.gov.ro/ro/acasa/transparenta/proiecte-acte-normative'))
  console.info(`Navigated to ${page.url()} to fetch page count`)
  console.info('-------------------')
  const pageCounter = Number((
      await page.locator('a.dropdown-toggle.direction-down.max-display-items-15.btn.btn-secondary').innerText()
    ).replace('Pagina 1 a ', '')
  )

  const pageIndices = [...Array(pageCounter).keys()].map(i => i + 1)
  for await (const pageIndex of pageIndices) {
    throwIfNotOk(await page.goto(`${pagePrefix}${pageIndex}`))
    console.info(`Navigated to ${page.url()} to fetch documents\n`)
    console.info('-------------------')
    try {
      for await (const section of await page.locator('.asset-content.row').all()) {
        const date = await section.locator('.asset-title').innerText()
        let sectionContent = section.locator('span:not(.asset-title) p:first-child')
        if (!await sectionContent.count()) {
          sectionContent = section.locator('span:not(.asset-title)')
        }
        const paragraphHTML = await sectionContent.innerHTML()
        for await (const item of paragraphHTML.split('<br>')) {
          const text = item
            .replaceAll(/<img.*?>/g, '')
            .replaceAll(/<a title="Open this document with ReadSpeaker docReader".*?>.*<\/a>/g, '')
          const linkParts = text.replaceAll(`\n`, '').match(/<a.*?href="(.*?)".*?>.*?<\/a>/)
          const link = (linkParts && linkParts[1] && linkParts[1].trim()) ?? null
          if (!link) {
            console.info('Bad link found at in paragraph', text)
            console.info('Continuing...')
            console.info('-------------------')
            continue
          }
          const textWithoutLink = (text.includes('href="')
            ? text.replaceAll(/<a.*?>/g, '')
              .replaceAll(/<\/a>/g, '')
              .replace(/(<([^>]+)>)/gi, '')
              .replaceAll('&nbsp;', '')
            : text).trim()

          if (date && link && textWithoutLink) {
            const type = getDocumentType(link)
            if (!docCounter[type]) {
              docCounter[type] = 0
            }
            docCounter[type] += 1
            documentCounter += 1

            output.mfinante.push({
              currentUrl: page.url(),
              date: date.replaceAll('.', '-'),
              name: textWithoutLink,
              documents: [
                {
                  date: date.replaceAll('.', '-'),
                  link: `${baseUrl}${encodeURI(link)}`,
                  title: textWithoutLink,
                  type,
                }
              ]
            })
          }
        }

      }
    } catch(e) {
      console.info('Error while parsing page content:')
      console.error(e)
      console.info('Continuing...')
      console.info('-------------------')
    }
  }

  await teardown()
  console.timeEnd(timerName)
  outputReport(output.mfinante, docCounter, documentCounter, pageCounter)

  return output
}
