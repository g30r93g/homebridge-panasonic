var PanasonicAPI = require('panasonic-viera-control/panasonicviera.js');
var http = require('http');
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
  
    homebridge.registerAccessory("homebridge-panasonic", "Panasonic-TV", PanasonicTV);
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
    this.HOST = config.ip;
};

PanasonicTV.prototype.getServices = function() {
    // Configure HomeKit TV Device Information
    this.deviceInformation = new Service.AccessoryInformation();
    this.deviceInformation
        .setCharacteristic(Characteristic.Manufacturer, "Panasonic")
        .setCharacteristic(Characteristic.Model, "Unknown")
        .setCharacteristic(Characteristic.SerialNumber, "Unknown");

    // Configure HomeKit TV Accessory
    this.tvService = new Service.Television(this.name, "Television");
    this.tvService.setCharacteristic(Characteristic.ConfiguredName, this.name);
    this.tvService.setCharacteristic(Characteristic.SleepDiscoveryMode, 1);
  
    this.tvService.getCharacteristic(Characteristic.Active)
        .on("set", this.setOn.bind(this))
        .on("get", this.getOn.bind(this));
    this.tvService.setCharacteristic(Characteristic.ActiveIdentifier, 1);

    return [this.deviceInformation, this.tvService];
}

// TV Power
PanasonicTV.prototype.getOn = function(callback) {
    var self = this;

    let getRequest = {
        host: self.HOST,
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
        host: self.HOST,
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
