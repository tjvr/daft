
import {BigInteger} from "js-big-integer";

var literals = [
  ["Int", /^-?[0-9]+$/, BigInteger.parseInt],

  ["Frac", /^-?[0-9]+\/[0-9]+$/, x => new Fraction(x)],

  ["Float", /^[0-9]+(?:\.[0-9]+)?e-?[0-9]+$/, parseFloat], // 123[.123]e[-]123
  ["Float", /^(?:0|[1-9][0-9]*)?\.[0-9]+$/,   parseFloat], // [123].123
  ["Float", /^(?:0|[1-9][0-9]*)\.[0-9]*$/,    parseFloat], // 123.[123]

  // ["Text", /^/, x => x],
];

var literalsByType = {};
literals.forEach(l => {
  let [type, pat, func] = l;
  if (!literalsByType[type]) literalsByType[type] = [];
  literalsByType[type].push([pat, func]);
});


export const literal = (value, types) => {
  value = value === undefined ? '' : ''+value;
  //for (var i=0; i<types.length; i++) {
  //  var type = types[i];
  //  var lits = literalsByType[type];
  var lits = literals;
  for (var j=0; j<lits.length; j++) {
    let [type, pat, func] = lits[j];
    if (pat.test(value)) {
      // TODO detect BigInteger
      return func(value);
    }
  }
  return ''+value;
};

/*****************************************************************************/


export const specs = [

  // TODO auto-ringification
  // TODO optional arguments

  ["ring", "%s", []],
  ["hidden", "display %s", []],

  ["ops", "literal %s"],

  /* Record */

  // TODO
  ["record", "record with %fields"],
  ["record", "update %o with %fields"], // TODO remove??
  ["record", "merge %o with %o"],
  ["record", "%q of %o", ["name"]],
  ["record", "table headings: %l %br rows: %l"],
  // ["record", "%o to JSON"],
  // ["record", "from JSON %s"],

  /* List */

  ["list", "list %exp", ["foo", "bar", "baz"]],
  ["list", "range %n to %n", [1, 5]],
  ["list", "item %n of %l", [1]],
  ["list", "%l concat %l"],
  ["list", "length of %l", []],
  // ["list", "sum %l"],
  // ["list", "count %l", []],
  // ["list", "count %l if %r", []],
  // ["list", "keep %r from %l"],
  // ["list", "for each %l do %r"],
  // ["list", "combine %l with %r"],

  // TODO

  /* Text */

  ["text", "text %s"],
  ["text", "join %exp", ["Hello ", "world"]],
  //["text", "join words %s"],
  ["text", "join %l with %s", ["", " "]],
  //["text", "split words %s"],
  ["text", "split %s by %s", ["", " "]],
  //["text", "split lines %s"],
  ["text", "replace %s with %s in %s", ["-", "_", "fish-cake"]],

  /* Math */

  ["math", "%n + %n"],
  ["math", "%n – %n"],
  ["math", "%n × %n"],
  ["math", "%n / %n"],
  ["math", "%n rem %n"],
  ["math", "%n ^ %n", ["", 2]], // TODO pow
  ["math", "round %n"],
  ["math", "float %n"],

  ["math", "%n ± %n"],
  ["math", "mean %n"],
  ["math", "stddev %n"],

  // TODO menus
  ["math", "sqrt of %n", [10]],
  ["math", "sin of %n", [30]],
  ["math", "cos of %n", [60]],
  ["math", "tan of %n", [45]],

  // ["math", "random %n to %n", [1, 10]],

  /* Conditions */

  ["bool", "%s = %s"],
  ["bool", "%s < %s"],
  ["bool", "%b and %b"],
  ["bool", "%b or %b"],
  ["bool", "not %b"],
  ["bool", "%b"],
  ["bool", "%u if %b else %u", ['', true]],
  ["bool", "repeat %n times: %s", [3, 'party']],

  /* Color */

//  ["color", "%c", []],
//  ["color", "color %s", ["blue"]],
//  // ["color", "color %s", ["#0cb6f7"]],
//  ["color", "mix %c with %n %% of %c", ['', 50, '']],
//  // ["color", "r %n g %n b %n", [0, 127, 255]],
//  // ["color", "h %n s %n v %n", [0, 127, 255]],
//  ["color", "brightness of %c", []],
//  ["color", "luminance of %c", []],
//
//  ["color", "%c to hex"],
//  ["color", "%c to rgb"],
//  ["color", "%c to hsv"],
//  ["color", "spin %c by %n"],
//  // TODO menus
//  ["color", "analogous colors %c"],
//  ["color", "triad colors %c"],
//  ["color", "monochromatic colors %c"],
//  ["color", "invert %c"],
//  ["color", "complement %c"],

  /* Image */

  /* Web */

  ["sensing", "get %s", ["https://tjvr.org/"]],
  ["sensing", "get %s", ["http://i.imgur.com/svIp9cx.jpg?1"]],
  ["sensing", "get %s", ["https://api.scratch.mit.edu/users/blob8108"]],

  // ["sensing", "select %s from %html"],

  /* Time */

  ["sensing", "time"],
  ["sensing", "date"],

  // ["sensing", "error"],
  ["sensing", "delay %n secs: %s", [1, ""]],

  ["custom", "fib %n", [5]],
  ["custom", "gcd %n %n", [12, 34]],

];

