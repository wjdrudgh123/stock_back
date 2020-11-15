import express from "express";
import convert from "xml-js";
import request, { head } from "request";
import cors from "cors";
import schedule from "node-schedule";

import { getNextSchedule } from "./getStockSchedule";
import { realTimeSearch } from "./realTimeSearching";
import { checker } from "./companyChecker";

const PORT = 4000;

const app = express();

let TODAY_DATA = {};
let initFlag = false; // 처음 서버 실행할때

const getTodayCompany = async () => {
  try {
    TODAY_DATA.company = [];
    TODAY_DATA.company = await checker();
  } catch (err) {
    console.log(`Error for getTodayCompany Func: ${err}`);
  }
};
const getWeeksSchedule = async () => {
  try {
    TODAY_DATA.schedule = [];
    TODAY_DATA.schedule = await getNextSchedule();
  } catch (err) {
    console.log(`Error for getWeeksNews Func: ${err}`);
  }
};
// 실시간 검색
const getRealTimeSearching = async () => {
  const d = new Date();
  const startTime = 7;
  const finishTime = 19;
  const currHour = d.getHours();
  try {
    // 아침 7시부터 저녁 7시까지 10분마다 실시간 조회
    if (currHour >= startTime && currHour < finishTime) {
      TODAY_DATA.realTime = [];
      TODAY_DATA.realTime = await realTimeSearch();
    } else {
      TODAY_DATA.realTime = "timeout";
    }
  } catch (err) {
    console.log(`Error for getRealTimeSearching Func: ${err}`);
  }
};
// RSS
const getRSS = async (urls) => {
  console.log(`START GET RSS FUNC`);
  let broadCasts = [];
  for (let i = 0; i < urls.length; i++) {
    await request.get(urls[i], async (err, res, body) => {
      const broadCast = ["yonhap", "hangyeong", "chosun", "donga"];

      if (err) {
        console.log(`GET NEWS RSS ERR: ${err}`);
      }
      if (res.statusCode === 200) {
        const result = await body;
        const xmlToJson = await convert.xml2json(result, {
          compact: true,
          spaces: 4,
        });
        const {
          rss: {
            channel: { item },
          },
        } = JSON.parse(xmlToJson);
        const headline = {};
        headline[broadCast[i]] = item;
        broadCasts.push(headline);
      }
      TODAY_DATA["news"] = broadCasts;
    });
  }
};

const getRssNews = async () => {
  let urls = [];
  const YONHAP_NEWS =
    "https://www.yonhapnewstv.co.kr/category/news/economy/feed/";
  const HANGYEONG_NEWS = "http://rss.hankyung.com/new/news_economy.xml";
  const CHOSUN_NEWS = "https://biz.chosun.com/site/data/rss/rss.xml";
  const DONGA_NEWS = "https://rss.donga.com/economy.xml";
  urls.push(YONHAP_NEWS, HANGYEONG_NEWS, CHOSUN_NEWS, DONGA_NEWS);
  try {
    TODAY_DATA.news = [];
    TODAY_DATA.news = await getRSS(urls);
  } catch (err) {
    console.log(`Error for getRssNews Func: ${err}`);
  }
};

// 오늘 종목 스케쥴러
const getCompaniesJob = schedule.scheduleJob(
  "00 05 18 * * 1-5",
  getTodayCompany
);
// 실시간 검색 스케쥴러
const getRealTimeSearchingJob = schedule.scheduleJob(
  "00 10 * * * 1-5",
  getRealTimeSearching
);
// 다음주 일정 스케쥴러
const getWeeksNewsJob = schedule.scheduleJob(
  "00 05 23 * * 1-5",
  getWeeksSchedule
);

// RSS 스케쥴러
const getRssJob = schedule.scheduleJob("00 00 */1 * * 1-5", getRssNews);
const corsOptions = {
  origin: ["http://localhost:3000", "https://recomstock.netlify.app"],
  credentials: true,
};

app.use(cors(corsOptions));

const returnJson = async (req, res) => {
  console.log("GET /data START");

  if (initFlag === false) {
    getTodayCompany();
    getRealTimeSearching();
    getWeeksSchedule();
    getRssNews();
    initFlag = true;
  }
  console.log("start send json");
  res.json(TODAY_DATA);
  console.log(TODAY_DATA);
  console.log("end send json");
};

app.get("/data", returnJson);
app.get("/", async (req, res) => {
  await getTodayCompany();
  res.send("hello");
  //res.send(await getRSS());
});
app.listen(PORT, () => {
  console.log(`server listening on port:${PORT}`);
});
