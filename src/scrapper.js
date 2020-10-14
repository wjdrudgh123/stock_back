import { Builder, By, until, Key } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";
import { secondDriver } from "./secondDriver";

/*
http://finance.daum.net/domestic/rise_stocks?market=KOSPI
http://finance.daum.net/domestic/rise_stocks?market=KOSDAQ
https://finance.naver.com/sise/sise_rise.nhn?sosok=0
https://finance.naver.com/sise/sise_rise.nhn?sosok=1
*/

const init = async (time, exchange) => {
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
      // KINDEX, KODEX, 선물, 국고채 제외
      if (
        companyName.indexOf("KINDEX") !== -1 ||
        companyName.indexOf("KODEX") !== -1 ||
        companyName.indexOf("국고채") !== -1 ||
        companyName.indexOf("선물") !== -1
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

export const searchingDaum = async (companies) => {
  // flag 1이면 5일 평균가격 2이면 뉴스
  console.log("Start searching company on Daum");
  const suitableCompanies = [];
  for (let i = 0; i < companies.length; i++) {
    const companyName = companies[i];
    const driver = await init();
    await driver.get(
      `http://finance.daum.net/domestic/search?q=${companyName}`
    );
    try {
      const searchingItem = driver
        .wait(
          until.elementLocated(
            By.xpath("//*[@id='boxContents']/div[2]/div/table/tbody/tr/td[2]/a")
          ),
          80000
        )
        .click();

      const val = await chkMovingAvgLine(driver);
      if (val === true) {
        const news = await getNews(driver);
        suitableCompanies.push({
          name: companyName,
          news: news,
        });
      }
    } catch (err) {
      console.log(`searchingDaum Err: ${err}`);
    } finally {
      await driver.quit();
    }
  }
  console.log("End searching company on Daum");
  return suitableCompanies;
};

// 10일선, 5일선 위에 있으면
const chkMovingAvgLine = async (driver) => {
  console.log("Start get company upto moving line");
  try {
    const clickCurrPrice = driver
      .wait(until.elementLocated(By.xpath("//*[@id='boxTabs']/td[2]/a")), 80000)
      .click();
    let finPrice = []; // 종가
    let fiveDay = 0;
    let tenDay = 0;
    const dayOfPrice = await driver.wait(
      until.elementsLocated(
        By.xpath("//*[@id='boxDayHistory']/div/div[2]/div/table/tbody/tr")
      ),
      100000
    );
    for (let i = 0; i < dayOfPrice.length; i++) {
      const tmpPrice = await driver
        .findElement(
          By.xpath(
            `//*[@id='boxDayHistory']/div/div[2]/div/table/tbody/tr[${
              i + 1
            }]/td[5]/span`
          )
        )
        .getText();
      const price = tmpPrice.replace(/\,/g, "");
      if (i === 0) {
        finPrice = Math.ceil(Number(price));
      }
      if (i <= 5) {
        fiveDay += Number(price);
      } else {
        tenDay += Number(price);
      }
    }
    if (
      Math.ceil(fiveDay / 5) <= finPrice ||
      Math.ceil((tenDay + fiveDay) / 10) <= finPrice
    ) {
      console.log("End get company upto moving line");
      return true;
    }
  } catch (err) {
    console.log(`moving line Err: ${err}`);
  } finally {
    console.log("End empty company upto moving line");
    return false;
  }
};

const getNews = async (driver) => {
  console.log("start getNews");
  let news = [];

  // 주식 장 날짜
  const detailStk = await driver.wait(
    until.elementLocated(
      By.xpath(
        "//div[@class='detailStk']/span/div/span/span[@class='compIntro']/em"
      )
    ),
    30000
  );
  const strStockDate = await detailStk.getText();
  const splitStr = strStockDate.split(" ");
  const splitDate = splitStr[0].split(".");
  const numStockDate = Number(`${splitDate[0]}${splitDate[1]}`);

  const pageTap = await driver.findElement(
    By.xpath("//div[@class='tabB']/table/tbody/tr[@id='boxTabs']/td[5]/a")
  );
  await pageTap.click();
  // 페이지 이동 후 로딩때문에
  try {
    const newsList = await driver.wait(
      until.elementsLocated(
        By.xpath(
          "//div[@id='boxContents']/div[@style='']/div/div[@class='box_contents']/div/ul/li"
        )
      ),
      50000
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
  } catch (err) {
    console.loe(`get news err: ${err}`);
  } finally {
    console.log("end getNews");
    return news;
  }
};

/*
const getDaum = async (driver, exchange) => {
  await driver.get(
    `http://finance.daum.net/domestic/rise_stocks?market=${exchange}`
  );
  const companies = await driver.findElements(
    By.xpath("//*[@id='boxRiseStocks']/div[2]/div[1]/table/tbody/tr")
  );
  const list = await processScrap(companies);
  return list;
};

const processScrap = async (companies) => {
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
