import { Builder, By, until, Key } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";

/*
  5이평 밑에 있다가 5이평 뚫는 5퍼 이상 종목??
*/

const URL_KOSPI = "https://finance.naver.com/sise/sise_quant_low.nhn?sosok=0";
const URL_KOSDAQ = "https://finance.naver.com/sise/sise_quant_low.nhn?sosok=1";
let FINAL_PICK = [];

const init = async () => {
  const driverPath = path.join(__dirname, "../chromedriver");
  const serviceBuilder = new ServiceBuilder(driverPath);
  const options = new chrome.Options();
  options.addArguments(
    "headless",
    "disable-gpu",
    "no-sandbox",
    "disable-dev-shm-usage"
  );
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .setChromeService(serviceBuilder)
    .build();
  return driver;
};

const connectServer = async (url) => {
  const driver = await init();
  await driver.get(url);
  await driver.manage().window().maximize();
  return driver;
};

const validatorCompanyName = (name) => {
  const lastWord = name.substring(name.length - 2, name.length);
  if (
    lastWord === "우B" ||
    lastWord === "우A" ||
    lastWord.charAt(lastWord.length - 1) === "우" ||
    name.indexOf("KINDEX") !== -1 ||
    name.indexOf("KODEX") !== -1 ||
    name.indexOf("국고채") !== -1 ||
    name.indexOf("선물") !== -1 ||
    name.indexOf("TIGER") !== -1 ||
    name.indexOf("호스팩") !== -1 ||
    name.indexOf("(전환)") !== -1 ||
    name.indexOf("3호") !== -1 ||
    name.indexOf("ETN") !== -1 ||
    name.indexOf("ARIRANG") !== -1 ||
    name.indexOf("KBSTAR") !== -1
  ) {
    return false;
  }
  return true;
};

const getCompanyName = async (flag) => {
  console.log("Start GetCompanyName Func");
  let url = "";
  if (flag === 1) {
    url = URL_KOSPI;
  } else if (flag === 2) {
    url = URL_KOSDAQ;
  }
  const driver = await connectServer(url);
  const tableTr = await driver.wait(
    until.elementsLocated(
      By.xpath("//*[@id='contentarea']/div[3]/table/tbody/tr"),
      10000
    )
  );

  let companiesInfo = [];
  for (let i = 1; i < tableTr.length; i++) {
    await driver.manage().setTimeouts({ implicit: 3000 });
    const isCont = await (
      await tableTr[i].findElement(By.xpath("./td[1]"))
    ).getAttribute("class");
    if (isCont !== "no") {
      continue;
    }
    const lastTrade = await (
      await tableTr[i].findElement(By.xpath("./td[10]"))
    ).getText();
    const trade = await (
      await tableTr[i].findElement(By.xpath("./td[9]"))
    ).getText();
    const tradeNum = Number(trade.replace(/\,/g, ""));
    const lastTradeNum = Number(lastTrade.replace(/\,/g, ""));
    // ( 오늘 거래량 - 어제 거래량 ) / 어제 거래량 * 100
    const rate = Math.floor(((tradeNum - lastTradeNum) / lastTradeNum) * 100);
    // 전일 거래량 1000만이상 && 급락한 종목
    if (lastTradeNum >= 10000000 && rate <= -60) {
      const aTag = await tableTr[i].findElement(By.xpath("./td[3]/a"));
      const companyName = await aTag.getText();
      const urlLink = await aTag.getAttribute("href");
      const companyCode = urlLink.split("=");
      if (validatorCompanyName(companyName)) {
        companiesInfo.push({ name: companyName, code: companyCode[1] });
      }
    }
  }
  await driver.quit();
  console.log("End GetCompanyName Func");
  return companiesInfo;
};

const gatherCompany = async () => {
  let allCompany = [];
  const kospi = await getCompanyName(1);
  await driver.manage().setTimeouts({ implicit: 3000 });
  const kosdaq = await getCompanyName(2);
  allCompany = kospi.concat(kosdaq);
  return allCompany;
};

const checkCompanyPrice = async (companies) => {
  let company = [];
  for (let i = 0; i < companies.length; i++) {
    await driver.manage().setTimeouts({ implicit: 3000 });
    const { name, code } = companies[i];
    const urlLink = `https://m.stock.naver.com/item/main.nhn#/stocks/${code}/total`;

    const driver = await connectServer(urlLink);
    const chkLoading = await driver.wait(
      until.elementLocated(
        By.xpath("//*[@id='content_body']/div[1]/ul/li[1]/div"),
        10000
      )
    );
    //console.log(await chkLoading.getText());
    const navBtn = await driver.wait(
      until.elementLocated(By.xpath("//*[@id='content']/nav/ul/li[1]"), 10000)
    );
    await driver.actions().click(navBtn).perform();

    await driver.actions().sendKeys(Key.TAB).perform();
    await driver.actions().sendKeys(Key.TAB).perform();
    await driver.actions().sendKeys(Key.TAB).perform();
    //await driver.actions().sendKeys(Key.TAB).perform();
    await driver.actions().sendKeys(Key.ENTER).perform();
    //await navBtn.click();
    //await driver.actions().click(navBtn).perform();
    //await driver.executeScript("arguments[0].click();", navBtn);
    const tableTr = await driver.wait(
      until.elementsLocated(
        By.xpath("//*[@id='content_body']/table/tbody/tr"),
        10000
      )
    );
    const downFinder = await (
      await tableTr[0].findElement(By.xpath("./td[3]"))
    ).getAttribute("class");
    if (downFinder.indexOf("stock_dn") !== -1) {
      let todayLastPrice = 0;
      let lowPrice = 0;
      let sum = 0;
      // 전날 거래량 1000만 이상을 찾았으니 당일 음봉
      for (let i = 0; i < 5; i++) {
        const lastPrice = await (
          await tableTr[i].findElement(By.xpath("./td[2]/span"))
        ).getText();
        const numberPrice = Number(lastPrice.replace(/\,/g, ""));
        if (i === 0) {
          const low = await (
            await tableTr[i].findElement(By.xpath("./td[7]/span"))
          ).getText();
          const numLowPrice = Number(low.replace(/\,/g, ""));
          todayLastPrice = numberPrice;
          lowPrice = numLowPrice;
        }
        sum += numberPrice;
      }

      const fiveLine = sum / 5;

      if (
        todayLastPrice > fiveLine &&
        (lowPrice >= fiveLine + 100 || lowPrice >= fiveLine - 100)
      ) {
        company.push({ name: name });
      }
    }
    await driver.quit();
  }
  return company;
};

export const checker = async () => {
  const companies = await gatherCompany();
  FINAL_PICK = await checkCompanyPrice(companies);
  console.log(`------------END Checker----------------`);
  console.log(FINAL_PICK);
  console.log(`---------------------------------------`);
  return FINAL_PICK;
};
