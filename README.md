# Homebridge plugin for Panasonic TV's.
A Homebridge plugin for Panasonic Viera TV's. Written to support the new Homekit TV accessory.

✅ Power on/off

✅ HomeKit TV Accessory (none of that light switch business)

✅ Input switching

## Minimum Requirements
  1. iOS 12.2
  2. Homebridge v0.4.46
  
## Installation
  1. Install homebridge -> http://homebridge.io
  2. Install this plugin -> `sudo npm install -g homebridge-panasonic-viera-tv@1.1.0`
  3. Update your config.json file
      - When entering inputs, please enter all inputs in your input selection menu

## Sample Config
  ``` JSON
  "accessories": [
      {
          "accessory": "Panasonic-TV",
          "name": "YOUR_TV_NAME_HERE",
          "ipaddress": "YOUR_TV_IP_ADDRESS_HERE",
          "inputs": [
              {
                  "name" : "INPUT NAME HERE",
                  "number": X,
                  "type" : "HDMI/TV/AV"
              }
          ]
      }
  ]
  ```
