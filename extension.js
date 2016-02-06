
// extension root object
const Me = imports.misc.extensionUtils.getCurrentExtension();

// import internal modules
const _config = Me.imports._config;

// aliases for used modules
const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;

const Convenience = Me.imports.convenience;

const SETTINGS_KEY = 'services';


let numbersOfTryToActivateMysql = 0;
let numbersOfTryToDesactivateMysql = 0;

let numbersOfTryToActivateApache = 0;
let numbersOfTryToDesactivateApache = 0;

let numbersOfPkexecProcess = 0;

let maxNumbersOfTry = 8;

// StatusIcon manager
let statusIcon;
let lampNoServices      = 'lamp-no-services';
let lampApacheServices  = 'lamp-apache-services';
let lampMysqlServices   = 'lamp-mysql-services';
let lampAllServices     = 'lamp-all-services';
let lampLoading         = 'lamp-loading';

// My PopupSwitchMenu
// let menuItemApache;
// let menuItemMysql;



/*
 * Indicator class.
 *
 * Creates an actor in the StatusArea panel. Provides menu for manipulating
 * visiblity of other icons.
 */
const Indicator = new Lang.Class({
    Name: 'Indicator',
    Extends: PanelMenu.Button,

    /**
     * Creates an actor object, which can be added to the status area,
     *
     * @constructor
     * @this {Indicator}
     * @param {string} icon an icon name
     */
    _init: function(icon) {
        let icon_classname = lampNoServices;

        this.parent(0.0, _config.EXTENSION_NAME);

        statusIcon = new St.Icon({
            icon_name: icon,
            style_class: icon_classname
        });

        this.actor.add_actor(statusIcon);

        //this._settings = Convenience.getSettings();
        this._createMenu();
    },

    /**
     * Creates menu for the Indicator. It will be popuped on RMB click.
     *
     * @private
     * @this {Indicator}
     */
    _createMenu: function() {
        this._settings = Convenience.getSettings();

        this._settings.connect('changed', Lang.bind(this, this._buildMenu));

        this._buildMenu();

    },
    _buildMenu: function() {
        this.menu.removeAll();
        let SERVICES_LIST = this._parseData( this._settings.get_string(SETTINGS_KEY));
        for (var i in SERVICES_LIST) {
          let service = i;

          menuItemCustom = new PopupMenu.PopupSwitchMenuItem(SERVICES_LIST[service]['name'], isServiceActive(service));
          this.menu.addMenuItem(menuItemCustom);
          menuItemCustom.statusAreaKey = SERVICES_LIST[service]['name'];

          menuItemCustom.connect('toggled', function(){ toggleService(service); });

        }
    },

    _parseData: function(s) {
      var parsed = {};
      s = s.split(';');
      s.forEach(function(service_line) { 
        var t = service_line.split(',');
        if (t[1]) {
          parsed[t[1]] = {name: t[0], user: !!parseInt(t[2])}
        }
      });

      return parsed;
    },

});


/*
 * Extension definition.
 */

function Extension() {
    this._init();
}

Extension.prototype = {
    _init: function() {
        this._indicator = null;
    },

    enable: function() {
        this._indicator = new Indicator('');
        Main.panel.addToStatusArea(_config.EXTENSION_NAME, this._indicator);
    },



    disable: function() {
        this._indicator.destroy();
        this._indicator = null;
    }

};


/**
 * Entry point.
 *
 * Should return an object with callable `enable` and `disable` properties.
 */

// A JSON Object that keeps strings -
//Useful for creating settings


function init() {
    return new Extension();
}

function isServiceActive(service) {
    if (_config.SERVICES_LIST[service]['user']) {
      var [resService, outService] = GLib.spawn_command_line_sync("systemctl is-active --user "+service);
    } else {
      var [resService, outService] = GLib.spawn_command_line_sync("systemctl is-active "+service);
    }
    let [resService, outService] = [resService, outService];
    let outServiceString = outService.toString().replace(/(\r\n|\n|\r)/gm,"");
    return outServiceString == "active";
}

