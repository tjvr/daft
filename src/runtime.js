
import type from "./type";

function assert(x) {
  if (!x) throw "Assertion failed!";
}

import jsBigInteger from "js-big-integer";
import _fraction from "fraction.js";
import _tinycolor from  "tinycolor2";

var BigInteger = jsBigInteger.BigInteger;

class Record {
  constructor(type, values) {
    //this.type = type || type.record(values);
    this.values = values;
  }

  update(newValues) {
    var values = {};
    this.type.keys().forEach(name => {
      values[name] = this.values[name];
    });
    Object.keys(newValues).forEach(name => {
      values[name] = newValues[name];
    });
    // TODO maintain order
    //return new Record(type.record(values), values);
  }

  toJSON() {
    return this.values;
  }
}

var Fraction = _fraction;
var tinycolor = _tinycolor;

class Uncertain {
  constructor(mean, stddev) {
    this.m = +mean;
    this.s = +stddev || 0;
  }

  static add(a, b) {
    return new Uncertain(a.m + b.m, Math.sqrt(a.s * a.s + b.s * b.s));
  }

  static mul(x, y) {
    var a = y.m * x.s;
    var b = x.m * y.s;
    return new Uncertain(x.m * y.m, Math.sqrt(a * a + b * b)); // TODO
  }
}


var typeOf = function(value) {
  if (value === undefined) return '';
  if (value === null) return '';
  switch (typeof value) {
    case 'number':
      if (/^-?[0-9]+$/.test(''+value)) return type.value('Int');
      return 'Float';
    case 'string':
      if (value === '') return type.value('Empty');
      return type.value('Text');
    case 'boolean':
      return type.value('Bool');
    case 'object':
      // if (value.isObservable) return type.value('Uneval'); // TODO
      if (value instanceof Thread) {
        return type.future(value.outputType);
      }
      switch (value.constructor) {
        case Error: return type.value('Error');
        case BigInteger: return type.value('Int');
        case Array: return type.value('List');
        case Image: return type.value('Image');
        case Uncertain: return type.value('Uncertain');
        // case Record: return value.schema ? value.schema.name : 'Record'; // TODO
      }
      if (value instanceof Fraction) return type.value('Frac'); // TODO
      if (value instanceof tinycolor) return type.value('Color'); // TODO
  }
  throw "Unknown type: " + value;
};



var self, S, R, STACK, C, WARP, CALLS, BASE, INDEX, THREAD, IMMEDIATE;

var display = function(type, content) {
  return ['text', 'view-' + type, content || ''];
};

function withValue(value, cb) {
  if (value instanceof Thread) {
    if (value.isDone) {
      cb(value.result);
    } else {
      value.onFirstEmit(cb);
    }
  } else {
    cb(value);
  }
}

var displayFloat = function(x) {
  var r = ''+x;
  var index = r.indexOf('.');
  if (index === -1) {
    r += '.';
  } else if (index !== -1 && !/e/.test(r)) {
    if (r.length - index > 3) {
      r = x.toFixed(3);
    }
  }
  return display('Float', r);
};

var displayRecord = function(record) {
  // TODO use RecordView
  var schema = record.schema;
  var symbols = schema ? schema.symbols : Object.keys(record.values);
  var items = [];
  var r = ['table', items];
  if (schema) {
    r = ['block', [
      ['text', 'record-title', schema.name, 'auto'],
      r,
    ]];
  }

  symbols.forEach((symbol, index) => {
    var cell = ['cell', 'field', ['text', 'ellipsis', ". . ."]];
    var field = ['row', 'field', index, [
      ['text', 'field-name', symbol],
      ['text', 'field-sym', "→"],
      cell,
    ]];
    items.push(field);

    withValue(record.values[symbol], result => {
      var prim = this.evaluator.getPrim("display %s", [result]);
      var value = prim.func.call(this, result);
      cell[2] = value;
      this.emit(r);
    });
  });
  this.emit(r);
  return r;
};

