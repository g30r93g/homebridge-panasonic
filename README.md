# Homebridge plugin for Panasonic TV's

[![PyPI license](https://img.shields.io/pypi/l/ansicolortags.svg)](https://pypi.python.org/pypi/ansicolortags/)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/313c17eb1c1145f085e7ecc1ce1c993e)](https://app.codacy.com/app/g30r93g/homebridge-panasonic?utm_source=github.com&utm_medium=referral&utm_content=g30r93g/homebridge-panasonic&utm_campaign=Badge_Grade_Dashboard)

A Homebridge plugin for Panasonic Viera TV's. Written to support the new Homekit TV accessory.

✅ Power on/off

✅ HomeKit TV Accessory (none of that light switch business)

✅ Input switching (Currently has a preset list of inputs. You will be able to configure yourself soon.)

## Requirements

1.  iOS 12.2 or later
2.  Homebridge v0.4.46 or later

## TV Setup
Go to Menu -> Network -> TV Remote App Settings and make sure the following settings are on:
*  TV Remote
*  Powered On by Apps
*  Networked Standby

It is possible that the TV may not support power on by standby. To check this, install Panasonic's mobile app and try turning the TV on and off.

## Installation

1.  Install homebridge -> <http://homebridge.io>
2.  Install this plugin -> `sudo npm install -g homebridge-panasonic-viera-tv@6.0.1`
3.  Update your config.json file

## Sample Config

Please configure the `inputs` section according to your input switching list and ensure that when using an application that the `appID` is included.

``` JSON
"accessories": [
    {
        "accessory": "Panasonic-TV",
        "name": "YOUR_TV_NAME_HERE",
        "ipaddress": "YOUR_TV_IP_ADDRESS_HERE",
        "inputs": [
            {"id": "TV", "name": "TV", "type": "TV"},
            {"id" : "HDMI 1", "name": "Apple TV", "type": "HDMI"},
            {"id" : "HDMI 2", "name": "Fire TV Stick", "type": "HDMI"},
            {"id" : "Netflix", "name": "Netflix", "type": "APPLICATION", "appID": "0010000200000001"}
        ]
    }
]
```

## App List

This is a partial list of apps that are on Viera TV's. Make sure that if you're adding an app that it exists.
I will update this list, though if you know any more, I'd appreciate you sending me these in an issue.

* Netflix: `0010000200000001`
* YouTube: `0070000200170001`
* Amazon Prime Video: `0010000100170001`
* BBC iPlayer: `0020000A00170010`
* ITV Hub: `0387878700000124`
* All 4: `0387878700000125`
* Plex: `0076010507000001`
* Rakuten TV: `0020002A00000001`
* Calendar: `0387878700150020`
* Browser: `0077777700160002`
