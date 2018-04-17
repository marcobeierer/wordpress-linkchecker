/**
 * jQuery serializeObject
 * @copyright 2014, macek <paulmacek@gmail.com>
 * @link https://github.com/macek/jquery-serialize-object
 * @license BSD
 * @version 2.5.0
 */
!function(e,i){if("function"==typeof define&&define.amd)define(["exports","jquery"],function(e,r){return i(e,r)});else if("undefined"!=typeof exports){var r=require("jquery");i(exports,r)}else i(e,e.jQuery||e.Zepto||e.ender||e.$)}(this,function(e,i){function r(e,r){function n(e,i,r){return e[i]=r,e}function a(e,i){for(var r,a=e.match(t.key);void 0!==(r=a.pop());)if(t.push.test(r)){var u=s(e.replace(/\[\]$/,""));i=n([],u,i)}else t.fixed.test(r)?i=n([],r,i):t.named.test(r)&&(i=n({},r,i));return i}function s(e){return void 0===h[e]&&(h[e]=0),h[e]++}function u(e){switch(i('[name="'+e.name+'"]',r).attr("type")){case"checkbox":return"on"===e.value?!0:e.value;default:return e.value}}function f(i){if(!t.validate.test(i.name))return this;var r=a(i.name,u(i));return l=e.extend(!0,l,r),this}function d(i){if(!e.isArray(i))throw new Error("formSerializer.addPairs expects an Array");for(var r=0,t=i.length;t>r;r++)this.addPair(i[r]);return this}function o(){return l}function c(){return JSON.stringify(o())}var l={},h={};this.addPair=f,this.addPairs=d,this.serialize=o,this.serializeJSON=c}var t={validate:/^[a-z_][a-z0-9_]*(?:\[(?:\d*|[a-z0-9_]+)\])*$/i,key:/[a-z0-9_]+|(?=\[\])/gi,push:/^$/,fixed:/^\d+$/,named:/^[a-z0-9_]+$/i};return r.patterns=t,r.serializeObject=function(){return new r(i,this).addPairs(this.serializeArray()).serialize()},r.serializeJSON=function(){return new r(i,this).addPairs(this.serializeArray()).serializeJSON()},"undefined"!=typeof i.fn&&(i.fn.serializeObject=r.serializeObject,i.fn.serializeJSON=r.serializeJSON),e.FormSerializer=r,r});
/**
 * lscache library
 * Copyright (c) 2011, Pamela Fox
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* jshint undef:true, browser:true, node:true */
/* global define */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module !== "undefined" && module.exports) {
        // CommonJS/Node module
        module.exports = factory();
    } else {
        // Browser globals
        root.lscache = factory();
    }
}(this, function () {

  // Prefix for all lscache keys
  var CACHE_PREFIX = 'lscache-';

  // Suffix for the key name on the expiration items in localStorage
  var CACHE_SUFFIX = '-cacheexpiration';

  // expiration date radix (set to Base-36 for most space savings)
  var EXPIRY_RADIX = 10;

  // time resolution in minutes
  var EXPIRY_UNITS = 60 * 1000;

  // ECMAScript max Date (epoch + 1e8 days)
  var MAX_DATE = Math.floor(8.64e15/EXPIRY_UNITS);

  var cachedStorage;
  var cachedJSON;
  var cacheBucket = '';
  var warnings = false;

  // Determines if localStorage is supported in the browser;
  // result is cached for better performance instead of being run each time.
  // Feature detection is based on how Modernizr does it;
  // it's not straightforward due to FF4 issues.
  // It's not run at parse-time as it takes 200ms in Android.
  function supportsStorage() {
    var key = '__lscachetest__';
    var value = key;

    if (cachedStorage !== undefined) {
      return cachedStorage;
    }

    // some browsers will throw an error if you try to access local storage (e.g. brave browser)
    // hence check is inside a try/catch
    try {
      if (!localStorage) {
        return false;
      }
    } catch (ex) {
      return false;
    }

    try {
      setItem(key, value);
      removeItem(key);
      cachedStorage = true;
    } catch (e) {
        // If we hit the limit, and we don't have an empty localStorage then it means we have support
        if (isOutOfSpace(e) && localStorage.length) {
            cachedStorage = true; // just maxed it out and even the set test failed.
        } else {
            cachedStorage = false;
        }
    }
    return cachedStorage;
  }

  // Check to set if the error is us dealing with being out of space
  function isOutOfSpace(e) {
    return e && (
      e.name === 'QUOTA_EXCEEDED_ERR' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.name === 'QuotaExceededError'
    );
  }

  // Determines if native JSON (de-)serialization is supported in the browser.
  function supportsJSON() {
    /*jshint eqnull:true */
    if (cachedJSON === undefined) {
      cachedJSON = (window.JSON != null);
    }
    return cachedJSON;
  }

  /**
   * Returns a string where all RegExp special characters are escaped with a \.
   * @param {String} text
   * @return {string}
   */
  function escapeRegExpSpecialCharacters(text) {
    return text.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
  }

  /**
   * Returns the full string for the localStorage expiration item.
   * @param {String} key
   * @return {string}
   */
  function expirationKey(key) {
    return key + CACHE_SUFFIX;
  }

  /**
   * Returns the number of minutes since the epoch.
   * @return {number}
   */
  function currentTime() {
    return Math.floor((new Date().getTime())/EXPIRY_UNITS);
  }

  /**
   * Wrapper functions for localStorage methods
   */

  function getItem(key) {
    return localStorage.getItem(CACHE_PREFIX + cacheBucket + key);
  }

  function setItem(key, value) {
    // Fix for iPad issue - sometimes throws QUOTA_EXCEEDED_ERR on setItem.
    localStorage.removeItem(CACHE_PREFIX + cacheBucket + key);
    localStorage.setItem(CACHE_PREFIX + cacheBucket + key, value);
  }

  function removeItem(key) {
    localStorage.removeItem(CACHE_PREFIX + cacheBucket + key);
  }

  function eachKey(fn) {
    var prefixRegExp = new RegExp('^' + CACHE_PREFIX + escapeRegExpSpecialCharacters(cacheBucket) + '(.*)');
    // Loop in reverse as removing items will change indices of tail
    for (var i = localStorage.length-1; i >= 0 ; --i) {
      var key = localStorage.key(i);
      key = key && key.match(prefixRegExp);
      key = key && key[1];
      if (key && key.indexOf(CACHE_SUFFIX) < 0) {
        fn(key, expirationKey(key));
      }
    }
  }

  function flushItem(key) {
    var exprKey = expirationKey(key);

    removeItem(key);
    removeItem(exprKey);
  }

  function flushExpiredItem(key) {
    var exprKey = expirationKey(key);
    var expr = getItem(exprKey);

    if (expr) {
      var expirationTime = parseInt(expr, EXPIRY_RADIX);

      // Check if we should actually kick item out of storage
      if (currentTime() >= expirationTime) {
        removeItem(key);
        removeItem(exprKey);
        return true;
      }
    }
  }

  function warn(message, err) {
    if (!warnings) return;
    if (!('console' in window) || typeof window.console.warn !== 'function') return;
    window.console.warn("lscache - " + message);
    if (err) window.console.warn("lscache - The error was: " + err.message);
  }

  var lscache = {
    /**
     * Stores the value in localStorage. Expires after specified number of minutes.
     * @param {string} key
     * @param {Object|string} value
     * @param {number} time
     */
    set: function(key, value, time) {
      if (!supportsStorage()) return;

      // If we don't get a string value, try to stringify
      // In future, localStorage may properly support storing non-strings
      // and this can be removed.

      if (!supportsJSON()) return;
      try {
        value = JSON.stringify(value);
      } catch (e) {
        // Sometimes we can't stringify due to circular refs
        // in complex objects, so we won't bother storing then.
        return;
      }

      try {
        setItem(key, value);
      } catch (e) {
        if (isOutOfSpace(e)) {
          // If we exceeded the quota, then we will sort
          // by the expire time, and then remove the N oldest
          var storedKeys = [];
          var storedKey;
          eachKey(function(key, exprKey) {
            var expiration = getItem(exprKey);
            if (expiration) {
              expiration = parseInt(expiration, EXPIRY_RADIX);
            } else {
              // TODO: Store date added for non-expiring items for smarter removal
              expiration = MAX_DATE;
            }
            storedKeys.push({
              key: key,
              size: (getItem(key) || '').length,
              expiration: expiration
            });
          });
          // Sorts the keys with oldest expiration time last
          storedKeys.sort(function(a, b) { return (b.expiration-a.expiration); });

          var targetSize = (value||'').length;
          while (storedKeys.length && targetSize > 0) {
            storedKey = storedKeys.pop();
            warn("Cache is full, removing item with key '" + key + "'");
            flushItem(storedKey.key);
            targetSize -= storedKey.size;
          }
          try {
            setItem(key, value);
          } catch (e) {
            // value may be larger than total quota
            warn("Could not add item with key '" + key + "', perhaps it's too big?", e);
            return;
          }
        } else {
          // If it was some other error, just give up.
          warn("Could not add item with key '" + key + "'", e);
          return;
        }
      }

      // If a time is specified, store expiration info in localStorage
      if (time) {
        setItem(expirationKey(key), (currentTime() + time).toString(EXPIRY_RADIX));
      } else {
        // In case they previously set a time, remove that info from localStorage.
        removeItem(expirationKey(key));
      }
    },

    /**
     * Retrieves specified value from localStorage, if not expired.
     * @param {string} key
     * @return {string|Object}
     */
    get: function(key) {
      if (!supportsStorage()) return null;

      // Return the de-serialized item if not expired
      if (flushExpiredItem(key)) { return null; }

      // Tries to de-serialize stored value if its an object, and returns the normal value otherwise.
      var value = getItem(key);
      if (!value || !supportsJSON()) {
        return value;
      }

      try {
        // We can't tell if its JSON or a string, so we try to parse
        return JSON.parse(value);
      } catch (e) {
        // If we can't parse, it's probably because it isn't an object
        return value;
      }
    },

    /**
     * Removes a value from localStorage.
     * Equivalent to 'delete' in memcache, but that's a keyword in JS.
     * @param {string} key
     */
    remove: function(key) {
      if (!supportsStorage()) return;

      flushItem(key);
    },

    /**
     * Returns whether local storage is supported.
     * Currently exposed for testing purposes.
     * @return {boolean}
     */
    supported: function() {
      return supportsStorage();
    },

    /**
     * Flushes all lscache items and expiry markers without affecting rest of localStorage
     */
    flush: function() {
      if (!supportsStorage()) return;

      eachKey(function(key) {
        flushItem(key);
      });
    },

    /**
     * Flushes expired lscache items and expiry markers without affecting rest of localStorage
     */
    flushExpired: function() {
      if (!supportsStorage()) return;

      eachKey(function(key) {
        flushExpiredItem(key);
      });
    },

    /**
     * Appends CACHE_PREFIX so lscache will partition data in to different buckets.
     * @param {string} bucket
     */
    setBucket: function(bucket) {
      cacheBucket = bucket;
    },

    /**
     * Resets the string being appended to CACHE_PREFIX so lscache will use the default storage behavior.
     */
    resetBucket: function() {
      cacheBucket = '';
    },

    /**
     * Sets whether to display warnings when an item is removed from the cache or not.
     */
    enableWarnings: function(enabled) {
      warnings = enabled;
    }
  };

  // Return the module
  return lscache;
}));
/* Riot v3.9.0, @license MIT */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.riot = {})));
}(this, (function (exports) { 'use strict';

/**
 * Shorter and fast way to select a single node in the DOM
 * @param   { String } selector - unique dom selector
 * @param   { Object } ctx - DOM node where the target of our search will is located
 * @returns { Object } dom node found
 */
function $(selector, ctx) {
  return (ctx || document).querySelector(selector)
}

var
  // be aware, internal usage
  // ATTENTION: prefix the global dynamic variables with `__`
  // tags instances cache
  __TAGS_CACHE = [],
  // tags implementation cache
  __TAG_IMPL = {},
  YIELD_TAG = 'yield',

  /**
   * Const
   */
  GLOBAL_MIXIN = '__global_mixin',

  // riot specific prefixes or attributes
  ATTRS_PREFIX = 'riot-',

  // Riot Directives
  REF_DIRECTIVES = ['ref', 'data-ref'],
  IS_DIRECTIVE = 'data-is',
  CONDITIONAL_DIRECTIVE = 'if',
  LOOP_DIRECTIVE = 'each',
  LOOP_NO_REORDER_DIRECTIVE = 'no-reorder',
  SHOW_DIRECTIVE = 'show',
  HIDE_DIRECTIVE = 'hide',
  KEY_DIRECTIVE = 'key',
  RIOT_EVENTS_KEY = '__riot-events__',

  // for typeof == '' comparisons
  T_STRING = 'string',
  T_OBJECT = 'object',
  T_UNDEF  = 'undefined',
  T_FUNCTION = 'function',

  XLINK_NS = 'http://www.w3.org/1999/xlink',
  SVG_NS = 'http://www.w3.org/2000/svg',
  XLINK_REGEX = /^xlink:(\w+)/,

  WIN = typeof window === T_UNDEF ? undefined : window,

  // special native tags that cannot be treated like the others
  RE_SPECIAL_TAGS = /^(?:t(?:body|head|foot|[rhd])|caption|col(?:group)?|opt(?:ion|group))$/,
  RE_SPECIAL_TAGS_NO_OPTION = /^(?:t(?:body|head|foot|[rhd])|caption|col(?:group)?)$/,
  RE_EVENTS_PREFIX = /^on/,
  RE_HTML_ATTRS = /([-\w]+) ?= ?(?:"([^"]*)|'([^']*)|({[^}]*}))/g,
  // some DOM attributes must be normalized
  CASE_SENSITIVE_ATTRIBUTES = {
    'viewbox': 'viewBox',
    'preserveaspectratio': 'preserveAspectRatio'
  },
  /**
   * Matches boolean HTML attributes in the riot tag definition.
   * With a long list like this, a regex is faster than `[].indexOf` in most browsers.
   * @const {RegExp}
   * @see [attributes.md](https://github.com/riot/compiler/blob/dev/doc/attributes.md)
   */
  RE_BOOL_ATTRS = /^(?:disabled|checked|readonly|required|allowfullscreen|auto(?:focus|play)|compact|controls|default|formnovalidate|hidden|ismap|itemscope|loop|multiple|muted|no(?:resize|shade|validate|wrap)?|open|reversed|seamless|selected|sortable|truespeed|typemustmatch)$/,
  // version# for IE 8-11, 0 for others
  IE_VERSION = (WIN && WIN.document || {}).documentMode | 0;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

/**
 * Create a generic DOM node
 * @param   { String } name - name of the DOM node we want to create
 * @returns { Object } DOM node just created
 */
function makeElement(name) {
  return name === 'svg' ? document.createElementNS(SVG_NS, name) : document.createElement(name)
}

/**
 * Set any DOM attribute
 * @param { Object } dom - DOM node we want to update
 * @param { String } name - name of the property we want to set
 * @param { String } val - value of the property we want to set
 */
function setAttribute(dom, name, val) {
  var xlink = XLINK_REGEX.exec(name);
  if (xlink && xlink[1])
    { dom.setAttributeNS(XLINK_NS, xlink[1], val); }
  else
    { dom.setAttribute(name, val); }
}

var styleNode;
// Create cache and shortcut to the correct property
var cssTextProp;
var byName = {};
var remainder = [];
var needsInject = false;

// skip the following code on the server
if (WIN) {
  styleNode = ((function () {
    // create a new style element with the correct type
    var newNode = makeElement('style');
    // replace any user node or insert the new one into the head
    var userNode = $('style[type=riot]');

    setAttribute(newNode, 'type', 'text/css');
    /* istanbul ignore next */
    if (userNode) {
      if (userNode.id) { newNode.id = userNode.id; }
      userNode.parentNode.replaceChild(newNode, userNode);
    } else { document.head.appendChild(newNode); }

    return newNode
  }))();
  cssTextProp = styleNode.styleSheet;
}

/**
 * Object that will be used to inject and manage the css of every tag instance
 */
var styleManager = {
  styleNode: styleNode,
  /**
   * Save a tag style to be later injected into DOM
   * @param { String } css - css string
   * @param { String } name - if it's passed we will map the css to a tagname
   */
  add: function add(css, name) {
    if (name) { byName[name] = css; }
    else { remainder.push(css); }
    needsInject = true;
  },
  /**
   * Inject all previously saved tag styles into DOM
   * innerHTML seems slow: http://jsperf.com/riot-insert-style
   */
  inject: function inject() {
    if (!WIN || !needsInject) { return }
    needsInject = false;
    var style = Object.keys(byName)
      .map(function (k) { return byName[k]; })
      .concat(remainder).join('\n');
    /* istanbul ignore next */
    if (cssTextProp) { cssTextProp.cssText = style; }
    else { styleNode.innerHTML = style; }
  }
}

/**
 * The riot template engine
 * @version v3.0.8
 */

