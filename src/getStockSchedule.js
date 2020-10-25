import { Builder, By, until } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";

// 팍스넷 url
const URL = "http://www.paxnet.co.kr/stock/infoStock/issueCalendarMonth";

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
// 다음 주 구하기
const getDateOfWeeks = () => {
  const d = new Date();
  const currYear = d.getFullYear();
  const currMonth = d.getMonth() + 1;
  const firstDayOfMonth = new Date(currYear, currMonth, 1);
  const firstDay = firstDayOfMonth.getDay();
  const firstDayOfWeek = firstDay === 0 ? 7 : firstDay;
  const todayDate = d.getDate();
  const nextWeekNo = Math.floor((firstDayOfWeek - 1 + todayDate) / 7) + 1;
  if ((firstDay === 5 || firstDay === 6) && nextWeekNo === 6) {
    nextWeekNo = 1;
  }
  return nextWeekNo;
};

export const getNextSchedule = async () => {
  console.log("START GET NEXT SCHEDULE");
  const driver = await init();
  await driver.get(URL);
  await driver.manage().window().maximize();

  const nextWeek = getDateOfWeeks();
  const getWeeks = await driver.wait(
    until.elementsLocated(
      By.xpath(
        `//*[@id="calendar"]/div[2]/div/table/tbody/tr/td/div/div/div[${nextWeek}]/div[2]/table/thead/tr/td`
      )
    ),
    10000
  );
  let News = [];
  for (let i = 0; i < getWeeks.length; i++) {
    await driver.navigate().refresh(); // stale 에러 방지용 refresh
    const moreBtn = await driver.wait(
      until.elementLocated(
        By.xpath(
          `//*[@id="calendar"]/div[2]/div/table/tbody/tr/td/div/div/div[${nextWeek}]/div[2]/table/thead/tr/td[${
            i + 1
          }]/button[1]`
        )
      ),
      10000
    );

    await driver.actions().click(moreBtn).perform();
    await driver.manage().setTimeouts({ implicit: 10000 });
    const popUp = await driver.wait(
      until.elementsLocated(
        By.xpath("//*[@id='calendar']/div[3]/div[2]/div[2]/div/div/ul/li")
      ),
      10000
    );
    const date = await driver
      .wait(
        until.elementLocated(
          By.xpath("//*[@id='calendar']/div[3]/div[2]/div[1]/p/strong")
        ),
        10000
      )
      .getText();

    News.push({ date: date, news: await getNews(popUp) });
  }
  await driver.quit();
  console.log("END GET NEXT SCHEDULE");
  return News;
};
//div[2]/div[2]/div/div/ul/li
const getNews = async (popUp) => {
  let News = [];
  for (let i = 0; i < popUp.length; i++) {
    const title = await popUp[i]
      .findElement(By.xpath("./p[@class='pop-title']"))
      .getText();

    const description = await popUp[i]
      .findElement(By.xpath("./p[@class='pop-cont']"))
      .getText();

    News.push({ title: title, description: description });
  }
  return News;
};