function toggleService(service) {
    let action = "start";
    if (isServiceActive(service)) {
        action = "stop";
    }
    numbersOfPkexecProcess = getNumbersOfPkexecProcess();

    if (_config.SERVICES_LIST[service]['user']) {
      var cmd = 'systemctl '+action+' --user '+service;
    } else {
      var cmd = _config.PKEXEC_PATH + ' systemctl '+action+' '+service;
    }

    let cmd = cmd;

    // if (numbersOfTryToActivateApache == 0 && numbersOfTryToDesactivateApache == 0) {
	    try {
            Util.trySpawnCommandLine(cmd);
            // statusIcon.set_property("style_class", lampLoading);
            if (action == "start") {
                GLib.timeout_add(0,300, function() { tryActivateService(service) });
            } else {
                GLib.timeout_add(0,300, function() { tryDesactivateService(service) });
            }
	    } catch(Exception) {
		  Main.notify("Crash !"+Exception);
	    }
	// }
}

function tryActivateService(service) {
    let serviceWaiting = true;
    // We want to activate Apache
    if (numbersOfTryToActivateApache >= maxNumbersOfTry || isServiceActive(service)) {
        numbersOfTryToActivateApache = 0;
        if (!isPkExecThreadActive()){
            // PkExec is open ! don't do anything stupid
            if (isServiceActive(service)) {
                Main.notify(_config.SERVICES_LIST[service]['name']+" is now on");
            } else {
                Main.notify(_config.SERVICES_LIST[service]['name']+" couldn't be activated");
            }
            // No need to go to that loop again
            refreshUI();
            serviceWaiting = false;
        }
    } else {
        //it's not over !
        numbersOfTryToActivateApache++;
    }
    return serviceWaiting;
}

function tryDesactivateService(service) {
    let serviceWaiting = true;
    // We want to desactivate Apache
    if (numbersOfTryToDesactivateApache >= maxNumbersOfTry || !isServiceActive(service)) {
        numbersOfTryToDesactivateApache = 0;
        if (!isPkExecThreadActive()){
            // PkExec is closed open ! don't do anything stupid
            if (!isServiceActive(service)) {
                Main.notify(_config.SERVICES_LIST[service]['name']+" is now off");
            } else {
                Main.notify(_config.SERVICES_LIST[service]['name']+" couldn't be deactivated");
            }
            // No need to go to that loop again
            refreshUI();
            serviceWaiting = false;
        }
    } else {
        //it's not over !
        numbersOfTryToDesactivateApache++;
    }
    return serviceWaiting;
}

function getNumbersOfPkexecProcess() {
    // Get current status of mysql service
    let [resPkExec, outPkExec] = GLib.spawn_command_line_sync("pgrep pkexec -c");
    let outPkExecString = outPkExec.toString().replace(/(\r\n|\n|\r)/gm,"").trim();
    return outPkExecString;
}

function isPkExecThreadActive() {
    res = true;
    if (numbersOfPkexecProcess == getNumbersOfPkexecProcess()) {
        // The PkExec asking for passowrd is no longer active
        res = false;
    }
    return res;
}

function refreshUI() {
    refreshStatusIcon();
    refreshSwitchButton();
}

function refreshStatusIcon() {
    let icon_classname = lampNoServices;

    if (isApacheActive() && isMysqlActive()) {
        icon_classname = lampAllServices;
    } else if (isApacheActive()) {
        icon_classname = lampApacheServices;
    } else if (isMysqlActive()) {
        icon_classname = lampMysqlServices;
    } else {
        icon_classname = lampNoServices;
    }

    statusIcon.set_property("style_class", icon_classname);
}

function refreshSwitchButton() {
    // menuItemApache.setToggleState(isApacheActive());
    // menuItemMysql.setToggleState(isMysqlActive());
}
