import express from "express";
import { getGoldenCrossCompany, searchingDaum } from "./scrapper";
import cors from "cors";
import schedule from "node-schedule";

const PORT = 3000;

const app = express();
export let GOLDENCROSS_LIST = [];
export let TODAY_DATA = [];

const getGoldenCross = async () => {
  const d = new Date();
  const date = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  console.log(`Time: ${date} Get Golden Cross Start`);
  GOLDENCROSS_LIST = await getGoldenCrossCompany();
  console.log(`Time: ${date} Get Golden Cross End`);
};

const getAutoData = async () => {
  console.log(`Get Company Info Start`);
  TODAY_DATA = await searchingDaum(GOLDENCROSS_LIST, 1);
  console.log(`Get Company Info End`);
};
const getGolendCrossJob1 = schedule.scheduleJob(
  "0 00 16 * * 1-5",
  getGoldenCross
);
const getGolendCrossJob2 = schedule.scheduleJob(
  "0 30 16 * * 1-5",
  getGoldenCross
);

const getCompaniesJob1 = schedule.scheduleJob("0 00 17 * * *", getAutoData);
const getCompaniesJob2 = schedule.scheduleJob("0 00 19 * * *", getAutoData);
const getCompaniesJob3 = schedule.scheduleJob("0 00 21 * * *", getAutoData);
const getCompaniesJob4 = schedule.scheduleJob("0 00 23 * * *", getAutoData);

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

const returnJson = async (req, res) => {
  console.log("start scrap");

  // res.header("Access-Control-Allow-Origin", "https://recomstock.netlify.app");
  // res.header(
  //   "Access-Control-Allow-Headers",
  //   "Origin, X-Requested-With, Content-Type, Accept"
  // );
  // res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  // res.header("Access-Control-Allow-Credentials", true);
  if (TODAY_DATA.length === 0) {
    console.log(`${TODAY_DATA.length}/ scrap start cause no data`);
    TODAY_DATA.push("Init");
    await getGoldenCross();
    await getAutoData();
  }
  console.log("end scrap");
  if (TODAY_DATA[0] === "Init") {
    TODAY_DATA.shift();
  }
  console.log("start send json");
  res.json(TODAY_DATA);
  console.log("end send json");
};

app.get("/data", returnJson);
app.get("/", (req, res) => {
  res.send("hello");
});

app.listen(PORT, () => {
  console.log(`server listening on port:${PORT}`);
});
