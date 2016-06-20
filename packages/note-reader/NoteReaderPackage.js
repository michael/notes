'use strict';

// Base packages
var BasePackage = require('substance/packages/base/BasePackage');
var ParagraphPackage = require('substance/packages/paragraph/ParagraphPackage');
var HeadingPackage = require('substance/packages/heading/HeadingPackage');
var CodeblockPackage = require('substance/packages/codeblock/CodeblockPackage');
var BlockquotePackage = require('substance/packages/blockquote/BlockquotePackage');
var ListPackage = require('substance/packages/list/ListPackage');
var LinkPackage = require('substance/packages/link/LinkPackage');
var EmphasisPackage = require('substance/packages/emphasis/EmphasisPackage');
var StrongPackage = require('substance/packages/strong/StrongPackage');
var CodePackage = require('substance/packages/code/CodePackage');
var PersistencePackage = require('substance/packages/persistence/PersistencePackage');
// Toolbar
var ProseEditorToolbar = require('substance/packages/prose-editor/ProseEditorToolbar');

// Notes specific packages

var CommentPackage = require('../comment/CommentPackage');
var MarkPackage = require('../mark/MarkPackage');
var TodoPackage = require('../todo/TodoPackage');

module.exports = {
  name: 'note-reader',
  configure: function(config) {

    // Import base packages
    config.import(BasePackage);
    config.import(ParagraphPackage);
    config.import(HeadingPackage);
    config.import(CodeblockPackage);
    config.import(BlockquotePackage);
    config.import(ListPackage);
    config.import(EmphasisPackage);
    config.import(StrongPackage);
    config.import(CodePackage);
    config.import(LinkPackage);
    config.import(PersistencePackage);

    // Import note specific packages
    config.import(CommentPackage);
    config.import(MarkPackage);
    config.import(TodoPackage);
  }
};