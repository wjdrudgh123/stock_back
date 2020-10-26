import express from "express";
import { startSearching } from "./stockChecker";
import { getNextSchedule } from "./getStockSchedule";
import { realTimeSearch } from "./realTimeSearching";
import cors from "cors";
import schedule from "node-schedule";

const PORT = 4000;

const app = express();

let TODAY_DATA = {};
let initFlag = false; // 처음 서버 실행할때

const getTodayCompany = async () => {
  delete TODAY_DATA.company;
  TODAY_DATA.company = await startSearching();
};
const getWeeksNews = async () => {
  delete TODAY_DATA.news;
  TODAY_DATA.news = await getNextSchedule();
};
// 실시간 검색
const getRealTimeSearching = async () => {
  delete TODAY_DATA.realTime;
  TODAY_DATA.realTime = await realTimeSearch();
};
// 오늘 종목 스케쥴러
const getCompaniesJob = schedule.scheduleJob(
  "00 05 18 * * 1-5",
  getTodayCompany
);
// 실시간 검색 스케쥴러
const getRealTimeSearchingJob = schedule.scheduleJob(
  "00 30 * * * 1-5",
  getRealTimeSearching
);
// 다음주 일정 스케쥴러
const getWeeksNewsJob = schedule.scheduleJob("00 05 23 * * 6", getWeeksNews);

const corsOptions = {
  origin: ["http://localhost:3000", "https://recomstock.netlify.app"],
  credentials: true,
};

app.use(cors(corsOptions));

const returnJson = async (req, res) => {
  console.log("GET /data START");

  if (initFlag === false) {
    getTodayCompany();
    getWeeksNews();
    getRealTimeSearching();
    initFlag = true;
  }
  console.log("start send json");
  res.json(TODAY_DATA);
  console.log("end send json");
};

app.get("/data", returnJson);
app.get("/", async (req, res) => {
  res.send("hello");
});

app.listen(PORT, () => {
  console.log(`server listening on port:${PORT}`);
});