export const byHash = {};
specs.forEach(p => {
  let [category, spec, defaults] = p;
  var hash = spec.split(" ").map(word => {
    return word === '%%' ? "%"
         : word === '%br' ? "BR"
         : /^%/.test(word) ? "_"
         : word;
  }).join(" ");
  byHash[hash] = spec;
});

/*****************************************************************************/

export const functions = {

  "UI <- display None": '(display("Error", "None"))',
  "UI <- display Error": '(display("Error", $0.message || $0))',
  "UI <- display Text": '(display("Text", $0))',
  "UI <- display Int": '(display("Int", ""+$0))',
  "UI <- display Frac": `(['block', [
    display('Frac-num', ''+$0.n),
    ['rect', '#000', 'auto', 2],
    display('Frac-den', ''+$0.d),
  ]])`,
  "UI <- display Bool": "(display('Symbol view-Bool-' + ($0 ? 'yes' : 'no'), $0 ? 'yes' : 'no'))",
  "UI <- display Image": '(["image", $0.cloneNode()])',
  // "UI <- display Color": '(["rect", $0.toHexString(), 24, 24, "view-Color"])',
  "UI <- display Uncertain": `(['inline', [
    display('Uncertain-mean', ''+$0.m),
    display('Uncertain-sym', "±"),
    display('Uncertain-stddev', ''+$0.s),
  ]])`,
  "UI <- display Float": 'displayFloat',
  "UI <- display Record": 'displayRecord',
  "UI <- display List": 'displayList',
  //"UI <- display Any": '(display("Text", $0))',

  /* Int */
  "Int <- Int + Int": 'BigInteger.add',
  "Int <- Int – Int": 'BigInteger.subtract',
  "Int <- Int × Int": 'BigInteger.multiply',
  "Int <- Int rem Int": 'BigInteger.remainder',
  "Int <- round Int": '($0)',
  "Int <- round Empty": '(0)',
  "Int <- round Text": '(safely(function() { return BigInteger.parseInt($0) }))',
  "Bool <- Int = Int": '(BigInteger.compareTo($0, $1) === 0)',
  "Bool <- Int < Int": '(BigInteger.compareTo($0, $1) === -1)',
  "Frac <- Int / Int": '(new Fraction($0, $1))',
  "Float <- float Int": '(+$0.toString())',

  /* Frac */
  "Frac <- Frac + Frac": '($0.add($1))',
  "Frac <- Frac – Frac": '($0.sub($1))',
  "Frac <- Frac × Frac": '($0.mul($1))',
  "Frac <- Frac / Frac": '($0.div($1))',
  "Float <- float Frac": '($0.n / $0.d)',
  "Int <- round Frac": '(BigInteger.parseInt(""+Math.round($0.n / $0.d)))', // TODO

  /* Float */
  "Float <- Float + Float": '($0 + $1)',
  "Float <- Float – Float": '($0 - $1)',
  "Float <- Float × Float": '($0 * $1)',
  "Float <- Float / Float": '($0 / $1)',
  "Float <- Float ^ Float": '(Math.pow($0, $1))',
  "Float <- Float rem Float": 'mod',
  "Int <- round Float": '(BigInteger.parseInt(""+Math.round($0)))',
  "Float <- float Float": '($0)',
  "Bool <- Float = Float": '($0 === $1)',
  "Bool <- Float < Float": '($0 < $1)',

  "Float <- sqrt of Float": '(Math.sqrt($0))',
  "Float <- sin of Float": '(Math.sin(Math.PI / 180 * $0))',
  "Float <- cos of Float": '(Math.cos(Math.PI / 180 * $0))',
  "Float <- tan of Float": '(Math.tan(Math.PI / 180 * $0))',

  /* Complex */
  // TODO

  /* Decimal */
  // TODO

  /* Uncertain */
  "Uncertain <- Float ± Float": '(new Uncertain($0, $1))',
  "Int <- round Uncertain": '($0.m | 0)',
  "Float <- float Uncertain": '($0.m)',
  "Bool <- Uncertain = Uncertain": '($0.m === $1.m && $0.s === $1.s)',

  "Uncertain <- mean List": 'sampleMean',
  "Float <- mean Uncertain": '($0.m)',
  "Float <- stddev Uncertain": '($0.s)',
  "Uncertain <- Uncertain + Uncertain": 'Uncertain.add',
  "Uncertain <- Uncertain × Uncertain": 'Uncertain.mul',

  /* Bool */
  "Bool <- Bool and Bool": '($0 && $1)',
  "Bool <- Bool or Bool": '($0 || $1)',
  "Bool <- not Bool": '(!$0)',
  "Bool <- Bool": '($0)',
  "Bool <- Bool = Bool": '($0 === $1)',

  "Any Future <- Uneval if Bool else Uneval": 'ifElse',

  "List <- repeat Int times: Any": 'repeat',
  "Text <- repeat Int times: Text": 'repeatText',


  /* Text */
  "Text <- literal Text": '($0)',
  "Text <- text Text": '($0)',
  "Int <- literal Int": '($0)',
  "Frac <- literal Frac": '($0)',
  "Float <- literal Float": '($0)',

  "Bool <- Text = Text": '($0 === $1)',
  "Text <- join Variadic": function(...args) {
    var arrays = [];
    var vectorise = [];
    var len;
    for (var index=0; index<args.length; index++) {
      var item = args[index];
      if (item && item.constructor === Array) {
        arrays.push(item);
        vectorise.push(index);
        if (len === undefined) {
          len = item.length;
        } else if (len !== item.length) {
          return new Error("Lists must be same length");
        }
      }
    }
    if (!arrays.length) {
      return args.join("");
    }

    var prim = this.evaluator.getPrim("join %exp", args);
    var Thread = this.constructor;
    var threads = [];
    for (var i=0; i<len; i++) {
      for (var j=0; j<vectorise.length; j++) {
        var index = vectorise[j];
        args[index] = arrays[j][i];
      }
      threads.push(Thread.fake(prim, args.slice()));
    }
    this.awaitAll(threads, () => {});
    return threads;
  },
  "Text <- join List with Text": '($0.join($1))',
  "Text List <- split Text by Text": '($0.split($1))',
  "Text <- replace Text with Text in Text": '($2.replace($0, $1))',

  /* List */

  "List <- list Variadic": (...rest) => {
    return rest;
  },
  "List <- List concat List": '($0.concat($1))',
  "Int List <- range Int to Int": 'range',

  "Any <- item Int of List": '($1[$0 - 1])',

  // "Int <- sum List": '', // TODO

  "Int <- length of List": '($0.length)',

  /* Record */
  /* "Record <- record with Variadic": */
  "Record <- update Record with Variadic": (record, ...pairs) => {
    var record = record || new Record(null, {});
    if (!(record instanceof Record)) return;
    var values = {};
    for (var i=0; i<pairs.length; i += 2) {
      var name = pairs[i], value = pairs[i + 1];
      values[name] = value;
    }
    var result = record.update(values);
    return result;
  },
  "Record <- merge Record with Record": (src, dest) => {
    return src.update(dest.values);
  },
  "Any <- Text of Record": (name, record) => {
    if (!(record instanceof Record)) return;
    return record.values[name];
  },
  "Record Future <- table headings: List BR rows: List": function(symbols, rows) {
    var table = [];
    var init = false;
    rows.forEach((item, index) => {
      table.push(null);
      withValue(item, result => {
        var rec = {};
        for (var i=0; i<symbols.length; i++) {
          var name = symbols[i];
          rec[name] = result[i];
        }
        table[index] = new Record(null, rec);
        if (init) this.emit(table);
      });
    });
    this.emit(table);
    init = true;
  },
  // "Text <- Any to JSON": record => {
  //   return JSON.stringify(record);
  // },
  // "Text <- List to JSON": record => {
  //   return JSON.stringify(record);
  // },
  // "Text <- Record to JSON": record => {
  //   return JSON.stringify(record);
  // },

  // "Record <- from JSON Text": text => {
  //   try {
  //     var json = JSON.parse(text);
  //   } catch (e) {
  //     return new Error("Invalid JSON");
  //   }
  //   return jsonToRecords(json);
  // },


  /* Color */
  // TODO re-implement in-engine
//  "Bool <- Color = Color": 'tinycolor.equals',
//  "Color <- Color": x => x,
//  "Color <- color Color": x => x,
//  "Color <- color Text": x => {
//    var color = tinycolor(x);
//    if (!color.isValid()) return;
//    return color;
//  },
//  "Color <- color Rgb": record => {
//    var values = record.values;
//    var color = tinycolor({ r: values.red, g: values.green, b: values.blue });
//    if (!color.isValid()) return;
//    return color;
//  },
//  "Color <- color Hsv": record => {
//    var values = record.values;
//    var color = tinycolor({ h: values.hue, s: values.sat, v: values.val });
//    if (!color.isValid()) return;
//    return color;
//  },
//  "Color <- mix Color with Float % of Color": (a, mix, b) => tinycolor.mix(a, b, mix),
//  "Float <- brightness of Color": x => x.getBrightness(),
//  "Float <- luminance of Color": x => x.getLuminance(),
//  "Color <- spin Color by Int": (color, amount) => color.spin(amount),
//  "Color <- complement Color": x => x.complement(),
//  "Color <- invert Color": x => {
//    var {r, g, b} = x.toRgb();
//    return tinycolor({r: 255 - r, g: 255 - g, b: 255 - b});
//  },
//
//  // TODO menus
//  "Record <- Color to hex": x => x.toHexString(),
//  "Record <- Color to rgb": x => {
//    var o = x.toRgb();
//    return new Record(RGB, { red: o.r, green: o.g, blue: o.b });
//  },
//  "Record <- Color to hsv": x => {
//    var o = x.toHsv();
//    return new Record(HSV, { hue: o.h, sat: o.s, val: o.v });
//  },
//
//  // TODO menus
//  "List <- analogous colors Color": x => x.analogous(),
//  "List <- triad colors Color": x => x.triad(),
//  "List <- monochromatic colors Color": x => x.monochromatic(),


  /* Async tests */

  "WebPage Future <- get Text": 'getURL',

  "Any Future <- delay Int secs: Any": 'delay',

  "Time Future <- time": 'time',
  "Date Future <- date": 'date',

  "Bool <- Time < Time": function(a, b) {
    var x = a.values;
    var y = b.values;
    return x.hour < y.hour && x.mins < y.mins && x.secs < y.secs;
  },
  "Bool <- Date < Date": function(a, b) {
    var x = a.values;
    var y = b.values;
    return x.year < y.year && x.month < y.month && x.day < y.day;
  },

  "Int <- fib Int": 'fib',

};

