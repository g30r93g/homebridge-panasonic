var PanasonicCommands = require('viera.js');
var http = require('http');
var Service, Characteristic, VolumeCharacteristic;

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

const volumeButtons = {
    0: "VolumeUp",
    1: "VolumeDown"
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
    
    // Configure HomeKit TV Accessory Inputs
    this.tvService.setCharacteristic(Characteristic.ActiveIdentifier, 1)
    this.tvService.getCharacteristic(Characteristic.ActiveIdentifier)
        .on("set", this.setInput.bind(this, inputs));

    this.inputTV = createInputSource("tv", "TV", 1, Characteristic.InputSourceType.TUNER);
    this.inputHDMI1 = createInputSource("hdmi1", "HDMI 1", 2, Characteristic.InputSourceType.HDMI);
    this.inputHDMI2 = createInputSource("hdmi2", "HDMI 2", 3, Characteristic.InputSourceType.HDMI);
    this.tvService.addLinkedService(this.inputTV);
    this.tvService.addLinkedService(this.inputHDMI1);
    this.tvService.addLinkedService(this.inputHDMI2);

    // Configure HomeKit TV Accessory Volume
    this.speakerService = new Service.TelevisionSpeaker(this.name + " Volume", "volumeService");
    this.speakerService
        .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
        .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE)
        .getCharacteristic(Characteristic.VolumeSelector).on("set", this.setVolume.bind(this, volumeButtons))
        .getCharacteristic(Characteristic.VolumeSelector).on("get", this.getVolume.bind(this));
    this.speakerService.addLinkedService(this.speakerService);

    // Configure Panasonic TV Commands
    this.tv = new PanasonicCommands(this.HOST);

    return [this.deviceInformation, this.tvService, this.inputTV, this.inputHDMI1, this.inputHDMI2];
}

// TV Volume
PanasonicTV.prototype.setVolume = function(volume, newValue, callback) {
    let volumeInstruction = volume[newValue]
    if (volumeInstruction == 0) {
        console.log("Increasing TV Volume");
        this.tv.sendCommand(increaseVolume());
        callback(null);
    } else if (volumeInstruction == 1) {
        console.log("Decreasing TV Volume");
        this.tv.sendCommand(decreaseVolume());
        callback(null);
    }
}

PanasonicTV.prototype.getVolume = function(callback) {
    this.tv.getVolume(function(currentVolume) {
        console.log("Current TV Volume: " + currentVolume);
        callback(currentVolume);
    });
}

function increaseVolume() {
    let volume = this.getVolume();
    return volume + 1;
}

function decreaseVolume() {
    let volume = this.getVolume();
    return volume - 1;
}

// TV Inputs
function createInputSource(id, name, number, type) {
    var input = new Service.InputSource(id, name);
    input
      .setCharacteristic(Characteristic.Identifier, number)
      .setCharacteristic(Characteristic.ConfiguredName, name)
      .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(Characteristic.InputSourceType, type);
    return input;
}

PanasonicTV.prototype.setInput = function(inputList, desiredInput, callback)  {
    let switchingTo = inputList[desiredInput]
    console.log("Switching input to " + switchingTo);
    if (desiredInput == 1) {
        self.tv.sendCommand("TV");
        callback();
    } else if (desiredInput == 2 || desiredInput == 3) {
        self.tv.sendHDMICommand("HDMI" + desiredInput);
        callback();
    } else {
        callback(null);
    }
}

// TV Power
PanasonicTV.prototype.getOn = function(callback) {
    let self = this;

    var path = "/nrc/control_0?";
    var body = '<?xml version="1.0" encoding="utf-8"?>\n' +
             '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\n' +
             ' <s:Body>\n' +
             '  <u:getVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">\n' +
             '   <InstanceID>0</InstanceID>' + 
             '   <Channel>Master</Channel>\n' +
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
