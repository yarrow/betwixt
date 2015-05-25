(function() {
  var BASE, Betwixt, DIE_ZERO_DIE, MAX_CODE, MIDPOINT, NONZERO, TRAILING_ZEROS, ZERO, after, appendAt, before, between, chars, hex4, noConflict, previous_Betwixt, root, toHex, trim, validated;

  root = this;

  previous_Betwixt = root.Betwixt;

  noConflict = function() {
    root.Betwixt = previous_Betwixt;
    return Betwixt;
  };

  BASE = Math.pow(2, 16);

  MAX_CODE = BASE - 1;

  ZERO = "\u0000";

  NONZERO = /[^\u0000]/;

  TRAILING_ZEROS = /\u0000+$/;

  trim = function(s) {
    return s.replace(TRAILING_ZEROS, "");
  };

  DIE_ZERO_DIE = new Error("Rank strings must be non-zero (non-empty)");

  validated = function(s) {
    return trim(s) || (function() {
      throw DIE_ZERO_DIE;
    })();
  };

  MIDPOINT = "\u8000";

  appendAt = function(s, j, N) {
    return s.substr(0, j) + String.fromCharCode(N);
  };

  between = function(a, c) {
    var L, hi, j, lo, mid, ref;
    a = trim(a);
    c = trim(c);
    if (a === c) {
      return a;
    }
    if (c < a) {
      ref = [c, a], a = ref[0], c = ref[1];
    }
    L = a.length;
    j = 0;
    while (j < L && a.charAt(j) === c.charAt(j)) {
      j++;
    }
    if (j === L && j < c.length) {
      a += ZERO;
      L++;
    }
    lo = a.charCodeAt(j);
    hi = c.charCodeAt(j);
    mid = Math.floor((hi + lo) / 2);
    if (lo < mid) {
      return appendAt(a, j, mid);
    }
    j++;
    if (j < c.length) {
      return c.substr(0, j);
    }
    while (j < L && a.charCodeAt(j) === MAX_CODE) {
      j++;
    }
    lo = j === L ? 0 : a.charCodeAt(j);
    return appendAt(a, j, Math.floor((BASE + lo) / 2));
  };

  before = function(s) {
    var decrement, j, result;
    s = validated(s);
    j = s.search(NONZERO);
    decrement = s.charCodeAt(j) - 1;
    result = appendAt(s, j, decrement);
    if (decrement === 0) {
      result += MIDPOINT;
    }
    return result;
  };

  after = function(s) {
    var j;
    s = trim(s);
    j = s.search(/[^\uffff]/);
    if (j === -1) {
      return s + MIDPOINT;
    } else {
      return appendAt(s, j, s.charCodeAt(j) + 1);
    }
  };

  chars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

  hex4 = function(n) {
    var h4, i, j, mod;
    h4 = [];
    for (j = i = 1; i <= 4; j = ++i) {
      mod = n % 16;
      h4.unshift(chars[mod]);
      n = (n - mod) / 16;
    }
    return h4.join("");
  };

  toHex = function(s) {
    var hex, j;
    hex = [];
    j = 0;
    while (j < s.length) {
      hex.push(hex4(s.charCodeAt(j++)));
    }
    return hex.join("");
  };

  Betwixt = {
    trim: trim,
    before: before,
    after: after,
    between: between,
    validated: validated,
    toHex: toHex,
    noConflict: noConflict,
    midpoint: function() {
      return MIDPOINT;
    }
  };

  if (typeof exports !== "undefined" && exports !== null) {
    if (typeof module !== "undefined" && module !== null) {
      module.exports = Betwixt;
    }
    exports.Betwixt = Betwixt;
  } else {
    root.Betwixt = Betwixt;
  }

}).call(this);
