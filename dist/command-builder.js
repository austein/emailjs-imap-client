'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.buildFETCHCommand = buildFETCHCommand;
exports.buildXOAuth2Token = buildXOAuth2Token;
exports.buildSEARCHCommand = buildSEARCHCommand;
exports.buildSTORECommand = buildSTORECommand;

var _emailjsImapHandler = require('emailjs-imap-handler');

var _emailjsMimeCodec = require('emailjs-mime-codec');

var _emailjsBase = require('emailjs-base64');

var _common = require('./common');

/**
 * Builds a FETCH command
 *
 * @param {String} sequence Message range selector
 * @param {Array} items List of elements to fetch (eg. `['uid', 'envelope']`).
 * @param {Object} [options] Optional options object. Use `{byUid:true}` for `UID FETCH`
 * @returns {Object} Structured IMAP command
 */
function buildFETCHCommand(sequence, items, options) {
  var command = {
    command: options.byUid ? 'UID FETCH' : 'FETCH',
    attributes: [{
      type: 'SEQUENCE',
      value: sequence
    }]
  };

  if (options.valueAsString !== undefined) {
    command.valueAsString = options.valueAsString;
  }

  var query = [];

  items.forEach(function (item) {
    item = item.toUpperCase().trim();

    if (/^\w+$/.test(item)) {
      // alphanum strings can be used directly
      query.push({
        type: 'ATOM',
        value: item
      });
    } else if (item) {
      try {
        // parse the value as a fake command, use only the attributes block
        var cmd = (0, _emailjsImapHandler.parser)((0, _common.toTypedArray)('* Z ' + item));
        query = query.concat(cmd.attributes || []);
      } catch (e) {
        // if parse failed, use the original string as one entity
        query.push({
          type: 'ATOM',
          value: item
        });
      }
    }
  });

  if (query.length === 1) {
    query = query.pop();
  }

  command.attributes.push(query);

  if (options.changedSince) {
    command.attributes.push([{
      type: 'ATOM',
      value: 'CHANGEDSINCE'
    }, {
      type: 'ATOM',
      value: options.changedSince
    }]);
  }

  return command;
}

/**
 * Builds a login token for XOAUTH2 authentication command
 *
 * @param {String} user E-mail address of the user
 * @param {String} token Valid access token for the user
 * @return {String} Base64 formatted login token
 */
function buildXOAuth2Token() {
  var user = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var token = arguments[1];

  var authData = ['user=' + user, 'auth=Bearer ' + token, '', ''];
  return (0, _emailjsBase.encode)(authData.join('\x01'));
}

/**
 * Compiles a search query into an IMAP command. Queries are composed as objects
 * where keys are search terms and values are term arguments. Only strings,
 * numbers and Dates are used. If the value is an array, the members of it
 * are processed separately (use this for terms that require multiple params).
 * If the value is a Date, it is converted to the form of "01-Jan-1970".
 * Subqueries (OR, NOT) are made up of objects
 *
 *    {unseen: true, header: ["subject", "hello world"]};
 *    SEARCH UNSEEN HEADER "subject" "hello world"
 *
 * @param {Object} query Search query
 * @param {Object} [options] Option object
 * @param {Boolean} [options.byUid] If ture, use UID SEARCH instead of SEARCH
 * @return {Object} IMAP command object
 */
