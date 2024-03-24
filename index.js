const SparkMD5 = require('spark-md5') // Used to get CRC hash
const fs = require('fs') // Write last level & save
const axios = require('axios') // Send clear request
const prompt = require('prompt-sync')({sigint: true}) // Set up amount to farm
const { password , id , timetoclear , enablehell , leveltime , gem_farming} = require('./userconfig.json') // int , int , string

var configfile = fs.readFileSync('./userconfig.json') // variables to change
configfile = JSON.parse(configfile)

var timer = 0 // Amount
var timer2 = 0 // PP gained
var timer3 = 0 // PP mode
var batchSize = 5

async function sendRequest(params,crc,uri,auth,token) {
  if(!auth) auth = 0
  if(!token) token = undefined
    try {
       let res = await axios.post(
        `https://block-bros.appspot.com/${uri}`,
        params,
        {
          headers: {
            'CRC': `${crc}`,
            'Authorization': `${auth}:${token}`,
            'Universal-Mode': 'true',
            'Device-Platform': 'ios',
            'Client-Version': '8',
            'Accept-Language': 'de-de',
            'Master-Version': '545',
            'Device-Language': 'de'
          }
        }
      )
        return res
    }
    catch (err) {
        console.log(err)
    }
  }
async function gettoken(id,password){
    const logindata = {
        'gamer_id': `${id}`,
        'password': `${password}`
      }
    await sendRequest(logindata,SparkMD5.hash(JSON.stringify(logindata)),`auth/alt_login`).then(async(res) => {
        console.log(`Got token: ${res.data.result.token}`)
        if(res.data.success === true){
        logins = [
          res.data.result.token,
          res.data.updated.gamer.id
        ]} else { throw new Error ('Account details invalid') }
    })
    return logins
}

