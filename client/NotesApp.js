'use strict';

var each = require('lodash/each');
var inBrowser = require('substance/util/inBrowser');
var DefaultDOMElement = require('substance/ui/DefaultDOMElement');
var Component = require('substance/ui/Component');
var DocumentClient = require('substance/collab/DocumentClient');
var AuthenticationClient = require('./AuthenticationClient');
var FileClient = require('./FileClient');
var IndexSection = require('./IndexSection');
var NoteSection = require('./NoteSection');
var SettingsSection = require('./SettingsSection');
var NotesRouter = require('./NotesRouter');

var I18n = require('substance/ui/i18n');
I18n.instance.load(require('../i18n/en'));

function NotesApp() {
  Component.apply(this, arguments);

  // EXPERIMENTAL: with server.serveHTML it is now possible to
  // provide dynamic configuration information via HTML meta tags
  // TODO: we want this to go into a Substance util helper
  var config = {};
  var metaTags = window.document.querySelectorAll('meta');

  each(metaTags, function(tag) {
    var name = tag.getAttribute('name');
    var content = tag.getAttribute('content');
    if (name && content) {
      config[name] = content;
    }
  });

  config.host = config.host || 'localhost';
  config.port = config.port || 5000;

  // Store config for later use (e.g. in child components)
  this.config = config;

  this.authenticationClient = new AuthenticationClient({
    httpUrl: config.authenticationServerUrl || 'http://'+config.host+':'+config.port+'/api/auth/'
  });

  this.documentClient = new DocumentClient({
    httpUrl: config.documentServerUrl || 'http://'+config.host+':'+config.port+'/api/documents/'
  });

  this.fileClient = new FileClient({
    httpUrl: config.fileServerUrl || 'http://'+config.host+':'+config.port+'/api/files/'
  });

  this.handleActions({
    'navigate': this.navigate,
    'newNote': this._newNote,
    'logout': this._logout
  });

  this.router = new NotesRouter(this);
  this.router.on('route:changed', function(route) {
    this.navigate(route, 'silent');
  });
}

NotesApp.Prototype = function() {

  /*
    That's the public state reflected in the route
  */
  this.getInitialState = function() {
    return {
      route: undefined,
      userSession: undefined,
      _isMobile: this._isMobile()
    };
  };

  this.didMount = function() {
    if (inBrowser) {
      var _window = DefaultDOMElement.getBrowserWindow();
      _window.on('resize', this._onResize, this);
    }
    var route = this.router.getRoute();
    this.navigate(route, 'silent');
  };

  this.dispose = function() {
    this.router.off(this);
  };

  // Life cycle
  // ------------------------------------

  this.__getLoginData = function(route) {
    var loginKey = route.loginKey;
    var storedToken = this._getSessionToken();
    var loginData;

    if (loginKey) {
      loginData = {loginKey: loginKey};
    } else if (storedToken) {
      loginData = {sessionToken: storedToken};
    }
    return loginData;
  };

  // e.g. {section: 'note', id: 'note-25'}
  this.navigate = function(route, silent) {
    var loginData = this.__getLoginData(route);
    this.authenticationClient.authenticate(loginData, function(err, userSession) {
      this.extendState({
        route: route,
        userSession: userSession
      });
      if (!silent) {
        this.router.writeRoute(route);
      }
    }.bind(this));
  };

  /*
    Determines when a mobile view should be shown.

    TODO: Check also for user agents. Eg. on iPad we want to show the mobile
    version, even thought he screenwidth may be greater than the threshold.
  */
  this._isMobile = function() {
    return window.innerWidth < 700;
  };

  this._onResize = function() {
    if (this._isMobile()) {
      // switch to mobile
      if (!this.state.mobile) {
        this.extendState({
          mobile: true
        });
      }
    } else {
      if (this.state.mobile) {
        this.extendState({
          mobile: false
        });
      }
    }
  };

  /*
    Expose hubClient to all child components
  */
  this.getChildContext = function() {
    return {
      authenticationClient: this.authenticationClient,
      documentClient: this.documentClient,
      fileClient: this.fileClient,
      config: this.config,
      urlHelper: this.router
    };
  };


  // Rendering
  // ------------------------------------

  this.render = function($$) {
    var el = $$('div').addClass('sc-notes-app');

    if (this.state.route === undefined) {
      // Uninitialized
      return el;
    }

    switch (this.state.route.section) {
      case 'note':
        // display note
        el.append($$(NoteSection, this.state).ref('noteSection'));
        break;
      case 'settings':
        el.append($$(SettingsSection, this.state).ref('settingsSection'));
        break;
      default: // mode=index
        el.append($$(IndexSection, this.state).ref('editNote'));
        break;
    }
    return el;
  };

  // Action Handlers
  // ------------------------------------

  /*
    Create a new note
  */
  this._newNote = function() {
    var userId = this._getUserId();
    this.documentClient.createDocument({
      schemaName: 'substance-note',
      // TODO: Find a way not to do this statically
      info: {
        title: 'Untitled',
        userId: userId
      }
    }, function(err, result) {
      this.navigate({
        section: 'note',
        documentId: result.documentId
      });
    }.bind(this));
  };

  /*
    Forget current user session
  */
  this._logout = function() {
    this.authenticationClient.logout();
    window.localStorage.removeItem('sessionToken');
    this.extendState({
      userSession: null,
      route: {
        section: 'index'
      }
    });
  };

  // Helpers
  // ------------------------------------

  /*
    Store session token in localStorage
  */
  this._setSessionToken = function(sessionToken) {
    console.log('storing new sessionToken', sessionToken);
    window.localStorage.setItem('sessionToken', sessionToken);
  };

  /*
    Retrieve last session token from localStorage
  */
  this._getSessionToken = function() {
    return window.localStorage.getItem('sessionToken');
  };
};

Component.extend(NotesApp);

module.exports = NotesApp;