# Homebridge plugin for Panasonic TV's

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

It is possible that the TV may not support power on by standby. To check this, install Panasonic's mobile app and try turning the TV on when it's off.

## Installation

1.  Install homebridge -> <http://homebridge.io>
2.  Install this plugin -> `sudo npm install -g homebridge-panasonic-viera-tv@4.4.0`
3.  Update your config.json file

## Sample Config

``` JSON
"accessories": [
    {
        "accessory": "Panasonic-TV",
        "name": "YOUR_TV_NAME_HERE",
        "ipaddress": "YOUR_TV_IP_ADDRESS_HERE"
    }
]
```
