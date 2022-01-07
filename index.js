const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

const COIN_LIMIT = 10; // max: 5000
const FIRST_DATE = "2022-01-05"; // min: 2013-04-28
const OFFSET = 0;

const createCSV = (historicalData) => {
  const cryptoList = Object.keys(historicalData);
  const columns = ["Date", ...cryptoList];
  let priceRows = [];
  let dominanceRows = [];
  let indexRows = [];
  let date = moment(FIRST_DATE);
  while (date < moment().startOf("day")) {
    const currentDate = date.format("YYYY-MM-DD");
    let priceRow = [currentDate];
    let dominanceRow = [currentDate];
    let indexRow = [currentDate, 0];
    cryptoList.forEach((coin) => {
      if (historicalData[coin][currentDate]) {
        priceRow.push(historicalData[coin][currentDate].price);
        dominanceRow.push(historicalData[coin][currentDate].dominance);
        indexRow[1] +=
          historicalData[coin][currentDate].price *
          historicalData[coin][currentDate].dominance;
      } else {
        priceRow.push("");
        dominanceRow.push("");
      }
    });
    priceRows.push(priceRow);
    dominanceRows.push(dominanceRow);
    indexRows.push(indexRow);
    date = date.add(1, "days");
  }

  const dir = "./output";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  const priceSheet = [columns, ...priceRows.reverse()].reduce((acc, item) => {
    acc += item.toString() + "\n";
    return acc;
  }, "");
  fs.writeFile("./output/price_sheet.csv", priceSheet, (err) => {
    if (err) return console.log(err);
  });
  const dominanceSheet = [columns, ...dominanceRows.reverse()].reduce(
    (acc, item) => {
      acc += item.toString() + "\n";
      return acc;
    },
    ""
  );
  fs.writeFile("./output/dominance_sheet.csv", dominanceSheet, (err) => {
    if (err) return console.log(err);
  });
  const indexSheet = [["Date", "Index"], ...indexRows.reverse()].reduce(
    (acc, item) => {
      acc += item.toString() + "\n";
      return acc;
    },
    ""
  );
  fs.writeFile("./output/index_sheet.csv", indexSheet, (err) => {
    if (err) return console.log(err);
  });
};

let historicalData = {};
const getData = (date) =>
  axios
    .get(
      `https://web-api.coinmarketcap.com/v1/cryptocurrency/listings/historical?convert=EUR&date=${date}&limit=${COIN_LIMIT}&start=${
        OFFSET + 1
      }`
    )
    .then((response) => {
      console.log(date);
      const totalMarketCap = response.data.data.reduce(
        (acc, coin) => acc + coin.quote.EUR.market_cap,
        0
      );
      response.data.data.forEach((coin) => {
        historicalData[coin.symbol] = historicalData[coin.symbol] || [];
        historicalData[coin.symbol][date] = {
          price: coin.quote.EUR.price,
          dominance: coin.quote.EUR.market_cap / totalMarketCap,
        };
      });
      const nextDate = moment(date).add(1, "days");
      if (nextDate < moment().startOf("day")) {
        setTimeout(() => {
          getData(nextDate.format("YYYY-MM-DD"));
        }, 1000);
      } else {
        createCSV(historicalData);
      }
    })
    .catch((err) => {
      console.log(err);
      setTimeout(() => {
        getData(date);
      }, 60000);
    });

getData(FIRST_DATE);
