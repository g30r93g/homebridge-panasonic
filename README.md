# Homebridge plugin for Panasonic TV's.
A Homebridge plugin for Panasonic Viera TV's. Written to support the new Homekit TV accessory.

🚧 This is a work in progress and still has a few issues. 🚧

## Minimum Requirements
  1. iOS 12.2
  2. Homebridge v0.4.46
  
## Installation
  1. Install homebridge -> http://homebridge.io
  2. Install this plugin: `sudo npm install -g homebridge-panasonic-viera-tv`
  3. Change your config.json file
  
  Note: You may also need to install viera.js: `sudo npm install -g viera.js`

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

## Known Issues
  1. Input list is empty. I'm trying to find a way to detect the number of HDMI inputs the TV has. The list will definitely contain: Aerial/Satellite TV, HDMI, AV
  2. The power value may be the opposite of the actual value.
