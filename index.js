var PanasonicCommands = require("viera.js-g30r93g");
var upnpSub = require("node-upnp-subscription");
var http = require("http");
var Service, Characteristic;

const inputs = {
    1: "HDMI 1",
    2: "HDMI 2",
    3: "HDMI 3",
    4: "TV",
    5: "Netflix",
    6: "Prime Video",
    7: "Plex",
    8: "YouTube"
};

// Configure TV
function PanasonicTV(log, config) {
    this.log = log;
    this.config = config;
    this.name = config["name"];
    this.HOST = config["ipaddress"];
}

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-panasonic", "Panasonic-TV", PanasonicTV);
}

PanasonicTV.prototype.getServices = function() {
    this.tv = new PanasonicCommands(this.HOST);

    // Configure HomeKit TV Device Information
    this.deviceInformation = new Service.AccessoryInformation();
    this.deviceInformation
        .setCharacteristic(Characteristic.Manufacturer, "Panasonic")
        .setCharacteristic(Characteristic.SerialNumber, "Unavailable")
        .setCharacteristic(Characteristic.Model, "Viera");

    this.getDeviceInformation();
        
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
        .on("set", this.setInput.bind(this, inputs));

    this.inputHDMI1 = this.createInputSource("hdmi1", "HDMI 1", 1, Characteristic.InputSourceType.HDMI);
    this.inputHDMI2 = this.createInputSource("hdmi2", "HDMI 2", 2, Characteristic.InputSourceType.HDMI);
    this.inputHDMI3 = this.createInputSource("hdmi3", "HDMI 3", 3, Characteristic.InputSourceType.HDMI);
    this.inputTV = this.createInputSource("tv", "TV", 4, Characteristic.InputSourceType.TUNER);
    this.inputNetflix = this.createInputSource("netflix", "Netflix", 5, Characteristic.InputSourceType.APPLICATION);
    this.inputPrimeVideo = this.createInputSource("primeVideo", "Prime Video", 6, Characteristic.InputSourceType.APPLICATION);
    this.inputPlex = this.createInputSource("plex", "Plex", 7, Characteristic.InputSourceType.APPLICATION);
    this.inputYoutube = this.createInputSource("youtube", "YouTube", 8, Characteristic.InputSourceType.APPLICATION);
    this.tvService.addLinkedService(this.inputHDMI1);
    this.tvService.addLinkedService(this.inputHDMI2);
    this.tvService.addLinkedService(this.inputHDMI3);
    this.tvService.addLinkedService(this.inputTV);
    this.tvService.addLinkedService(this.inputNetflix);
    this.tvService.addLinkedService(this.inputPrimeVideo);
    this.tvService.addLinkedService(this.inputPlex);
    this.tvService.addLinkedService(this.inputYoutube);

    return [this.deviceInformation, this.tvService, this.speakerService, this.inputHDMI1, this.inputHDMI2, this.inputHDMI3, this.inputTV, this.inputNetflix, this.inputPrimeVideo, this.inputPlex, this.inputYoutube];
}

// TV Information
PanasonicTV.prototype.getDeviceInformation = function() {
    var getRequest = {
        host: this.ipAddress,
        path: "/nrc/ddd.xml",
        port: 55000,
        method: "GET"
    };

    var request = http.request(getRequest, (result) => {
        result.setEncoding("utf8");
        result.on("data", (data) => {
            print("Data: " + data);

            let model = data.body["root"]["device"]["modelNumber"];
            // let serialNumber = data.body["root"]["device"]["serialNumber"]; <-- Doesn't exist???

            if (model !== "") {
                this.deviceInformation.setCharacteristic(Characteristic.Model).updateValue(model);
            } else {
                this.deviceInformation.setCharacteristic(Characteristic.Model, "Unavailable");
            }
        });
    });

    request.on('error', (error) => {
        this.log("Error: " + error.message);
        this.deviceInformation.setCharacteristic(Characteristic.Model, "Unavailable");
    });

    request.end();
}