function buildSEARCHCommand() {
  var query = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var command = {
    command: options.byUid ? 'UID SEARCH' : 'SEARCH'
  };

  var isAscii = true;

  var buildTerm = function buildTerm(query) {
    var list = [];

    Object.keys(query).forEach(function (key) {
      var params = [];
      var formatDate = function formatDate(date) {
        return date.toUTCString().replace(/^\w+, 0?(\d+) (\w+) (\d+).*/, '$1-$2-$3');
      };
      var escapeParam = function escapeParam(param) {
        if (typeof param === 'number') {
          return {
            type: 'number',
            value: param
          };
        } else if (typeof param === 'string') {
          if (/[\u0080-\uFFFF]/.test(param)) {
            isAscii = false;
            return {
              type: 'literal',
              value: (0, _common.fromTypedArray)((0, _emailjsMimeCodec.encode)(param)) // cast unicode string to pseudo-binary as imap-handler compiles strings as octets
            };
          }
          return {
            type: 'string',
            value: param
          };
        } else if (Object.prototype.toString.call(param) === '[object Date]') {
          // RFC 3501 allows for dates to be placed in
          // double-quotes or left without quotes.  Some
          // servers (Yandex), do not like the double quotes,
          // so we treat the date as an atom.
          return {
            type: 'atom',
            value: formatDate(param)
          };
        } else if (Array.isArray(param)) {
          return param.map(escapeParam);
        } else if ((typeof param === 'undefined' ? 'undefined' : _typeof(param)) === 'object') {
          return buildTerm(param);
        }
      };

      params.push({
        type: 'atom',
        value: key.toUpperCase()
      });

      [].concat(query[key] || []).forEach(function (param) {
        switch (key.toLowerCase()) {
          case 'uid':
            param = {
              type: 'sequence',
              value: param
            };
            break;
          // The Gmail extension values of X-GM-THRID and
          // X-GM-MSGID are defined to be unsigned 64-bit integers
          // and they must not be quoted strings or the server
          // will report a parse error.
          case 'x-gm-thrid':
          case 'x-gm-msgid':
            param = {
              type: 'number',
              value: param
            };
            break;
          default:
            param = escapeParam(param);
        }
        if (param) {
          params = params.concat(param || []);
        }
      });
      list = list.concat(params || []);
    });

    return list;
  };

  command.attributes = buildTerm(query);

  // If any string input is using 8bit bytes, prepend the optional CHARSET argument
  if (!isAscii) {
    command.attributes.unshift({
      type: 'atom',
      value: 'UTF-8'
    });
    command.attributes.unshift({
      type: 'atom',
      value: 'CHARSET'
    });
  }

  return command;
}

/**
 * Creates an IMAP STORE command from the selected arguments
 */
