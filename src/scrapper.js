import { Builder, By, until, Key } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";

/*
http://finance.daum.net/domestic/rise_stocks?market=KOSPI
http://finance.daum.net/domestic/rise_stocks?market=KOSDAQ
https://finance.naver.com/sise/sise_rise.nhn?sosok=0
https://finance.naver.com/sise/sise_rise.nhn?sosok=1
*/

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

export const getGoldenCrossCompany = async () => {
  const driver = await init();
  let goldenCompanyList = [];
  console.log("Start get golden cross company");
  await driver.get("https://finance.naver.com/sise/item_gold.nhn");
  const companies = await driver.findElements(
    By.xpath("//*[@id='contentarea']/div[3]/table/tbody/tr")
  );
  for (let i = 1; i < companies.length; i++) {
    const checkTd = await companies[i]
      .findElement(By.xpath("./td[1]"))
      .getAttribute("class"); // class명이 no이면 종목 아니면 기타
    if (checkTd === "no") {
      const companyName = await companies[i]
        .findElement(By.xpath("./td[2]/a"))
        .getText();
      const upDown = await companies[i]
        .findElement(By.xpath("./td[5]/span"))
        .getText();

      if (upDown[0] !== "+") {
        continue;
      }

      // KINDEX, KODEX, 선물, 국고채 제외
      if (
        companyName.indexOf("KINDEX") !== -1 ||
        companyName.indexOf("KODEX") !== -1 ||
        companyName.indexOf("국고채") !== -1 ||
        companyName.indexOf("선물") !== -1 ||
        companyName.indexOf("TIGER") !== -1 ||
        companyName.indexOf("호스팩") !== -1 ||
        companyName.indexOf("(전환)") !== -1 ||
        companyName.indexOf("3호") !== -1 ||
        companyName.indexOf("ETN") !== -1
      ) {
        continue;
      }
      goldenCompanyList.push(companyName);
    }
  }
  console.log("End get golden cross company");

  await driver.quit();
  return goldenCompanyList;
};

export const companyInfo = async (companies) => {
  let companyLists = [];
  for (let i = 0; i < companies.length; i++) {
    const list = await getCompanyDetail(companies[i]);
    companyLists.push(list);
  }
  return companyLists;
};

const getCompanyDetail = async (company) => {
  let rtVal = {};
  const driver = await init();
  console.log("Start getCompanyDetail Func");
  await driver.get("https://finance.naver.com/sise/");
  const inputBox = await driver.wait(
    until.elementLocated(By.xpath("//*[@id='stock_items']")),
    10000
  );
  await inputBox.sendKeys(company, Key.RETURN);
  const exchangeKind = await driver.wait(
    until.elementLocated(By.xpath("//*[@id='middle']/div[1]/div[1]/div/img")),
    10000
  );

  await (
    await driver.findElement(By.xpath("//*[@id='content']/ul/li[2]/a"))
  ).click();
  const iframes = await driver.wait(
    until.elementsLocated(By.css("iframe")),
    10000
  );
  for (let i = 0; i < iframes.length; i++) {
    console.log(`Start getCompanyDetail iframe`);
    const iframeTitle = await iframes[i].getAttribute("title");
    if (iframeTitle === "일별 시세") {
      // iframe으로 스위치
      await driver.switchTo().frame(iframes[i]);
      const marketPrices = await driver.wait(
        until.elementsLocated(By.xpath("/html/body/table[1]/tbody/tr")),
        10000
      );
      let tmpPrices = [];
      // 10일 가격
      for (let j = 1; j < marketPrices.length; j++) {
        const tds = await marketPrices[j].findElements(By.xpath("./td"));
        const chkTr = await tds[0].getAttribute("align");
        if (chkTr !== "center") {
          continue;
        }
        const price = await tds[1].getText();
        price = price.replace(/\,/g, "");
        tmpPrices.push(Number(price));
      }
      const boxPrice = await getProperPrice(tmpPrices);
      rtVal = {
        companyName: company,
        boxPrice: boxPrice,
      };
    }
    await driver.switchTo().defaultContent();
    console.log(`End getCompanyDetail iframe`);
  }
  await driver.quit();
  console.log(`End getCompanyDetail Func`);
  return rtVal;
};

