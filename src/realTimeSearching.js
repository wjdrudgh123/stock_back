import { Builder, By, until } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";

/*
 * http://finance.daum.net/domestic
 * https://finance.naver.com/sise/
 */

let POPULAR_SEARCH = {};

export const realTimeSearch = async () => {
  await naverSearch();
  await daumSearch();
  return POPULAR_SEARCH;
};

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

const naverSearch = async () => {
  console.log("START NAVER REAL TIME SEARCHING");
  const driver = await init();
  await driver.get("https://finance.naver.com/sise/");
  await driver.manage().window().maximize();

  const layout = await driver.wait(
    until.elementLocated(By.xpath("//*[@id='popularItemList']")),
    10000
  );

  const layoutList = await layout.findElements(By.xpath("./li"));

  let naver = [];
  for (let i = 0; i < layoutList.length; i++) {
    const companyName = await (
      await layoutList[i].findElement(By.xpath("./a"))
    ).getText();

    naver.push(companyName);
  }

  POPULAR_SEARCH.naver = naver;
  console.log("END NAVER REAL TIME SEARCHING");
};

const daumSearch = async () => {
  console.log("START DAUM REAL TIME SEARCHING");
  const driver = await init();
  await driver.get("http://finance.daum.net/domestic");
  await driver.manage().window().maximize();

  const layout = await driver.wait(
    until.elementLocated(
      By.xpath("//*[@id='boxRightSidebar']/div[3]/div/div[1]/ul")
    ),
    10000
  );

  const layoutList = await layout.findElements(By.xpath("./li"));

  let daum = [];
  for (let i = 0; i < layoutList.length; i++) {
    const tmpCompanyName = await (
      await layoutList[i].findElement(By.xpath("./a"))
    ).getText();
    const companyName = await tmpCompanyName.split("\n");

    daum.push(companyName[1]);
  }

  POPULAR_SEARCH.daum = daum;
  console.log("END DAUM REAL TIME SEARCHING");
};
