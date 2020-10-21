import express from "express";
import { startSearching } from "./stockChecker";
import cors from "cors";
import schedule from "node-schedule";

const PORT = 3000;

const app = express();

let TODAY_DATA = [];
let initFlag = false; // 처음 서버 실행할때

const getCompany = async () => {
  TODAY_DATA = startSearching();
};

const getCompaniesJob = schedule.scheduleJob("00 05 18 * * 1-5", getCompany);

const corsOptions = {
  origin: ["http://localhost:3000", "https://recomstock.netlify.app"],
  credentials: true,
};

app.use(cors(corsOptions));

const getCompany = async () => {
  TODAY_DATA = startSearching();
};

const returnJson = async (req, res) => {
  console.log("GET /data START");

  if (TODAY_DATA.length === 0 && initFlag === false) {
    getCompany();
    initFlag = true;
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
