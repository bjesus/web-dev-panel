// -*- mode: js2; indent-tabs-mode: nil; js2-basic-offset: 4 -*-
// Start apps on custom workspaces

const GdkPixbuf = imports.gi.GdkPixbuf;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const GMenu = imports.gi.GMenu;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;
const N_ = function(e) { return e };

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const SETTINGS_KEY = 'services';

const WORKSPACE_MAX = 36; // compiled in limit of mutter

const Columns = {
    DISPLAY_NAME: 0,
    SERVICE_NAME: 1,
    USER_UNIT: 2
};

const Widget = new GObject.Class({
    Name: 'ServicesPanel.Prefs.Widget',
    GTypeName: 'ServicesPanelPrefsWidget',
    Extends: Gtk.Grid,

    _init: function(params) {
    this.parent(params);
    this.set_orientation(Gtk.Orientation.VERTICAL);

    this._settings = Convenience.getSettings();

    this._settings.connect('changed', Lang.bind(this, this._refresh));

    // this._settings.set_string(SETTINGS_KEY, "Web Server,nginx,0;MySQL Server,mysqld,0;")

    this._changedPermitted = false;


    this._store = new Gtk.ListStore();
    this._store.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_STRING]);

    
        let scrolled = new Gtk.ScrolledWindow({ shadow_type: Gtk.ShadowType.IN});
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.add(scrolled);


    this._treeView = new Gtk.TreeView({ model: this._store,
                                            hexpand: true, vexpand: true });
    this._treeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

    let displayColumn = new Gtk.TreeViewColumn({ title: _("Display Name") });
    let displayRenderer = new Gtk.CellRendererSpin({ editable: true });
    displayColumn.pack_start(displayRenderer, true);
    displayColumn.add_attribute(displayRenderer, "text", Columns.DISPLAY_NAME);
    this._treeView.append_column(displayColumn);


    let unitColumn = new Gtk.TreeViewColumn({ title: _("Service Name") });
    let unitRenderer = new Gtk.CellRendererSpin({ editable: true });
    unitColumn.pack_start(unitRenderer, true);
    unitColumn.add_attribute(unitRenderer, "text", Columns.SERVICE_NAME);
    this._treeView.append_column(unitColumn);


    let userColumn = new Gtk.TreeViewColumn({ title: _("User") });
    let userRenderer = new Gtk.CellRendererSpin({ editable: true });
    userColumn.pack_start(userRenderer, true);
    userColumn.add_attribute(userRenderer, "text", Columns.USER_UNIT);
    this._treeView.append_column(userColumn);


    scrolled.add(this._treeView);

    let toolbar = new Gtk.Toolbar({ icon_size: Gtk.IconSize.SMALL_TOOLBAR });
    toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);
    this.add(toolbar);

    let newButton = new Gtk.ToolButton({ icon_name: 'bookmark-new-symbolic',
                                             label: _("Add Service"),
                         is_important: true });
    newButton.connect('clicked', Lang.bind(this, this._createNew));
    toolbar.add(newButton);

    let delButton = new Gtk.ToolButton({ icon_name: 'edit-delete-symbolic'  });
    delButton.connect('clicked', Lang.bind(this, this._deleteSelected));
    toolbar.add(delButton);

        let selection = this._treeView.get_selection();
        selection.connect('changed',
            function() {
                delButton.sensitive = selection.count_selected_rows() > 0;
            });
        delButton.sensitive = selection.count_selected_rows() > 0;

    this._changedPermitted = true;
    this._refresh();


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

    _createNew: function() {
    let dialog = new Gtk.Dialog({ title: _("Add Service"),
                      transient_for: this.get_toplevel(),
                                      use_header_bar: true,
                      modal: true });
    dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    let addButton = dialog.add_button(_("Add"), Gtk.ResponseType.OK);
        dialog.set_default_response(Gtk.ResponseType.OK);

    let grid = new Gtk.Grid({ column_spacing: 10,
                                  row_spacing: 15,
                                  margin: 10 });

    grid.attach(new Gtk.Label({ label: _("Display Name"),
                                    halign: Gtk.Align.END }), 0, 1, 1, 1);
    dialog._display_name = new Gtk.Entry({});
    dialog._display_name.set_placeholder_text("i.e. Web Server");
    grid.attach(dialog._display_name, 1, 1, 1, 1);


    grid.attach(new Gtk.Label({ label: _("Service Name"),
                                    halign: Gtk.Align.END }), 0, 2, 1, 1);
    dialog._service_name = new Gtk.Entry({});
    dialog._service_name.set_placeholder_text("i.e. mysqld");
    grid.attach(dialog._service_name, 1, 2, 1, 1);


    grid.attach(new Gtk.Label({ label: _("User Service"),
                                    halign: Gtk.Align.END }), 0, 3, 1, 1);    
    dialog._user_service = new Gtk.CheckButton({});
    grid.attach(dialog._user_service, 1, 3, 1, 1);

    dialog.get_content_area().add(grid);

    dialog.connect('response', Lang.bind(this, function(dialog, id) {
        if (id != Gtk.ResponseType.OK) {
                dialog.destroy();
        return;
            }

        let iter = this._store.append();

            var user_status = dialog._user_service.get_active() ? 1 : 0
            var user_status = user_status.toString();

            this._settings.set_string(SETTINGS_KEY,
              this._settings.get_string(SETTINGS_KEY)+
              dialog._display_name.get_text()+
              ","+dialog._service_name.get_text()+
              ","+ user_status + ";")
            
            dialog.destroy();
    }));
    dialog.show_all();
    },

    _deleteSelected: function() {
      let [any, model, iter] = this._treeView.get_selection().get_selected();
      let service_to_remove = this._store.get_value(iter, Columns.SERVICE_NAME );
      let services = this._parseData( this._settings.get_string(SETTINGS_KEY) );
      
      s = "";

      for (var i in services) {
        let service = i;

        var user_status = services[service]['user'] ? 1 : 0
        var user_status = user_status.toString();

        if (service !== service_to_remove) {
          s += services[service]['name']+","+service+","+ user_status +";";
        }
      }


      this._settings.set_string(SETTINGS_KEY, s);
    
      this._refresh();
    },
    _refresh: function() {

      this._store.clear();

      let services = this._parseData( this._settings.get_string(SETTINGS_KEY) );

      for (var i in services) {
        let service = i;
        let iter = this._store.append();

        this._store.set(iter,
          [Columns.DISPLAY_NAME, Columns.SERVICE_NAME, Columns.USER_UNIT],
          [services[service]['name'], service, services[service]['user']]);
      }
    },
});


function init() {
    // Convenience.initTranslations();
}

function buildPrefsWidget() {
    let widget = new Widget({ margin: 12 });
    widget.show_all();

    return widget;
}
