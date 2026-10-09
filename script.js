(function () {
  "use strict";

  // ---- constants (same as the Python script) ----
  var SC = 21, OY = 20, DURATION = 10, TICK = 16, ANIM = 42, LIFT = 34, GAP = 7;
  var SIZES = [9, 10, 11, 12];
  var FONT = "Arial, 'Noto Sans', 'Segoe UI', sans-serif";
  var BG = "#060208";
  var W = 800, H = 800;

  var PHRASES = [
    "I love you", "Seni seviyorum", "Te amo", "Je t'aime",
    "Ich liebe dich", "Ti amo", "Eu te amo", "Я тебя люблю",
    "사랑해", "愛してる", "我爱你", "मैं तुमसे प्यार करता हूँ",
    "Σ' αγαπώ", "Ik hou van jou", "Jag älskar dig", "Kocham cię",
    "ฉันรักเธอ", "Anh yêu em", "Aku cinta kamu", "Я тебе кохаю"
  ];

  // ---- Python-compatible random.Random(seed) (Mersenne Twister) ----
  function PyRandom(seed) {
    var mt = new Uint32Array(624), mti = 625;
    function initGenrand(s) {
      mt[0] = s >>> 0;
      for (var i = 1; i < 624; i++) {
        var p = mt[i - 1] ^ (mt[i - 1] >>> 30);
        mt[i] = (Math.imul(1812433253, p) + i) >>> 0;
      }
      mti = 624;
    }
    function initByArray(key) {
      initGenrand(19650218);
      var i = 1, j = 0, k = Math.max(624, key.length);
      for (; k; k--) {
        var p = mt[i - 1] ^ (mt[i - 1] >>> 30);
        mt[i] = ((mt[i] ^ Math.imul(p, 1664525)) + key[j] + j) >>> 0;
        i++; j++;
        if (i >= 624) { mt[0] = mt[623]; i = 1; }
        if (j >= key.length) j = 0;
      }
      for (k = 623; k; k--) {
        var q = mt[i - 1] ^ (mt[i - 1] >>> 30);
        mt[i] = ((mt[i] ^ Math.imul(q, 1566083941)) - i) >>> 0;
        i++;
        if (i >= 624) { mt[0] = mt[623]; i = 1; }
      }
      mt[0] = 0x80000000;
      mti = 624;
    }
    function genrand() {
      var y;
      if (mti >= 624) {
        var kk;
        for (kk = 0; kk < 624 - 397; kk++) {
          y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
          mt[kk] = mt[kk + 397] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0);
        }
        for (; kk < 623; kk++) {
          y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
          mt[kk] = mt[kk + (397 - 624)] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0);
        }
        y = (mt[623] & 0x80000000) | (mt[0] & 0x7fffffff);
        mt[623] = mt[396] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0);
        mti = 0;
      }
      y = mt[mti++];
      y ^= (y >>> 11);
      y ^= (y << 7) & 0x9d2c5680;
      y ^= (y << 15) & 0xefc60000;
      y ^= (y >>> 18);
      return y >>> 0;
    }
    initByArray([seed >>> 0]);

    var self = {};
    self.random = function () {
      var a = genrand() >>> 5, b = genrand() >>> 6;
      return (a * 67108864 + b) / 9007199254740992;
    };
    function getrandbits(k) { return genrand() >>> (32 - k); }
    function randbelow(n) {
      var k = 32 - Math.clz32(n);
      var r = getrandbits(k);
      while (r >= n) r = getrandbits(k);
      return r;
    }
    self.uniform = function (a, b) { return a + (b - a) * self.random(); };
    self.choice = function (seq) { return seq[randbelow(seq.length)]; };
    self.shuffle = function (x) {
      for (var i = x.length - 1; i >= 1; i--) {
        var j = randbelow(i + 1);
        var t = x[i]; x[i] = x[j]; x[j] = t;
      }
    };
    return self;
  }

  // ---- canvas setup ----
  var cv = document.getElementById("cv");
  var ctx = cv.getContext("2d");
  var dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  cv.width = W * dpr;
  cv.height = H * dpr;

  // Tk font sizes are in points; convert to CSS pixels
  function px(size) { return size * 96 / 72; }
  function fontStr(size) { return "bold " + px(size).toFixed(2) + "px " + FONT; }
  var widthCache = {};
  function measure(text, size) {
    var key = size + "|" + text;
    if (widthCache[key] === undefined) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = fontStr(size);
      widthCache[key] = ctx.measureText(text).width;
      ctx.restore();
    }
    return widthCache[key];
  }
  function linespace(size) { return Math.ceil(px(size) * 1.15); }

  // ---- helpers ----
  function heart(a) {
    var x = 16 * Math.pow(Math.sin(a), 3);
    var y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
    return [x * SC, y * SC + OY];
  }
  function hx(c) {
    var o = "#";
    for (var i = 0; i < 3; i++) {
      var v = Math.floor(Math.max(0, Math.min(1, c[i])) * 255);
      o += (v < 16 ? "0" : "") + v.toString(16);
    }
    return o;
  }
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function dim(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  var POLY = [];
  for (var i0 = 0; i0 < 720; i0++) POLY.push(heart(2 * Math.PI * i0 / 720));
  var EDGES = POLY.map(function (p, i) { return [p, POLY[(i + 1) % POLY.length]]; });
  var YMAX = Math.max.apply(null, POLY.map(function (p) { return p[1]; }));
  var YMIN = Math.min.apply(null, POLY.map(function (p) { return p[1]; }));
  var CY = (YMAX + YMIN) / 2;

  function spans(y) {
    var xs = [];
    for (var i = 0; i < EDGES.length; i++) {
      var x1 = EDGES[i][0][0], y1 = EDGES[i][0][1], x2 = EDGES[i][1][0], y2 = EDGES[i][1][1];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
      }
    }
    xs.sort(function (a, b) { return a - b; });
    var out = [];
    for (var k = 0; k + 1 < xs.length; k += 2) out.push([xs[k], xs[k + 1]]);
    return out;
  }
  function intersect(A, B) {
    var out = [];
    A.forEach(function (a) {
      B.forEach(function (b) {
        var lo = Math.max(a[0], b[0]), hi = Math.min(a[1], b[1]);
        if (hi - lo > 14) out.push([lo, hi]);
      });
    });
    return out;
  }
  function mathDist(x, y) {
    return Math.hypot(x / (16 * SC), (y - CY) / (14.5 * SC));
  }

  var FLASH = [1.0, 0.78, 0.78];
  var BGC = [1, 3, 5].map(function (i) { return parseInt(BG.substr(i, 2), 16) / 255; });

  // ---- layout (port of build()) ----
  function build(rng) {
    var order = [], oi = 0;
    function nextPhrase() {
      if (oi >= order.length) { order = PHRASES.slice(); rng.shuffle(order); oi = 0; }
      return order[oi++];
    }
    var rowH = Math.max.apply(null, SIZES.map(linespace)) + 4;
    var half = rowH / 2;
    var placed = [];

    var y = YMAX - half;
    while (y > YMIN + half) {
      var row = intersect(spans(y + half), spans(y - half));
      for (var r = 0; r < row.length; r++) {
        var lo = row[r][0] + 4, hi = row[r][1] - 4;
        var cur = lo + rng.uniform(0, 8);
        var line = [];
        while (true) {
          var fit = null;
          for (var t = 0; t < 10; t++) {
            var text = nextPhrase();
            var size = rng.choice(SIZES);
            var w = measure(text, size);
            if (cur + w <= hi) { fit = [text, size, w]; break; }
          }
          if (!fit) break;
          line.push([cur + fit[2] / 2, fit[0], fit[1], fit[2]]);
          cur += fit[2] + GAP;
        }
        if (!line.length) continue;

        if (line.length > 1) {
          var left = hi - (line[line.length - 1][0] + line[line.length - 1][3] / 2);
          for (var i = 0; i < line.length; i++) line[i][0] += left * i / (line.length - 1);
        } else {
          line[0][0] = (lo + hi) / 2;
        }
        for (var j = 0; j < line.length; j++) {
          var it = line[j];
          placed.push({ x: it[0], y: y, text: it[1], size: it[2], edge: j === 0 || j === line.length - 1 });
        }
      }
      y -= rowH;
    }

    var wine = [0.58, 0.0, 0.09], crimson = [0.90, 0.05, 0.14], blood = [0.98, 0.10, 0.16];
    placed.forEach(function (p) {
      var rad = Math.min(1.0, mathDist(p.x, p.y));
      var base = mix(wine, crimson, 0.25 + 0.75 * rad);
      base = mix(base, blood, rng.uniform(0, 0.35) + (p.edge ? 0.3 : 0));
      p.color = base.map(function (v) { return Math.min(1, v); });
      p.rad = rad;
    });

    var edges = placed.filter(function (p) { return p.edge; });
    var inner = placed.filter(function (p) { return !p.edge; });
    var twoPi = 2 * Math.PI;
    edges.forEach(function (p) {
      var v = Math.atan2(p.x, p.y - CY) % twoPi;
      p.key = v < 0 ? v + twoPi : v;
    });
    edges.sort(function (a, b) { return a.key - b.key; });
    inner.forEach(function (p) { p.key = -p.rad + rng.uniform(0, 0.08); });
    inner.sort(function (a, b) { return a.key - b.key; });
    return edges.concat(inner);
  }

  // ---- animation state ----
  var rng, ORDER, nextIdx, RATE, acc, spawning, spawned, active, tickNo;
  var shimmerItem, shimmerUntil, nextShimmerAt, shimmerOn;
  var lastTime, carry, rafId, startTime, runToken = 0;

  function reset() {
    rng = PyRandom(11);
    ORDER = build(rng);
    nextIdx = 0;
    RATE = ORDER.length / (DURATION * 1000 / TICK);
    acc = 0;
    spawning = true;
    spawned = [];
    active = [];
    shimmerItem = null; shimmerOn = false;
    shimmerUntil = 0; nextShimmerAt = 0;
    carry = 0;
    lastTime = 0;
    startTime = 0;
  }

  function spawn(p) {
    p.f = 0;
    p.dx = rng.uniform(-10, 10);
    p.px = p.x; p.py = -p.y - LIFT;
    p.main = BGC; p.haloC = BGC; p.shadowC = BGC;
    p.hpx = p.x; p.hpy = -p.y;
    spawned.push(p);
    active.push(p);
  }

  function animate(p) {
    p.f += 1;
    var u = clamp(p.f / ANIM);
    var e = 1 - Math.pow(1 - u, 3);
    var c = p.color;
    var x = p.x, y = -p.y;
    var hover = (1 - e) * LIFT;
    var px_ = x + p.dx * (1 - e);
    var py_ = y - hover;

    p.shadowC = mix(BGC, dim(c, 0.30), e);
    p.haloC = mix(BGC, dim(c, 0.20), e * e);
    p.hpx = px_; p.hpy = py_;

    var flash = 0.75 * Math.sin(Math.PI * clamp((u - 0.55) / 0.45));
    p.main = mix(mix(BGC, c, Math.pow(e, 1.5)), FLASH, flash);
    p.px = px_; p.py = py_;

    if (u >= 1) {
      p.hpx = x; p.hpy = y;
      p.px = x; p.py = y;
      p.main = c;
      return false;
    }
    return true;
  }

  function step() {
    if (spawning) {
      acc += RATE;
      while (acc >= 1) {
        acc -= 1;
        if (nextIdx >= ORDER.length) { spawning = false; break; }
        spawn(ORDER[nextIdx++]);
      }
      if (nextIdx >= ORDER.length) spawning = false;
    }
    active = active.filter(animate);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var cx = W / 2, cy = H / 2;
    for (var i = 0; i < spawned.length; i++) {
      var p = spawned[i];
      ctx.font = fontStr(p.size);
      ctx.fillStyle = hx(p.shadowC);
      ctx.fillText(p.text, cx + p.x + 2, cy - p.y + 3);

      ctx.font = fontStr(p.size + 1);
      ctx.fillStyle = hx(p.haloC);
      ctx.fillText(p.text, cx + p.hpx, cy + p.hpy);

      ctx.font = fontStr(p.size);
      var col = p.main;
      if (p === shimmerItem && shimmerOn) col = mix(p.color, FLASH, 0.6);
      ctx.fillStyle = hx(col);
      ctx.fillText(p.text, cx + p.px, cy + p.py);
    }
  }

  function shimmer(now) {
    if (shimmerOn && now >= shimmerUntil) { shimmerOn = false; }
    if (now >= nextShimmerAt) {
      shimmerItem = rng.choice(spawned);
      shimmerOn = true;
      shimmerUntil = now + 260;
      nextShimmerAt = now + 140;
    }
  }

  function frame(now) {
    if (!lastTime) lastTime = now;
    carry += now - lastTime;
    lastTime = now;
    if (!startTime) startTime = now;

    // start after the same 200 ms delay as the original
    if (now - startTime >= 200) {
      var guard = 0;
      while (carry >= TICK && guard++ < 10) {
        carry -= TICK;
        if (spawning || active.length) step();
      }
      if (carry > TICK * 10) carry = 0;
    } else {
      carry = 0;
    }

    if (!spawning && !active.length) shimmer(now);
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId) cancelAnimationFrame(rafId);
    reset();
    draw();
    rafId = requestAnimationFrame(frame);
  }

  document.getElementById("replay").addEventListener("click", start);

  // make sure the system font is ready before measuring text
  var go = function () { widthCache = {}; start(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
})();