const getProperPrice = (price) => {
  let priceOfFive = 0;
  let priceOfTen = 0;

  for (let i = 0; i <= price.length; i++) {
    if (i < 5) {
      priceOfFive += price[i];
    } else if (i < 10) {
      priceOfTen += price[i];
    }
  }

  priceOfTen = priceOfTen + priceOfFive;
  const avgFive = Number(priceOfFive) / 5;
  const avgTen = Number(priceOfTen) / 10;
  // 5일선이나 10일선 보다 밑이면 false
  if (price[0] < avgFive || price[0] < avgTen) {
    return false;
  }
  const avgFive005 = Math.ceil(avgFive * 0.05);
  const fiveBoxTop = avgFive + avgFive005;
  const fiveBoxBottom = avgFive - avgFive005;

  const avgTen005 = Math.ceil(avgTen * 0.05);
  const tenBoxTop = avgTen + avgTen005;
  const tenBoxBottom = avgTen - avgTen005;

  const box = {
    firstBox: [fiveBoxBottom, tenBoxTop],
    secBox: [tenBoxBottom, fiveBoxTop],
  };

  return box;
};

/*
  뉴스 가져오기
*/

export const getNews = async (companies) => {
  let news = [];
  for (let i = 0; i < companies.length; i++) {
    const list = await getCompanyNews(companies[i]);
    news.push(list);
  }
  return news;
};

const getCompanyNews = async (company) => {
  const driver = await init();
  console.log("Start getCompanyNews Func");
  await driver.get("https://finance.naver.com/sise/");
  const inputBox = await driver.wait(
    until.elementLocated(By.xpath("//*[@id='stock_items']")),
    10000
  );
  await inputBox.sendKeys(company, Key.RETURN);
  const getDayOfTrade = await driver
    .wait(until.elementLocated(By.xpath("//*[@id='time']/em")), 10000)
    .getText();
  const tradeDay = getDayOfTrade.split(" ");
  const convertNumber = tradeDay[0].split(".");
  const day = Number(
    `${convertNumber[0]}${convertNumber[1]}${convertNumber[2]}`
  );

  await (
    await driver.findElement(By.xpath("//*[@id='content']/ul/li[5]/a"))
  ).click();

  const iframes = await driver.wait(
    until.elementsLocated(By.css("iframe")),
    10000
  );
  let newsList = [];
  for (let i = 0; i < iframes.length; i++) {
    console.log(`Start getCompanyNews iframe`);
    const iframeTitle = await iframes[i].getAttribute("title");
    if (iframeTitle === "뉴스 리스트영역") {
      // iframe으로 스위치
      await driver.switchTo().frame(iframes[i]);
      const companyNews = await driver.wait(
        until.elementsLocated(By.xpath("/html/body/div/table[1]/tbody/tr")),
        10000
      );

      for (let j = 1; j < companyNews.length; j++) {
        const tds = await companyNews[j].findElements(By.xpath("./td"));
        const getNewsDay = await tds[2].getText();
        const newsDay = getNewsDay.split(" ");
        const convertNewsDay = newsDay[0].split(".");
        const numDay = Number(
          `${convertNewsDay[0]}${convertNewsDay[1]}${convertNewsDay[2]}`
        );
        /*
          뉴스 일자가 시장 날짜보다 느리면 break
        */
        if (day > numDay) {
          break;
        }
        const title = await (
          await tds[0].findElement(By.xpath("./a"))
        ).getText();
        const link = await (
          await tds[0].findElement(By.xpath("./a"))
        ).getAttribute("href");
        newsList = {
          newsTitle: title,
          newsLink: link,
        };
      }
    }
    await driver.switchTo().defaultContent();
    console.log(`End getCompanyNews iframe`);
  }
  await driver.quit();
  console.log(`End getCompanyNews Func`);
  return newsList;
};
