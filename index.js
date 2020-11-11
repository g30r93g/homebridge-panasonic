// Created by George Nick Gorzynski (@g30r93g)
// Version 8.0.0 beta 1
// 

var PanasonicCommands = require("viera.js-g30r93g");
var UpnpSub = require("node-upnp-subscription");
var Service, Characteristic, CharacteristicEventTypes, UUID;

const pluginName = "homebridge-panasonic-viera-tv";
const platformName = "PanasonicTV";

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    CharacteristicEventTypes = homebridge.hap.CharacteristicEventTypes;
    UUID = homebridge.hap.uuid;

    homebridge.registerPlatform(platformName, PanasonicTV);
};

class PanasonicTV {

    constructor(log, config, homebridge) {
        this.log = log;

        homebridge.on('didFinishLaunching', () => {
            if (config) {
                this.parseConfig(config);

                this.tvCommands = new PanasonicCommands(this.tvIP)

                this.setupTV(homebridge);
            } else {
                this.log("No configuration found. Please add configuration in config.json");
                return;
            }
        })
    };

    parseConfig(config) {
        this.name = config["name"];
        this.tvIP = config["ipAddress"];

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
        this.log(`Configured Panasonic TV named ${this.name} with IP ${this.tvIP}.`)
        this.log(`Serial Number: ${this.serialNumber}`)
        this.log(`Model: ${this.model}`)
    };

    setupTV(homebridge) {
        this.tvAccessory = this.setupTVAccessory(homebridge)
        this.tvService = this.tvAccessory.addService(Service.Television)

        this.powerState = 0

        this.setTVCharacteristics()
        this.addTVPowerStateBindings()
        this.listenToTVPowerState()

        homebridge.publishExternalAccessories(pluginName, [this.tvAccessory])
    };

    setupTVAccessory(homebridge) {
        this.uuid = UUID.generate("homebridge:" + pluginName + ":" + this.name);

        var tvAccessory = new homebridge.platformAccessory(this.name, this.uuid);
        tvAccessory.category = homebridge.hap.Categories.TELEVISION;

        return tvAccessory
    };

    setTVCharacteristics() {
        this.tvService
            .setCharacteristic(Characteristic.ConfiguredName, this.name)
            .setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE)

        this.tvAccessory
            .getService(Service.AccessoryInformation)
            .updateCharacteristic(Characteristic.Manufacturer, "Panasonic")
            .updateCharacteristic(Characteristic.SerialNumber, this.serialNumber)
            .updateCharacteristic(Characteristic.Name, this.name)
            .updateCharacteristic(Characteristic.Model, this.model);

        this.log("Added TV Characteristics")
    };

    addTVPowerStateBindings() {
        this.tvAccessory
            .getService(Service.Television)
            .getCharacteristic(Characteristic.Active)
            .on(CharacteristicEventTypes.SET, this.setTVPowerState.bind(this));

        this.log("Added TV Power State Bindings")
    };

    setTVPowerState(currentState, callback) {
        this.tvCommands.sendCommand("POWER");

        this.log(`Powering TV ${(currentState === true ? 'off' : 'on')}`)
        callback(null, currentState);
    }

    listenToTVPowerState() {
        var powerStateSubscription = new UpnpSub(this.tvIP, 55000, "/nrc/event_0");

        // Send a power command twice in order to obtain the correct power state
        this.tvCommands.sendCommand("POWER");
        this.tvCommands.sendCommand("POWER");

        powerStateSubscription.on("message", (message) => {
            let properties = message.body["e:propertyset"]["e:property"];
            this.log(properties)

            if (properties.isArray) {
                // List of Properties that require filtering
                let matchingProperties = properties.filter(property => property.X_ScreenState === "on" || property.X_ScreenState === "off")
                this.log(matchingProperties)

                let screenState = matchingProperties[0].X_ScreenState

                this.updateTVPowerState(screenState)
            } else if (typeof properties === "object") {
                // Object that only contains screen state
                let screenState = properties.X_ScreenState

                this.updateTVPowerState(screenState)
            } else {
                this.log("Message from TV did not contain ScreenState property. This may mean that power on from standby is unsupported. If this is incorrect, please file an issue.")
            }
        });

        powerStateSubscription.on("error", () => {
            this.log("Couldn\'t check power state. Please check your TV\'s network connection.");
            this.log("Alternatively, your TV may not be correctly set up or it may not be able to perform power on from standby.");
        });
    }

    updateTVPowerState(screenState) {
        this.log(`TV screen is ${screenState}`)
        this.powerState = (screenState === "on")
        this.tvAccessory
            .getService(Service.Television)
            .updateCharacteristic(Characteristic.Active, this.powerState)
    };

};
