import express from "express";
import "./scrapper";
import { init } from "./scrapper";
import cors from "cors";

const PORT = process.env.PORT || 3000;

const app = express();
let TODAY_DATA = [];
let DATE = "";
let NEW_DAY = false;
let flag = false; // 중복 호출 되도 프로세스 돌고 있음 안돌게

const chkDate = (req, res, next) => {
  console.log("check day");
  NEW_DAY = false;
  const d = new Date();
  const date = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  const curr_time = `${d.getHours()}${d.getMinutes()}`;
  const time = "1600";

  if (!(date === DATE) && Number(curr_time) > Number(time)) {
    DATE = date;
    NEW_DAY = true;
    console.log("setting day");
  }
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
  console.log("data len: " + TODAY_DATA.length);
  console.log("new_day: " + NEW_DAY);
  console.log("flag: " + flag);
  if ((TODAY_DATA.length === 0 || NEW_DAY === true) && flag === false) {
    console.log("flag true");
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
    flag = false;
    console.log("flag false");
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
