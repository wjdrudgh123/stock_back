import { Builder, By, until } from "selenium-webdriver";
import chrome, { ServiceBuilder } from "selenium-webdriver/chrome";
import path from "path";

/*
https://finance.naver.com/sise/sise_fall.nhn
*/

const URL_KOSPI = "https://finance.naver.com/sise/sise_fall.nhn?sosok=0";
const URL_KOSDAQ = "https://finance.naver.com/sise/sise_fall.nhn?sosok=1";
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
  console.log("Start checkFallStock");
  await driver.get(url);
  return driver;
};

export const startSearching = async () => {
  console.log("START SEARCHING FUNC START!!!");
  await searchingSetting(URL_KOSPI);
  await searchingSetting(URL_KOSDAQ);
  console.log(`START SEARCHING FUNC FINISH: ${FINAL_PICK.length}`);
  return FINAL_PICK;
};

// 검색 조건 세팅
const searchingSetting = async (url) => {
  console.log("Start checkFallStock");
  let companyNames = [];

  const driver = await connectServer(url);
  let radioBtns = await checkSettingRadioBtn(driver, "check per checked");

  if (radioBtns.per === "true" && radioBtns.trade === null) {
    await radioBtns.perRadio.click(); // per 체크해제
    await radioBtns.tradeRadio.click(); // 전일거래량 체크
    await (
      await driver.findElement(
        By.xpath("//*[@id='contentarea_left']/div[2]/form/div/div/div/a[1]")
      )
    ).click(); // 적용하기 클릭
    // 다시 확인
    radioBtns = await checkSettingRadioBtn(driver, "click radio button");
    console.log(radioBtns.per, radioBtns.trade);
    if (radioBtns.per === null && radioBtns.trade === "true") {
      const trTag = await radioBtns.driver.findElements(
        By.xpath("//*[@id='contentarea']/div[3]/table/tbody/tr")
      );
      for (let i = 2; i < trTag.length; i++) {
        const companies = await getProperCompany(trTag[i]);
        if (companies !== false) {
          companyNames.push(companies);
        }
      }
    }
  }
  await radioBtns.driver.quit();
  console.log(`LIST COUNT: ${companyNames.length}`);
  console.log(`FINISH GET PROPER COMPANY`);
  console.log(`CHECK COMPANY START`);
  for (let index = 0; index < companyNames.length; index++) {
    const pickCompany = await checkCompany(companyNames[index]);
    if (pickCompany !== false) {
      FINAL_PICK.push(pickCompany);
    }
  }
  console.log(`CHECK COMPANY FINISH`);
  return FINAL_PICK;
};

const checkSettingRadioBtn = async (driver, log) => {
  console.log(`SETTING RADIO BUTTON: ${log}`);

  const chkPerRadio = await driver.wait(
    until.elementLocated(By.xpath("//*[@id='option6']")),
    10000
  );
  const chkLastTradeRadio = await driver.wait(
    until.elementLocated(By.xpath("//*[@id='option9']")),
    10000
  );
  const chkPerRadioAttr = await chkPerRadio.getAttribute("checked"); // checked면 true 아니면 null
  const chkLastTradeRadioAttr = await chkLastTradeRadio.getAttribute("checked"); // checked면 true 아니면 null

  const returnValue = {
    perRadio: chkPerRadio,
    tradeRadio: chkLastTradeRadio,
    per: chkPerRadioAttr,
    trade: chkLastTradeRadioAttr,
    driver: driver, // 확인할때 생긴 driver
  };

  return returnValue;
};

const getProperCompany = async (tr) => {
  console.log(`GET PROPER COMPANY FUNC START`);
  /*
    거래량 20% 차이나는 종목 확인
  */
  const checkTr = await tr
    .findElement(By.xpath("./td[1]"))
    .getAttribute("class");

  if (checkTr === "no") {
    const price = await tr.findElement(By.xpath("./td[3]")).getText();
    const tmpUpDown = await tr.findElement(By.xpath("./td[5]")).getText(); // 하락률
    const upDown = tmpUpDown.replace(/\%/g, "");

    if (Number(price.replace(/\,/g, "")) > 1000 && Number(upDown) < -6.5) {
      const lastTrade = await tr.findElement(By.xpath("./td[6]")).getText();
      const todayTrade = await tr.findElement(By.xpath("./td[7]")).getText();

      const tradeRating =
        ((Number(todayTrade.replace(/\,/g, "")) -
          Number(lastTrade.replace(/\,/g, ""))) /
          Number(todayTrade.replace(/\,/g, ""))) *
        100;

      if (tradeRating >= -35) {
        const aTag = await tr.findElement(By.xpath("./td[2]/a"));
        const name = await aTag.getText();
        const url = await aTag.getAttribute("href");

        if (validatorCompanyName(name)) {
          return { name: name, url: url };
        }
      }
    }
  }
  return false;
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

const checkCompany = async ({ name, url }) => {
  console.log(`CHECK COMPANY FUNC`);
  const driver = await connectServer(`${url}`);
  await (
    await driver.wait(
      until.elementLocated(By.xpath("//*[@id='content']/ul/li[2]/a")),
      10000
    )
  ).click();
  await driver.manage().setTimeouts({ implicit: 15000 });
  const iframes = await driver.wait(
    until.elementsLocated(By.css("iframe")),
    10000
  );
  for (let i = 0; i < iframes.length; i++) {
    const iframeTitle = await iframes[i].getAttribute("title");
    if (iframeTitle === "일별 시세") {
      console.log(`SWITCH FRAME`);
      // iframe으로 스위치
      await driver.switchTo().frame(iframes[i]);
      const marketPrices = await driver.wait(
        until.elementsLocated(By.xpath("/html/body/table[1]/tbody/tr")),
        10000
      );
      let lowPrice = 999999999;

      for (let j = 2; j < 5; j++) {
        const checkPricePoll = await marketPrices[j]
          .findElement(By.xpath("./td[3]/span"))
          .getAttribute("class");
        const tmpLowPrice = await (
          await marketPrices[j].findElement(
            By.xpath("/html/body/table[1]/tbody/tr[3]/td[6]/span")
          )
        ).getText();

        const lowPric = Number(tmpLowPrice.replace(/\,/g, ""));

        if (lowPric < lowPrice) {
          lowPrice = lowPric;
        }
        const pollSplit = checkPricePoll.split(" ");

        if (pollSplit[2] === "red02") {
          await driver.quit();
          return { name: name, lowPrice: lowPrice };
        }
      }
      await driver.quit();
      return false;
    }
  }
};
