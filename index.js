#!/usr/bin/env node
// MIT License
// Copyright (c) 2017 Martin Wind

const program = require('commander');

let actionName = 'list';
let actionArgs = [];

const collect = (val, memo) => {
  memo.push(val);
  return memo;
}

program
  .version('0.9.0')
  .option('-d, --device <name>', 'select a echo device', collect, [])
  .option('-c, --cookie <file>', 'alexa web cookie file')
  .arguments('<action> [args...]', 'the action to run')
  .action(function (name, args) {
     actionName = name;
     actionArgs = args
  })

program.on('--help', function(){
  console.log('');
  console.log('  Actions:');
  console.log('');
  console.log('    list             list all echo devices');
  console.log('    info             prints info of echo devices');
  console.log('    play             resume playback');
  console.log('    pause            pause playback');
  console.log('    next             play next title');
  console.log('    previous         play previous title');
  console.log('    volume [level]   set volume level [0-100]');
  console.log('    tunein [name]    playes tunein station');
  console.log('');
});

program
  .parse(process.argv);

const untildify = require('untildify');
const fs = require('fs');
const cookieFilePath = untildify(program.cookie || '~/.alexa-cookie');
if (!fs.existsSync(cookieFilePath)) {
  console.error(`please create the cookie file ${cookieFilePath}`);
  process.exit(1);
}

const cookie = fs.readFileSync(cookieFilePath, 'UTF-8').trim();
const Alexa = require('./api')
const alexa = new Alexa(cookie);

const slectedDevices = () => {
  if (program.device.length) {
    return alexa.devices()
    .then((devices) => devices.filter((dev) =>
      program.device.indexOf(dev.toString()) >= 0
    ))
  }
  return alexa.devices();
}


const actions = {

  list: () => slectedDevices().then(async (devices) => {
    for (var di = 0, len = devices.length; di < len; di++) {
      const device = devices[di];
      try {
        const playerInfo = await device.playerInfo();
        if (playerInfo.state) {
          console.log(`${device}: ${playerInfo.state.toLowerCase()} ${playerInfo.infoText.title}`);
        } else {
          console.log(`${device}`);
        }
      } catch(e) {
        console.log(`${device}`);
      }
    }
  }),

  info: () => slectedDevices().then((devices) => {
    for (var di = 0, len = devices.length; di < len; di++) {
      const device = devices[di];
      console.dir(device.toJSON());
    }
  }),

  pause: () => slectedDevices().then(async (devices) => {
    for (var di = 0, len = devices.length; di < len; di++) {
      const device = devices[di];
      await device.pause();
    }
  }),

  play: () => slectedDevices().then(async (devices) => {
    for (var di = 0, len = devices.length; di < len; di++) {
      const device = devices[di];
      await device.play();
    }
  }),

  next: () => slectedDevices().then(async (devices) => {
    for (var di = 0, len = devices.length; di < len; di++) {
      const device = devices[di];
      await device.next();
    }
  }),

  previous: () => slectedDevices().then(async (devices) => {
    for (var di = 0, len = devices.length; di < len; di++) {
      const device = devices[di];
      await device.previous();
    }
  }),

  volume: ([level]) => slectedDevices().then(async (devices) => {
    const targetLevel = level ? parseInt(level) : 50;
    for (var di = 0, len = devices.length; di < len; di++) {
      const device = devices[di];
      await device.setVolumeLevel(targetLevel);
    }
  }),

  tunein: ([name]) => slectedDevices().then(async (devices) => {
    if (!name) {
      throw new Error('tunein station name is required');
    }

    const stations = await alexa.tuneInSearch(name);
    if (!stations.length) {
      throw new Error(`tunein station with name ${name} not found`);
    }
    const station = stations[0];

    for (var di = 0, len = devices.length; di < len; di++) {
      const device = devices[di];
      await device.tuneinQueueAndPlay(station);
    }

  }),
}

if (!actions[actionName]) {
  console.error(`action ${actionName} not found`);
  process.exit(1);
}

actions[actionName](actionArgs).catch((err) => console.error(err));
