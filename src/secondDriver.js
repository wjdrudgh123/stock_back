import { Builder, By, until } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";

//http://finance.daum.net/

export const secondDriver = async (url) => {
  console.log("second Driver start");
  const driverPath = path.join(__dirname, "../chromedriver");
  const options = new chrome.Options();
  options.addArguments(
    "headless",
    "disable-gpu",
    "no-sandbox",
    "disable-dev-shm-usage"
  );
  const serviceBuilder = new ServiceBuilder(driverPath);
  let driver2 = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .setChromeService(serviceBuilder)
    .build();

  await driver2.get(url);
  let news = [];
  const supply = await rateForeinerAgency(driver2);
  const compare = await getComparePrice(driver2);
  if (supply && compare) {
    news = await getNews(driver2);
    await driver2.quit();
    console.log("second Driver end return news");
    return news;
  }
  await driver2.quit();
  console.log("second Driver end return false");
  return false;
};
/* 
  거래대금하고 시가총액 비교 --> 시가총액 / 2 < 거래대금
  거래대금(백단위) 시가총액(억단위)이므로 백단위로 바꿔서 
*/

export const getComparePrice = async (driver) => {
  console.log("start getComparePrice");
  const tmpTransactionPrice = await driver
    .wait(
      until.elementLocated(
        By.xpath("//*[@id='boxSummary']/div/span[2]/ul/li[6]/p")
      ),
      20000
    )
    .getText();
  const tmpMarketCapital = await driver
    .wait(
      until.elementLocated(
        By.xpath("//*[@id='boxDashboard']/div/div/span[2]/dl/dd[7]/p")
      ),
      20000
    )
    .getText();

  const arrTmpTransactionPrice = tmpTransactionPrice.split("백만");
  const transactionPrice = arrTmpTransactionPrice[0].replace(/\,/g, "");
  const arrMarketCapital = tmpMarketCapital.split("억");
  const marketCapital = `${arrMarketCapital[0]}00`;
  if (Number(marketCapital) / 2 <= Number(transactionPrice)) {
    console.log("end upto price getComparePrice");
    return true;
  }
  console.log("end below price getComparePrice");
  return false;
};

// 외국인하고 기관 수급 합

export const rateForeinerAgency = async (driver) => {
  console.log("start rateForienCom");
  const tmpForeigner = await driver
    .wait(
      until.elementLocated(
        By.xpath(
          "//*[@id='boxInfluentialInvestors']/div/div[2]/div/table/tbody/tr[1]/td[2]/span"
        )
      ),
      20000
    )
    .getText();
  const tmpAgency = await driver
    .wait(
      until.elementLocated(
        By.xpath(
          "//*[@id='boxInfluentialInvestors']/div/div[2]/div/table/tbody/tr[1]/td[4]/span"
        )
      ),
      20000
    )
    .getText();
  const foreigner = tmpForeigner.replace(/\,/g, "").replace("--", "-");
  const agency = tmpAgency.replace(/\,/g, "").replace("--", "-");
  const sum = Number(foreigner) + Number(agency);
  if (sum >= 3000) {
    console.log("end upto 3000 rateForienCom");
    return true;
  }
  console.log("end below 3000 rateForienCom");
  return false;
};

export const getNews = async (driver2) => {
  console.log("start getNews");
  let news = [];

  // 주식 장 날짜
  const detailStk = await driver2.wait(
    until.elementLocated(
      By.xpath(
        "//div[@class='detailStk']/span/div/span/span[@class='compIntro']/em"
      )
    ),
    20000
  );
  const strStockDate = await detailStk.getText();
  const splitStr = strStockDate.split(" ");
  const splitDate = splitStr[0].split(".");
  const numStockDate = Number(`${splitDate[0]}${splitDate[1]}`);

  const pageTap = await driver2.findElement(
    By.xpath("//div[@class='tabB']/table/tbody/tr[@id='boxTabs']/td[5]/a")
  );
  await pageTap.click();
  // 페이지 이동 후 로딩때문에
  const newsList = await driver2.wait(
    until.elementsLocated(
      By.xpath(
        "//div[@id='boxContents']/div[@style='']/div/div[@class='box_contents']/div/ul/li"
      )
    ),
    30000
  );
  for (let i = 0; i < newsList.length; i++) {
    const anchors = await newsList[i].findElements(By.xpath("./span/a"));
    const p = await newsList[i].findElement(
      By.xpath("./span/p[@class='date']")
    );
    const tmpDate = await p.getText();
    const splitDate = await tmpDate.split("·");
    const trimDate = splitDate[1].trim();
    const splitYear = trimDate.split(".");
    const monthDate = Number(`${splitYear[1]}${splitYear[2]}`);
    if (numStockDate <= monthDate) {
      const title = await anchors[0].getText();
      const description = await anchors[1].getText();
      const link = await anchors[1].getAttribute("href");
      const newsData = { title: title, description: description, link: link };
      news.push(newsData);
    }
  }

  console.log("end getNews");
  return news;
};
