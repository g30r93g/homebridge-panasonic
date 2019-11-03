// Created by George Nick Gorzynski (@g30r93g)
//

var PanasonicCommands = require("viera.js");
var UpnpSub = require("node-upnp-subscription");
var http = require('http');
var Service, Characteristic;

// Configure TV
function PanasonicTV(log, config) {
    this.log = log;
    if (config) {
        this.config = config;
        this.name = config["name"];
        this.HOST = config["ipaddress"];
    
        if (!config["inputs"]) {
            this.inputs = [];
        } else {
            this.inputs = config["inputs"];
        }
    } else {
        this.log("No configuration found. Please add configuration in config.json");
        return;
    }
}

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-panasonic", "Panasonic-TV", PanasonicTV);
};

PanasonicTV.prototype.getServices = function() {
    var services = [];
    this.tv = new PanasonicCommands(this.HOST);

    // Configure HomeKit TV Device Information
    this.deviceInformation = new Service.AccessoryInformation();

    this.deviceInformation
        .setCharacteristic(Characteristic.Manufacturer, "Panasonic")
        .setCharacteristic(Characteristic.SerialNumber, "Unknown")
        .setCharacteristic(Characteristic.Model, "Viera");

    // Currently Doesn't work :(
    //
    // this.getInformation((response) => {
    //     let data = response["root"]
    //     this.log(data)

    //     let serialNumber = data["device"]["UDN"].slice(5);
    //     let model = data["device"]["modelNumber"];

    //     this.log("Serial Number: " + serialNumber);
    //     this.log("Model Number: " + model);

    //     this.deviceInformation
    //         .getCharacteristic(Characteristic.SerialNumber).updateValue(serialNumber)
    //         .getCharacteristic(Characteristic.Model).updateValue(model);
    // });

    // Configure HomeKit TV Accessory
    this.tvService = new Service.Television(this.name, "Television");
    this.tvService
        .setCharacteristic(Characteristic.ConfiguredName, this.name)
        .setCharacteristic(Characteristic.SleepDiscoveryMode, 1);
    
    this.tvService.getCharacteristic(Characteristic.Active)
        .on("get", this.getOn.bind(this))
        .on("set", this.setOn.bind(this));
    
    // Configure HomeKit TV Accessory Remote Control
    this.tvService
        .getCharacteristic(Characteristic.RemoteKey)
        .on("set", this.remoteControl.bind(this));
    
    // Configure HomeKit TV Volume Control
    this.speakerService = new Service.TelevisionSpeaker(this.name + " Volume", "volumeService");

    this.speakerService
        .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
        .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);
    
    this.speakerService
        .getCharacteristic(Characteristic.VolumeSelector)
        .on("set", (newValue, callback) => {
            this.tv.setVolume(newValue);
            callback(null, newValue);
        });

    this.speakerService
        .getCharacteristic(Characteristic.Mute)
        .on("get", this.getMute.bind(this))
        .on("set", this.setMute.bind(this));

    this.speakerService
        .addCharacteristic(Characteristic.Volume)
        .on("get", this.getVolume.bind(this))
        .on("set", this.setVolume.bind(this));

    this.tvService.addLinkedService(this.speakerService);
    
    // Configure HomeKit TV Accessory Inputs
    this.tvService.getCharacteristic(Characteristic.ActiveIdentifier)
        .on("set", this.setInput.bind(this, this.inputs));

    var configuredInputs = this.setupInputs();
    configuredInputs.forEach((input) => {
        this.tvService.addLinkedService(input);
        services.push(input);
    });

    services.push(this.deviceInformation, this.tvService, this.speakerService);

    this.log("Initialization complete.");
    return services;
};

// TV Information
// PanasonicTV.prototype.getInformation = function(callback) {
//     var self = this;
//     self.infoCallback = callback;
    
//     var getRequest = {
//         host: this.HOST,
//         port: 55000,
//         path: "/nrc/ddd.xml",
//         method: "GET",
//         headers: {
//             "User-Agent": "Panasonic iOS VR-CP UPnP/2.0",
//             'Content-Type': 'text/xml; charset="utf-8"'
//         }
//     }

//     var request = http.request(getRequest, function(result) {
//         result.setEncoding('utf8');
//         result.on('data', self.infoCallback(result));
//     });

//     request.on('error', function(error) {
//         console.log('error: ' + error.message);
//         console.log(error);
//     });

//     request.end();
// };

// TV Speaker
PanasonicTV.prototype.getMute = function(callback) {
    this.tv.getMute((status) => {
        this.log("Mute status: " + status);
        callback(null, status);
    });
};

PanasonicTV.prototype.setMute = function(value, callback) {
    this.tv.setMute(!value);
    callback(null, !value);
};

PanasonicTV.prototype.getVolume = function(callback) {
    this.tv.getVolume((volume) => { 
        this.log("Volume status: " + volume);
        callback(null, volume);
    });
};

