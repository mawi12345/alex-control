// MIT License
// Copyright (c) 2017 Martin Wind

const rp = require('request-promise-native');
const cookie = require('cookie');

class ApiHelper {
  constructor(cookies) {
    this.protocol = 'https';
    this.host = 'layla.amazon.de';
    this.headers = {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Origin: 'https://alexa.amazon.de',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
      DNT: 1,
      Referer: 'https://alexa.amazon.de/spa/index.html',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'de-DE,de;q=0.8,en;q=0.6,en-US;q=0.4',
      'Cookie': cookies,
    }
    this.cookies = cookie.parse(cookies);
    this.cache = {};
  }

  url(url) {
    return `${this.protocol}://${this.host}${url}`
  }

  get(url, options) {
    const opts = Object.assign({}, {
      cache: true,
      headers: {}
    }, options);
    if (opts.cache && this.cache[url]) {
      return new Promise((resolve) => resolve(JSON.parse(this.cache[url])));
    }
    return rp.get(this.url(url), {
      gzip: true,
      headers: Object.assign({}, this.headers, opts.headers),
    }).then((res) => {
      if (opts.cache) {
        this.cache[url] = res;
      }
      return JSON.parse(res)
    });
  }

  post(url, data, headers) {
    return rp.post(this.url(url), {
      gzip: true,
      body: data ? JSON.stringify(data) : undefined,
      headers: Object.assign({}, this.headers, {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        csrf: parseInt(this.cookies.csrf, 10),
      }, headers),
    }).then((res) => JSON.parse(res));
  }
}

class Echo {

  constructor(device, alexa) {
    this.info = device;
    this.alexa = alexa;
    this.helper = alexa.helper;
  }

  toJSON() {
    return this.info;
  }

  toString() {
    return this.info.accountName;
  }

  playerInfo() {
    return this.helper.get(`/api/np/player?deviceSerialNumber=${this.info.serialNumber}&deviceType=${this.info.deviceType}`, { cache: false })
    .then((res) => res.playerInfo)
  }

  queueInfo() {
    return this.helper.get(`/api/np/queue?deviceSerialNumber=${this.info.serialNumber}&deviceType=${this.info.deviceType}`, { cache: false })
    .then((res) => res.queueInfo)
  }

  command(data) {
    return this.helper.post(`/api/np/command?deviceSerialNumber=${this.info.serialNumber}&deviceType=${this.info.deviceType}`, data)
  }

  setVolumeLevel(volumeLevel) {
    const level = parseInt(`${volumeLevel}`, 10);
    if (level < 0 || level > 100) {
      throw new Error('VolumeLevel validation error');
    }
    return this.command({
      type: 'VolumeLevelCommand',
      volumeLevel: level,
      contentFocusClientId: 'Default'
    });
  }

  pause() {
    return this.command({
      type: 'PauseCommand',
      contentFocusClientId: null,
    });
  }

  play() {
    return this.command({
      type: 'PlayCommand',
      contentFocusClientId: null,
    });
  }

  next() {
    return this.command({
      type: 'NextCommand',
      contentFocusClientId: null,
    });
  }

  previous() {
    return this.command({
      type: 'PreviousCommand',
      contentFocusClientId: null,
    });
  }

  setShuffle(value) {
    return this.command({
      type: 'ShuffleCommand',
      shuffle: !!value,
      contentFocusClientId: null,
    });
  }

  setRepeat(value) {
    return this.command({
      type: 'RepeatCommand',
      repeat: !!value,
      contentFocusClientId: null,
    });
  }

  tuneinQueueAndPlay(station) {
    return this.alexa.serviceAccount('TUNE_IN').then((account) =>
      this.helper.post(`/api/tunein/queue-and-play?deviceSerialNumber=${this.info.serialNumber}&deviceType=${this.info.deviceType}&guideId=${station.id}&contentType=station&callSign=&mediaOwnerCustomerId=${account.customerId}`, { cache: false })
    )
  }

}

class Alexa {

  constructor(cookies) {
    this.helper = new ApiHelper(cookies);
  }

  devices() {
    return this.helper.get('/api/devices-v2/device')
    .then((res) => res.devices
      .filter((info) => info.capabilities.length)
      .map((info) => new Echo(info, this))
    )
  }

  accountDetails() {
    return this.helper.get('/api/music-account-details')
    .then((res) => res.accountDetails)
  }

  serviceAccount(service) {
    return this.accountDetails()
    .then((accountDetails) => accountDetails.find((a) => a.service === service))
    .then((service) => {
      if (!service.accounts || !service.accounts.length) {
        throw new Error('no account found');
      }
      return service.accounts[0];
    })
  }

  tuneInSearch(query) {
    return this.serviceAccount('TUNE_IN').then((account) =>
      this.helper.get(`/api/tunein/search?query=${query}&mediaOwnerCustomerId=${account.customerId}`, { cache: false })
    )
    .then((res) => res.browseList)
  }

}

module.exports = Alexa;
