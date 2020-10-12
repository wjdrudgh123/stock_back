import { Builder, By, until } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";

//http://finance.daum.net/

export const getNews = async (url) => {
  console.log("start getNews");
  let news = [];

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
  // 주식 장 날짜
  const detailStk = await driver2.wait(
    until.elementLocated(
      By.xpath(
        "//div[@class='detailStk']/span/div/span/span[@class='compIntro']/em"
      )
    ),
    15000
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
    15000
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
  await driver2.quit();
  console.log("end getNews");
  return news;
};
