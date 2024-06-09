(() => {
  // src/ts/audio.ts
  var Audio = class {
    constructor(theme) {
      this.theme = theme;
      this.ctx = new (window.AudioContext || window.AudioContext)();
      this.vol = this.ctx.createGain();
      this.vol.connect(this.ctx.destination);
      this.vol.gain.value = 0;
      this.populateSoundLibrary();
      this.enableVolumeControl();
    }
    getAudioUrl(url) {
      return `/themes/${this.theme.config.name}/${url.replace("./", "")}`;
    }
    populateSoundLibrary() {
      this.sounds = {};
      const actions = [
        this.getAudioUrl(this.theme.config.attackAudio),
        this.getAudioUrl(this.theme.config.blockAudio),
        this.getAudioUrl(this.theme.config.collideAudio),
        this.getAudioUrl(this.theme.config.winAudio)
      ];
      actions.forEach((action) => {
        this.sounds[action] = {
          playing: false
        };
      });
    }
    async getSoundFile(url) {
      const buf = fetch(url).then((res) => res.arrayBuffer());
      return await buf;
    }
    terminateSound(source) {
      source.stop();
      source.disconnect();
    }
    async play(sound) {
      if (!this.ctx) {
        return;
      }
      if (this.sounds[this.getAudioUrl(sound)].playing) {
        return;
      }
      this.sounds[this.getAudioUrl(sound)].playing = true;
      const arrayBuffer = await this.getSoundFile(this.getAudioUrl(sound));
      const source = this.ctx.createBufferSource();
      this.ctx.decodeAudioData(arrayBuffer, (audioBuffer) => {
        source.buffer = audioBuffer;
        source.connect(this.vol);
        source.loop = false;
        source.onended = () => {
          this.terminateSound(source);
          this.sounds[this.getAudioUrl(sound)].playing = false;
        };
        source.start();
      });
    }
    async playBGM() {
      if (!this.ctx) {
        return;
      }
      if (this.bgmPlaying) {
        return;
      }
      const bgmVol = this.ctx.createGain();
      bgmVol.connect(this.vol);
      bgmVol.gain.value = 0.25;
      const arrayBuffer = await this.getSoundFile(this.getAudioUrl(this.theme.config.bgAudio));
      this.bgm = this.ctx.createBufferSource();
      this.ctx.decodeAudioData(arrayBuffer, (audioBuffer) => {
        this.bgm.buffer = audioBuffer;
        this.bgm.connect(bgmVol);
        this.bgm.loop = true;
        this.bgm.start();
      });
      this.bgmPlaying = true;
    }
    setVolume(volume) {
      this.vol.gain.value = volume;
    }
    enableVolumeControl() {
      const audioRange = document.querySelector("#sound");
      audioRange.addEventListener("input", () => {
        this.setVolume(audioRange.valueAsNumber);
        if (!this.bgmPlaying && audioRange.valueAsNumber > 0) {
          this.playBGM();
        }
      });
    }
    switchTheme(theme) {
      this.ctx;
      this.theme = theme;
      this.populateSoundLibrary();
      if (this.bgmPlaying) {
        this.bgm.stop();
        this.bgmPlaying = false;
        this.playBGM();
      }
    }
  };

  // src/ts/util.ts
  function rotate(object, angle, offset = { x: 0, y: 0 }) {
    const { a, b, c, d } = object;
    const center = {
      x: (a.x + b.x + c.x + d.x) / 4 - offset.x,
      y: (a.y + b.y + c.y + d.y) / 4
    };
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotatedA = {
      x: (a.x - center.x) * cos - (a.y - center.y) * sin + center.x,
      y: (a.x - center.x) * sin + (a.y - center.y) * cos + center.y
    };
    const rotatedB = {
      x: (b.x - center.x) * cos - (b.y - center.y) * sin + center.x,
      y: (b.x - center.x) * sin + (b.y - center.y) * cos + center.y
    };
    const rotatedC = {
      x: (c.x - center.x) * cos - (c.y - center.y) * sin + center.x,
      y: (c.x - center.x) * sin + (c.y - center.y) * cos + center.y
    };
    const rotatedD = {
      x: (d.x - center.x) * cos - (d.y - center.y) * sin + center.x,
      y: (d.x - center.x) * sin + (d.y - center.y) * cos + center.y
    };
    return { a: rotatedA, b: rotatedB, c: rotatedC, d: rotatedD };
  }
  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }
  function hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // src/ts/countdown.ts
  var Countdown = class {
    constructor(ctx, theme) {
      this.ctx = ctx;
      this.theme = theme;
      this.interval = 0;
      this.intervalLength = 650;
      this.intervalCount = 3;
      this.count = 0;
      this.flashColor = "#ff4d4d";
      this.flashOpacity = 1;
      this.ctx.canvas.addEventListener("tick", () => {
        this.draw();
      });
    }
    startTimer(winner) {
      this.count = this.intervalCount;
      this.flashOpacity = 1;
      if (!this.theme.assetsLoaded) {
        window.setTimeout(() => {
          this.startTimer(winner);
        }, 100);
        return;
      }
      this.flashColor = typeof winner === "number" ? this.theme.config.colors[winner] || "#ff4d4d" : "#ff4d4d";
      this.interval = window.setInterval(() => {
        if (this.count > 1) {
          this.count--;
        } else {
          this.stopTimer();
        }
      }, this.intervalLength);
    }
    stopTimer() {
      window.clearInterval(this.interval);
      this.interval = 0;
      this.ctx.canvas.dispatchEvent(new Event("play"));
    }
    draw() {
      if (this.count <= 0 || this.interval === 0) {
        return;
      }
      this.ctx.save();
      const flashRgb = hexToRGB(this.flashColor);
      this.ctx.fillStyle = `rgba(${flashRgb.r},${flashRgb.g},${flashRgb.b},${this.flashOpacity})`;
      this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      this.ctx.fillStyle = "#ff4d4d";
      this.ctx.shadowColor = "#ff4d4d";
      this.ctx.shadowBlur = 20;
      this.ctx.font = `${this.ctx.canvas.height / 1.5}px PressStart2P`;
      if (this.theme.config.shader) {
        this.theme.config.shader(this.ctx);
      }
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(this.count.toString(), this.ctx.canvas.width / 2, this.ctx.canvas.height / 2 + 100);
      this.ctx.restore();
      this.flashOpacity = Math.max(this.flashOpacity - 0.01, 0);
    }
  };

  // config.json
  var controls = [
    {
      left: ["KeyA"],
      right: ["KeyD"],
      up: ["KeyW"],
      down: ["KeyS"],
      attack: ["KeyR"],
      block: ["KeyT"]
    },
    {
      left: ["ArrowLeft"],
      right: ["ArrowRight"],
      up: ["ArrowUp"],
      down: ["ArrowDown"],
      attack: ["KeyP"],
      block: ["KeyO"]
    }
  ];
  var gamepad = {
    attack: 0,
    block: 2
  };
  var config_default = {
    controls,
    gamepad
  };

  // node_modules/collider2d/collider2d.js
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor)
        descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps)
      _defineProperties(Constructor.prototype, protoProps);
    if (staticProps)
      _defineProperties(Constructor, staticProps);
    return Constructor;
  }
  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  var Vector = /* @__PURE__ */ function() {
    function Vector2() {
      var x = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
      var y = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
      _classCallCheck(this, Vector2);
      _defineProperty(this, "_x", 0);
      _defineProperty(this, "_y", 0);
      this._x = x;
      this._y = y;
    }
    _createClass(Vector2, [{
      key: "x",
      get: function get() {
        return this._x;
      },
      set: function set(x) {
        this._x = x;
      }
    }, {
      key: "y",
      get: function get() {
        return this._y;
      },
      set: function set(y) {
        this._y = y;
      }
    }, {
      key: "copy",
      value: function copy(other) {
        this._x = other.x;
        this._y = other.y;
        return this;
      }
    }, {
      key: "clone",
      value: function clone() {
        return new Vector2(this.x, this.y);
      }
    }, {
      key: "perp",
      value: function perp() {
        var x = this.x;
        this._x = this.y;
        this._y = -x;
        return this;
      }
    }, {
      key: "rotate",
      value: function rotate2(angle) {
        var x = this.x;
        var y = this.y;
        this._x = x * Math.cos(angle) - y * Math.sin(angle);
        this._y = x * Math.sin(angle) + y * Math.cos(angle);
        return this;
      }
    }, {
      key: "reverse",
      value: function reverse() {
        this._x = -this.x;
        this._y = -this.y;
        return this;
      }
    }, {
      key: "normalize",
      value: function normalize() {
        var d = this.len();
        if (d > 0) {
          this._x = this.x / d;
          this._y = this.y / d;
        }
        return this;
      }
    }, {
      key: "add",
      value: function add(other) {
        this._x += other.x;
        this._y += other.y;
        return this;
      }
    }, {
      key: "sub",
      value: function sub(other) {
        this._x -= other.x;
        this._y -= other.y;
        return this;
      }
    }, {
      key: "scale",
      value: function scale(x, y) {
        this._x *= x;
        this._y *= typeof y != "undefined" ? y : x;
        return this;
      }
    }, {
      key: "project",
      value: function project(other) {
        var amt = this.dot(other) / other.len2();
        this._x = amt * other.x;
        this._y = amt * other.y;
        return this;
      }
    }, {
      key: "projectN",
      value: function projectN(other) {
        var amt = this.dot(other);
        this._x = amt * other.x;
        this._y = amt * other.y;
        return this;
      }
    }, {
      key: "reflect",
      value: function reflect(axis) {
        var x = this.x;
        var y = this.y;
        this.project(axis).scale(2);
        this._x -= x;
        this._y -= y;
        return this;
      }
    }, {
      key: "reflectN",
      value: function reflectN(axis) {
        var x = this.x;
        var y = this.y;
        this.projectN(axis).scale(2);
        this._x -= x;
        this._y -= y;
        return this;
      }
    }, {
      key: "dot",
      value: function dot(other) {
        return this.x * other.x + this.y * other.y;
      }
    }, {
      key: "len2",
      value: function len2() {
        return this.dot(this);
      }
    }, {
      key: "len",
      value: function len() {
        return Math.sqrt(this.len2());
      }
    }]);
    return Vector2;
  }();
  var Polygon = /* @__PURE__ */ function() {
    function Polygon2() {
      var position = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : new Vector();
      var points = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [];
      _classCallCheck(this, Polygon2);
      _defineProperty(this, "_position", new Vector());
      _defineProperty(this, "_points", []);
      _defineProperty(this, "_pointsGeneric", []);
      _defineProperty(this, "_angle", 0);
      _defineProperty(this, "_offset", new Vector());
      _defineProperty(this, "_calcPoints", []);
      _defineProperty(this, "_edges", []);
      _defineProperty(this, "_normals", []);
      this._position = position;
      this.setPoints(points);
    }
    _createClass(Polygon2, [{
      key: "position",
      get: function get() {
        return this._position;
      }
    }, {
      key: "points",
      get: function get() {
        return this._points;
      }
    }, {
      key: "pointsGeneric",
      get: function get() {
        return this._pointsGeneric;
      }
    }, {
      key: "calcPoints",
      get: function get() {
        return this._calcPoints;
      }
    }, {
      key: "offset",
      get: function get() {
        return this._offset;
      }
    }, {
      key: "angle",
      get: function get() {
        return this._angle;
      }
    }, {
      key: "edges",
      get: function get() {
        return this._edges;
      }
    }, {
      key: "normals",
      get: function get() {
        return this._normals;
      }
    }, {
      key: "setPoints",
      value: function setPoints(points) {
        var lengthChanged = !this.points || this.points.length !== points.length;
        if (lengthChanged) {
          var i;
          var calcPoints = this._calcPoints = [];
          var edges = this._edges = [];
          var normals = this._normals = [];
          for (i = 0; i < points.length; i++) {
            var p1 = points[i];
            var p2 = i < points.length - 1 ? points[i + 1] : points[0];
            this._pointsGeneric.push(points[i].x, points[i].y);
            if (p1 !== p2 && p1.x === p2.x && p1.y === p2.y) {
              points.splice(i, 1);
              i -= 1;
              continue;
            }
            calcPoints.push(new Vector());
            edges.push(new Vector());
            normals.push(new Vector());
          }
        }
        this._points = points;
        this._recalc();
        return this;
      }
    }, {
      key: "setAngle",
      value: function setAngle(angle) {
        this._angle = angle;
        this._recalc();
        return this;
      }
    }, {
      key: "setOffset",
      value: function setOffset(offset) {
        this._offset = offset;
        this._recalc();
        return this;
      }
    }, {
      key: "rotate",
      value: function rotate2(angle) {
        var points = this.points;
        var len = points.length;
        for (var i = 0; i < len; i++) {
          points[i].rotate(angle);
        }
        this._recalc();
        return this;
      }
    }, {
      key: "translate",
      value: function translate(x, y) {
        var points = this.points;
        var len = points.length;
        for (var i = 0; i < len; i++) {
          points[i].x += x;
          points[i].y += y;
        }
        this._recalc();
        return this;
      }
    }, {
      key: "_recalc",
      value: function _recalc() {
        var calcPoints = this.calcPoints;
        var edges = this._edges;
        var normals = this._normals;
        var points = this.points;
        var offset = this.offset;
        var angle = this.angle;
        var len = points.length;
        var i;
        for (i = 0; i < len; i++) {
          var calcPoint = calcPoints[i].copy(points[i]);
          calcPoint.x += offset.x;
          calcPoint.y += offset.y;
          if (angle !== 0)
            calcPoint.rotate(angle);
        }
        for (i = 0; i < len; i++) {
          var p1 = calcPoints[i];
          var p2 = i < len - 1 ? calcPoints[i + 1] : calcPoints[0];
          var e = edges[i].copy(p2).sub(p1);
          normals[i].copy(e).perp().normalize();
        }
        return this;
      }
    }, {
      key: "getAABB",
      value: function getAABB() {
        var points = this.calcPoints;
        var len = points.length;
        var xMin = points[0].x;
        var yMin = points[0].y;
        var xMax = points[0].x;
        var yMax = points[0].y;
        for (var i = 1; i < len; i++) {
          var point = points[i];
          if (point["x"] < xMin)
            xMin = point["x"];
          else if (point["x"] > xMax)
            xMax = point["x"];
          if (point["y"] < yMin)
            yMin = point["y"];
          else if (point["y"] > yMax)
            yMax = point["y"];
        }
        return new Polygon2(this._position.clone().add(new Vector(xMin, yMin)), [new Vector(), new Vector(xMax - xMin, 0), new Vector(xMax - xMin, yMax - yMin), new Vector(0, yMax - yMin)]);
      }
    }, {
      key: "getCentroid",
      value: function getCentroid() {
        var points = this.calcPoints;
        var len = points.length;
        var cx = 0;
        var cy = 0;
        var ar = 0;
        for (var i = 0; i < len; i++) {
          var p1 = points[i];
          var p2 = i === len - 1 ? points[0] : points[i + 1];
          var a = p1["x"] * p2["y"] - p2["x"] * p1["y"];
          cx += (p1["x"] + p2["x"]) * a;
          cy += (p1["y"] + p2["y"]) * a;
          ar += a;
        }
        ar = ar * 3;
        cx = cx / ar;
        cy = cy / ar;
        return new Vector(cx, cy);
      }
    }]);
    return Polygon2;
  }();
  var Box = /* @__PURE__ */ function() {
    function Box2() {
      var position = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : new Vector();
      var width = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
      var height = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0;
      _classCallCheck(this, Box2);
      _defineProperty(this, "_position", new Vector());
      _defineProperty(this, "_width", 0);
      _defineProperty(this, "_height", 0);
      this._position = position;
      this._width = width;
      this._height = height;
    }
    _createClass(Box2, [{
      key: "toPolygon",
      value: function toPolygon() {
        return new Polygon(new Vector(this._position.x, this._position.y), [new Vector(), new Vector(this._width, 0), new Vector(this._width, this._height), new Vector(0, this._height)]);
      }
    }]);
    return Box2;
  }();
  var CollisionDetails = /* @__PURE__ */ function() {
    function CollisionDetails2() {
      _classCallCheck(this, CollisionDetails2);
      _defineProperty(this, "a", void 0);
      _defineProperty(this, "b", void 0);
      _defineProperty(this, "overlapN", new Vector());
      _defineProperty(this, "overlapV", new Vector());
      _defineProperty(this, "overlap", Number.MAX_VALUE);
      _defineProperty(this, "aInB", true);
      _defineProperty(this, "bInA", true);
      this.clear();
    }
    _createClass(CollisionDetails2, [{
      key: "clear",
      value: function clear() {
        this.aInB = true;
        this.bInA = true;
        this.overlap = Number.MAX_VALUE;
        return this;
      }
    }]);
    return CollisionDetails2;
  }();
  var Collider2D = /* @__PURE__ */ function() {
    function Collider2D2() {
      _classCallCheck(this, Collider2D2);
      _defineProperty(this, "_T_VECTORS", []);
      _defineProperty(this, "_T_ARRAYS", []);
      _defineProperty(this, "_T_COLLISION_DETAILS", new CollisionDetails());
      _defineProperty(this, "_TEST_POINT", new Box(new Vector(), 1e-6, 1e-6).toPolygon());
      _defineProperty(this, "_LEFT_VORONOI_REGION", -1);
      _defineProperty(this, "_MIDDLE_VORONOI_REGION", 0);
      _defineProperty(this, "_RIGHT_VORONOI_REGION", 1);
      for (var i = 0; i < 10; i++) {
        this._T_VECTORS.push(new Vector());
      }
      for (var _i = 0; _i < 5; _i++) {
        this._T_ARRAYS.push([]);
      }
    }
    _createClass(Collider2D2, [{
      key: "pointInCircle",
      value: function pointInCircle(point, circle) {
        var differenceV = this._T_VECTORS.pop().copy(point).sub(circle.position).sub(circle.offset);
        var radiusSq = circle.radius * circle.radius;
        var distanceSq = differenceV.len2();
        this._T_VECTORS.push(differenceV);
        return distanceSq <= radiusSq;
      }
    }, {
      key: "pointInPolygon",
      value: function pointInPolygon(point, polygon) {
        this._TEST_POINT.position.copy(point);
        this._T_COLLISION_DETAILS.clear();
        var result = this.testPolygonPolygon(this._TEST_POINT, polygon, true);
        if (result)
          result = this._T_COLLISION_DETAILS.aInB;
        return result;
      }
    }, {
      key: "testCircleCircle",
      value: function testCircleCircle(a, b) {
        var details = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
        var differenceV = this._T_VECTORS.pop().copy(b.position).add(b.offset).sub(a.position).sub(a.offset);
        var totalRadius = a.radius + b.radius;
        var totalRadiusSq = totalRadius * totalRadius;
        var distanceSq = differenceV.len2();
        if (distanceSq > totalRadiusSq) {
          this._T_VECTORS.push(differenceV);
          return false;
        }
        if (details) {
          this._T_COLLISION_DETAILS.clear();
          var dist = Math.sqrt(distanceSq);
          this._T_COLLISION_DETAILS.a = a;
          this._T_COLLISION_DETAILS.b = b;
          this._T_COLLISION_DETAILS.overlap = totalRadius - dist;
          this._T_COLLISION_DETAILS.overlapN.copy(differenceV.normalize());
          this._T_COLLISION_DETAILS.overlapV.copy(differenceV).scale(this._T_COLLISION_DETAILS.overlap);
          this._T_COLLISION_DETAILS.aInB = a.radius <= b.radius && dist <= b.radius - a.radius;
          this._T_COLLISION_DETAILS.bInA = b.radius <= a.radius && dist <= a.radius - b.radius;
          return this._T_COLLISION_DETAILS;
        }
        this._T_VECTORS.push(differenceV);
        return true;
      }
    }, {
      key: "testPolygonPolygon",
      value: function testPolygonPolygon(a, b) {
        var details = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
        this._T_COLLISION_DETAILS.clear();
        var aPoints = a.calcPoints;
        var aLen = aPoints.length;
        var bPoints = b.calcPoints;
        var bLen = bPoints.length;
        for (var i = 0; i < aLen; i++) {
          if (this._isSeparatingAxis(a.position, b.position, aPoints, bPoints, a.normals[i], this._T_COLLISION_DETAILS)) {
            return false;
          }
        }
        for (var _i2 = 0; _i2 < bLen; _i2++) {
          if (this._isSeparatingAxis(a.position, b.position, aPoints, bPoints, b.normals[_i2], this._T_COLLISION_DETAILS)) {
            return false;
          }
        }
        if (details) {
          this._T_COLLISION_DETAILS.a = a;
          this._T_COLLISION_DETAILS.b = b;
          this._T_COLLISION_DETAILS.overlapV.copy(this._T_COLLISION_DETAILS.overlapN).scale(this._T_COLLISION_DETAILS.overlap);
          return this._T_COLLISION_DETAILS;
        }
        return true;
      }
    }, {
      key: "testPolygonCircle",
      value: function testPolygonCircle(polygon, circle) {
        var details = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
        this._T_COLLISION_DETAILS.clear();
        var circlePos = this._T_VECTORS.pop().copy(circle.position).add(circle.offset).sub(polygon.position);
        var radius = circle.radius;
        var radius2 = radius * radius;
        var points = polygon.calcPoints;
        var len = points.length;
        var edge = this._T_VECTORS.pop();
        var point = this._T_VECTORS.pop();
        for (var i = 0; i < len; i++) {
          var next = i === len - 1 ? 0 : i + 1;
          var prev = i === 0 ? len - 1 : i - 1;
          var overlap = 0;
          var overlapN = null;
          edge.copy(polygon.edges[i]);
          point.copy(circlePos).sub(points[i]);
          if (details && point.len2() > radius2)
            this._T_COLLISION_DETAILS.aInB = false;
          var region = this._voronoiRegion(edge, point);
          if (region === this._LEFT_VORONOI_REGION) {
            edge.copy(polygon.edges[prev]);
            var point2 = this._T_VECTORS.pop().copy(circlePos).sub(points[prev]);
            region = this._voronoiRegion(edge, point2);
            if (region === this._RIGHT_VORONOI_REGION) {
              var dist = point.len();
              if (dist > radius) {
                this._T_VECTORS.push(circlePos);
                this._T_VECTORS.push(edge);
                this._T_VECTORS.push(point);
                this._T_VECTORS.push(point2);
                return false;
              } else if (details) {
                this._T_COLLISION_DETAILS.bInA = false;
                overlapN = point.normalize();
                overlap = radius - dist;
              }
            }
            this._T_VECTORS.push(point2);
          } else if (region === this._RIGHT_VORONOI_REGION) {
            edge.copy(polygon.edges[next]);
            point.copy(circlePos).sub(points[next]);
            region = this._voronoiRegion(edge, point);
            if (region === this._LEFT_VORONOI_REGION) {
              var _dist = point.len();
              if (_dist > radius) {
                this._T_VECTORS.push(circlePos);
                this._T_VECTORS.push(edge);
                this._T_VECTORS.push(point);
                return false;
              } else if (details) {
                this._T_COLLISION_DETAILS.bInA = false;
                overlapN = point.normalize();
                overlap = radius - _dist;
              }
            }
          } else {
            var normal = edge.perp().normalize();
            var _dist2 = point.dot(normal);
            var distAbs = Math.abs(_dist2);
            if (_dist2 > 0 && distAbs > radius) {
              this._T_VECTORS.push(circlePos);
              this._T_VECTORS.push(normal);
              this._T_VECTORS.push(point);
              return false;
            } else if (details) {
              overlapN = normal;
              overlap = radius - _dist2;
              if (_dist2 >= 0 || overlap < 2 * radius)
                this._T_COLLISION_DETAILS.bInA = false;
            }
          }
          if (overlapN && details && Math.abs(overlap) < Math.abs(this._T_COLLISION_DETAILS.overlap)) {
            this._T_COLLISION_DETAILS.overlap = overlap;
            this._T_COLLISION_DETAILS.overlapN.copy(overlapN);
          }
        }
        if (details) {
          this._T_COLLISION_DETAILS.a = polygon;
          this._T_COLLISION_DETAILS.b = circle;
          this._T_COLLISION_DETAILS.overlapV.copy(this._T_COLLISION_DETAILS.overlapN).scale(this._T_COLLISION_DETAILS.overlap);
        }
        this._T_VECTORS.push(circlePos);
        this._T_VECTORS.push(edge);
        this._T_VECTORS.push(point);
        if (details)
          return this._T_COLLISION_DETAILS;
        return true;
      }
    }, {
      key: "testCirclePolygon",
      value: function testCirclePolygon(circle, polygon) {
        var details = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
        var result = this.testPolygonCircle(polygon, circle, details);
        if (result && details) {
          var collisionDetails = result;
          var a = collisionDetails.a;
          var aInB = collisionDetails.aInB;
          collisionDetails.overlapN.reverse();
          collisionDetails.overlapV.reverse();
          collisionDetails.a = collisionDetails.b;
          collisionDetails.b = a;
          collisionDetails.aInB = collisionDetails.bInA;
          collisionDetails.bInA = aInB;
        }
        return result;
      }
    }, {
      key: "_isSeparatingAxis",
      value: function _isSeparatingAxis(aPos, bPos, aPoints, bPoints, axis, collisionDetails) {
        var rangeA = this._T_ARRAYS.pop();
        var rangeB = this._T_ARRAYS.pop();
        var offsetV = this._T_VECTORS.pop().copy(bPos).sub(aPos);
        var projectedOffset = offsetV.dot(axis);
        this._flattenPointsOn(aPoints, axis, rangeA);
        this._flattenPointsOn(bPoints, axis, rangeB);
        rangeB[0] += projectedOffset;
        rangeB[1] += projectedOffset;
        if (rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1]) {
          this._T_VECTORS.push(offsetV);
          this._T_ARRAYS.push(rangeA);
          this._T_ARRAYS.push(rangeB);
          return true;
        }
        if (collisionDetails) {
          var overlap = 0;
          if (rangeA[0] < rangeB[0]) {
            collisionDetails.aInB = false;
            if (rangeA[1] < rangeB[1]) {
              overlap = rangeA[1] - rangeB[0];
              collisionDetails.bInA = false;
            } else {
              var option1 = rangeA[1] - rangeB[0];
              var option2 = rangeB[1] - rangeA[0];
              overlap = option1 < option2 ? option1 : -option2;
            }
          } else {
            collisionDetails.bInA = false;
            if (rangeA[1] > rangeB[1]) {
              overlap = rangeA[0] - rangeB[1];
              collisionDetails.aInB = false;
            } else {
              var _option = rangeA[1] - rangeB[0];
              var _option2 = rangeB[1] - rangeA[0];
              overlap = _option < _option2 ? _option : -_option2;
            }
          }
          var absOverlap = Math.abs(overlap);
          if (absOverlap < collisionDetails.overlap) {
            collisionDetails.overlap = absOverlap;
            collisionDetails.overlapN.copy(axis);
            if (overlap < 0)
              collisionDetails.overlapN.reverse();
          }
        }
        this._T_VECTORS.push(offsetV);
        this._T_ARRAYS.push(rangeA);
        this._T_ARRAYS.push(rangeB);
        return false;
      }
    }, {
      key: "_flattenPointsOn",
      value: function _flattenPointsOn(points, normal, result) {
        var min = Number.MAX_VALUE;
        var max = -Number.MAX_VALUE;
        var len = points.length;
        for (var i = 0; i < len; i++) {
          var dot = points[i].dot(normal);
          if (dot < min)
            min = dot;
          if (dot > max)
            max = dot;
        }
        result[0] = min;
        result[1] = max;
      }
    }, {
      key: "_voronoiRegion",
      value: function _voronoiRegion(line, point) {
        var len2 = line.len2();
        var dp = point.dot(line);
        if (dp < 0)
          return this._LEFT_VORONOI_REGION;
        else if (dp > len2)
          return this._RIGHT_VORONOI_REGION;
        else
          return this._MIDDLE_VORONOI_REGION;
      }
    }]);
    return Collider2D2;
  }();

  // src/ts/obstacle.ts
  var Obstacle = class {
    constructor(collider, obstacles, id, object) {
      this.collider = collider;
      this.obstacles = obstacles;
      this.id = id;
      this.object = object;
      this.obstacles.push(this);
    }
    getId() {
      return this.id;
    }
    getObject() {
      return this.object;
    }
    editObstacle(payload) {
      this.object = payload;
    }
    removeObstacle() {
      this.obstacles = this.obstacles.filter((obstacle) => obstacle.id !== this.id);
    }
    collidesWith(obstacle) {
      const thisPolygon = new Polygon(new Vector(0, 0), [
        new Vector(this.object.a.x, this.object.a.y),
        new Vector(this.object.b.x, this.object.b.y),
        new Vector(this.object.c.x, this.object.c.y),
        new Vector(this.object.d.x, this.object.d.y)
      ]);
      const otherPolygon = new Polygon(new Vector(0, 0), [
        new Vector(obstacle.object.a.x, obstacle.object.a.y),
        new Vector(obstacle.object.b.x, obstacle.object.b.y),
        new Vector(obstacle.object.c.x, obstacle.object.c.y),
        new Vector(obstacle.object.d.x, obstacle.object.d.y)
      ]);
      return this.collider.testPolygonPolygon(thisPolygon, otherPolygon, true);
    }
  };

  // src/ts/character.ts
  var Character = class {
    constructor(game, player, theme) {
      this.game = game;
      this.ctx = game.ctx;
      this.audio = game.audio;
      this.theme = theme;
      this.active = false;
      this.gamepads = game.gamepadAdapter;
      this.collider = game.collider;
      this.players = game.players;
      this.obstacles = game.obstacles;
      this.player = player;
      this.size = 100;
      this.position = this.getInitialPosition();
      this.orientation = 0;
      this.speed = 1;
      this.range = 150;
      this.attackDuration = 200;
      this.blockDuration = 300;
      this.cooldownDuration = 800;
      this.maxVelocity = 20;
      this.velocity = {
        x: 0,
        y: 0
      };
      this.obstacle = this.createObstacle(`player${this.player}`);
      this.action = {
        movingX: 0,
        movingY: 0,
        attacking: false,
        blocking: false,
        cooldown: false
      };
      this.registerControls();
      window.requestAnimationFrame(() => {
        this.move();
        this.turn();
      });
      this.ctx.canvas.addEventListener("tick", (event) => {
        this.onNextTick(event);
      });
    }
    getInitialPosition() {
      if (this.player === 0) {
        return { x: 50, y: 50 };
      } else {
        return {
          x: this.ctx.canvas.width - 50 - this.size,
          y: this.ctx.canvas.height - 50 - this.size
        };
      }
    }
    createObstacle(id) {
      return new Obstacle(this.collider, this.obstacles, id, {
        a: { x: this.position.x, y: this.position.y },
        b: { x: this.position.x + this.size, y: this.position.y },
        c: {
          x: this.position.x + this.size,
          y: this.position.y + this.size
        },
        d: { x: this.position.x, y: this.position.y + this.size }
      });
    }
    registerControls() {
      config_default.controls[this.player].left.forEach((key) => {
        document.addEventListener("keydown", (event) => {
          this.captureEvent(event);
          if (event.code === key && event.repeat === false) {
            this.action.movingX = -1;
          }
        });
        document.addEventListener("keyup", (event) => {
          this.captureEvent(event);
          if (event.code === key) {
            this.action.movingX = 0;
          }
        });
      });
      config_default.controls[this.player].right.forEach((key) => {
        document.addEventListener("keydown", (event) => {
          this.captureEvent(event);
          if (event.code === key && event.repeat === false) {
            this.action.movingX = 1;
          }
        });
        document.addEventListener("keyup", (event) => {
          this.captureEvent(event);
          if (event.code === key) {
            this.action.movingX = 0;
          }
        });
      });
      config_default.controls[this.player].up.forEach((key) => {
        document.addEventListener("keydown", (event) => {
          this.captureEvent(event);
          if (event.code === key && event.repeat === false) {
            this.action.movingY = -1;
          }
        });
        document.addEventListener("keyup", (event) => {
          this.captureEvent(event);
          if (event.code === key) {
            this.action.movingY = 0;
          }
        });
      });
      config_default.controls[this.player].down.forEach((key) => {
        document.addEventListener("keydown", (event) => {
          this.captureEvent(event);
          if (event.code === key && event.repeat === false) {
            this.action.movingY = 1;
          }
        });
        document.addEventListener("keyup", (event) => {
          this.captureEvent(event);
          if (event.code === key) {
            this.action.movingY = 0;
          }
        });
      });
      document.addEventListener("gamepadStickMove", (event) => {
        if (event.detail?.gamepadId !== this.player || event.detail.stickIndex !== 0) {
          return;
        }
        this.action.movingX = event.detail.stick.x;
        this.action.movingY = event.detail.stick.y;
      });
      config_default.controls[this.player].attack.forEach((key) => {
        document.addEventListener("keydown", (event) => {
          if (this.active && event.code === key && event.repeat === false && !this.action.cooldown) {
            this.action.attacking = true;
          }
        });
        document.addEventListener("gamepadButtonDown", (event) => {
          if (event.detail?.gamepadId === this.player && event.detail.buttonIndex === config_default.gamepad.attack && !this.action.cooldown) {
            this.action.attacking = true;
          }
        });
      });
      config_default.controls[this.player].block.forEach((key) => {
        document.addEventListener("keydown", (event) => {
          if (this.active && event.code === key && event.repeat === false && !this.action.cooldown) {
            this.action.blocking = true;
          }
        });
        document.addEventListener("gamepadButtonDown", (event) => {
          if (event.detail?.gamepadId === this.player && event.detail.buttonIndex === config_default.gamepad.block && !this.action.cooldown) {
            this.action.blocking = true;
          }
        });
      });
    }
    captureEvent(event) {
      if (event.target === this.ctx.canvas && config_default.controls.find((x) => Object.values(x).some((y) => y.includes(event.code)))) {
        event.preventDefault();
      }
    }
    setActive(active) {
      this.reset();
      this.active = active;
    }
    collide() {
      const obstacles = this.obstacles.filter((obstacle) => obstacle.getId() !== this.obstacle.getId());
      obstacles.forEach((obstacle) => {
        const collision = this.obstacle.collidesWith(obstacle);
        const friction = 0.8;
        if (!collision) {
          return;
        }
        this.velocity.x = (this.velocity.x + collision.overlapV.x * -1) * friction;
        this.velocity.y = (this.velocity.y + collision.overlapV.y * -1) * friction;
        this.audio.play(this.theme.config.collideAudio);
        this.gamepads.vibrate(this.player, 0.3, 0.3, 80);
      });
    }
    move() {
      const { position, velocity, action } = this;
      const newX = position.x + action.movingX * this.speed + velocity.x * this.speed;
      const newY = position.y + action.movingY * this.speed + velocity.y * this.speed;
      position.x = newX;
      position.y = newY;
      if (position.x < 0) {
        position.x = 0;
      } else if (newX > this.ctx.canvas.width - this.size) {
        position.x = this.ctx.canvas.width - this.size;
      }
      if (position.y < 0) {
        position.y = 0;
      } else if (newY > this.ctx.canvas.height - this.size) {
        position.y = this.ctx.canvas.height - this.size;
      }
      this.obstacle.editObstacle({
        a: { x: position.x, y: position.y },
        b: { x: position.x + this.size, y: position.y },
        c: { x: position.x + this.size, y: position.y + this.size },
        d: { x: position.x, y: position.y + this.size }
      });
      this.velocity.x = clamp((action.movingX ? this.velocity.x + action.movingX : this.velocity.x * 0.8) * this.speed, this.maxVelocity * -1, this.maxVelocity);
      this.velocity.y = clamp((action.movingY ? this.velocity.y + action.movingY : this.velocity.y * 0.8) * this.speed, this.maxVelocity * -1, this.maxVelocity);
    }
    turn() {
      const otherPlayer = this.player === 0 ? 1 : 0;
      const orientationTarget = this.players[otherPlayer]?.position || { x: 0, y: 0 };
      const angle = Math.atan2(orientationTarget.y - this.position.y, orientationTarget.x - this.position.x);
      this.orientation = angle;
      const obstacle = {
        a: { x: this.position.x, y: this.position.y },
        b: { x: this.position.x + this.size, y: this.position.y },
        c: {
          x: this.position.x + this.size,
          y: this.position.y + this.size
        },
        d: { x: this.position.x, y: this.position.y + this.size }
      };
      const rotatedObstacle = rotate({
        a: { x: this.position.x, y: this.position.y },
        b: { x: this.position.x + this.size, y: this.position.y },
        c: {
          x: this.position.x + this.size,
          y: this.position.y + this.size
        },
        d: { x: this.position.x, y: this.position.y + this.size }
      }, this.orientation);
      this.obstacle.editObstacle(this.theme.config.turnSprites ? rotatedObstacle : obstacle);
    }
    attack() {
      if (!this.active || !this.action.attacking || this.action.cooldown) {
        return;
      }
      this.action.cooldown = true;
      window.setTimeout(() => {
        this.action.attacking = false;
      }, this.attackDuration);
      window.setTimeout(() => {
        this.action.cooldown = false;
      }, this.cooldownDuration);
      this.strike();
    }
    getWeaponPosition() {
      return rotate({
        a: { x: this.position.x, y: this.position.y },
        b: {
          x: this.position.x + this.size + this.range,
          y: this.position.y
        },
        c: {
          x: this.position.x + this.size + this.range,
          y: this.position.y + this.size
        },
        d: { x: this.position.x, y: this.position.y + this.size }
      }, this.orientation, { x: this.range / 2, y: 0 });
    }
    strike() {
      const otherPlayerId = this.player === 0 ? 1 : 0;
      const otherPlayer = this.players[otherPlayerId].obstacle?.getObject();
      this.gamepads.vibrate(this.player, 0.7, 0.7, 100);
      const blocked = this.players[otherPlayerId].action.blocking;
      if (blocked) {
        this.audio.play(this.theme.config.blockAudio);
        this.gamepads.vibrate(otherPlayerId, 0.3, 0.3, 100);
        return;
      }
      this.audio.play(this.theme.config.attackAudio);
      const otherPlayerPolygon = new Polygon(new Vector(0, 0), [
        new Vector(otherPlayer.a.x, otherPlayer.a.y),
        new Vector(otherPlayer.b.x, otherPlayer.b.y),
        new Vector(otherPlayer.c.x, otherPlayer.c.y),
        new Vector(otherPlayer.d.x, otherPlayer.d.y)
      ]);
      const weaponPosition = this.getWeaponPosition();
      const weaponPolygon = new Polygon(new Vector(0, 0), [
        new Vector(weaponPosition.a.x, weaponPosition.a.y),
        new Vector(weaponPosition.b.x, weaponPosition.b.y),
        new Vector(weaponPosition.c.x, weaponPosition.c.y),
        new Vector(weaponPosition.d.x, weaponPosition.d.y)
      ]);
      const hit = this.collider.testPolygonPolygon(weaponPolygon, otherPlayerPolygon);
      if (hit) {
        setTimeout(() => {
          this.gamepads.vibrate(this.player, 1, 0, 100);
        }, 0);
        setTimeout(() => {
          this.gamepads.vibrate(this.player, 1, 0, 380);
        }, 190);
        this.gamepads.vibrate(otherPlayerId, 1, 1, 500);
        this.finish();
      }
    }
    finish() {
      const finish = new CustomEvent("countdown", {
        detail: {
          winner: this.player
        }
      });
      this.audio.play(this.theme.config.winAudio);
      this.ctx.canvas.dispatchEvent(finish);
    }
    block() {
      if (!this.action.blocking || this.action.cooldown) {
        return;
      }
      this.action.cooldown = true;
      window.setTimeout(() => {
        this.action.blocking = false;
      }, this.blockDuration);
      window.setTimeout(() => {
        this.action.cooldown = false;
      }, this.cooldownDuration);
    }
    reset() {
      this.position = this.getInitialPosition();
      this.velocity = { x: 0, y: 0 };
      this.move();
      window.requestAnimationFrame(() => {
        this.turn();
      });
    }
    getSprite() {
      const directions = ["w", "nw", "n", "ne", "e", "se", "s", "sw", "w"];
      const zones = directions.map((z, i) => ({
        zone: z,
        start: Math.PI * -1 - Math.PI / 8 + i * Math.PI / 4,
        end: Math.PI * -1 - Math.PI / 8 + (i + 1) * Math.PI / 4
      }));
      const direction = this.theme.config.turnSprites ? void 0 : zones.find((zone) => this.orientation >= zone.start && this.orientation < zone.end);
      let action = "default";
      if (this.active && this.action.blocking || this.action.blocking) {
        action = "block";
      } else if (this.active && this.action.attacking || this.action.attacking) {
        action = "attack";
      } else if (this.active && (this.action.movingX || this.action.movingY)) {
        action = "move";
      }
      return this.theme.config.players[this.player][action][direction?.zone || "x"];
    }
    draw(frameCount) {
      this.ctx.save();
      this.ctx.translate(Math.round(this.position.x + this.size / 2), Math.round(this.position.y + this.size / 2));
      this.theme.config.turnSprites && this.ctx.rotate(this.orientation);
      this.theme.config.shader && this.theme.config.shader(this.ctx);
      this.theme.drawSprite(this.ctx, this.getSprite().name, { x: this.size / -2, y: this.size / -2 }, frameCount);
      this.ctx.restore();
    }
    executeCharacterActions() {
      if (this.active) {
        this.move();
        this.turn();
        this.collide();
        this.attack();
        this.block();
      }
    }
    onNextTick(tick) {
      this.executeCharacterActions();
      for (let i = 0; i < tick.detail.frameSkip; i++) {
        this.executeCharacterActions();
      }
      this.draw(tick.detail.frameCount);
    }
    switchTheme(theme) {
      this.theme = theme;
      this.obstacles = this.game.obstacles;
      this.obstacle = this.createObstacle(`player${this.player}`);
    }
  };

  // src/ts/scene.ts
  var Scene = class {
    constructor(game, theme) {
      this.game = game;
      this.ctx = game.ctx;
      this.theme = theme;
      this.width = this.ctx.canvas.width;
      this.height = this.ctx.canvas.height;
      this.obstacles = this.getObstacles();
      this.ctx.canvas.addEventListener("tick", (event) => {
        this.draw(event?.detail?.frameCount || 0);
      });
    }
    draw(frameCount) {
      this.theme.drawSprite(this.ctx, this.theme.config.scene.name, { x: 0, y: 0 }, frameCount);
    }
    getObstacles() {
      return this.theme.config.obstacles.map((obstacle, i) => new Obstacle(this.game.collider, this.game.obstacles, `scene${i}`, obstacle));
    }
    switchTheme(theme) {
      this.theme = theme;
      this.obstacles = this.getObstacles();
    }
  };

  // src/ts/render.ts
  var Renderer = class {
    constructor(ctx) {
      this.oldTimeStamp = 0;
      this.ctx = ctx;
      this.fps = 60;
      this.counter = 0;
      this.initTicker();
    }
    initTicker() {
      window.requestAnimationFrame(() => {
        this.tick();
        this.initTicker();
      });
    }
    tick() {
      const timeStamp = performance.now();
      const secondsPassed = (timeStamp - this.oldTimeStamp) / 1e3;
      this.oldTimeStamp = timeStamp;
      const fps = Math.round(1 / secondsPassed);
      const frameSkip = clamp(Math.round((60 - fps) / fps), 0, 30);
      if (this.counter >= this.fps * 2) {
        this.counter = 0;
      }
      const tick = new CustomEvent("tick", {
        bubbles: true,
        cancelable: true,
        composed: false,
        detail: {
          frameCount: this.counter,
          frameSkip
        }
      });
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      this.ctx.canvas.dispatchEvent(tick);
      this.counter++;
    }
  };

  // src/ts/gui.ts
  var Gui = class {
    constructor(ctx, theme, players) {
      this.ctx = ctx;
      this.theme = theme;
      this.score = [];
      this.score.length = players;
      this.score.fill(0);
      this.ctx.canvas.addEventListener("tick", () => {
        this.draw();
      });
    }
    incrementScore(player) {
      this.score[player]++;
    }
    draw() {
      this.ctx.save();
      this.score.forEach((score, player) => {
        this.ctx.shadowColor = this.theme.config.colors[player];
        this.ctx.shadowBlur = 8;
        this.ctx.fillStyle = this.theme.config.colors[player];
        this.ctx.font = `80px PressStart2P`;
        this.ctx.textAlign = player === 0 ? "right" : "left";
        if (this.theme.config.shader) {
          this.theme.config.shader(this.ctx);
        }
        this.ctx.fillText(score.toString(), this.ctx.canvas.width / 2 + 100 * (player === 0 ? -1 : 1) / 2, 110);
      });
      this.ctx.restore();
    }
  };

  // src/ts/gamepadAdapter.ts
  var GamepadAdapter = class {
    constructor(ctx) {
      this.ctx = ctx;
      this.gamepads = [null, null];
      this.saveGamepadsState();
      ctx.canvas.addEventListener("tick", () => {
        this.pollGamepads();
      });
    }
    saveGamepadsState() {
      navigator.getGamepads().forEach((gp, i) => {
        this.gamepads[i] = {
          buttons: gp?.buttons.map((b) => ({
            pressed: b.pressed,
            value: b.value
          }))
        };
      });
    }
    pollGamepads() {
      const gamepads = navigator.getGamepads();
      for (var i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.buttons && this.gamepads[i]?.buttons) {
          const axes = gp.axes;
          this.moveStick(i, 0, { x: axes[0], y: axes[1] });
          this.moveStick(i, 1, { x: axes[2], y: axes[3] });
          const buttons = gp.buttons.map((b, j) => ({
            index: j,
            button: b
          }));
          if (buttons.length > 0) {
            buttons.forEach((b) => {
              if (this.gamepads[i]?.buttons && b.button.value !== this.gamepads[i]?.buttons[b.index]?.value && b.button.pressed) {
                this.pressButton(i, b.index, b.button);
              } else if (this.gamepads[i]?.buttons && b.button.value !== this.gamepads[i]?.buttons[b.index]?.value && !b.button.pressed) {
                this.releaseButton(i, b.index, b.button);
              }
            });
          }
        } else {
          this.saveGamepadsState();
        }
      }
    }
    pressButton(gamepad2, buttonIndex, button) {
      this.gamepads[gamepad2].buttons[buttonIndex].value = button.value;
      this.gamepads[gamepad2].buttons[buttonIndex].pressed = button.pressed;
      const GamepadButtonDown = new CustomEvent("gamepadButtonDown", {
        detail: {
          gamepadId: gamepad2,
          buttonIndex,
          button
        }
      });
      document.dispatchEvent(GamepadButtonDown);
    }
    releaseButton(gamepad2, buttonIndex, button) {
      this.gamepads[gamepad2].buttons[buttonIndex].value = button.value;
      this.gamepads[gamepad2].buttons[buttonIndex].pressed = button.pressed;
      const GamepadButtonUp = new CustomEvent("gamepadButtonUp", {
        detail: {
          gamepadId: gamepad2,
          buttonIndex,
          button
        }
      });
      document.dispatchEvent(GamepadButtonUp);
    }
    moveStick(gamepad2, stickIndex, stick) {
      const coords = {
        x: Math.abs(stick.x) < 0.2 ? 0 : stick.x,
        y: Math.abs(stick.y) < 0.2 ? 0 : stick.y
      };
      const GamepadStickMove = new CustomEvent("gamepadStickMove", {
        detail: {
          gamepadId: gamepad2,
          stickIndex,
          stick: coords
        }
      });
      document.dispatchEvent(GamepadStickMove);
    }
    vibrate(index, weak, strong, duration) {
      const gamepads = navigator.getGamepads();
      gamepads[index]?.vibrationActuator?.playEffect("dual-rumble", {
        startDelay: 0,
        duration,
        weakMagnitude: weak,
        strongMagnitude: strong
      });
    }
  };

  // public/themes/retro-knights/config.ts
  var RetroKnights = {
    name: "retro-knights",
    colors: ["#368dc8", "#d3b447"],
    scene: {
      name: "scene",
      images: ["./assets/scene1.png", "./assets/scene2.png"],
      animationSpeed: 30,
      offset: { x: 0, y: 0 }
    },
    obstacles: [
      {
        a: { x: 819, y: 469 },
        b: { x: 819, y: 629 },
        c: { x: 1100, y: 629 },
        d: { x: 1100, y: 469 }
      },
      {
        a: { x: 0, y: 0 },
        b: { x: 0, y: 1080 },
        c: { x: 10, y: 1080 },
        d: { x: 10, y: 0 }
      },
      {
        a: { x: 0, y: 0 },
        b: { x: 1920, y: 10 },
        c: { x: 1920, y: 10 },
        d: { x: 0, y: 0 }
      },
      {
        a: { x: 1920, y: 0 },
        b: { x: 1920, y: 1080 },
        c: { x: 1920 - 10, y: 1080 },
        d: { x: 1920 - 10, y: 0 }
      },
      {
        a: { x: 0, y: 1080 },
        b: { x: 1920, y: 1080 },
        c: { x: 1920, y: 1080 - 10 },
        d: { x: 0, y: 1080 - 10 }
      }
    ],
    players: [
      {
        default: {
          n: {
            name: "p1_n",
            images: ["./assets/p1_n_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          ne: {
            name: "p1_ne",
            images: ["./assets/p1_ne_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          e: {
            name: "p1_e",
            images: ["./assets/p1_e_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          se: {
            name: "p1_se",
            images: ["./assets/p1_se_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          s: {
            name: "p1_s",
            images: ["./assets/p1_s_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          sw: {
            name: "p1_sw",
            images: ["./assets/p1_sw_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          w: {
            name: "p1_w",
            images: ["./assets/p1_w_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          nw: {
            name: "p1_nw",
            images: ["./assets/p1_nw_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        },
        move: {
          n: {
            name: "p1_move_n",
            images: [
              "./assets/p1_n_move_1.png",
              "./assets/p1_n_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          ne: {
            name: "p1_move_ne",
            images: [
              "./assets/p1_ne_move_1.png",
              "./assets/p1_ne_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          e: {
            name: "p1_move_e",
            images: [
              "./assets/p1_e_move_1.png",
              "./assets/p1_e_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          se: {
            name: "p_move1_se",
            images: [
              "./assets/p1_se_move_1.png",
              "./assets/p1_se_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          s: {
            name: "p1_move_s",
            images: [
              "./assets/p1_s_move_1.png",
              "./assets/p1_s_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          sw: {
            name: "p1_move_sw",
            images: [
              "./assets/p1_sw_move_1.png",
              "./assets/p1_sw_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          w: {
            name: "p1_move_w",
            images: [
              "./assets/p1_w_move_1.png",
              "./assets/p1_w_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          nw: {
            name: "p1_move_nw",
            images: [
              "./assets/p1_nw_move_1.png",
              "./assets/p1_nw_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        },
        attack: {
          n: {
            name: "p1_n_attack",
            images: [
              "./assets/p1_n_attack_1.png",
              "./assets/p1_n_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 0, y: -150 }
          },
          ne: {
            name: "p1_ne_attack",
            images: [
              "./assets/p1_ne_attack_1.png",
              "./assets/p1_ne_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 0, y: -69 }
          },
          e: {
            name: "p1_e_attack",
            images: [
              "./assets/p1_e_attack_1.png",
              "./assets/p1_e_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 7, y: 0 }
          },
          se: {
            name: "p1_se_attack",
            images: [
              "./assets/p1_se_attack_1.png",
              "./assets/p1_se_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 7, y: 0 }
          },
          s: {
            name: "p1_s_attack",
            images: [
              "./assets/p1_s_attack_1.png",
              "./assets/p1_s_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 0, y: 0 }
          },
          sw: {
            name: "p1_sw_attack",
            images: [
              "./assets/p1_sw_attack_1.png",
              "./assets/p1_sw_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: -112, y: 0 }
          },
          w: {
            name: "p1_w_attack",
            images: [
              "./assets/p1_w_attack_1.png",
              "./assets/p1_w_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: -150, y: 0 }
          },
          nw: {
            name: "p1_nw_attack",
            images: [
              "./assets/p1_nw_attack_1.png",
              "./assets/p1_nw_attack_2.png"
            ],
            animationSpeed: 8,
            offset: { x: -100, y: -75 }
          }
        },
        block: {
          n: {
            name: "p1_block_n",
            images: ["./assets/p1_n_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          ne: {
            name: "p1_block_ne",
            images: ["./assets/p1_ne_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          e: {
            name: "p1_block_e",
            images: ["./assets/p1_e_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          se: {
            name: "p1_block_se",
            images: ["./assets/p1_se_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          s: {
            name: "p1_block_s",
            images: ["./assets/p1_s_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          sw: {
            name: "p1_block_sw",
            images: ["./assets/p1_sw_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          w: {
            name: "p1_block_w",
            images: ["./assets/p1_w_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          nw: {
            name: "p1_block_nw",
            images: ["./assets/p1_nw_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        }
      },
      {
        default: {
          n: {
            name: "p2_n",
            images: ["./assets/p2_n_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          ne: {
            name: "p2_ne",
            images: ["./assets/p2_ne_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          e: {
            name: "p2_e",
            images: ["./assets/p2_e_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          se: {
            name: "p2_se",
            images: ["./assets/p2_se_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          s: {
            name: "p2_s",
            images: ["./assets/p2_s_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          sw: {
            name: "p2_sw",
            images: ["./assets/p2_sw_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          w: {
            name: "p2_w",
            images: ["./assets/p2_w_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          nw: {
            name: "p_2nw",
            images: ["./assets/p2_nw_default.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        },
        move: {
          n: {
            name: "p2_move_n",
            images: [
              "./assets/p2_n_move_1.png",
              "./assets/p2_n_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          ne: {
            name: "p2_move_ne",
            images: [
              "./assets/p2_ne_move_1.png",
              "./assets/p2_ne_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          e: {
            name: "p2_move_e",
            images: [
              "./assets/p2_e_move_1.png",
              "./assets/p2_e_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          se: {
            name: "p2_move_se",
            images: [
              "./assets/p2_se_move_1.png",
              "./assets/p2_se_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          s: {
            name: "p2_move_s",
            images: [
              "./assets/p2_s_move_1.png",
              "./assets/p2_s_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          sw: {
            name: "p2_move_sw",
            images: [
              "./assets/p2_sw_move_1.png",
              "./assets/p2_sw_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          w: {
            name: "p2_move_w",
            images: [
              "./assets/p2_w_move_1.png",
              "./assets/p2_w_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          nw: {
            name: "p2_move_nw",
            images: [
              "./assets/p2_nw_move_1.png",
              "./assets/p2_nw_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        },
        attack: {
          n: {
            name: "p2_n_attack",
            images: [
              "./assets/p2_n_attack_1.png",
              "./assets/p2_n_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 0, y: -150 }
          },
          ne: {
            name: "p2_ne_attack",
            images: [
              "./assets/p2_ne_attack_1.png",
              "./assets/p2_ne_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 0, y: -69 }
          },
          e: {
            name: "p2_e_attack",
            images: [
              "./assets/p2_e_attack_1.png",
              "./assets/p2_e_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 7, y: 0 }
          },
          se: {
            name: "p2_se_attack",
            images: [
              "./assets/p2_se_attack_1.png",
              "./assets/p2_se_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 7, y: 0 }
          },
          s: {
            name: "p2_s_attack",
            images: [
              "./assets/p2_s_attack_1.png",
              "./assets/p2_s_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 0, y: 0 }
          },
          sw: {
            name: "p2_sw_attack",
            images: [
              "./assets/p2_sw_attack_1.png",
              "./assets/p2_sw_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: -112, y: 0 }
          },
          w: {
            name: "p2_w_attack",
            images: [
              "./assets/p2_w_attack_1.png",
              "./assets/p2_w_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: -150, y: 0 }
          },
          nw: {
            name: "p2_nw_attack",
            images: [
              "./assets/p2_nw_attack_1.png",
              "./assets/p2_nw_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: -100, y: -75 }
          }
        },
        block: {
          n: {
            name: "p2_block_n",
            images: ["./assets/p2_n_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          ne: {
            name: "p2_block_ne",
            images: ["./assets/p2_ne_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          e: {
            name: "p2_block_e",
            images: ["./assets/p2_e_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          se: {
            name: "p2_block_se",
            images: ["./assets/p2_se_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          s: {
            name: "p2_block_s",
            images: ["./assets/p2_s_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          sw: {
            name: "p2_block_sw",
            images: ["./assets/p2_sw_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          w: {
            name: "p2_block_w",
            images: ["./assets/p2_w_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          },
          nw: {
            name: "p2_block_nw",
            images: ["./assets/p2_nw_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        }
      }
    ],
    turnSprites: false,
    shader: (ctx) => {
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 5;
    },
    bgAudio: "./assets/xDeviruchi_Decisive_Battle_01.mp3",
    attackAudio: "./assets/attack.mp3",
    blockAudio: "./assets/block.mp3",
    collideAudio: "./assets/bump.mp3",
    winAudio: "./assets/win.mp3"
  };

  // public/themes/vector-spaceships/config.ts
  var getBgNames = () => {
    const images = [];
    for (let i = 0; i <= 59; i++) {
      images.push(`./assets/bg/bg_${("0" + i).slice(-2)}.jpg`);
    }
    return images;
  };
  var VectorSpaceships = {
    name: "vector-spaceships",
    colors: ["#368dc8", "#d3b447"],
    scene: {
      name: "scene",
      images: getBgNames(),
      animationSpeed: 2,
      offset: { x: 0, y: 0 }
    },
    obstacles: [
      {
        a: { x: 0, y: 0 },
        b: { x: 0, y: 1080 },
        c: { x: 10, y: 1080 },
        d: { x: 10, y: 0 }
      },
      {
        a: { x: 0, y: 0 },
        b: { x: 1920, y: 10 },
        c: { x: 1920, y: 10 },
        d: { x: 0, y: 0 }
      },
      {
        a: { x: 1920, y: 0 },
        b: { x: 1920, y: 1080 },
        c: { x: 1920 - 10, y: 1080 },
        d: { x: 1920 - 10, y: 0 }
      },
      {
        a: { x: 0, y: 1080 },
        b: { x: 1920, y: 1080 },
        c: { x: 1920, y: 1080 - 10 },
        d: { x: 0, y: 1080 - 10 }
      }
    ],
    players: [
      {
        default: {
          x: {
            name: "p1",
            images: ["./assets/p1.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        },
        move: {
          x: {
            name: "p1_move",
            images: [
              "./assets/p1_move_1.png",
              "./assets/p1_move_2.png"
            ],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        },
        attack: {
          x: {
            name: "p1_attack",
            images: [
              "./assets/p1_attack_1.png",
              "./assets/p1_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 0, y: 0 }
          }
        },
        block: {
          x: {
            name: "p1_block",
            images: ["./assets/p1_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        }
      },
      {
        default: {
          x: {
            name: "p2",
            images: ["./assets/p2.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        },
        move: {
          x: {
            name: "p2_move",
            images: [
              "./assets/p2_move_1.png",
              "./assets/p2_move_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 0, y: 0 }
          }
        },
        attack: {
          x: {
            name: "p2_attack",
            images: [
              "./assets/p2_attack_1.png",
              "./assets/p2_attack_2.png"
            ],
            animationSpeed: 2,
            offset: { x: 0, y: 0 }
          }
        },
        block: {
          x: {
            name: "p2_block",
            images: ["./assets/p2_block.png"],
            animationSpeed: 8,
            offset: { x: 0, y: 0 }
          }
        }
      }
    ],
    turnSprites: true,
    shader: (ctx) => {
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 5;
    },
    bgAudio: "./assets/TheMothership.mp3",
    attackAudio: "./assets/attack.mp3",
    blockAudio: "./assets/attack.mp3",
    collideAudio: "./assets/collide.mp3",
    winAudio: "./assets/explosion.mp3"
  };

  // public/themes/index.ts
  var themes = {
    RetroKnights,
    VectorSpaceships
  };

  // public/themes/theme.ts
  var Theme = class {
    constructor(ctx, config) {
      this.assetsLoaded = false;
      this.images = [];
      this.sprites = [];
      this.ctx = ctx;
      this.config = config;
      this.assignGlobalColors();
      this.loadAssets();
    }
    loadImage(src) {
      const url = `./themes/${this.config.name}/${src}`;
      return fetch(url).then(() => {
        const img = new Image();
        img.src = url;
        if (!this.images.includes(img)) {
          this.images.push(img);
        }
        return img;
      });
    }
    assignGlobalColors() {
      document.documentElement.style.setProperty("--color-p1", this.config.colors[0]);
      document.documentElement.style.setProperty("--color-p2", this.config.colors[1]);
    }
    loadAssets() {
      const toLoad = [];
      this.config.scene.images.forEach(async (image) => {
        const imageResp = await this.loadImage(image);
        if (toLoad.includes(imageResp)) {
          return;
        }
        imageResp.onload = () => {
          this.onAssetLoaded(toLoad);
        };
        toLoad.push(imageResp);
      });
      this.sprites.push(this.config.scene);
      this.config.players.forEach((player) => {
        const spriteSets = ["default", "move", "attack", "block"];
        spriteSets.forEach((spriteSet) => {
          Object.keys(player[spriteSet]).forEach((key) => {
            player[spriteSet][key].images.forEach(async (image) => {
              const imageResp = await this.loadImage(image);
              if (toLoad.includes(imageResp)) {
                return;
              }
              imageResp.onload = () => {
                this.onAssetLoaded(toLoad);
              };
              toLoad.push(imageResp);
            });
            this.sprites.push(player[spriteSet][key]);
          });
        });
      });
    }
    onAssetLoaded(assetList) {
      const loadComplete = assetList.every((x) => x.complete);
      const progress = Math.floor((assetList.length - assetList.filter((x) => !x.complete).length) / assetList.length * 100);
      const loadingEvent = new CustomEvent("loadingEvent", {
        detail: {
          progress
        }
      });
      this.ctx.canvas.dispatchEvent(loadingEvent);
      if (loadComplete) {
        this.assetsLoaded = true;
      }
    }
    drawSprite(ctx, name, pos, frameCount = 0) {
      const sprite = this.sprites.find((x) => x.name === name);
      if (!sprite) {
        return;
      }
      const spriteFrame = Math.floor(frameCount / sprite.animationSpeed % sprite.images.length);
      const img = this.images.find((x) => x.src.endsWith(`${sprite.images[spriteFrame].replace("./", "")}`));
      if (!img) {
        return;
      }
      ctx.drawImage(img, pos.x + sprite.offset.x, pos.y + sprite.offset.y);
    }
  };

  // src/ts/registerServiceWorker.ts
  var registerServiceWorker = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/"
      });
    }
  };

  // src/ts/showInstallButton.ts
  var showInstallButton = (channel) => {
    const button = document.querySelector("[data-type='pwa-install-button']");
    if (!button) {
      return;
    }
    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      button.removeAttribute("hidden");
    });
    button.addEventListener("click", (e) => {
      deferredPrompt.prompt();
    });
    window.addEventListener("appinstalled", () => {
      button.setAttribute("hidden", "hidden");
      deferredPrompt = null;
      channel.postMessage({ message: "cache-assets" });
    });
  };

  // src/ts/main.ts
  var Game = class {
    constructor() {
      const canvas = document.getElementById("canvas");
      if (!canvas || !canvas.getContext("2d")) {
        console.error("canvas is missing");
        return;
      }
      this.ctx = canvas.getContext("2d");
      this.showLoader();
      this.collider = new Collider2D();
      this.gamepadAdapter = new GamepadAdapter(this.ctx);
      this.initTheme(themes[this.getTheme()]);
      this.manageState();
      this.initThemeControl();
      this.renderer = new Renderer(this.ctx);
      this.start();
    }
    showLoader() {
      const loader = document.querySelector(".loader");
      const progress = loader?.querySelector("progress");
      if (!loader || !progress) {
        this.ctx.canvas.classList.add("fade-in");
        return;
      }
      loader.removeAttribute("hidden");
      this.ctx.canvas.addEventListener("loadingEvent", (e) => {
        progress.value = e.detail.progress;
        if (e.detail.progress === 100) {
          loader.setAttribute("hidden", "true");
          this.ctx.canvas.classList.add("fade-in");
        }
      });
    }
    getTheme() {
      const themeSelect = document.querySelector("#theme");
      return themeSelect.value;
    }
    initThemeControl() {
      const themeSelect = document.querySelector("#theme");
      themeSelect.addEventListener("change", () => {
        this.switchTheme(themes[this.getTheme()]);
      });
    }
    initTheme(theme) {
      this.theme = new Theme(this.ctx, theme);
      this.obstacles = [];
      this.scene = new Scene(this, this.theme);
      this.audio = new Audio(this.theme);
      this.players = [];
      const player1 = new Character(this, 0, this.theme);
      const player2 = new Character(this, 1, this.theme);
      this.players.push(player1, player2);
      this.countdown = new Countdown(this.ctx, this.theme);
      this.gui = new Gui(this.ctx, this.theme, 2);
    }
    switchTheme(config) {
      const theme = new Theme(this.ctx, config);
      this.theme = theme;
      this.obstacles = [];
      this.scene.switchTheme(theme);
      this.audio.switchTheme(theme);
      this.players.forEach((player) => player.switchTheme(theme));
    }
    manageState() {
      this.ctx.canvas.addEventListener("countdown", (e) => {
        if (typeof e.detail?.winner === "number") {
          this.gui.incrementScore(e.detail.winner);
        }
        this.startCountdown(e.detail?.winner);
        this.togglePlayers(false);
      });
      this.ctx.canvas.addEventListener("play", () => {
        this.togglePlayers(true);
      });
    }
    startCountdown(winner) {
      this.countdown.startTimer(winner);
    }
    togglePlayers(active) {
      this.players.forEach((player) => {
        player.setActive(active);
      });
    }
    start() {
      const startEvent = new Event("countdown");
      this.ctx.canvas.dispatchEvent(startEvent);
    }
  };
  new Game();
  if (window.BroadcastChannel) {
    const channel = new BroadcastChannel("sw-messages");
    registerServiceWorker();
    showInstallButton(channel);
  }
  if (window.matchMedia("(display-mode: fullscreen)").matches) {
    document.querySelectorAll("[data-link='external']").forEach((el) => {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    });
  }
})();
