import { Builder, By } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";
import { secondDriver } from "./secondDriver";

/*
http://finance.daum.net/domestic/rise_stocks?market=KOSPI
http://finance.daum.net/domestic/rise_stocks?market=KOSDAQ
https://finance.naver.com/sise/sise_rise.nhn?sosok=0
https://finance.naver.com/sise/sise_rise.nhn?sosok=1
*/

export const init = async (exchange) => {
  let avgPrice = 0;
  const driverPath = path.join(__dirname, "../chromedriver");
  const serviceBuilder = new ServiceBuilder(driverPath);
  const options = new chrome.Options();
  options.addArguments(
    "headless",
    "disable-gpu",
    "no-sandbox",
    "disable-dev-shm-usage"
  );
  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .setChromeService(serviceBuilder)
    .build();
  let lists = [];
  try {
    console.log(`start ${exchange} get list`);
    lists = await getDaum(driver, exchange, avgPrice);
    console.log(`end ${exchange} get list`);
  } catch (err) {
    console.log(err);
  } finally {
    await driver.quit();
    return lists;
  }
};

const getDaum = async (driver, exchange, avgPrice) => {
  await driver.get(
    `http://finance.daum.net/domestic/rise_stocks?market=${exchange}`
  );
  const companies = await driver.findElements(
    By.xpath("//*[@id='boxRiseStocks']/div[2]/div[1]/table/tbody/tr")
  );
  const list = await processScrap(companies, avgPrice);
  return list;
};

const processScrap = async (companies, avgPrice) => {
  const companyList = [];
  for (let i = 0; i < companies.length; i++) {
    let stockData = {};
    const companyTd = await companies[i].findElements(By.xpath("./td"));

    const companyName = await companyTd[1].getText();
    const links = await companyTd[1]
      .findElement(By.xpath("./a"))
      .getAttribute("href");
    const news = await secondDriver(links);

    if (news) {
      stockData = {
        companyName: companyName,
        news: news,
      };
      companyList.push(stockData);
    }
  }
  console.log("end companyList");
  return companyList;
};

// 거래대금 평균
/*
const getNaver = async (driver, exchange) => {
  await driver.get(
    `https://finance.naver.com/sise/sise_rise.nhn?sosok=${exchange}`
  );

  const form = await driver.findElement(
    By.xpath("//div[@class='box_type_m']/form/div/div")
  );
  const tr = await form.findElements(By.xpath("./table/tbody/tr"));
  const td = await tr[0].findElements(By.xpath("./td"));
  const chkInput = await td[2].findElement(
    By.xpath("./input[@type='checkbox']")
  );
  const isChecked = await chkInput.getAttribute("checked");
  if (!isChecked) {
    const chkTd = await tr[0].findElements(By.xpath("./td[@class='choice']")); // 최대 7개이니까 기본 체크 하나 빼야됨
    const lastCheckedItem = await chkTd[chkTd.length - 1].findElement(
      By.xpath("./input[@type='checkbox']")
    );
    await lastCheckedItem.click();
    await chkInput.click();
  }
  const button = await form.findElements(By.xpath("./div/a"));
  await button[0].click();

  const price = await getAvgPrice(driver);
  return price;
};

const getAvgPrice = async (driver) => {
  let totalPrice = 0;
  const table = await driver.findElements(
    By.xpath("//div[@class='box_type_l']/table/tbody/tr")
  );
  const totalNum = table.length;
  for (let index = 2; index < totalNum; index++) {
    const td = await table[index].findElements(By.xpath("./td"));
    const checkTd = await td[0].getAttribute("class");
    if (checkTd === "no") {
      const tempPrice = await td[6].getText();
      const price = tempPrice.replace(/,/g, "");
      totalPrice += Number(price);
    }
  }
  const retPrice = totalPrice / (totalNum - 2);
  return Math.ceil(retPrice);
};
*/