var displayList = function(list) {
  var items = [];
  var l = ['table', items];

  var ellipsis = ['text', 'ellipsis', ". . ."];

  if (list.length === 0) {
    // TODO empty lists
    this.emit(l);
    return l;
  }

  withValue(list[0], first => {
    var isRecordTable = false;
    if (first instanceof Record) {
      var schema = first.schema;
      var symbols = schema ? schema.symbols : Object.keys(first.values);
      var headings = symbols.map(text => ['cell', 'header', ['text', 'heading', text], text]);
      items.push(['row', 'header', null, headings]);
      isRecordTable = true;
    }

    // TODO header row for list lists

    list.forEach((item, index) => {
      var type = typeOf(item);
      if (isRecordTable && /Record/.test(type)) {
        items.push(['row', 'record', index, [ellipsis]]);
        withValue(item, result => {
          var values = symbols.map(sym => {
            var value = result.values[sym];
            var prim = this.evaluator.getPrim("display %s", [value]);
            return ['cell', 'record', prim.func.call(this, value), sym];
          });
          items[index + 1] = ['row', 'record', index, values];
          this.emit(l);
        });

      } else if (/List$/.test(type)) {
        items.push(['row', 'list', index, [ellipsis]]);
        withValue(item, result => {
          var values = result.map((item2, index2) => {
            var prim = this.evaluator.getPrim("display %s", [item2]);
            return ['cell', 'list', prim.func.call(this, item2), index2 + 1];
          });
          items[index] = ['row', 'list', index, values];
        });

      } else {
        items.push(['row', 'item', index, [ellipsis]]);
        withValue(item, result => {
          var prim = this.evaluator.getPrim("display %s", [result]);
          var value = ['cell', 'item', prim.func.call(this, result)];
          items[isRecordTable ? index + 1 : index] = ['row', 'item', index, [value]];
        });
      }
    });
  });
  this.emit(l);
  return l;
};

var displayList = function(list) {
  if (!list) return;
  return ['block', list.map(x => ['text', 'Text', x])];
};

var mod = function(x, y) {
  var r = x % y;
  if (r / y < 0) {
    r += y;
  }
  return r;
};

var range = function(from, to) {
  var result = [];
  for (var i=from; i<=to; i++) {
    result.push(i);
  }
  return result;
};

var mathFunc = function(f, x) {
  switch (f) {
    case 'abs':
      return Math.abs(x);
    case 'floor':
      return Math.floor(x);
    case 'sqrt':
      return Math.sqrt(x);
    case 'ceiling':
      return Math.ceil(x);
    case 'cos':
      return Math.cos(x * Math.PI / 180);
    case 'sin':
      return Math.sin(x * Math.PI / 180);
    case 'tan':
      return Math.tan(x * Math.PI / 180);
    case 'asin':
      return Math.asin(x) * 180 / Math.PI;
    case 'acos':
      return Math.acos(x) * 180 / Math.PI;
    case 'atan':
      return Math.atan(x) * 180 / Math.PI;
    case 'ln':
      return Math.log(x);
    case 'log':
      return Math.log(x) / Math.LN10;
    case 'e ^':
      return Math.exp(x);
    case '10 ^':
      return Math.exp(x * Math.LN10);
  }
  return 0;
};

// TODO Records
var jsonToRecords = function(obj) {
  if (typeof obj === 'object') {
    if (obj.constructor === Array) {
      return obj.map(jsonToRecords);
    } else {
      var values = {};
      Object.keys(obj).forEach(key => {
        values[key] = jsonToRecords(obj[key]);
      });
      return new Record(null, values);
    }
  } else {
    return obj;
  }
};

