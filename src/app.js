import express from "express";
import { startSearching } from "./stockChecker";
import { getNextSchedule } from "./getStockSchedule";
import cors from "cors";
import schedule from "node-schedule";

const PORT = 4000;

const app = express();

let TODAY_DATA = {};
let initFlag = false; // 처음 서버 실행할때

const getTodayCompany = async () => {
  TODAY_DATA["company"] = await startSearching();
};
const getWeeksNews = async () => {
  TODAY_DATA["news"] = await getNextSchedule();
};

const getCompaniesJob = schedule.scheduleJob(
  "00 05 18 * * 1-5",
  getTodayCompany
);

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
    initFlag = true;
  }
  console.log("start send json");
  console.log(`TODAY_DATA LENGTH: ${TODAY_DATA.length}`);
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
