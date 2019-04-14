var PanasonicCommands = require('viera.js');
var upnpSub = require('node-upnp-subscription');
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-panasonic", "Panasonic-TV", PanasonicTV);
};

// TV Inputs
var inputs = [];

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
};

// Configure TV
function PanasonicTV(log, config) {
    this.log = log;
    this.config = config;
    this.name = config['name'];
    this.HOST = config['ipaddress'];
    this.inputs = config['inputs'];
    this.configuredInputs = [];

    this.log(config['inputs']);
};

PanasonicTV.prototype.getServices = function() {
    // Configure HomeKit TV Device Information
    this.deviceInformation = new Service.AccessoryInformation();
    this.deviceInformation
        .setCharacteristic(Characteristic.Manufacturer, "Panasonic")
        .setCharacteristic(Characteristic.Model, "Viera")
        .setCharacteristic(Characteristic.SerialNumber, "Unavailable");
        
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
    this.inputs.forEach(input => {
        this.log("Adding " + input.name);
        this.log(input);
        var newInput = createInputSource(input.name, input.number, input.type);

        this.configuredInputs.push(newInput);
    });
    
    this.tvService.setCharacteristic(Characteristic.ActiveIdentifier, 1)
    this.tvService.getCharacteristic(Characteristic.ActiveIdentifier)
        .on("set", this.setInput.bind(this, inputs));


    this.tv = new PanasonicCommands(this.HOST);

    return [this.deviceInformation, this.tvService] + this.configuredInputs;
}

// TV Remote Control
PanasonicTV.prototype.sendRemoteControlKey = function(remoteControlMap, selected, callback) {
    let buttonSelected = remoteControlMap[selected];
    this.log("Selected " + buttonSelected);
    this.tv.sendCommand(buttonSelected);
    callback(null);
}

// TV Inputs
function createInputSource(name, number, type) {
    var input = new Service.InputSource(name.replace(' ', '_').toLowerCase(), name);
    input
      .setCharacteristic(Characteristic.Identifier, number)
      .setCharacteristic(Characteristic.ConfiguredName, name)
      .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(Characteristic.InputSourceType, determineInputType(type));
    return input;
}

function determineInputType(type) {
    switch (type) {
        case "HDMI":
            return Characteristic.InputSourceType.HDMI
        case "TV":
            return Characteristic.InputSourceType.TUNER
        case "AV":
            return Characteristic.InputSourceType.COMPONENT_VIDEO
        default:
            return Characteristic.InputSourceType.OTHER
    };
}

PanasonicTV.prototype.setInput = function(inputList, desiredInput, callback)  {
    var newInput = inputList[desiredInput];

    this.log("Switching input to " + newInput.name);
    
    if (newInput.type == "HDMI") {
        let hdmiNumber = newInput.name.substr(-1);
        this.sendCommand("HDMI" + parseInt(hdmiNumber - 1));

        callback(null, newInput.name);
    } else {
        this.sendCommand(newInput.name);

        callback(null, newInput.name);
    }
}

// TV Power
PanasonicTV.prototype.getOn = function(callback) {
    var powerStateSubscription = new upnpSub(this.HOST, 55000, '/nrc/event_0');
    powerStateSubscription.on('message', message => {
        let screenState = message.body['e:propertyset']['e:property'][2]['X_ScreenState'];
        this.log("TV is " + screenState);

        if (screenState == 'on') {
            callback(null, true);
        } else {
            callback(null, false);
        }
    });
    powerStateSubscription.on('error', () => {
        this.log('Couldn\'t subscribe. Please check your TV\'s network connection.');
        callback(null, false);
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
