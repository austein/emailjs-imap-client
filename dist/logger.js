'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createDefaultLogger;

var _common = require('./common');

var SESSIONCOUNTER = 0;

function createDefaultLogger(username, hostname) {
  var session = ++SESSIONCOUNTER;
  var log = function log(level, messages) {
    messages = messages.map(function (msg) {
      return typeof msg === 'function' ? msg() : msg;
    });
    var date = new Date().toISOString();
    var logMessage = '[' + date + '][' + session + '][' + username + '][' + hostname + '] ' + messages.join(' ');
    if (level === _common.LOG_LEVEL_DEBUG) {
      console.log('[DEBUG]' + logMessage);
    } else if (level === _common.LOG_LEVEL_INFO) {
      console.info('[INFO]' + logMessage);
    } else if (level === _common.LOG_LEVEL_WARN) {
      console.warn('[WARN]' + logMessage);
    } else if (level === _common.LOG_LEVEL_ERROR) {
      console.error('[ERROR]' + logMessage);
    }
  };

  return {
    debug: function debug(msgs) {
      return log(_common.LOG_LEVEL_DEBUG, msgs);
    },
    info: function info(msgs) {
      return log(_common.LOG_LEVEL_INFO, msgs);
    },
    warn: function warn(msgs) {
      return log(_common.LOG_LEVEL_WARN, msgs);
    },
    error: function error(msgs) {
      return log(_common.LOG_LEVEL_ERROR, msgs);
    }
  };
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9sb2dnZXIuanMiXSwibmFtZXMiOlsiY3JlYXRlRGVmYXVsdExvZ2dlciIsIlNFU1NJT05DT1VOVEVSIiwidXNlcm5hbWUiLCJob3N0bmFtZSIsInNlc3Npb24iLCJsb2ciLCJsZXZlbCIsIm1lc3NhZ2VzIiwibWFwIiwibXNnIiwiZGF0ZSIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImxvZ01lc3NhZ2UiLCJqb2luIiwiY29uc29sZSIsImluZm8iLCJ3YXJuIiwiZXJyb3IiLCJkZWJ1ZyIsIm1zZ3MiXSwibWFwcGluZ3MiOiI7Ozs7O2tCQVN3QkEsbUI7O0FBVHhCOztBQU9BLElBQUlDLGlCQUFpQixDQUFyQjs7QUFFZSxTQUFTRCxtQkFBVCxDQUE4QkUsUUFBOUIsRUFBd0NDLFFBQXhDLEVBQWtEO0FBQy9ELE1BQU1DLFVBQVUsRUFBRUgsY0FBbEI7QUFDQSxNQUFJSSxNQUFNLFNBQU5BLEdBQU0sQ0FBQ0MsS0FBRCxFQUFRQyxRQUFSLEVBQXFCO0FBQzdCQSxlQUFXQSxTQUFTQyxHQUFULENBQWE7QUFBQSxhQUFPLE9BQU9DLEdBQVAsS0FBZSxVQUFmLEdBQTRCQSxLQUE1QixHQUFvQ0EsR0FBM0M7QUFBQSxLQUFiLENBQVg7QUFDQSxRQUFNQyxPQUFPLElBQUlDLElBQUosR0FBV0MsV0FBWCxFQUFiO0FBQ0EsUUFBSUMsbUJBQWlCSCxJQUFqQixVQUEwQk4sT0FBMUIsVUFBc0NGLFFBQXRDLFVBQW1EQyxRQUFuRCxVQUFnRUksU0FBU08sSUFBVCxDQUFjLEdBQWQsQ0FBcEU7QUFDQSxRQUFJUixpQ0FBSixFQUErQjtBQUM3QlMsY0FBUVYsR0FBUixDQUFZLFlBQVlRLFVBQXhCO0FBQ0QsS0FGRCxNQUVPLElBQUlQLGdDQUFKLEVBQThCO0FBQ25DUyxjQUFRQyxJQUFSLENBQWEsV0FBV0gsVUFBeEI7QUFDRCxLQUZNLE1BRUEsSUFBSVAsZ0NBQUosRUFBOEI7QUFDbkNTLGNBQVFFLElBQVIsQ0FBYSxXQUFXSixVQUF4QjtBQUNELEtBRk0sTUFFQSxJQUFJUCxpQ0FBSixFQUErQjtBQUNwQ1MsY0FBUUcsS0FBUixDQUFjLFlBQVlMLFVBQTFCO0FBQ0Q7QUFDRixHQWJEOztBQWVBLFNBQU87QUFDTE0sV0FBTztBQUFBLGFBQVFkLDZCQUFxQmUsSUFBckIsQ0FBUjtBQUFBLEtBREY7QUFFTEosVUFBTTtBQUFBLGFBQVFYLDRCQUFvQmUsSUFBcEIsQ0FBUjtBQUFBLEtBRkQ7QUFHTEgsVUFBTTtBQUFBLGFBQVFaLDRCQUFvQmUsSUFBcEIsQ0FBUjtBQUFBLEtBSEQ7QUFJTEYsV0FBTztBQUFBLGFBQVFiLDZCQUFxQmUsSUFBckIsQ0FBUjtBQUFBO0FBSkYsR0FBUDtBQU1EIiwiZmlsZSI6ImxvZ2dlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIExPR19MRVZFTF9FUlJPUixcbiAgTE9HX0xFVkVMX1dBUk4sXG4gIExPR19MRVZFTF9JTkZPLFxuICBMT0dfTEVWRUxfREVCVUdcbn0gZnJvbSAnLi9jb21tb24nXG5cbmxldCBTRVNTSU9OQ09VTlRFUiA9IDBcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlRGVmYXVsdExvZ2dlciAodXNlcm5hbWUsIGhvc3RuYW1lKSB7XG4gIGNvbnN0IHNlc3Npb24gPSArK1NFU1NJT05DT1VOVEVSXG4gIGxldCBsb2cgPSAobGV2ZWwsIG1lc3NhZ2VzKSA9PiB7XG4gICAgbWVzc2FnZXMgPSBtZXNzYWdlcy5tYXAobXNnID0+IHR5cGVvZiBtc2cgPT09ICdmdW5jdGlvbicgPyBtc2coKSA6IG1zZylcbiAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgbGV0IGxvZ01lc3NhZ2UgPSBgWyR7ZGF0ZX1dWyR7c2Vzc2lvbn1dWyR7dXNlcm5hbWV9XVske2hvc3RuYW1lfV0gJHttZXNzYWdlcy5qb2luKCcgJyl9YFxuICAgIGlmIChsZXZlbCA9PT0gTE9HX0xFVkVMX0RFQlVHKSB7XG4gICAgICBjb25zb2xlLmxvZygnW0RFQlVHXScgKyBsb2dNZXNzYWdlKVxuICAgIH0gZWxzZSBpZiAobGV2ZWwgPT09IExPR19MRVZFTF9JTkZPKSB7XG4gICAgICBjb25zb2xlLmluZm8oJ1tJTkZPXScgKyBsb2dNZXNzYWdlKVxuICAgIH0gZWxzZSBpZiAobGV2ZWwgPT09IExPR19MRVZFTF9XQVJOKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tXQVJOXScgKyBsb2dNZXNzYWdlKVxuICAgIH0gZWxzZSBpZiAobGV2ZWwgPT09IExPR19MRVZFTF9FUlJPUikge1xuICAgICAgY29uc29sZS5lcnJvcignW0VSUk9SXScgKyBsb2dNZXNzYWdlKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZGVidWc6IG1zZ3MgPT4gbG9nKExPR19MRVZFTF9ERUJVRywgbXNncyksXG4gICAgaW5mbzogbXNncyA9PiBsb2coTE9HX0xFVkVMX0lORk8sIG1zZ3MpLFxuICAgIHdhcm46IG1zZ3MgPT4gbG9nKExPR19MRVZFTF9XQVJOLCBtc2dzKSxcbiAgICBlcnJvcjogbXNncyA9PiBsb2coTE9HX0xFVkVMX0VSUk9SLCBtc2dzKVxuICB9XG59XG4iXX0=