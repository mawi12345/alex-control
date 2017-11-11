# alex-control

[![npm version](https://img.shields.io/npm/v/alex-control.svg?style=flat)](https://www.npmjs.com/package/alex-control)

A command line util to control alex playback.

#### Warning

This tool uses the not documented API used by the alex web app.
To use this API a session cookie is required. For now the only way to get the cookie is to login to https://alexa.amazon.com and
copy the value of the `Cookie` header of any request into the file `~/.alexa-cookie` (see [issue](https://github.com/mawi12345/alex-control/issues/1) for more information).

#### Help

    Usage: alexa-control [options] <action> [args...]

    Options:

      -V, --version        output the version number
      -d, --device <name>  select a echo device
      -c, --cookie <file>  alexa web cookie file
      -h, --help           output usage information

    Actions:

      list             list all echo devices
      info             prints info of echo devices
      play             resume playback
      pause            pause playback
      next             play next title
      previous         play previous title
      volume [level]   set volume level [0-100]
      tunein [name]    plays tunein station
