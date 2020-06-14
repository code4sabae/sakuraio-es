import util from "https://js.sabae.cc/util.mjs";
//import util from "./util.mjs";

const usecache = false;

const dtDayStart = (dt) => {
  dt.setHours(0);
  dt.setMinutes(0);
  dt.setSeconds(0);
  dt.setMilliseconds(0);
};
const dtAddDay = (dt, nday) => {
  return new Date(dt.getTime() + nday * 24 * 60 * 60 * 1000);
};
const dtAddHour = (dt, nhour) => {
  return new Date(dt.getTime() + nhour * 60 * 60 * 1000);
};
const dtGetGMT = (dt) => {
  return dtAddHour(dt, -9);
};
const dtFormat = (dt) => {
  return util.formatYMDHMS(dtGetGMT(dt)) + "Z";
};

const getFromDataStoreV2 = async function (token, dtafter, dtbefore) {
  const BASE_URL =
    `https://api.sakura.io/datastore/v2/channels?token=${token.token}&module=${token.module}&channel=${token.channel || 0}`;
  const MAX_SIZE = 2000; // limit 2000
  // const MAX_SIZE_CURSOR = 1000
  let url = BASE_URL + "&after=" + dtFormat(dtafter) + "&before=" +
    dtFormat(dtbefore) + "&limit=" + MAX_SIZE;
  console.log(url);
  let data = await (await fetch(url)).json();
  console.log(data.meta);

  let cursor = data.meta.cursor;
  const items = data.results;

  for (;;) {
    if (!data.meta.hasNext) break;
    url = BASE_URL + "&cursor=" + cursor + "&size=" + MAX_SIZE;
    console.log(url);

    data = await (await fetch(url)).json();
    console.log(data.meta);
    const items2 = data.results;
    for (const i of items2) {
      items.push(i);
    }
    cursor = data.meta.cursor;
  }
  return items;
};

const getFromDataStore = async function (token, dtafter, dtbefore) {
  const BASE_URL = "https://api.sakura.io/datastore/v1/channels?token=" + token;
  const MAX_SIZE = 3000; // 1440 * 2 // max 10,000 足りないかも？, cursor 使用時は1000?
  // const MAX_SIZE_CURSOR = 1000
  let url = BASE_URL + "&after=" + dtFormat(dtafter) + "&before=" +
    dtFormat(dtbefore) + "&size=" + MAX_SIZE;
  console.log(url);
  let data = await (await fetch(url)).json();
  console.log(data.meta)

  let cursor = data.meta.cursor;
  const items = data.results;

  let togetcnt = data.meta.match - data.meta.count;

  for (;;) {
    if (togetcnt == 0) {
      break;
    }
    url = BASE_URL + "&cursor=" + cursor + "&size=" + MAX_SIZE;
    console.log(url);

    data = await (await fetch(url)).json();
    console.log(data.meta);
    const items2 = data.results;
    for (const i of items2) {
      items.push(i);
    }
    togetcnt -= data.meta.count;
    cursor = data.meta.cursor;
  }
  return items;
};

const saveJSON = (name, dt, data) => {
  const fn = `data/${name}/${util.formatYMD(dt)}.json`;
  util.mkdirSyncForFile(fn);
  Deno.writeTextFileSync(fn, JSON.stringify(data));
};
const existsJSON = (name, dt) => {
  const fn = `data/${name}/${util.formatYMD(dt)}.json`;
  try {
    const s = Deno.readTextFileSync(fn);
    return true;
  } catch (e) {
  }
  return false;
};

const download = async (ndays, name, token, module, channel) => {
  let dt = new Date();
  dtDayStart(dt);
  for (let i = 0; i < ndays; i++) {
    console.log(dtFormat(dt));
    if (usecache && existsJSON(name, dt)) {
      console.log("skip", dt);
    } else {
      const tommorow = dtAddDay(dt, 1);
      let data = null;
      console.log(module, !module);
      if (module == null) {
        data = await getFromDataStore(token, dt, tommorow);
      } else {
        data = await getFromDataStoreV2({ token, module, channel }, dt, tommorow);
      }
      console.log(data, data.length);
      saveJSON(name, dt, data);
    }
    dt = dtAddDay(dt, -1);
  }
};

export default download;