var get = function(url) {
  var thread = THREAD;

  // TODO cors proxy
  //var cors = 'http://crossorigin.me/http://';
  var cors = 'http://localhost:1337/';
  url = cors + url.replace(/^https?\:\/\//, "");
  var xhr = new XMLHttpRequest;
  xhr.open('GET', url, true);
  xhr.onprogress = e => {
    // thread.progress(e.loaded, e.total, e.lengthComputable);
  };
  xhr.onload = () => {
    if (xhr.status === 200) {
      var r = {
        contentType: xhr.getResponseHeader('content-type'),
        response: xhr.response,
      };

      var mime = r.contentType.split(";")[0];
      var blob = r.response;
      if (/^image\//.test(mime)) {
        var img = new Image();
        img.addEventListener('load', e => {
          thread.emit(img);
        });
        img.src = URL.createObjectURL(blob);
      } else if (mime === 'application/json' || mime === 'text/json') {
        var reader = new FileReader;
        reader.onloadend = () => {
          try {
            var json = JSON.parse(reader.result);
          } catch (e) {
            thread.emit(new Error("Invalid JSON"));
            return;
          }
          thread.emit(jsonToRecords(json));
        };
        reader.onprogress = function(e) {
          //future.progress(e.loaded, e.total, e.lengthComputable);
        };
        reader.readAsText(blob);
      } else if (/^text\//.test(mime)) {
        var reader = new FileReader;
        reader.onloadend = () => {
          thread.emit(reader.result);
        };
        reader.onprogress = function(e) {
          //future.progress(e.loaded, e.total, e.lengthComputable);
        };
        reader.readAsText(blob);
      } else {
        thread.emit(new Error(`Unknown content type: ${mime}`));
      }
    } else {
      thread.emit(new Error('HTTP ' + xhr.status + ': ' + xhr.statusText));
    }
  };
  xhr.onerror = () => {
    thread.emit(new Error('XHR Error'));
  };
  xhr.responseType = 'blob';
  setTimeout(xhr.send.bind(xhr));
};

var save = function() {
  STACK.push(R);
  R = {};
};

var restore = function() {
  R = STACK.pop();
};

var saveCall = function() {
  CALLS.push(C);
  C = {};
};

var restoreCall = function() {
  C = CALLS.pop();
};


// var lastCalls = [];
var call = function(spec, id, values) {
  // lastCalls.push(spec);
  // if (lastCalls.length > 10000) lastCalls.shift();
  var procedure = S.procedures[spec];
  if (procedure) {
    STACK.push(R);
    CALLS.push(C);
    C = {
      base: procedure.fn,
      fn: S.fns[id],
      args: values,
      numargs: [],
      boolargs: [],
      stack: STACK = [],
      warp: procedure.warp
    };
    R = {};
    if (C.warp || WARP) {
      WARP++;
      IMMEDIATE = procedure.fn;
    } else {
      for (var i = CALLS.length, j = 5; i-- && j--;) {
        if (CALLS[i].base === procedure.fn) {
          var recursive = true;
          break;
        }
      }
      if (recursive) {
        self.queue[INDEX] = {
          parent: S,
          base: BASE,
          fn: procedure.fn,
          calls: CALLS
        };
      } else {
        IMMEDIATE = procedure.fn;
      }
    }
  } else {
    IMMEDIATE = S.fns[id];
  }
};

var endCall = function() {
  if (CALLS.length) {
    if (WARP) WARP--;
    IMMEDIATE = C.fn;
    C = CALLS.pop();
    STACK = C.stack;
    R = STACK.pop();
  }
};

var queue = function(id) {
  IMMEDIATE = THREAD.fns[id];
  assert(THREAD.fns.indexOf(IMMEDIATE) !== -1);
  // TODO warp??
};

var forceQueue = function(id) {
  self.queue[INDEX] = THREAD;
  THREAD.fn = THREAD.fns[id];

  // assert(THREAD.parent === S);
  // assert(THREAD.fns === S.fns);
  assert(THREAD.fns.indexOf(THREAD.fn) !== -1);
};

var request = function(index) {
  var computed = THREAD.inputs[index];
  THREAD.deps.add(computed);
  if (computed.isComputed) {
    var thread = computed.request();
    assert(computed._type !== null);
    return thread;
  } else {
    return computed;
  }
};

var await = function(thread, id) {
  if (thread instanceof Observable) return;
  var wake = THREAD;
  if (!thread.isDone) {
    thread.onFirstEmit(function(result) {
      awake(wake, id);
    });
    return true;
  }
};

var awake = function(thread, id) {
  self.queue.push(thread);
  thread.fn = thread.parent.fns[id];
}

var emit = function(result) {
  THREAD.emit(result);
};

/***************************************************************************/

// Internal definition
class Evaluator {
  constructor() {
    this.queue = [];
    this.baseNow = 0;
  }

  get framerate() { return 60; }

  initRuntime() {
    this.queue = [];
    this.onError = this.onError.bind(this);
  }

  startThread(thread) {
    var index = this.queue.indexOf(thread);
    if (index !== -1) {
      this.queue[index] = undefined;
    }
    this.queue.push(thread);
  }

  stopThread(thread) {
    var index = this.queue.indexOf(thread);
    if (index !== -1) {
      this.queue[index] = undefined;
    }
  }

  start() {
    this.isRunning = true;
    if (this.interval) return;
    addEventListener('error', this.onError);
    this.baseTime = Date.now();
    this.interval = setInterval(this.step.bind(this), 1000 / this.framerate);
  }

  pause() {
    if (this.interval) {
      this.baseNow = this.now();
      clearInterval(this.interval);
      delete this.interval;
      removeEventListener('error', this.onError);
    }
    this.isRunning = false;
  }

  stopAll() {
    this.hidePrompt = false;
    this.prompter.style.display = 'none';
    this.promptId = this.nextPromptId = 0;
    this.queue.length = 0;
    this.resetFilters();
    this.stopSounds();
    for (var i = 0; i < this.children.length; i++) {
      var c = this.children[i];
      if (c.isClone) {
        c.remove();
        this.children.splice(i, 1);
        i -= 1;
      } else if (c.isSprite) {
        c.resetFilters();
        if (c.saying) c.say('');
        c.stopSounds();
      }
    }
  }

  now() {
    return this.baseNow + Date.now() - this.baseTime;
  }

  step() {
    self = this;
    var start = Date.now();
    do {
      var queue = this.queue;
      for (INDEX = 0; INDEX < queue.length; INDEX++) {
        THREAD = queue[INDEX];
        if (THREAD) {
          S = THREAD.parent;
          IMMEDIATE = THREAD.fn;
          BASE = THREAD.base;
          CALLS = THREAD.calls;
          C = CALLS.pop();
          STACK = C.stack;
          R = STACK.pop();
          queue[INDEX] = undefined;
          WARP = 0;
          while (IMMEDIATE) {
            var fn = IMMEDIATE;
            assert(THREAD.fns.indexOf(fn) !== -1);
            IMMEDIATE = null;
            fn();
          }
          STACK.push(R);
          CALLS.push(C);
        }
      }
      for (var i = queue.length; i--;) {
        if (!queue[i]) queue.splice(i, 1);
      }
    } while (Date.now() - start < 1000 / this.framerate && queue.length);
    S = null;
  }

  onError(e) {
    clearInterval(this.interval);
  }

  handleError(e) {
    console.error(e.stack);
  }
}
var evaluator = new Evaluator();
evaluator.start();

class Graph {
  constructor(nodes, links) {
    this.nodes = {};
  }

  add(node, id) {
    if (this.nodes.hasOwnProperty(id)) throw "oops";
    this.nodes[id] = node;
    node.id = id;
  }

  get(nodeId) {
    return this.nodes[nodeId];
  }

  linkFromJSON(json) {
    return {from: this.get(json.from), index: json.index, to: this.get(json.to)};
  }

  onMessage(json) {
    switch (json.action) {
      case 'link':
        var link = this.linkFromJSON(json);
        link.to.replace(link.index, link.from);
        return;
      case 'unlink':
        var link = this.linkFromJSON(json);
        link.to.replace(link.index);
        return;
      case 'setLiteral':
        var node = this.get(json.id);
        node.assign(json.literal);
        return;
      case 'setSink':
        var node = this.get(json.id);
        node.isSink = json.isSink;
        return;
      case 'create':
        var node = json.hasOwnProperty('literal') ? new Observable(json.literal) : new Computed(json.name);
        this.add(node, json.id);
        return;
      case 'destroy':
        var node = this.get(json.id);
        this.remove(node);
        node.destroy();
        return;
      default:
        throw json;
    }
  }

  sendMessage(json) {}

  invalidate(node) {
    var action = 'invalidate';
    var id = node.id;
    var json = {action, id};
    this.sendMessage(json);
  }

  emit(node, value) {
    var action = 'emit';
    var id = node.id;
    var json = {action, id, value};
    this.sendMessage(json);
  }

  progress(node, loaded, total) {
    var action = 'progress';
    var id = node.id;
    var json = {action, id, loaded, total};
    this.sendMessage(json);
  }
}
export const graph = new Graph();

/***************************************************************************/

import compile from "./compile";

class Observable {
  constructor(value) {
    this.result = value;
    this.subscribers = new Set();
  }

  subscribe(obj) {
    this.subscribers.add(obj);
  }

  unsubscribe(obj) {
    this.subscribers.delete(obj);
  }

  assign(value) {
    this.result = value;
    this.invalidate();
    this.emit(value);
  }

  invalidate() {
    this.subscribers.forEach(s => s.invalidate(this));
  }

  emit() {
    this.subscribers.forEach(s => s.update(this));
  }

  update() {}

  type() {
    return typeOf(this.result);
  }
}

class Computed extends Observable {
  constructor(name, inputs) {
    super(null);
    this.name = name;
    this.args = name.split(" ").filter(x => x[0] === '%');

    inputs = inputs || [];
    this.inputs = inputs;
    this.deps = new Set(inputs.filter((arg, index) => (this.args[index] !== '%u')));
    this.fns = [];
    this.thread = null;
  }
  get isComputed() { return true; }

  invalidate(arg) {
    //assert(this.deps.has(arg));
    if (this.thread === null) {
      return;
    }
    // if (this.thread) {
    //   this.thread.cancel();
    // }
    this.thread = null;
    graph.invalidate(this);
    super.invalidate();
  }

  update(arg) {
    assert(this.deps.has(arg));
    if (this.thread && this.thread.hasStarted && this.thread.deps.has(arg)) {
      this.thread.cancel();
    }
    if (this.needed) {
      if (!arg.isComputed || arg._type === null) {
        this._type = null;
      }
      this.recompute();
    }
  }

  type() {
    // if (this._type) {
    //   return this._type;
    // }
    this.fns = [];
    this._type = compile(this);
    return this._type;
  }

  recompute() {
    console.log('recompute', this.name);
    this.type();
    if (!this._type) {
      this.setDeps(new Set(this.inputs.filter((arg, index) => (this.args[index] !== '%u'))));
      if (this.result !== null) {
        this.result = null;
        this.emit(null);
      }
    } else {
      var thread = this.thread = new Thread(evaluator, this, this.fns[0]);
      thread.onFirstEmit(result => {
        this.result = result;
        graph.emit(this, result);
        this.emit(result);

        this.setDeps(thread.deps);
      });
    }
  }

  setDeps(deps) {
    var oldDeps = this.deps;
    this.deps = deps;

    oldDeps.forEach(d => {
      if (!deps.has(d)) d.unsubscribe(this);
    });
    deps.forEach(d => {
      if (!oldDeps.has(d)) d.subscribe(this);
    });
  }

  replace(index, arg) {
    var old = this.inputs[index];
    if (arg === undefined) {
      delete this.inputs[index];
    } else {
      this.inputs[index] = arg;
    }
    if (old) {
      old.unsubscribe(this);
      if (this.deps.has(old)) {
        this.deps.delete(arg);
      }
    }
    this.invalidate();
    this._type = null;
    if (this.needed) {
      this.recompute();
    }
  }

  get needed() {
    return this.name === 'display %s' || this.subscribers.size;
  }

  subscribe(obj) {
    super.subscribe(obj);
  }

  request() {
    if (!this.thread) {
      this.recompute();
    }
    return this.thread;
  }
}

/*****************************************************************************/

class Thread {
  constructor(evaluator, parent, base) {
    this.evaluator = evaluator;
    this.parent = parent,
    this.base = base;
    this.fn = base;
    this.calls = [{args: [], stack: [{}]}];
    assert(base);

    this.fns = parent.fns;
    this.inputs = parent.inputs;
    this.outputType = parent._type;

    this.hasStarted = false;
    this.isDone = false;
    this.canceled = false;
    this.deps = new Set();
    this.evaluator.startThread(this);

    this.result = null;
    this.children = [];
    // TODO composite progress
  }

  cancel() {
    this.evaluator.stopThread(this);
    this.canceled = true;
  }

  emit(result) {
    this.result = result;
    if (!this.isDone) {
      this.isDone = true;
      this.dispatchFirstEmit(result);
    }
    this.dispatchEmit(result);
  }
}

import {addEvents} from "./events";
addEvents(Thread, 'firstEmit', 'emit', 'progress');

/***************************************************************************/

export const scopedEval = function(source) {
  return eval(source);
};

