'use strict';

var oo = require('substance/util/oo');
var map = require('lodash/map');

/*
  Implements Substance Store API. This is just a stub and is used for
  testing.
*/
function UserStore(config) {
  this.db = config.db;
}

UserStore.Prototype = function() {

  /*
    Create a new user record (aka signup)

    @param {Object} userData JSON object
  */
  this.createUser = function(userData) {
    var self = this;

    return this._userExists(userData.userId)
      .then(function(exists){
        if(exists) throw new Error('User already exists');
        return self._createUser(userData);
      }).catch(function(error) {
        console.error(error);
      });
  };

  /*
    Get user record for a given userId

    @param {String} userId user id
  */
  this.getUser = function(userId) {
    var query = this.db('users')
                .where('userId', userId);

    return query
      .then(function(user) {
        if (user.length === 0) {
          throw new Error('No user found for userId ' + userId);
        }
        user = user[0];
        user.userId = user.userId.toString();
        return user;
      }).catch(function(error) {
        console.error(error);
      });
  };

  this.updateUser = function(userId, props) {

  };

  /*
    Get user record for a given loginKey

    @param {String} loginKey login key
  */
  this._getUserByLoginKey = function(loginKey) {
    var query = this.db('users')
                .where('loginKey', loginKey);

    return query
      .then(function(user) {
        if (user.length === 0) {
          throw new Error('Provided login key was invalid.');
        }
        user = user[0];
        return user;
      }).catch(function(error) {
        console.error(error);
      });
  };

  /*
    Internal method to create a user entry
  */
  this._createUser = function(userData) {
    // at some point we should make this more secure
    var loginKey = userData.loginKey || uuid();
    var user = {
      name: userData.name,
      email: userData.email,
      createdAt: Date.now(),
      loginKey: loginKey
    };

    return this.db.table('users').insert(user)
      .then(function(userIds) {
        user.userId = userIds[0];
        return user;
      }).catch(function(error) {
        console.error(error);
      });
  };

  /*
    Check if user exists
  */
  this._userExists = function(id) {
    var query = this.db('users')
                .where('userId', id)
                .limit(1);

    return query.then(function(user) {
      if(user.length === 0) return false;
      return true;
    });
  };

  /*
    Resets the database and loads a given seed object

    Be careful with running this in production

    @param {Object} seed JSON object
  */
  this.seed = function(seed) {
    var self = this;
    var actions = map(seed, self.createUser.bind(self));

    return Promise.all(actions);
  };

};

oo.initClass(UserStore);

module.exports = UserStore;