# Homebridge plugin for Panasonic TV's.
A Homebridge plugin for Panasonic Viera TV's. Written to support the new Homekit TV accessory.

✅ Power on/off

✅ HomeKit TV Accessory (none of that light switch business)

✅ Input switching (Currently has a preset list of inputs. You will be able to configure yourself soon.)

## Requirements
  1. iOS 12.2 or later
  2. Homebridge v0.4.46 or later
  
## TV Configuration
For this plugin to work, there are a few settings your TV must have set to 'On':
  1. TV Remote
  2. Powered On by Apps
  3. Networked Standby
Please note that not all Panasonic TV's are created equally and may not support power on from standby.
  
## Installation
  1. Install homebridge -> http://homebridge.io
  2. Install this plugin -> `sudo npm install -g homebridge-panasonic-viera-tv@4.1.0`
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
