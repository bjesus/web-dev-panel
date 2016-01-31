# Services Panel
A Gnome Shell extension to toggle your services from the top panel.

![Image of Services Panel](img/screenshot.png)

Fork of the [web-dev-panel](https://github.com/mediadoneright/web-dev-panel) extension, which is itself based upon code from [Lamp Status](https://extensions.gnome.org/extension/990/lamp-status/).

Edit `SERVICES_LIST` in `_config.js` according to your will.

For example:

```
const SERVICES_LIST = {
  'nginx': {name: 'Web Server', user: false},
  'mysqld': {name: 'SQL Server', user: false},
  'php-fpm': {name: 'PHP FPM', user: false},
  'btsync': {name: 'BitTorrent Sync', user: true},
}
```
