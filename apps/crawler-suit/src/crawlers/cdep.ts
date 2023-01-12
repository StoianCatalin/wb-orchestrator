const {By,Key,Builder,until, WebElement} = require("selenium-webdriver");
const fs = require('fs');
require("geckodriver");
const firefox = require('selenium-webdriver/firefox');

//TODO modify - either send it as API call or change JSON write location.
//TODO only add free range if not empty?
//TODO law 3 from https://www.cdep.ro/pls/caseta/eCaseta2015.OrdineZi?dat=20221207 has 2 laws inside it

export async function CDEP_crawler() {
//selectors
  var url = "https://www.cdep.ro/pls/caseta/eCaseta2015.OrdineZi";
  var url_real = "https://www.cdep.ro/pls/caseta/eCaseta2015.OrdineZi";
  var url_withFreeRange = "https://www.cdep.ro/pls/caseta/eCaseta2015.OrdineZi?dat=20221207";
  var url_withUndefinedPDFs = "https://www.cdep.ro/pls/caseta/ecaseta2015.OrdineZi?oid=2419";
  var pageLogo = "[alt='Camera Deputatilor']";
  var dismissCookiesButton = '[aria-label="dismiss cookie message"]';
  var decisionNameField = 'body[bgcolor] >p b';
  var lawNameField = 'tbody table tbody >tr td b';
  var pdfTable = 'tbody tr[valign] td:first-child tr[align]';
  var pdfDateRelative = 'td.headlinetext1';
  var pdfNameRelative = 'td:nth-child(2)';
  var pdfLinkRelative = 'td a[href]';
  var pdfTableForDecision = 'table tbody tr';
  var pdfNameRelativeForDecision = 'td:nth-child(3)';
  var pdfDateRelativeForDecision =  "tr:last-of-type >td[nowrap]";

  let driver = DriverBuilder();

//JSON init
  let cdepJson =
    {
      "cdep":{}
    };
  var jsonObj = [] ;

//Load Page
  await driver.get(url);
  await driver.findElement(By.css(dismissCookiesButton)).click();
  await driver.get(url);
  await driver.sleep(1000);
  await driver.findElement(By.css(pageLogo));

  for( const element of (await getAllFolders(driver))){
    var newJson = {
      "lawProject": {
        "name": null,
        "pdf": [
        ]
      }
    };

    let lawFolder = await driver.findElement(By.css("[name='"+element+"']"));
    await driver.wait(until.elementIsVisible(lawFolder),1000);
    await lawFolder.click();
    await driver.switchTo().frame(driver.findElement(By.css(returnIFrameId(element))));

    let lawProjectNameSelector = lawNameField;
    let isLaw = 1;
    try {
      await driver.wait(until.elementsLocated(By.css('body >table')),1500);
    } catch (error) {
      isLaw = 0;
      lawProjectNameSelector = decisionNameField;
    }

    await driver.wait(until.elementsLocated(By.css(lawProjectNameSelector)),1500);
    let lawName= await driver.findElement(By.css(lawProjectNameSelector));
    newJson.lawProject.name = await lawName.getText();
    console.log(await newJson.lawProject.name);

    if (isLaw){
      await driver.wait(until.elementsLocated(By.css(pdfTable)),3000);
      await CoverAllRows(driver, pdfTable, newJson, pdfDateRelative, pdfNameRelative, pdfLinkRelative);
    }else{
      await driver.wait(until.elementsLocated(By.css(pdfTableForDecision)),3000);
      await CoverAllRows(driver, pdfTableForDecision, newJson, pdfDateRelativeForDecision, pdfNameRelativeForDecision, pdfLinkRelative);
      for (let i =0;i<=newJson.lawProject.pdf.length-1;i++){
        newJson.lawProject.pdf[i].date = (await driver.findElement(By.css(pdfDateRelativeForDecision)).getText()).trim();
      }
    }

    jsonObj.push(await Promise.resolve(newJson));
    console.log("------------------->");
    await driver.switchTo().defaultContent();
  }

//free range pdfs
  var newJsonForFreeRange = {
    "lawProject": {
      "name": null,
      "pdf": [
      ]
    }
  };
  newJsonForFreeRange.lawProject.name = await Promise.resolve('Free-range PDFs') ;
  await getAllPdfs(driver, newJsonForFreeRange);
  jsonObj.push(await Promise.resolve(newJsonForFreeRange));

//Full PDF
  cdepJson.cdep = jsonObj;
  console.log(JSON.stringify(cdepJson,null,'\t'));

// //write file
//   if (!fs.existsSync('../downloads/')){
//     fs.mkdirSync('../downloads/');
//   }
// //TODO modify - either send it as API call or change JSON write location.
// //Write JSON in file.
//   fs.writeFile('../downloads/cdep.txt', JSON.stringify(cdepJson,null,'\t'), err => {
//     if (err) console.error(err);
//   });

  await driver.quit();
  return cdepJson;
}

function DriverBuilder() {
  let firefoxOptions = new firefox.Options().headless();
  firefoxOptions.setPreference("browser.download.folderList", 2);
  firefoxOptions.setPreference("pdfjs.disabled", true);
  firefoxOptions.setPreference("browser.download.dir", "../downloads");
  let driver = new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(firefoxOptions)
    .build();
  return driver;
}

function returnIFrameId(folderName){
  var pre = "img";
  var cut = folderName.split(pre)[1];
  return "#frame" + cut;
}

function getAllFolders(driver){
  var allFolders = "[name*='img']";
  return driver.findElements(By.css(allFolders)).then(function(elements){
    var allPromises = elements.map(function(element){
      return element.getAttribute('name');
    });
    return Promise.all(allPromises);
  });
}

async function getAllPdfs(driver, newJson){
  var allPdfs = "[src*='icon_pdf']";
  var allRowsInList = ".grup-parlamentar-list tr:not([id*='row'])";
  var nameInRow = "td:not([nowrap]):nth-child(3)";
  for (let row of await driver.findElements(By.css(allRowsInList))){
    try {
      await row.findElement(By.css(allPdfs));
      newJson.lawProject.pdf.push({
        "name": null,
        "link": null,
        "date": null
      });
      newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1].name = (await row.findElement(By.css(nameInRow)).getText()).trim();
      newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1].link = await row.findElement(By.css('td a[href]')).getAttribute('href');
      newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1].date = await Promise.resolve('undefined');
    } catch (error) {
    }
  }
  console.log(JSON.stringify(await newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1], null, '\t'));
}

async function CoverAllRows(driver, pdfTable, newJson, pdfDateRelative, pdfNameRelative, pdfLinkRelative) {
  for (let row of await driver.findElements(By.css(pdfTable))) {
    newJson.lawProject.pdf.push({
      "name": null,
      "link": null,
      "date": null
    });
    try {
      newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1].date = await (await row.findElement(By.css(pdfDateRelative)).getText()).trim();
    } catch (NoSuchElementError) {
      newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1].date = await Promise.resolve('undefined');
    }
    try {
      newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1].name = await row.findElement(By.css(pdfNameRelative)).getText();
    } catch (NoSuchElementError) {
      newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1].name = await Promise.resolve('undefined');
    }
    try {
      newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1].link = await row.findElement(By.css(pdfLinkRelative)).getAttribute('href');
    } catch (NoSuchElementError) {
      newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1].link = await Promise.resolve('undefined');
    }
    console.log(JSON.stringify(await newJson.lawProject.pdf[newJson.lawProject.pdf.length - 1], null, '\t'));
  }
}