// TV Speaker
PanasonicTV.prototype.getMute = function(callback) {
    this.tv.getMute((status) => {
        this.log("Mute status: " + status);
        callback(null, status);
    });
}

PanasonicTV.prototype.setMute = function(value, callback) {
    this.tv.setMute(!value);
    callback(null, !value);
}

PanasonicTV.prototype.getVolume = function(callback) {
    this.tv.getVolume((volume) => { 
        this.log("Volume status: " + volume);
        callback(null, volume);
    });
}

PanasonicTV.prototype.setVolume = function(value, callback) {
    this.tv.setVolume(value);
    callback(null, value);
}

// TV Remote Control
PanasonicTV.prototype.remoteControl = function(action, callback) {
    this.log("Remote Control Action: " + action);

    switch (action) {
        case Characteristic.RemoteKey.REWIND:
            this.tv.sendCommand("REW");
            break;
        case Characteristic.RemoteKey.FAST_FORWARD:
            this.tv.sendCommand("FF");
            break;
        case Characteristic.RemoteKey.NEXT_TRACK:
            this.tv.sendCommand("SKIP_NEXT");
            break;
        case Characteristic.RemoteKey.PREVIOUS_TRACK:
            this.tv.sendCommand("SKIP_PREV");
            break;
        case Characteristic.RemoteKey.ARROW_UP:
            this.tv.sendCommand("UP");
            break;
        case Characteristic.RemoteKey.ARROW_DOWN:
            this.tv.sendCommand("DOWN");
            break;
        case Characteristic.RemoteKey.ARROW_RIGHT:
            this.tv.sendCommand("RIGHT");
            break;
        case Characteristic.RemoteKey.SELECT:
            this.tv.sendCommand("RIGHT");
            break;
        case Characteristic.RemoteKey.BACK:
            this.tv.sendCommand("RETURN");
            break;
        case Characteristic.RemoteKey.EXIT:
            this.tv.sendCommand("CANCEL");
            break;
        case Characteristic.RemoteKey.PLAY_PAUSE:
            this.tv.sendCommand("PAUSE");
            break;
        case Characteristic.RemoteKey.INFORMATION:
            this.tv.sendCommand("SUBMENU");
            break;
        default:
            callback("Error", null);
            break;
    }

    callback(null, action);
}

// TV Inputs
PanasonicTV.prototype.createInputSource = function(id, name, number, type) {
    var input = new Service.InputSource(id, number);
    input
        .setCharacteristic(Characteristic.Identifier, number)
        .setCharacteristic(Characteristic.ConfiguredName, name)
        .setCharacteristic(Characteristic.InputSourceType, type)
        .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED);

    return input;
}

PanasonicTV.prototype.setInput = function(inputList, desiredInput, callback)  {
    var input = inputList[desiredInput].replace(" ", "");
    this.log("Switching to " + input);
    
    switch (desiredInput) {
        case 5: // Netflix
            this.tv.sendAppCommand("0010000200000001");
            break;
        case 6: // Prime Video
            this.tv.sendAppCommand("0010000100170001");
            break;
        case 7: // Plex
            this.tv.sendAppCommand("0076010507000001");
            break;
        case 8: // Youtube
            this.tv.sendAppCommand("0070000200170001");
            break;
        default:
            this.tv.sendCommand(input);
            break;
    }

    callback(null, input);
}

// TV Power
PanasonicTV.prototype.getOn = function(callback) {
    var PowerStateSubscription = new upnpSub(this.HOST, 55000, "/nrc/event_0");

    PowerStateSubscription.on("message", (message) => {
        let screenState = message.body["e:propertyset"]["e:property"][2]["X_ScreenState"];
        this.log("TV is " + screenState);

        if (screenState == "on") {
            callback(null, true);
        } else {
            callback(null, false);
        }
    });

    PowerStateSubscription.on("error", () => {
        this.log("Couldn\'t check power state. Please check your TV\'s network connection.");
        callback(null, false);
    });

    setTimeout(PowerStateSubscription.unsubscribe, 1200);
}

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
