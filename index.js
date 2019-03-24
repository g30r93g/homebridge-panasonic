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

    let getRequest = {
        host: self.ipAddress,
        port: 55000,
        timeout: 1000,
        method: "GET",
        path: "/nrc/control_0"
    };

    var timedOut = false;
    let request = http.request(getRequest, result => {
        self.log("Getting power status...");

        result.setEncoding('utf8');

        result.on('data', data => {
            self.log("Response recieved: " + data);
        });
        result.on('end', () => {
            self.log("Responded, TV is on.");
            callback(null, true);
        });
    });

    request.on('timeout', () => {
        self.log("Did not respond. TV is off.");
        request.abort();
        timedOut = true;
    });

    request.on('error', error => {
        if (!timedOut) {
            callback(null, false);
        } else {
            callback(error, false);
        }
    });

    request.end();
}

// If response recieved, TV goes from off to on
// If request times out, TV goes from on to off
PanasonicTV.prototype.setOn = function(isOn, callback) {
    var self = this;
    
    if (isOn) {
        self.log("TV does not support power on/off.");
        callback(null, false);
        return;
    }

    let url = "/nrc/control_0"
    let body = "<?xml version='1.0' encoding='utf-8'?> " +
    "<s:Envelope xmlns:s='http://schemas.xmlsoap.org/soap/envelope/' s:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'> " +
    " <s:Body> " +
    "   <u:X_SendKey xmlns:u='urn:panasonic-com:service:p00NetworkControl:1'> " +
    "     <X_KeyEvent>NRC_POWER-ONOFF</X_KeyEvent> " +
    "   </u:X_SendKey> " +
    " </s:Body> " +
    "</s:Envelope>" +
    "";
    let postRequest = {
        host: self.ipAddress,
        path: url,
        port: 55000,
        timeout: 2000,
        method: "POST",
        headers: {
            "Content-Length": body.count,
            "Content-Type": 'text/xml; charset="utf-8"',
            SOAPACTION: '"urn:panasonic-com:servicee:p00NetworkControl:1#X_SendKey"',
            Accept: "text/xml"
        }
    };

    var timedOut = false;
    let request = http.request(postRequest, response => {
        self.log("Toggling power switch on TV");

        response.setEncoding("utf8");

        response.on("data", data => {
            self.log("Response recieved.");
        });
        response.on("end", () => {
            self.log("  TV is now on.")
            callback()
        });
    });

    request.on('timeout', () => {
        self.log("TV did not respond.\n  TV is now off.");
        request.abort();
        timedOut = true;
    });

    request.on('error', error => {
        if (!timedOut) {
            callback(null, false);
        } else {
            callback(error, false);
        }
    });

    request.write(body);
    request.end();
}
