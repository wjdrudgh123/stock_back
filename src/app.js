import express from "express";
import "./scrapper";
import { init } from "./scrapper";
import cors from "cors";

const PORT = process.env.PORT || 3000;

const app = express();
let TODAY_DATA = [];
let TODAY = "";
let UPDATE = false;
let flag = false; // 중복 호출 되도 프로세스 돌고 있음 안돌게

const chkDate = (req, res, next) => {
  console.log("start check time");
  const d = new Date();
  const date = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  const curr_time = `${d.getHours()}${d.getMinutes()}`;
  const firstUpdateTime = "1600";
  const secondUpdateTime = "1800";
  const thirdUpdateTime = "2000";
  const fourthUpdateTime = "2300";
  if (
    (Number(curr_time) > Number(firstUpdateTime) ||
      Number(curr_time) > Number(secondUpdateTime) ||
      Number(curr_time) > Number(thirdUpdateTime) ||
      Number(curr_time) > Number(fourthUpdateTime)) &&
    TODAY !== date
  ) {
    console.log("update&today change true");
    TODAY = date;
    UPDATE = true;
  }

  console.log("end check time");
  next();
};

const corsOptions = {
  origin: ["http://localhost:3000", "https://recomstock.netlify.app"],
  //origin: "https://recomstock.netlify.app",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(chkDate);

const scrap = async (req, res) => {
  console.log("start scrap");

  // res.header("Access-Control-Allow-Origin", "https://recomstock.netlify.app");
  // res.header(
  //   "Access-Control-Allow-Headers",
  //   "Origin, X-Requested-With, Content-Type, Accept"
  // );
  // res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  // res.header("Access-Control-Allow-Credentials", true);
  console.log("today: " + TODAY);
  console.log("update: " + UPDATE);
  console.log("flag: " + flag);

  if (UPDATE === true && flag === false) {
    console.log("change flag true");
    flag = true;
    // 데이터가 없거나 날짜가 바뀌면 스크랩
    try {
      let lists = [];
      const kospi = await init("KOSPI");
      const kosdaq = await init("KOSDAQ");
      lists = kospi.concat(kosdaq);
      TODAY_DATA = lists;
      console.log("end sending");
      res.json(TODAY_DATA);
    } catch (err) {
      console.log(err);
    }
  } else {
    if (TODAY_DATA.length !== 0) {
      console.log("change flag false");
      flag = false;
    } else {
      console.log("change flag false");
      console.log("change Update true");
      UPDATE = true;
      flag = false;
    }
    console.log("end sending");
    res.json(TODAY_DATA);
  }
};
app.use("/data", scrap);
app.use("/", (req, res) => {
  res.send("hello");
});

app.listen(PORT, () => {
  console.log(`server listening on port:${PORT}`);
});
