# Homebridge plugin for Panasonic TV's.
A Homebridge plugin for Panasonic Viera TV's. Written to support the new Homekit TV accessory.

✅ Power on/off

✅ HomeKit TV Accessory (none of that light switch business)

✅ Input switching (Currently has a preset list of inputs. You will be able to configure yourself soon.)

## Requirements
  1. iOS 12.2 or later
  2. Homebridge v0.4.46 or later
  
## Installation
  1. Install homebridge -> http://homebridge.io
  2. Install this plugin -> `sudo npm install -g homebridge-panasonic-viera-tv@3.0.0`
  3. Update your config.json file

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
