var PanasonicCommands = require('viera.js');
var upnpSub = require('node-upnp-subscription');
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

// TV Remote Control
const remoteControl = {
    1: "up",
    2: "down",
    3: "left",
    4: "right",
    5: "enter",
    6: "home", 
    7: "play",
    8: "pause"
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
        .setCharacteristic(Characteristic.Model, "Viera")

    // Configure HomeKit TV Accessory
    this.tvService = new Service.Television(this.name, "Television");
    this.tvService.setCharacteristic(Characteristic.ConfiguredName, this.name);
    this.tvService.setCharacteristic(Characteristic.SleepDiscoveryMode, 1);
  
    this.tvService.getCharacteristic(Characteristic.Active)
        .on("get", this.getOn.bind(this))
        .on("set", this.setOn.bind(this));

    // Configure HomeKit TV Accessory Remote Control
    this.tvService
        .getCharacteristic(Characteristic.RemoteKey)
        .on("set", this.sendRemoteControlKey.bind(this, remoteControl));
    
    // Configure HomeKit TV Accessory Inputs
    this.tvService.setCharacteristic(Characteristic.ActiveIdentifier, 2)
    this.tvService.getCharacteristic(Characteristic.ActiveIdentifier)
        .on("set", this.setInput.bind(this, inputs));

    this.inputTV = createInputSource("tv", "TV", 1, Characteristic.InputSourceType.TUNER);
    this.inputHDMI1 = createInputSource("hdmi1", "HDMI 1", 2, Characteristic.InputSourceType.HDMI);
    this.inputHDMI2 = createInputSource("hdmi2", "HDMI 2", 3, Characteristic.InputSourceType.HDMI);
    this.tvService.addLinkedService(this.inputTV);
    this.tvService.addLinkedService(this.inputHDMI1);
    this.tvService.addLinkedService(this.inputHDMI2);

    // Configure Panasonic TV Commands
    this.tv = new PanasonicCommands(this.HOST);

    // return [this.deviceInformation, this.tvService];
    return [this.deviceInformation, this.tvService, this.inputTV, this.inputHDMI1, this.inputHDMI2];
}

// TV Remote Control
PanasonicTV.prototype.sendRemoteControlKey = function(remoteControlMap, selected, callback) {
    let buttonSelected = remoteControlMap[selected];
    this.log("Selected " + buttonSelected);
    this.tv.sendCommand(buttonSelected);
    callback(null);
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
    let switchingTo = inputList[desiredInput];
    this.log("Switching input to " + switchingTo);
    if (desiredInput == 1) {
        this.tv.sendCommand("TV");
        callback(null, desiredInput);
    } else if (desiredInput == 2 || desiredInput == 3) {
        // this.tv.sendHDMICommand("HDMI" + desiredInput);
        callback(null, desiredInput);
    } else {
        callback(null, desiredInput);
    }
}

// TV Power
PanasonicTV.prototype.getOn = function(callback) {
    var powerStateSubscription = new upnpSub(this.HOST, 55000, '/nrc/event_0');
    // powerStateSubscription.on('message', console.log);
    powerStateSubscription.on('message', message => {
        let screenState = message.body['e:propertyset']['e:property'][2]['X_ScreenState'];
        console.log(screenState);

        if (screenState == 'on') {
            callback(null, true)
        } else {
            callback(null, false)
        }
    });
    powerStateSubscription.on('error', () => {
        console.log('Couldn\'t subscribe. :(');
        callback(null, false)
    });

    setTimeout(powerStateSubscription.unsubscribe, 1200);
}

PanasonicTV.prototype.setOn = function(isTurningOn, callback) {
    if (isTurningOn) {
        this.log("Attempting power on...");
        this.tv.sendCommand("POWER");
        callback(null, !isTurningOn);
    } else {
        this.log("Attempting power off...");
        this.tv.sendCommand("POWER");
        callback(null, !isTurningOn);
    }
}
