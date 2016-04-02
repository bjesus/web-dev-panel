/*
 * web-dev-panel@mediadoneright.com
 * Source based on the project: Lamp Status
 * https://extensions.gnome.org/extension/990/lamp-status/
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 Copyright (C) 2015 Michael Stewart

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; either version 2
 of the License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

 */

// extension name
// used as identifier when adding to status area
const GLib = imports.gi.GLib;

const EXTENSION_NAME = 'Services Panel';


// keys for access to gsettings
const GSETTINGS_KNOWN = 'known';
const GSETTINGS_HIDDEN = 'hidden';
const GSETTINGS_ISINDICATORSHOWN = 'is-indicator-shown';

// Services
const PKEXEC_PATH           =  GLib.find_program_in_path('pkexec');

const SERVICES_LIST         = {
  'nginx': {name: 'Web Server', user: false},
  'mysqld': {name: 'SQL Server', user: false},
  'php-fpm': {name: 'PHP FPM', user: false},
  'NetworkManager': {name: 'Network Manager', user: false},
  'btsync': {name: 'BitTorrent Sync', user: true},
  'redshift': {name: 'Redshift', user: true},
}
