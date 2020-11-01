import { Builder, By, until, Key } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";

/*
    20이평 위를 15%이상 장대양봉으로 뚫는 종목
*/

const URL_KOSPI = "http://finance.daum.net/domestic/rise_stocks?market=KOSPI";
const URL_KOSDAQ = "http://finance.daum.net/domestic/rise_stocks?market=KOSDAQ";
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
  console.log("Start Connect Server");
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
    name.indexOf("ETN") !== -1
  ) {
    return false;
  }
  return true;
};

const getCompanyName = async (flag) => {
  let url = "";
  if (flag === 1) {
    url = URL_KOSPI;
  } else if (flag === 2) {
    url = URL_KOSDAQ;
  }
  const driver = await connectServer(url);
  const tableTr = await driver.wait(
    until.elementsLocated(
      By.xpath("//*[@id='boxRiseStocks']/div[2]/div[1]/table/tbody/tr")
    ),
    10000
  );
  let companiesInfo = [];
  for (let i = 0; i < tableTr.length; i++) {
    const upDownRate = await (
      await tableTr[i].findElement(By.xpath("./td[5]/span"))
    ).getText();
    const onlyNum = Number(upDownRate.replace(/[+%]/g, ""));
    const tradeRate = await (
      await tableTr[i].findElement(By.xpath("./td[6]/span"))
    ).getText();
    const trade = Number(tradeRate.replace(/\,/g, ""));
    // 14.5%이상 상승 + 거래량 50만 이상
    if (onlyNum >= 14.5 && trade >= 500000) {
      const aTag = await await tableTr[i].findElement(By.xpath("./td[2]/a"));
      const companyName = await aTag.getText();
      const link = await aTag.getAttribute("href");
      if (validatorCompanyName(companyName)) {
        companiesInfo.push({ name: companyName, link: link });
      }
    }
  }
  await driver.quit();
  return companiesInfo;
};

const gatherCompany = async () => {
  let allCompany = [];
  const kospi = await getCompanyName(1);
  const kosdaq = await getCompanyName(2);
  allCompany = kospi.concat(kosdaq);
  return allCompany;
};

const checkCompanyPrice = async (companies) => {
  let company = [];
  for (let i = 0; i < companies.length; i++) {
    const { name, link } = companies[i];

    const driver = await connectServer(link);

    const curPriceBtn = await driver.wait(
      until.elementLocated(By.xpath("//*[@id='boxTabs']/td[2]/a")),
      30000,
      "Timed out after 10 seconds",
      5000
    );
    await curPriceBtn.click();

    const lastPrices = [];
    const firstPageTable = await driver.wait(
      until.elementsLocated(
        By.xpath("//*[@id='boxDayHistory']/div/div[2]/div/table/tbody/tr")
      ),
      30000,
      "Timed out after 10 seconds",
      5000
    );

    for (let i = 0; i < firstPageTable.length; i++) {
      const temp = await driver.wait(
        until.elementLocated(
          By.xpath(
            `//*[@id='boxDayHistory']/div/div[2]/div/table/tbody/tr[${
              i + 1
            }]/td[5]/span`
          )
        ),
        30000,
        "Timed out after 10 seconds",
        5000
      );
      const price = await temp.getText();
      lastPrices.push(Number(price.replace(/\,/g, "")));
    }

    const chkPrice = await calculator(lastPrices);
    if (chkPrice) {
      company.push({ name: name });
    }

    await driver.quit();
  }
  return company;
};

const calculator = (price) => {
  /**
   * 5일선
   *
   * 10일선
   */
  let five = 0;
  let ten = 0;
  for (let i = 0; i < 5; i++) {
    five += price[i];
  }
  for (let j = 0; j < price.length; j++) {
    ten += price[j];
  }
  if (
    price[0] > Math.floor(ten / 10) &&
    Math.floor(five / 5) > Math.floor(ten / 10)
  ) {
    return true;
  }
  return false;
};

export const checker = async () => {
  const companies = await gatherCompany();
  FINAL_PICK = await checkCompanyPrice(companies);
  console.log(FINAL_PICK);
  return FINAL_PICK;
};
