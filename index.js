var PanasonicCommands = require('viera.js');
var http = require('http');
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-panasonic", "Panasonic-TV", PanasonicTV);
};

// TV Inputs
const inputs = {
    1: "TV",
    2: "HDMI 1",
    3: "HDMI 2"
}

// Configure TV
function PanasonicTV(log, config) {
    this.log = log;
    this.config = config;
    this.name = config["name"];
    this.HOST = config["ipaddress"];
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
        .on("get", this.getOn.bind(this))
        .on("set", this.setOn.bind(this));

    // Configure Panasonic TV Commands
    this.tv = new PanasonicCommands(this.HOST);

    return [this.deviceInformation, this.tvService];
}

// TV Inputs
PanasonicTV.prototype.setInputs() = function() {
//    this.tvService.setCharacteristic(Characteristic.ActiveIdentifier, 1); // Sets the default input

    this.inputTV = new Service.InputSource("tv", "TV");
    this.inputTV
        .setCharacteristic(Characteristic.Identifier, 1)
        .setCharacteristic(Characteristic.ConfiguredName, "TV")
        .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.TUNER)
        .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState.SHOWN);

    this.inputHDMI1 = new Service.InputSource("hdmi1", "HDMI 1");
    this.inputHDMI1
        .setCharacteristic(Characteristic.Identifier, 2)
        .setCharacteristic(Characteristic.ConfiguredName, "HDMI 1")
        .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.HDMI)
        .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState.SHOWN);

    this.inputHDMI2 = new Service.InputSource("hdmi2", "HDMI 2");
    this.inputHDMI2
        .setCharacteristic(Characteristic.Identifier, 3)
        .setCharacteristic(Characteristic.ConfiguredName, "HDMI 2")
        .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.HDMI)
        .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState.SHOWN);

    this.tvService.addLinkedService(this.inputTV);
    this.tvService.addLinkedService(this.inputHDMI1);
    this.tvService.addLinkedService(this.inputHDMI2);

    this.enabledServices.push(this.inputTV);
    this.enabledServices.push(this.inputHDMI1);
    this.enabledServices.push(this.inputHDMI2);

    this.inputAppIds.push("tv")
    this.inputAppIds.push("hdmi1")
    this.inputAppIds.push("hdmi2")
}

// TV Power
PanasonicTV.prototype.getOn = function(callback) {
    let self = this;

    var path = "/nrc/control_0?";
    var body = '<?xml version="1.0" encoding="utf-8"?>\n' +
             '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\n' +
             ' <s:Body>\n' +
             '  <u:getVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">\n' +
             '   <InstanceID>0</InstanceID><Channel>Master</Channel>\n' +
             '  </u:getVolume>\n' +
             ' </s:Body>\n' +
             '</s:Envelope>\n';

    let getRequest = {
        host: self.HOST,
        port: 1900,
        path: path,
        timeout: 1000,
        method: "GET",
        headers: {
            'Content-Length': body.length,
            'Content-Type': 'text/xml; charset="utf-8"',
            'User-Agent': 'net.thlabs.nodecontrol',
            'SOAPACTION': '"urn:schemas-upnp-org:service:RenderingControl:1#getVolume"'
        }
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

PanasonicTV.prototype.setOn = function(isOn, callback) {
    let self = this;

    if (isOn) {
        self.log("Attempting power on...");
        self.tv.sendCommand("POWER");
        callback(null, !isOn);
    } else {
        self.log("Attempting power off...");
        self.tv.sendCommand("POWER");
        callback(null, !isOn);
    }
}