function buildSTORECommand(sequence) {
  var action = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var flags = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var command = {
    command: options.byUid ? 'UID STORE' : 'STORE',
    attributes: [{
      type: 'sequence',
      value: sequence
    }]
  };

  command.attributes.push({
    type: 'atom',
    value: action.toUpperCase() + (options.silent ? '.SILENT' : '')
  });

  command.attributes.push(flags.map(function (flag) {
    return {
      type: 'atom',
      value: flag
    };
  }));

  return command;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb21tYW5kLWJ1aWxkZXIuanMiXSwibmFtZXMiOlsiYnVpbGRGRVRDSENvbW1hbmQiLCJidWlsZFhPQXV0aDJUb2tlbiIsImJ1aWxkU0VBUkNIQ29tbWFuZCIsImJ1aWxkU1RPUkVDb21tYW5kIiwic2VxdWVuY2UiLCJpdGVtcyIsIm9wdGlvbnMiLCJjb21tYW5kIiwiYnlVaWQiLCJhdHRyaWJ1dGVzIiwidHlwZSIsInZhbHVlIiwidmFsdWVBc1N0cmluZyIsInVuZGVmaW5lZCIsInF1ZXJ5IiwiZm9yRWFjaCIsIml0ZW0iLCJ0b1VwcGVyQ2FzZSIsInRyaW0iLCJ0ZXN0IiwicHVzaCIsImNtZCIsImNvbmNhdCIsImUiLCJsZW5ndGgiLCJwb3AiLCJjaGFuZ2VkU2luY2UiLCJ1c2VyIiwidG9rZW4iLCJhdXRoRGF0YSIsImpvaW4iLCJpc0FzY2lpIiwiYnVpbGRUZXJtIiwibGlzdCIsIk9iamVjdCIsImtleXMiLCJrZXkiLCJwYXJhbXMiLCJmb3JtYXREYXRlIiwiZGF0ZSIsInRvVVRDU3RyaW5nIiwicmVwbGFjZSIsImVzY2FwZVBhcmFtIiwicGFyYW0iLCJwcm90b3R5cGUiLCJ0b1N0cmluZyIsImNhbGwiLCJBcnJheSIsImlzQXJyYXkiLCJtYXAiLCJ0b0xvd2VyQ2FzZSIsInVuc2hpZnQiLCJhY3Rpb24iLCJmbGFncyIsInNpbGVudCIsImZsYWciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O1FBZ0JnQkEsaUIsR0FBQUEsaUI7UUFpRUFDLGlCLEdBQUFBLGlCO1FBMEJBQyxrQixHQUFBQSxrQjtRQXdHQUMsaUIsR0FBQUEsaUI7O0FBbk5oQjs7QUFDQTs7QUFDQTs7QUFDQTs7QUFLQTs7Ozs7Ozs7QUFRTyxTQUFTSCxpQkFBVCxDQUE0QkksUUFBNUIsRUFBc0NDLEtBQXRDLEVBQTZDQyxPQUE3QyxFQUFzRDtBQUMzRCxNQUFJQyxVQUFVO0FBQ1pBLGFBQVNELFFBQVFFLEtBQVIsR0FBZ0IsV0FBaEIsR0FBOEIsT0FEM0I7QUFFWkMsZ0JBQVks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QUFpQixTQUFqQixHQUE2QixFQUFyRDtBQUZlLEdBQXhCOztBQUtBL0MsVUFBUUUsVUFBUixDQUFtQlcsSUFBbkIsQ0FBd0JpQyxNQUFNSixHQUFOLENBQVUsVUFBQ00sSUFBRCxFQUFVO0FBQzFDLFdBQU87QUFDTDdDLFlBQU0sTUFERDtBQUVMQyxhQUFPNEM7QUFGRixLQUFQO0FBSUQsR0FMdUIsQ0FBeEI7O0FBT0EsU0FBT2hELE9BQVA7QUFDRCIsImZpbGUiOiJjb21tYW5kLWJ1aWxkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwYXJzZXIgfSBmcm9tICdlbWFpbGpzLWltYXAtaGFuZGxlcidcbmltcG9ydCB7IGVuY29kZSB9IGZyb20gJ2VtYWlsanMtbWltZS1jb2RlYydcbmltcG9ydCB7IGVuY29kZSBhcyBlbmNvZGVCYXNlNjQgfSBmcm9tICdlbWFpbGpzLWJhc2U2NCdcbmltcG9ydCB7XG4gIGZyb21UeXBlZEFycmF5LFxuICB0b1R5cGVkQXJyYXlcbn0gZnJvbSAnLi9jb21tb24nXG5cbi8qKlxuICogQnVpbGRzIGEgRkVUQ0ggY29tbWFuZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBNZXNzYWdlIHJhbmdlIHNlbGVjdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtcyBMaXN0IG9mIGVsZW1lbnRzIHRvIGZldGNoIChlZy4gYFsndWlkJywgJ2VudmVsb3BlJ11gKS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QuIFVzZSBge2J5VWlkOnRydWV9YCBmb3IgYFVJRCBGRVRDSGBcbiAqIEByZXR1cm5zIHtPYmplY3R9IFN0cnVjdHVyZWQgSU1BUCBjb21tYW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEZFVENIQ29tbWFuZCAoc2VxdWVuY2UsIGl0ZW1zLCBvcHRpb25zKSB7XG4gIGxldCBjb21tYW5kID0ge1xuICAgIGNvbW1hbmQ6IG9wdGlvbnMuYnlVaWQgPyAnVUlEIEZFVENIJyA6ICdGRVRDSCcsXG4gICAgYXR0cmlidXRlczogW3tcbiAgICAgIHR5cGU6ICdTRVFVRU5DRScsXG4gICAgICB2YWx1ZTogc2VxdWVuY2VcbiAgICB9XVxuICB9XG5cbiAgaWYgKG9wdGlvbnMudmFsdWVBc1N0cmluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29tbWFuZC52YWx1ZUFzU3RyaW5nID0gb3B0aW9ucy52YWx1ZUFzU3RyaW5nXG4gIH1cblxuICBsZXQgcXVlcnkgPSBbXVxuXG4gIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICBpdGVtID0gaXRlbS50b1VwcGVyQ2FzZSgpLnRyaW0oKVxuXG4gICAgaWYgKC9eXFx3KyQvLnRlc3QoaXRlbSkpIHtcbiAgICAgIC8vIGFscGhhbnVtIHN0cmluZ3MgY2FuIGJlIHVzZWQgZGlyZWN0bHlcbiAgICAgIHF1ZXJ5LnB1c2goe1xuICAgICAgICB0eXBlOiAnQVRPTScsXG4gICAgICAgIHZhbHVlOiBpdGVtXG4gICAgICB9KVxuICAgIH0gZWxzZSBpZiAoaXRlbSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gcGFyc2UgdGhlIHZhbHVlIGFzIGEgZmFrZSBjb21tYW5kLCB1c2Ugb25seSB0aGUgYXR0cmlidXRlcyBibG9ja1xuICAgICAgICBjb25zdCBjbWQgPSBwYXJzZXIodG9UeXBlZEFycmF5KCcqIFogJyArIGl0ZW0pKVxuICAgICAgICBxdWVyeSA9IHF1ZXJ5LmNvbmNhdChjbWQuYXR0cmlidXRlcyB8fCBbXSlcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gaWYgcGFyc2UgZmFpbGVkLCB1c2UgdGhlIG9yaWdpbmFsIHN0cmluZyBhcyBvbmUgZW50aXR5XG4gICAgICAgIHF1ZXJ5LnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgICAgICB2YWx1ZTogaXRlbVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfSlcblxuICBpZiAocXVlcnkubGVuZ3RoID09PSAxKSB7XG4gICAgcXVlcnkgPSBxdWVyeS5wb3AoKVxuICB9XG5cbiAgY29tbWFuZC5hdHRyaWJ1dGVzLnB1c2gocXVlcnkpXG5cbiAgaWYgKG9wdGlvbnMuY2hhbmdlZFNpbmNlKSB7XG4gICAgY29tbWFuZC5hdHRyaWJ1dGVzLnB1c2goW3tcbiAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgIHZhbHVlOiAnQ0hBTkdFRFNJTkNFJ1xuICAgIH0sIHtcbiAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgIHZhbHVlOiBvcHRpb25zLmNoYW5nZWRTaW5jZVxuICAgIH1dKVxuICB9XG5cbiAgcmV0dXJuIGNvbW1hbmRcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSBsb2dpbiB0b2tlbiBmb3IgWE9BVVRIMiBhdXRoZW50aWNhdGlvbiBjb21tYW5kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXIgRS1tYWlsIGFkZHJlc3Mgb2YgdGhlIHVzZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSB0b2tlbiBWYWxpZCBhY2Nlc3MgdG9rZW4gZm9yIHRoZSB1c2VyXG4gKiBAcmV0dXJuIHtTdHJpbmd9IEJhc2U2NCBmb3JtYXR0ZWQgbG9naW4gdG9rZW5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkWE9BdXRoMlRva2VuICh1c2VyID0gJycsIHRva2VuKSB7XG4gIGxldCBhdXRoRGF0YSA9IFtcbiAgICBgdXNlcj0ke3VzZXJ9YCxcbiAgICBgYXV0aD1CZWFyZXIgJHt0b2tlbn1gLFxuICAgICcnLFxuICAgICcnXG4gIF1cbiAgcmV0dXJuIGVuY29kZUJhc2U2NChhdXRoRGF0YS5qb2luKCdcXHgwMScpKVxufVxuXG4vKipcbiAqIENvbXBpbGVzIGEgc2VhcmNoIHF1ZXJ5IGludG8gYW4gSU1BUCBjb21tYW5kLiBRdWVyaWVzIGFyZSBjb21wb3NlZCBhcyBvYmplY3RzXG4gKiB3aGVyZSBrZXlzIGFyZSBzZWFyY2ggdGVybXMgYW5kIHZhbHVlcyBhcmUgdGVybSBhcmd1bWVudHMuIE9ubHkgc3RyaW5ncyxcbiAqIG51bWJlcnMgYW5kIERhdGVzIGFyZSB1c2VkLiBJZiB0aGUgdmFsdWUgaXMgYW4gYXJyYXksIHRoZSBtZW1iZXJzIG9mIGl0XG4gKiBhcmUgcHJvY2Vzc2VkIHNlcGFyYXRlbHkgKHVzZSB0aGlzIGZvciB0ZXJtcyB0aGF0IHJlcXVpcmUgbXVsdGlwbGUgcGFyYW1zKS5cbiAqIElmIHRoZSB2YWx1ZSBpcyBhIERhdGUsIGl0IGlzIGNvbnZlcnRlZCB0byB0aGUgZm9ybSBvZiBcIjAxLUphbi0xOTcwXCIuXG4gKiBTdWJxdWVyaWVzIChPUiwgTk9UKSBhcmUgbWFkZSB1cCBvZiBvYmplY3RzXG4gKlxuICogICAge3Vuc2VlbjogdHJ1ZSwgaGVhZGVyOiBbXCJzdWJqZWN0XCIsIFwiaGVsbG8gd29ybGRcIl19O1xuICogICAgU0VBUkNIIFVOU0VFTiBIRUFERVIgXCJzdWJqZWN0XCIgXCJoZWxsbyB3b3JsZFwiXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHF1ZXJ5IFNlYXJjaCBxdWVyeVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcHRpb24gb2JqZWN0XG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmJ5VWlkXSBJZiB0dXJlLCB1c2UgVUlEIFNFQVJDSCBpbnN0ZWFkIG9mIFNFQVJDSFxuICogQHJldHVybiB7T2JqZWN0fSBJTUFQIGNvbW1hbmQgb2JqZWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFNFQVJDSENvbW1hbmQgKHF1ZXJ5ID0ge30sIG9wdGlvbnMgPSB7fSkge1xuICBsZXQgY29tbWFuZCA9IHtcbiAgICBjb21tYW5kOiBvcHRpb25zLmJ5VWlkID8gJ1VJRCBTRUFSQ0gnIDogJ1NFQVJDSCdcbiAgfVxuXG4gIGxldCBpc0FzY2lpID0gdHJ1ZVxuXG4gIGxldCBidWlsZFRlcm0gPSAocXVlcnkpID0+IHtcbiAgICBsZXQgbGlzdCA9IFtdXG5cbiAgICBPYmplY3Qua2V5cyhxdWVyeSkuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICBsZXQgcGFyYW1zID0gW11cbiAgICAgIGxldCBmb3JtYXREYXRlID0gKGRhdGUpID0+IGRhdGUudG9VVENTdHJpbmcoKS5yZXBsYWNlKC9eXFx3KywgMD8oXFxkKykgKFxcdyspIChcXGQrKS4qLywgJyQxLSQyLSQzJylcbiAgICAgIGxldCBlc2NhcGVQYXJhbSA9IChwYXJhbSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHBhcmFtID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgIHZhbHVlOiBwYXJhbVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKC9bXFx1MDA4MC1cXHVGRkZGXS8udGVzdChwYXJhbSkpIHtcbiAgICAgICAgICAgIGlzQXNjaWkgPSBmYWxzZVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2xpdGVyYWwnLFxuICAgICAgICAgICAgICB2YWx1ZTogZnJvbVR5cGVkQXJyYXkoZW5jb2RlKHBhcmFtKSkgLy8gY2FzdCB1bmljb2RlIHN0cmluZyB0byBwc2V1ZG8tYmluYXJ5IGFzIGltYXAtaGFuZGxlciBjb21waWxlcyBzdHJpbmdzIGFzIG9jdGV0c1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICB2YWx1ZTogcGFyYW1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSA9PT0gJ1tvYmplY3QgRGF0ZV0nKSB7XG4gICAgICAgICAgLy8gUkZDIDM1MDEgYWxsb3dzIGZvciBkYXRlcyB0byBiZSBwbGFjZWQgaW5cbiAgICAgICAgICAvLyBkb3VibGUtcXVvdGVzIG9yIGxlZnQgd2l0aG91dCBxdW90ZXMuICBTb21lXG4gICAgICAgICAgLy8gc2VydmVycyAoWWFuZGV4KSwgZG8gbm90IGxpa2UgdGhlIGRvdWJsZSBxdW90ZXMsXG4gICAgICAgICAgLy8gc28gd2UgdHJlYXQgdGhlIGRhdGUgYXMgYW4gYXRvbS5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ2F0b20nLFxuICAgICAgICAgICAgdmFsdWU6IGZvcm1hdERhdGUocGFyYW0pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocGFyYW0pKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcmFtLm1hcChlc2NhcGVQYXJhbSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgcmV0dXJuIGJ1aWxkVGVybShwYXJhbSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYXJhbXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhdG9tJyxcbiAgICAgICAgdmFsdWU6IGtleS50b1VwcGVyQ2FzZSgpXG4gICAgICB9KTtcblxuICAgICAgW10uY29uY2F0KHF1ZXJ5W2tleV0gfHwgW10pLmZvckVhY2goKHBhcmFtKSA9PiB7XG4gICAgICAgIHN3aXRjaCAoa2V5LnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICBjYXNlICd1aWQnOlxuICAgICAgICAgICAgcGFyYW0gPSB7XG4gICAgICAgICAgICAgIHR5cGU6ICdzZXF1ZW5jZScsXG4gICAgICAgICAgICAgIHZhbHVlOiBwYXJhbVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAvLyBUaGUgR21haWwgZXh0ZW5zaW9uIHZhbHVlcyBvZiBYLUdNLVRIUklEIGFuZFxuICAgICAgICAgIC8vIFgtR00tTVNHSUQgYXJlIGRlZmluZWQgdG8gYmUgdW5zaWduZWQgNjQtYml0IGludGVnZXJzXG4gICAgICAgICAgLy8gYW5kIHRoZXkgbXVzdCBub3QgYmUgcXVvdGVkIHN0cmluZ3Mgb3IgdGhlIHNlcnZlclxuICAgICAgICAgIC8vIHdpbGwgcmVwb3J0IGEgcGFyc2UgZXJyb3IuXG4gICAgICAgICAgY2FzZSAneC1nbS10aHJpZCc6XG4gICAgICAgICAgY2FzZSAneC1nbS1tc2dpZCc6XG4gICAgICAgICAgICBwYXJhbSA9IHtcbiAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgIHZhbHVlOiBwYXJhbVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcGFyYW0gPSBlc2NhcGVQYXJhbShwYXJhbSlcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFyYW0pIHtcbiAgICAgICAgICBwYXJhbXMgPSBwYXJhbXMuY29uY2F0KHBhcmFtIHx8IFtdKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgbGlzdCA9IGxpc3QuY29uY2F0KHBhcmFtcyB8fCBbXSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGxpc3RcbiAgfVxuXG4gIGNvbW1hbmQuYXR0cmlidXRlcyA9IGJ1aWxkVGVybShxdWVyeSlcblxuICAvLyBJZiBhbnkgc3RyaW5nIGlucHV0IGlzIHVzaW5nIDhiaXQgYnl0ZXMsIHByZXBlbmQgdGhlIG9wdGlvbmFsIENIQVJTRVQgYXJndW1lbnRcbiAgaWYgKCFpc0FzY2lpKSB7XG4gICAgY29tbWFuZC5hdHRyaWJ1dGVzLnVuc2hpZnQoe1xuICAgICAgdHlwZTogJ2F0b20nLFxuICAgICAgdmFsdWU6ICdVVEYtOCdcbiAgICB9KVxuICAgIGNvbW1hbmQuYXR0cmlidXRlcy51bnNoaWZ0KHtcbiAgICAgIHR5cGU6ICdhdG9tJyxcbiAgICAgIHZhbHVlOiAnQ0hBUlNFVCdcbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuIGNvbW1hbmRcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIElNQVAgU1RPUkUgY29tbWFuZCBmcm9tIHRoZSBzZWxlY3RlZCBhcmd1bWVudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU1RPUkVDb21tYW5kIChzZXF1ZW5jZSwgYWN0aW9uID0gJycsIGZsYWdzID0gW10sIG9wdGlvbnMgPSB7fSkge1xuICBsZXQgY29tbWFuZCA9IHtcbiAgICBjb21tYW5kOiBvcHRpb25zLmJ5VWlkID8gJ1VJRCBTVE9SRScgOiAnU1RPUkUnLFxuICAgIGF0dHJpYnV0ZXM6IFt7XG4gICAgICB0eXBlOiAnc2VxdWVuY2UnLFxuICAgICAgdmFsdWU6IHNlcXVlbmNlXG4gICAgfV1cbiAgfVxuXG4gIGNvbW1hbmQuYXR0cmlidXRlcy5wdXNoKHtcbiAgICB0eXBlOiAnYXRvbScsXG4gICAgdmFsdWU6IGFjdGlvbi50b1VwcGVyQ2FzZSgpICsgKG9wdGlvbnMuc2lsZW50ID8gJy5TSUxFTlQnIDogJycpXG4gIH0pXG5cbiAgY29tbWFuZC5hdHRyaWJ1dGVzLnB1c2goZmxhZ3MubWFwKChmbGFnKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdhdG9tJyxcbiAgICAgIHZhbHVlOiBmbGFnXG4gICAgfVxuICB9KSlcblxuICByZXR1cm4gY29tbWFuZFxufVxuIl19