var skipRegex = (function () { //eslint-disable-line no-unused-vars

  var beforeReChars = '[{(,;:?=|&!^~>%*/';

  var beforeReWords = [
    'case',
    'default',
    'do',
    'else',
    'in',
    'instanceof',
    'prefix',
    'return',
    'typeof',
    'void',
    'yield'
  ];

  var wordsLastChar = beforeReWords.reduce(function (s, w) {
    return s + w.slice(-1)
  }, '');

  var RE_REGEX = /^\/(?=[^*>/])[^[/\\]*(?:(?:\\.|\[(?:\\.|[^\]\\]*)*\])[^[\\/]*)*?\/[gimuy]*/;
  var RE_VN_CHAR = /[$\w]/;

  function prev (code, pos) {
    while (--pos >= 0 && /\s/.test(code[pos])){ }
    return pos
  }

  function _skipRegex (code, start) {

    var re = /.*/g;
    var pos = re.lastIndex = start++;
    var match = re.exec(code)[0].match(RE_REGEX);

    if (match) {
      var next = pos + match[0].length;

      pos = prev(code, pos);
      var c = code[pos];

      if (pos < 0 || ~beforeReChars.indexOf(c)) {
        return next
      }

      if (c === '.') {

        if (code[pos - 1] === '.') {
          start = next;
        }

      } else if (c === '+' || c === '-') {

        if (code[--pos] !== c ||
            (pos = prev(code, pos)) < 0 ||
            !RE_VN_CHAR.test(code[pos])) {
          start = next;
        }

      } else if (~wordsLastChar.indexOf(c)) {

        var end = pos + 1;

        while (--pos >= 0 && RE_VN_CHAR.test(code[pos])){ }
        if (~beforeReWords.indexOf(code.slice(pos + 1, end))) {
          start = next;
        }
      }
    }

    return start
  }

  return _skipRegex

})();

/**
 * riot.util.brackets
 *
 * - `brackets    ` - Returns a string or regex based on its parameter
 * - `brackets.set` - Change the current riot brackets
 *
 * @module
 */

/* global riot */

/* istanbul ignore next */
var brackets = (function (UNDEF) {

  var
    REGLOB = 'g',

    R_MLCOMMS = /\/\*[^*]*\*+(?:[^*\/][^*]*\*+)*\//g,

    R_STRINGS = /"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'|`[^`\\]*(?:\\[\S\s][^`\\]*)*`/g,

    S_QBLOCKS = R_STRINGS.source + '|' +
      /(?:\breturn\s+|(?:[$\w\)\]]|\+\+|--)\s*(\/)(?![*\/]))/.source + '|' +
      /\/(?=[^*\/])[^[\/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[\/\\]*)*?([^<]\/)[gim]*/.source,

    UNSUPPORTED = RegExp('[\\' + 'x00-\\x1F<>a-zA-Z0-9\'",;\\\\]'),

    NEED_ESCAPE = /(?=[[\]()*+?.^$|])/g,

    S_QBLOCK2 = R_STRINGS.source + '|' + /(\/)(?![*\/])/.source,

    FINDBRACES = {
      '(': RegExp('([()])|'   + S_QBLOCK2, REGLOB),
      '[': RegExp('([[\\]])|' + S_QBLOCK2, REGLOB),
      '{': RegExp('([{}])|'   + S_QBLOCK2, REGLOB)
    },

    DEFAULT = '{ }';;;;;;;;;

  var _pairs = [
    '{', '}',
    '{', '}',
    /{[^}]*}/,
    /\\([{}])/g,
    /\\({)|{/g,
    RegExp('\\\\(})|([[({])|(})|' + S_QBLOCK2, REGLOB),
    DEFAULT,
    /^\s*{\^?\s*([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S.*)\s*}/,
    /(^|[^\\]){=[\S\s]*?}/
  ];

  var
    cachedBrackets = UNDEF,
    _regex,
    _cache = [],
    _settings;;;;

  function _loopback (re) { return re }

  function _rewrite (re, bp) {
    if (!bp) { bp = _cache; }
    return new RegExp(
      re.source.replace(/{/g, bp[2]).replace(/}/g, bp[3]), re.global ? REGLOB : ''
    )
  }

  function _create (pair) {
    if (pair === DEFAULT) { return _pairs }

    var arr = pair.split(' ');

    if (arr.length !== 2 || UNSUPPORTED.test(pair)) {
      throw new Error('Unsupported brackets "' + pair + '"')
    }
    arr = arr.concat(pair.replace(NEED_ESCAPE, '\\').split(' '));

    arr[4] = _rewrite(arr[1].length > 1 ? /{[\S\s]*?}/ : _pairs[4], arr);
    arr[5] = _rewrite(pair.length > 3 ? /\\({|})/g : _pairs[5], arr);
    arr[6] = _rewrite(_pairs[6], arr);
    arr[7] = RegExp('\\\\(' + arr[3] + ')|([[({])|(' + arr[3] + ')|' + S_QBLOCK2, REGLOB);
    arr[8] = pair;
    return arr
  }

  function _brackets (reOrIdx) {
    return reOrIdx instanceof RegExp ? _regex(reOrIdx) : _cache[reOrIdx]
  }

  _brackets.split = function split (str, tmpl, _bp) {
    // istanbul ignore next: _bp is for the compiler
    if (!_bp) { _bp = _cache; }

    var
      parts = [],
      match,
      isexpr,
      start,
      pos,
      re = _bp[6];;;;;;

    var qblocks = [];
    var prevStr = '';
    var mark, lastIndex;;

    isexpr = start = re.lastIndex = 0;

    while ((match = re.exec(str))) {

      lastIndex = re.lastIndex;
      pos = match.index;

      if (isexpr) {

        if (match[2]) {

          var ch = match[2];
          var rech = FINDBRACES[ch];
          var ix = 1;

          rech.lastIndex = lastIndex;
          while ((match = rech.exec(str))) {
            if (match[1]) {
              if (match[1] === ch) { ++ix; }
              else if (!--ix) { break }
            } else {
              rech.lastIndex = pushQBlock(match.index, rech.lastIndex, match[2]);
            }
          }
          re.lastIndex = ix ? str.length : rech.lastIndex;
          continue
        }

        if (!match[3]) {
          re.lastIndex = pushQBlock(pos, lastIndex, match[4]);
          continue
        }
      }

      if (!match[1]) {
        unescapeStr(str.slice(start, pos));
        start = re.lastIndex;
        re = _bp[6 + (isexpr ^= 1)];
        re.lastIndex = start;
      }
    }

    if (str && start < str.length) {
      unescapeStr(str.slice(start));
    }

    parts.qblocks = qblocks;

    return parts

    function unescapeStr (s) {
      if (prevStr) {
        s = prevStr + s;
        prevStr = '';
      }
      if (tmpl || isexpr) {
        parts.push(s && s.replace(_bp[5], '$1'));
      } else {
        parts.push(s);
      }
    }

    function pushQBlock(_pos, _lastIndex, slash) { //eslint-disable-line
      if (slash) {
        _lastIndex = skipRegex(str, _pos);
      }

      if (tmpl && _lastIndex > _pos + 2) {
        mark = '\u2057' + qblocks.length + '~';
        qblocks.push(str.slice(_pos, _lastIndex));
        prevStr += str.slice(start, _pos) + mark;
        start = _lastIndex;
      }
      return _lastIndex
    }
  };

  _brackets.hasExpr = function hasExpr (str) {
    return _cache[4].test(str)
  };

  _brackets.loopKeys = function loopKeys (expr) {
    var m = expr.match(_cache[9]);

    return m
      ? { key: m[1], pos: m[2], val: _cache[0] + m[3].trim() + _cache[1] }
      : { val: expr.trim() }
  };

  _brackets.array = function array (pair) {
    return pair ? _create(pair) : _cache
  };

  function _reset (pair) {
    if ((pair || (pair = DEFAULT)) !== _cache[8]) {
      _cache = _create(pair);
      _regex = pair === DEFAULT ? _loopback : _rewrite;
      _cache[9] = _regex(_pairs[9]);
    }
    cachedBrackets = pair;
  }

  function _setSettings (o) {
    var b;

    o = o || {};
    b = o.brackets;
    Object.defineProperty(o, 'brackets', {
      set: _reset,
      get: function () { return cachedBrackets },
      enumerable: true
    });
    _settings = o;
    _reset(b);
  }

  Object.defineProperty(_brackets, 'settings', {
    set: _setSettings,
    get: function () { return _settings }
  });

  /* istanbul ignore next: in the browser riot is always in the scope */
  _brackets.settings = typeof riot !== 'undefined' && riot.settings || {};
  _brackets.set = _reset;
  _brackets.skipRegex = skipRegex;

  _brackets.R_STRINGS = R_STRINGS;
  _brackets.R_MLCOMMS = R_MLCOMMS;
  _brackets.S_QBLOCKS = S_QBLOCKS;
  _brackets.S_QBLOCK2 = S_QBLOCK2;

  return _brackets

})();

/**
 * @module tmpl
 *
 * tmpl          - Root function, returns the template value, render with data
 * tmpl.hasExpr  - Test the existence of a expression inside a string
 * tmpl.loopKeys - Get the keys for an 'each' loop (used by `_each`)
 */

/* istanbul ignore next */
var tmpl = (function () {

  var _cache = {};

  function _tmpl (str, data) {
    if (!str) { return str }

    return (_cache[str] || (_cache[str] = _create(str))).call(
      data, _logErr.bind({
        data: data,
        tmpl: str
      })
    )
  }

  _tmpl.hasExpr = brackets.hasExpr;

  _tmpl.loopKeys = brackets.loopKeys;

  // istanbul ignore next
  _tmpl.clearCache = function () { _cache = {}; };

  _tmpl.errorHandler = null;

  function _logErr (err, ctx) {

    err.riotData = {
      tagName: ctx && ctx.__ && ctx.__.tagName,
      _riot_id: ctx && ctx._riot_id  //eslint-disable-line camelcase
    };

    if (_tmpl.errorHandler) { _tmpl.errorHandler(err); }
    else if (
      typeof console !== 'undefined' &&
      typeof console.error === 'function'
    ) {
      console.error(err.message);
      console.log('<%s> %s', err.riotData.tagName || 'Unknown tag', this.tmpl); // eslint-disable-line
      console.log(this.data); // eslint-disable-line
    }
  }

  function _create (str) {
    var expr = _getTmpl(str);

    if (expr.slice(0, 11) !== 'try{return ') { expr = 'return ' + expr; }

    return new Function('E', expr + ';')    // eslint-disable-line no-new-func
  }

  var RE_DQUOTE = /\u2057/g;
  var RE_QBMARK = /\u2057(\d+)~/g;

  function _getTmpl (str) {
    var parts = brackets.split(str.replace(RE_DQUOTE, '"'), 1);
    var qstr = parts.qblocks;
    var expr;

    if (parts.length > 2 || parts[0]) {
      var i, j, list = [];;;

      for (i = j = 0; i < parts.length; ++i) {

        expr = parts[i];

        if (expr && (expr = i & 1

            ? _parseExpr(expr, 1, qstr)

            : '"' + expr
                .replace(/\\/g, '\\\\')
                .replace(/\r\n?|\n/g, '\\n')
                .replace(/"/g, '\\"') +
              '"'

          )) { list[j++] = expr; }

      }

      expr = j < 2 ? list[0]
           : '[' + list.join(',') + '].join("")';

    } else {

      expr = _parseExpr(parts[1], 0, qstr);
    }

    if (qstr.length) {
      expr = expr.replace(RE_QBMARK, function (_, pos) {
        return qstr[pos]
          .replace(/\r/g, '\\r')
          .replace(/\n/g, '\\n')
      });
    }
    return expr
  }

  var RE_CSNAME = /^(?:(-?[_A-Za-z\xA0-\xFF][-\w\xA0-\xFF]*)|\u2057(\d+)~):/;
  var
    RE_BREND = {
      '(': /[()]/g,
      '[': /[[\]]/g,
      '{': /[{}]/g
    };

  function _parseExpr (expr, asText, qstr) {

    expr = expr
      .replace(/\s+/g, ' ').trim()
      .replace(/\ ?([[\({},?\.:])\ ?/g, '$1');

    if (expr) {
      var
        list = [],
        cnt = 0,
        match;;;

      while (expr &&
            (match = expr.match(RE_CSNAME)) &&
            !match.index
        ) {
        var
          key,
          jsb,
          re = /,|([[{(])|$/g;;;

        expr = RegExp.rightContext;
        key  = match[2] ? qstr[match[2]].slice(1, -1).trim().replace(/\s+/g, ' ') : match[1];

        while (jsb = (match = re.exec(expr))[1]) { skipBraces(jsb, re); }

        jsb  = expr.slice(0, match.index);
        expr = RegExp.rightContext;

        list[cnt++] = _wrapExpr(jsb, 1, key);
      }

      expr = !cnt ? _wrapExpr(expr, asText)
           : cnt > 1 ? '[' + list.join(',') + '].join(" ").trim()' : list[0];
    }
    return expr

    function skipBraces (ch, re) {
      var
        mm,
        lv = 1,
        ir = RE_BREND[ch];;;

      ir.lastIndex = re.lastIndex;
      while (mm = ir.exec(expr)) {
        if (mm[0] === ch) { ++lv; }
        else if (!--lv) { break }
      }
      re.lastIndex = lv ? expr.length : ir.lastIndex;
    }
  }

  // istanbul ignore next: not both
  var // eslint-disable-next-line max-len
    JS_CONTEXT = '"in this?this:' + (typeof window !== 'object' ? 'global' : 'window') + ').',
    JS_VARNAME = /[,{][\$\w]+(?=:)|(^ *|[^$\w\.{])(?!(?:typeof|true|false|null|undefined|in|instanceof|is(?:Finite|NaN)|void|NaN|new|Date|RegExp|Math)(?![$\w]))([$_A-Za-z][$\w]*)/g,
    JS_NOPROPS = /^(?=(\.[$\w]+))\1(?:[^.[(]|$)/;;;

  function _wrapExpr (expr, asText, key) {
    var tb;

    expr = expr.replace(JS_VARNAME, function (match, p, mvar, pos, s) {
      if (mvar) {
        pos = tb ? 0 : pos + match.length;

        if (mvar !== 'this' && mvar !== 'global' && mvar !== 'window') {
          match = p + '("' + mvar + JS_CONTEXT + mvar;
          if (pos) { tb = (s = s[pos]) === '.' || s === '(' || s === '['; }
        } else if (pos) {
          tb = !JS_NOPROPS.test(s.slice(pos));
        }
      }
      return match
    });

    if (tb) {
      expr = 'try{return ' + expr + '}catch(e){E(e,this)}';
    }

    if (key) {

      expr = (tb
          ? 'function(){' + expr + '}.call(this)' : '(' + expr + ')'
        ) + '?"' + key + '":""';

    } else if (asText) {

      expr = 'function(v){' + (tb
          ? expr.replace('return ', 'v=') : 'v=(' + expr + ')'
        ) + ';return v||v===0?v:""}.call(this)';
    }

    return expr
  }

  _tmpl.version = brackets.version = 'v3.0.8';

  return _tmpl

})();

/* istanbul ignore next */
var observable = function(el) {

  /**
   * Extend the original object or create a new empty one
   * @type { Object }
   */

  el = el || {};

  /**
   * Private variables
   */
  var callbacks = {},
    slice = Array.prototype.slice;;

  /**
   * Public Api
   */

  // extend the el object adding the observable methods
  Object.defineProperties(el, {
    /**
     * Listen to the given `event` ands
     * execute the `callback` each time an event is triggered.
     * @param  { String } event - event id
     * @param  { Function } fn - callback function
     * @returns { Object } el
     */
    on: {
      value: function(event, fn) {
        if (typeof fn == 'function')
          { (callbacks[event] = callbacks[event] || []).push(fn); }
        return el
      },
      enumerable: false,
      writable: false,
      configurable: false
    },

    /**
     * Removes the given `event` listeners
     * @param   { String } event - event id
     * @param   { Function } fn - callback function
     * @returns { Object } el
     */
    off: {
      value: function(event, fn) {
        if (event == '*' && !fn) { callbacks = {}; }
        else {
          if (fn) {
            var arr = callbacks[event];
            for (var i = 0, cb; cb = arr && arr[i]; ++i) {
              if (cb == fn) { arr.splice(i--, 1); }
            }
          } else { delete callbacks[event]; }
        }
        return el
      },
      enumerable: false,
      writable: false,
      configurable: false
    },

    /**
     * Listen to the given `event` and
     * execute the `callback` at most once
     * @param   { String } event - event id
     * @param   { Function } fn - callback function
     * @returns { Object } el
     */
    one: {
      value: function(event, fn) {
        function on() {
          el.off(event, on);
          fn.apply(el, arguments);
        }
        return el.on(event, on)
      },
      enumerable: false,
      writable: false,
      configurable: false
    },

    /**
     * Execute all callback functions that listen to
     * the given `event`
     * @param   { String } event - event id
     * @returns { Object } el
     */
    trigger: {
      value: function(event) {
        var arguments$1 = arguments;


        // getting the arguments
        var arglen = arguments.length - 1,
          args = new Array(arglen),
          fns,
          fn,
          i;;;;;

        for (i = 0; i < arglen; i++) {
          args[i] = arguments$1[i + 1]; // skip first argument
        }

        fns = slice.call(callbacks[event] || [], 0);

        for (i = 0; fn = fns[i]; ++i) {
          fn.apply(el, args);
        }

        if (callbacks['*'] && event != '*')
          { el.trigger.apply(el, ['*', event].concat(args)); }

        return el
      },
      enumerable: false,
      writable: false,
      configurable: false
    }
  });

  return el

};

/**
 * Short alias for Object.getOwnPropertyDescriptor
 */
function getPropDescriptor (o, k) {
  return Object.getOwnPropertyDescriptor(o, k)
}

/**
 * Check if passed argument is undefined
 * @param   { * } value -
 * @returns { Boolean } -
 */
function isUndefined(value) {
  return typeof value === T_UNDEF
}

/**
 * Check whether object's property could be overridden
 * @param   { Object }  obj - source object
 * @param   { String }  key - object property
 * @returns { Boolean } true if writable
 */
function isWritable(obj, key) {
  var descriptor = getPropDescriptor(obj, key);
  return isUndefined(obj[key]) || descriptor && descriptor.writable
}

/**
 * Extend any object with other properties
 * @param   { Object } src - source object
 * @returns { Object } the resulting extended object
 *
 * var obj = { foo: 'baz' }
 * extend(obj, {bar: 'bar', foo: 'bar'})
 * console.log(obj) => {bar: 'bar', foo: 'bar'}
 *
 */
function extend(src) {
  var obj;
  var i = 1;
  var args = arguments;
  var l = args.length;

  for (; i < l; i++) {
    if (obj = args[i]) {
      for (var key in obj) {
        // check if this property of the source object could be overridden
        if (isWritable(src, key))
          { src[key] = obj[key]; }
      }
    }
  }
  return src
}

/**
 * Alias for Object.create
 */
function create(src) {
  return Object.create(src)
}

var settings = extend(create(brackets.settings), {
  skipAnonymousTags: true,
  // handle the auto updates on any DOM event
  autoUpdate: true
})

/**
 * Shorter and fast way to select multiple nodes in the DOM
 * @param   { String } selector - DOM selector
 * @param   { Object } ctx - DOM node where the targets of our search will is located
 * @returns { Object } dom nodes found
 */
function $$(selector, ctx) {
  return [].slice.call((ctx || document).querySelectorAll(selector))
}

/**
 * Create a document text node
 * @returns { Object } create a text node to use as placeholder
 */
function createDOMPlaceholder() {
  return document.createTextNode('')
}

/**
 * Toggle the visibility of any DOM node
 * @param   { Object }  dom - DOM node we want to hide
 * @param   { Boolean } show - do we want to show it?
 */

function toggleVisibility(dom, show) {
  dom.style.display = show ? '' : 'none';
  dom.hidden = show ? false : true;
}

/**
 * Get the value of any DOM attribute on a node
 * @param   { Object } dom - DOM node we want to parse
 * @param   { String } name - name of the attribute we want to get
 * @returns { String | undefined } name of the node attribute whether it exists
 */
function getAttribute(dom, name) {
  return dom.getAttribute(name)
}

/**
 * Remove any DOM attribute from a node
 * @param   { Object } dom - DOM node we want to update
 * @param   { String } name - name of the property we want to remove
 */
function removeAttribute(dom, name) {
  dom.removeAttribute(name);
}

/**
 * Set the inner html of any DOM node SVGs included
 * @param { Object } container - DOM node where we'll inject new html
 * @param { String } html - html to inject
 * @param { Boolean } isSvg - svg tags should be treated a bit differently
 */
/* istanbul ignore next */
function setInnerHTML(container, html, isSvg) {
  // innerHTML is not supported on svg tags so we neet to treat them differently
  if (isSvg) {
    var node = container.ownerDocument.importNode(
      new DOMParser()
        .parseFromString(("<svg xmlns=\"" + SVG_NS + "\">" + html + "</svg>"), 'application/xml')
        .documentElement,
      true
    );

    container.appendChild(node);
  } else {
    container.innerHTML = html;
  }
}

/**
 * Minimize risk: only zero or one _space_ between attr & value
 * @param   { String }   html - html string we want to parse
 * @param   { Function } fn - callback function to apply on any attribute found
 */
function walkAttributes(html, fn) {
  if (!html) { return }
  var m;
  while (m = RE_HTML_ATTRS.exec(html))
    { fn(m[1].toLowerCase(), m[2] || m[3] || m[4]); }
}

/**
 * Create a document fragment
 * @returns { Object } document fragment
 */
function createFragment() {
  return document.createDocumentFragment()
}

/**
 * Insert safely a tag to fix #1962 #1649
 * @param   { HTMLElement } root - children container
 * @param   { HTMLElement } curr - node to insert
 * @param   { HTMLElement } next - node that should preceed the current node inserted
 */
function safeInsert(root, curr, next) {
  root.insertBefore(curr, next.parentNode && next);
}

/**
 * Convert a style object to a string
 * @param   { Object } style - style object we need to parse
 * @returns { String } resulting css string
 * @example
 * styleObjectToString({ color: 'red', height: '10px'}) // => 'color: red; height: 10px'
 */
function styleObjectToString(style) {
  return Object.keys(style).reduce(function (acc, prop) {
    return (acc + " " + prop + ": " + (style[prop]) + ";")
  }, '')
}

/**
 * Walk down recursively all the children tags starting dom node
 * @param   { Object }   dom - starting node where we will start the recursion
 * @param   { Function } fn - callback to transform the child node just found
 * @param   { Object }   context - fn can optionally return an object, which is passed to children
 */
function walkNodes(dom, fn, context) {
  if (dom) {
    var res = fn(dom, context);
    var next;
    // stop the recursion
    if (res === false) { return }

    dom = dom.firstChild;

    while (dom) {
      next = dom.nextSibling;
      walkNodes(dom, fn, res);
      dom = next;
    }
  }
}



var dom = Object.freeze({
	$$: $$,
	$: $,
	createDOMPlaceholder: createDOMPlaceholder,
	mkEl: makeElement,
	setAttr: setAttribute,
	toggleVisibility: toggleVisibility,
	getAttr: getAttribute,
	remAttr: removeAttribute,
	setInnerHTML: setInnerHTML,
	walkAttrs: walkAttributes,
	createFrag: createFragment,
	safeInsert: safeInsert,
	styleObjectToString: styleObjectToString,
	walkNodes: walkNodes
});

/**
 * Check against the null and undefined values
 * @param   { * }  value -
 * @returns {Boolean} -
 */
function isNil(value) {
  return isUndefined(value) || value === null
}

/**
 * Check if passed argument is empty. Different from falsy, because we dont consider 0 or false to be blank
 * @param { * } value -
 * @returns { Boolean } -
 */
function isBlank(value) {
  return isNil(value) || value === ''
}

/**
 * Check if passed argument is a function
 * @param   { * } value -
 * @returns { Boolean } -
 */
function isFunction(value) {
  return typeof value === T_FUNCTION
}

/**
 * Check if passed argument is an object, exclude null
 * NOTE: use isObject(x) && !isArray(x) to excludes arrays.
 * @param   { * } value -
 * @returns { Boolean } -
 */
function isObject(value) {
  return value && typeof value === T_OBJECT // typeof null is 'object'
}

/**
 * Check if a DOM node is an svg tag or part of an svg
 * @param   { HTMLElement }  el - node we want to test
 * @returns {Boolean} true if it's an svg node
 */
function isSvg(el) {
  var owner = el.ownerSVGElement;
  return !!owner || owner === null
}

/**
 * Check if passed argument is a kind of array
 * @param   { * } value -
 * @returns { Boolean } -
 */
function isArray(value) {
  return Array.isArray(value) || value instanceof Array
}

/**
 * Check if the passed argument is a boolean attribute
 * @param   { String } value -
 * @returns { Boolean } -
 */
function isBoolAttr(value) {
  return RE_BOOL_ATTRS.test(value)
}

/**
 * Check if passed argument is a string
 * @param   { * } value -
 * @returns { Boolean } -
 */
function isString(value) {
  return typeof value === T_STRING
}



var check = Object.freeze({
	isBlank: isBlank,
	isFunction: isFunction,
	isObject: isObject,
	isSvg: isSvg,
	isWritable: isWritable,
	isArray: isArray,
	isBoolAttr: isBoolAttr,
	isNil: isNil,
	isString: isString,
	isUndefined: isUndefined
});

/**
 * Check whether an array contains an item
 * @param   { Array } array - target array
 * @param   { * } item - item to test
 * @returns { Boolean } -
 */
function contains(array, item) {
  return array.indexOf(item) !== -1
}

/**
 * Specialized function for looping an array-like collection with `each={}`
 * @param   { Array } list - collection of items
 * @param   {Function} fn - callback function
 * @returns { Array } the array looped
 */
function each(list, fn) {
  var len = list ? list.length : 0;
  var i = 0;
  for (; i < len; i++) { fn(list[i], i); }
  return list
}

/**
 * Faster String startsWith alternative
 * @param   { String } str - source string
 * @param   { String } value - test string
 * @returns { Boolean } -
 */
function startsWith(str, value) {
  return str.slice(0, value.length) === value
}

/**
 * Function returning always a unique identifier
 * @returns { Number } - number from 0...n
 */
var uid = (function uid() {
  var i = -1;
  return function () { return ++i; }
})()

/**
 * Helper function to set an immutable property
 * @param   { Object } el - object where the new property will be set
 * @param   { String } key - object key where the new property will be stored
 * @param   { * } value - value of the new property
 * @param   { Object } options - set the propery overriding the default options
 * @returns { Object } - the initial object
 */
function define(el, key, value, options) {
  Object.defineProperty(el, key, extend({
    value: value,
    enumerable: false,
    writable: false,
    configurable: true
  }, options));
  return el
}

/**
 * Convert a string containing dashes to camel case
 * @param   { String } str - input string
 * @returns { String } my-string -> myString
 */
function toCamel(str) {
  return str.replace(/-(\w)/g, function (_, c) { return c.toUpperCase(); })
}

/**
 * Warn a message via console
 * @param   {String} message - warning message
 */
function warn(message) {
  if (console && console.warn) { console.warn(message); }
}



var misc = Object.freeze({
	contains: contains,
	each: each,
	getPropDescriptor: getPropDescriptor,
	startsWith: startsWith,
	uid: uid,
	defineProperty: define,
	objectCreate: create,
	extend: extend,
	toCamel: toCamel,
	warn: warn
});

/**
 * Set the property of an object for a given key. If something already
 * exists there, then it becomes an array containing both the old and new value.
 * @param { Object } obj - object on which to set the property
 * @param { String } key - property name
 * @param { Object } value - the value of the property to be set
 * @param { Boolean } ensureArray - ensure that the property remains an array
 * @param { Number } index - add the new item in a certain array position
 */
function arrayishAdd(obj, key, value, ensureArray, index) {
  var dest = obj[key];
  var isArr = isArray(dest);
  var hasIndex = !isUndefined(index);

  if (dest && dest === value) { return }

  // if the key was never set, set it once
  if (!dest && ensureArray) { obj[key] = [value]; }
  else if (!dest) { obj[key] = value; }
  // if it was an array and not yet set
  else {
    if (isArr) {
      var oldIndex = dest.indexOf(value);
      // this item never changed its position
      if (oldIndex === index) { return }
      // remove the item from its old position
      if (oldIndex !== -1) { dest.splice(oldIndex, 1); }
      // move or add the item
      if (hasIndex) {
        dest.splice(index, 0, value);
      } else {
        dest.push(value);
      }
    } else { obj[key] = [dest, value]; }
  }
}

/**
 * Detect the tag implementation by a DOM node
 * @param   { Object } dom - DOM node we need to parse to get its tag implementation
 * @returns { Object } it returns an object containing the implementation of a custom tag (template and boot function)
 */
function get(dom) {
  return dom.tagName && __TAG_IMPL[getAttribute(dom, IS_DIRECTIVE) ||
    getAttribute(dom, IS_DIRECTIVE) || dom.tagName.toLowerCase()]
}

/**
 * Get the tag name of any DOM node
 * @param   { Object } dom - DOM node we want to parse
 * @param   { Boolean } skipDataIs - hack to ignore the data-is attribute when attaching to parent
 * @returns { String } name to identify this dom node in riot
 */
function getName(dom, skipDataIs) {
  var child = get(dom);
  var namedTag = !skipDataIs && getAttribute(dom, IS_DIRECTIVE);
  return namedTag && !tmpl.hasExpr(namedTag) ?
    namedTag : child ? child.name : dom.tagName.toLowerCase()
}

/**
 * Return a temporary context containing also the parent properties
 * @this Tag
 * @param { Tag } - temporary tag context containing all the parent properties
 */
function inheritParentProps() {
  if (this.parent) { return extend(create(this), this.parent) }
  return this
}

/*
  Includes hacks needed for the Internet Explorer version 9 and below
  See: http://kangax.github.io/compat-table/es5/#ie8
       http://codeplanet.io/dropping-ie8/
*/

var
  reHasYield  = /<yield\b/i,
  reYieldAll  = /<yield\s*(?:\/>|>([\S\s]*?)<\/yield\s*>|>)/ig,
  reYieldSrc  = /<yield\s+to=['"]([^'">]*)['"]\s*>([\S\s]*?)<\/yield\s*>/ig,
  reYieldDest = /<yield\s+from=['"]?([-\w]+)['"]?\s*(?:\/>|>([\S\s]*?)<\/yield\s*>)/ig,
  rootEls = { tr: 'tbody', th: 'tr', td: 'tr', col: 'colgroup' },
  tblTags = IE_VERSION && IE_VERSION < 10 ? RE_SPECIAL_TAGS : RE_SPECIAL_TAGS_NO_OPTION,
  GENERIC = 'div',
  SVG = 'svg';;;;;;;;


/*
  Creates the root element for table or select child elements:
  tr/th/td/thead/tfoot/tbody/caption/col/colgroup/option/optgroup
*/
function specialTags(el, tmpl, tagName) {

  var
    select = tagName[0] === 'o',
    parent = select ? 'select>' : 'table>';;

  // trim() is important here, this ensures we don't have artifacts,
  // so we can check if we have only one element inside the parent
  el.innerHTML = '<' + parent + tmpl.trim() + '</' + parent;
  parent = el.firstChild;

  // returns the immediate parent if tr/th/td/col is the only element, if not
  // returns the whole tree, as this can include additional elements
  /* istanbul ignore next */
  if (select) {
    parent.selectedIndex = -1;  // for IE9, compatible w/current riot behavior
  } else {
    // avoids insertion of cointainer inside container (ex: tbody inside tbody)
    var tname = rootEls[tagName];
    if (tname && parent.childElementCount === 1) { parent = $(tname, parent); }
  }
  return parent
}

/*
  Replace the yield tag from any tag template with the innerHTML of the
  original tag in the page
*/
function replaceYield(tmpl, html) {
  // do nothing if no yield
  if (!reHasYield.test(tmpl)) { return tmpl }

  // be careful with #1343 - string on the source having `$1`
  var src = {};

  html = html && html.replace(reYieldSrc, function (_, ref, text) {
    src[ref] = src[ref] || text;   // preserve first definition
    return ''
  }).trim();

  return tmpl
    .replace(reYieldDest, function (_, ref, def) {  // yield with from - to attrs
      return src[ref] || def || ''
    })
    .replace(reYieldAll, function (_, def) {        // yield without any "from"
      return html || def || ''
    })
}

/**
 * Creates a DOM element to wrap the given content. Normally an `DIV`, but can be
 * also a `TABLE`, `SELECT`, `TBODY`, `TR`, or `COLGROUP` element.
 *
 * @param   { String } tmpl  - The template coming from the custom tag definition
 * @param   { String } html - HTML content that comes from the DOM element where you
 *           will mount the tag, mostly the original tag in the page
 * @param   { Boolean } isSvg - true if the root node is an svg
 * @returns { HTMLElement } DOM element with _tmpl_ merged through `YIELD` with the _html_.
 */
function mkdom(tmpl, html, isSvg) {
  var match   = tmpl && tmpl.match(/^\s*<([-\w]+)/);
  var  tagName = match && match[1].toLowerCase();
  var el = makeElement(isSvg ? SVG : GENERIC);

  // replace all the yield tags with the tag inner html
  tmpl = replaceYield(tmpl, html);

  /* istanbul ignore next */
  if (tblTags.test(tagName))
    { el = specialTags(el, tmpl, tagName); }
  else
    { setInnerHTML(el, tmpl, isSvg); }

  return el
}

/**
 * Loop backward all the parents tree to detect the first custom parent tag
 * @param   { Object } tag - a Tag instance
 * @returns { Object } the instance of the first custom parent tag found
 */
function getImmediateCustomParent(tag) {
  var ptag = tag;
  while (ptag.__.isAnonymous) {
    if (!ptag.parent) { break }
    ptag = ptag.parent;
  }
  return ptag
}

/**
 * Trigger DOM events
 * @param   { HTMLElement } dom - dom element target of the event
 * @param   { Function } handler - user function
 * @param   { Object } e - event object
 */
function handleEvent(dom, handler, e) {
  var ptag = this.__.parent;
  var item = this.__.item;

  if (!item)
    { while (ptag && !item) {
      item = ptag.__.item;
      ptag = ptag.__.parent;
    } }

  // override the event properties
  /* istanbul ignore next */
  if (isWritable(e, 'currentTarget')) { e.currentTarget = dom; }
  /* istanbul ignore next */
  if (isWritable(e, 'target')) { e.target = e.srcElement; }
  /* istanbul ignore next */
  if (isWritable(e, 'which')) { e.which = e.charCode || e.keyCode; }

  e.item = item;

  handler.call(this, e);

  // avoid auto updates
  if (!settings.autoUpdate) { return }

  if (!e.preventUpdate) {
    var p = getImmediateCustomParent(this);
    // fixes #2083
    if (p.isMounted) { p.update(); }
  }
}

/**
 * Attach an event to a DOM node
 * @param { String } name - event name
 * @param { Function } handler - event callback
 * @param { Object } dom - dom node
 * @param { Tag } tag - tag instance
 */
function setEventHandler(name, handler, dom, tag) {
  var eventName;
  var cb = handleEvent.bind(tag, dom, handler);

  // avoid to bind twice the same event
  // possible fix for #2332
  dom[name] = null;

  // normalize event name
  eventName = name.replace(RE_EVENTS_PREFIX, '');

  // cache the listener into the listeners array
  if (!contains(tag.__.listeners, dom)) { tag.__.listeners.push(dom); }
  if (!dom[RIOT_EVENTS_KEY]) { dom[RIOT_EVENTS_KEY] = {}; }
  if (dom[RIOT_EVENTS_KEY][name]) { dom.removeEventListener(eventName, dom[RIOT_EVENTS_KEY][name]); }

  dom[RIOT_EVENTS_KEY][name] = cb;
  dom.addEventListener(eventName, cb, false);
}

/**
 * Create a new child tag including it correctly into its parent
 * @param   { Object } child - child tag implementation
 * @param   { Object } opts - tag options containing the DOM node where the tag will be mounted
 * @param   { String } innerHTML - inner html of the child node
 * @param   { Object } parent - instance of the parent tag including the child custom tag
 * @returns { Object } instance of the new child tag just created
 */
function initChild(child, opts, innerHTML, parent) {
  var tag = createTag(child, opts, innerHTML);
  var tagName = opts.tagName || getName(opts.root, true);
  var ptag = getImmediateCustomParent(parent);
  // fix for the parent attribute in the looped elements
  define(tag, 'parent', ptag);
  // store the real parent tag
  // in some cases this could be different from the custom parent tag
  // for example in nested loops
  tag.__.parent = parent;

  // add this tag to the custom parent tag
  arrayishAdd(ptag.tags, tagName, tag);

  // and also to the real parent tag
  if (ptag !== parent)
    { arrayishAdd(parent.tags, tagName, tag); }

  return tag
}

/**
 * Removes an item from an object at a given key. If the key points to an array,
 * then the item is just removed from the array.
 * @param { Object } obj - object on which to remove the property
 * @param { String } key - property name
 * @param { Object } value - the value of the property to be removed
 * @param { Boolean } ensureArray - ensure that the property remains an array
*/
function arrayishRemove(obj, key, value, ensureArray) {
  if (isArray(obj[key])) {
    var index = obj[key].indexOf(value);
    if (index !== -1) { obj[key].splice(index, 1); }
    if (!obj[key].length) { delete obj[key]; }
    else if (obj[key].length === 1 && !ensureArray) { obj[key] = obj[key][0]; }
  } else if (obj[key] === value)
    { delete obj[key]; } // otherwise just delete the key
}

/**
 * Adds the elements for a virtual tag
 * @this Tag
 * @param { Node } src - the node that will do the inserting or appending
 * @param { Tag } target - only if inserting, insert before this tag's first child
 */
function makeVirtual(src, target) {
  var this$1 = this;

  var head = createDOMPlaceholder();
  var tail = createDOMPlaceholder();
  var frag = createFragment();
  var sib;
  var el;

  this.root.insertBefore(head, this.root.firstChild);
  this.root.appendChild(tail);

  this.__.head = el = head;
  this.__.tail = tail;

  while (el) {
    sib = el.nextSibling;
    frag.appendChild(el);
    this$1.__.virts.push(el); // hold for unmounting
    el = sib;
  }

  if (target)
    { src.insertBefore(frag, target.__.head); }
  else
    { src.appendChild(frag); }
}

/**
 * makes a tag virtual and replaces a reference in the dom
 * @this Tag
 * @param { tag } the tag to make virtual
 * @param { ref } the dom reference location
 */
function makeReplaceVirtual(tag, ref) {
  var frag = createFragment();
  makeVirtual.call(tag, frag);
  ref.parentNode.replaceChild(frag, ref);
}

/**
 * Update dynamically created data-is tags with changing expressions
 * @param { Object } expr - expression tag and expression info
 * @param { Tag }    parent - parent for tag creation
 * @param { String } tagName - tag implementation we want to use
 */
function updateDataIs(expr, parent, tagName) {
  var tag = expr.tag || expr.dom._tag;
  var ref;

  var ref$1 = tag ? tag.__ : {};
  var head = ref$1.head;
  var isVirtual = expr.dom.tagName === 'VIRTUAL';

  if (tag && expr.tagName === tagName) {
    tag.update();
    return
  }

  // sync _parent to accommodate changing tagnames
  if (tag) {
    // need placeholder before unmount
    if(isVirtual) {
      ref = createDOMPlaceholder();
      head.parentNode.insertBefore(ref, head);
    }

    tag.unmount(true);
  }

  // unable to get the tag name
  if (!isString(tagName)) { return }

  expr.impl = __TAG_IMPL[tagName];

  // unknown implementation
  if (!expr.impl) { return }

  expr.tag = tag = initChild(
    expr.impl, {
      root: expr.dom,
      parent: parent,
      tagName: tagName
    },
    expr.dom.innerHTML,
    parent
  );

  each(expr.attrs, function (a) { return setAttribute(tag.root, a.name, a.value); });
  expr.tagName = tagName;
  tag.mount();

  // root exist first time, after use placeholder
  if (isVirtual) { makeReplaceVirtual(tag, ref || tag.root); }

  // parent is the placeholder tag, not the dynamic tag so clean up
  parent.__.onUnmount = function () {
    var delName = tag.opts.dataIs;
    arrayishRemove(tag.parent.tags, delName, tag);
    arrayishRemove(tag.__.parent.tags, delName, tag);
    tag.unmount();
  };
}

/**
 * Nomalize any attribute removing the "riot-" prefix
 * @param   { String } attrName - original attribute name
 * @returns { String } valid html attribute name
 */
function normalizeAttrName(attrName) {
  if (!attrName) { return null }
  attrName = attrName.replace(ATTRS_PREFIX, '');
  if (CASE_SENSITIVE_ATTRIBUTES[attrName]) { attrName = CASE_SENSITIVE_ATTRIBUTES[attrName]; }
  return attrName
}

/**
 * Update on single tag expression
 * @this Tag
 * @param { Object } expr - expression logic
 * @returns { undefined }
 */
function updateExpression(expr) {
  if (this.root && getAttribute(this.root,'virtualized')) { return }

  var dom = expr.dom;
  // remove the riot- prefix
  var attrName = normalizeAttrName(expr.attr);
  var isToggle = contains([SHOW_DIRECTIVE, HIDE_DIRECTIVE], attrName);
  var isVirtual = expr.root && expr.root.tagName === 'VIRTUAL';
  var ref = this.__;
  var isAnonymous = ref.isAnonymous;
  var parent = dom && (expr.parent || dom.parentNode);
  // detect the style attributes
  var isStyleAttr = attrName === 'style';
  var isClassAttr = attrName === 'class';

  var value;

  // if it's a tag we could totally skip the rest
  if (expr._riot_id) {
    if (expr.__.wasCreated) {
      expr.update();
    // if it hasn't been mounted yet, do that now.
    } else {
      expr.mount();
      if (isVirtual) {
        makeReplaceVirtual(expr, expr.root);
      }
    }
    return
  }

  // if this expression has the update method it means it can handle the DOM changes by itself
  if (expr.update) { return expr.update() }

  var context = isToggle && !isAnonymous ? inheritParentProps.call(this) : this;

  // ...it seems to be a simple expression so we try to calculate its value
  value = tmpl(expr.expr, context);

  var hasValue = !isBlank(value);
  var isObj = isObject(value);

  // convert the style/class objects to strings
  if (isObj) {
    if (isClassAttr) {
      value = tmpl(JSON.stringify(value), this);
    } else if (isStyleAttr) {
      value = styleObjectToString(value);
    }
  }

  // remove original attribute
  if (expr.attr && (!expr.wasParsedOnce || !hasValue || value === false)) {
    // remove either riot-* attributes or just the attribute name
    removeAttribute(dom, getAttribute(dom, expr.attr) ? expr.attr : attrName);
  }

  // for the boolean attributes we don't need the value
  // we can convert it to checked=true to checked=checked
  if (expr.bool) { value = value ? attrName : false; }
  if (expr.isRtag) { return updateDataIs(expr, this, value) }
  if (expr.wasParsedOnce && expr.value === value) { return }

  // update the expression value
  expr.value = value;
  expr.wasParsedOnce = true;

  // if the value is an object (and it's not a style or class attribute) we can not do much more with it
  if (isObj && !isClassAttr && !isStyleAttr && !isToggle) { return }
  // avoid to render undefined/null values
  if (!hasValue) { value = ''; }

  // textarea and text nodes have no attribute name
  if (!attrName) {
    // about #815 w/o replace: the browser converts the value to a string,
    // the comparison by "==" does too, but not in the server
    value += '';
    // test for parent avoids error with invalid assignment to nodeValue
    if (parent) {
      // cache the parent node because somehow it will become null on IE
      // on the next iteration
      expr.parent = parent;
      if (parent.tagName === 'TEXTAREA') {
        parent.value = value;                    // #1113
        if (!IE_VERSION) { dom.nodeValue = value; }  // #1625 IE throws here, nodeValue
      }                                         // will be available on 'updated'
      else { dom.nodeValue = value; }
    }
    return
  }


  // event handler
  if (isFunction(value)) {
    setEventHandler(attrName, value, dom, this);
  // show / hide
  } else if (isToggle) {
    toggleVisibility(dom, attrName === HIDE_DIRECTIVE ? !value : value);
  // handle attributes
  } else {
    if (expr.bool) {
      dom[attrName] = value;
    }

    if (attrName === 'value' && dom.value !== value) {
      dom.value = value;
    } else if (hasValue && value !== false) {
      setAttribute(dom, attrName, value);
    }

    // make sure that in case of style changes
    // the element stays hidden
    if (isStyleAttr && dom.hidden) { toggleVisibility(dom, false); }
  }
}

/**
 * Update all the expressions in a Tag instance
 * @this Tag
 * @param { Array } expressions - expression that must be re evaluated
 */
function update(expressions) {
  each(expressions, updateExpression.bind(this));
}

/**
 * We need to update opts for this tag. That requires updating the expressions
 * in any attributes on the tag, and then copying the result onto opts.
 * @this Tag
 * @param   {Boolean} isLoop - is it a loop tag?
 * @param   { Tag }  parent - parent tag node
 * @param   { Boolean }  isAnonymous - is it a tag without any impl? (a tag not registered)
 * @param   { Object }  opts - tag options
 * @param   { Array }  instAttrs - tag attributes array
 */
function updateOpts(isLoop, parent, isAnonymous, opts, instAttrs) {
  // isAnonymous `each` tags treat `dom` and `root` differently. In this case
  // (and only this case) we don't need to do updateOpts, because the regular parse
  // will update those attrs. Plus, isAnonymous tags don't need opts anyway
  if (isLoop && isAnonymous) { return }
  var ctx = isLoop ? inheritParentProps.call(this) : parent || this;

  each(instAttrs, function (attr) {
    if (attr.expr) { updateExpression.call(ctx, attr.expr); }
    // normalize the attribute names
    opts[toCamel(attr.name).replace(ATTRS_PREFIX, '')] = attr.expr ? attr.expr.value : attr.value;
  });
}

/**
 * Update the tag expressions and options
 * @param { Tag } tag - tag object
 * @param { * } data - data we want to use to extend the tag properties
 * @param { Array } expressions - component expressions array
 * @returns { Tag } the current tag instance
 */
function componentUpdate(tag, data, expressions) {
  var __ = tag.__;
  var nextOpts = {};
  var canTrigger = tag.isMounted && !__.skipAnonymous;

  // inherit properties from the parent tag
  if (__.isAnonymous && __.parent) { extend(tag, __.parent); }
  extend(tag, data);

  updateOpts.apply(tag, [__.isLoop, __.parent, __.isAnonymous, nextOpts, __.instAttrs]);

  if (
    canTrigger &&
    tag.isMounted &&
    isFunction(tag.shouldUpdate) && !tag.shouldUpdate(data, nextOpts)
  ) {
    return tag
  }

  extend(tag.opts, nextOpts);

  if (canTrigger) { tag.trigger('update', data); }
  update.call(tag, expressions);
  if (canTrigger) { tag.trigger('updated'); }

  return tag
}

/**
 * Get selectors for tags
 * @param   { Array } tags - tag names to select
 * @returns { String } selector
 */
function query(tags) {
  // select all tags
  if (!tags) {
    var keys = Object.keys(__TAG_IMPL);
    return keys + query(keys)
  }

  return tags
    .filter(function (t) { return !/[^-\w]/.test(t); })
    .reduce(function (list, t) {
      var name = t.trim().toLowerCase();
      return list + ",[" + IS_DIRECTIVE + "=\"" + name + "\"]"
    }, '')
}

/**
 * Another way to create a riot tag a bit more es6 friendly
 * @param { HTMLElement } el - tag DOM selector or DOM node/s
 * @param { Object } opts - tag logic
 * @returns { Tag } new riot tag instance
 */
function Tag(el, opts) {
  // get the tag properties from the class constructor
  var ref = this;
  var name = ref.name;
  var tmpl = ref.tmpl;
  var css = ref.css;
  var attrs = ref.attrs;
  var onCreate = ref.onCreate;
  // register a new tag and cache the class prototype
  if (!__TAG_IMPL[name]) {
    tag(name, tmpl, css, attrs, onCreate);
    // cache the class constructor
    __TAG_IMPL[name].class = this.constructor;
  }

  // mount the tag using the class instance
  mount$1(el, name, opts, this);
  // inject the component css
  if (css) { styleManager.inject(); }

  return this
}

/**
 * Create a new riot tag implementation
 * @param   { String }   name - name/id of the new riot tag
 * @param   { String }   tmpl - tag template
 * @param   { String }   css - custom tag css
 * @param   { String }   attrs - root tag attributes
 * @param   { Function } fn - user function
 * @returns { String } name/id of the tag just created
 */
function tag(name, tmpl, css, attrs, fn) {
  if (isFunction(attrs)) {
    fn = attrs;

    if (/^[\w-]+\s?=/.test(css)) {
      attrs = css;
      css = '';
    } else
      { attrs = ''; }
  }

  if (css) {
    if (isFunction(css))
      { fn = css; }
    else
      { styleManager.add(css); }
  }

  name = name.toLowerCase();
  __TAG_IMPL[name] = { name: name, tmpl: tmpl, attrs: attrs, fn: fn };

  return name
}

/**
 * Create a new riot tag implementation (for use by the compiler)
 * @param   { String }   name - name/id of the new riot tag
 * @param   { String }   tmpl - tag template
 * @param   { String }   css - custom tag css
 * @param   { String }   attrs - root tag attributes
 * @param   { Function } fn - user function
 * @returns { String } name/id of the tag just created
 */
function tag2(name, tmpl, css, attrs, fn) {
  if (css) { styleManager.add(css, name); }

  __TAG_IMPL[name] = { name: name, tmpl: tmpl, attrs: attrs, fn: fn };

  return name
}

/**
 * Mount a tag using a specific tag implementation
 * @param   { * } selector - tag DOM selector or DOM node/s
 * @param   { String } tagName - tag implementation name
 * @param   { Object } opts - tag logic
 * @returns { Array } new tags instances
 */
function mount(selector, tagName, opts) {
  var tags = [];
  var elem, allTags;;

  function pushTagsTo(root) {
    if (root.tagName) {
      var riotTag = getAttribute(root, IS_DIRECTIVE), tag;;

      // have tagName? force riot-tag to be the same
      if (tagName && riotTag !== tagName) {
        riotTag = tagName;
        setAttribute(root, IS_DIRECTIVE, tagName);
      }

      tag = mount$1(root, riotTag || root.tagName.toLowerCase(), opts);

      if (tag)
        { tags.push(tag); }
    } else if (root.length)
      { each(root, pushTagsTo); } // assume nodeList
  }

  // inject styles into DOM
  styleManager.inject();

  if (isObject(tagName)) {
    opts = tagName;
    tagName = 0;
  }

  // crawl the DOM to find the tag
  if (isString(selector)) {
    selector = selector === '*' ?
      // select all registered tags
      // & tags found with the riot-tag attribute set
      allTags = query() :
      // or just the ones named like the selector
      selector + query(selector.split(/, */));

    // make sure to pass always a selector
    // to the querySelectorAll function
    elem = selector ? $$(selector) : [];
  }
  else
    // probably you have passed already a tag or a NodeList
    { elem = selector; }

  // select all the registered and mount them inside their root elements
  if (tagName === '*') {
    // get all custom tags
    tagName = allTags || query();
    // if the root els it's just a single tag
    if (elem.tagName)
      { elem = $$(tagName, elem); }
    else {
      // select all the children for all the different root elements
      var nodeList = [];

      each(elem, function (_el) { return nodeList.push($$(tagName, _el)); });

      elem = nodeList;
    }
    // get rid of the tagName
    tagName = 0;
  }

  pushTagsTo(elem);

  return tags
}

// Create a mixin that could be globally shared across all the tags
var mixins = {};
var globals = mixins[GLOBAL_MIXIN] = {};
var mixins_id = 0;

/**
 * Create/Return a mixin by its name
 * @param   { String }  name - mixin name (global mixin if object)
 * @param   { Object }  mix - mixin logic
 * @param   { Boolean } g - is global?
 * @returns { Object }  the mixin logic
 */
function mixin(name, mix, g) {
  // Unnamed global
  if (isObject(name)) {
    mixin(("__" + (mixins_id++) + "__"), name, true);
    return
  }

  var store = g ? globals : mixins;

  // Getter
  if (!mix) {
    if (isUndefined(store[name]))
      { throw new Error(("Unregistered mixin: " + name)) }

    return store[name]
  }

  // Setter
  store[name] = isFunction(mix) ?
    extend(mix.prototype, store[name] || {}) && mix :
    extend(store[name] || {}, mix);
}

/**
 * Update all the tags instances created
 * @returns { Array } all the tags instances
 */
function update$1() {
  return each(__TAGS_CACHE, function (tag) { return tag.update(); })
}

function unregister(name) {
  __TAG_IMPL[name] = null;
}

var version = 'v3.9.0';


var core = Object.freeze({
	Tag: Tag,
	tag: tag,
	tag2: tag2,
	mount: mount,
	mixin: mixin,
	update: update$1,
	unregister: unregister,
	version: version
});

/**
 * Add a mixin to this tag
 * @returns { Tag } the current tag instance
 */
function componentMixin(tag$$1) {
  var mixins = [], len = arguments.length - 1;
  while ( len-- > 0 ) mixins[ len ] = arguments[ len + 1 ];

  each(mixins, function (mix) {
    var instance;
    var obj;
    var props = [];

    // properties blacklisted and will not be bound to the tag instance
    var propsBlacklist = ['init', '__proto__'];

    mix = isString(mix) ? mixin(mix) : mix;

    // check if the mixin is a function
    if (isFunction(mix)) {
      // create the new mixin instance
      instance = new mix();
    } else { instance = mix; }

    var proto = Object.getPrototypeOf(instance);

    // build multilevel prototype inheritance chain property list
    do { props = props.concat(Object.getOwnPropertyNames(obj || instance)); }
    while (obj = Object.getPrototypeOf(obj || instance))

    // loop the keys in the function prototype or the all object keys
    each(props, function (key) {
      // bind methods to tag
      // allow mixins to override other properties/parent mixins
      if (!contains(propsBlacklist, key)) {
        // check for getters/setters
        var descriptor = getPropDescriptor(instance, key) || getPropDescriptor(proto, key);
        var hasGetterSetter = descriptor && (descriptor.get || descriptor.set);

        // apply method only if it does not already exist on the instance
        if (!tag$$1.hasOwnProperty(key) && hasGetterSetter) {
          Object.defineProperty(tag$$1, key, descriptor);
        } else {
          tag$$1[key] = isFunction(instance[key]) ?
            instance[key].bind(tag$$1) :
            instance[key];
        }
      }
    });

    // init method will be called automatically
    if (instance.init)
      { instance.init.bind(tag$$1)(tag$$1.opts); }
  });

  return tag$$1
}

/**
 * Move the position of a custom tag in its parent tag
 * @this Tag
 * @param   { String } tagName - key where the tag was stored
 * @param   { Number } newPos - index where the new tag will be stored
 */
function moveChild(tagName, newPos) {
  var parent = this.parent;
  var tags;
  // no parent no move
  if (!parent) { return }

  tags = parent.tags[tagName];

  if (isArray(tags))
    { tags.splice(newPos, 0, tags.splice(tags.indexOf(this), 1)[0]); }
  else { arrayishAdd(parent.tags, tagName, this); }
}

/**
 * Move virtual tag and all child nodes
 * @this Tag
 * @param { Node } src  - the node that will do the inserting
 * @param { Tag } target - insert before this tag's first child
 */
function moveVirtual(src, target) {
  var this$1 = this;

  var el = this.__.head;
  var sib;
  var frag = createFragment();

  while (el) {
    sib = el.nextSibling;
    frag.appendChild(el);
    el = sib;
    if (el === this$1.__.tail) {
      frag.appendChild(el);
      src.insertBefore(frag, target.__.head);
      break
    }
  }
}

/**
 * Convert the item looped into an object used to extend the child tag properties
 * @param   { Object } expr - object containing the keys used to extend the children tags
 * @param   { * } key - value to assign to the new object returned
 * @param   { * } val - value containing the position of the item in the array
 * @param   { Object } base - prototype object for the new item
 * @returns { Object } - new object containing the values of the original item
 *
 * The variables 'key' and 'val' are arbitrary.
 * They depend on the collection type looped (Array, Object)
 * and on the expression used on the each tag
 *
 */
function mkitem(expr, key, val, base) {
  var item = base ? create(base) : {};
  item[expr.key] = key;
  if (expr.pos) { item[expr.pos] = val; }
  return item
}

/**
 * Unmount the redundant tags
 * @param   { Array } items - array containing the current items to loop
 * @param   { Array } tags - array containing all the children tags
 */
function unmountRedundant(items, tags) {
  var i = tags.length;
  var j = items.length;

  while (i > j) {
    i--;
    remove.apply(tags[i], [tags, i]);
  }
}


/**
 * Remove a child tag
 * @this Tag
 * @param   { Array } tags - tags collection
 * @param   { Number } i - index of the tag to remove
 */
function remove(tags, i) {
  tags.splice(i, 1);
  this.unmount();
  arrayishRemove(this.parent, this, this.__.tagName, true);
}

/**
 * Move the nested custom tags in non custom loop tags
 * @this Tag
 * @param   { Number } i - current position of the loop tag
 */
function moveNestedTags(i) {
  var this$1 = this;

  each(Object.keys(this.tags), function (tagName) {
    moveChild.apply(this$1.tags[tagName], [tagName, i]);
  });
}

/**
 * Move a child tag
 * @this Tag
 * @param   { HTMLElement } root - dom node containing all the loop children
 * @param   { Tag } nextTag - instance of the next tag preceding the one we want to move
 * @param   { Boolean } isVirtual - is it a virtual tag?
 */
function move(root, nextTag, isVirtual) {
  if (isVirtual)
    { moveVirtual.apply(this, [root, nextTag]); }
  else
    { safeInsert(root, this.root, nextTag.root); }
}

/**
 * Insert and mount a child tag
 * @this Tag
 * @param   { HTMLElement } root - dom node containing all the loop children
 * @param   { Tag } nextTag - instance of the next tag preceding the one we want to insert
 * @param   { Boolean } isVirtual - is it a virtual tag?
 */
function insert(root, nextTag, isVirtual) {
  if (isVirtual)
    { makeVirtual.apply(this, [root, nextTag]); }
  else
    { safeInsert(root, this.root, nextTag.root); }
}

/**
 * Append a new tag into the DOM
 * @this Tag
 * @param   { HTMLElement } root - dom node containing all the loop children
 * @param   { Boolean } isVirtual - is it a virtual tag?
 */
function append(root, isVirtual) {
  if (isVirtual)
    { makeVirtual.call(this, root); }
  else
    { root.appendChild(this.root); }
}

/**
 * Return the value we want to use to lookup the postion of our items in the collection
 * @param   { String }  keyAttr         - lookup string or expression
 * @param   { * }       originalItem    - original item from the collection
 * @param   { Object }  keyedItem       - object created by riot via { item, i in collection }
 * @param   { Boolean } hasKeyAttrExpr  - flag to check whether the key is an expression
 * @returns { * } value that we will use to figure out the item position via collection.indexOf
 */
function getItemId(keyAttr, originalItem, keyedItem, hasKeyAttrExpr) {
  if (keyAttr) {
    return hasKeyAttrExpr ?  tmpl(keyAttr, keyedItem) :  originalItem[keyAttr]
  }

  return originalItem
}

/**
 * Manage tags having the 'each'
 * @param   { HTMLElement } dom - DOM node we need to loop
 * @param   { Tag } parent - parent tag instance where the dom node is contained
 * @param   { String } expr - string contained in the 'each' attribute
 * @returns { Object } expression object for this each loop
 */
function _each(dom, parent, expr) {
  var mustReorder = typeof getAttribute(dom, LOOP_NO_REORDER_DIRECTIVE) !== T_STRING || removeAttribute(dom, LOOP_NO_REORDER_DIRECTIVE);
  var keyAttr = getAttribute(dom, KEY_DIRECTIVE);
  var hasKeyAttrExpr = keyAttr ? tmpl.hasExpr(keyAttr) : false;
  var tagName = getName(dom);
  var impl = __TAG_IMPL[tagName];
  var parentNode = dom.parentNode;
  var placeholder = createDOMPlaceholder();
  var child = get(dom);
  var ifExpr = getAttribute(dom, CONDITIONAL_DIRECTIVE);
  var tags = [];
  var isLoop = true;
  var innerHTML = dom.innerHTML;
  var isAnonymous = !__TAG_IMPL[tagName];
  var isVirtual = dom.tagName === 'VIRTUAL';
  var oldItems = [];
  var hasKeys;

  // remove the each property from the original tag
  removeAttribute(dom, LOOP_DIRECTIVE);
  removeAttribute(dom, KEY_DIRECTIVE);

  // parse the each expression
  expr = tmpl.loopKeys(expr);
  expr.isLoop = true;

  if (ifExpr) { removeAttribute(dom, CONDITIONAL_DIRECTIVE); }

  // insert a marked where the loop tags will be injected
  parentNode.insertBefore(placeholder, dom);
  parentNode.removeChild(dom);

  expr.update = function updateEach() {
    // get the new items collection
    expr.value = tmpl(expr.val, parent);

    var items = expr.value;
    var frag = createFragment();
    var isObject = !isArray(items) && !isString(items);
    var root = placeholder.parentNode;
    var tmpItems = [];

    // if this DOM was removed the update here is useless
    // this condition fixes also a weird async issue on IE in our unit test
    if (!root) { return }

    // object loop. any changes cause full redraw
    if (isObject) {
      hasKeys = items || false;
      items = hasKeys ?
        Object.keys(items).map(function (key) { return mkitem(expr, items[key], key); }) : [];
    } else {
      hasKeys = false;
    }

    if (ifExpr) {
      items = items.filter(function (item, i) {
        if (expr.key && !isObject)
          { return !!tmpl(ifExpr, mkitem(expr, item, i, parent)) }

        return !!tmpl(ifExpr, extend(create(parent), item))
      });
    }

    // loop all the new items
    each(items, function (_item, i) {
      var item = !hasKeys && expr.key ? mkitem(expr, _item, i) : _item;
      var itemId = getItemId(keyAttr, _item, item, hasKeyAttrExpr);
      // reorder only if the items are objects
      var doReorder = mustReorder && typeof _item === T_OBJECT && !hasKeys;
      var oldPos = oldItems.indexOf(itemId);
      var isNew = oldPos === -1;
      var pos = !isNew && doReorder ? oldPos : i;
      // does a tag exist in this position?
      var tag = tags[pos];
      var mustAppend = i >= oldItems.length;
      var mustCreate =  doReorder && isNew || !doReorder && !tag;

      // new tag
      if (mustCreate) {
        tag = createTag(impl, {
          parent: parent,
          isLoop: isLoop,
          isAnonymous: isAnonymous,
          tagName: tagName,
          root: dom.cloneNode(isAnonymous),
          item: item,
          index: i,
        }, innerHTML);

        // mount the tag
        tag.mount();

        if (mustAppend)
          { append.apply(tag, [frag || root, isVirtual]); }
        else
          { insert.apply(tag, [root, tags[i], isVirtual]); }

        if (!mustAppend) { oldItems.splice(i, 0, item); }
        tags.splice(i, 0, tag);
        if (child) { arrayishAdd(parent.tags, tagName, tag, true); }
      } else if (pos !== i && doReorder) {
        // move
        if (keyAttr || contains(items, oldItems[pos])) {
          move.apply(tag, [root, tags[i], isVirtual]);
          // move the old tag instance
          tags.splice(i, 0, tags.splice(pos, 1)[0]);
          // move the old item
          oldItems.splice(i, 0, oldItems.splice(pos, 1)[0]);
        }

        // update the position attribute if it exists
        if (expr.pos) { tag[expr.pos] = i; }

        // if the loop tags are not custom
        // we need to move all their custom tags into the right position
        if (!child && tag.tags) { moveNestedTags.call(tag, i); }
      }

      // cache the original item to use it in the events bound to this node
      // and its children
      extend(tag.__, {
        item: item,
        index: i,
        parent: parent
      });

      tmpItems[i] = itemId;

      if (!mustCreate) { tag.update(item); }
    });

    // remove the redundant tags
    unmountRedundant(items, tags);

    // clone the items array
    oldItems = tmpItems.slice();

    root.insertBefore(frag, placeholder);
  };

  expr.unmount = function () {
    each(tags, function (t) { t.unmount(); });
  };

  return expr
}

var RefExpr = {
  init: function init(dom, parent, attrName, attrValue) {
    this.dom = dom;
    this.attr = attrName;
    this.rawValue = attrValue;
    this.parent = parent;
    this.hasExp = tmpl.hasExpr(attrValue);
    return this
  },
  update: function update() {
    var old = this.value;
    var customParent = this.parent && getImmediateCustomParent(this.parent);
    // if the referenced element is a custom tag, then we set the tag itself, rather than DOM
    var tagOrDom = this.dom.__ref || this.tag || this.dom;

    this.value = this.hasExp ? tmpl(this.rawValue, this.parent) : this.rawValue;

    // the name changed, so we need to remove it from the old key (if present)
    if (!isBlank(old) && customParent) { arrayishRemove(customParent.refs, old, tagOrDom); }
    if (!isBlank(this.value) && isString(this.value)) {
      // add it to the refs of parent tag (this behavior was changed >=3.0)
      if (customParent) { arrayishAdd(
        customParent.refs,
        this.value,
        tagOrDom,
        // use an array if it's a looped node and the ref is not an expression
        null,
        this.parent.__.index
      ); }

      if (this.value !== old) {
        setAttribute(this.dom, this.attr, this.value);
      }
    } else {
      removeAttribute(this.dom, this.attr);
    }

    // cache the ref bound to this dom node
    // to reuse it in future (see also #2329)
    if (!this.dom.__ref) { this.dom.__ref = tagOrDom; }
  },
  unmount: function unmount() {
    var tagOrDom = this.tag || this.dom;
    var customParent = this.parent && getImmediateCustomParent(this.parent);
    if (!isBlank(this.value) && customParent)
      { arrayishRemove(customParent.refs, this.value, tagOrDom); }
  }
}

/**
 * Create a new ref directive
 * @param   { HTMLElement } dom - dom node having the ref attribute
 * @param   { Tag } context - tag instance where the DOM node is located
 * @param   { String } attrName - either 'ref' or 'data-ref'
 * @param   { String } attrValue - value of the ref attribute
 * @returns { RefExpr } a new RefExpr object
 */
function createRefDirective(dom, tag, attrName, attrValue) {
  return create(RefExpr).init(dom, tag, attrName, attrValue)
}

/**
 * Trigger the unmount method on all the expressions
 * @param   { Array } expressions - DOM expressions
 */
function unmountAll(expressions) {
  each(expressions, function (expr) {
    if (expr.unmount) { expr.unmount(true); }
    else if (expr.tagName) { expr.tag.unmount(true); }
    else if (expr.unmount) { expr.unmount(); }
  });
}

var IfExpr = {
  init: function init(dom, tag, expr) {
    removeAttribute(dom, CONDITIONAL_DIRECTIVE);
    extend(this, { tag: tag, expr: expr, stub: createDOMPlaceholder(), pristine: dom });
    var p = dom.parentNode;
    p.insertBefore(this.stub, dom);
    p.removeChild(dom);

    return this
  },
  update: function update$$1() {
    this.value = tmpl(this.expr, this.tag);

    if (this.value && !this.current) { // insert
      this.current = this.pristine.cloneNode(true);
      this.stub.parentNode.insertBefore(this.current, this.stub);
      this.expressions = parseExpressions.apply(this.tag, [this.current, true]);
    } else if (!this.value && this.current) { // remove
      unmountAll(this.expressions);
      if (this.current._tag) {
        this.current._tag.unmount();
      } else if (this.current.parentNode) {
        this.current.parentNode.removeChild(this.current);
      }
      this.current = null;
      this.expressions = [];
    }

    if (this.value) { update.call(this.tag, this.expressions); }
  },
  unmount: function unmount() {
    unmountAll(this.expressions || []);
  }
}

/**
 * Create a new if directive
 * @param   { HTMLElement } dom - if root dom node
 * @param   { Tag } context - tag instance where the DOM node is located
 * @param   { String } attr - if expression
 * @returns { IFExpr } a new IfExpr object
 */
function createIfDirective(dom, tag, attr) {
  return create(IfExpr).init(dom, tag, attr)
}

/**
 * Walk the tag DOM to detect the expressions to evaluate
 * @this Tag
 * @param   { HTMLElement } root - root tag where we will start digging the expressions
 * @param   { Boolean } mustIncludeRoot - flag to decide whether the root must be parsed as well
 * @returns { Array } all the expressions found
 */
function parseExpressions(root, mustIncludeRoot) {
  var this$1 = this;

  var expressions = [];

  walkNodes(root, function (dom) {
    var type = dom.nodeType;
    var attr;
    var tagImpl;

    if (!mustIncludeRoot && dom === root) { return }

    // text node
    if (type === 3 && dom.parentNode.tagName !== 'STYLE' && tmpl.hasExpr(dom.nodeValue))
      { expressions.push({dom: dom, expr: dom.nodeValue}); }

    if (type !== 1) { return }

    var isVirtual = dom.tagName === 'VIRTUAL';

    // loop. each does it's own thing (for now)
    if (attr = getAttribute(dom, LOOP_DIRECTIVE)) {
      if(isVirtual) { setAttribute(dom, 'loopVirtual', true); } // ignore here, handled in _each
      expressions.push(_each(dom, this$1, attr));
      return false
    }

    // if-attrs become the new parent. Any following expressions (either on the current
    // element, or below it) become children of this expression.
    if (attr = getAttribute(dom, CONDITIONAL_DIRECTIVE)) {
      expressions.push(createIfDirective(dom, this$1, attr));
      return false
    }

    if (attr = getAttribute(dom, IS_DIRECTIVE)) {
      if (tmpl.hasExpr(attr)) {
        expressions.push({
          isRtag: true,
          expr: attr,
          dom: dom,
          attrs: [].slice.call(dom.attributes)
        });

        return false
      }
    }

    // if this is a tag, stop traversing here.
    // we ignore the root, since parseExpressions is called while we're mounting that root
    tagImpl = get(dom);

    if(isVirtual) {
      if(getAttribute(dom, 'virtualized')) {dom.parentElement.removeChild(dom); } // tag created, remove from dom
      if(!tagImpl && !getAttribute(dom, 'virtualized') && !getAttribute(dom, 'loopVirtual'))  // ok to create virtual tag
        { tagImpl = { tmpl: dom.outerHTML }; }
    }

    if (tagImpl && (dom !== root || mustIncludeRoot)) {
      if(isVirtual) { // handled in update
        if (getAttribute(dom, IS_DIRECTIVE))
          { warn(("Virtual tags shouldn't be used together with the \"" + IS_DIRECTIVE + "\" attribute - https://github.com/riot/riot/issues/2511")); }
        // can not remove attribute like directives
        // so flag for removal after creation to prevent maximum stack error
        setAttribute(dom, 'virtualized', true);
        var tag = createTag(
          {tmpl: dom.outerHTML},
          {root: dom, parent: this$1},
          dom.innerHTML
        );

        expressions.push(tag); // no return, anonymous tag, keep parsing
      } else {
        expressions.push(
          initChild(
            tagImpl,
            {
              root: dom,
              parent: this$1
            },
            dom.innerHTML,
            this$1
          )
        );
        return false
      }
    }

    // attribute expressions
    parseAttributes.apply(this$1, [dom, dom.attributes, function (attr, expr) {
      if (!expr) { return }
      expressions.push(expr);
    }]);
  });

  return expressions
}

/**
 * Calls `fn` for every attribute on an element. If that attr has an expression,
 * it is also passed to fn.
 * @this Tag
 * @param   { HTMLElement } dom - dom node to parse
 * @param   { Array } attrs - array of attributes
 * @param   { Function } fn - callback to exec on any iteration
 */
function parseAttributes(dom, attrs, fn) {
  var this$1 = this;

  each(attrs, function (attr) {
    if (!attr) { return false }

    var name = attr.name;
    var bool = isBoolAttr(name);
    var expr;

    if (contains(REF_DIRECTIVES, name) && dom.tagName.toLowerCase() !== YIELD_TAG) {
      expr =  createRefDirective(dom, this$1, name, attr.value);
    } else if (tmpl.hasExpr(attr.value)) {
      expr = {dom: dom, expr: attr.value, attr: name, bool: bool};
    }

    fn(attr, expr);
  });
}

/**
 * Manage the mount state of a tag triggering also the observable events
 * @this Tag
 * @param { Boolean } value - ..of the isMounted flag
 */
function setMountState(value) {
  var ref = this.__;
  var isAnonymous = ref.isAnonymous;

  define(this, 'isMounted', value);

  if (!isAnonymous) {
    if (value) { this.trigger('mount'); }
    else {
      this.trigger('unmount');
      this.off('*');
      this.__.wasCreated = false;
    }
  }
}

/**
 * Mount the current tag instance
 * @returns { Tag } the current tag instance
 */
function componentMount(tag$$1, dom, expressions, opts) {
  var __ = tag$$1.__;
  var root = __.root;
  root._tag = tag$$1; // keep a reference to the tag just created

  // Read all the attrs on this instance. This give us the info we need for updateOpts
  parseAttributes.apply(__.parent, [root, root.attributes, function (attr, expr) {
    if (!__.isAnonymous && RefExpr.isPrototypeOf(expr)) { expr.tag = tag$$1; }
    attr.expr = expr;
    __.instAttrs.push(attr);
  }]);

  // update the root adding custom attributes coming from the compiler
  walkAttributes(__.impl.attrs, function (k, v) { __.implAttrs.push({name: k, value: v}); });
  parseAttributes.apply(tag$$1, [root, __.implAttrs, function (attr, expr) {
    if (expr) { expressions.push(expr); }
    else { setAttribute(root, attr.name, attr.value); }
  }]);

  // initialiation
  updateOpts.apply(tag$$1, [__.isLoop, __.parent, __.isAnonymous, opts, __.instAttrs]);

  // add global mixins
  var globalMixin = mixin(GLOBAL_MIXIN);

  if (globalMixin && !__.skipAnonymous) {
    for (var i in globalMixin) {
      if (globalMixin.hasOwnProperty(i)) {
        tag$$1.mixin(globalMixin[i]);
      }
    }
  }

  if (__.impl.fn) { __.impl.fn.call(tag$$1, opts); }

  if (!__.skipAnonymous) { tag$$1.trigger('before-mount'); }

  // parse layout after init. fn may calculate args for nested custom tags
  each(parseExpressions.apply(tag$$1, [dom, __.isAnonymous]), function (e) { return expressions.push(e); });

  tag$$1.update(__.item);

  if (!__.isAnonymous && !__.isInline) {
    while (dom.firstChild) { root.appendChild(dom.firstChild); }
  }

  define(tag$$1, 'root', root);

  // if we need to wait that the parent "mount" or "updated" event gets triggered
  if (!__.skipAnonymous && tag$$1.parent) {
    var p = getImmediateCustomParent(tag$$1.parent);
    p.one(!p.isMounted ? 'mount' : 'updated', function () {
      setMountState.call(tag$$1, true);
    });
  } else {
    // otherwise it's not a child tag we can trigger its mount event
    setMountState.call(tag$$1, true);
  }

  tag$$1.__.wasCreated = true;

  return tag$$1
}

/**
 * Unmount the tag instance
 * @param { Boolean } mustKeepRoot - if it's true the root node will not be removed
 * @returns { Tag } the current tag instance
 */
function tagUnmount(tag, mustKeepRoot, expressions) {
  var __ = tag.__;
  var root = __.root;
  var tagIndex = __TAGS_CACHE.indexOf(tag);
  var p = root.parentNode;

  if (!__.skipAnonymous) { tag.trigger('before-unmount'); }

  // clear all attributes coming from the mounted tag
  walkAttributes(__.impl.attrs, function (name) {
    if (startsWith(name, ATTRS_PREFIX))
      { name = name.slice(ATTRS_PREFIX.length); }

    removeAttribute(root, name);
  });

  // remove all the event listeners
  tag.__.listeners.forEach(function (dom) {
    Object.keys(dom[RIOT_EVENTS_KEY]).forEach(function (eventName) {
      dom.removeEventListener(eventName, dom[RIOT_EVENTS_KEY][eventName]);
    });
  });

  // remove tag instance from the global tags cache collection
  if (tagIndex !== -1) { __TAGS_CACHE.splice(tagIndex, 1); }

  // clean up the parent tags object
  if (__.parent && !__.isAnonymous) {
    var ptag = getImmediateCustomParent(__.parent);

    if (__.isVirtual) {
      Object
        .keys(tag.tags)
        .forEach(function (tagName) { return arrayishRemove(ptag.tags, tagName, tag.tags[tagName]); });
    } else {
      arrayishRemove(ptag.tags, __.tagName, tag);
    }
  }

  // unmount all the virtual directives
  if (tag.__.virts) {
    each(tag.__.virts, function (v) {
      if (v.parentNode) { v.parentNode.removeChild(v); }
    });
  }

  // allow expressions to unmount themselves
  unmountAll(expressions);
  each(__.instAttrs, function (a) { return a.expr && a.expr.unmount && a.expr.unmount(); });

  // clear the tag html if it's necessary
  if (mustKeepRoot) { setInnerHTML(root, ''); }
  // otherwise detach the root tag from the DOM
  else if (p) { p.removeChild(root); }

  // custom internal unmount function to avoid relying on the observable
  if (__.onUnmount) { __.onUnmount(); }

  // weird fix for a weird edge case #2409 and #2436
  // some users might use your software not as you've expected
  // so I need to add these dirty hacks to mitigate unexpected issues
  if (!tag.isMounted) { setMountState.call(tag, true); }

  setMountState.call(tag, false);

  delete root._tag;

  return tag
}

/**
 * Tag creation factory function
 * @constructor
 * @param { Object } impl - it contains the tag template, and logic
 * @param { Object } conf - tag options
 * @param { String } innerHTML - html that eventually we need to inject in the tag
 */
function createTag(impl, conf, innerHTML) {
  if ( impl === void 0 ) impl = {};
  if ( conf === void 0 ) conf = {};

  var tag = conf.context || {};
  var opts = extend({}, conf.opts);
  var parent = conf.parent;
  var isLoop = conf.isLoop;
  var isAnonymous = !!conf.isAnonymous;
  var skipAnonymous = settings.skipAnonymousTags && isAnonymous;
  var item = conf.item;
  // available only for the looped nodes
  var index = conf.index;
  // All attributes on the Tag when it's first parsed
  var instAttrs = [];
  // expressions on this type of Tag
  var implAttrs = [];
  var expressions = [];
  var root = conf.root;
  var tagName = conf.tagName || getName(root);
  var isVirtual = tagName === 'virtual';
  var isInline = !isVirtual && !impl.tmpl;
  var dom;

  // make this tag observable
  if (!skipAnonymous) { observable(tag); }
  // only call unmount if we have a valid __TAG_IMPL (has name property)
  if (impl.name && root._tag) { root._tag.unmount(true); }

  // not yet mounted
  define(tag, 'isMounted', false);

  define(tag, '__', {
    impl: impl,
    root: root,
    skipAnonymous: skipAnonymous,
    implAttrs: implAttrs,
    isAnonymous: isAnonymous,
    instAttrs: instAttrs,
    innerHTML: innerHTML,
    tagName: tagName,
    index: index,
    isLoop: isLoop,
    isInline: isInline,
    item: item,
    parent: parent,
    // tags having event listeners
    // it would be better to use weak maps here but we can not introduce breaking changes now
    listeners: [],
    // these vars will be needed only for the virtual tags
    virts: [],
    wasCreated: false,
    tail: null,
    head: null
  });

  // create a unique id to this tag
  // it could be handy to use it also to improve the virtual dom rendering speed
  define(tag, '_riot_id', uid()); // base 1 allows test !t._riot_id
  define(tag, 'root', root);
  extend(tag, { opts: opts }, item);
  // protect the "tags" and "refs" property from being overridden
  define(tag, 'parent', parent || null);
  define(tag, 'tags', {});
  define(tag, 'refs', {});

  if (isInline || isLoop && isAnonymous) {
    dom = root;
  } else {
    if (!isVirtual) { root.innerHTML = ''; }
    dom = mkdom(impl.tmpl, innerHTML, isSvg(root));
  }

  define(tag, 'update', function (data) { return componentUpdate(tag, data, expressions); });
  define(tag, 'mixin', function () {
    var mixins = [], len = arguments.length;
    while ( len-- ) mixins[ len ] = arguments[ len ];

    return componentMixin.apply(void 0, [ tag ].concat( mixins ));
  });
  define(tag, 'mount', function () { return componentMount(tag, dom, expressions, opts); });
  define(tag, 'unmount', function (mustKeepRoot) { return tagUnmount(tag, mustKeepRoot, expressions); });

  return tag
}

/**
 * Mount a tag creating new Tag instance
 * @param   { Object } root - dom node where the tag will be mounted
 * @param   { String } tagName - name of the riot tag we want to mount
 * @param   { Object } opts - options to pass to the Tag instance
 * @param   { Object } ctx - optional context that will be used to extend an existing class ( used in riot.Tag )
 * @returns { Tag } a new Tag instance
 */
function mount$1(root, tagName, opts, ctx) {
  var impl = __TAG_IMPL[tagName];
  var implClass = __TAG_IMPL[tagName].class;
  var context = ctx || (implClass ? create(implClass.prototype) : {});
  // cache the inner HTML to fix #855
  var innerHTML = root._innerHTML = root._innerHTML || root.innerHTML;
  var conf = extend({ root: root, opts: opts, context: context }, { parent: opts ? opts.parent : null });
  var tag;

  if (impl && root) { tag = createTag(impl, conf, innerHTML); }

  if (tag && tag.mount) {
    tag.mount(true);
    // add this tag to the virtualDom variable
    if (!contains(__TAGS_CACHE, tag)) { __TAGS_CACHE.push(tag); }
  }

  return tag
}



var tags = Object.freeze({
	arrayishAdd: arrayishAdd,
	getTagName: getName,
	inheritParentProps: inheritParentProps,
	mountTo: mount$1,
	selectTags: query,
	arrayishRemove: arrayishRemove,
	getTag: get,
	initChildTag: initChild,
	moveChildTag: moveChild,
	makeReplaceVirtual: makeReplaceVirtual,
	getImmediateCustomParentTag: getImmediateCustomParent,
	makeVirtual: makeVirtual,
	moveVirtual: moveVirtual,
	unmountAll: unmountAll,
	createIfDirective: createIfDirective,
	createRefDirective: createRefDirective
});

/**
 * Riot public api
 */
var settings$1 = settings;
var util = {
  tmpl: tmpl,
  brackets: brackets,
  styleManager: styleManager,
  vdom: __TAGS_CACHE,
  styleNode: styleManager.styleNode,
  // export the riot internal utils as well
  dom: dom,
  check: check,
  misc: misc,
  tags: tags
};

// export the core props/methods
var Tag$1 = Tag;
var tag$1 = tag;
var tag2$1 = tag2;
var mount$2 = mount;
var mixin$1 = mixin;
var update$2 = update$1;
var unregister$1 = unregister;
var version$1 = version;
var observable$2 = observable;

var riot$1 = extend({}, core, {
  observable: observable,
  settings: settings$1,
  util: util,
})

exports.settings = settings$1;
exports.util = util;
exports.Tag = Tag$1;
exports.tag = tag$1;
exports.tag2 = tag2$1;
exports.mount = mount$2;
exports.mixin = mixin$1;
exports.update = update$2;
exports.unregister = unregister$1;
exports.version = version$1;
exports.observable = observable$2;
exports.default = riot$1;

Object.defineProperty(exports, '__esModule', { value: true });

})));
/* ========================================================================
 * Bootstrap: tab.js v3.3.7
 * http://getbootstrap.com/javascript/#tabs
 * ========================================================================
 * Copyright 2011-2016 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // TAB CLASS DEFINITION
  // ====================

  var Tab = function (element) {
    // jscs:disable requireDollarBeforejQueryAssignment
    this.element = $(element)
    // jscs:enable requireDollarBeforejQueryAssignment
  }

  Tab.VERSION = '3.3.7'

  Tab.TRANSITION_DURATION = 150

  Tab.prototype.show = function () {
    var $this    = this.element
    var $ul      = $this.closest('ul:not(.dropdown-menu)')
    var selector = $this.data('target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    if ($this.parent('li').hasClass('active')) return

    var $previous = $ul.find('.active:last a')
    var hideEvent = $.Event('hide.bs.tab', {
      relatedTarget: $this[0]
    })
    var showEvent = $.Event('show.bs.tab', {
      relatedTarget: $previous[0]
    })

    $previous.trigger(hideEvent)
    $this.trigger(showEvent)

    if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) return

    var $target = $(selector)

    this.activate($this.closest('li'), $ul)
    this.activate($target, $target.parent(), function () {
      $previous.trigger({
        type: 'hidden.bs.tab',
        relatedTarget: $this[0]
      })
      $this.trigger({
        type: 'shown.bs.tab',
        relatedTarget: $previous[0]
      })
    })
  }

  Tab.prototype.activate = function (element, container, callback) {
    var $active    = container.find('> .active')
    var transition = callback
      && $.support.transition
      && ($active.length && $active.hasClass('fade') || !!container.find('> .fade').length)

    function next() {
      $active
        .removeClass('active')
        .find('> .dropdown-menu > .active')
          .removeClass('active')
        .end()
        .find('[data-toggle="tab"]')
          .attr('aria-expanded', false)

      element
        .addClass('active')
        .find('[data-toggle="tab"]')
          .attr('aria-expanded', true)

      if (transition) {
        element[0].offsetWidth // reflow for transition
        element.addClass('in')
      } else {
        element.removeClass('fade')
      }

      if (element.parent('.dropdown-menu').length) {
        element
          .closest('li.dropdown')
            .addClass('active')
          .end()
          .find('[data-toggle="tab"]')
            .attr('aria-expanded', true)
      }

      callback && callback()
    }

    $active.length && transition ?
      $active
        .one('bsTransitionEnd', next)
        .emulateTransitionEnd(Tab.TRANSITION_DURATION) :
      next()

    $active.removeClass('in')
  }


  // TAB PLUGIN DEFINITION
  // =====================

  function Plugin(option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.tab')

      if (!data) $this.data('bs.tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tab

  $.fn.tab             = Plugin
  $.fn.tab.Constructor = Tab


  // TAB NO CONFLICT
  // ===============

  $.fn.tab.noConflict = function () {
    $.fn.tab = old
    return this
  }


  // TAB DATA-API
  // ============

  var clickHandler = function (e) {
    e.preventDefault()
    Plugin.call($(this), 'show')
  }

  $(document)
    .on('click.bs.tab.data-api', '[data-toggle="tab"]', clickHandler)
    .on('click.bs.tab.data-api', '[data-toggle="pill"]', clickHandler)

}(jQuery);
'use strict';

riot.tag2('datatable', '<div class="panel panel-default table-responsive" riot-style="margin-bottom: {opts.marginBottom}"> <table class="table {opts.tableClass}"> <thead if="{showTableHeader}"> <tr> <th each="{column, index in columns}" riot-style="width: {column.width}"> {tr(column.label)} </th> </tr> </thead> <tbody> <tr if="{!data || (Array.isArray(data) && data.length == 0) || Object.keys(data).length == 0}"> <td colspan="{columns.length}">{message}</td> </tr> <tr class="{rowClassCallback(elem)}" each="{elem, index in data}"> <td each="{column, index2 in columns}" colspan="{column.colspan}" if="{column.showBody == undefined}" riot-style="width: {column.width}"> <virtual if="{column.linkCallback == undefined}"> <span if="{column.callback != undefined && column.type == \'subtable\'}"> <datatable message="{column.message}" columns="{column.callback(elem, index)}" data="{elem}" actions="{actions}" no-table-footer no-table-header margin-bottom="0"></datatable> </span> <span if="{column.callback != undefined && column.type != \'subtable\'}"> {column.callback(elem, index)} </span> <span if="{column.callback == undefined && elem[column.value] != undefined}"> {elem[column.value]} </span> <span if="{column.callback == undefined && elem[column.label] != undefined}"> {elem[column.label]} </span> </virtual> <a if="{column.linkCallback != undefined}" href="{column.linkCallback(elem, index)}" target="_blank"> <span if="{column.callback != undefined && column.type != \'subtable\'}"> {column.callback(elem, index)} </span> <span if="{column.callback == undefined && elem[column.label] != undefined}"> {elem[column.label]} </span> <span if="{column.isRedirectedCallback != undefined && column.isRedirectedCallback(elem)}" class="badge">Redirected</span> </a> <virtual each="{action in actions}" if="{column.label == \'Actions\'}"> <a if="{action.action == \'callback\'}" disabled="{action.isDisabledCallback !== undefined && action.isDisabledCallback(elem)}" onclick="{action.callback.bind(this, elem)}" class="btn btn-sm btn-{action.btnType}"> {(action.labelCallback !== undefined && action.labelCallback(elem)) || tr(action.label)}</a> <a href="{action.url}/?id={encodeURIComponent(elem[\'ID\'])}" if="{action.action == \'link\'}" class="btn-flat">{tr(action.label)}</a> <a data-toggle="modal" data-target="{action.target}" onclick="{modalOpened}" if="{action.action == \'modal-link\'}" class="btn">{tr(action.label)}</a> </virtual> </td> </tr> </tbody> <tfoot if="{showTableFooter}"> <tr> <th each="{column, index in columns}"> {tr(column.label)} </th> </tr> </tfoot> </table> </div>', '', '', function(opts) {
		var self = this;

		self.columns = opts.columns || [];
		self.columnNames = opts.columnNames;
		self.events = opts.events || riot.observable();

		self.disableLinking = opts.disableLinking === 'true';
		self.rowClassCallback = opts.rowClassCallback || function() {};

		self.showTableHeader = opts.noTableHeader === undefined;
		self.showTableFooter = opts.noTableFooter === undefined;

		self.data = opts.data;

		self.tr = opts.trFunc || function(str) {
			return str;
		};

		self.modalOpened = function(e) {
			self.events.trigger('modal-opened', e, this.elem, self);
		}

		self.linkBaseURL = opts.linkBaseurl || '';
		self.actions = opts.actions;

		if (opts.url == undefined) {
			self.url = '';
		} else {
			self.url = replacePlaceholdersWithQueryVariables(opts.url);
		}

		self.message = 'No data loaded or available yet.';

		self.on('mount', function() {
			self.events.on('create', onCreate);

			if (opts.actions !== undefined) {
				self.actions = opts.actions;
			}
		});

		self.on('unmount', function() {
			self.events.off('create', onCreate);
		});

		self.on('update', function() {
			if (opts.message !== undefined) {
				self.message = opts.message;
			}

			if (opts.actions !== undefined) {
				self.actions = opts.actions;
			}
		});

		var onCreate = function(elem) {
			self.data.unshift(elem);
			self.update();
		};
});
riot.tag2('linkchecker-form', '<form onsubmit="{submit}" style="margin-bottom: 20px;"> <div class="form-group"> <label>Website URL</label> <input ref="websiteURL" type="url" class="form-control" placeholder="The URL of the website to check, for example \'https://www.marcobeierer.com\'." disabled="{disabled}" required> </div> <div class="form-group"> <label>Token</label> <textarea ref="token" class="form-control" style="min-height: 100px" placeholder="A token is only necessary to check a website with more than 500 internal or external links or if you like to use the paid extra features." disabled="{disabled}"></textarea> </div> <div class="checkbox"> <label> <input ref="showWorkingRedirects" type="checkbox"> Show working redirects </label> </div> <button class="btn btn-default" type="submit" disabled="{disabled}">Check your website</button> </form>', '', '', function(opts) {
		var self = this;

		self.disabled = false;

		self.on('mount', function() {
			if (opts.websiteUrl != undefined) {
				this.refs.websiteURL.value = opts.websiteUrl;
			}

			if (opts.token != undefined) {
				this.refs.token.value = opts.token;
				opts.linkchecker.trigger('token-loaded', this.refs.token.value);
			}
		});

		this.submit = function(e) {
			e.preventDefault();
			opts.linkchecker.trigger('start', this.refs.websiteURL.value, this.refs.token.value, this.refs.showWorkingRedirects.checked);
		}.bind(this)

		opts.linkchecker.on('started', function() {
			self.disabled = true;
		});

		opts.linkchecker.on('stopped', function() {
			self.disabled = false;
			self.update();
		});
});
riot.tag2('linkchecker-scheduler', '<div if="{token}" class="alert alert-{messageType}"> <raw content="{message}"></raw> </div> <div class="panel panel-default" if="{!token}"> <div class="panel-heading">Description</div> <div class="panel-body"> <p>The scheduler is an additional service for all users who have bought a token for the <a href="https://www.marcobeierer.com/wordpress-plugins/link-checker-professional" target="_blank">Link Checker Professional</a>.</p> <p>If you register your site to the scheduler, a link check is automatically triggered once a day and you receive an email notification with a summary report after the check has finished. If a dead link was found, you can use the default Link Checker interface to fetch the detailed results.</p> </div> </div> <div class="panel panel-primary" if="{token && !registered}"> <div class="panel-heading">Register your website</div> <div class="panel-body"> <p>If you register your site to the scheduler, a link check is automatically triggered once a day and you receive an email notification with a summary report after the check has finished. If a dead link was found, you can use the default Link Checker interface to fetch the detailed results.</p> <form onsubmit="{register}"> <input type="hidden" name="Service" value="Link Checker"> <input type="hidden" name="IntervalInNs" value="86400000000000"> <div style="display: none;" class="form-group"> <label>Website URL</label> <input class="form-control" name="URL" type="text" riot-value="{websiteURL}" readonly="readonly" required> </div> <div class="form-group"> <label>Email address for notifications</label> <input class="form-control" name="Email" riot-value="{email}" required type="{\'email\'}"> </div> <button class="btn btn-default" type="submit">Register</button> </form> </div> </div> <div class="panel panel-primary" if="{token && registered}"> <div class="panel-heading">Deregister your website</div> <div class="panel-body"> <p>Your site is registered to the scheduler and you should receive status emails regularly. Use the button below if you like to disable the automated checks.</p> <form onsubmit="{deregister}"> <input type="hidden" name="Service" value="Link Checker"> <div style="display: none;" class="form-group"> <label>Website URL</label> <input class="form-control" name="URL" type="text" riot-value="{websiteURL}" readonly="readonly" required> </div> <button class="btn btn-default" type="submit">Deregister</button> </form> </div> </div>', '', '', function(opts) {
		var self = this;

		self.registered = false;

		self.websiteURL = opts.websiteUrl || '';
		self.token = opts.token || '';
		self.email = opts.email || '';

		self.apiURL = 'https://api.marcobeierer.com/scheduler/v1/';
		if (opts.dev === '1') {
			self.apiURL = 'http://marco-desktop:9999/scheduler/v1/';
		}

		this.setMessage = function(text, type) {
			self.message = text;
			self.messageType = type;
			self.update();
		}.bind(this)

		self.setMessage('Loading status.', 'info');

		this.tokenHeader = function() {
			if (self.token != '') {
				return 'BEARER ' + self.token;
			}
			return '';
		}.bind(this)

		this.status = function() {
			jQuery.ajax({
				method: 'GET',
				url: self.apiURL + '?Service=Link Checker&URL=' + self.websiteURL,
				headers: {
					'Authorization': self.tokenHeader(),
				}
			}).done(function(data, textStatus, xhr) {
				if (xhr.status == 204) {
					self.setMessage('Your website isn\'t registered for the scheduler currently. Please use the form below to register your site.', 'info');
					self.registered = false;
				} else {
					self.setMessage('Your website is registered to the scheduler currently. You can use the form below to deregister your site.', 'info');
					self.registered = true;
				}
			}).fail(function(xhr, textStatus, error) {
				if (xhr.status == 401) {
					self.setMessage('The validation of your token failed. The token is invalid or has expired. Please try it again or contact me if the token should be valid.', 'danger');
				} else if (xhr.status == 504 || xhr.status == 503) {
					self.setMessage('The backend server is temporarily unavailable. Please try it again later.', 'danger');
				} else {
					self.setMessage('Something went wrong. Please try it again later.', 'danger');
				}
			}).always(function() {
				self.update();
			});
		}.bind(this)
		self.status();

		this.register = function(e) {
			e.preventDefault();

			var obj = jQuery(e.target).serializeObject();
			obj.IntervalInNs = parseInt(obj.IntervalInNs);
			var data = JSON.stringify(obj);

			jQuery.ajax({
				method: 'POST',
				url: self.apiURL,
				data: data,
				dataType: 'text',
				headers: {
					'Authorization': self.tokenHeader(),
				}
			}).done(function(data, textStatus, xhr) {
				self.setMessage('You have successfully registered your website to the scheduler.', 'success');
				self.registered = true;
			}).fail(function(xhr, textStatus, error) {
				console.log(xhr.status);
				if (xhr.status == 401) {
					self.setMessage('The validation of your token failed. The token is invalid or has expired. Please try it again or contact me if the token should be valid.', 'danger');
				} else if (xhr.status == 504 || xhr.status == 503) {
					self.setMessage('The backend server is temporarily unavailable. Please try it again later.', 'danger');
				} else {
					self.setMessage('Something went wrong. Please try it again later.', 'danger');
				}
			}).always(function() {
				self.update();
			});
		}.bind(this)

		this.deregister = function(e) {
			e.preventDefault();
			var data = jQuery(e.target).serializeJSON();

			jQuery.ajax({
				method: 'DELETE',
				url: self.apiURL,
				data: data,
				dataType: 'text',
				headers: {
					'Authorization': self.tokenHeader(),
				}
			}).done(function(data, textStatus, xhr) {
				self.setMessage('You have successfully deregistered your website from the scheduler.', 'success');
				self.registered = false;
			}).fail(function(xhr, textStatus, error) {
				self.setMessage('Something went wrong. Please try it again later.', 'danger');
			}).always(function() {
				self.update();
			});
		}.bind(this)
});
riot.tag2('linkchecker', '<form if="{showButton}" onsubmit="{submit}" style="margin-bottom: 20px;"> <button class="btn btn-default" type="submit" disabled="{disabled}">Check your website</button> </form> <div class="alert alert-{messageType}"> <raw content="{message}"></raw> </div> <ul class="nav nav-tabs" role="tablist"> <li role="presentation" class="active"><a href="#progressAndStats{id}" aria-controls="progressAndStats{id}" role="tab" data-toggle="tab">Progress and Stats</a></li> <li role="presentation"><a href="#links{id}" aria-controls="links{id}" role="tab" data-toggle="tab">Links</a></li> <li role="presentation"><a href="#images{id}" aria-controls="images{id}" role="tab" data-toggle="tab">Images</a></li> <li role="presentation"><a href="#youTubeVideos{id}" aria-controls="youTubeVideos{id}" role="tab" data-toggle="tab">YouTube Videos</a></li> <li role="presentation"><a href="#statusCodes{id}" aria-controls="statusCodes{id}" role="tab" data-toggle="tab">Common Status Codes</a></li> <li role="presentation"><a href="#unhandledResources{id}" aria-controls="unhandledResources{id}" role="tab" data-toggle="tab">Unhandled Resources</a></li> <li if="{enableScheduler}" role="presentation"><a href="#scheduler{id}" aria-controls="scheduler{id}" role="tab" data-toggle="tab">Scheduler</a></li> </ul> <div class="tab-content"> <div role="tabpanel" class="tab-pane active" id="progressAndStats{id}"> <h3>Progress and Stats</h3> <div class="row"> <div class="col-lg-6"> <div class="panel panel-default"> <div class="panel-heading">Stats</div> <table class="table table-bordered"> <tr> <td>Number of crawled HTML pages on your site</td> <td class="text-right" style="width: 200px;">{urlsCrawledCount}</td> </tr> <tr> <td>Number of checked internal and external resources</td> <td class="text-right">{checkedLinksCount}</td> </tr> <tr if="{data.Stats}"> <td>Started at</td> <td class="text-right">{datetime(data.Stats.StartedAt)}</td> </tr> <tr if="{data.Stats}"> <td>Finished at</td> <td class="text-right">{datetime(data.Stats.FinishedAt)}</td> </tr> </table> </div> </div> <div if="{data.Stats}" class="col-lg-6"> <div class="panel panel-default"> <div class="panel-heading">Detailed Stats</div> <table class="table table-bordered"> <tr> <td>Number of valid links</td> <td class="text-right" style="width: 200px;">{data.Stats.ValidLinksCount}</td> </tr> <tr> <td>Number of dead links</td> <td class="text-right">{data.Stats.DeadLinksCount}</td> </tr> <tr> <td>Number of redirected links</td> <td class="text-right">{data.Stats.RedirectedLinksCount}</td> </tr> <tr> <td>Number of valid embedded YouTube videos</td> <td class="text-right">{data.Stats.ValidEmbeddedYouTubeVideosCount}</td> </tr> <tr> <td>Number of dead embedded YouTube videos</td> <td class="text-right">{data.Stats.DeadEmbeddedYouTubeVideosCount}</td> </tr> </table> </div> </div> <div if="{data.Stats}" class="col-lg-6"> <div class="panel panel-default"> <div class="panel-heading">Setting Stats</div> <table class="table table-bordered"> <tr> <td>Crawl delay</td> <td class="text-right" style="width: 200px;">{data.Stats.CrawlDelayInSeconds} seconds</td> </tr> <tr> <td>Concurrent fetchers</td> <td class="text-right">{data.Stats.MaxFetchers}</td> </tr> <tr> <td>URL limit</td> <td class="text-right">{data.Stats.URLLimit} URLs</td> </tr> <tr> <td>Limit reached</td> <td class="text-right">{bool2text(data.Stats.LimitReached)}</td> </tr> <tr> <td>Show working redirects</td> <td class="text-right">{bool2text(showWorkingRedirects)}</td> </tr> </table> </div> </div> </div> </div> <div role="tabpanel" class="tab-pane" id="links{id}"> <h3>Broken<span if="{showWorkingRedirects}"> and Redirected</span> Links</h3> <p>The table below shows all broken<span if="{showWorkingRedirects}"> and redirected</span> links. Please note that the fixed markers are just temporary and are reset with the next link check.</p> <p if="{showWorkingRedirects}">The result contains working redirects. Non-temporary redirects, even if working correctly, have disadvantages like for example increased loading times and should therefore be fixed. However showing working redirects can be disabled in the settings.</p> <p if="{!showWorkingRedirects}">The result doesn\'t contain working redirects. Non-temporary redirects, even if working correctly, have disadvantages like for example increased loading times and should therefore be fixed. Showing working redirects can be enabled in the settings.</p> <datatable ref="brokenLinks" table-class="table-striped responsive-table" columns="{urlsWithBrokenLinksColumns}" data="{urlsWithBrokenLinks}" actions="{brokenLinksActions}" message="{resultsMessage}"> </datatable> </div> <div role="tabpanel" class="tab-pane" id="images{id}"> <h3>Broken<span if="{showWorkingRedirects}"> and Redirected</span> Images</h3> <p if="{!hasToken()}">Broken images are just checked in the <a href="https://www.marcobeierer.com/tools/link-checker-professional" target="_blank">professional version of the Link Checker</a>.</p> <p if="{hasToken()}">The table below shows all broken<span if="{showWorkingRedirects}"> and redirected</span> images. Please note that the fixed markers are just temporary and are reset for the next link check.</p> <p if="{hasToken() && showWorkingRedirects}">The result contains working redirects. Non-temporary redirects, even if working correctly, have disadvantages like for example increased loading times and should therefore be fixed. However showing working redirects can be disabled in the settings.</p> <p if="{hasToken() && !showWorkingRedirects}">The result doesn\'t contain working redirects. Non-temporary redirects, even if working correctly, have disadvantages like for example increased loading times and should therefore be fixed. Showing working redirects can be enabled in the settings.</p> <datatable if="{hasToken()}" table-class="table-striped table-responsive" columns="{urlsWithDeadImagesColumns}" data="{urlsWithDeadImages}" actions="{brokenImagesActions}" message="{resultsMessage}"> </datatable> </div> <div role="tabpanel" class="tab-pane" id="youTubeVideos{id}"> <h3>Broken Embedded YouTube Videos</h3> <p if="{!hasToken()}">Broken embedded YouTube videos are just checked in the <a href="https://www.marcobeierer.com/tools/link-checker-professional" target="_blank">professional version of the Link Checker</a>.</p> <p if="{hasToken()}">The table below shows all broken embedded YouYube videos. Please note that the fixed markers are just temporary and are reset for the next link check.</p> <datatable if="{hasToken()}" table-class="table-striped table-responsive" columns="{urlsWithDeadYouTubeVideosColumns}" data="{urlsWithDeadYouTubeVideos}" actions="{deadYouTubeVideosActions}" message="{resultsMessage}"> </datatable> </div> <div role="tabpanel" class="tab-pane" id="statusCodes{id}"> <h3>Common Status Codes</h3> <div class="panel panel-default table-responsive"> <table class="table table-striped table-responsive"> <thead> <tr> <th style="width: 10em;">Status Code</th> <th style="width: 20em;">Status Text</th> <th>Description</th> </tr> </thead> <tbody> <tr> <td>502</td> <td>Bad Gateway</td> <td>The server returned an invalid response when the Link Checker tried to access the URL.</td> </tr> <tr> <td>504</td> <td>Gateway Timeout</td> <td>The Link Checker was not able to access the URL because it timed out.</td> </tr> </tbody> </table> </div> </div> <div role="tabpanel" class="tab-pane" id="unhandledResources{id}"> <h3>Unhandled Resources (mainly blocked by robots.txt)</h3> <p>Websites can prohibit access for web crawlers like the one used by the Link Checker with the robots exclusion protocol (robots.txt file). The Link Checker does respect the robots exclusion protocol for the website it crawls, but not for external links because it does just access individual URLs of the external sites.</p> <p>However, some websites take some effort to restrict the access for crawlers and the Link Checker does respect that and does not try to bypass the restrictions. You can find all URLs the Link Checker was not able to access in the table below, so that you could check them manually. If you have done this, you could mark them as working. Each marker is saved for one month in your browsers cache and the date of the last marking is shown in the table below.</p> <p>If the blocked links were found on your website, you can add rules for the Link Checker to your robots.txt file and restart the Link Checker. Please see the <a href="https://www.marcobeierer.com/tools/link-checker-faq" target="_blank">FAQs</a> for further information.</p> <h4>Unhandled Links</h4> <datatable ref="linksBlockedByRobots" table-class="table-striped table-responsive" columns="{urlsWithLinksBlockedByRobotsColumns}" data="{urlsWithLinksBlockedByRobots}" actions="{blockedLinksActions}" message="{resultsMessage}"> </datatable> <virtual if="{hasToken()}"> <h4>Unhandled Images</h4> <datatable ref="unhandledEmbeddedResources" table-class="table-striped table-responsive" columns="{urlsWithLinksBlockedByRobotsColumns}" data="{urlsWithUnhandledEmbeddedResources}" actions="{blockedLinksActions}" message="{resultsMessage}"> </datatable> </virtual> <h4>Custom Status Codes</h4> <div class="panel panel-default table-responsive"> <table class="table table-striped table-responsive"> <thead> <tr> <th style="width: 10em;">Status Code</th> <th style="width: 20em;">Status Text</th> <th>Description</th> </tr> </thead> </tbody> <tr> <td>601</td> <td>Blocked by robots</td> <td>The Link Checker was not able to access the URL because the access was blocked by the robots exclusion protocol.</td> </tr> <tr> <td>602</td> <td>HTML parse error</td> <td>The HTML code of this page could not be parsed because of an error in the code or because the page was larger than 50 MB.</td> </tr> <tr> <td>603</td> <td>Unknown authority error</td> <td>This status code means that the certificate was signed by an unknown certificate authority. If accessing the page works in your web browser, probably the provided certificate chain is broken. Most, but not all, browsers can handle such situation and download the missing certificates on the fly. If the error was detected on you website, you should fix the origin of the issue and provid the whole chain to all clients.</td> </tr> </tbody> </table> </div> <p><em>Please note that it is possible in rare situations that a website returns these status codes and if this is the case, they probably have another meaning.</em></p> </div> <div if="{enableScheduler}" role="tabpanel" class="tab-pane" id="scheduler{id}"> <h3>Scheduler</h3> <linkchecker-scheduler website-url="{websiteURL}" token="{token}" email="{email}" dev="{dev}"></linkchecker-scheduler> </div> </div>', '', '', function(opts) {
		var self = this;

		self.message = '';
		self.originSystem = opts.originSystem || 'riot';
		self.data = {};
		self.dev = opts.dev;
		self.enableScheduler = opts.enableScheduler || false;
		self.showWorkingRedirects = opts.showWorkingRedirects || false;

		self.id = opts.id || 0;
		self.email = opts.email || '';

		self.on('mount', function() {
			lscache.setBucket('linkchecker');
			lscache.flushExpired();

			self.data = lscache.get('data');
			if (self.data != null) {
				self.render(self.data);
				self.update();
			}
		});

		self.bool2text = function(val) {
			if (val) {
				return 'Yes';
			}
			return 'No';
		}

		self.datetime = function(val) {
			return new Date(val).toLocaleString();
		}

		self.hasToken = function() {
			return self.token || (self.data.Stats != undefined && self.data.Stats.TokenUsed);
		}

		self.urlsWithBrokenLinksColumns = [
			{
				label: 'URL where the broken links were found',
				width: '35%',
				callback: function(info, url) {
					return url;
				},
				linkCallback: function(info, url) {
					return url;
				},
			},
			{
				label: 'Broken Links',
				type: 'subtable',
				colspan: '3',
				callback: subtableCallback,
				message: 'No broken links left.',
			},
			{
				label: 'Status Code',
				width: '9em',
				showBody: false,
			},
			{
				label: 'Actions',
				width: '11em',
				showBody: false,
			}
		];

		self.urlsWithLinksBlockedByRobotsColumns = [
			{
				label: 'URL where the resources were found',
				width: '35%',
				callback: function(info, url) {
					return url;
				},
				linkCallback: function(info, url) {
					return url;
				},
			},
			{
				label: 'Blocked Resources',
				type: 'subtable',
				colspan: '4',
				callback: subtableBlockedLinksCallback,
			},
			{
				label: 'Status Code',
				width: '9em',
				showBody: false,
			},
			{
				label: 'Marked As Working On',
				width: '15em',
				showBody: false,
			},
			{
				label: 'Actions',
				width: '11em',
				showBody: false,
			}
		];

		self.urlsWithDeadImagesColumns = [
			{
				label: 'URL where the broken images were found',
				width: '35%',
				callback: function(info, url) {
					return url;
				},
				linkCallback: function(info, url) {
					return url;
				},
			},
			{
				label: 'Broken Images',
				type: 'subtable',
				colspan: '3',
				callback: subtableCallback,
				message: 'No broken images left.',
			},
			{
				label: 'Status Code',
				width: '9em',
				showBody: false,
			},
			{
				label: 'Actions',
				width: '11em',
				showBody: false,
			}
		];

		self.urlsWithDeadYouTubeVideosColumns = [
			{
				label: 'URL where the broken videos were found',
				width: '35%',
				callback: function(info, url) {
					return url;
				},
				linkCallback: function(info, url) {
					return url;
				},
			},
			{
				label: 'Broken Embedded Videos',
				type: 'subtable',
				colspan: '3',
				callback: subtableWithStatusTextCallback,
				message: 'No broken videos left.',
			},
			{
				label: 'Status Text',
				width: '25em',
				showBody: false,
			},
			{
				label: 'Actions',
				width: '11em',
				showBody: false,
			}
		];

		function subtableBlockedLinksCallback(info, url) {
			return [
				{
					label: 'URL',
					linkCallback: function(elem) {
						return elem.URL;
					},
					isRedirectedCallback: function(elem) {
						return elem.IsRedirected;
					}
				},
				{
					label: 'StatusCode',
					width: '9em',
				},
				{
					label: 'Marked As Working On',
					width: '15em',
					callback: function(elem) {
						var markedOn = lscache.get(elem.URL);
						if (markedOn == undefined) {
							return 'never';
						}

						return new Date(markedOn).toLocaleDateString();
					},
				},
				{
					label: 'Actions',
					width: '10em',
				}
			]
		}

		function subtableCallback(info, url) {
			return [
				{
					label: 'URL',
					linkCallback: function(elem) {
						return elem.URL;
					},
					isRedirectedCallback: function(elem) {
						return elem.IsRedirected;
					}
				},
				{
					label: 'StatusCode',
					width: '9em',
				},
				{
					label: 'Actions',
					width: '10em',
				}
			]
		}

		function subtableWithStatusTextCallback(info, url) {
			return [
				{
					label: 'URL',
					linkCallback: function(elem) {
						return elem.URL;
					},
					isRedirectedCallback: function(elem) {
						return elem.IsRedirected;
					}
				},
				{
					label: 'StatusText',
					width: '25em',
				},
				{
					label: 'Actions',
					width: '10em',
				}
			]
		}

		self.blockedLinksActions = [
			{
				labelCallback: function(elem) {
					if (wasAlreadyMarkedToday(elem)) {
						return 'Already marked';
					}
					return 'Mark as Working';
				},
				btnType: 'primary',
				action: 'callback',
				callback: function(elem) {
					lscache.set(elem.URL, Date.now(), 60 * 24 * 30);
					self.refs.linksBlockedByRobots.update();
				},
				isDisabledCallback: wasAlreadyMarkedToday
			}
		];

		function wasAlreadyMarkedToday(elem) {
			var markedOn = lscache.get(elem.URL);
			if (markedOn == undefined) {
				return false;
			}
			return new Date(Date.now()).toLocaleDateString() == new Date(markedOn).toLocaleDateString();
		}

		self.brokenImagesActions = [
			{
				label: 'Mark as Fixed',
				btnType: 'primary',
				action: 'callback',
				callback: function(elem) {
					markLinkInList(elem, self.urlsWithDeadImages);
				}
			}
		];

		self.deadYouTubeVideosActions = [
			{
				label: 'Mark as Fixed',
				btnType: 'primary',
				action: 'callback',
				callback: function(elem) {
					markLinkInList(elem, self.urlsWithDeadYouTubeVideos);
				}
			}
		];

		self.brokenLinksActions = [
			{
				label: 'Mark as Fixed',
				btnType: 'primary',
				action: 'callback',
				callback: function(elem) {
					markLinkInList(elem, self.urlsWithBrokenLinks);
				}
			}
		];

		function resetObject(obj) {
			Object.keys(obj).forEach(
				function(key) {
					delete obj[key];
				}
			);
		}

		function markLinkInList(elem, list) {
			delete list[elem.FoundOnURL][elem.URL];

			if (Object.keys(list[elem.FoundOnURL]).length == 0) {

			}
		}

		opts.linkchecker.on('start', function(websiteURL, token, showWorkingRedirects, maxFetchers) {
			self.websiteURL = websiteURL;
			self.setToken(token);
			self.showWorkingRedirects = showWorkingRedirects;
			self.maxFetchers = maxFetchers || self.maxFetchers;

			self.start();
		});

		opts.linkchecker.on('started', function() {
			self.disabled = true;
		});

		opts.linkchecker.on('stopped', function() {
			self.disabled = false;
			self.update();
		});

		this.setMessage = function(text, type) {
			self.message = text;
			self.messageType = type;
			self.update();
		}.bind(this)

		this.setToken = function(token) {
			self.token = token.replace(/\s/g, '');
		}.bind(this)

		var resultsMessage = 'Link check not started yet.';

		self.websiteURL = opts.websiteUrl || '';
		self.token = '';
		if (opts.token) {
			self.setToken(opts.token);
		}
		self.maxFetchers = opts.maxFetchers || 10;

		if (self.websiteURL != '') {
			self.showButton = true;
		}

		self.urlsCrawledCount = 0;
		self.checkedLinksCount = 0;

		self.setMessage('The Link Checker was not started yet.', 'info');
		self.resultsMessage = resultsMessage;

		self.urlsWithBrokenLinks = {};
		self.urlsWithLinksBlockedByRobots = {};
		self.urlsWithDeadImages = {};
		self.urlsWithDeadYouTubeVideos = {};
		self.urlsWithUnhandledEmbeddedResources = {};

		self.retries = 0;

		this.submit = function(e) {
			e.preventDefault();
			self.start();
		}.bind(this)

		this.start = function() {
			opts.linkchecker.trigger('started');

			lscache.remove('data');
			self.data = {};

			self.urlsCrawledCount = 0;
			self.checkedLinksCount = 0;

			resetObject(self.urlsWithBrokenLinks);
			resetObject(self.urlsWithLinksBlockedByRobots);
			resetObject(self.urlsWithDeadImages);
			resetObject(self.urlsWithDeadYouTubeVideos);
			resetObject(self.urlsWithUnhandledEmbeddedResources);

			self.setMessage('Your website is being checked. Please wait a moment. You can watch the progress in the stats below.', 'warning');
			self.resultsMessage = 'Please wait until the check has finished.';

			var url64 = window.btoa(encodeURIComponent(self.websiteURL).replace(/%([0-9A-F]{2})/g, function(match, p1) {
				return String.fromCharCode('0x' + p1);
			}));
			url64.replace(/\+/g, '-').replace(/\//g, '_');

			self.doRequest = function() {
				var tokenHeader = '';
				if (self.token != '') {
					tokenHeader = 'BEARER ' + self.token;
				}

				var url = 'https://api.marcobeierer.com/linkchecker/v1/' + url64 + '?origin_system=' + self.originSystem + '&max_fetchers=' + self.maxFetchers;
				if (self.dev == '1') {
					url = 'sample_data/current.json?_=' + Date.now();
				} else if (self.dev == '2') {
					url = 'http://marco-desktop:9999/linkchecker/v1/' + url64 + '?origin_system=' + self.originSystem + '&max_fetchers=' + self.maxFetchers;
				}

				jQuery.ajax({
					method: 'GET',
					url: url,
					headers: {
						'Authorization': tokenHeader,
					}
				}).done(function(data) {
					self.retries = 0;

					self.data = data;
					self.render(self.data);

					if (data.Finished) {
						opts.linkchecker.trigger('stopped');

						if (lscache.supported()) {
							lscache.set('data', data);
						}
					} else {
						setTimeout(self.doRequest, 1000);
					}
				}).fail(function(xhr) {
					opts.linkchecker.trigger('stopped');

					var statusCode = xhr.status;

					if (statusCode == 401) {
						self.setMessage("The validation of your token failed. The token is invalid or has expired. Please try it again or contact me if the token should be valid.", 'danger');
					}
					else if (statusCode == 500) {
						if (xhr.responseText == '') {
							self.setMessage("The check of your website failed. Please try it again.", 'danger');
						} else {
							self.setMessage("The check of your website failed with the error:<br/><strong>" + JSON.parse(xhr.responseText) + "</strong>.", 'danger');
						}
					}
					else if (statusCode == 503) {
						self.setMessage("The backend server is temporarily unavailable. Please try it again later.", 'danger');
					}
					else if (statusCode == 0 && self.retries < 3) {
						self.retries++;
						setTimeout(self.doRequest, 1000);
						return;
					}
					else {
						self.setMessage("The check of your website failed. Please try it again or contact the developer of the extensions.", 'danger');
					}

					self.resultsMessage = resultsMessage;
				}).always(function() {
					self.update();
				});
			};
			self.doRequest();
		}.bind(this)

		self.render = function(data) {
			self.urlsCrawledCount = data.URLsCrawledCount;
			self.checkedLinksCount = data.CheckedLinksCount;

			if (data.Finished) {
				if (data.LimitReached) {
					self.setMessage("The URL limit was reached. The Link Checker has not checked your complete website. You could buy a token for the <a href=\"https://www.marcobeierer.com/purchase\">Link Checker Professional</a> to check up to 50'000 URLs.", 'danger');
				} else {
					var message = "Your website has been checked successfully. Please see the result below.";

					if (data.Stats != undefined && !data.Stats.TokenUsed) {
						message += " If you additionally like to check your site for <strong>broken images</strong> or like to use the scheduler for an <strong>automatically triggered daily check</strong>, then have a look at the <a href=\"https://www.marcobeierer.com/purchase\">Link Checker Professional</a>.";
					}

					self.setMessage(message, 'success');
				}

				self.resultsMessage = 'Nothing is broken, everything seems to be fine.';

				if (!jQuery.isEmptyObject(data.DeadLinks)) {

					for (var url in data.DeadLinks) {
						self.urlsWithBrokenLinks[url] = {};

						data.DeadLinks[url].forEach(function(obj) {
							if (!self.showWorkingRedirects && obj.StatusCode < 300) {
								return;
							}

							obj.FoundOnURL = url;
							self.urlsWithBrokenLinks[url][obj.URL] = obj;
						});

						if (Object.keys(self.urlsWithBrokenLinks[url]).length == 0) {
							delete self.urlsWithBrokenLinks[url];
						}
					}
				}

				if (!jQuery.isEmptyObject(data.UnhandledLinkedResources)) {
					for (var url in data.UnhandledLinkedResources) {
						self.urlsWithLinksBlockedByRobots[url] = {};

						data.UnhandledLinkedResources[url].forEach(function(obj) {
							obj.FoundOnURL = url;
							self.urlsWithLinksBlockedByRobots[url][obj.URL] = obj;
						});

						if (Object.keys(self.urlsWithLinksBlockedByRobots[url]).length == 0) {
							delete self.urlsWithLinksBlockedByRobots[url];
						}
					}
				}

				if (!jQuery.isEmptyObject(data.DeadEmbeddedImages)) {

					for (var url in data.DeadEmbeddedImages) {
						self.urlsWithDeadImages[url] = {};

						data.DeadEmbeddedImages[url].forEach(function(obj) {
							if (!self.showWorkingRedirects && obj.StatusCode < 300) {
								return;
							}

							obj.FoundOnURL = url;
							self.urlsWithDeadImages[url][obj.URL] = obj;
						});

						if (Object.keys(self.urlsWithDeadImages[url]).length == 0) {
							delete self.urlsWithDeadImages[url];
						}
					}
				}

				if (!jQuery.isEmptyObject(data.DeadEmbeddedYouTubeVideos)) {

					for (var url in data.DeadEmbeddedYouTubeVideos) {
						self.urlsWithDeadYouTubeVideos[url] = {};

						data.DeadEmbeddedYouTubeVideos[url].forEach(function(obj) {
							if (!self.showWorkingRedirects && obj.StatusCode < 300) {
								return;
							}

							obj.FoundOnURL = url;
							self.urlsWithDeadYouTubeVideos[url][obj.URL] = obj;
						});

						if (Object.keys(self.urlsWithDeadYouTubeVideos[url]).length == 0) {
							delete self.urlsWithDeadYouTubeVideos[url];
						}
					}
				}

				if (!jQuery.isEmptyObject(data.UnhandledEmbeddedResources)) {
					for (var url in data.UnhandledEmbeddedResources) {
						self.urlsWithUnhandledEmbeddedResources[url] = {};

						data.UnhandledEmbeddedResources[url].forEach(function(obj) {
							obj.FoundOnURL = url;
							self.urlsWithUnhandledEmbeddedResources[url][obj.URL] = obj;
						});

						if (Object.keys(self.urlsWithUnhandledEmbeddedResources[url]).length == 0) {
							delete self.urlsWithUnhandledEmbeddedResources[url];
						}
					}
				}
			}
		}
});
riot.tag2('raw', '<span></span>', '', '', function(opts) {
		var self = this;

		self.root.innerHTML = opts.content;

		self.on('update', function() {
			self.root.innerHTML = opts.content
		});
});
riot.tag2('resulttable', '<div class="panel panel-default table-responsive"> <table class="table table-striped"> <thead> <tr> <th style="width: 35%;">{thCol1}</th> <th>{thCol2}</th> <th style="width: 10em;">{thCol3}</th> </tr> </thead> <tbody> <tr if="{!data || Object.keys(data).length === 0}"> <td>{resultsMessage}</td> <td></td> <td></td> </tr> <tr each="{deadResources, foundOnURL in data}"> <td><a href="{foundOnURL}" target="_blank">{foundOnURL}</a></td> <td colspan="2"> <div class="panel panel-default" style="margin-bottom: 0;"> <table class="table"> <tr each="{deadResource in deadResources}"> <td><a href="{deadResource.URL}" target="_blank">{deadResource.URL}</a></td> <td style="width: 9em;">{deadResource.StatusCode}</td> </tr> </table> </div> </td> </tr> </tbody> <tfoot> <tr> <th>{thCol1}</th> <th>{thCol2}</th> <th>{thCol3}</th> </tr> </tfoot> </table> </div>', '', '', function(opts) {
		var self = this;

		self.thCol1 = opts.thCol1;
		self.thCol2 = opts.thCol2;
		self.thCol3 = opts.thCol3;

		self.resultsMessage = opts.resultsMessage;
		self.data = opts.data;

		self.on('update', function() {
			self.resultsMessage = opts.resultsMessage;
			self.data = opts.data;
		});

});