PanasonicTV.prototype.setVolume = function(value, callback) {
    this.tv.setVolume(value);
    callback(null, value);
};

// TV Remote Control
PanasonicTV.prototype.remoteControl = function(action, callback) {
    this.log("Remote Control Action: " + action);

    switch (action) {
        case 0: // Rewind
            this.tv.sendCommand("REW");
            break;
        case 1: // Fast Forward
            this.tv.sendCommand("FF");
            break;
        case 2: // Next Track
            this.tv.sendCommand("SKIP_NEXT");
            break;
        case 3: // Previous Track
            this.tv.sendCommand("SKIP_PREV");
            break;
        case 4: // Up Arrow
            this.tv.sendCommand("UP");
            break;
        case 5: // Down Arrow
            this.tv.sendCommand("DOWN");
            break;
        case 6: // Left Arrow
            this.tv.sendCommand("LEFT");
            break;
        case 7: // Right Arrow
            this.tv.sendCommand("RIGHT");
            break;
        case 8: // Select
            this.tv.sendCommand("ENTER");
            break;
        case 9: // Back
            this.tv.sendCommand("RETURN");
            break;
        case 10: // Exit
            this.tv.sendCommand("CANCEL");
            break;
        case 11: // Play / Pause
            this.tv.sendCommand("PLAY");
            break;
        case 15: // Information
            this.tv.sendCommand("HOME");
            break;
    }

    callback(null, action);
};

// TV Inputs
PanasonicTV.prototype.setupInputs = function() {
    var configuredInputs = [];
    var counter = 1;

    this.inputs.forEach((input) => {
        let id = input.id;
        let name = input.name;
        let type = this.determineInputType(input.type);
        this.log("Adding Input " + counter + ": Name: " + name + ", Type: " + input.type);

        configuredInputs.push(this.createInputSource(id, name, counter, type));
        counter = counter + 1;
    });

    return configuredInputs;
};

PanasonicTV.prototype.createInputSource = function(id, name, number, type) {
    var input = new Service.InputSource(id.toLowerCase().replace(" ", ""), name);
    input
        .setCharacteristic(Characteristic.Identifier, number)
        .setCharacteristic(Characteristic.ConfiguredName, name)
        .setCharacteristic(Characteristic.InputSourceType, type)
        .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED);

    return input;
};

PanasonicTV.prototype.determineInputType = function(type) {
    switch (type) {
        case "TV":
            return Characteristic.InputSourceType.TUNER;
        case "HDMI":
            return Characteristic.InputSourceType.HDMI;
        case "APPLICATION":
            return Characteristic.InputSourceType.APPLICATION;
        default:
            return Characteristic.InputSourceType.OTHER;
    }
};

PanasonicTV.prototype.setInput = function(inputList, desiredInput, callback)  {
    let input = inputList[desiredInput - 1];

    if (input.type === "APPLICATION") {
        this.tv.sendRequest("command", "X_LaunchApp", "<X_AppType>vc_app</X_AppType><X_LaunchKeyword>product_id=" + input.appID + "</X_LaunchKeyword>");
        this.log("Opening " + input.name + " app");
    } else if (input.type === "TV") {
        this.tv.sendCommand("AD_CHANGE");
        this.log("Switching to TV");
    } else {
        this.tv.sendCommand(input.id.toLowerCase().replace(" ", ""));
        this.log("Switching to " + input.name);
    }

    callback(null, input);
};

// TV Power
PanasonicTV.prototype.getOn = function(callback) {
    var powerStateSubscription = new UpnpSub(this.HOST, 55000, "/nrc/event_0");

    powerStateSubscription.on("message", (message) => {
        let properties = message.body["e:propertyset"]["e:property"];
        let screenState = properties.find((property) => property.X_ScreenState)["X_ScreenState"];

        if (screenState === "none" || screenState === null || screenState === undefined) {
            this.log("Couldn\'t check power state.");
            this.log("Your TV may not be correctly set up or it may be incapable of performing power on from standby.");

            if (screenState === "none") {
                callback(null, true);
            } else {
                callback(null, false);
            }
        } else if (screenState === "on") {
            this.log("TV is on.");
            callback(null, true);
        } else {
            this.log("TV is off.");
            callback(null, false);
        }
    });

    powerStateSubscription.on("error", () => {
        this.log("Couldn\'t check power state. Please check your TV\'s network connection.");
        this.log("Alternatively, your TV may not be correctly set up or it may not be able to perform power on from standby.");
        callback(null, false);
    });

    setTimeout(powerStateSubscription.unsubscribe, 1200);
};

PanasonicTV.prototype.setOn = function(turnOn, callback) {
    if (turnOn) {
        this.log("Powering TV on...");
        this.tv.sendCommand("POWER");
        callback(null, !turnOn);
    } else {
        this.log("Powering TV off...");
        this.tv.sendCommand("POWER");
        callback(null, !turnOn);
    }
};
