// Created by George Nick Gorzynski (@g30r93g)
// 

var PanasonicCommands = require("viera.js-g30r93g");
var UpnpSub = require("node-upnp-subscription");
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

        if (!config["serialNumber"]) {
            this.serialNumber = "Unavailable"
        } else {
            this.serialNumber = config["serialNumber"]
        }

        if (!config["model"]) {
            this.model = "Viera"
        } else {
            this.model = config["model"]
        }
        this.log(`Configured Panasonic TV named ${this.name} with IP ${this.HOST}.`)
        this.log(`Serial Number: ${this.serialNumber}`)
        this.log(`Model: ${this.model}`)
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

    // Configure TV Information
    this.deviceInformation = new Service.AccessoryInformation();
    this.deviceInformation
        .setCharacteristic(Characteristic.Manufacturer, "Panasonic")
        .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
        .setCharacteristic(Characteristic.Model, this.model);

    // Configure TV Accessory
    this.tvService = new Service.Television(this.name, "Television");
    this.tvService
        .setCharacteristic(Characteristic.ConfiguredName, this.name)
        .setCharacteristic(Characteristic.SleepDiscoveryMode, 1);

    this.tvService.getCharacteristic(Characteristic.Active)
        .on("get", this.getOn.bind(this))
        .on("set", this.setOn.bind(this));

    // Configure Remote Control
    this.tvService
        .getCharacteristic(Characteristic.RemoteKey)
        .on("set", this.remoteControl.bind(this));

    // Configure Volume Control
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

    // Configure TV Inputs
    this.tvService.getCharacteristic(Characteristic.ActiveIdentifier)
        .on("set", this.setInput.bind(this, this.inputs));

    var configuredInputs = this.setupInputs();
    configuredInputs.forEach((input) => {
        this.tvService.addLinkedService(input);
        services.push(input);
    });

    services.push(this.tvService, this.deviceInformation);

    this.log("HomeKit Setup Complete.");
    return services;
};

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
        this.log("Adding input " + counter + ": Name: " + name + ", Type: " + input.type);

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

PanasonicTV.prototype.setInput = function(inputList, desiredInput, callback) {
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
        
        // Ensure properties is an array, otherwise it causes `properties.filter is not a function`
        if not properties.isArray() {
            callback(null, false)
        }
        
        let matchingProperties = properties.filter(property => property.X_ScreenState === "on" || property.X_ScreenState === "off")
        
        if (matchingProperties != []) {
            let screenState = matchingProperties[0].X_ScreenState

            this.log(`X_ScreenState: ${screenState}`)
            callback(null, (screenState === "on"));
        } else {
            // TODO: Set TV as 'Not Responding'
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
