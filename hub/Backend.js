"use strict";

var connect = require('./connect');
var localFiles = require('./localFiles');
var EventEmitter = require('substance/util/EventEmitter');
var _ = require('substance/util/helpers');
var uuid = require('substance/util/uuid');

/*
  Implements example of Substance Backend API.
*/
function Backend(knex, model) {
  this.db = connect(knex.config);
  this.model = model;
  this.storage = localFiles;
  Backend.super.apply(this);
}

Backend.Prototype = function() {
  /*
    Gets changes from the DB.
    @param {String} id changeset id
    @param {String} sinceVersion changes since version (0 = all changes, 1 all except first change)
  */
  this.getChanges = function(id, sinceVersion, cb) {
    var self = this;
    var query = this.db('changes')
                .select('data', 'id')
                .where('changeset', id)
                .andWhere('pos', '>=', sinceVersion)
                .orderBy('pos', 'asc');

    query.asCallback(function(err, changes) {
      if (err) return cb(err);
      changes = _.map(changes, function(c) {return JSON.parse(c.data); });
      self.getVersion(id, function(err, headVersion) {
        return cb(null, headVersion, changes);
      });
    });
  };

  /*
    Add a change to a changeset. Implicitly creates a new changeset
    when the first change is added to
    @param {String} id changeset id
    @param {Object} change as JSON object
  */
  this.addChange = function(id, change, cb) {
    var self = this;
    var user = 'substance bot';

    this.getVersion(id, function(err, headVersion) {
      if (err) return cb(err);
      var version = headVersion + 1;
      var record = {
        id: id + '/' + version,
        changeset: id,
        pos: version,
        data: JSON.stringify(change),
        timestamp: Date.now(),
        user: user
      };

      self.db.table('changes').insert(record)
        .asCallback(function(err) {
          if (err) return cb(err);
          cb(null, version);
        });
    });
  };

  /*
    Gets the version number for a document
  */
  this.getVersion = function(id, cb) {
    // HINT: version = count of changes
    // 0 changes: version = 0
    // 1 change:  version = 1
    var query = this.db('changes')
                .where('changeset', id)
                .count();
    query.asCallback(function(err, count) {
      if (err) return cb(err);
      return cb(null, count[0]['count(*)']);
    });
  };

  /*
    Removes a changeset from the db
    @param {String} id changeset id
  */
  this.deleteChangeset = function(id, cb) {
    var query = this.db('changes')
                .where('changeset', id)
                .del();
    query.asCallback(function(err) {
      return cb(err);
    });
  };

  /*
    Get latest snapshot of document
    @param {String} id changeset id
  */

  this.getSnapshot = function(id, cb) {
    var self = this;
    this.getChanges(id, 0, function(err, version, changes) {
      if(err) return cb(err);
      var doc = new self.model();
      _.each(changes, function(change) {
        _.each(change.ops, function(op){
          doc.data.apply(op);
        });
      });
      cb(null, doc.toJSON(), version);
    });
  };

  /*
    Create a new user record (aka signup)

    @param {Object} userData contains name property
  */
  this.createUser = function(userData, cb) {
    var self = this;

    this.addUser(userData, function(err, user) {
      if(err) return cb(err);
      self.addSession(user.id, function(err, session) {
        if(err) return cb(err);
        cb(null, {
          session: session,
          loginKey: user.loginKey
        });
      });
    });
  };

  this.addUser = function(userData, cb) {
    var loginKey = userData.loginKey || uuid(); // at some point we should make this more secure
    var user = {
      name: userData.name,
      createdAt: Date.now(),
      loginKey: loginKey
    };

    this.db.table('users').insert(user)
      .asCallback(function(err, id) {
        if (err) return cb(err);
        user.id = id;
        cb(null, user);
      });
  }

  /*
    Get user record for a given userId
  */
  this.getUser = function(userId, cb) {
    var query = this.db('users')
                .where('id', id);

    query.asCallback(function(err, user) {
      if (err) return cb(err);
      // Here must be no results handler
      cb(null, user);
    });
  };

  /*
    Get user record for a given loginKey
  */
  this.getUserByKey = function(loginKey, cb) {
    var query = this.db('users')
                .where('loginKey', loginKey);

    query.asCallback(function(err, user) {
      if (err) return cb(err);
      // Here must be no results handler
      cb(null, user);
    });
  };

  /*
    Checks given login data and creates an entry in the session store for valid logins
    Returns a user record and a session token
  */
  this.createSession = function(loginData, cb) {
    var self = this;

    this.getUserByKey(loginData.loginKey, function(err, user) {
      if (err) return cb(err);
      self.addSession(user.id, function(err, session) {
        if (err) return cb(err);
        session.user = user;
        cb(null, session);
      });
    });
  };

  this.addSession = function(userId, cb) {
    var session = {
      sessionToken: uuid(),
      timestamp: Date.now(),
      user: userId
    };

    this.db.table('sessions').insert(session)
      .asCallback(function(err) {
        if (err) return cb(err);
        cb(null, session);
      });
  }

  this.deleteSession = function(/*sessionToken*/) {
    // Actually we don't need this really. Instead we
    // need a maintenance operation that deletes expired sessions.
  };

  this.getSession = function(sessionToken, cb) {
    var self = this;

    var query = this.db('sessions')
                .where('sessionToken', sessionToken);

    query.asCallback(function(err, session) {
      if (err) return cb(err);
      this.getUser(session.user, function(err, user) {
        if (err) return cb(err);
        session.user = user;
        cb(null, session);
      });
    });
  };

  // Get middleware for file uploading
  this.getFileUploader = function(fieldname) {
    return this.storage.uploader.single(fieldname);
  };

  // Get name of stored file
  this.getFileName = function(req) {
    return req.file.filename;
  };
}

EventEmitter.extend(Backend);

module.exports = Backend;