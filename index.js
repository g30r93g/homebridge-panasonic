var PanasonicAPI = require('./panasonicviera');
var http = require('http');
var Service, Characteristic, VolumeCharacteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
  
    homebridge.registerAccessory("homebridge-panasonic", "TV", PanasonicTV);
};

// Inputs
const inputList = {
    1: "TV",
    2: "HDMI 1",
    3: "HDMI 2",
};

// Configure TV
function PanasonicTV(log, config) {
    this.log = log;
    this.name = config.name;
    this.ipAddress = config.ip;
    
    this.enabledServices = [];
    this.isOn = false;

    // Configure TV Control
    this.tv = new PanasonicAPI(this.ipAddress);
    
    // Configure HomeKit TV
    this.tvServies = new Service.Television(this.name, "Television");
    this.tvService.setCharacteristic(
        Characteristic.SleepDiscoveryMode,
        Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
    );
  
    // Configure TV Power
    this.tvService
        .getCharacteristic(Characteristic.Active)
        .on("set", this.setPowerState.bind(this))
        .on("get", this.getPowerState.bind(this));
  
    this.tvService
        .setCharacteristic(Characteristic.ActiveIdentifier, 1);
    
    // Configure TV Inputs
    this.tvService
        .getCharacteristic(Characteristic.ActiveIdentifier)
        .on("set", this.setInput.bind(this, inputList));

    
    this.inputTV = createInputSource("TV", "TV", 1);
    this.inputHDMI1 = createInputSource("HDMI 1", "HDMI 1", 2);
    this.inputHDMI2 = createInputSource("HDMI 2", "HDMI 2", 3);
  
    this.tvService.addLinkedService(this.inputTV);
    this.tvService.addLinkedService(this.inputHDMI1);
    this.tvService.addLinkedService(this.inputHDMI2);
  
    // Configure TV Volume
    this.speakerService = new Service.TelevisionSpeaker(
    this.name + " Volume",
        "volumeService"
    );
  
    this.speakerService.setCharacteristic(
        Characteristic.Active, 
        Characteristic.Active.ACTIVE
    ).setCharacteristic(
      Characteristic.VolumeControlType,
      Characteristic.VolumeControlType.ABSOLUTE
    );
  
    this.tvService.addLinkedService(this.speakerService);
  
    this.enabledServices.push(this.tvService);
    this.enabledServices.push(this.speakerService);
    this.enabledServices.push(this.inputTV);
    this.enabledServices.push(this.inputHDMI1);
    this.enabledServices.push(this.inputHDMI2);
};

// TV Power
PanasonicTV.prototype.getOn = function(callback) {
    var self = this;
    self.getOnCallback = callback;
    
    this.determinePowerState(this.ipAddress, function(state) {
        self.getOnCallback(null, state == 1);
    });
}

PanasonicTV.prototype.setOn = function(isOn, callback) {
    var self = this;
    self.setOnCallback = callback;
    
    this.determinePowerState(this.ipAddress, function(state) {
        if (state == -1 && isOn) {
            self.tv.send(PanasonicAPI.POWER_TOGGLE);
            self.setOnCallback(null, true);
            console.log("TV is turning off...");
        } else if (state == 0 && isOn) {
            self.setOnCallback(new Error("TV is off and can't be woken."));
        }  else if (state == 1 && !isOn) {
            self.tv.send(PanasonicAPI.POWER_TOGGLE);
            self.setOnCallback(null, false);
            console.log("TV is turning on...")
        } else {
            self.setOnCallback(new Error("Cannot turn TV " + (on ? "ON" : "OFF") + ". We are being told that it is " + state));
        }
    });
}

// Return cases
// -1: TV is in standby (HTTP Response Code 400 - Bad Request)
// 0: TV is off or does not support standby wake-up
// 1: TV is on (HTTP Response Code 200)
PanasonicTV.prototype.determinePowerState = function(ipAddress, callback) {
    var path = "/dmr/control_0";
    var body = '<?xml version="1.0" encoding="utf-8"?>\n' +
               '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\n' +
               ' <s:Body>\n' +
               '  <u:getVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">\n' +
               '   <InstanceID>0</InstanceID><Channel>Master</Channel>\n' +
               '  </u:getVolume>\n' +
               ' </s:Body>\n' +
               '</s:Envelope>\n';
    var postOptions = {
        host: ipAddress,
        port: '55000',
        path: path,
        method: 'POST',
        timeout: 2000,
        headers: {
            'Content-Length': body.length,
            'Content-Type': 'text/xml; charset="utf-8"',
            'User-Agent': 'net.thlabs.nodecontrol',
            'SOAPACTION': '"urn:schemas-upnp-org:service:RenderingControl:1#getVolume"'
        }
    };

    // Prepare to get power state
    var callbackHasPerformed = false;
    var request = http.request(postOptions, function(result) {
        result.setEncoding('utf8');
        result.on('data', function(data) {}); // Required for end event to be called
        result.on('end', function() {
            if (result.statusCode == 200 && !callbackHasPerformed) {
                callback(1);
            } else if (!callbackHasPerformed) {
                callback(-1);
            }
        });
    });

    // Handle Error
    request.on('error', function(error) {
        console.log(error);
        if (!callbackHasPerformed) {
            callback(0);
            callbackHasPerformed = true;
        } else {
            console.log ("already called callback");
        }
    });

    // Handle Timeout
    request.on('timeout', function() {
        console.log('timed out');
        if (!callbackHasPerformed) {
            callback(0);
            callbackHasPerformed = true;
        }
        else {
          console.log ("already called callback");
        }
      });

    request.write(body);
    request.end();
}
