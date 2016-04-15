'use strict';

var CollabSession = require('substance/collab/CollabSession');
var JSONConverter = require('substance/model/JSONConverter');
var CollabClient = require('substance/collab/CollabClient');
var WebSocketConnection = require('substance/collab/WebSocketConnection');
var Component = require('substance/ui/Component');
var SplitPane = require('substance/ui/SplitPane');
var Note = require('../model/Note');
var Collaborators = require('./Collaborators');
var Notification = require('./Notification');
var Header = require('./Header');
var Layout = require('substance/ui/Layout');

var NoteWriter = require('./NoteWriter');
var NoteReader = require('./NoteReader');
var NoteInfo = require('./NoteInfo');
var converter = new JSONConverter();

function NoteSection() {
  Component.apply(this, arguments);

  var config = this.context.config;

  this.conn = new WebSocketConnection({
    wsUrl: config.wsUrl || 'ws://'+config.host+':'+config.port
  });

  this.collabClient = new CollabClient({
    connection: this.conn,
    enhanceMessage: function(message) {
      message.sessionToken = this.props.userSession.sessionToken;
      return message;
    }.bind(this)
  });

  this.collabClient.on('disconnected', this._onCollabClientDisconnected, this);
  this.collabClient.on('connected', this._onCollabClientConnected, this);
}

NoteSection.Prototype = function() {

  this.getInitialState = function() {
    return {
      session: null, // CollabSession will be stored here, if null indicates we are in loading state
      error: null, // used to display error messages e.g. loading of document failed
      notification: null //used to display status messages in topbar
    };
  };

  this.didMount = function() {
    // load the document after mounting
    this._loadDocument(this.props.documentId);
  };

  this.willReceiveProps = function(newProps) {
    if (newProps.documentId !== this.props.documentId) {
      this.dispose();
      this.state = this.getInitialState();
      this._loadDocument(newProps.documentId);
    }
  };

  this.dispose = function() {
    if (this.state.session) {
      this.state.session.off(this);
      this.state.session.dispose();
      this.state.session = null;
    }
    this.collabClient.off(this);
  };

  this.render = function($$) {
    if (this.props.mobile) {
      return this.renderMobile($$);
    } else {
      return this.renderDesktop($$);
    }
  };

  this.renderDesktop = function($$) {
    var notification = this.state.notification;
    var el = $$('div').addClass('sc-edit-note');
    var main = $$('div');
    var header;

    // Configure header
    // --------------

    header = $$(Header, {
      mobile: this.props.mobile,
      actions: {
        'openDashboard': 'My Notes',
        'newNote': 'New Note'
      }
    });

    // Notification overrules collaborators
    if (notification) {
      header.outlet('content').append(
        $$(Notification, notification)
      );
    } else if (this.state.session) {
      header.outlet('content').append(
        $$(Collaborators, {
          session: this.state.session
        })
      );
    }

    // Main content
    // --------------

    // Display top-level errors. E.g. when a doc could not be loaded
    // we will display the notification on top level
    if (this.state.error) {
      main = $$(Notification, {
        type: 'error',
        message: this.state.error.message
      });
    } else if (this.state.session) {
      var fileClient = this.context.fileClient;
      main = $$(NoteWriter, {
        noteInfo: new NoteInfo(this.state.noteInfo),
        documentSession: this.state.session,
        onUploadFile: fileClient.uploadFile.bind(fileClient)
      }).ref('notepad');
    }

    el.append(
      $$(SplitPane, {splitType: 'horizontal'}).append(
        header,
        main
      ).ref('splitPane')
    );

    return el;
  };

  this.renderMobile = function($$) {
    var el = $$('div').addClass('sc-edit-note');

    var layout = $$(Layout, {
      width: 'large'
    });

    // TODO: Render a mobile optimized header

    // Display top-level errors. E.g. when a doc could not be loaded
    // we will display the notification on top level
    if (this.state.error) {
      layout.append($$(Notification, {
        type: 'error',
        message: this.state.error.message
      }));
    } else if (this.state.session) {
      layout.append(
        $$(NoteReader, {
          mobile: this.props.mobile,
          noteInfo: new NoteInfo(this.state.noteInfo),
          documentSession: this.state.session
        }).ref('noteReader')
      );
    }

    el.append(layout);
    return el;
  };

  this._onCollabClientDisconnected = function() {
    console.log('disconnected');
    this.extendState({
      notification: {
        type: 'error',
        message: 'Connection lost! After reconnecting, your changes will be saved.'
      }
    });
  };

  this._onCollabClientConnected = function() {
    console.log('connected');
    this.extendState({
      notification: null
    });
  };

  /*
    Extract error message for error object. Also consider first cause.
  */
  this._onCollabSessionError = function(err) {
    var message = [
      this.i18n.t(err.name)
    ];
    if (err.cause) {
      message.push(this.i18n.t(err.cause.name));
    }
    this.extendState({
      notification: {
        type: 'error',
        message: message.join(' ')
      }
    });
  };

  this._onCollabSessionSync = function() {
    if (this.state.notification) {
      // Unset notification (error message)
      this.extendState({
        notification: null
      });
    }
  };

  /*
    Loads a document and initializes a CollabSession
  */
  this._loadDocument = function(documentId) {
    var collabClient = this.collabClient;
    var documentClient = this.context.documentClient;

    documentClient.getDocument(documentId, function(err, docRecord) {
      if (err) {
        this.extendState({
          notification: {
            type: 'error',
            message: 'Document could not be loaded.'
          }
        });
        console.error('ERROR', err);
        return;
      }

      var doc = new Note();
      doc = converter.importDocument(doc, docRecord.data);
      var session = new CollabSession(doc, {
        documentId: documentId,
        version: docRecord.version,
        collabClient: collabClient
      });

      // Listen for errors and sync start events for error reporting
      session.on('error', this._onCollabSessionError, this);
      session.on('sync', this._onCollabSessionSync, this);

      // HACK: For debugging purposes
      window.doc = doc;
      window.session = session;

      this.extendState({
        noteInfo: docRecord,
        session: session
      });
    }.bind(this));
  };
};

Component.extend(NoteSection);

module.exports = NoteSection;