async function validateconfig(password,id,amount,time,enablehell,mode,gemfarm){
    if(!configfile) throw new Error('Config file does not exist')

    const passwordstatus = typeof(password) === "string"
    const idstatus = typeof(id) === "number"
    const amountstatus = typeof(amount) === "number"
    const timestatus = typeof(time) === "object"
    const enablehellstatus = typeof(enablehell) === "boolean"
    const modestatus = mode === 'pp' || mode === 'amount'
    const gemfarmstatus = typeof(gemfarm) === 'boolean'

    if(passwordstatus === false) throw new Error('Password is not of type \"String\"')
    if(idstatus === false) throw new Error('ID is not of type \"Number\"')
    if(amountstatus === false) throw new Error('Amount is not of type \"Number\"')
    if(timestatus === false || timestatus[4]) throw new Error('Time is not an Array of 4 numbers')
    if(enablehellstatus === false) throw new Error('Enablehell is not of type \"Boolean\"')
    if(modestatus === false) throw new Error('Mode is not set correctly. Please enter \"pp\" or \"amount\"')
    if(gemfarmstatus === false) throw new Error('Gem_farming is not of type \"Boolean\"')

    if(id <= 0) throw new Error(`ID is not set correctly`)
    if(amount <= 0) throw new Error(`Amount is not set correctly`)
    return true
}
function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}
function skiphell(config,diff){
  return config === false && diff >= 4
}
async function getleveldata(id2){
  let level = await axios.request(`https://block-bros.appspot.com/web/level/${id2}`)

  if(Object.keys(level.data).length === 0 ) return [false,0]
  level = level.data
  return [level,timetoclear[level.difficulty - 1]]
}
// Source: https://stackoverflow.com/questions/19700283/how-to-convert-time-in-milliseconds-to-hours-min-sec-format-in-javascript/19700358#19700358
function msToTime(duration) {
  var milliseconds = Math.floor((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}
function getestimatedtime(time1,time2,time3,length){
  return msToTime(Math.ceil(((time1 + time2 + time3) / 3) * length))
}
function createcleardata(level,time){
  var idstring = level.id.toString()
  var datas = {
    batch: {
        level: {
            [idstring]: {
                clear: 1,
                play: 1
            }
        }
    },
    level_id: level.id,
    time: time,
    version: level.version,
    video_loaded: true
  }
  return datas
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}
function incrTimer(modes,curpp,lastpp){
  timer += Math.abs(lastpp - curpp)
  timer2 += Math.abs(lastpp - curpp)
  timer3 += 1
}
function writeConfig(configfiles){
  if(configfiles){
    fs.writeFileSync('./userconfig.json',JSON.stringify(configfiles,null,1),(err) => {
      if (err)
        console.log(err)
      })
  }
}
async function mainClear(id, token, authorization, amount, mode) {
  let levelstatus = await getleveldata(id); // Get level data
  if (levelstatus[0] !== false) { // If level exists,
    try {
      let level = levelstatus[0];
      let waitingtime = levelstatus[1];
      if (skiphell(enablehell, level.difficulty) === true) {
        console.log('Skipped hell level');
        return;
      }

      let rankedData = {
        "index": 0,
        "level_id": level.id
      };
      let rankedBoard = await sendRequest(JSON.stringify(rankedData), SparkMD5.hash(JSON.stringify(rankedData) + token), "level/ranking/list", authorization, token); // Get leaderboard times
      let rankedIndex = rankedBoard.data['result']['items'].length; // Get leaderboard length
      if (!rankedIndex) {
        console.log(`Could not find leaderboard times on this level. Skipping for safety.`);
        return;
      }
      let randTime = leveltime[rand(0, leveltime.length - 1)]; // Random time in ms from the leveltime array
      let clearTime = rankedBoard.data['result']['items'][rankedIndex - 1]['time'] + randTime; // Get last place in leaderboard and add randTime to its time


      let cleardata = JSON.stringify(createcleardata(level, clearTime));
      let clearcrc = SparkMD5.hash(cleardata + token);

      await sendRequest(cleardata, clearcrc, 'level/clear', authorization, token).then(async(res) => {
        let isVideo = res.data['result']['video'] !== null;
        let pp = res.data.updated.gamer.playerPt;
        let gems = res.data.updated.gamer.gem;
        console.log(`${id}, ${pp}, ${gems}`);
        // Clear console
        await wait(10000)
        console.clear();

        incrTimer(mode, configfile.curPlayerPt, pp);
        if (isVideo === true && gem_farming === true) {
          let videoData = { "video": res.data['result']['video'] };
          let videoGems = res.data['result']['videoGem'];

          await sendRequest(JSON.stringify(videoData), SparkMD5.hash(JSON.stringify(videoData) + token), "videoreward/claim", authorization, token).then((res) => {
            console.log(`vgems ${videoGems}`);
          });
          await wait(100)
          console.clear();
        }
        if (pp !== configfile.curPlayerPt) {
          configfile.curPlayerPt = pp;
        }
      });
    } catch (err) {
      console.log(err);
      console.log(`error`);
      return;
    }
    await wait(100)
    console.clear();
  } else {
    console.log(`skip ${id}`);
  }
  await wait(100)
  console.clear();
  writeConfig(configfile);
}

async function start(){
    const mode = prompt(`Enter a mode (pp or amount):`).toLocaleLowerCase().replace(/ /g,"")
    const amount = Number(prompt(`Enter an amount:`))
    validateconfig(password,id,amount,leveltime,enablehell,mode,gem_farming).then(async() => {
      const ta = await gettoken(id,password),
            token = ta[0],
            authorization = ta[1]
      while(timer < amount){
        let currentClears = []
        for(let i = configfile.currentid; i < configfile.currentid + batchSize; i++){
          currentClears.push(mainClear(i,token,authorization,amount,mode))
        }
        configfile.currentid += batchSize
        writeConfig()
        await Promise.all(currentClears).then(async() => wait(5))
      }
        console.log(`Done! Gained ${mode === 'amount' ? timer2 : timer} Player Points and cleared ${timer3} levels.`)
    })
}

start()