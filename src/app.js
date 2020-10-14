import express from "express";
import { getGoldenCrossCompany, searchingDaum } from "./scrapper";
import cors from "cors";
import schedule from "node-schedule";

const PORT = 3000;

const app = express();
let GOLDENCROSS_LIST = [];
let TODAY_DATA = [];
let TODAY = "";
let chkPass = false;

const getGoldenCross = async (req, res, next) => {
  const d = new Date();
  const date = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  const curr_time = `${d.getHours()}${d.getMinutes()}`;
  const startStockTime = 900;
  const finishStockTime = 1600;

  if (
    Number(curr_time) >= startStockTime &&
    Number(curr_time) <= finishStockTime
  ) {
    console.log("주식시장 운영중");
    chkPass = true;
  } else if (TODAY !== date || GOLDENCROSS_LIST.length === 0) {
    TODAY = date;
    console.log("골든크로스 주식 가져오기 Start");
    GOLDENCROSS_LIST = await getGoldenCrossCompany();
    console.log("골든크로스 주식 가져오기 End");
    chkPass = false;
  }

  next();
};

const getAutoData = async () => {
  TODAY_DATA = await searchingDaum(GOLDENCROSS_LIST, 1);
};

const job1 = schedule.scheduleJob("0 10 16 * * *", getAutoData);
const job2 = schedule.scheduleJob("0 10 18 * * *", getAutoData);
const job3 = schedule.scheduleJob("0 10 20 * * *", getAutoData);
const job4 = schedule.scheduleJob("0 10 23 * * *", getAutoData);
const searchCompany = async (req, res, next) => {
  if (chkPass === false) {
    await getAutoData();
  }
  next();
};

const corsOptions = {
  origin: ["http://localhost:3000", "https://recomstock.netlify.app"],
  //origin: "https://recomstock.netlify.app",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(getGoldenCross);
app.use(searchCompany);

const scrap = async (req, res) => {
  console.log("start scrap");

  // res.header("Access-Control-Allow-Origin", "https://recomstock.netlify.app");
  // res.header(
  //   "Access-Control-Allow-Headers",
  //   "Origin, X-Requested-With, Content-Type, Accept"
  // );
  // res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  // res.header("Access-Control-Allow-Credentials", true);
  chkPass = true;
  console.log("end sending");
  res.json(TODAY_DATA);
};
app.use("/data", scrap);
app.use("/", (req, res) => {
  res.send("hello");
});

app.listen(PORT, () => {
  console.log(`server listening on port:${PORT}`);
});
