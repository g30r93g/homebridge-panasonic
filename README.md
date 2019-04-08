# Homebridge plugin for Panasonic TV's.
A Homebridge plugin for Panasonic Viera TV's. Written to support the new Homekit TV accessory.

✅ Power on/off
✅ TV Accessory (none of that light switch business)
❌ Input switching (coming soon though so watch the space!)
❌ Remote Control (will hopefully come soon, maybe one of you can submit a PR 😉)

## Minimum Requirements
  1. iOS 12.2
  2. Homebridge v0.4.46
  
## Installation
  1. Install homebridge -> http://homebridge.io
  2. Install this plugin: `sudo npm install -g homebridge-panasonic-viera-tv`
  3. Change your config.json file

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
