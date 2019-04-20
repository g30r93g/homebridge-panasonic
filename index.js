var PanasonicCommands = require('viera.js');
var upnpSub = require('node-upnp-subscription');
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-panasonic", "Panasonic-TV", PanasonicTV);
};

const inputs = {
    1: "HDMI 1",
    2: "HDMI 2",
    3: "HDMI 3",
    4: "TV"
};

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
};

PanasonicTV.prototype.getServices = function() {
    this.tv = new PanasonicCommands(this.HOST);

    // Configure HomeKit TV Device Information
    this.deviceInformation = new Service.AccessoryInformation();
    this.deviceInformation
        .setCharacteristic(Characteristic.Manufacturer, "Panasonic")
        .setCharacteristic(Characteristic.Model, "Viera")
        .setCharacteristic(Characteristic.SerialNumber, "Unavailable");
        
    // Configure HomeKit TV Accessory
    this.tvService = new Service.Television(this.name, "Television");
    this.tvService
        .setCharacteristic(Characteristic.ConfiguredName, this.name)
        .setCharacteristic(Characteristic.SleepDiscoveryMode, 1);
  
    this.tvService.getCharacteristic(Characteristic.Active)
        .on("get", this.getOn.bind(this))
        .on("set", this.setOn.bind(this));

    // Configure HomeKit TV Accessory Remote Control
    // this.tvService
    //     .getCharacteristic(Characteristic.RemoteKey)
    //     .on("set", this.remoteControl.bind(this));
    
    // Configure HomeKit TV Volume Control
    this.speakerService = new Service.TelevisionSpeaker(this.name + " Volume", "volumeService");

    this.speakerService
        .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
        .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);
    
    this.speakerService
        .getCharacteristic(Characteristic.VolumeSelector)
        .on('set', (newValue, callback) => {
            this.tv.setVolume(newValue);
            callback(null, newValue);
        });

    this.speakerService
        .getCharacteristic(Characteristic.Mute)
        .on('get', this.getMute.bind(this))
        .on('set', this.setMute.bind(this));

    this.speakerService
        .addCharacteristic(Characteristic.Volume)
        .on('get', this.getVolume.bind(this))
        .on('set', this.setVolume.bind(this));

  this.tvService.addLinkedService(this.speakerService);
    
    // Configure HomeKit TV Accessory Inputs
    this.tvService.getCharacteristic(Characteristic.ActiveIdentifier)
        .on("set", this.setInput.bind(this, inputs));

    this.inputHDMI1 = this.createInputSource("hdmi1", "HDMI 1", 1, Characteristic.InputSourceType.HDMI);
    this.inputHDMI2 = this.createInputSource("hdmi2", "HDMI 2", 2, Characteristic.InputSourceType.HDMI);
    this.inputHDMI3 = this.createInputSource("hdmi3", "HDMI 3", 3, Characteristic.InputSourceType.HDMI);
    this.inputTV = this.createInputSource("tv", "TV", 4, Characteristic.InputSourceType.TUNER);
    this.tvService.addLinkedService(this.inputHDMI1);
    this.tvService.addLinkedService(this.inputHDMI2);
    this.tvService.addLinkedService(this.inputHDMI3);
    this.tvService.addLinkedService(this.inputTV);

    return [this.deviceInformation, this.tvService, this.speakerService, this.inputHDMI1, this.inputHDMI2, this.inputHDMI3, this.inputTV];
}


// TV Speaker
PanasonicTV.prototype.getMute = function(callback) {
    this.tv.getMute(status => {
        this.log("Mute status: " + status);
        callback(null, status);
    });
}

PanasonicTV.prototype.setMute = function(value, callback) {
    this.tv.setMute(!value);
    callback(null, !value);
}

PanasonicTV.prototype.getVolume = function(callback) {
    this.tv.getVolume(volume => { 
        this.log("Volume status: " + volume);
        callback(null, volume);
    });
}

PanasonicTV.prototype.setVolume = function(value, callback) {
    this.tv.setVolume(value);
    callback(null, value);
}

// TV Remote Control
// PanasonicTV.prototype.remoteControl = function(keyCmd, callback) {
//     this.log("Remote Control Key Action: " + keyCmd);
    
//     switch (keyCmd) {
//         case Characteristic.RemoteKey.REWIND:
//             this.tv.sendCommand("REW");
//         case Characteristic.RemoteKey.FAST_FORWARD:
//             this.tv.sendCommand("FF");
//         case Characteristic.RemoteKey.NEXT_TRACK:
//             this.tv.sendCommand("SKIP_NEXT");
//         case Characteristic.RemoteKey.PREVIOUS_TRACK:
//             this.tv.sendCommand("SKIP_PREV");
//         case Characteristic.RemoteKey.ARROW_UP:
//             this.tv.sendCommand("UP");
//         case Characteristic.RemoteKey.ARROW_DOWN:
//             this.tv.sendCommand("DOWN");
//         case Characteristic.RemoteKey.ARROW_LEFT:
//             this.tv.sendCommand("LEFT");
//         case Characteristic.RemoteKey.ARROW_RIGHT:
//             this.tv.sendCommand("RIGHT");
//         case Characteristic.RemoteKey.SELECT:
//             this.tv.sendCommand("ENTER");
//         case Characteristic.RemoteKey.BACK:
//             this.tv.sendCommand("RETURN");
//         case Characteristic.RemoteKey.EXIT:
//             this.tv.sendCommand("CANCEL");
//         case Characteristic.RemoteKey.PLAY_PAUSE:
//             this.tv.sendCommand("PAUSE");
//         case Characteristic.RemoteKey.INFORMATION:
//             this.tv.sendCommand("SUBMENU");
//     }
// }

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

    this.log("Switching input to " + input);
    this.tv.sendCommand(input);
    callback(null, input);
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
}
