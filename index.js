const puppeteer = require('puppeteer')
const fs = require('fs')
const https = require('https')

main(process.argv[2], process.argv[3])

function download(url, cookies, filename) {
  return new Promise(resolve => {
    https.get(
      url,
      {
        headers: {
          Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`),
        },
      },
      res => {
        res.pipe(fs.createWriteStream(filename)).on('close', () => {
          resolve()
        })
      },
    )
  })
}

async function main(mailAddress, password) {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  page.setDefaultNavigationTimeout(100 * 1000)
  await page.goto('https://8122.jp')

  // 1. Sign in in the top page
  const mailAddressInput = await page.$x(
    "//*[contains(text(), 'メールアドレス')]/following-sibling::input[@type='text'][1]",
  )
  await mailAddressInput[0].type(mailAddress)

  const passwordInput = await page.$x(
    "//*[contains(text(), 'パスワード')]/following-sibling::input[@type='password'][1]",
  )
  await passwordInput[0].type(password)

  const loginButton = await page.$x(
    "//button[.//*[contains(text(), 'ログイン')]]",
  )
  loginButton[0].click()

  await page.waitForNavigation()

  // 2. Go to order history
  const historyLink = await page.$x("//a[contains(text(), '注文履歴')]")
  historyLink[0].click()

  await page.waitForNavigation()

  // 3. Go to download page
  const downloadPageLink = await page.$x(
    "//a[contains(text(), 'ダウンロード可能な写真の一覧はこちら')]",
  )
  downloadPageLink[0].click()

  await page.waitForNavigation()

  const cookies = await page.cookies()

  // 4. Download
  let count = 1
  const downloadLinks = await page.$x(
    "//a[contains(text(), 'ダウンロードする')]",
  )
  const downlaodUrls = await Promise.all(
    downloadLinks.map(downloadLink => downloadLink.evaluate(a => a.href)),
  )
  for (const downloadUrl of downlaodUrls) {
    await download(downloadUrl, cookies, `${count}.jpg`)
    console.log(`${downloadUrl} downloaded`)
    count++
  }

  await browser.close()
}
