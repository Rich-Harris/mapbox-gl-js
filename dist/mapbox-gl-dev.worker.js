(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.mapboxgl = factory());
}(this, function () { 'use strict';

	var __commonjs_global = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this;
	function __commonjs(fn, module) { return module = { exports: {} }, fn(module, module.exports, __commonjs_global), module.exports; }

	/**
	 * An implementation of the [Actor design pattern](http://en.wikipedia.org/wiki/Actor_model)
	 * that maintains the relationship between asynchronous tasks and the objects
	 * that spin them off - in this case, tasks like parsing parts of styles,
	 * owned by the styles
	 *
	 * @param {WebWorker} target
	 * @param {WebWorker} parent
	 * @private
	 */
	function Actor(target, parent) {
	    this.target = target;
	    this.parent = parent;
	    this.callbacks = {};
	    this.callbackID = 0;
	    this.receive = this.receive.bind(this);
	    this.target.addEventListener('message', this.receive, false);
	}

	Actor.prototype.receive = function(message) {
	    var data = message.data,
	        callback;

	    if (data.type === '<response>') {
	        callback = this.callbacks[data.id];
	        delete this.callbacks[data.id];
	        callback(data.error || null, data.data);
	    } else if (typeof data.id !== 'undefined') {
	        var id = data.id;
	        this.parent[data.type](data.data, function(err, data, buffers) {
	            this.postMessage({
	                type: '<response>',
	                id: String(id),
	                error: err ? String(err) : null,
	                data: data
	            }, buffers);
	        }.bind(this));
	    } else {
	        this.parent[data.type](data.data);
	    }
	};

	Actor.prototype.send = function(type, data, callback, buffers) {
	    var id = null;
	    if (callback) this.callbacks[id = this.callbackID++] = callback;
	    this.postMessage({ type: type, id: String(id), data: data }, buffers);
	};

	/**
	 * Wrapped postMessage API that abstracts around IE's lack of
	 * `transferList` support.
	 *
	 * @param {Object} message
	 * @param {Object} transferList
	 * @private
	 */
	Actor.prototype.postMessage = function(message, transferList) {
	    this.target.postMessage(message, transferList);
	};

	var index = __commonjs(function (module) {
	'use strict';

	module.exports = Point;

	function Point(x, y) {
	    this.x = x;
	    this.y = y;
	}

	Point.prototype = {
	    clone: function() { return new Point(this.x, this.y); },

	    add:     function(p) { return this.clone()._add(p);     },
	    sub:     function(p) { return this.clone()._sub(p);     },
	    mult:    function(k) { return this.clone()._mult(k);    },
	    div:     function(k) { return this.clone()._div(k);     },
	    rotate:  function(a) { return this.clone()._rotate(a);  },
	    matMult: function(m) { return this.clone()._matMult(m); },
	    unit:    function() { return this.clone()._unit(); },
	    perp:    function() { return this.clone()._perp(); },
	    round:   function() { return this.clone()._round(); },

	    mag: function() {
	        return Math.sqrt(this.x * this.x + this.y * this.y);
	    },

	    equals: function(p) {
	        return this.x === p.x &&
	               this.y === p.y;
	    },

	    dist: function(p) {
	        return Math.sqrt(this.distSqr(p));
	    },

	    distSqr: function(p) {
	        var dx = p.x - this.x,
	            dy = p.y - this.y;
	        return dx * dx + dy * dy;
	    },

	    angle: function() {
	        return Math.atan2(this.y, this.x);
	    },

	    angleTo: function(b) {
	        return Math.atan2(this.y - b.y, this.x - b.x);
	    },

	    angleWith: function(b) {
	        return this.angleWithSep(b.x, b.y);
	    },

	    // Find the angle of the two vectors, solving the formula for the cross product a x b = |a||b|sin(θ) for θ.
	    angleWithSep: function(x, y) {
	        return Math.atan2(
	            this.x * y - this.y * x,
	            this.x * x + this.y * y);
	    },

	    _matMult: function(m) {
	        var x = m[0] * this.x + m[1] * this.y,
	            y = m[2] * this.x + m[3] * this.y;
	        this.x = x;
	        this.y = y;
	        return this;
	    },

	    _add: function(p) {
	        this.x += p.x;
	        this.y += p.y;
	        return this;
	    },

	    _sub: function(p) {
	        this.x -= p.x;
	        this.y -= p.y;
	        return this;
	    },

	    _mult: function(k) {
	        this.x *= k;
	        this.y *= k;
	        return this;
	    },

	    _div: function(k) {
	        this.x /= k;
	        this.y /= k;
	        return this;
	    },

	    _unit: function() {
	        this._div(this.mag());
	        return this;
	    },

	    _perp: function() {
	        var y = this.y;
	        this.y = this.x;
	        this.x = -y;
	        return this;
	    },

	    _rotate: function(angle) {
	        var cos = Math.cos(angle),
	            sin = Math.sin(angle),
	            x = cos * this.x - sin * this.y,
	            y = sin * this.x + cos * this.y;
	        this.x = x;
	        this.y = y;
	        return this;
	    },

	    _round: function() {
	        this.x = Math.round(this.x);
	        this.y = Math.round(this.y);
	        return this;
	    }
	};

	// constructs Point from an array if necessary
	Point.convert = function (a) {
	    if (a instanceof Point) {
	        return a;
	    }
	    if (Array.isArray(a)) {
	        return new Point(a[0], a[1]);
	    }
	    return a;
	};
	});

	var require$$1 = (index && typeof index === 'object' && 'default' in index ? index['default'] : index);

	var index$1 = __commonjs(function (module) {
	/*
	 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
	 *
	 * Redistribution and use in source and binary forms, with or without
	 * modification, are permitted provided that the following conditions
	 * are met:
	 * 1. Redistributions of source code must retain the above copyright
	 *    notice, this list of conditions and the following disclaimer.
	 * 2. Redistributions in binary form must reproduce the above copyright
	 *    notice, this list of conditions and the following disclaimer in the
	 *    documentation and/or other materials provided with the distribution.
	 *
	 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
	 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
	 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
	 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
	 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
	 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
	 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
	 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
	 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 *
	 * Ported from Webkit
	 * http://svn.webkit.org/repository/webkit/trunk/Source/WebCore/platform/graphics/UnitBezier.h
	 */

	module.exports = UnitBezier;

	function UnitBezier(p1x, p1y, p2x, p2y) {
	    // Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
	    this.cx = 3.0 * p1x;
	    this.bx = 3.0 * (p2x - p1x) - this.cx;
	    this.ax = 1.0 - this.cx - this.bx;

	    this.cy = 3.0 * p1y;
	    this.by = 3.0 * (p2y - p1y) - this.cy;
	    this.ay = 1.0 - this.cy - this.by;

	    this.p1x = p1x;
	    this.p1y = p2y;
	    this.p2x = p2x;
	    this.p2y = p2y;
	}

	UnitBezier.prototype.sampleCurveX = function(t) {
	    // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
	    return ((this.ax * t + this.bx) * t + this.cx) * t;
	};

	UnitBezier.prototype.sampleCurveY = function(t) {
	    return ((this.ay * t + this.by) * t + this.cy) * t;
	};

	UnitBezier.prototype.sampleCurveDerivativeX = function(t) {
	    return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
	};

	UnitBezier.prototype.solveCurveX = function(x, epsilon) {
	    if (typeof epsilon === 'undefined') epsilon = 1e-6;

	    var t0, t1, t2, x2, i;

	    // First try a few iterations of Newton's method -- normally very fast.
	    for (t2 = x, i = 0; i < 8; i++) {

	        x2 = this.sampleCurveX(t2) - x;
	        if (Math.abs(x2) < epsilon) return t2;

	        var d2 = this.sampleCurveDerivativeX(t2);
	        if (Math.abs(d2) < 1e-6) break;

	        t2 = t2 - x2 / d2;
	    }

	    // Fall back to the bisection method for reliability.
	    t0 = 0.0;
	    t1 = 1.0;
	    t2 = x;

	    if (t2 < t0) return t0;
	    if (t2 > t1) return t1;

	    while (t0 < t1) {

	        x2 = this.sampleCurveX(t2);
	        if (Math.abs(x2 - x) < epsilon) return t2;

	        if (x > x2) {
	            t0 = t2;
	        } else {
	            t1 = t2;
	        }

	        t2 = (t1 - t0) * 0.5 + t0;
	    }

	    // Failure.
	    return t2;
	};

	UnitBezier.prototype.solve = function(x, epsilon) {
	    return this.sampleCurveY(this.solveCurveX(x, epsilon));
	};
	});

	var UnitBezier = (index$1 && typeof index$1 === 'object' && 'default' in index$1 ? index$1['default'] : index$1);

	/**
	 * Given a value `t` that varies between 0 and 1, return
	 * an interpolation function that eases between 0 and 1 in a pleasing
	 * cubic in-out fashion.
	 *
	 * @param {number} t input
	 * @returns {number} input
	 * @private
	 */
	var easeCubicInOut = function (t) {
	    if (t <= 0) return 0;
	    if (t >= 1) return 1;
	    var t2 = t * t,
	        t3 = t2 * t;
	    return 4 * (t < 0.5 ? t3 : 3 * (t - t2) + t3 - 0.75);
	};

	/**
	 * Given given (x, y), (x1, y1) control points for a bezier curve,
	 * return a function that interpolates along that curve.
	 *
	 * @param {number} p1x control point 1 x coordinate
	 * @param {number} p1y control point 1 y coordinate
	 * @param {number} p2x control point 2 x coordinate
	 * @param {number} p2y control point 2 y coordinate
	 * @returns {Function} interpolator: receives number value, returns
	 * number value.
	 * @private
	 */
	var bezier = function(p1x, p1y, p2x, p2y) {
	    var bezier = new UnitBezier(p1x, p1y, p2x, p2y);
	    return function(t) {
	        return bezier.solve(t);
	    };
	};

	/**
	 * A default bezier-curve powered easing function with
	 * control points (0.25, 0.1) and (0.25, 1)
	 *
	 * @param {number} t
	 * @returns {number} output
	 * @private
	 */
	var ease = bezier(0.25, 0.1, 0.25, 1);

	/**
	 * Given a four-element array of numbers that represents a color in
	 * RGBA, return a version for which the RGB components are multiplied
	 * by the A (alpha) component
	 *
	 * @param {Array<number>} color color array
	 * @returns {Array<number>} premultiplied color array
	 * @private
	 */
	var premultiply = function (color) {
	    if (!color) return null;
	    var opacity = color[3];
	    return [
	        color[0] * opacity,
	        color[1] * opacity,
	        color[2] * opacity,
	        opacity
	    ];
	};

	/**
	 * Given a destination object and optionally many source objects,
	 * copy all properties from the source objects into the destination.
	 * The last source object given overrides properties from previous
	 * source objects.
	 * @param {Object} dest destination object
	 * @param {...Object} sources sources from which properties are pulled
	 * @returns {Object} dest
	 * @private
	 */
	var extend = function (dest) {
	    for (var i = 1; i < arguments.length; i++) {
	        var src = arguments[i];
	        for (var k in src) {
	            dest[k] = src[k];
	        }
	    }
	    return dest;
	};

	/**
	 * Extend a destination object with all properties of the src object,
	 * using defineProperty instead of simple assignment.
	 * @param {Object} dest
	 * @param {Object} src
	 * @returns {Object} dest
	 * @private
	 */
	var extendAll = function (dest, src) {
	    for (var i in src) {
	        Object.defineProperty(dest, i, Object.getOwnPropertyDescriptor(src, i));
	    }
	    return dest;
	};

	/**
	 * Extend a parent's prototype with all properties in a properties
	 * object.
	 *
	 * @param {Object} parent
	 * @param {Object} props
	 * @returns {Object}
	 * @private
	 */
	var inherit = function (parent, props) {
	    var parentProto = typeof parent === 'function' ? parent.prototype : parent,
	        proto = Object.create(parentProto);
	    extendAll(proto, props);
	    return proto;
	};

	/**
	 * Determine if a string ends with a particular substring
	 * @param {string} string
	 * @param {string} suffix
	 * @returns {boolean}
	 * @private
	 */
	var endsWith = function(string, suffix) {
	    return string.indexOf(suffix, string.length - suffix.length) !== -1;
	};

	/**
	 * Create an object by mapping all the values of an existing object while
	 * preserving their keys.
	 * @param {Object} input
	 * @param {Function} iterator
	 * @returns {Object}
	 * @private
	 */
	var mapObject = function(input, iterator, context) {
	    var output = {};
	    for (var key in input) {
	        output[key] = iterator.call(context || this, input[key], key, input);
	    }
	    return output;
	};

	/**
	 * Create an object by filtering out values of an existing object
	 * @param {Object} input
	 * @param {Function} iterator
	 * @returns {Object}
	 * @private
	 */
	var filterObject = function(input, iterator, context) {
	    var output = {};
	    for (var key in input) {
	        if (iterator.call(context || this, input[key], key, input)) {
	            output[key] = input[key];
	        }
	    }
	    return output;
	};

	/**
	 * Deeply clones two objects.
	 * @param {Object} obj1
	 * @param {Object} obj2
	 * @returns {boolean}
	 * @private
	 */
	var clone = function deepEqual(input) {
	    if (Array.isArray(input)) {
	        return input.map(clone);
	    } else if (typeof input === 'object') {
	        return mapObject(input, clone);
	    } else {
	        return input;
	    }
	};

	/**
	 * Check if two arrays have at least one common element.
	 * @param {Array} a
	 * @param {Array} b
	 * @returns {boolean}
	 * @private
	 */
	var arraysIntersect = function(a, b) {
	    for (var l = 0; l < a.length; l++) {
	        if (b.indexOf(a[l]) >= 0) return true;
	    }
	    return false;
	};

	var warnOnceHistory = {};
	var warnOnce = function(message) {
	    if (!warnOnceHistory[message]) {
	        // console isn't defined in some WebWorkers, see #2558
	        if (typeof console !== "undefined") console.warn(message);
	        warnOnceHistory[message] = true;
	    }
	};

	var earcut = __commonjs(function (module) {
	'use strict';

	module.exports = earcut;

	function earcut(data, holeIndices, dim) {

	    dim = dim || 2;

	    var hasHoles = holeIndices && holeIndices.length,
	        outerLen = hasHoles ? holeIndices[0] * dim : data.length,
	        outerNode = linkedList(data, 0, outerLen, dim, true),
	        triangles = [];

	    if (!outerNode) return triangles;

	    var minX, minY, maxX, maxY, x, y, size;

	    if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

	    // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
	    if (data.length > 80 * dim) {
	        minX = maxX = data[0];
	        minY = maxY = data[1];

	        for (var i = dim; i < outerLen; i += dim) {
	            x = data[i];
	            y = data[i + 1];
	            if (x < minX) minX = x;
	            if (y < minY) minY = y;
	            if (x > maxX) maxX = x;
	            if (y > maxY) maxY = y;
	        }

	        // minX, minY and size are later used to transform coords into integers for z-order calculation
	        size = Math.max(maxX - minX, maxY - minY);
	    }

	    earcutLinked(outerNode, triangles, dim, minX, minY, size);

	    return triangles;
	}

	// create a circular doubly linked list from polygon points in the specified winding order
	function linkedList(data, start, end, dim, clockwise) {
	    var i, last;

	    if (clockwise === (signedArea(data, start, end, dim) > 0)) {
	        for (i = start; i < end; i += dim) last = insertNode(i, data[i], data[i + 1], last);
	    } else {
	        for (i = end - dim; i >= start; i -= dim) last = insertNode(i, data[i], data[i + 1], last);
	    }

	    if (last && equals(last, last.next)) {
	        removeNode(last);
	        last = last.next;
	    }

	    return last;
	}

	// eliminate colinear or duplicate points
	function filterPoints(start, end) {
	    if (!start) return start;
	    if (!end) end = start;

	    var p = start,
	        again;
	    do {
	        again = false;

	        if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
	            removeNode(p);
	            p = end = p.prev;
	            if (p === p.next) return null;
	            again = true;

	        } else {
	            p = p.next;
	        }
	    } while (again || p !== end);

	    return end;
	}

	// main ear slicing loop which triangulates a polygon (given as a linked list)
	function earcutLinked(ear, triangles, dim, minX, minY, size, pass) {
	    if (!ear) return;

	    // interlink polygon nodes in z-order
	    if (!pass && size) indexCurve(ear, minX, minY, size);

	    var stop = ear,
	        prev, next;

	    // iterate through ears, slicing them one by one
	    while (ear.prev !== ear.next) {
	        prev = ear.prev;
	        next = ear.next;

	        if (size ? isEarHashed(ear, minX, minY, size) : isEar(ear)) {
	            // cut off the triangle
	            triangles.push(prev.i / dim);
	            triangles.push(ear.i / dim);
	            triangles.push(next.i / dim);

	            removeNode(ear);

	            // skipping the next vertice leads to less sliver triangles
	            ear = next.next;
	            stop = next.next;

	            continue;
	        }

	        ear = next;

	        // if we looped through the whole remaining polygon and can't find any more ears
	        if (ear === stop) {
	            // try filtering points and slicing again
	            if (!pass) {
	                earcutLinked(filterPoints(ear), triangles, dim, minX, minY, size, 1);

	            // if this didn't work, try curing all small self-intersections locally
	            } else if (pass === 1) {
	                ear = cureLocalIntersections(ear, triangles, dim);
	                earcutLinked(ear, triangles, dim, minX, minY, size, 2);

	            // as a last resort, try splitting the remaining polygon into two
	            } else if (pass === 2) {
	                splitEarcut(ear, triangles, dim, minX, minY, size);
	            }

	            break;
	        }
	    }
	}

	// check whether a polygon node forms a valid ear with adjacent nodes
	function isEar(ear) {
	    var a = ear.prev,
	        b = ear,
	        c = ear.next;

	    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

	    // now make sure we don't have other points inside the potential ear
	    var p = ear.next.next;

	    while (p !== ear.prev) {
	        if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
	            area(p.prev, p, p.next) >= 0) return false;
	        p = p.next;
	    }

	    return true;
	}

	function isEarHashed(ear, minX, minY, size) {
	    var a = ear.prev,
	        b = ear,
	        c = ear.next;

	    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

	    // triangle bbox; min & max are calculated like this for speed
	    var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : (b.x < c.x ? b.x : c.x),
	        minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : (b.y < c.y ? b.y : c.y),
	        maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : (b.x > c.x ? b.x : c.x),
	        maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : (b.y > c.y ? b.y : c.y);

	    // z-order range for the current triangle bbox;
	    var minZ = zOrder(minTX, minTY, minX, minY, size),
	        maxZ = zOrder(maxTX, maxTY, minX, minY, size);

	    // first look for points inside the triangle in increasing z-order
	    var p = ear.nextZ;

	    while (p && p.z <= maxZ) {
	        if (p !== ear.prev && p !== ear.next &&
	            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
	            area(p.prev, p, p.next) >= 0) return false;
	        p = p.nextZ;
	    }

	    // then look for points in decreasing z-order
	    p = ear.prevZ;

	    while (p && p.z >= minZ) {
	        if (p !== ear.prev && p !== ear.next &&
	            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
	            area(p.prev, p, p.next) >= 0) return false;
	        p = p.prevZ;
	    }

	    return true;
	}

	// go through all polygon nodes and cure small local self-intersections
	function cureLocalIntersections(start, triangles, dim) {
	    var p = start;
	    do {
	        var a = p.prev,
	            b = p.next.next;

	        if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {

	            triangles.push(a.i / dim);
	            triangles.push(p.i / dim);
	            triangles.push(b.i / dim);

	            // remove two nodes involved
	            removeNode(p);
	            removeNode(p.next);

	            p = start = b;
	        }
	        p = p.next;
	    } while (p !== start);

	    return p;
	}

	// try splitting polygon into two and triangulate them independently
	function splitEarcut(start, triangles, dim, minX, minY, size) {
	    // look for a valid diagonal that divides the polygon into two
	    var a = start;
	    do {
	        var b = a.next.next;
	        while (b !== a.prev) {
	            if (a.i !== b.i && isValidDiagonal(a, b)) {
	                // split the polygon in two by the diagonal
	                var c = splitPolygon(a, b);

	                // filter colinear points around the cuts
	                a = filterPoints(a, a.next);
	                c = filterPoints(c, c.next);

	                // run earcut on each half
	                earcutLinked(a, triangles, dim, minX, minY, size);
	                earcutLinked(c, triangles, dim, minX, minY, size);
	                return;
	            }
	            b = b.next;
	        }
	        a = a.next;
	    } while (a !== start);
	}

	// link every hole into the outer loop, producing a single-ring polygon without holes
	function eliminateHoles(data, holeIndices, outerNode, dim) {
	    var queue = [],
	        i, len, start, end, list;

	    for (i = 0, len = holeIndices.length; i < len; i++) {
	        start = holeIndices[i] * dim;
	        end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
	        list = linkedList(data, start, end, dim, false);
	        if (list === list.next) list.steiner = true;
	        queue.push(getLeftmost(list));
	    }

	    queue.sort(compareX);

	    // process holes from left to right
	    for (i = 0; i < queue.length; i++) {
	        eliminateHole(queue[i], outerNode);
	        outerNode = filterPoints(outerNode, outerNode.next);
	    }

	    return outerNode;
	}

	function compareX(a, b) {
	    return a.x - b.x;
	}

	// find a bridge between vertices that connects hole with an outer ring and and link it
	function eliminateHole(hole, outerNode) {
	    outerNode = findHoleBridge(hole, outerNode);
	    if (outerNode) {
	        var b = splitPolygon(outerNode, hole);
	        filterPoints(b, b.next);
	    }
	}

	// David Eberly's algorithm for finding a bridge between hole and outer polygon
	function findHoleBridge(hole, outerNode) {
	    var p = outerNode,
	        hx = hole.x,
	        hy = hole.y,
	        qx = -Infinity,
	        m;

	    // find a segment intersected by a ray from the hole's leftmost point to the left;
	    // segment's endpoint with lesser x will be potential connection point
	    do {
	        if (hy <= p.y && hy >= p.next.y) {
	            var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
	            if (x <= hx && x > qx) {
	                qx = x;
	                if (x === hx) {
	                    if (hy === p.y) return p;
	                    if (hy === p.next.y) return p.next;
	                }
	                m = p.x < p.next.x ? p : p.next;
	            }
	        }
	        p = p.next;
	    } while (p !== outerNode);

	    if (!m) return null;

	    if (hx === qx) return m.prev; // hole touches outer segment; pick lower endpoint

	    // look for points inside the triangle of hole point, segment intersection and endpoint;
	    // if there are no points found, we have a valid connection;
	    // otherwise choose the point of the minimum angle with the ray as connection point

	    var stop = m,
	        mx = m.x,
	        my = m.y,
	        tanMin = Infinity,
	        tan;

	    p = m.next;

	    while (p !== stop) {
	        if (hx >= p.x && p.x >= mx &&
	                pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {

	            tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

	            if ((tan < tanMin || (tan === tanMin && p.x > m.x)) && locallyInside(p, hole)) {
	                m = p;
	                tanMin = tan;
	            }
	        }

	        p = p.next;
	    }

	    return m;
	}

	// interlink polygon nodes in z-order
	function indexCurve(start, minX, minY, size) {
	    var p = start;
	    do {
	        if (p.z === null) p.z = zOrder(p.x, p.y, minX, minY, size);
	        p.prevZ = p.prev;
	        p.nextZ = p.next;
	        p = p.next;
	    } while (p !== start);

	    p.prevZ.nextZ = null;
	    p.prevZ = null;

	    sortLinked(p);
	}

	// Simon Tatham's linked list merge sort algorithm
	// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
	function sortLinked(list) {
	    var i, p, q, e, tail, numMerges, pSize, qSize,
	        inSize = 1;

	    do {
	        p = list;
	        list = null;
	        tail = null;
	        numMerges = 0;

	        while (p) {
	            numMerges++;
	            q = p;
	            pSize = 0;
	            for (i = 0; i < inSize; i++) {
	                pSize++;
	                q = q.nextZ;
	                if (!q) break;
	            }

	            qSize = inSize;

	            while (pSize > 0 || (qSize > 0 && q)) {

	                if (pSize === 0) {
	                    e = q;
	                    q = q.nextZ;
	                    qSize--;
	                } else if (qSize === 0 || !q) {
	                    e = p;
	                    p = p.nextZ;
	                    pSize--;
	                } else if (p.z <= q.z) {
	                    e = p;
	                    p = p.nextZ;
	                    pSize--;
	                } else {
	                    e = q;
	                    q = q.nextZ;
	                    qSize--;
	                }

	                if (tail) tail.nextZ = e;
	                else list = e;

	                e.prevZ = tail;
	                tail = e;
	            }

	            p = q;
	        }

	        tail.nextZ = null;
	        inSize *= 2;

	    } while (numMerges > 1);

	    return list;
	}

	// z-order of a point given coords and size of the data bounding box
	function zOrder(x, y, minX, minY, size) {
	    // coords are transformed into non-negative 15-bit integer range
	    x = 32767 * (x - minX) / size;
	    y = 32767 * (y - minY) / size;

	    x = (x | (x << 8)) & 0x00FF00FF;
	    x = (x | (x << 4)) & 0x0F0F0F0F;
	    x = (x | (x << 2)) & 0x33333333;
	    x = (x | (x << 1)) & 0x55555555;

	    y = (y | (y << 8)) & 0x00FF00FF;
	    y = (y | (y << 4)) & 0x0F0F0F0F;
	    y = (y | (y << 2)) & 0x33333333;
	    y = (y | (y << 1)) & 0x55555555;

	    return x | (y << 1);
	}

	// find the leftmost node of a polygon ring
	function getLeftmost(start) {
	    var p = start,
	        leftmost = start;
	    do {
	        if (p.x < leftmost.x) leftmost = p;
	        p = p.next;
	    } while (p !== start);

	    return leftmost;
	}

	// check if a point lies within a convex triangle
	function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
	    return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
	           (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
	           (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
	}

	// check if a diagonal between two polygon nodes is valid (lies in polygon interior)
	function isValidDiagonal(a, b) {
	    return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) &&
	           locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b);
	}

	// signed area of a triangle
	function area(p, q, r) {
	    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
	}

	// check if two points are equal
	function equals(p1, p2) {
	    return p1.x === p2.x && p1.y === p2.y;
	}

	// check if two segments intersect
	function intersects(p1, q1, p2, q2) {
	    if ((equals(p1, q1) && equals(p2, q2)) ||
	        (equals(p1, q2) && equals(p2, q1))) return true;
	    return area(p1, q1, p2) > 0 !== area(p1, q1, q2) > 0 &&
	           area(p2, q2, p1) > 0 !== area(p2, q2, q1) > 0;
	}

	// check if a polygon diagonal intersects any polygon segments
	function intersectsPolygon(a, b) {
	    var p = a;
	    do {
	        if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
	                intersects(p, p.next, a, b)) return true;
	        p = p.next;
	    } while (p !== a);

	    return false;
	}

	// check if a polygon diagonal is locally inside the polygon
	function locallyInside(a, b) {
	    return area(a.prev, a, a.next) < 0 ?
	        area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 :
	        area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
	}

	// check if the middle point of a polygon diagonal is inside the polygon
	function middleInside(a, b) {
	    var p = a,
	        inside = false,
	        px = (a.x + b.x) / 2,
	        py = (a.y + b.y) / 2;
	    do {
	        if (((p.y > py) !== (p.next.y > py)) && (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x))
	            inside = !inside;
	        p = p.next;
	    } while (p !== a);

	    return inside;
	}

	// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
	// if one belongs to the outer ring and another to a hole, it merges it into a single ring
	function splitPolygon(a, b) {
	    var a2 = new Node(a.i, a.x, a.y),
	        b2 = new Node(b.i, b.x, b.y),
	        an = a.next,
	        bp = b.prev;

	    a.next = b;
	    b.prev = a;

	    a2.next = an;
	    an.prev = a2;

	    b2.next = a2;
	    a2.prev = b2;

	    bp.next = b2;
	    b2.prev = bp;

	    return b2;
	}

	// create a node and optionally link it with previous one (in a circular doubly linked list)
	function insertNode(i, x, y, last) {
	    var p = new Node(i, x, y);

	    if (!last) {
	        p.prev = p;
	        p.next = p;

	    } else {
	        p.next = last.next;
	        p.prev = last;
	        last.next.prev = p;
	        last.next = p;
	    }
	    return p;
	}

	function removeNode(p) {
	    p.next.prev = p.prev;
	    p.prev.next = p.next;

	    if (p.prevZ) p.prevZ.nextZ = p.nextZ;
	    if (p.nextZ) p.nextZ.prevZ = p.prevZ;
	}

	function Node(i, x, y) {
	    // vertice index in coordinates array
	    this.i = i;

	    // vertex coordinates
	    this.x = x;
	    this.y = y;

	    // previous and next vertice nodes in a polygon ring
	    this.prev = null;
	    this.next = null;

	    // z-order curve value
	    this.z = null;

	    // previous and next nodes in z-order
	    this.prevZ = null;
	    this.nextZ = null;

	    // indicates whether this is a steiner point
	    this.steiner = false;
	}

	// return a percentage difference between the polygon area and its triangulation area;
	// used to verify correctness of triangulation
	earcut.deviation = function (data, holeIndices, dim, triangles) {
	    var hasHoles = holeIndices && holeIndices.length;
	    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;

	    var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
	    if (hasHoles) {
	        for (var i = 0, len = holeIndices.length; i < len; i++) {
	            var start = holeIndices[i] * dim;
	            var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
	            polygonArea -= Math.abs(signedArea(data, start, end, dim));
	        }
	    }

	    var trianglesArea = 0;
	    for (i = 0; i < triangles.length; i += 3) {
	        var a = triangles[i] * dim;
	        var b = triangles[i + 1] * dim;
	        var c = triangles[i + 2] * dim;
	        trianglesArea += Math.abs(
	            (data[a] - data[c]) * (data[b + 1] - data[a + 1]) -
	            (data[a] - data[b]) * (data[c + 1] - data[a + 1]));
	    }

	    return polygonArea === 0 && trianglesArea === 0 ? 0 :
	        Math.abs((trianglesArea - polygonArea) / polygonArea);
	};

	function signedArea(data, start, end, dim) {
	    var sum = 0;
	    for (var i = start, j = end - dim; i < end; i += dim) {
	        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
	        j = i;
	    }
	    return sum;
	}

	// turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts
	earcut.flatten = function (data) {
	    var dim = data[0][0].length,
	        result = {vertices: [], holes: [], dimensions: dim},
	        holeIndex = 0;

	    for (var i = 0; i < data.length; i++) {
	        for (var j = 0; j < data[i].length; j++) {
	            for (var d = 0; d < dim; d++) result.vertices.push(data[i][j][d]);
	        }
	        if (i > 0) {
	            holeIndex += data[i - 1].length;
	            result.holes.push(holeIndex);
	        }
	    }
	    return result;
	};
	});

	var earcut$1 = (earcut && typeof earcut === 'object' && 'default' in earcut ? earcut['default'] : earcut);

	var index$2 = __commonjs(function (module) {
	'use strict';

	module.exports = partialSort;

	// Floyd-Rivest selection algorithm:
	// Rearrange items so that all items in the [left, k] range are smaller than all items in (k, right];
	// The k-th element will have the (k - left + 1)th smallest value in [left, right]

	function partialSort(arr, k, left, right, compare) {
	    left = left || 0;
	    right = right || (arr.length - 1);
	    compare = compare || defaultCompare;

	    while (right > left) {
	        if (right - left > 600) {
	            var n = right - left + 1;
	            var m = k - left + 1;
	            var z = Math.log(n);
	            var s = 0.5 * Math.exp(2 * z / 3);
	            var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
	            var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
	            var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
	            partialSort(arr, k, newLeft, newRight, compare);
	        }

	        var t = arr[k];
	        var i = left;
	        var j = right;

	        swap(arr, left, k);
	        if (compare(arr[right], t) > 0) swap(arr, left, right);

	        while (i < j) {
	            swap(arr, i, j);
	            i++;
	            j--;
	            while (compare(arr[i], t) < 0) i++;
	            while (compare(arr[j], t) > 0) j--;
	        }

	        if (compare(arr[left], t) === 0) swap(arr, left, j);
	        else {
	            j++;
	            swap(arr, j, right);
	        }

	        if (j <= k) left = j + 1;
	        if (k <= j) right = j - 1;
	    }
	}

	function swap(arr, i, j) {
	    var tmp = arr[i];
	    arr[i] = arr[j];
	    arr[j] = tmp;
	}

	function defaultCompare(a, b) {
	    return a < b ? -1 : a > b ? 1 : 0;
	}
	});

	var quickselect = (index$2 && typeof index$2 === 'object' && 'default' in index$2 ? index$2['default'] : index$2);

	// classifies an array of rings into polygons with outer rings and holes
	function classifyRings(rings, maxRings) {
	    var len = rings.length;

	    if (len <= 1) return [rings];

	    var polygons = [],
	        polygon,
	        ccw;

	    for (var i = 0; i < len; i++) {
	        var area = calculateSignedArea(rings[i]);
	        if (area === 0) continue;

	        rings[i].area = Math.abs(area);

	        if (ccw === undefined) ccw = area < 0;

	        if (ccw === area < 0) {
	            if (polygon) polygons.push(polygon);
	            polygon = [rings[i]];

	        } else {
	            polygon.push(rings[i]);
	        }
	    }
	    if (polygon) polygons.push(polygon);

	    // Earcut performance degrages with the # of rings in a polygon. For this
	    // reason, we limit strip out all but the `maxRings` largest rings.
	    if (maxRings > 1) {
	        for (var j = 0; j < polygons.length; j++) {
	            if (polygons[j].length <= maxRings) continue;
	            quickselect(polygons[j], maxRings, 1, polygon.length - 1, compareAreas);
	            polygons[j] = polygon.slice(0, maxRings);
	        }
	    }

	    return polygons;
	};

	function compareAreas(a, b) {
	    return b.area - a.area;
	}

	function calculateSignedArea(ring) {
	    var sum = 0;
	    for (var i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
	        p1 = ring[i];
	        p2 = ring[j];
	        sum += (p2.x - p1.x) * (p1.y + p2.y);
	    }
	    return sum;
	}

	var EARCUT_MAX_RINGS = 500;

	function FillBucket() {
	    Bucket.apply(this, arguments);
	}

	FillBucket.prototype = inherit(Bucket, {});

	FillBucket.prototype.programInterfaces = {
	    fill: {
	        vertexBuffer: true,
	        elementBuffer: true,
	        elementBufferComponents: 1,
	        elementBuffer2: true,
	        elementBuffer2Components: 2,

	        layoutAttributes: [{
	            name: 'a_pos',
	            components: 2,
	            type: 'Int16'
	        }],
	        paintAttributes: [{
	            name: 'a_color',
	            components: 4,
	            type: 'Uint8',
	            getValue: function(layer, globalProperties, featureProperties) {
	                return premultiply(layer.getPaintValue("fill-color", globalProperties, featureProperties));
	            },
	            multiplier: 255,
	            paintProperty: 'fill-color'
	        }, {
	            name: 'a_outline_color',
	            components: 4,
	            type: 'Uint8',
	            getValue: function(layer, globalProperties, featureProperties) {
	                return premultiply(layer.getPaintValue("fill-outline-color", globalProperties, featureProperties));
	            },
	            multiplier: 255,
	            paintProperty: 'fill-outline-color'
	        }]
	    }
	};

	FillBucket.prototype.addFeature = function(feature) {
	    var lines = loadGeometry(feature);
	    var polygons = classifyRings(lines, EARCUT_MAX_RINGS);

	    var startGroup = this.makeRoomFor('fill', 0);
	    var startIndex = startGroup.layout.vertex.length;

	    for (var i = 0; i < polygons.length; i++) {
	        this.addPolygon(polygons[i]);
	    }

	    this.populatePaintArrays('fill', {zoom: this.zoom}, feature.properties, startGroup, startIndex);
	};

	FillBucket.prototype.addPolygon = function(polygon) {
	    var numVertices = 0;
	    for (var k = 0; k < polygon.length; k++) {
	        numVertices += polygon[k].length;
	    }

	    var group = this.makeRoomFor('fill', numVertices);
	    var flattened = [];
	    var holeIndices = [];
	    var startIndex = group.layout.vertex.length;

	    for (var r = 0; r < polygon.length; r++) {
	        var ring = polygon[r];

	        if (r > 0) holeIndices.push(flattened.length / 2);

	        for (var v = 0; v < ring.length; v++) {
	            var vertex = ring[v];

	            var index = group.layout.vertex.emplaceBack(vertex.x, vertex.y);

	            if (v >= 1) {
	                group.layout.element2.emplaceBack(index - 1, index);
	            }

	            // convert to format used by earcut
	            flattened.push(vertex.x);
	            flattened.push(vertex.y);
	        }
	    }

	    var triangleIndices = earcut$1(flattened, holeIndices);

	    for (var i = 0; i < triangleIndices.length; i++) {
	        group.layout.element.emplaceBack(triangleIndices[i] + startIndex);
	    }
	};

	var EXTENT$2 = Bucket.EXTENT;

	// NOTE ON EXTRUDE SCALE:
	// scale the extrusion vector so that the normal length is this value.
	// contains the "texture" normals (-1..1). this is distinct from the extrude
	// normals for line joins, because the x-value remains 0 for the texture
	// normal array, while the extrude normal actually moves the vertex to create
	// the acute/bevelled line join.
	var EXTRUDE_SCALE = 63;

	/*
	 * Sharp corners cause dashed lines to tilt because the distance along the line
	 * is the same at both the inner and outer corners. To improve the appearance of
	 * dashed lines we add extra points near sharp corners so that a smaller part
	 * of the line is tilted.
	 *
	 * COS_HALF_SHARP_CORNER controls how sharp a corner has to be for us to add an
	 * extra vertex. The default is 75 degrees.
	 *
	 * The newly created vertices are placed SHARP_CORNER_OFFSET pixels from the corner.
	 */
	var COS_HALF_SHARP_CORNER = Math.cos(75 / 2 * (Math.PI / 180));
	var SHARP_CORNER_OFFSET = 15;

	// The number of bits that is used to store the line distance in the buffer.
	var LINE_DISTANCE_BUFFER_BITS = 14;

	// We don't have enough bits for the line distance as we'd like to have, so
	// use this value to scale the line distance (in tile units) down to a smaller
	// value. This lets us store longer distances while sacrificing precision.
	var LINE_DISTANCE_SCALE = 1 / 2;

	// The maximum line distance, in tile units, that fits in the buffer.
	var MAX_LINE_DISTANCE = Math.pow(2, LINE_DISTANCE_BUFFER_BITS) / LINE_DISTANCE_SCALE;


	/**
	 * @private
	 */
	function LineBucket() {
	    Bucket.apply(this, arguments);
	}

	LineBucket.prototype = inherit(Bucket, {});

	LineBucket.prototype.addLineVertex = function(vertexBuffer, point, extrude, tx, ty, dir, linesofar) {
	    return vertexBuffer.emplaceBack(
	            // a_pos
	            (point.x << 1) | tx,
	            (point.y << 1) | ty,
	            // a_data
	            // add 128 to store an byte in an unsigned byte
	            Math.round(EXTRUDE_SCALE * extrude.x) + 128,
	            Math.round(EXTRUDE_SCALE * extrude.y) + 128,
	            // Encode the -1/0/1 direction value into the first two bits of .z of a_data.
	            // Combine it with the lower 6 bits of `linesofar` (shifted by 2 bites to make
	            // room for the direction value). The upper 8 bits of `linesofar` are placed in
	            // the `w` component. `linesofar` is scaled down by `LINE_DISTANCE_SCALE` so that
	            // we can store longer distances while sacrificing precision.
	            ((dir === 0 ? 0 : (dir < 0 ? -1 : 1)) + 1) | (((linesofar * LINE_DISTANCE_SCALE) & 0x3F) << 2),
	            (linesofar * LINE_DISTANCE_SCALE) >> 6);
	};

	LineBucket.prototype.programInterfaces = {
	    line: {
	        vertexBuffer: true,
	        elementBuffer: true,

	        layoutAttributes: [{
	            name: 'a_pos',
	            components: 2,
	            type: 'Int16'
	        }, {
	            name: 'a_data',
	            components: 4,
	            type: 'Uint8'
	        }]
	    }
	};

	LineBucket.prototype.addFeature = function(feature) {
	    var lines = loadGeometry(feature);
	    for (var i = 0; i < lines.length; i++) {
	        this.addLine(
	            lines[i],
	            this.layer.layout['line-join'],
	            this.layer.layout['line-cap'],
	            this.layer.layout['line-miter-limit'],
	            this.layer.layout['line-round-limit']
	        );
	    }
	};

	LineBucket.prototype.addLine = function(vertices, join, cap, miterLimit, roundLimit) {

	    var len = vertices.length;
	    // If the line has duplicate vertices at the end, adjust length to remove them.
	    while (len > 2 && vertices[len - 1].equals(vertices[len - 2])) {
	        len--;
	    }

	    // a line must have at least two vertices
	    if (vertices.length < 2) return;

	    if (join === 'bevel') miterLimit = 1.05;

	    var sharpCornerOffset = SHARP_CORNER_OFFSET * (EXTENT$2 / (512 * this.overscaling));

	    var firstVertex = vertices[0],
	        lastVertex = vertices[len - 1],
	        closed = firstVertex.equals(lastVertex);

	    // we could be more precise, but it would only save a negligible amount of space
	    this.makeRoomFor('line', len * 10);

	    // a line may not have coincident points
	    if (len === 2 && closed) return;

	    this.distance = 0;

	    var beginCap = cap,
	        endCap = closed ? 'butt' : cap,
	        startOfLine = true,
	        currentVertex, prevVertex, nextVertex, prevNormal, nextNormal, offsetA, offsetB;

	    // the last three vertices added
	    this.e1 = this.e2 = this.e3 = -1;

	    if (closed) {
	        currentVertex = vertices[len - 2];
	        nextNormal = firstVertex.sub(currentVertex)._unit()._perp();
	    }

	    for (var i = 0; i < len; i++) {

	        nextVertex = closed && i === len - 1 ?
	            vertices[1] : // if the line is closed, we treat the last vertex like the first
	            vertices[i + 1]; // just the next vertex

	        // if two consecutive vertices exist, skip the current one
	        if (nextVertex && vertices[i].equals(nextVertex)) continue;

	        if (nextNormal) prevNormal = nextNormal;
	        if (currentVertex) prevVertex = currentVertex;

	        currentVertex = vertices[i];

	        // Calculate the normal towards the next vertex in this line. In case
	        // there is no next vertex, pretend that the line is continuing straight,
	        // meaning that we are just using the previous normal.
	        nextNormal = nextVertex ? nextVertex.sub(currentVertex)._unit()._perp() : prevNormal;

	        // If we still don't have a previous normal, this is the beginning of a
	        // non-closed line, so we're doing a straight "join".
	        prevNormal = prevNormal || nextNormal;

	        // Determine the normal of the join extrusion. It is the angle bisector
	        // of the segments between the previous line and the next line.
	        var joinNormal = prevNormal.add(nextNormal)._unit();

	        /*  joinNormal     prevNormal
	         *             ↖      ↑
	         *                .________. prevVertex
	         *                |
	         * nextNormal  ←  |  currentVertex
	         *                |
	         *     nextVertex !
	         *
	         */

	        // Calculate the length of the miter (the ratio of the miter to the width).
	        // Find the cosine of the angle between the next and join normals
	        // using dot product. The inverse of that is the miter length.
	        var cosHalfAngle = joinNormal.x * nextNormal.x + joinNormal.y * nextNormal.y;
	        var miterLength = 1 / cosHalfAngle;

	        var isSharpCorner = cosHalfAngle < COS_HALF_SHARP_CORNER && prevVertex && nextVertex;

	        if (isSharpCorner && i > 0) {
	            var prevSegmentLength = currentVertex.dist(prevVertex);
	            if (prevSegmentLength > 2 * sharpCornerOffset) {
	                var newPrevVertex = currentVertex.sub(currentVertex.sub(prevVertex)._mult(sharpCornerOffset / prevSegmentLength)._round());
	                this.distance += newPrevVertex.dist(prevVertex);
	                this.addCurrentVertex(newPrevVertex, this.distance, prevNormal.mult(1), 0, 0, false);
	                prevVertex = newPrevVertex;
	            }
	        }

	        // The join if a middle vertex, otherwise the cap.
	        var middleVertex = prevVertex && nextVertex;
	        var currentJoin = middleVertex ? join : nextVertex ? beginCap : endCap;

	        if (middleVertex && currentJoin === 'round') {
	            if (miterLength < roundLimit) {
	                currentJoin = 'miter';
	            } else if (miterLength <= 2) {
	                currentJoin = 'fakeround';
	            }
	        }

	        if (currentJoin === 'miter' && miterLength > miterLimit) {
	            currentJoin = 'bevel';
	        }

	        if (currentJoin === 'bevel') {
	            // The maximum extrude length is 128 / 63 = 2 times the width of the line
	            // so if miterLength >= 2 we need to draw a different type of bevel where.
	            if (miterLength > 2) currentJoin = 'flipbevel';

	            // If the miterLength is really small and the line bevel wouldn't be visible,
	            // just draw a miter join to save a triangle.
	            if (miterLength < miterLimit) currentJoin = 'miter';
	        }

	        // Calculate how far along the line the currentVertex is
	        if (prevVertex) this.distance += currentVertex.dist(prevVertex);

	        if (currentJoin === 'miter') {

	            joinNormal._mult(miterLength);
	            this.addCurrentVertex(currentVertex, this.distance, joinNormal, 0, 0, false);

	        } else if (currentJoin === 'flipbevel') {
	            // miter is too big, flip the direction to make a beveled join

	            if (miterLength > 100) {
	                // Almost parallel lines
	                joinNormal = nextNormal.clone();

	            } else {
	                var direction = prevNormal.x * nextNormal.y - prevNormal.y * nextNormal.x > 0 ? -1 : 1;
	                var bevelLength = miterLength * prevNormal.add(nextNormal).mag() / prevNormal.sub(nextNormal).mag();
	                joinNormal._perp()._mult(bevelLength * direction);
	            }
	            this.addCurrentVertex(currentVertex, this.distance, joinNormal, 0, 0, false);
	            this.addCurrentVertex(currentVertex, this.distance, joinNormal.mult(-1), 0, 0, false);

	        } else if (currentJoin === 'bevel' || currentJoin === 'fakeround') {
	            var lineTurnsLeft = (prevNormal.x * nextNormal.y - prevNormal.y * nextNormal.x) > 0;
	            var offset = -Math.sqrt(miterLength * miterLength - 1);
	            if (lineTurnsLeft) {
	                offsetB = 0;
	                offsetA = offset;
	            } else {
	                offsetA = 0;
	                offsetB = offset;
	            }

	            // Close previous segment with a bevel
	            if (!startOfLine) {
	                this.addCurrentVertex(currentVertex, this.distance, prevNormal, offsetA, offsetB, false);
	            }

	            if (currentJoin === 'fakeround') {
	                // The join angle is sharp enough that a round join would be visible.
	                // Bevel joins fill the gap between segments with a single pie slice triangle.
	                // Create a round join by adding multiple pie slices. The join isn't actually round, but
	                // it looks like it is at the sizes we render lines at.

	                // Add more triangles for sharper angles.
	                // This math is just a good enough approximation. It isn't "correct".
	                var n = Math.floor((0.5 - (cosHalfAngle - 0.5)) * 8);
	                var approxFractionalJoinNormal;

	                for (var m = 0; m < n; m++) {
	                    approxFractionalJoinNormal = nextNormal.mult((m + 1) / (n + 1))._add(prevNormal)._unit();
	                    this.addPieSliceVertex(currentVertex, this.distance, approxFractionalJoinNormal, lineTurnsLeft);
	                }

	                this.addPieSliceVertex(currentVertex, this.distance, joinNormal, lineTurnsLeft);

	                for (var k = n - 1; k >= 0; k--) {
	                    approxFractionalJoinNormal = prevNormal.mult((k + 1) / (n + 1))._add(nextNormal)._unit();
	                    this.addPieSliceVertex(currentVertex, this.distance, approxFractionalJoinNormal, lineTurnsLeft);
	                }
	            }

	            // Start next segment
	            if (nextVertex) {
	                this.addCurrentVertex(currentVertex, this.distance, nextNormal, -offsetA, -offsetB, false);
	            }

	        } else if (currentJoin === 'butt') {
	            if (!startOfLine) {
	                // Close previous segment with a butt
	                this.addCurrentVertex(currentVertex, this.distance, prevNormal, 0, 0, false);
	            }

	            // Start next segment with a butt
	            if (nextVertex) {
	                this.addCurrentVertex(currentVertex, this.distance, nextNormal, 0, 0, false);
	            }

	        } else if (currentJoin === 'square') {

	            if (!startOfLine) {
	                // Close previous segment with a square cap
	                this.addCurrentVertex(currentVertex, this.distance, prevNormal, 1, 1, false);

	                // The segment is done. Unset vertices to disconnect segments.
	                this.e1 = this.e2 = -1;
	            }

	            // Start next segment
	            if (nextVertex) {
	                this.addCurrentVertex(currentVertex, this.distance, nextNormal, -1, -1, false);
	            }

	        } else if (currentJoin === 'round') {

	            if (!startOfLine) {
	                // Close previous segment with butt
	                this.addCurrentVertex(currentVertex, this.distance, prevNormal, 0, 0, false);

	                // Add round cap or linejoin at end of segment
	                this.addCurrentVertex(currentVertex, this.distance, prevNormal, 1, 1, true);

	                // The segment is done. Unset vertices to disconnect segments.
	                this.e1 = this.e2 = -1;
	            }


	            // Start next segment with a butt
	            if (nextVertex) {
	                // Add round cap before first segment
	                this.addCurrentVertex(currentVertex, this.distance, nextNormal, -1, -1, true);

	                this.addCurrentVertex(currentVertex, this.distance, nextNormal, 0, 0, false);
	            }
	        }

	        if (isSharpCorner && i < len - 1) {
	            var nextSegmentLength = currentVertex.dist(nextVertex);
	            if (nextSegmentLength > 2 * sharpCornerOffset) {
	                var newCurrentVertex = currentVertex.add(nextVertex.sub(currentVertex)._mult(sharpCornerOffset / nextSegmentLength)._round());
	                this.distance += newCurrentVertex.dist(currentVertex);
	                this.addCurrentVertex(newCurrentVertex, this.distance, nextNormal.mult(1), 0, 0, false);
	                currentVertex = newCurrentVertex;
	            }
	        }

	        startOfLine = false;
	    }

	};

	/**
	 * Add two vertices to the buffers.
	 *
	 * @param {Object} currentVertex the line vertex to add buffer vertices for
	 * @param {number} distance the distance from the beginning of the line to the vertex
	 * @param {number} endLeft extrude to shift the left vertex along the line
	 * @param {number} endRight extrude to shift the left vertex along the line
	 * @param {boolean} round whether this is a round cap
	 * @private
	 */
	LineBucket.prototype.addCurrentVertex = function(currentVertex, distance, normal, endLeft, endRight, round) {
	    var tx = round ? 1 : 0;
	    var extrude;
	    var layoutArrays = this.arrayGroups.line[this.arrayGroups.line.length - 1].layout;
	    var vertexArray = layoutArrays.vertex;
	    var elementArray = layoutArrays.element;

	    extrude = normal.clone();
	    if (endLeft) extrude._sub(normal.perp()._mult(endLeft));
	    this.e3 = this.addLineVertex(vertexArray, currentVertex, extrude, tx, 0, endLeft, distance);
	    if (this.e1 >= 0 && this.e2 >= 0) {
	        elementArray.emplaceBack(this.e1, this.e2, this.e3);
	    }
	    this.e1 = this.e2;
	    this.e2 = this.e3;

	    extrude = normal.mult(-1);
	    if (endRight) extrude._sub(normal.perp()._mult(endRight));
	    this.e3 = this.addLineVertex(vertexArray, currentVertex, extrude, tx, 1, -endRight, distance);
	    if (this.e1 >= 0 && this.e2 >= 0) {
	        elementArray.emplaceBack(this.e1, this.e2, this.e3);
	    }
	    this.e1 = this.e2;
	    this.e2 = this.e3;

	    // There is a maximum "distance along the line" that we can store in the buffers.
	    // When we get close to the distance, reset it to zero and add the vertex again with
	    // a distance of zero. The max distance is determined by the number of bits we allocate
	    // to `linesofar`.
	    if (distance > MAX_LINE_DISTANCE / 2) {
	        this.distance = 0;
	        this.addCurrentVertex(currentVertex, this.distance, normal, endLeft, endRight, round);
	    }
	};

	/**
	 * Add a single new vertex and a triangle using two previous vertices.
	 * This adds a pie slice triangle near a join to simulate round joins
	 *
	 * @param {Object} currentVertex the line vertex to add buffer vertices for
	 * @param {number} distance the distance from the beggining of the line to the vertex
	 * @param {Object} extrude the offset of the new vertex from the currentVertex
	 * @param {boolean} whether the line is turning left or right at this angle
	 * @private
	 */
	LineBucket.prototype.addPieSliceVertex = function(currentVertex, distance, extrude, lineTurnsLeft) {
	    var ty = lineTurnsLeft ? 1 : 0;
	    extrude = extrude.mult(lineTurnsLeft ? -1 : 1);
	    var layoutArrays = this.arrayGroups.line[this.arrayGroups.line.length - 1].layout;
	    var vertexArray = layoutArrays.vertex;
	    var elementArray = layoutArrays.element;

	    this.e3 = this.addLineVertex(vertexArray, currentVertex, extrude, 0, ty, 0, distance);

	    if (this.e1 >= 0 && this.e2 >= 0) {
	        elementArray.emplaceBack(this.e1, this.e2, this.e3);
	    }

	    if (lineTurnsLeft) {
	        this.e2 = this.e3;
	    } else {
	        this.e1 = this.e3;
	    }
	};

	var EXTENT$3 = Bucket.EXTENT;

	/**
	 * Circles are represented by two triangles.
	 *
	 * Each corner has a pos that is the center of the circle and an extrusion
	 * vector that is where it points.
	 * @private
	 */
	function CircleBucket() {
	    Bucket.apply(this, arguments);
	}

	CircleBucket.prototype = inherit(Bucket, {});

	CircleBucket.prototype.addCircleVertex = function(vertexArray, x, y, extrudeX, extrudeY) {
	    return vertexArray.emplaceBack(
	            (x * 2) + ((extrudeX + 1) / 2),
	            (y * 2) + ((extrudeY + 1) / 2));
	};

	CircleBucket.prototype.programInterfaces = {
	    circle: {
	        vertexBuffer: true,
	        elementBuffer: true,

	        layoutAttributes: [{
	            name: 'a_pos',
	            components: 2,
	            type: 'Int16'
	        }],
	        paintAttributes: [{
	            name: 'a_color',
	            components: 4,
	            type: 'Uint8',
	            getValue: function(layer, globalProperties, featureProperties) {
	                return premultiply(layer.getPaintValue("circle-color", globalProperties, featureProperties));
	            },
	            multiplier: 255,
	            paintProperty: 'circle-color'
	        }, {
	            name: 'a_radius',
	            components: 1,
	            type: 'Uint16',
	            isLayerConstant: false,
	            getValue: function(layer, globalProperties, featureProperties) {
	                return [layer.getPaintValue("circle-radius", globalProperties, featureProperties)];
	            },
	            multiplier: 10,
	            paintProperty: 'circle-radius'
	        }]
	    }
	};

	CircleBucket.prototype.addFeature = function(feature) {
	    var globalProperties = {zoom: this.zoom};
	    var geometries = loadGeometry(feature);

	    var startGroup = this.makeRoomFor('circle', 0);
	    var startIndex = startGroup.layout.vertex.length;

	    for (var j = 0; j < geometries.length; j++) {
	        for (var k = 0; k < geometries[j].length; k++) {

	            var x = geometries[j][k].x;
	            var y = geometries[j][k].y;

	            // Do not include points that are outside the tile boundaries.
	            if (x < 0 || x >= EXTENT$3 || y < 0 || y >= EXTENT$3) continue;

	            // this geometry will be of the Point type, and we'll derive
	            // two triangles from it.
	            //
	            // ┌─────────┐
	            // │ 3     2 │
	            // │         │
	            // │ 0     1 │
	            // └─────────┘

	            var group = this.makeRoomFor('circle', 4);
	            var vertexArray = group.layout.vertex;

	            var index = this.addCircleVertex(vertexArray, x, y, -1, -1);
	            this.addCircleVertex(vertexArray, x, y, 1, -1);
	            this.addCircleVertex(vertexArray, x, y, 1, 1);
	            this.addCircleVertex(vertexArray, x, y, -1, 1);

	            group.layout.element.emplaceBack(index, index + 1, index + 2);
	            group.layout.element.emplaceBack(index, index + 3, index + 2);
	        }
	    }

	    this.populatePaintArrays('circle', globalProperties, feature.properties, startGroup, startIndex);
	};

	function Anchor(x, y, angle, segment) {
	    this.x = x;
	    this.y = y;
	    this.angle = angle;

	    if (segment !== undefined) {
	        this.segment = segment;
	    }
	}

	Anchor.prototype = Object.create(require$$1.prototype);

	Anchor.prototype.clone = function() {
	    return new Anchor(this.x, this.y, this.angle, this.segment);
	};

	function interpolate(a, b, t) {
	    return (a * (1 - t)) + (b * t);
	}

	interpolate.number = interpolate;

	interpolate.vec2 = function(from, to, t) {
	    return [
	        interpolate(from[0], to[0], t),
	        interpolate(from[1], to[1], t)
	    ];
	};

	/*
	 * Interpolate between two colors given as 4-element arrays.
	 *
	 * @param {Color} from
	 * @param {Color} to
	 * @param {number} t interpolation factor between 0 and 1
	 * @returns {Color} interpolated color
	 */
	interpolate.color = function(from, to, t) {
	    return [
	        interpolate(from[0], to[0], t),
	        interpolate(from[1], to[1], t),
	        interpolate(from[2], to[2], t),
	        interpolate(from[3], to[3], t)
	    ];
	};

	interpolate.array = function(from, to, t) {
	    return from.map(function(d, i) {
	        return interpolate(d, to[i], t);
	    });
	};

	/**
	 * Labels placed around really sharp angles aren't readable. Check if any
	 * part of the potential label has a combined angle that is too big.
	 *
	 * @param {Array<Point>} line
	 * @param {Anchor} anchor The point on the line around which the label is anchored.
	 * @param {number} labelLength The length of the label in geometry units.
	 * @param {number} windowSize The check fails if the combined angles within a part of the line that is `windowSize` long is too big.
	 * @param {number} maxAngle The maximum combined angle that any window along the label is allowed to have.
	 *
	 * @returns {boolean} whether the label should be placed
	 * @private
	 */
	function checkMaxAngle(line, anchor, labelLength, windowSize, maxAngle) {

	    // horizontal labels always pass
	    if (anchor.segment === undefined) return true;

	    var p = anchor;
	    var index = anchor.segment + 1;
	    var anchorDistance = 0;

	    // move backwards along the line to the first segment the label appears on
	    while (anchorDistance > -labelLength / 2) {
	        index--;

	        // there isn't enough room for the label after the beginning of the line
	        if (index < 0) return false;

	        anchorDistance -= line[index].dist(p);
	        p = line[index];
	    }

	    anchorDistance += line[index].dist(line[index + 1]);
	    index++;

	    // store recent corners and their total angle difference
	    var recentCorners = [];
	    var recentAngleDelta = 0;

	    // move forwards by the length of the label and check angles along the way
	    while (anchorDistance < labelLength / 2) {
	        var prev = line[index - 1];
	        var current = line[index];
	        var next = line[index + 1];

	        // there isn't enough room for the label before the end of the line
	        if (!next) return false;

	        var angleDelta = prev.angleTo(current) - current.angleTo(next);
	        // restrict angle to -pi..pi range
	        angleDelta = Math.abs(((angleDelta + 3 * Math.PI) % (Math.PI * 2)) - Math.PI);

	        recentCorners.push({
	            distance: anchorDistance,
	            angleDelta: angleDelta
	        });
	        recentAngleDelta += angleDelta;

	        // remove corners that are far enough away from the list of recent anchors
	        while (anchorDistance - recentCorners[0].distance > windowSize) {
	            recentAngleDelta -= recentCorners.shift().angleDelta;
	        }

	        // the sum of angles within the window area exceeds the maximum allowed value. check fails.
	        if (recentAngleDelta > maxAngle) return false;

	        index++;
	        anchorDistance += current.dist(next);
	    }

	    // no part of the line had an angle greater than the maximum allowed. check passes.
	    return true;
	}

	function getAnchors(line, spacing, maxAngle, shapedText, shapedIcon, glyphSize, boxScale, overscaling, tileExtent) {

	    // Resample a line to get anchor points for labels and check that each
	    // potential label passes text-max-angle check and has enough froom to fit
	    // on the line.

	    var angleWindowSize = shapedText ?
	        3 / 5 * glyphSize * boxScale :
	        0;

	    var labelLength = Math.max(
	        shapedText ? shapedText.right - shapedText.left : 0,
	        shapedIcon ? shapedIcon.right - shapedIcon.left : 0);

	    // Is the line continued from outside the tile boundary?
	    var isLineContinued = line[0].x === 0 || line[0].x === tileExtent || line[0].y === 0 || line[0].y === tileExtent;

	    // Is the label long, relative to the spacing?
	    // If so, adjust the spacing so there is always a minimum space of `spacing / 4` between label edges.
	    if (spacing - labelLength * boxScale  < spacing / 4) {
	        spacing = labelLength * boxScale + spacing / 4;
	    }

	    // Offset the first anchor by:
	    // Either half the label length plus a fixed extra offset if the line is not continued
	    // Or half the spacing if the line is continued.

	    // For non-continued lines, add a bit of fixed extra offset to avoid collisions at T intersections.
	    var fixedExtraOffset = glyphSize * 2;

	    var offset = !isLineContinued ?
	        ((labelLength / 2 + fixedExtraOffset) * boxScale * overscaling) % spacing :
	        (spacing / 2 * overscaling) % spacing;

	    return resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength * boxScale, isLineContinued, false, tileExtent);
	}


	function resample(line, offset, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, placeAtMiddle, tileExtent) {

	    var halfLabelLength = labelLength / 2;
	    var lineLength = 0;
	    for (var k = 0; k < line.length - 1; k++) {
	        lineLength += line[k].dist(line[k + 1]);
	    }

	    var distance = 0,
	        markedDistance = offset - spacing;

	    var anchors = [];

	    for (var i = 0; i < line.length - 1; i++) {

	        var a = line[i],
	            b = line[i + 1];

	        var segmentDist = a.dist(b),
	            angle = b.angleTo(a);

	        while (markedDistance + spacing < distance + segmentDist) {
	            markedDistance += spacing;

	            var t = (markedDistance - distance) / segmentDist,
	                x = interpolate(a.x, b.x, t),
	                y = interpolate(a.y, b.y, t);

	            // Check that the point is within the tile boundaries and that
	            // the label would fit before the beginning and end of the line
	            // if placed at this point.
	            if (x >= 0 && x < tileExtent && y >= 0 && y < tileExtent &&
	                    markedDistance - halfLabelLength >= 0 &&
	                    markedDistance + halfLabelLength <= lineLength) {
	                var anchor = new Anchor(x, y, angle, i)._round();

	                if (!angleWindowSize || checkMaxAngle(line, anchor, labelLength, angleWindowSize, maxAngle)) {
	                    anchors.push(anchor);
	                }
	            }
	        }

	        distance += segmentDist;
	    }

	    if (!placeAtMiddle && !anchors.length && !isLineContinued) {
	        // The first attempt at finding anchors at which labels can be placed failed.
	        // Try again, but this time just try placing one anchor at the middle of the line.
	        // This has the most effect for short lines in overscaled tiles, since the
	        // initial offset used in overscaled tiles is calculated to align labels with positions in
	        // parent tiles instead of placing the label as close to the beginning as possible.
	        anchors = resample(line, distance / 2, spacing, angleWindowSize, maxAngle, labelLength, isLineContinued, true, tileExtent);
	    }

	    return anchors;
	}

	/**
	 * Replace tokens in a string template with values in an object
	 *
	 * @param {Object} properties a key/value relationship between tokens and replacements
	 * @param {string} text the template string
	 * @returns {string} the template with tokens replaced
	 * @private
	 */
	function resolveTokens(properties, text) {
	    return text.replace(/{([^{}]+)}/g, function(match, key) {
	        return key in properties ? properties[key] : '';
	    });
	}

	var Quads = {
	    getIconQuads: getIconQuads$1,
	    getGlyphQuads: getGlyphQuads$1
	};

	var minScale = 0.5; // underscale by 1 zoom level

	/**
	 * A textured quad for rendering a single icon or glyph.
	 *
	 * The zoom range the glyph can be shown is defined by minScale and maxScale.
	 *
	 * @param {Point} anchorPoint the point the symbol is anchored around
	 * @param {Point} tl The offset of the top left corner from the anchor.
	 * @param {Point} tr The offset of the top right corner from the anchor.
	 * @param {Point} bl The offset of the bottom left corner from the anchor.
	 * @param {Point} br The offset of the bottom right corner from the anchor.
	 * @param {Object} tex The texture coordinates.
	 * @param {number} angle The angle of the label at it's center, not the angle of this quad.
	 * @param {number} minScale The minimum scale, relative to the tile's intended scale, that the glyph can be shown at.
	 * @param {number} maxScale The maximum scale, relative to the tile's intended scale, that the glyph can be shown at.
	 *
	 * @class SymbolQuad
	 * @private
	 */
	function SymbolQuad(anchorPoint, tl, tr, bl, br, tex, angle, minScale, maxScale) {
	    this.anchorPoint = anchorPoint;
	    this.tl = tl;
	    this.tr = tr;
	    this.bl = bl;
	    this.br = br;
	    this.tex = tex;
	    this.angle = angle;
	    this.minScale = minScale;
	    this.maxScale = maxScale;
	}

	/**
	 * Create the quads used for rendering an icon.
	 *
	 * @param {Anchor} anchor
	 * @param {PositionedIcon} shapedIcon
	 * @param {number} boxScale A magic number for converting glyph metric units to geometry units.
	 * @param {Array<Array<Point>>} line
	 * @param {LayoutProperties} layout
	 * @param {boolean} alongLine Whether the icon should be placed along the line.
	 * @returns {Array<SymbolQuad>}
	 * @private
	 */
	function getIconQuads$1(anchor, shapedIcon, boxScale, line, layout, alongLine) {

	    var rect = shapedIcon.image.rect;

	    var border = 1;
	    var left = shapedIcon.left - border;
	    var right = left + rect.w / shapedIcon.image.pixelRatio;
	    var top = shapedIcon.top - border;
	    var bottom = top + rect.h / shapedIcon.image.pixelRatio;
	    var tl = new require$$1(left, top);
	    var tr = new require$$1(right, top);
	    var br = new require$$1(right, bottom);
	    var bl = new require$$1(left, bottom);

	    var angle = layout['icon-rotate'] * Math.PI / 180;
	    if (alongLine) {
	        var prev = line[anchor.segment];
	        if (anchor.y === prev.y && anchor.x === prev.x && anchor.segment + 1 < line.length) {
	            var next = line[anchor.segment + 1];
	            angle += Math.atan2(anchor.y - next.y, anchor.x - next.x) + Math.PI;
	        } else {
	            angle += Math.atan2(anchor.y - prev.y, anchor.x - prev.x);
	        }
	    }

	    if (angle) {
	        var sin = Math.sin(angle),
	            cos = Math.cos(angle),
	            matrix = [cos, -sin, sin, cos];

	        tl = tl.matMult(matrix);
	        tr = tr.matMult(matrix);
	        bl = bl.matMult(matrix);
	        br = br.matMult(matrix);
	    }

	    return [new SymbolQuad(new require$$1(anchor.x, anchor.y), tl, tr, bl, br, shapedIcon.image.rect, 0, minScale, Infinity)];
	}

	/**
	 * Create the quads used for rendering a text label.
	 *
	 * @param {Anchor} anchor
	 * @param {Shaping} shaping
	 * @param {number} boxScale A magic number for converting from glyph metric units to geometry units.
	 * @param {Array<Array<Point>>} line
	 * @param {LayoutProperties} layout
	 * @param {boolean} alongLine Whether the label should be placed along the line.
	 * @returns {Array<SymbolQuad>}
	 * @private
	 */
	function getGlyphQuads$1(anchor, shaping, boxScale, line, layout, alongLine) {

	    var textRotate = layout['text-rotate'] * Math.PI / 180;
	    var keepUpright = layout['text-keep-upright'];

	    var positionedGlyphs = shaping.positionedGlyphs;
	    var quads = [];

	    for (var k = 0; k < positionedGlyphs.length; k++) {
	        var positionedGlyph = positionedGlyphs[k];
	        var glyph = positionedGlyph.glyph;
	        var rect = glyph.rect;

	        if (!rect) continue;

	        var centerX = (positionedGlyph.x + glyph.advance / 2) * boxScale;

	        var glyphInstances;
	        var labelMinScale = minScale;
	        if (alongLine) {
	            glyphInstances = [];
	            labelMinScale = getSegmentGlyphs(glyphInstances, anchor, centerX, line, anchor.segment, true);
	            if (keepUpright) {
	                labelMinScale = Math.min(labelMinScale, getSegmentGlyphs(glyphInstances, anchor, centerX, line, anchor.segment, false));
	            }

	        } else {
	            glyphInstances = [{
	                anchorPoint: new require$$1(anchor.x, anchor.y),
	                offset: 0,
	                angle: 0,
	                maxScale: Infinity,
	                minScale: minScale
	            }];
	        }

	        var x1 = positionedGlyph.x + glyph.left,
	            y1 = positionedGlyph.y - glyph.top,
	            x2 = x1 + rect.w,
	            y2 = y1 + rect.h,

	            otl = new require$$1(x1, y1),
	            otr = new require$$1(x2, y1),
	            obl = new require$$1(x1, y2),
	            obr = new require$$1(x2, y2);

	        for (var i = 0; i < glyphInstances.length; i++) {

	            var instance = glyphInstances[i],
	                tl = otl,
	                tr = otr,
	                bl = obl,
	                br = obr,
	                angle = instance.angle + textRotate;

	            if (angle) {
	                var sin = Math.sin(angle),
	                    cos = Math.cos(angle),
	                    matrix = [cos, -sin, sin, cos];

	                tl = tl.matMult(matrix);
	                tr = tr.matMult(matrix);
	                bl = bl.matMult(matrix);
	                br = br.matMult(matrix);
	            }

	            // Prevent label from extending past the end of the line
	            var glyphMinScale = Math.max(instance.minScale, labelMinScale);

	            var glyphAngle = (anchor.angle + textRotate + instance.offset + 2 * Math.PI) % (2 * Math.PI);
	            quads.push(new SymbolQuad(instance.anchorPoint, tl, tr, bl, br, rect, glyphAngle, glyphMinScale, instance.maxScale));

	        }
	    }

	    return quads;
	}

	/**
	 * We can only render glyph quads that slide along a straight line. To draw
	 * curved lines we need an instance of a glyph for each segment it appears on.
	 * This creates all the instances of a glyph that are necessary to render a label.
	 *
	 * We need a
	 * @param {Array<Object>} glyphInstances An empty array that glyphInstances are added to.
	 * @param {Anchor} anchor
	 * @param {number} offset The glyph's offset from the center of the label.
	 * @param {Array<Point>} line
	 * @param {number} segment The index of the segment of the line on which the anchor exists.
	 * @param {boolean} forward If true get the glyphs that come later on the line, otherwise get the glyphs that come earlier.
	 *
	 * @returns {Array<Object>} glyphInstances
	 * @private
	 */
	function getSegmentGlyphs(glyphs, anchor, offset, line, segment, forward) {
	    var upsideDown = !forward;

	    if (offset < 0) forward = !forward;

	    if (forward) segment++;

	    var newAnchorPoint = new require$$1(anchor.x, anchor.y);
	    var end = line[segment];
	    var prevScale = Infinity;

	    offset = Math.abs(offset);

	    var placementScale = minScale;

	    while (true) {
	        var distance = newAnchorPoint.dist(end);
	        var scale = offset / distance;

	        // Get the angle of the line segment
	        var angle = Math.atan2(end.y - newAnchorPoint.y, end.x - newAnchorPoint.x);
	        if (!forward) angle += Math.PI;
	        if (upsideDown) angle += Math.PI;

	        glyphs.push({
	            anchorPoint: newAnchorPoint,
	            offset: upsideDown ? Math.PI : 0,
	            minScale: scale,
	            maxScale: prevScale,
	            angle: (angle + 2 * Math.PI) % (2 * Math.PI)
	        });

	        if (scale <= placementScale) break;

	        newAnchorPoint = end;

	        // skip duplicate nodes
	        while (newAnchorPoint.equals(end)) {
	            segment += forward ? 1 : -1;
	            end = line[segment];
	            if (!end) {
	                return scale;
	            }
	        }

	        var unit = end.sub(newAnchorPoint)._unit();
	        newAnchorPoint = newAnchorPoint.sub(unit._mult(distance));

	        prevScale = scale;
	    }

	    return placementScale;
	}

	var Shaping = {
	    shapeText: shapeText$1,
	    shapeIcon: shapeIcon$1
	};


	// The position of a glyph relative to the text's anchor point.
	function PositionedGlyph(codePoint, x, y, glyph) {
	    this.codePoint = codePoint;
	    this.x = x;
	    this.y = y;
	    this.glyph = glyph;
	}

	// A collection of positioned glyphs and some metadata
	function Shaping$1(positionedGlyphs, text, top, bottom, left, right) {
	    this.positionedGlyphs = positionedGlyphs;
	    this.text = text;
	    this.top = top;
	    this.bottom = bottom;
	    this.left = left;
	    this.right = right;
	}

	function shapeText$1(text, glyphs, maxWidth, lineHeight, horizontalAlign, verticalAlign, justify, spacing, translate) {

	    var positionedGlyphs = [];
	    var shaping = new Shaping$1(positionedGlyphs, text, translate[1], translate[1], translate[0], translate[0]);

	    // the y offset *should* be part of the font metadata
	    var yOffset = -17;

	    var x = 0;
	    var y = yOffset;

	    for (var i = 0; i < text.length; i++) {
	        var codePoint = text.charCodeAt(i);
	        var glyph = glyphs[codePoint];

	        if (!glyph) continue;

	        positionedGlyphs.push(new PositionedGlyph(codePoint, x, y, glyph));
	        x += glyph.advance + spacing;
	    }

	    if (!positionedGlyphs.length) return false;

	    linewrap(shaping, glyphs, lineHeight, maxWidth, horizontalAlign, verticalAlign, justify, translate);

	    return shaping;
	}

	var invisible = {
	    0x20:   true, // space
	    0x200b: true  // zero-width space
	};

	var breakable = {
	    0x20:   true, // space
	    0x26:   true, // ampersand
	    0x2b:   true, // plus sign
	    0x2d:   true, // hyphen-minus
	    0x2f:   true, // solidus
	    0xad:   true, // soft hyphen
	    0xb7:   true, // middle dot
	    0x200b: true, // zero-width space
	    0x2010: true, // hyphen
	    0x2013: true  // en dash
	};

	function linewrap(shaping, glyphs, lineHeight, maxWidth, horizontalAlign, verticalAlign, justify, translate) {
	    var lastSafeBreak = null;

	    var lengthBeforeCurrentLine = 0;
	    var lineStartIndex = 0;
	    var line = 0;

	    var maxLineLength = 0;

	    var positionedGlyphs = shaping.positionedGlyphs;

	    if (maxWidth) {
	        for (var i = 0; i < positionedGlyphs.length; i++) {
	            var positionedGlyph = positionedGlyphs[i];

	            positionedGlyph.x -= lengthBeforeCurrentLine;
	            positionedGlyph.y += lineHeight * line;

	            if (positionedGlyph.x > maxWidth && lastSafeBreak !== null) {

	                var lineLength = positionedGlyphs[lastSafeBreak + 1].x;
	                maxLineLength = Math.max(lineLength, maxLineLength);

	                for (var k = lastSafeBreak + 1; k <= i; k++) {
	                    positionedGlyphs[k].y += lineHeight;
	                    positionedGlyphs[k].x -= lineLength;
	                }

	                if (justify) {
	                    // Collapse invisible characters.
	                    var lineEnd = lastSafeBreak;
	                    if (invisible[positionedGlyphs[lastSafeBreak].codePoint]) {
	                        lineEnd--;
	                    }

	                    justifyLine(positionedGlyphs, glyphs, lineStartIndex, lineEnd, justify);
	                }

	                lineStartIndex = lastSafeBreak + 1;
	                lastSafeBreak = null;
	                lengthBeforeCurrentLine += lineLength;
	                line++;
	            }

	            if (breakable[positionedGlyph.codePoint]) {
	                lastSafeBreak = i;
	            }
	        }
	    }

	    var lastPositionedGlyph = positionedGlyphs[positionedGlyphs.length - 1];
	    var lastLineLength = lastPositionedGlyph.x + glyphs[lastPositionedGlyph.codePoint].advance;
	    maxLineLength = Math.max(maxLineLength, lastLineLength);

	    var height = (line + 1) * lineHeight;

	    justifyLine(positionedGlyphs, glyphs, lineStartIndex, positionedGlyphs.length - 1, justify);
	    align(positionedGlyphs, justify, horizontalAlign, verticalAlign, maxLineLength, lineHeight, line, translate);

	    // Calculate the bounding box
	    shaping.top += -verticalAlign * height;
	    shaping.bottom = shaping.top + height;
	    shaping.left += -horizontalAlign * maxLineLength;
	    shaping.right = shaping.left + maxLineLength;
	}

	function justifyLine(positionedGlyphs, glyphs, start, end, justify) {
	    var lastAdvance = glyphs[positionedGlyphs[end].codePoint].advance;
	    var lineIndent = (positionedGlyphs[end].x + lastAdvance) * justify;

	    for (var j = start; j <= end; j++) {
	        positionedGlyphs[j].x -= lineIndent;
	    }

	}

	function align(positionedGlyphs, justify, horizontalAlign, verticalAlign, maxLineLength, lineHeight, line, translate) {
	    var shiftX = (justify - horizontalAlign) * maxLineLength + translate[0];
	    var shiftY = (-verticalAlign * (line + 1) + 0.5) * lineHeight + translate[1];

	    for (var j = 0; j < positionedGlyphs.length; j++) {
	        positionedGlyphs[j].x += shiftX;
	        positionedGlyphs[j].y += shiftY;
	    }
	}


	function shapeIcon$1(image, layout) {
	    if (!image || !image.rect) return null;

	    var dx = layout['icon-offset'][0];
	    var dy = layout['icon-offset'][1];
	    var x1 = dx - image.width / 2;
	    var x2 = x1 + image.width;
	    var y1 = dy - image.height / 2;
	    var y2 = y1 + image.height;

	    return new PositionedIcon(image, y1, y2, x1, x2);
	}

	function PositionedIcon(image, top, bottom, left, right) {
	    this.image = image;
	    this.top = top;
	    this.bottom = bottom;
	    this.left = left;
	    this.right = right;
	}

	/**
	 * For an array of features determine what glyphs need to be loaded
	 * and apply any text preprocessing. The remaining users of text should
	 * use the `textFeatures` key returned by this function rather than accessing
	 * feature text directly.
	 * @private
	 */
	function resolveText(features, layoutProperties, codepoints) {
	    var textFeatures = [];

	    for (var i = 0, fl = features.length; i < fl; i++) {
	        var text = resolveTokens(features[i].properties, layoutProperties['text-field']);
	        if (!text) {
	            textFeatures[i] = null;
	            continue;
	        }
	        text = text.toString();

	        var transform = layoutProperties['text-transform'];
	        if (transform === 'uppercase') {
	            text = text.toLocaleUpperCase();
	        } else if (transform === 'lowercase') {
	            text = text.toLocaleLowerCase();
	        }

	        for (var j = 0; j < text.length; j++) {
	            codepoints[text.charCodeAt(j)] = true;
	        }

	        // Track indexes of features with text.
	        textFeatures[i] = text;
	    }

	    return textFeatures;
	}

	function mergeLines (features, textFeatures, geometries) {

	    var leftIndex = {},
	        rightIndex = {},
	        mergedFeatures = [],
	        mergedGeom = [],
	        mergedTexts = [],
	        mergedIndex = 0,
	        k;

	    function add(k) {
	        mergedFeatures.push(features[k]);
	        mergedGeom.push(geometries[k]);
	        mergedTexts.push(textFeatures[k]);
	        mergedIndex++;
	    }

	    function mergeFromRight(leftKey, rightKey, geom) {
	        var i = rightIndex[leftKey];
	        delete rightIndex[leftKey];
	        rightIndex[rightKey] = i;

	        mergedGeom[i][0].pop();
	        mergedGeom[i][0] = mergedGeom[i][0].concat(geom[0]);
	        return i;
	    }

	    function mergeFromLeft(leftKey, rightKey, geom) {
	        var i = leftIndex[rightKey];
	        delete leftIndex[rightKey];
	        leftIndex[leftKey] = i;

	        mergedGeom[i][0].shift();
	        mergedGeom[i][0] = geom[0].concat(mergedGeom[i][0]);
	        return i;
	    }

	    function getKey(text, geom, onRight) {
	        var point = onRight ? geom[0][geom[0].length - 1] : geom[0][0];
	        return text + ':' + point.x + ':' + point.y;
	    }

	    for (k = 0; k < features.length; k++) {
	        var geom = geometries[k],
	            text = textFeatures[k];

	        if (!text) {
	            add(k);
	            continue;
	        }

	        var leftKey = getKey(text, geom),
	            rightKey = getKey(text, geom, true);

	        if ((leftKey in rightIndex) && (rightKey in leftIndex) && (rightIndex[leftKey] !== leftIndex[rightKey])) {
	            // found lines with the same text adjacent to both ends of the current line, merge all three
	            var j = mergeFromLeft(leftKey, rightKey, geom);
	            var i = mergeFromRight(leftKey, rightKey, mergedGeom[j]);

	            delete leftIndex[leftKey];
	            delete rightIndex[rightKey];

	            rightIndex[getKey(text, mergedGeom[i], true)] = i;
	            mergedGeom[j] = null;

	        } else if (leftKey in rightIndex) {
	            // found mergeable line adjacent to the start of the current line, merge
	            mergeFromRight(leftKey, rightKey, geom);

	        } else if (rightKey in leftIndex) {
	            // found mergeable line adjacent to the end of the current line, merge
	            mergeFromLeft(leftKey, rightKey, geom);

	        } else {
	            // no adjacent lines, add as a new item
	            add(k);
	            leftIndex[leftKey] = mergedIndex - 1;
	            rightIndex[rightKey] = mergedIndex - 1;
	        }
	    }

	    return {
	        features: mergedFeatures,
	        textFeatures: mergedTexts,
	        geometries: mergedGeom
	    };
	};

	/**
	 * Returns the part of a multiline that intersects with the provided rectangular box.
	 *
	 * @param {Array<Array<Point>>} lines
	 * @param {number} x1 the left edge of the box
	 * @param {number} y1 the top edge of the box
	 * @param {number} x2 the right edge of the box
	 * @param {number} y2 the bottom edge of the box
	 * @returns {Array<Array<Point>>} lines
	 * @private
	 */
	function clipLine(lines, x1, y1, x2, y2) {
	    var clippedLines = [];

	    for (var l = 0; l < lines.length; l++) {
	        var line = lines[l];
	        var clippedLine;

	        for (var i = 0; i < line.length - 1; i++) {
	            var p0 = line[i];
	            var p1 = line[i + 1];


	            if (p0.x < x1 && p1.x < x1) {
	                continue;
	            } else if (p0.x < x1) {
	                p0 = new require$$1(x1, p0.y + (p1.y - p0.y) * ((x1 - p0.x) / (p1.x - p0.x)))._round();
	            } else if (p1.x < x1) {
	                p1 = new require$$1(x1, p0.y + (p1.y - p0.y) * ((x1 - p0.x) / (p1.x - p0.x)))._round();
	            }

	            if (p0.y < y1 && p1.y < y1) {
	                continue;
	            } else if (p0.y < y1) {
	                p0 = new require$$1(p0.x + (p1.x - p0.x) * ((y1 - p0.y) / (p1.y - p0.y)), y1)._round();
	            } else if (p1.y < y1) {
	                p1 = new require$$1(p0.x + (p1.x - p0.x) * ((y1 - p0.y) / (p1.y - p0.y)), y1)._round();
	            }

	            if (p0.x >= x2 && p1.x >= x2) {
	                continue;
	            } else if (p0.x >= x2) {
	                p0 = new require$$1(x2, p0.y + (p1.y - p0.y) * ((x2 - p0.x) / (p1.x - p0.x)))._round();
	            } else if (p1.x >= x2) {
	                p1 = new require$$1(x2, p0.y + (p1.y - p0.y) * ((x2 - p0.x) / (p1.x - p0.x)))._round();
	            }

	            if (p0.y >= y2 && p1.y >= y2) {
	                continue;
	            } else if (p0.y >= y2) {
	                p0 = new require$$1(p0.x + (p1.x - p0.x) * ((y2 - p0.y) / (p1.y - p0.y)), y2)._round();
	            } else if (p1.y >= y2) {
	                p1 = new require$$1(p0.x + (p1.x - p0.x) * ((y2 - p0.y) / (p1.y - p0.y)), y2)._round();
	            }

	            if (!clippedLine || !p0.equals(clippedLine[clippedLine.length - 1])) {
	                clippedLine = [p0];
	                clippedLines.push(clippedLine);
	            }

	            clippedLine.push(p1);
	        }
	    }

	    return clippedLines;
	}

	/**
	 * A CollisionFeature represents the area of the tile covered by a single label.
	 * It is used with CollisionTile to check if the label overlaps with any
	 * previous labels. A CollisionFeature is mostly just a set of CollisionBox
	 * objects.
	 *
	 * @class CollisionFeature
	 * @param {Array<Point>} line The geometry the label is placed on.
	 * @param {Anchor} anchor The point along the line around which the label is anchored.
	 * @param {VectorTileFeature} feature The VectorTileFeature that this CollisionFeature was created for.
	 * @param {Array<string>} layerIDs The IDs of the layers that this CollisionFeature is a part of.
	 * @param {Object} shaped The text or icon shaping results.
	 * @param {number} boxScale A magic number used to convert from glyph metrics units to geometry units.
	 * @param {number} padding The amount of padding to add around the label edges.
	 * @param {boolean} alignLine Whether the label is aligned with the line or the viewport.
	 *
	 * @private
	 */
	function CollisionFeature(collisionBoxArray, line, anchor, featureIndex, sourceLayerIndex, bucketIndex, shaped, boxScale, padding, alignLine, straight) {

	    var y1 = shaped.top * boxScale - padding;
	    var y2 = shaped.bottom * boxScale + padding;
	    var x1 = shaped.left * boxScale - padding;
	    var x2 = shaped.right * boxScale + padding;

	    this.boxStartIndex = collisionBoxArray.length;

	    if (alignLine) {

	        var height = y2 - y1;
	        var length = x2 - x1;

	        if (height > 0) {
	            // set minimum box height to avoid very many small labels
	            height = Math.max(10 * boxScale, height);

	            if (straight) {
	                // used for icon labels that are aligned with the line, but don't curve along it
	                var vector = line[anchor.segment + 1].sub(line[anchor.segment])._unit()._mult(length);
	                var straightLine = [anchor.sub(vector), anchor.add(vector)];
	                this._addLineCollisionBoxes(collisionBoxArray, straightLine, anchor, 0, length, height, featureIndex, sourceLayerIndex, bucketIndex);
	            } else {
	                // used for text labels that curve along a line
	                this._addLineCollisionBoxes(collisionBoxArray, line, anchor, anchor.segment, length, height, featureIndex, sourceLayerIndex, bucketIndex);
	            }
	        }

	    } else {
	        collisionBoxArray.emplaceBack(anchor.x, anchor.y, x1, y1, x2, y2, Infinity, featureIndex, sourceLayerIndex, bucketIndex,
	                0, 0, 0, 0, 0);
	    }

	    this.boxEndIndex = collisionBoxArray.length;
	}

	/**
	 * Create a set of CollisionBox objects for a line.
	 *
	 * @param {Array<Point>} line
	 * @param {Anchor} anchor
	 * @param {number} labelLength The length of the label in geometry units.
	 * @param {Anchor} anchor The point along the line around which the label is anchored.
	 * @param {VectorTileFeature} feature The VectorTileFeature that this CollisionFeature was created for.
	 * @param {number} boxSize The size of the collision boxes that will be created.
	 *
	 * @private
	 */
	CollisionFeature.prototype._addLineCollisionBoxes = function(collisionBoxArray, line, anchor, segment, labelLength, boxSize, featureIndex, sourceLayerIndex, bucketIndex) {
	    var step = boxSize / 2;
	    var nBoxes = Math.floor(labelLength / step);

	    // offset the center of the first box by half a box so that the edge of the
	    // box is at the edge of the label.
	    var firstBoxOffset = -boxSize / 2;

	    var bboxes = this.boxes;

	    var p = anchor;
	    var index = segment + 1;
	    var anchorDistance = firstBoxOffset;

	    // move backwards along the line to the first segment the label appears on
	    do {
	        index--;

	        // there isn't enough room for the label after the beginning of the line
	        // checkMaxAngle should have already caught this
	        if (index < 0) return bboxes;

	        anchorDistance -= line[index].dist(p);
	        p = line[index];
	    } while (anchorDistance > -labelLength / 2);

	    var segmentLength = line[index].dist(line[index + 1]);

	    for (var i = 0; i < nBoxes; i++) {
	        // the distance the box will be from the anchor
	        var boxDistanceToAnchor = -labelLength / 2 + i * step;

	        // the box is not on the current segment. Move to the next segment.
	        while (anchorDistance + segmentLength < boxDistanceToAnchor) {
	            anchorDistance += segmentLength;
	            index++;

	            // There isn't enough room before the end of the line.
	            if (index + 1 >= line.length) return bboxes;

	            segmentLength = line[index].dist(line[index + 1]);
	        }

	        // the distance the box will be from the beginning of the segment
	        var segmentBoxDistance = boxDistanceToAnchor - anchorDistance;

	        var p0 = line[index];
	        var p1 = line[index + 1];
	        var boxAnchorPoint = p1.sub(p0)._unit()._mult(segmentBoxDistance)._add(p0)._round();

	        var distanceToInnerEdge = Math.max(Math.abs(boxDistanceToAnchor - firstBoxOffset) - step / 2, 0);
	        var maxScale = labelLength / 2 / distanceToInnerEdge;

	        collisionBoxArray.emplaceBack(boxAnchorPoint.x, boxAnchorPoint.y,
	                -boxSize / 2, -boxSize / 2, boxSize / 2, boxSize / 2, maxScale,
	                featureIndex, sourceLayerIndex, bucketIndex,
	                0, 0, 0, 0, 0);
	    }

	    return bboxes;
	};

	var shapeText = Shaping.shapeText;
	var shapeIcon = Shaping.shapeIcon;
	var getGlyphQuads = Quads.getGlyphQuads;
	var getIconQuads = Quads.getIconQuads;

	var EXTENT$4 = Bucket.EXTENT;

	function SymbolBucket(options) {
	    Bucket.apply(this, arguments);
	    this.showCollisionBoxes = options.showCollisionBoxes;
	    this.overscaling = options.overscaling;
	    this.collisionBoxArray = options.collisionBoxArray;

	    this.sdfIcons = options.sdfIcons;
	    this.iconsNeedLinear = options.iconsNeedLinear;
	    this.adjustedTextSize = options.adjustedTextSize;
	    this.adjustedIconSize = options.adjustedIconSize;
	    this.fontstack = options.fontstack;
	}

	SymbolBucket.prototype = inherit(Bucket, {});

	SymbolBucket.prototype.serialize = function() {
	    var serialized = Bucket.prototype.serialize.apply(this);
	    serialized.sdfIcons = this.sdfIcons;
	    serialized.iconsNeedLinear = this.iconsNeedLinear;
	    serialized.adjustedTextSize = this.adjustedTextSize;
	    serialized.adjustedIconSize = this.adjustedIconSize;
	    serialized.fontstack = this.fontstack;
	    return serialized;
	};

	var programAttributes = [{
	    name: 'a_pos',
	    components: 2,
	    type: 'Int16'
	}, {
	    name: 'a_offset',
	    components: 2,
	    type: 'Int16'
	}, {
	    name: 'a_data1',
	    components: 4,
	    type: 'Uint8'
	}, {
	    name: 'a_data2',
	    components: 2,
	    type: 'Uint8'
	}];

	function addVertex(array, x, y, ox, oy, tx, ty, minzoom, maxzoom, labelminzoom) {
	    return array.emplaceBack(
	            // pos
	            x,
	            y,
	            // offset
	            Math.round(ox * 64), // use 1/64 pixels for placement
	            Math.round(oy * 64),
	            // data1
	            tx / 4,                   // tex
	            ty / 4,                   // tex
	            (labelminzoom || 0) * 10, // labelminzoom
	            0,
	            // data2
	            (minzoom || 0) * 10,               // minzoom
	            Math.min(maxzoom || 25, 25) * 10); // minzoom
	}

	SymbolBucket.prototype.addCollisionBoxVertex = function(vertexArray, point, extrude, maxZoom, placementZoom) {
	    return vertexArray.emplaceBack(
	            // pos
	            point.x,
	            point.y,
	            // extrude
	            Math.round(extrude.x),
	            Math.round(extrude.y),
	            // data
	            maxZoom * 10,
	            placementZoom * 10);
	};

	SymbolBucket.prototype.programInterfaces = {

	    glyph: {
	        vertexBuffer: true,
	        elementBuffer: true,
	        layoutAttributes: programAttributes
	    },

	    icon: {
	        vertexBuffer: true,
	        elementBuffer: true,
	        layoutAttributes: programAttributes
	    },

	    collisionBox: {
	        vertexBuffer: true,

	        layoutAttributes: [{
	            name: 'a_pos',
	            components: 2,
	            type: 'Int16'
	        }, {
	            name: 'a_extrude',
	            components: 2,
	            type: 'Int16'
	        }, {
	            name: 'a_data',
	            components: 2,
	            type: 'Uint8'
	        }]
	    }
	};

	SymbolBucket.prototype.populateBuffers = function(collisionTile, stacks, icons) {

	    // To reduce the number of labels that jump around when zooming we need
	    // to use a text-size value that is the same for all zoom levels.
	    // This calculates text-size at a high zoom level so that all tiles can
	    // use the same value when calculating anchor positions.
	    var zoomHistory = { lastIntegerZoom: Infinity, lastIntegerZoomTime: 0, lastZoom: 0 };
	    this.adjustedTextMaxSize = this.layer.getLayoutValue('text-size', {zoom: 18, zoomHistory: zoomHistory});
	    this.adjustedTextSize = this.layer.getLayoutValue('text-size', {zoom: this.zoom + 1, zoomHistory: zoomHistory});
	    this.adjustedIconMaxSize = this.layer.getLayoutValue('icon-size', {zoom: 18, zoomHistory: zoomHistory});
	    this.adjustedIconSize = this.layer.getLayoutValue('icon-size', {zoom: this.zoom + 1, zoomHistory: zoomHistory});

	    var tileSize = 512 * this.overscaling;
	    this.tilePixelRatio = EXTENT$4 / tileSize;
	    this.compareText = {};
	    this.symbolInstances = [];
	    this.iconsNeedLinear = false;

	    var layout = this.layer.layout;
	    var features = this.features;
	    var textFeatures = this.textFeatures;

	    var horizontalAlign = 0.5,
	        verticalAlign = 0.5;

	    switch (layout['text-anchor']) {
	    case 'right':
	    case 'top-right':
	    case 'bottom-right':
	        horizontalAlign = 1;
	        break;
	    case 'left':
	    case 'top-left':
	    case 'bottom-left':
	        horizontalAlign = 0;
	        break;
	    }

	    switch (layout['text-anchor']) {
	    case 'bottom':
	    case 'bottom-right':
	    case 'bottom-left':
	        verticalAlign = 1;
	        break;
	    case 'top':
	    case 'top-right':
	    case 'top-left':
	        verticalAlign = 0;
	        break;
	    }

	    var justify = layout['text-justify'] === 'right' ? 1 :
	        layout['text-justify'] === 'left' ? 0 :
	        0.5;

	    var oneEm = 24;
	    var lineHeight = layout['text-line-height'] * oneEm;
	    var maxWidth = layout['symbol-placement'] !== 'line' ? layout['text-max-width'] * oneEm : 0;
	    var spacing = layout['text-letter-spacing'] * oneEm;
	    var textOffset = [layout['text-offset'][0] * oneEm, layout['text-offset'][1] * oneEm];
	    var fontstack = this.fontstack = layout['text-font'].join(',');

	    var geometries = [];
	    for (var g = 0; g < features.length; g++) {
	        geometries.push(loadGeometry(features[g]));
	    }

	    if (layout['symbol-placement'] === 'line') {
	        // Merge adjacent lines with the same text to improve labelling.
	        // It's better to place labels on one long line than on many short segments.
	        var merged = mergeLines(features, textFeatures, geometries);

	        geometries = merged.geometries;
	        features = merged.features;
	        textFeatures = merged.textFeatures;
	    }

	    var shapedText, shapedIcon;

	    for (var k = 0; k < features.length; k++) {
	        if (!geometries[k]) continue;

	        if (textFeatures[k]) {
	            shapedText = shapeText(textFeatures[k], stacks[fontstack], maxWidth,
	                    lineHeight, horizontalAlign, verticalAlign, justify, spacing, textOffset);
	        } else {
	            shapedText = null;
	        }

	        if (layout['icon-image']) {
	            var iconName = resolveTokens(features[k].properties, layout['icon-image']);
	            var image = icons[iconName];
	            shapedIcon = shapeIcon(image, layout);

	            if (image) {
	                if (this.sdfIcons === undefined) {
	                    this.sdfIcons = image.sdf;
	                } else if (this.sdfIcons !== image.sdf) {
	                    warnOnce('Style sheet warning: Cannot mix SDF and non-SDF icons in one buffer');
	                }
	                if (image.pixelRatio !== 1) {
	                    this.iconsNeedLinear = true;
	                }
	            }
	        } else {
	            shapedIcon = null;
	        }

	        if (shapedText || shapedIcon) {
	            this.addFeature(geometries[k], shapedText, shapedIcon, features[k].index);
	        }
	    }

	    this.placeFeatures(collisionTile, this.showCollisionBoxes);

	    this.trimArrays();
	};

	SymbolBucket.prototype.addFeature = function(lines, shapedText, shapedIcon, featureIndex) {
	    var layout = this.layer.layout;

	    var glyphSize = 24;

	    var fontScale = this.adjustedTextSize / glyphSize,
	        textMaxSize = this.adjustedTextMaxSize !== undefined ? this.adjustedTextMaxSize : this.adjustedTextSize,
	        textBoxScale = this.tilePixelRatio * fontScale,
	        textMaxBoxScale = this.tilePixelRatio * textMaxSize / glyphSize,
	        iconBoxScale = this.tilePixelRatio * this.adjustedIconSize,
	        symbolMinDistance = this.tilePixelRatio * layout['symbol-spacing'],
	        avoidEdges = layout['symbol-avoid-edges'],
	        textPadding = layout['text-padding'] * this.tilePixelRatio,
	        iconPadding = layout['icon-padding'] * this.tilePixelRatio,
	        textMaxAngle = layout['text-max-angle'] / 180 * Math.PI,
	        textAlongLine = layout['text-rotation-alignment'] === 'map' && layout['symbol-placement'] === 'line',
	        iconAlongLine = layout['icon-rotation-alignment'] === 'map' && layout['symbol-placement'] === 'line',
	        mayOverlap = layout['text-allow-overlap'] || layout['icon-allow-overlap'] ||
	            layout['text-ignore-placement'] || layout['icon-ignore-placement'],
	        isLine = layout['symbol-placement'] === 'line',
	        textRepeatDistance = symbolMinDistance / 2;

	    if (isLine) {
	        lines = clipLine(lines, 0, 0, EXTENT$4, EXTENT$4);
	    }

	    for (var i = 0; i < lines.length; i++) {
	        var line = lines[i];

	        // Calculate the anchor points around which you want to place labels
	        var anchors;
	        if (isLine) {
	            anchors = getAnchors(
	                line,
	                symbolMinDistance,
	                textMaxAngle,
	                shapedText,
	                shapedIcon,
	                glyphSize,
	                textMaxBoxScale,
	                this.overscaling,
	                EXTENT$4
	            );
	        } else {
	            anchors = [ new Anchor(line[0].x, line[0].y, 0) ];
	        }

	        // For each potential label, create the placement features used to check for collisions, and the quads use for rendering.
	        for (var j = 0, len = anchors.length; j < len; j++) {
	            var anchor = anchors[j];

	            if (shapedText && isLine) {
	                if (this.anchorIsTooClose(shapedText.text, textRepeatDistance, anchor)) {
	                    continue;
	                }
	            }

	            var inside = !(anchor.x < 0 || anchor.x > EXTENT$4 || anchor.y < 0 || anchor.y > EXTENT$4);

	            if (avoidEdges && !inside) continue;

	            // Normally symbol layers are drawn across tile boundaries. Only symbols
	            // with their anchors within the tile boundaries are added to the buffers
	            // to prevent symbols from being drawn twice.
	            //
	            // Symbols in layers with overlap are sorted in the y direction so that
	            // symbols lower on the canvas are drawn on top of symbols near the top.
	            // To preserve this order across tile boundaries these symbols can't
	            // be drawn across tile boundaries. Instead they need to be included in
	            // the buffers for both tiles and clipped to tile boundaries at draw time.
	            var addToBuffers = inside || mayOverlap;

	            this.symbolInstances.push(new SymbolInstance(anchor, line, shapedText, shapedIcon, layout,
	                        addToBuffers, this.symbolInstances.length, this.collisionBoxArray, featureIndex, this.sourceLayerIndex, this.index,
	                        textBoxScale, textPadding, textAlongLine,
	                        iconBoxScale, iconPadding, iconAlongLine));
	        }
	    }
	};

	SymbolBucket.prototype.anchorIsTooClose = function(text, repeatDistance, anchor) {
	    var compareText = this.compareText;
	    if (!(text in compareText)) {
	        compareText[text] = [];
	    } else {
	        var otherAnchors = compareText[text];
	        for (var k = otherAnchors.length - 1; k >= 0; k--) {
	            if (anchor.dist(otherAnchors[k]) < repeatDistance) {
	                // If it's within repeatDistance of one anchor, stop looking
	                return true;
	            }
	        }
	    }
	    // If anchor is not within repeatDistance of any other anchor, add to array
	    compareText[text].push(anchor);
	    return false;
	};

	SymbolBucket.prototype.placeFeatures = function(collisionTile, showCollisionBoxes) {
	    this.recalculateStyleLayers();

	    // Calculate which labels can be shown and when they can be shown and
	    // create the bufers used for rendering.

	    this.createArrays();

	    var layout = this.layer.layout;

	    var maxScale = collisionTile.maxScale;

	    var textAlongLine = layout['text-rotation-alignment'] === 'map' && layout['symbol-placement'] === 'line';
	    var iconAlongLine = layout['icon-rotation-alignment'] === 'map' && layout['symbol-placement'] === 'line';

	    var mayOverlap = layout['text-allow-overlap'] || layout['icon-allow-overlap'] ||
	        layout['text-ignore-placement'] || layout['icon-ignore-placement'];

	    // Sort symbols by their y position on the canvas so that they lower symbols
	    // are drawn on top of higher symbols.
	    // Don't sort symbols that won't overlap because it isn't necessary and
	    // because it causes more labels to pop in and out when rotating.
	    if (mayOverlap) {
	        var angle = collisionTile.angle;
	        var sin = Math.sin(angle),
	            cos = Math.cos(angle);

	        this.symbolInstances.sort(function(a, b) {
	            var aRotated = (sin * a.x + cos * a.y) | 0;
	            var bRotated = (sin * b.x + cos * b.y) | 0;
	            return (aRotated - bRotated) || (b.index - a.index);
	        });
	    }

	    for (var p = 0; p < this.symbolInstances.length; p++) {
	        var symbolInstance = this.symbolInstances[p];
	        var hasText = symbolInstance.hasText;
	        var hasIcon = symbolInstance.hasIcon;

	        var iconWithoutText = layout['text-optional'] || !hasText,
	            textWithoutIcon = layout['icon-optional'] || !hasIcon;


	        // Calculate the scales at which the text and icon can be placed without collision.

	        var glyphScale = hasText ?
	            collisionTile.placeCollisionFeature(symbolInstance.textCollisionFeature,
	                    layout['text-allow-overlap'], layout['symbol-avoid-edges']) :
	            collisionTile.minScale;

	        var iconScale = hasIcon ?
	            collisionTile.placeCollisionFeature(symbolInstance.iconCollisionFeature,
	                    layout['icon-allow-overlap'], layout['symbol-avoid-edges']) :
	            collisionTile.minScale;


	        // Combine the scales for icons and text.

	        if (!iconWithoutText && !textWithoutIcon) {
	            iconScale = glyphScale = Math.max(iconScale, glyphScale);
	        } else if (!textWithoutIcon && glyphScale) {
	            glyphScale = Math.max(iconScale, glyphScale);
	        } else if (!iconWithoutText && iconScale) {
	            iconScale = Math.max(iconScale, glyphScale);
	        }


	        // Insert final placement into collision tree and add glyphs/icons to buffers

	        if (hasText) {
	            collisionTile.insertCollisionFeature(symbolInstance.textCollisionFeature, glyphScale, layout['text-ignore-placement']);
	            if (glyphScale <= maxScale) {
	                this.addSymbols('glyph', symbolInstance.glyphQuads, glyphScale, layout['text-keep-upright'], textAlongLine, collisionTile.angle);
	            }
	        }

	        if (hasIcon) {
	            collisionTile.insertCollisionFeature(symbolInstance.iconCollisionFeature, iconScale, layout['icon-ignore-placement']);
	            if (iconScale <= maxScale) {
	                this.addSymbols('icon', symbolInstance.iconQuads, iconScale, layout['icon-keep-upright'], iconAlongLine, collisionTile.angle);
	            }
	        }

	    }

	    if (showCollisionBoxes) this.addToDebugBuffers(collisionTile);
	};

	SymbolBucket.prototype.addSymbols = function(programName, quads, scale, keepUpright, alongLine, placementAngle) {

	    var group = this.makeRoomFor(programName, 4 * quads.length);

	    var elementArray = group.layout.element;
	    var vertexArray = group.layout.vertex;

	    var zoom = this.zoom;
	    var placementZoom = Math.max(Math.log(scale) / Math.LN2 + zoom, 0);

	    for (var k = 0; k < quads.length; k++) {

	        var symbol = quads[k],
	            angle = symbol.angle;

	        // drop upside down versions of glyphs
	        var a = (angle + placementAngle + Math.PI) % (Math.PI * 2);
	        if (keepUpright && alongLine && (a <= Math.PI / 2 || a > Math.PI * 3 / 2)) continue;

	        var tl = symbol.tl,
	            tr = symbol.tr,
	            bl = symbol.bl,
	            br = symbol.br,
	            tex = symbol.tex,
	            anchorPoint = symbol.anchorPoint,

	            minZoom = Math.max(zoom + Math.log(symbol.minScale) / Math.LN2, placementZoom),
	            maxZoom = Math.min(zoom + Math.log(symbol.maxScale) / Math.LN2, 25);

	        if (maxZoom <= minZoom) continue;

	        // Lower min zoom so that while fading out the label it can be shown outside of collision-free zoom levels
	        if (minZoom === placementZoom) minZoom = 0;

	        var index = addVertex(vertexArray, anchorPoint.x, anchorPoint.y, tl.x, tl.y, tex.x, tex.y, minZoom, maxZoom, placementZoom);
	        addVertex(vertexArray, anchorPoint.x, anchorPoint.y, tr.x, tr.y, tex.x + tex.w, tex.y, minZoom, maxZoom, placementZoom);
	        addVertex(vertexArray, anchorPoint.x, anchorPoint.y, bl.x, bl.y, tex.x, tex.y + tex.h, minZoom, maxZoom, placementZoom);
	        addVertex(vertexArray, anchorPoint.x, anchorPoint.y, br.x, br.y, tex.x + tex.w, tex.y + tex.h, minZoom, maxZoom, placementZoom);

	        elementArray.emplaceBack(index, index + 1, index + 2);
	        elementArray.emplaceBack(index + 1, index + 2, index + 3);
	    }

	};

	SymbolBucket.prototype.updateIcons = function(icons) {
	    this.recalculateStyleLayers();
	    var iconValue = this.layer.layout['icon-image'];
	    if (!iconValue) return;

	    for (var i = 0; i < this.features.length; i++) {
	        var iconName = resolveTokens(this.features[i].properties, iconValue);
	        if (iconName)
	            icons[iconName] = true;
	    }
	};

	SymbolBucket.prototype.updateFont = function(stacks) {
	    this.recalculateStyleLayers();
	    var fontName = this.layer.layout['text-font'],
	        stack = stacks[fontName] = stacks[fontName] || {};

	    this.textFeatures = resolveText(this.features, this.layer.layout, stack);
	};

	SymbolBucket.prototype.addToDebugBuffers = function(collisionTile) {
	    var group = this.makeRoomFor('collisionBox', 0);
	    var vertexArray = group.layout.vertex;
	    var angle = -collisionTile.angle;
	    var yStretch = collisionTile.yStretch;

	    for (var j = 0; j < this.symbolInstances.length; j++) {
	        for (var i = 0; i < 2; i++) {
	            var feature = this.symbolInstances[j][i === 0 ? 'textCollisionFeature' : 'iconCollisionFeature'];
	            if (!feature) continue;

	            for (var b = feature.boxStartIndex; b < feature.boxEndIndex; b++) {
	                var box = this.collisionBoxArray.get(b);
	                var anchorPoint = box.anchorPoint;

	                var tl = new require$$1(box.x1, box.y1 * yStretch)._rotate(angle);
	                var tr = new require$$1(box.x2, box.y1 * yStretch)._rotate(angle);
	                var bl = new require$$1(box.x1, box.y2 * yStretch)._rotate(angle);
	                var br = new require$$1(box.x2, box.y2 * yStretch)._rotate(angle);

	                var maxZoom = Math.max(0, Math.min(25, this.zoom + Math.log(box.maxScale) / Math.LN2));
	                var placementZoom = Math.max(0, Math.min(25, this.zoom + Math.log(box.placementScale) / Math.LN2));

	                this.addCollisionBoxVertex(vertexArray, anchorPoint, tl, maxZoom, placementZoom);
	                this.addCollisionBoxVertex(vertexArray, anchorPoint, tr, maxZoom, placementZoom);
	                this.addCollisionBoxVertex(vertexArray, anchorPoint, tr, maxZoom, placementZoom);
	                this.addCollisionBoxVertex(vertexArray, anchorPoint, br, maxZoom, placementZoom);
	                this.addCollisionBoxVertex(vertexArray, anchorPoint, br, maxZoom, placementZoom);
	                this.addCollisionBoxVertex(vertexArray, anchorPoint, bl, maxZoom, placementZoom);
	                this.addCollisionBoxVertex(vertexArray, anchorPoint, bl, maxZoom, placementZoom);
	                this.addCollisionBoxVertex(vertexArray, anchorPoint, tl, maxZoom, placementZoom);
	            }
	        }
	    }
	};

	function SymbolInstance(anchor, line, shapedText, shapedIcon, layout, addToBuffers, index, collisionBoxArray, featureIndex, sourceLayerIndex, bucketIndex,
	                        textBoxScale, textPadding, textAlongLine,
	                        iconBoxScale, iconPadding, iconAlongLine) {

	    this.x = anchor.x;
	    this.y = anchor.y;
	    this.index = index;
	    this.hasText = !!shapedText;
	    this.hasIcon = !!shapedIcon;

	    if (this.hasText) {
	        this.glyphQuads = addToBuffers ? getGlyphQuads(anchor, shapedText, textBoxScale, line, layout, textAlongLine) : [];
	        this.textCollisionFeature = new CollisionFeature(collisionBoxArray, line, anchor, featureIndex, sourceLayerIndex, bucketIndex,
	                shapedText, textBoxScale, textPadding, textAlongLine, false);
	    }

	    if (this.hasIcon) {
	        this.iconQuads = addToBuffers ? getIconQuads(anchor, shapedIcon, iconBoxScale, line, layout, iconAlongLine) : [];
	        this.iconCollisionFeature = new CollisionFeature(collisionBoxArray, line, anchor, featureIndex, sourceLayerIndex, bucketIndex,
	                shapedIcon, iconBoxScale, iconPadding, iconAlongLine, true);
	    }
	}

	var index$3 = __commonjs(function (module) {
	'use strict';

	module.exports = createFilter;

	var types = ['Unknown', 'Point', 'LineString', 'Polygon'];

	/**
	 * Given a filter expressed as nested arrays, return a new function
	 * that evaluates whether a given feature (with a .properties or .tags property)
	 * passes its test.
	 *
	 * @param {Array} filter mapbox gl filter
	 * @returns {Function} filter-evaluating function
	 */
	function createFilter(filter) {
	    return new Function('f', 'var p = (f && f.properties || {}); return ' + compile(filter));
	}

	function compile(filter) {
	    if (!filter) return 'true';
	    var op = filter[0];
	    if (filter.length <= 1) return op === 'any' ? 'false' : 'true';
	    var str =
	        op === '==' ? compileComparisonOp(filter[1], filter[2], '===', false) :
	        op === '!=' ? compileComparisonOp(filter[1], filter[2], '!==', false) :
	        op === '<' ||
	        op === '>' ||
	        op === '<=' ||
	        op === '>=' ? compileComparisonOp(filter[1], filter[2], op, true) :
	        op === 'any' ? compileLogicalOp(filter.slice(1), '||') :
	        op === 'all' ? compileLogicalOp(filter.slice(1), '&&') :
	        op === 'none' ? compileNegation(compileLogicalOp(filter.slice(1), '||')) :
	        op === 'in' ? compileInOp(filter[1], filter.slice(2)) :
	        op === '!in' ? compileNegation(compileInOp(filter[1], filter.slice(2))) :
	        op === 'has' ? compileHasOp(filter[1]) :
	        op === '!has' ? compileNegation(compileHasOp([filter[1]])) :
	        'true';
	    return '(' + str + ')';
	}

	function compilePropertyReference(property) {
	    return property === '$type' ? 'f.type' : 'p[' + JSON.stringify(property) + ']';
	}

	function compileComparisonOp(property, value, op, checkType) {
	    var left = compilePropertyReference(property);
	    var right = property === '$type' ? types.indexOf(value) : JSON.stringify(value);
	    return (checkType ? 'typeof ' + left + '=== typeof ' + right + '&&' : '') + left + op + right;
	}

	function compileLogicalOp(expressions, op) {
	    return expressions.map(compile).join(op);
	}

	function compileInOp(property, values) {
	    if (property === '$type') values = values.map(function(value) { return types.indexOf(value); });
	    var left = JSON.stringify(values.sort(compare));
	    var right = compilePropertyReference(property);

	    if (values.length <= 200) return left + '.indexOf(' + right + ') !== -1';

	    return 'function(v, a, i, j) {' +
	        'while (i <= j) { var m = (i + j) >> 1;' +
	        '    if (a[m] === v) return true; if (a[m] > v) j = m - 1; else i = m + 1;' +
	        '}' +
	    'return false; }(' + right + ', ' + left + ',0,' + (values.length - 1) + ')';
	}

	function compileHasOp(property) {
	    return JSON.stringify(property) + ' in p';
	}

	function compileNegation(expression) {
	    return '!(' + expression + ')';
	}

	// Comparison function to sort numbers and strings
	function compare(a, b) {
	    return a < b ? -1 : a > b ? 1 : 0;
	}
	});

	var featureFilter = (index$3 && typeof index$3 === 'object' && 'default' in index$3 ? index$3['default'] : index$3);

	/**
	 * The `Buffer` class turns a `StructArray` into a WebGL buffer. Each member of the StructArray's
	 * Struct type is converted to a WebGL atribute.
	 *
	 * @class Buffer
	 * @private
	 * @param {object} array A serialized StructArray.
	 * @param {object} arrayType A serialized StructArrayType.
	 * @param {BufferType} type
	 */
	function Buffer$1(array, arrayType, type) {
	    this.arrayBuffer = array.arrayBuffer;
	    this.length = array.length;
	    this.attributes = arrayType.members;
	    this.itemSize = arrayType.bytesPerElement;
	    this.type = type;
	    this.arrayType = arrayType;
	}

	/**
	 * Bind this buffer to a WebGL context.
	 * @private
	 * @param gl The WebGL context
	 */
	Buffer$1.prototype.bind = function(gl) {
	    var type = gl[this.type];

	    if (!this.buffer) {
	        this.buffer = gl.createBuffer();
	        gl.bindBuffer(type, this.buffer);
	        gl.bufferData(type, this.arrayBuffer, gl.STATIC_DRAW);

	        // dump array buffer once it's bound to gl
	        this.arrayBuffer = null;
	    } else {
	        gl.bindBuffer(type, this.buffer);
	    }
	};

	/**
	 * @enum {string} AttributeType
	 * @private
	 * @readonly
	 */
	var AttributeType = {
	    Int8:   'BYTE',
	    Uint8:  'UNSIGNED_BYTE',
	    Int16:  'SHORT',
	    Uint16: 'UNSIGNED_SHORT'
	};

	/**
	 * Set the attribute pointers in a WebGL context
	 * @private
	 * @param gl The WebGL context
	 * @param program The active WebGL program
	 */
	Buffer$1.prototype.setVertexAttribPointers = function(gl, program) {
	    for (var j = 0; j < this.attributes.length; j++) {
	        var member = this.attributes[j];
	        var attribIndex = program[member.name];

	        if (attribIndex !== undefined) {
	            gl.vertexAttribPointer(
	                attribIndex,
	                member.components,
	                gl[AttributeType[member.type]],
	                false,
	                this.arrayType.bytesPerElement,
	                member.offset
	            );
	        }
	    }
	};

	/**
	 * Destroy the GL buffer bound to the given WebGL context
	 * @private
	 * @param gl The WebGL context
	 */
	Buffer$1.prototype.destroy = function(gl) {
	    if (this.buffer) {
	        gl.deleteBuffer(this.buffer);
	    }
	};

	/**
	 * @enum {string} BufferType
	 * @private
	 * @readonly
	 */
	Buffer$1.BufferType = {
	    VERTEX: 'ARRAY_BUFFER',
	    ELEMENT: 'ELEMENT_ARRAY_BUFFER'
	};

	/**
	 * An `BufferType.ELEMENT` buffer holds indicies of a corresponding `BufferType.VERTEX` buffer.
	 * These indicies are stored in the `BufferType.ELEMENT` buffer as `UNSIGNED_SHORT`s.
	 *
	 * @private
	 * @readonly
	 */
	Buffer$1.ELEMENT_ATTRIBUTE_TYPE = 'Uint16';

	/**
	 * WebGL performs best if vertex attribute offsets are aligned to 4 byte boundaries.
	 * @private
	 * @readonly
	 */
	Buffer$1.VERTEX_ATTRIBUTE_ALIGNMENT = 4;

	var assert = __commonjs(function (module, exports) {
	'use strict';

	var isBufferImplementation;

	function isBuffer(arg) {
	  return isBufferImplementation(arg);
	}

	if (typeof Buffer === 'undefined') {
	  isBufferImplementation = function isBuffer(arg) {
	    return arg && typeof arg === 'object'
	      && typeof arg.copy === 'function'
	      && typeof arg.fill === 'function'
	      && typeof arg.readUInt8 === 'function';
	  };
	} else {
	  isBufferImplementation = function isBuffer(arg) {
	    return arg instanceof Buffer;
	  };
	}

	var inheritsImplementation;

	function inherits(ctor, superCtor) {
	  inheritsImplementation(ctor, superCtor);
	}

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  inheritsImplementation = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor;
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  inheritsImplementation = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor;
	    var TempCtor = function () {};
	    TempCtor.prototype = superCtor.prototype;
	    ctor.prototype = new TempCtor();
	    ctor.prototype.constructor = ctor;
	  }
	}

	function isNullOrUndefined(arg) {
	  return arg == null;
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isString(arg) {
	  return typeof arg === 'string';
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}

	var pSlice = Array.prototype.slice;
	var hasOwn = Object.prototype.hasOwnProperty;

	// 2. The AssertionError is defined in assert.
	// new AssertionError({ message: message,
	//                      actual: actual,
	//                      expected: expected })

	function AssertionError(options) {
	  this.name = 'AssertionError';
	  this.actual = options.actual;
	  this.expected = options.expected;
	  this.operator = options.operator;
	  if (options.message) {
	    this.message = options.message;
	    this.generatedMessage = false;
	  } else {
	    this.message = getMessage(this);
	    this.generatedMessage = true;
	  }
	  var stackStartFunction = options.stackStartFunction || fail;

	  if (Error.captureStackTrace) {
	    Error.captureStackTrace(this, stackStartFunction);
	  }
	  else {
	    // non v8 browsers so we can have a stacktrace
	    var err = new Error();
	    if (err.stack) {
	      var out = err.stack;

	      // try to strip useless frames
	      var fn_name = stackStartFunction.name;
	      var idx = out.indexOf('\n' + fn_name);
	      if (idx >= 0) {
	        // once we have located the function frame
	        // we need to strip out everything before it (and its line)
	        var next_line = out.indexOf('\n', idx + 1);
	        out = out.substring(next_line + 1);
	      }

	      this.stack = out;
	    }
	  }
	}

	// AssertionError instanceof Error
	inherits(AssertionError, Error);

	function replacer(key, value) {
	  if (isUndefined(value)) {
	    return '' + value;
	  }
	  if (isNumber(value) && !isFinite(value)) {
	    return value.toString();
	  }
	  if (isFunction(value) || isRegExp(value)) {
	    return value.toString();
	  }
	  return value;
	}

	function truncate(s, n) {
	  if (isString(s)) {
	    return s.length < n ? s : s.slice(0, n);
	  } else {
	    return s;
	  }
	}

	function getMessage(self) {
	  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
	         self.operator + ' ' +
	         truncate(JSON.stringify(self.expected, replacer), 128);
	}

	// At present only the three keys mentioned above are used and
	// understood by the spec. Implementations or sub modules can pass
	// other keys to the AssertionError's constructor - they will be
	// ignored.

	// 3. All of the following functions must throw an AssertionError
	// when a corresponding condition is not met, with a message that
	// may be undefined if not provided.  All assertion methods provide
	// both the actual and expected values to the assertion error for
	// display purposes.

	// EXTENSION! allows for well behaved errors defined elsewhere.
	function fail(actual, expected, message, operator, stackStartFunction) {
	  throw new AssertionError({
	    message: message,
	    actual: actual,
	    expected: expected,
	    operator: operator,
	    stackStartFunction: stackStartFunction
	  });
	}

	// 4. Pure assertion tests whether a value is truthy, as determined
	// by !!guard.
	// ok(guard, message_opt);
	// This statement is equivalent to assert.equal(true, !!guard,
	// message_opt);. To test strictly for the value true, use
	// strictEqual(true, guard, message_opt);.

	function ok(value, message) {
	  if (!value) fail(value, true, message, '==', ok);
	}

	// 5. The equality assertion tests shallow, coercive equality with
	// ==.
	// equal(actual, expected, message_opt);

	function equal(actual, expected, message) {
	  if (actual != expected) fail(actual, expected, message, '==', equal);
	}

	// 6. The non-equality assertion tests for whether two objects are not equal
	// with != notEqual(actual, expected, message_opt);

	function notEqual(actual, expected, message) {
	  if (actual == expected) {
	    fail(actual, expected, message, '!=', notEqual);
	  }
	}

	// 7. The equivalence assertion tests a deep equality relation.
	// deepEqual(actual, expected, message_opt);

	function deepEqual(actual, expected, message) {
	  if (!_deepEqual(actual, expected)) {
	    fail(actual, expected, message, 'deepEqual', deepEqual);
	  }
	}

	function _deepEqual(actual, expected) {
	  // 7.1. All identical values are equivalent, as determined by ===.
	  if (actual === expected) {
	    return true;

	  } else if (isBuffer(actual) && isBuffer(expected)) {
	    if (actual.length != expected.length) return false;

	    for (var i = 0; i < actual.length; i++) {
	      if (actual[i] !== expected[i]) return false;
	    }

	    return true;

	  // 7.2. If the expected value is a Date object, the actual value is
	  // equivalent if it is also a Date object that refers to the same time.
	  } else if (isDate(actual) && isDate(expected)) {
	    return actual.getTime() === expected.getTime();

	  // 7.3 If the expected value is a RegExp object, the actual value is
	  // equivalent if it is also a RegExp object with the same source and
	  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
	  } else if (isRegExp(actual) && isRegExp(expected)) {
	    return actual.source === expected.source &&
	           actual.global === expected.global &&
	           actual.multiline === expected.multiline &&
	           actual.lastIndex === expected.lastIndex &&
	           actual.ignoreCase === expected.ignoreCase;

	  // 7.4. Other pairs that do not both pass typeof value == 'object',
	  // equivalence is determined by ==.
	  } else if (!isObject(actual) && !isObject(expected)) {
	    return actual == expected;

	  // 7.5 For all other Object pairs, including Array objects, equivalence is
	  // determined by having the same number of owned properties (as verified
	  // with Object.prototype.hasOwnProperty.call), the same set of keys
	  // (although not necessarily the same order), equivalent values for every
	  // corresponding key, and an identical 'prototype' property. Note: this
	  // accounts for both named and indexed properties on Arrays.
	  } else {
	    return objEquiv(actual, expected);
	  }
	}

	function isArguments(object) {
	  return Object.prototype.toString.call(object) == '[object Arguments]';
	}

	function objEquiv(a, b) {
	  if (isNullOrUndefined(a) || isNullOrUndefined(b))
	    return false;
	  // an identical 'prototype' property.
	  if (a.prototype !== b.prototype) return false;
	  // if one is a primitive, the other must be same
	  if (isPrimitive(a) || isPrimitive(b)) {
	    return a === b;
	  }
	  var aIsArgs = isArguments(a),
	      bIsArgs = isArguments(b);
	  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
	    return false;
	  if (aIsArgs) {
	    a = pSlice.call(a);
	    b = pSlice.call(b);
	    return _deepEqual(a, b);
	  }
	  var ka = objectKeys(a),
	      kb = objectKeys(b),
	      key, i;
	  // having the same number of owned properties (keys incorporates
	  // hasOwnProperty)
	  if (ka.length != kb.length)
	    return false;
	  //the same set of keys (although not necessarily the same order),
	  ka.sort();
	  kb.sort();
	  //~~~cheap key test
	  for (i = ka.length - 1; i >= 0; i--) {
	    if (ka[i] != kb[i])
	      return false;
	  }
	  //equivalent values for every corresponding key, and
	  //~~~possibly expensive deep test
	  for (i = ka.length - 1; i >= 0; i--) {
	    key = ka[i];
	    if (!_deepEqual(a[key], b[key])) return false;
	  }
	  return true;
	}

	// 8. The non-equivalence assertion tests for any deep inequality.
	// notDeepEqual(actual, expected, message_opt);

	function notDeepEqual(actual, expected, message) {
	  if (_deepEqual(actual, expected)) {
	    fail(actual, expected, message, 'notDeepEqual', notDeepEqual);
	  }
	};

	// 9. The strict equality assertion tests strict equality, as determined by ===.
	// strictEqual(actual, expected, message_opt);

	function strictEqual(actual, expected, message) {
	  if (actual !== expected) {
	    fail(actual, expected, message, '===', strictEqual);
	  }
	};

	// 10. The strict non-equality assertion tests for strict inequality, as
	// determined by !==.  notStrictEqual(actual, expected, message_opt);

	function notStrictEqual(actual, expected, message) {
	  if (actual === expected) {
	    fail(actual, expected, message, '!==', notStrictEqual);
	  }
	};

	function expectedException(actual, expected) {
	  if (!actual || !expected) {
	    return false;
	  }

	  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
	    return expected.test(actual);
	  } else if (actual instanceof expected) {
	    return true;
	  } else if (expected.call({}, actual) === true) {
	    return true;
	  }

	  return false;
	}

	function _throws(shouldThrow, block, expected, message) {
	  var actual;

	  if (isString(expected)) {
	    message = expected;
	    expected = null;
	  }

	  try {
	    block();
	  } catch (e) {
	    actual = e;
	  }

	  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
	            (message ? ' ' + message : '.');

	  if (shouldThrow && !actual) {
	    fail(actual, expected, 'Missing expected exception' + message);
	  }

	  if (!shouldThrow && expectedException(actual, expected)) {
	    fail(actual, expected, 'Got unwanted exception' + message);
	  }

	  if ((shouldThrow && actual && expected &&
	      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
	    throw actual;
	  }
	}

	// 11. Expected to throw an error:
	// throws(block, Error_opt, message_opt);

	function throws(block, /*optional*/error, /*optional*/message) {
	  _throws.apply(this, [true].concat(pSlice.call(arguments)));
	}

	// EXTENSION! This is annoying to write outside this module.
	function doesNotThrow(block, /*optional*/message) {
	  _throws.apply(this, [false].concat(pSlice.call(arguments)));
	}

	function ifError(err) { if (err) {throw err;}}

	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) {
	    if (hasOwn.call(obj, key)) keys.push(key);
	  }
	  return keys;
	};

	exports['default'] = ok;
	exports.AssertionError = AssertionError;
	exports.fail = fail;
	exports.ok = ok;
	exports.equal = equal;
	exports.notEqual = notEqual;
	exports.deepEqual = deepEqual;
	exports.notDeepEqual = notDeepEqual;
	exports.strictEqual = strictEqual;
	exports.notStrictEqual = notStrictEqual;
	exports.throws = throws;
	exports.doesNotThrow = doesNotThrow;
	exports.ifError = ifError;
	});

	var assert$1 = (assert && typeof assert === 'object' && 'default' in assert ? assert['default'] : assert);

	var viewTypes = {
	    'Int8': Int8Array,
	    'Uint8': Uint8Array,
	    'Uint8Clamped': Uint8ClampedArray,
	    'Int16': Int16Array,
	    'Uint16': Uint16Array,
	    'Int32': Int32Array,
	    'Uint32': Uint32Array,
	    'Float32': Float32Array,
	    'Float64': Float64Array
	};

	/**
	 * @typedef StructMember
	 * @private
	 * @property {string} name
	 * @property {string} type
	 * @property {number} components
	 */

	var structArrayTypeCache = {};

	/**
	 * `StructArrayType` is used to create new `StructArray` types.
	 *
	 * `StructArray` provides an abstraction over `ArrayBuffer` and `TypedArray` making it behave like
	 * an array of typed structs. A StructArray is comprised of elements. Each element has a set of
	 * members that are defined when the `StructArrayType` is created.
	 *
	 * StructArrays useful for creating large arrays that:
	 * - can be transferred from workers as a Transferable object
	 * - can be copied cheaply
	 * - use less memory for lower-precision members
	 * - can be used as buffers in WebGL.
	 *
	 * @class StructArrayType
	 * @param {Array.<StructMember>}
	 * @param options
	 * @param {number} options.alignment Use `4` to align members to 4 byte boundaries. Default is 1.
	 *
	 * @example
	 *
	 * var PointArrayType = new StructArrayType({
	 *  members: [
	 *      { type: 'Int16', name: 'x' },
	 *      { type: 'Int16', name: 'y' }
	 *  ]});
	 *
	 *  var pointArray = new PointArrayType();
	 *  pointArray.emplaceBack(10, 15);
	 *  pointArray.emplaceBack(20, 35);
	 *
	 *  point = pointArray.get(0);
	 *  assert(point.x === 10);
	 *  assert(point.y === 15);
	 *
	 * @private
	 */
	function StructArrayType(options) {

	    var key = JSON.stringify(options);
	    if (structArrayTypeCache[key]) {
	        return structArrayTypeCache[key];
	    }

	    if (options.alignment === undefined) options.alignment = 1;

	    function StructType() {
	        Struct.apply(this, arguments);
	    }

	    StructType.prototype = Object.create(Struct.prototype);

	    var offset = 0;
	    var maxSize = 0;
	    var usedTypes = ['Uint8'];

	    StructType.prototype.members = options.members.map(function(member) {
	        member = {
	            name: member.name,
	            type: member.type,
	            components: member.components || 1
	        };

	        assert$1(member.name.length);
	        assert$1(member.type in viewTypes);

	        if (usedTypes.indexOf(member.type) < 0) usedTypes.push(member.type);

	        var typeSize = sizeOf(member.type);
	        maxSize = Math.max(maxSize, typeSize);
	        member.offset = offset = align$1(offset, Math.max(options.alignment, typeSize));

	        for (var c = 0; c < member.components; c++) {
	            Object.defineProperty(StructType.prototype, member.name + (member.components === 1 ? '' : c), {
	                get: createGetter(member, c),
	                set: createSetter(member, c)
	            });
	        }

	        offset += typeSize * member.components;

	        return member;
	    });

	    StructType.prototype.alignment = options.alignment;
	    StructType.prototype.size = align$1(offset, Math.max(maxSize, options.alignment));

	    function StructArrayType() {
	        StructArray.apply(this, arguments);
	        this.members = StructType.prototype.members;
	    }

	    StructArrayType.serialize = serializeStructArrayType;

	    StructArrayType.prototype = Object.create(StructArray.prototype);
	    StructArrayType.prototype.StructType = StructType;
	    StructArrayType.prototype.bytesPerElement = StructType.prototype.size;
	    StructArrayType.prototype.emplaceBack = createEmplaceBack(StructType.prototype.members, StructType.prototype.size);
	    StructArrayType.prototype._usedTypes = usedTypes;


	    structArrayTypeCache[key] = StructArrayType;

	    return StructArrayType;
	}

	/**
	 * Serialize the StructArray type. This serializes the *type* not an instance of the type.
	 * @private
	 */
	function serializeStructArrayType() {
	    return {
	        members: this.prototype.StructType.prototype.members,
	        alignment: this.prototype.StructType.prototype.alignment,
	        bytesPerElement: this.prototype.bytesPerElement
	    };
	}


	function align$1(offset, size) {
	    return Math.ceil(offset / size) * size;
	}

	function sizeOf(type) {
	    return viewTypes[type].BYTES_PER_ELEMENT;
	}

	function getArrayViewName(type) {
	    return type.toLowerCase();
	}


	/*
	 * > I saw major perf gains by shortening the source of these generated methods (i.e. renaming
	 * > elementIndex to i) (likely due to v8 inlining heuristics).
	 * - lucaswoj
	 */
	function createEmplaceBack(members, bytesPerElement) {
	    var usedTypeSizes = [];
	    var argNames = [];
	    var body = '' +
	    'var i = this.length;\n' +
	    'this.resize(this.length + 1);\n';

	    for (var m = 0; m < members.length; m++) {
	        var member = members[m];
	        var size = sizeOf(member.type);

	        if (usedTypeSizes.indexOf(size) < 0) {
	            usedTypeSizes.push(size);
	            body += 'var o' + size.toFixed(0) + ' = i * ' + (bytesPerElement / size).toFixed(0) + ';\n';
	        }

	        for (var c = 0; c < member.components; c++) {
	            var argName = 'v' + argNames.length;
	            var index = 'o' + size.toFixed(0) + ' + ' + (member.offset / size + c).toFixed(0);
	            body += 'this.' + getArrayViewName(member.type) + '[' + index + '] = ' + argName + ';\n';
	            argNames.push(argName);
	        }
	    }

	    body += 'return i;';

	    return new Function(argNames, body);
	}

	function createMemberComponentString(member, component) {
	    var elementOffset = 'this._pos' + sizeOf(member.type).toFixed(0);
	    var componentOffset = (member.offset / sizeOf(member.type) + component).toFixed(0);
	    var index = elementOffset + ' + ' + componentOffset;
	    return 'this._structArray.' + getArrayViewName(member.type) + '[' + index + ']';

	}

	function createGetter(member, c) {
	    return new Function([], 'return ' + createMemberComponentString(member, c) + ';');
	}

	function createSetter(member, c) {
	    return new Function(['x'], createMemberComponentString(member, c) + ' = x;');
	}

	/**
	 * @class Struct
	 * @param {StructArray} structArray The StructArray the struct is stored in
	 * @param {number} index The index of the struct in the StructArray.
	 * @private
	 */
	function Struct(structArray, index) {
	    this._structArray = structArray;
	    this._pos1 = index * this.size;
	    this._pos2 = this._pos1 / 2;
	    this._pos4 = this._pos1 / 4;
	    this._pos8 = this._pos1 / 8;
	}

	/**
	 * @class StructArray
	 * The StructArray class is inherited by the custom StructArrayType classes created with
	 * `new StructArrayType(members, options)`.
	 * @private
	 */
	function StructArray(serialized) {
	    if (serialized !== undefined) {
	    // Create from an serialized StructArray
	        this.arrayBuffer = serialized.arrayBuffer;
	        this.length = serialized.length;
	        this.capacity = this.arrayBuffer.byteLength / this.bytesPerElement;
	        this._refreshViews();

	    // Create a new StructArray
	    } else {
	        this.capacity = -1;
	        this.resize(0);
	    }
	}

	/**
	 * @property {number}
	 * @private
	 * @readonly
	 */
	StructArray.prototype.DEFAULT_CAPACITY = 128;

	/**
	 * @property {number}
	 * @private
	 * @readonly
	 */
	StructArray.prototype.RESIZE_MULTIPLIER = 5;

	/**
	 * Serialize this StructArray instance
	 * @private
	 */
	StructArray.prototype.serialize = function() {
	    this.trim();
	    return {
	        length: this.length,
	        arrayBuffer: this.arrayBuffer
	    };
	};

	/**
	 * Return the Struct at the given location in the array.
	 * @private
	 * @param {number} index The index of the element.
	 */
	StructArray.prototype.get = function(index) {
	    return new this.StructType(this, index);
	};

	/**
	 * Resize the array to discard unused capacity.
	 * @private
	 */
	StructArray.prototype.trim = function() {
	    if (this.length !== this.capacity) {
	        this.capacity = this.length;
	        this.arrayBuffer = this.arrayBuffer.slice(0, this.length * this.bytesPerElement);
	        this._refreshViews();
	    }
	};

	/**
	 * Resize the array.
	 * If `n` is greater than the current length then additional elements with undefined values are added.
	 * If `n` is less than the current length then the array will be reduced to the first `n` elements.
	 * @param {number} n The new size of the array.
	 */
	StructArray.prototype.resize = function(n) {
	    this.length = n;
	    if (n > this.capacity) {
	        this.capacity = Math.max(n, Math.floor(this.capacity * this.RESIZE_MULTIPLIER), this.DEFAULT_CAPACITY);
	        this.arrayBuffer = new ArrayBuffer(this.capacity * this.bytesPerElement);

	        var oldUint8Array = this.uint8;
	        this._refreshViews();
	        if (oldUint8Array) this.uint8.set(oldUint8Array);
	    }
	};

	/**
	 * Create TypedArray views for the current ArrayBuffer.
	 * @private
	 */
	StructArray.prototype._refreshViews = function() {
	    for (var t = 0; t < this._usedTypes.length; t++) {
	        var type = this._usedTypes[t];
	        this[getArrayViewName(type)] = new viewTypes[type](this.arrayBuffer);
	    }
	};

	function VertexArrayObject() {
	    this.boundProgram = null;
	    this.boundVertexBuffer = null;
	    this.boundVertexBuffer2 = null;
	    this.boundElementBuffer = null;
	    this.vao = null;
	}

	VertexArrayObject.prototype.bind = function(gl, program, vertexBuffer, elementBuffer, vertexBuffer2) {

	    if (gl.extVertexArrayObject === undefined) {
	        gl.extVertexArrayObject = gl.getExtension("OES_vertex_array_object");
	    }

	    var isFreshBindRequired = (
	        !this.vao ||
	        this.boundProgram !== program ||
	        this.boundVertexBuffer !== vertexBuffer ||
	        this.boundVertexBuffer2 !== vertexBuffer2 ||
	        this.boundElementBuffer !== elementBuffer
	    );

	    if (!gl.extVertexArrayObject || isFreshBindRequired) {
	        this.freshBind(gl, program, vertexBuffer, elementBuffer, vertexBuffer2);
	    } else {
	        gl.extVertexArrayObject.bindVertexArrayOES(this.vao);
	    }
	};

	VertexArrayObject.prototype.freshBind = function(gl, program, vertexBuffer, elementBuffer, vertexBuffer2) {
	    var numPrevAttributes;
	    var numNextAttributes = program.numAttributes;

	    if (gl.extVertexArrayObject) {
	        if (this.vao) this.destroy(gl);
	        this.vao = gl.extVertexArrayObject.createVertexArrayOES();
	        gl.extVertexArrayObject.bindVertexArrayOES(this.vao);
	        numPrevAttributes = 0;

	        // store the arguments so that we can verify them when the vao is bound again
	        this.boundProgram = program;
	        this.boundVertexBuffer = vertexBuffer;
	        this.boundVertexBuffer2 = vertexBuffer2;
	        this.boundElementBuffer = elementBuffer;

	    } else {
	        numPrevAttributes = gl.currentNumAttributes || 0;
	        warnOnce('Not using VertexArrayObject extension.');

	        // Disable all attributes from the previous program that aren't used in
	        // the new program. Note: attribute indices are *not* program specific!
	        for (var i = numNextAttributes; i < numPrevAttributes; i++) {
	            // WebGL breaks if you disable attribute 0.
	            // http://stackoverflow.com/questions/20305231
	            assert$1(i !== 0);
	            gl.disableVertexAttribArray(i);
	        }
	    }

	    // Enable all attributes for the new program.
	    for (var j = numPrevAttributes; j < numNextAttributes; j++) {
	        gl.enableVertexAttribArray(j);
	    }

	    vertexBuffer.bind(gl);
	    vertexBuffer.setVertexAttribPointers(gl, program);
	    if (vertexBuffer2) {
	        vertexBuffer2.bind(gl);
	        vertexBuffer2.setVertexAttribPointers(gl, program);
	    }
	    if (elementBuffer) {
	        elementBuffer.bind(gl);
	    }

	    gl.currentNumAttributes = numNextAttributes;
	};

	VertexArrayObject.prototype.unbind = function(gl) {
	    var ext = gl.extVertexArrayObject;
	    if (ext) {
	        ext.bindVertexArrayOES(null);
	    }
	};

	VertexArrayObject.prototype.destroy = function(gl) {
	    var ext = gl.extVertexArrayObject;
	    if (ext && this.vao) {
	        ext.deleteVertexArrayOES(this.vao);
	        this.vao = null;
	    }
	};

	/**
	 * Instantiate the appropriate subclass of `Bucket` for `options`.
	 * @private
	 * @param options See `Bucket` constructor options
	 * @returns {Bucket}
	 */
	Bucket.create = function(options) {
	    var Classes = {
	        fill: FillBucket,
	        line: LineBucket,
	        circle: CircleBucket,
	        symbol: SymbolBucket
	    };
	    return new Classes[options.layer.type](options);
	};


	/**
	 * The maximum extent of a feature that can be safely stored in the buffer.
	 * In practice, all features are converted to this extent before being added.
	 *
	 * Positions are stored as signed 16bit integers.
	 * One bit is lost for signedness to support featuers extending past the left edge of the tile.
	 * One bit is lost because the line vertex buffer packs 1 bit of other data into the int.
	 * One bit is lost to support features extending past the extent on the right edge of the tile.
	 * This leaves us with 2^13 = 8192
	 *
	 * @private
	 * @readonly
	 */
	Bucket.EXTENT = 8192;

	/**
	 * The `Bucket` class is the single point of knowledge about turning vector
	 * tiles into WebGL buffers.
	 *
	 * `Bucket` is an abstract class. A subclass exists for each Mapbox GL
	 * style spec layer type. Because `Bucket` is an abstract class,
	 * instances should be created via the `Bucket.create` method.
	 *
	 * @class Bucket
	 * @private
	 * @param options
	 * @param {number} options.zoom Zoom level of the buffers being built. May be
	 *     a fractional zoom level.
	 * @param options.layer A Mapbox GL style layer object
	 * @param {Object.<string, Buffer>} options.buffers The set of `Buffer`s being
	 *     built for this tile. This object facilitates sharing of `Buffer`s be
	       between `Bucket`s.
	 */
	function Bucket(options) {
	    this.zoom = options.zoom;
	    this.overscaling = options.overscaling;
	    this.layer = options.layer;
	    this.childLayers = options.childLayers;

	    this.type = this.layer.type;
	    this.features = [];
	    this.id = this.layer.id;
	    this.index = options.index;
	    this.sourceLayer = this.layer.sourceLayer;
	    this.sourceLayerIndex = options.sourceLayerIndex;
	    this.minZoom = this.layer.minzoom;
	    this.maxZoom = this.layer.maxzoom;

	    this.paintAttributes = createPaintAttributes(this);

	    if (options.arrays) {
	        var childLayers = this.childLayers;
	        this.bufferGroups = mapObject(options.arrays, function(programArrayGroups, programName) {
	            return programArrayGroups.map(function(programArrayGroup) {

	                var group = mapObject(programArrayGroup, function(arrays, layoutOrPaint) {
	                    return mapObject(arrays, function(array, name) {
	                        var arrayType = options.arrayTypes[programName][layoutOrPaint][name];
	                        var type = (arrayType.members.length && arrayType.members[0].name === 'vertices' ? Buffer$1.BufferType.ELEMENT : Buffer$1.BufferType.VERTEX);
	                        return new Buffer$1(array, arrayType, type);
	                    });
	                });

	                group.vaos = {};
	                if (group.layout.element2) group.secondVaos = {};
	                for (var l = 0; l < childLayers.length; l++) {
	                    var layerName = childLayers[l].id;
	                    group.vaos[layerName] = new VertexArrayObject();
	                    if (group.layout.element2) group.secondVaos[layerName] = new VertexArrayObject();
	                }

	                return group;
	            });
	        });
	    }
	}

	/**
	 * Build the buffers! Features are set directly to the `features` property.
	 * @private
	 */
	Bucket.prototype.populateBuffers = function() {
	    this.createArrays();
	    this.recalculateStyleLayers();

	    for (var i = 0; i < this.features.length; i++) {
	        this.addFeature(this.features[i]);
	    }

	    this.trimArrays();
	};

	/**
	 * Check if there is enough space available in the current element group for
	 * `vertexLength` vertices. If not, append a new elementGroup. Should be called
	 * by `populateBuffers` and its callees.
	 * @private
	 * @param {string} programName the name of the program associated with the buffer that will receive the vertices
	 * @param {number} vertexLength The number of vertices that will be inserted to the buffer.
	 * @returns The current element group
	 */
	Bucket.prototype.makeRoomFor = function(programName, numVertices) {
	    var groups = this.arrayGroups[programName];
	    var currentGroup = groups.length && groups[groups.length - 1];

	    if (!currentGroup || currentGroup.layout.vertex.length + numVertices > 65535) {

	        var arrayTypes = this.arrayTypes[programName];
	        var VertexArrayType = arrayTypes.layout.vertex;
	        var ElementArrayType = arrayTypes.layout.element;
	        var ElementArrayType2 = arrayTypes.layout.element2;

	        currentGroup = {
	            index: groups.length,
	            layout: {},
	            paint: {}
	        };

	        currentGroup.layout.vertex = new VertexArrayType();
	        if (ElementArrayType) currentGroup.layout.element = new ElementArrayType();
	        if (ElementArrayType2) currentGroup.layout.element2 = new ElementArrayType2();

	        for (var i = 0; i < this.childLayers.length; i++) {
	            var layerName = this.childLayers[i].id;
	            var PaintVertexArrayType = arrayTypes.paint[layerName];
	            currentGroup.paint[layerName] = new PaintVertexArrayType();
	        }

	        groups.push(currentGroup);
	    }

	    return currentGroup;
	};

	/**
	 * Start using a new shared `buffers` object and recreate instances of `Buffer`
	 * as necessary.
	 * @private
	 */
	Bucket.prototype.createArrays = function() {
	    this.arrayGroups = {};
	    this.arrayTypes = {};

	    for (var programName in this.programInterfaces) {
	        var programInterface = this.programInterfaces[programName];
	        var programArrayTypes = this.arrayTypes[programName] = { layout: {}, paint: {} };
	        this.arrayGroups[programName] = [];

	        if (programInterface.vertexBuffer) {
	            var VertexArrayType = new StructArrayType({
	                members: this.programInterfaces[programName].layoutAttributes,
	                alignment: Buffer$1.VERTEX_ATTRIBUTE_ALIGNMENT
	            });

	            programArrayTypes.layout.vertex = VertexArrayType;

	            var layerPaintAttributes = this.paintAttributes[programName];
	            for (var layerName in layerPaintAttributes) {
	                var PaintVertexArrayType = new StructArrayType({
	                    members: layerPaintAttributes[layerName].attributes,
	                    alignment: Buffer$1.VERTEX_ATTRIBUTE_ALIGNMENT
	                });

	                programArrayTypes.paint[layerName] = PaintVertexArrayType;
	            }
	        }

	        if (programInterface.elementBuffer) {
	            var ElementArrayType = createElementBufferType(programInterface.elementBufferComponents);
	            programArrayTypes.layout.element = ElementArrayType;
	        }

	        if (programInterface.elementBuffer2) {
	            var ElementArrayType2 = createElementBufferType(programInterface.elementBuffer2Components);
	            programArrayTypes.layout.element2 = ElementArrayType2;
	        }
	    }
	};

	Bucket.prototype.destroy = function(gl) {
	    for (var programName in this.bufferGroups) {
	        var programBufferGroups = this.bufferGroups[programName];
	        for (var i = 0; i < programBufferGroups.length; i++) {
	            var programBuffers = programBufferGroups[i];
	            for (var paintBuffer in programBuffers.paint) {
	                programBuffers.paint[paintBuffer].destroy(gl);
	            }
	            for (var layoutBuffer in programBuffers.layout) {
	                programBuffers.layout[layoutBuffer].destroy(gl);
	            }
	            for (var j in programBuffers.vaos) {
	                programBuffers.vaos[j].destroy(gl);
	            }
	            for (var k in programBuffers.secondVaos) {
	                programBuffers.secondVaos[k].destroy(gl);
	            }
	        }
	    }

	};

	Bucket.prototype.trimArrays = function() {
	    for (var programName in this.arrayGroups) {
	        var programArrays = this.arrayGroups[programName];
	        for (var paintArray in programArrays.paint) {
	            programArrays.paint[paintArray].trim();
	        }
	        for (var layoutArray in programArrays.layout) {
	            programArrays.layout[layoutArray].trim();
	        }
	    }
	};

	Bucket.prototype.setUniforms = function(gl, programName, program, layer, globalProperties) {
	    var uniforms = this.paintAttributes[programName][layer.id].uniforms;
	    for (var i = 0; i < uniforms.length; i++) {
	        var uniform = uniforms[i];
	        var uniformLocation = program[uniform.name];
	        gl['uniform' + uniform.components + 'fv'](uniformLocation, uniform.getValue(layer, globalProperties));
	    }
	};

	Bucket.prototype.serialize = function() {
	    return {
	        layerId: this.layer.id,
	        zoom: this.zoom,
	        arrays: mapObject(this.arrayGroups, function(programArrayGroups) {
	            return programArrayGroups.map(function(arrayGroup) {
	                return mapObject(arrayGroup, function(arrays) {
	                    return mapObject(arrays, function(array) {
	                        return array.serialize();
	                    });
	                });
	            });
	        }),
	        arrayTypes: mapObject(this.arrayTypes, function(programArrayTypes) {
	            return mapObject(programArrayTypes, function(arrayTypes) {
	                return mapObject(arrayTypes, function(arrayType) {
	                    return arrayType.serialize();
	                });
	            });
	        }),

	        childLayerIds: this.childLayers.map(function(layer) {
	            return layer.id;
	        })
	    };
	};

	Bucket.prototype.createFilter = function() {
	    if (!this.filter) {
	        this.filter = featureFilter(this.layer.filter);
	    }
	};

	var FAKE_ZOOM_HISTORY = { lastIntegerZoom: Infinity, lastIntegerZoomTime: 0, lastZoom: 0 };
	Bucket.prototype.recalculateStyleLayers = function() {
	    for (var i = 0; i < this.childLayers.length; i++) {
	        this.childLayers[i].recalculate(this.zoom, FAKE_ZOOM_HISTORY);
	    }
	};

	Bucket.prototype.populatePaintArrays = function(interfaceName, globalProperties, featureProperties, startGroup, startIndex) {
	    for (var l = 0; l < this.childLayers.length; l++) {
	        var layer = this.childLayers[l];
	        var groups = this.arrayGroups[interfaceName];
	        for (var g = startGroup.index; g < groups.length; g++) {
	            var group = groups[g];
	            var length = group.layout.vertex.length;
	            var vertexArray = group.paint[layer.id];
	            vertexArray.resize(length);

	            var attributes = this.paintAttributes[interfaceName][layer.id].attributes;
	            for (var m = 0; m < attributes.length; m++) {
	                var attribute = attributes[m];

	                var value = attribute.getValue(layer, globalProperties, featureProperties);
	                var multiplier = attribute.multiplier || 1;
	                var components = attribute.components || 1;

	                for (var i = startIndex; i < length; i++) {
	                    var vertex = vertexArray.get(i);
	                    for (var c = 0; c < components; c++) {
	                        var memberName = components > 1 ? (attribute.name + c) : attribute.name;
	                        vertex[memberName] = value[c] * multiplier;
	                    }
	                }
	            }
	        }
	    }
	};

	function createElementBufferType(components) {
	    return new StructArrayType({
	        members: [{
	            type: Buffer$1.ELEMENT_ATTRIBUTE_TYPE,
	            name: 'vertices',
	            components: components || 3
	        }]
	    });
	}

	function createPaintAttributes(bucket) {
	    var attributes = {};
	    for (var interfaceName in bucket.programInterfaces) {
	        var layerPaintAttributes = attributes[interfaceName] = {};

	        for (var c = 0; c < bucket.childLayers.length; c++) {
	            var childLayer = bucket.childLayers[c];

	            layerPaintAttributes[childLayer.id] = {
	                attributes: [],
	                uniforms: [],
	                defines: [],
	                vertexPragmas: {},
	                fragmentPragmas: {}
	            };
	        }

	        var interface_ = bucket.programInterfaces[interfaceName];
	        if (!interface_.paintAttributes) continue;
	        for (var i = 0; i < interface_.paintAttributes.length; i++) {
	            var attribute = interface_.paintAttributes[i];
	            attribute.multiplier = attribute.multiplier || 1;

	            for (var j = 0; j < bucket.childLayers.length; j++) {
	                var layer = bucket.childLayers[j];
	                var paintAttributes = layerPaintAttributes[layer.id];

	                var attributeType = attribute.components === 1 ? 'float' : 'vec' + attribute.components;
	                var attributeInputName = attribute.name;
	                assert$1(attribute.name.slice(0, 2) === 'a_');
	                var attributeInnerName = attribute.name.slice(2);
	                var definePragma = 'define ' + attributeInnerName;
	                var initializePragma = 'initialize ' + attributeInnerName;
	                var attributeVaryingDefinition;

	                paintAttributes.fragmentPragmas[initializePragma] = '';

	                // This token is replaced by the first argument to the pragma,
	                // which must be the attribute's precision ("lowp", "mediump",
	                // or "highp")
	                var attributePrecision = '$1';

	                if (layer.isPaintValueFeatureConstant(attribute.paintProperty)) {
	                    paintAttributes.uniforms.push(attribute);

	                    paintAttributes.fragmentPragmas[definePragma] = paintAttributes.vertexPragmas[definePragma] = [
	                        'uniform',
	                        attributePrecision,
	                        attributeType,
	                        attributeInputName
	                    ].join(' ') + ';';

	                    paintAttributes.fragmentPragmas[initializePragma] = paintAttributes.vertexPragmas[initializePragma] = [
	                        attributePrecision,
	                        attributeType,
	                        attributeInnerName,
	                        '=',
	                        attributeInputName
	                    ].join(' ') + ';\n';

	                } else if (layer.isPaintValueZoomConstant(attribute.paintProperty)) {
	                    paintAttributes.attributes.push(extend({}, attribute, {
	                        name: attributeInputName
	                    }));

	                    attributeVaryingDefinition = [
	                        'varying',
	                        attributePrecision,
	                        attributeType,
	                        attributeInnerName
	                    ].join(' ') + ';\n';

	                    var attributeAttributeDefinition = [
	                        paintAttributes.fragmentPragmas[definePragma],
	                        'attribute',
	                        attributePrecision,
	                        attributeType,
	                        attributeInputName
	                    ].join(' ') + ';\n';

	                    paintAttributes.fragmentPragmas[definePragma] = attributeVaryingDefinition;

	                    paintAttributes.vertexPragmas[definePragma] = attributeVaryingDefinition + attributeAttributeDefinition;

	                    paintAttributes.vertexPragmas[initializePragma] = [
	                        attributeInnerName,
	                        '=',
	                        attributeInputName,
	                        '/',
	                        attribute.multiplier.toFixed(1)
	                    ].join(' ') + ';\n';

	                } else {

	                    var tName = 'u_' + attributeInputName.slice(2) + '_t';
	                    var zoomLevels = layer.getPaintValueStopZoomLevels(attribute.paintProperty);

	                    // Pick the index of the first offset to add to the buffers.
	                    // Find the four closest stops, ideally with two on each side of the zoom level.
	                    var numStops = 0;
	                    while (numStops < zoomLevels.length && zoomLevels[numStops] < bucket.zoom) numStops++;
	                    var stopOffset = Math.max(0, Math.min(zoomLevels.length - 4, numStops - 2));

	                    var fourZoomLevels = [];
	                    for (var s = 0; s < 4; s++) {
	                        fourZoomLevels.push(zoomLevels[Math.min(stopOffset + s, zoomLevels.length - 1)]);
	                    }

	                    attributeVaryingDefinition = [
	                        'varying',
	                        attributePrecision,
	                        attributeType,
	                        attributeInnerName
	                    ].join(' ') + ';\n';

	                    paintAttributes.vertexPragmas[definePragma] = attributeVaryingDefinition + [
	                        'uniform',
	                        'lowp',
	                        'float',
	                        tName
	                    ].join(' ') + ';\n';
	                    paintAttributes.fragmentPragmas[definePragma] = attributeVaryingDefinition;

	                    paintAttributes.uniforms.push(extend({}, attribute, {
	                        name: tName,
	                        getValue: createGetUniform(attribute, stopOffset),
	                        components: 1
	                    }));

	                    var components = attribute.components;
	                    if (components === 1) {

	                        paintAttributes.attributes.push(extend({}, attribute, {
	                            getValue: createFunctionGetValue(attribute, fourZoomLevels),
	                            isFunction: true,
	                            components: components * 4
	                        }));

	                        paintAttributes.vertexPragmas[definePragma] += [
	                            'attribute',
	                            attributePrecision,
	                            'vec4',
	                            attributeInputName
	                        ].join(' ') + ';\n';

	                        paintAttributes.vertexPragmas[initializePragma] = [
	                            attributeInnerName,
	                            '=',
	                            'evaluate_zoom_function_1(' + attributeInputName + ', ' + tName + ')',
	                            '/',
	                            attribute.multiplier.toFixed(1)
	                        ].join(' ') + ';\n';

	                    } else {

	                        var attributeInputNames = [];
	                        for (var k = 0; k < 4; k++) {
	                            attributeInputNames.push(attributeInputName + k);
	                            paintAttributes.attributes.push(extend({}, attribute, {
	                                getValue: createFunctionGetValue(attribute, [fourZoomLevels[k]]),
	                                isFunction: true,
	                                name: attributeInputName + k
	                            }));
	                            paintAttributes.vertexPragmas[definePragma] += [
	                                'attribute',
	                                attributePrecision,
	                                attributeType,
	                                attributeInputName + k
	                            ].join(' ') + ';\n';
	                        }
	                        paintAttributes.vertexPragmas[initializePragma] = [
	                            attributeInnerName,
	                            ' = ',
	                            'evaluate_zoom_function_4(' + attributeInputNames.join(', ') + ', ' + tName + ')',
	                            '/',
	                            attribute.multiplier.toFixed(1)
	                        ].join(' ') + ';\n';
	                    }
	                }
	            }
	        }
	    }
	    return attributes;
	}

	function createFunctionGetValue(attribute, stopZoomLevels) {
	    return function(layer, globalProperties, featureProperties) {
	        if (stopZoomLevels.length === 1) {
	            // return one multi-component value like color0
	            return attribute.getValue(layer, extend({}, globalProperties, { zoom: stopZoomLevels[0] }), featureProperties);
	        } else {
	            // pack multiple single-component values into a four component attribute
	            var values = [];
	            for (var z = 0; z < stopZoomLevels.length; z++) {
	                var stopZoomLevel = stopZoomLevels[z];
	                values.push(attribute.getValue(layer, extend({}, globalProperties, { zoom: stopZoomLevel }), featureProperties)[0]);
	            }
	            return values;
	        }
	    };
	}

	function createGetUniform(attribute, stopOffset) {
	    return function(layer, globalProperties) {
	        // stopInterp indicates which stops need to be interpolated.
	        // If stopInterp is 3.5 then interpolate half way between stops 3 and 4.
	        var stopInterp = layer.getPaintInterpolationT(attribute.paintProperty, globalProperties.zoom);
	        // We can only store four stop values in the buffers. stopOffset is the number of stops that come
	        // before the stops that were added to the buffers.
	        return [Math.max(0, Math.min(4, stopInterp - stopOffset))];
	    };
	}

	var EXTENT$1 = Bucket.EXTENT;
	var EXTENT_MIN = EXTENT$1 * -2;
	var EXTENT_MAX = (EXTENT$1 * 2) - 1;

	/**
	 * Loads a geometry from a VectorTileFeature and scales it to the common extent
	 * used internally.
	 * @private
	 */
	function loadGeometry(feature) {
	    var scale = EXTENT$1 / feature.extent;
	    var geometry = feature.loadGeometry();
	    for (var r = 0; r < geometry.length; r++) {
	        var ring = geometry[r];
	        for (var p = 0; p < ring.length; p++) {
	            var point = ring[p];
	            // round here because mapbox-gl-native uses integers to represent
	            // points and we need to do the same to avoid renering differences.
	            point.x = Math.round(point.x * scale);
	            point.y = Math.round(point.y * scale);
	            if (
	                point.x < EXTENT_MIN ||
	                point.x > EXTENT_MAX ||
	                point.y < EXTENT_MIN ||
	                point.y > EXTENT_MAX) {
	                warnOnce('Geometry exceeds allowed extent, reduce your vector tile buffer size');
	            }
	        }
	    }
	    return geometry;
	};

	var gridIndex = __commonjs(function (module) {
	'use strict';

	module.exports = GridIndex;

	var NUM_PARAMS = 3;

	function GridIndex(extent, n, padding) {
	    var cells = this.cells = [];

	    if (extent instanceof ArrayBuffer) {
	        this.arrayBuffer = extent;
	        var array = new Int32Array(this.arrayBuffer);
	        extent = array[0];
	        n = array[1];
	        padding = array[2];

	        this.d = n + 2 * padding;
	        for (var k = 0; k < this.d * this.d; k++) {
	            var start = array[NUM_PARAMS + k];
	            var end = array[NUM_PARAMS + k + 1];
	            cells.push(start === end ?
	                    null :
	                    array.subarray(start, end));
	        }
	        var keysOffset = array[NUM_PARAMS + cells.length];
	        var bboxesOffset = array[NUM_PARAMS + cells.length + 1];
	        this.keys = array.subarray(keysOffset, bboxesOffset);
	        this.bboxes = array.subarray(bboxesOffset);

	        this.insert = this._insertReadonly;

	    } else {
	        this.d = n + 2 * padding;
	        for (var i = 0; i < this.d * this.d; i++) {
	            cells.push([]);
	        }
	        this.keys = [];
	        this.bboxes = [];
	    }

	    this.n = n;
	    this.extent = extent;
	    this.padding = padding;
	    this.scale = n / extent;
	    this.uid = 0;

	    var p = (padding / n) * extent;
	    this.min = -p;
	    this.max = extent + p;
	}


	GridIndex.prototype.insert = function(key, x1, y1, x2, y2) {
	    this._forEachCell(x1, y1, x2, y2, this._insertCell, this.uid++);
	    this.keys.push(key);
	    this.bboxes.push(x1);
	    this.bboxes.push(y1);
	    this.bboxes.push(x2);
	    this.bboxes.push(y2);
	};

	GridIndex.prototype._insertReadonly = function() {
	    throw 'Cannot insert into a GridIndex created from an ArrayBuffer.';
	};

	GridIndex.prototype._insertCell = function(x1, y1, x2, y2, cellIndex, uid) {
	    this.cells[cellIndex].push(uid);
	};

	GridIndex.prototype.query = function(x1, y1, x2, y2) {
	    var min = this.min;
	    var max = this.max;
	    if (x1 <= min && y1 <= min && max <= x2 && max <= y2) {
	        return this.keys.slice();

	    } else {
	        var result = [];
	        var seenUids = {};
	        this._forEachCell(x1, y1, x2, y2, this._queryCell, result, seenUids);
	        return result;
	    }
	};

	GridIndex.prototype._queryCell = function(x1, y1, x2, y2, cellIndex, result, seenUids) {
	    var cell = this.cells[cellIndex];
	    if (cell !== null) {
	        var keys = this.keys;
	        var bboxes = this.bboxes;
	        for (var u = 0; u < cell.length; u++) {
	            var uid = cell[u];
	            if (seenUids[uid] === undefined) {
	                var offset = uid * 4;
	                if ((x1 <= bboxes[offset + 2]) &&
	                    (y1 <= bboxes[offset + 3]) &&
	                    (x2 >= bboxes[offset + 0]) &&
	                    (y2 >= bboxes[offset + 1])) {
	                    seenUids[uid] = true;
	                    result.push(keys[uid]);
	                } else {
	                    seenUids[uid] = false;
	                }
	            }
	        }
	    }
	};

	GridIndex.prototype._forEachCell = function(x1, y1, x2, y2, fn, arg1, arg2) {
	    var cx1 = this._convertToCellCoord(x1);
	    var cy1 = this._convertToCellCoord(y1);
	    var cx2 = this._convertToCellCoord(x2);
	    var cy2 = this._convertToCellCoord(y2);
	    for (var x = cx1; x <= cx2; x++) {
	        for (var y = cy1; y <= cy2; y++) {
	            var cellIndex = this.d * y + x;
	            if (fn.call(this, x1, y1, x2, y2, cellIndex, arg1, arg2)) return;
	        }
	    }
	};

	GridIndex.prototype._convertToCellCoord = function(x) {
	    return Math.max(0, Math.min(this.d - 1, Math.floor(x * this.scale) + this.padding));
	};

	GridIndex.prototype.toArrayBuffer = function() {
	    if (this.arrayBuffer) return this.arrayBuffer;

	    var cells = this.cells;

	    var metadataLength = NUM_PARAMS + this.cells.length + 1 + 1;
	    var totalCellLength = 0;
	    for (var i = 0; i < this.cells.length; i++) {
	        totalCellLength += this.cells[i].length;
	    }

	    var array = new Int32Array(metadataLength + totalCellLength + this.keys.length + this.bboxes.length);
	    array[0] = this.extent;
	    array[1] = this.n;
	    array[2] = this.padding;

	    var offset = metadataLength;
	    for (var k = 0; k < cells.length; k++) {
	        var cell = cells[k];
	        array[NUM_PARAMS + k] = offset;
	        array.set(cell, offset);
	        offset += cell.length;
	    }

	    array[NUM_PARAMS + cells.length] = offset;
	    array.set(this.keys, offset);
	    offset += this.keys.length;

	    array[NUM_PARAMS + cells.length + 1] = offset;
	    array.set(this.bboxes, offset);
	    offset += this.bboxes.length;

	    return array.buffer;
	};
	});

	var Grid = (gridIndex && typeof gridIndex === 'object' && 'default' in gridIndex ? gridIndex['default'] : gridIndex);

	function DictionaryCoder(strings) {
	    this._stringToNumber = {};
	    this._numberToString = [];
	    for (var i = 0; i < strings.length; i++) {
	        var string = strings[i];
	        this._stringToNumber[string] = i;
	        this._numberToString[i] = string;
	    }
	}

	DictionaryCoder.prototype.encode = function(string) {
	    assert$1(string in this._stringToNumber);
	    return this._stringToNumber[string];
	};

	DictionaryCoder.prototype.decode = function(n) {
	    assert$1(n < this._numberToString.length);
	    return this._numberToString[n];
	};

	var vectortilefeature = __commonjs(function (module) {
	'use strict';

	var Point = require$$1;

	module.exports = VectorTileFeature;

	function VectorTileFeature(pbf, end, extent, keys, values) {
	    // Public
	    this.properties = {};
	    this.extent = extent;
	    this.type = 0;

	    // Private
	    this._pbf = pbf;
	    this._geometry = -1;
	    this._keys = keys;
	    this._values = values;

	    pbf.readFields(readFeature, this, end);
	}

	function readFeature(tag, feature, pbf) {
	    if (tag == 1) feature._id = pbf.readVarint();
	    else if (tag == 2) readTag(pbf, feature);
	    else if (tag == 3) feature.type = pbf.readVarint();
	    else if (tag == 4) feature._geometry = pbf.pos;
	}

	function readTag(pbf, feature) {
	    var end = pbf.readVarint() + pbf.pos;

	    while (pbf.pos < end) {
	        var key = feature._keys[pbf.readVarint()],
	            value = feature._values[pbf.readVarint()];
	        feature.properties[key] = value;
	    }
	}

	VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];

	VectorTileFeature.prototype.loadGeometry = function() {
	    var pbf = this._pbf;
	    pbf.pos = this._geometry;

	    var end = pbf.readVarint() + pbf.pos,
	        cmd = 1,
	        length = 0,
	        x = 0,
	        y = 0,
	        lines = [],
	        line;

	    while (pbf.pos < end) {
	        if (!length) {
	            var cmdLen = pbf.readVarint();
	            cmd = cmdLen & 0x7;
	            length = cmdLen >> 3;
	        }

	        length--;

	        if (cmd === 1 || cmd === 2) {
	            x += pbf.readSVarint();
	            y += pbf.readSVarint();

	            if (cmd === 1) { // moveTo
	                if (line) lines.push(line);
	                line = [];
	            }

	            line.push(new Point(x, y));

	        } else if (cmd === 7) {

	            // Workaround for https://github.com/mapbox/mapnik-vector-tile/issues/90
	            if (line) {
	                line.push(line[0].clone()); // closePolygon
	            }

	        } else {
	            throw new Error('unknown command ' + cmd);
	        }
	    }

	    if (line) lines.push(line);

	    return lines;
	};

	VectorTileFeature.prototype.bbox = function() {
	    var pbf = this._pbf;
	    pbf.pos = this._geometry;

	    var end = pbf.readVarint() + pbf.pos,
	        cmd = 1,
	        length = 0,
	        x = 0,
	        y = 0,
	        x1 = Infinity,
	        x2 = -Infinity,
	        y1 = Infinity,
	        y2 = -Infinity;

	    while (pbf.pos < end) {
	        if (!length) {
	            var cmdLen = pbf.readVarint();
	            cmd = cmdLen & 0x7;
	            length = cmdLen >> 3;
	        }

	        length--;

	        if (cmd === 1 || cmd === 2) {
	            x += pbf.readSVarint();
	            y += pbf.readSVarint();
	            if (x < x1) x1 = x;
	            if (x > x2) x2 = x;
	            if (y < y1) y1 = y;
	            if (y > y2) y2 = y;

	        } else if (cmd !== 7) {
	            throw new Error('unknown command ' + cmd);
	        }
	    }

	    return [x1, y1, x2, y2];
	};

	VectorTileFeature.prototype.toGeoJSON = function(x, y, z) {
	    var size = this.extent * Math.pow(2, z),
	        x0 = this.extent * x,
	        y0 = this.extent * y,
	        coords = this.loadGeometry(),
	        type = VectorTileFeature.types[this.type],
	        i, j;

	    function project(line) {
	        for (var j = 0; j < line.length; j++) {
	            var p = line[j], y2 = 180 - (p.y + y0) * 360 / size;
	            line[j] = [
	                (p.x + x0) * 360 / size - 180,
	                360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90
	            ];
	        }
	    }

	    switch (this.type) {
	    case 1:
	        var points = [];
	        for (i = 0; i < coords.length; i++) {
	            points[i] = coords[i][0];
	        }
	        coords = points;
	        project(coords);
	        break;

	    case 2:
	        for (i = 0; i < coords.length; i++) {
	            project(coords[i]);
	        }
	        break;

	    case 3:
	        coords = classifyRings(coords);
	        for (i = 0; i < coords.length; i++) {
	            for (j = 0; j < coords[i].length; j++) {
	                project(coords[i][j]);
	            }
	        }
	        break;
	    }

	    if (coords.length === 1) {
	        coords = coords[0];
	    } else {
	        type = 'Multi' + type;
	    }

	    var result = {
	        type: "Feature",
	        geometry: {
	            type: type,
	            coordinates: coords
	        },
	        properties: this.properties
	    };

	    if ('_id' in this) {
	        result.id = this._id;
	    }

	    return result;
	};

	// classifies an array of rings into polygons with outer rings and holes

	function classifyRings(rings) {
	    var len = rings.length;

	    if (len <= 1) return [rings];

	    var polygons = [],
	        polygon,
	        ccw;

	    for (var i = 0; i < len; i++) {
	        var area = signedArea(rings[i]);
	        if (area === 0) continue;

	        if (ccw === undefined) ccw = area < 0;

	        if (ccw === area < 0) {
	            if (polygon) polygons.push(polygon);
	            polygon = [rings[i]];

	        } else {
	            polygon.push(rings[i]);
	        }
	    }
	    if (polygon) polygons.push(polygon);

	    return polygons;
	}

	function signedArea(ring) {
	    var sum = 0;
	    for (var i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
	        p1 = ring[i];
	        p2 = ring[j];
	        sum += (p2.x - p1.x) * (p1.y + p2.y);
	    }
	    return sum;
	}
	});

	var require$$0$2 = (vectortilefeature && typeof vectortilefeature === 'object' && 'default' in vectortilefeature ? vectortilefeature['default'] : vectortilefeature);

	var vectortilelayer = __commonjs(function (module) {
	'use strict';

	var VectorTileFeature = require$$0$2;

	module.exports = VectorTileLayer;

	function VectorTileLayer(pbf, end) {
	    // Public
	    this.version = 1;
	    this.name = null;
	    this.extent = 4096;
	    this.length = 0;

	    // Private
	    this._pbf = pbf;
	    this._keys = [];
	    this._values = [];
	    this._features = [];

	    pbf.readFields(readLayer, this, end);

	    this.length = this._features.length;
	}

	function readLayer(tag, layer, pbf) {
	    if (tag === 15) layer.version = pbf.readVarint();
	    else if (tag === 1) layer.name = pbf.readString();
	    else if (tag === 5) layer.extent = pbf.readVarint();
	    else if (tag === 2) layer._features.push(pbf.pos);
	    else if (tag === 3) layer._keys.push(pbf.readString());
	    else if (tag === 4) layer._values.push(readValueMessage(pbf));
	}

	function readValueMessage(pbf) {
	    var value = null,
	        end = pbf.readVarint() + pbf.pos;

	    while (pbf.pos < end) {
	        var tag = pbf.readVarint() >> 3;

	        value = tag === 1 ? pbf.readString() :
	            tag === 2 ? pbf.readFloat() :
	            tag === 3 ? pbf.readDouble() :
	            tag === 4 ? pbf.readVarint64() :
	            tag === 5 ? pbf.readVarint() :
	            tag === 6 ? pbf.readSVarint() :
	            tag === 7 ? pbf.readBoolean() : null;
	    }

	    return value;
	}

	// return feature `i` from this layer as a `VectorTileFeature`
	VectorTileLayer.prototype.feature = function(i) {
	    if (i < 0 || i >= this._features.length) throw new Error('feature index out of bounds');

	    this._pbf.pos = this._features[i];

	    var end = this._pbf.readVarint() + this._pbf.pos;
	    return new VectorTileFeature(this._pbf, end, this.extent, this._keys, this._values);
	};
	});

	var require$$0$1 = (vectortilelayer && typeof vectortilelayer === 'object' && 'default' in vectortilelayer ? vectortilelayer['default'] : vectortilelayer);

	var vectortile = __commonjs(function (module) {
	'use strict';

	var VectorTileLayer = require$$0$1;

	module.exports = VectorTile;

	function VectorTile(pbf, end) {
	    this.layers = pbf.readFields(readTile, {}, end);
	}

	function readTile(tag, layers, pbf) {
	    if (tag === 3) {
	        var layer = new VectorTileLayer(pbf, pbf.readVarint() + pbf.pos);
	        if (layer.length) layers[layer.name] = layer;
	    }
	}
	});

	var require$$2 = (vectortile && typeof vectortile === 'object' && 'default' in vectortile ? vectortile['default'] : vectortile);

	var index$4 = __commonjs(function (module) {
	module.exports.VectorTile = require$$2;
	module.exports.VectorTileFeature = require$$0$2;
	module.exports.VectorTileLayer = require$$0$1;
	});

	var require$$0 = (index$4 && typeof index$4 === 'object' && 'default' in index$4 ? index$4['default'] : index$4);

	var index$6 = __commonjs(function (module, exports) {
	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}
	});

	var require$$0$4 = (index$6 && typeof index$6 === 'object' && 'default' in index$6 ? index$6['default'] : index$6);

	var buffer = __commonjs(function (module) {
	'use strict';

	// lightweight Buffer shim for pbf browser build
	// based on code from github.com/feross/buffer (MIT-licensed)

	module.exports = Buffer;

	var ieee754 = require$$0$4;

	var BufferMethods;

	function Buffer(length) {
	    var arr;
	    if (length && length.length) {
	        arr = length;
	        length = arr.length;
	    }
	    var buf = new Uint8Array(length || 0);
	    if (arr) buf.set(arr);

	    buf.readUInt32LE = BufferMethods.readUInt32LE;
	    buf.writeUInt32LE = BufferMethods.writeUInt32LE;
	    buf.readInt32LE = BufferMethods.readInt32LE;
	    buf.writeInt32LE = BufferMethods.writeInt32LE;
	    buf.readFloatLE = BufferMethods.readFloatLE;
	    buf.writeFloatLE = BufferMethods.writeFloatLE;
	    buf.readDoubleLE = BufferMethods.readDoubleLE;
	    buf.writeDoubleLE = BufferMethods.writeDoubleLE;
	    buf.toString = BufferMethods.toString;
	    buf.write = BufferMethods.write;
	    buf.slice = BufferMethods.slice;
	    buf.copy = BufferMethods.copy;

	    buf._isBuffer = true;
	    return buf;
	}

	var lastStr, lastStrEncoded;

	BufferMethods = {
	    readUInt32LE: function(pos) {
	        return ((this[pos]) |
	            (this[pos + 1] << 8) |
	            (this[pos + 2] << 16)) +
	            (this[pos + 3] * 0x1000000);
	    },

	    writeUInt32LE: function(val, pos) {
	        this[pos] = val;
	        this[pos + 1] = (val >>> 8);
	        this[pos + 2] = (val >>> 16);
	        this[pos + 3] = (val >>> 24);
	    },

	    readInt32LE: function(pos) {
	        return ((this[pos]) |
	            (this[pos + 1] << 8) |
	            (this[pos + 2] << 16)) +
	            (this[pos + 3] << 24);
	    },

	    readFloatLE:  function(pos) { return ieee754.read(this, pos, true, 23, 4); },
	    readDoubleLE: function(pos) { return ieee754.read(this, pos, true, 52, 8); },

	    writeFloatLE:  function(val, pos) { return ieee754.write(this, val, pos, true, 23, 4); },
	    writeDoubleLE: function(val, pos) { return ieee754.write(this, val, pos, true, 52, 8); },

	    toString: function(encoding, start, end) {
	        var str = '',
	            tmp = '';

	        start = start || 0;
	        end = Math.min(this.length, end || this.length);

	        for (var i = start; i < end; i++) {
	            var ch = this[i];
	            if (ch <= 0x7F) {
	                str += decodeURIComponent(tmp) + String.fromCharCode(ch);
	                tmp = '';
	            } else {
	                tmp += '%' + ch.toString(16);
	            }
	        }

	        str += decodeURIComponent(tmp);

	        return str;
	    },

	    write: function(str, pos) {
	        var bytes = str === lastStr ? lastStrEncoded : encodeString(str);
	        for (var i = 0; i < bytes.length; i++) {
	            this[pos + i] = bytes[i];
	        }
	    },

	    slice: function(start, end) {
	        return this.subarray(start, end);
	    },

	    copy: function(buf, pos) {
	        pos = pos || 0;
	        for (var i = 0; i < this.length; i++) {
	            buf[pos + i] = this[i];
	        }
	    }
	};

	BufferMethods.writeInt32LE = BufferMethods.writeUInt32LE;

	Buffer.byteLength = function(str) {
	    lastStr = str;
	    lastStrEncoded = encodeString(str);
	    return lastStrEncoded.length;
	};

	Buffer.isBuffer = function(buf) {
	    return !!(buf && buf._isBuffer);
	};

	function encodeString(str) {
	    var length = str.length,
	        bytes = [];

	    for (var i = 0, c, lead; i < length; i++) {
	        c = str.charCodeAt(i); // code point

	        if (c > 0xD7FF && c < 0xE000) {

	            if (lead) {
	                if (c < 0xDC00) {
	                    bytes.push(0xEF, 0xBF, 0xBD);
	                    lead = c;
	                    continue;

	                } else {
	                    c = lead - 0xD800 << 10 | c - 0xDC00 | 0x10000;
	                    lead = null;
	                }

	            } else {
	                if (c > 0xDBFF || (i + 1 === length)) bytes.push(0xEF, 0xBF, 0xBD);
	                else lead = c;

	                continue;
	            }

	        } else if (lead) {
	            bytes.push(0xEF, 0xBF, 0xBD);
	            lead = null;
	        }

	        if (c < 0x80) bytes.push(c);
	        else if (c < 0x800) bytes.push(c >> 0x6 | 0xC0, c & 0x3F | 0x80);
	        else if (c < 0x10000) bytes.push(c >> 0xC | 0xE0, c >> 0x6 & 0x3F | 0x80, c & 0x3F | 0x80);
	        else bytes.push(c >> 0x12 | 0xF0, c >> 0xC & 0x3F | 0x80, c >> 0x6 & 0x3F | 0x80, c & 0x3F | 0x80);
	    }
	    return bytes;
	}
	});

	var require$$0$3 = (buffer && typeof buffer === 'object' && 'default' in buffer ? buffer['default'] : buffer);

	var index$5 = __commonjs(function (module, exports, global) {
	'use strict';

	module.exports = Pbf;

	var Buffer = global.Buffer || require$$0$3;

	function Pbf(buf) {
	    this.buf = !Buffer.isBuffer(buf) ? new Buffer(buf || 0) : buf;
	    this.pos = 0;
	    this.length = this.buf.length;
	}

	Pbf.Varint  = 0; // varint: int32, int64, uint32, uint64, sint32, sint64, bool, enum
	Pbf.Fixed64 = 1; // 64-bit: double, fixed64, sfixed64
	Pbf.Bytes   = 2; // length-delimited: string, bytes, embedded messages, packed repeated fields
	Pbf.Fixed32 = 5; // 32-bit: float, fixed32, sfixed32

	var SHIFT_LEFT_32 = (1 << 16) * (1 << 16),
	    SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32,
	    POW_2_63 = Math.pow(2, 63);

	Pbf.prototype = {

	    destroy: function() {
	        this.buf = null;
	    },

	    // === READING =================================================================

	    readFields: function(readField, result, end) {
	        end = end || this.length;

	        while (this.pos < end) {
	            var val = this.readVarint(),
	                tag = val >> 3,
	                startPos = this.pos;

	            readField(tag, result, this);

	            if (this.pos === startPos) this.skip(val);
	        }
	        return result;
	    },

	    readMessage: function(readField, result) {
	        return this.readFields(readField, result, this.readVarint() + this.pos);
	    },

	    readFixed32: function() {
	        var val = this.buf.readUInt32LE(this.pos);
	        this.pos += 4;
	        return val;
	    },

	    readSFixed32: function() {
	        var val = this.buf.readInt32LE(this.pos);
	        this.pos += 4;
	        return val;
	    },

	    // 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)

	    readFixed64: function() {
	        var val = this.buf.readUInt32LE(this.pos) + this.buf.readUInt32LE(this.pos + 4) * SHIFT_LEFT_32;
	        this.pos += 8;
	        return val;
	    },

	    readSFixed64: function() {
	        var val = this.buf.readUInt32LE(this.pos) + this.buf.readInt32LE(this.pos + 4) * SHIFT_LEFT_32;
	        this.pos += 8;
	        return val;
	    },

	    readFloat: function() {
	        var val = this.buf.readFloatLE(this.pos);
	        this.pos += 4;
	        return val;
	    },

	    readDouble: function() {
	        var val = this.buf.readDoubleLE(this.pos);
	        this.pos += 8;
	        return val;
	    },

	    readVarint: function() {
	        var buf = this.buf,
	            val, b;

	        b = buf[this.pos++]; val  =  b & 0x7f;        if (b < 0x80) return val;
	        b = buf[this.pos++]; val |= (b & 0x7f) << 7;  if (b < 0x80) return val;
	        b = buf[this.pos++]; val |= (b & 0x7f) << 14; if (b < 0x80) return val;
	        b = buf[this.pos++]; val |= (b & 0x7f) << 21; if (b < 0x80) return val;

	        return readVarintRemainder(val, this);
	    },

	    readVarint64: function() {
	        var startPos = this.pos,
	            val = this.readVarint();

	        if (val < POW_2_63) return val;

	        var pos = this.pos - 2;
	        while (this.buf[pos] === 0xff) pos--;
	        if (pos < startPos) pos = startPos;

	        val = 0;
	        for (var i = 0; i < pos - startPos + 1; i++) {
	            var b = ~this.buf[startPos + i] & 0x7f;
	            val += i < 4 ? b << i * 7 : b * Math.pow(2, i * 7);
	        }

	        return -val - 1;
	    },

	    readSVarint: function() {
	        var num = this.readVarint();
	        return num % 2 === 1 ? (num + 1) / -2 : num / 2; // zigzag encoding
	    },

	    readBoolean: function() {
	        return Boolean(this.readVarint());
	    },

	    readString: function() {
	        var end = this.readVarint() + this.pos,
	            str = this.buf.toString('utf8', this.pos, end);
	        this.pos = end;
	        return str;
	    },

	    readBytes: function() {
	        var end = this.readVarint() + this.pos,
	            buffer = this.buf.slice(this.pos, end);
	        this.pos = end;
	        return buffer;
	    },

	    // verbose for performance reasons; doesn't affect gzipped size

	    readPackedVarint: function() {
	        var end = this.readVarint() + this.pos, arr = [];
	        while (this.pos < end) arr.push(this.readVarint());
	        return arr;
	    },
	    readPackedSVarint: function() {
	        var end = this.readVarint() + this.pos, arr = [];
	        while (this.pos < end) arr.push(this.readSVarint());
	        return arr;
	    },
	    readPackedBoolean: function() {
	        var end = this.readVarint() + this.pos, arr = [];
	        while (this.pos < end) arr.push(this.readBoolean());
	        return arr;
	    },
	    readPackedFloat: function() {
	        var end = this.readVarint() + this.pos, arr = [];
	        while (this.pos < end) arr.push(this.readFloat());
	        return arr;
	    },
	    readPackedDouble: function() {
	        var end = this.readVarint() + this.pos, arr = [];
	        while (this.pos < end) arr.push(this.readDouble());
	        return arr;
	    },
	    readPackedFixed32: function() {
	        var end = this.readVarint() + this.pos, arr = [];
	        while (this.pos < end) arr.push(this.readFixed32());
	        return arr;
	    },
	    readPackedSFixed32: function() {
	        var end = this.readVarint() + this.pos, arr = [];
	        while (this.pos < end) arr.push(this.readSFixed32());
	        return arr;
	    },
	    readPackedFixed64: function() {
	        var end = this.readVarint() + this.pos, arr = [];
	        while (this.pos < end) arr.push(this.readFixed64());
	        return arr;
	    },
	    readPackedSFixed64: function() {
	        var end = this.readVarint() + this.pos, arr = [];
	        while (this.pos < end) arr.push(this.readSFixed64());
	        return arr;
	    },

	    skip: function(val) {
	        var type = val & 0x7;
	        if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
	        else if (type === Pbf.Bytes) this.pos = this.readVarint() + this.pos;
	        else if (type === Pbf.Fixed32) this.pos += 4;
	        else if (type === Pbf.Fixed64) this.pos += 8;
	        else throw new Error('Unimplemented type: ' + type);
	    },

	    // === WRITING =================================================================

	    writeTag: function(tag, type) {
	        this.writeVarint((tag << 3) | type);
	    },

	    realloc: function(min) {
	        var length = this.length || 16;

	        while (length < this.pos + min) length *= 2;

	        if (length !== this.length) {
	            var buf = new Buffer(length);
	            this.buf.copy(buf);
	            this.buf = buf;
	            this.length = length;
	        }
	    },

	    finish: function() {
	        this.length = this.pos;
	        this.pos = 0;
	        return this.buf.slice(0, this.length);
	    },

	    writeFixed32: function(val) {
	        this.realloc(4);
	        this.buf.writeUInt32LE(val, this.pos);
	        this.pos += 4;
	    },

	    writeSFixed32: function(val) {
	        this.realloc(4);
	        this.buf.writeInt32LE(val, this.pos);
	        this.pos += 4;
	    },

	    writeFixed64: function(val) {
	        this.realloc(8);
	        this.buf.writeInt32LE(val & -1, this.pos);
	        this.buf.writeUInt32LE(Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
	        this.pos += 8;
	    },

	    writeSFixed64: function(val) {
	        this.realloc(8);
	        this.buf.writeInt32LE(val & -1, this.pos);
	        this.buf.writeInt32LE(Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
	        this.pos += 8;
	    },

	    writeVarint: function(val) {
	        val = +val;

	        if (val > 0xfffffff) {
	            writeBigVarint(val, this);
	            return;
	        }

	        this.realloc(4);

	        this.buf[this.pos++] =           val & 0x7f  | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
	        this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
	        this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return;
	        this.buf[this.pos++] =   (val >>> 7) & 0x7f;
	    },

	    writeSVarint: function(val) {
	        this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2);
	    },

	    writeBoolean: function(val) {
	        this.writeVarint(Boolean(val));
	    },

	    writeString: function(str) {
	        str = String(str);
	        var bytes = Buffer.byteLength(str);
	        this.writeVarint(bytes);
	        this.realloc(bytes);
	        this.buf.write(str, this.pos);
	        this.pos += bytes;
	    },

	    writeFloat: function(val) {
	        this.realloc(4);
	        this.buf.writeFloatLE(val, this.pos);
	        this.pos += 4;
	    },

	    writeDouble: function(val) {
	        this.realloc(8);
	        this.buf.writeDoubleLE(val, this.pos);
	        this.pos += 8;
	    },

	    writeBytes: function(buffer) {
	        var len = buffer.length;
	        this.writeVarint(len);
	        this.realloc(len);
	        for (var i = 0; i < len; i++) this.buf[this.pos++] = buffer[i];
	    },

	    writeRawMessage: function(fn, obj) {
	        this.pos++; // reserve 1 byte for short message length

	        // write the message directly to the buffer and see how much was written
	        var startPos = this.pos;
	        fn(obj, this);
	        var len = this.pos - startPos;

	        if (len >= 0x80) reallocForRawMessage(startPos, len, this);

	        // finally, write the message length in the reserved place and restore the position
	        this.pos = startPos - 1;
	        this.writeVarint(len);
	        this.pos += len;
	    },

	    writeMessage: function(tag, fn, obj) {
	        this.writeTag(tag, Pbf.Bytes);
	        this.writeRawMessage(fn, obj);
	    },

	    writePackedVarint:   function(tag, arr) { this.writeMessage(tag, writePackedVarint, arr);   },
	    writePackedSVarint:  function(tag, arr) { this.writeMessage(tag, writePackedSVarint, arr);  },
	    writePackedBoolean:  function(tag, arr) { this.writeMessage(tag, writePackedBoolean, arr);  },
	    writePackedFloat:    function(tag, arr) { this.writeMessage(tag, writePackedFloat, arr);    },
	    writePackedDouble:   function(tag, arr) { this.writeMessage(tag, writePackedDouble, arr);   },
	    writePackedFixed32:  function(tag, arr) { this.writeMessage(tag, writePackedFixed32, arr);  },
	    writePackedSFixed32: function(tag, arr) { this.writeMessage(tag, writePackedSFixed32, arr); },
	    writePackedFixed64:  function(tag, arr) { this.writeMessage(tag, writePackedFixed64, arr);  },
	    writePackedSFixed64: function(tag, arr) { this.writeMessage(tag, writePackedSFixed64, arr); },

	    writeBytesField: function(tag, buffer) {
	        this.writeTag(tag, Pbf.Bytes);
	        this.writeBytes(buffer);
	    },
	    writeFixed32Field: function(tag, val) {
	        this.writeTag(tag, Pbf.Fixed32);
	        this.writeFixed32(val);
	    },
	    writeSFixed32Field: function(tag, val) {
	        this.writeTag(tag, Pbf.Fixed32);
	        this.writeSFixed32(val);
	    },
	    writeFixed64Field: function(tag, val) {
	        this.writeTag(tag, Pbf.Fixed64);
	        this.writeFixed64(val);
	    },
	    writeSFixed64Field: function(tag, val) {
	        this.writeTag(tag, Pbf.Fixed64);
	        this.writeSFixed64(val);
	    },
	    writeVarintField: function(tag, val) {
	        this.writeTag(tag, Pbf.Varint);
	        this.writeVarint(val);
	    },
	    writeSVarintField: function(tag, val) {
	        this.writeTag(tag, Pbf.Varint);
	        this.writeSVarint(val);
	    },
	    writeStringField: function(tag, str) {
	        this.writeTag(tag, Pbf.Bytes);
	        this.writeString(str);
	    },
	    writeFloatField: function(tag, val) {
	        this.writeTag(tag, Pbf.Fixed32);
	        this.writeFloat(val);
	    },
	    writeDoubleField: function(tag, val) {
	        this.writeTag(tag, Pbf.Fixed64);
	        this.writeDouble(val);
	    },
	    writeBooleanField: function(tag, val) {
	        this.writeVarintField(tag, Boolean(val));
	    }
	};

	function readVarintRemainder(val, pbf) {
	    var buf = pbf.buf, b;

	    b = buf[pbf.pos++]; val += (b & 0x7f) * 0x10000000;         if (b < 0x80) return val;
	    b = buf[pbf.pos++]; val += (b & 0x7f) * 0x800000000;        if (b < 0x80) return val;
	    b = buf[pbf.pos++]; val += (b & 0x7f) * 0x40000000000;      if (b < 0x80) return val;
	    b = buf[pbf.pos++]; val += (b & 0x7f) * 0x2000000000000;    if (b < 0x80) return val;
	    b = buf[pbf.pos++]; val += (b & 0x7f) * 0x100000000000000;  if (b < 0x80) return val;
	    b = buf[pbf.pos++]; val += (b & 0x7f) * 0x8000000000000000; if (b < 0x80) return val;

	    throw new Error('Expected varint not more than 10 bytes');
	}

	function writeBigVarint(val, pbf) {
	    pbf.realloc(10);

	    var maxPos = pbf.pos + 10;

	    while (val >= 1) {
	        if (pbf.pos >= maxPos) throw new Error('Given varint doesn\'t fit into 10 bytes');
	        var b = val & 0xff;
	        pbf.buf[pbf.pos++] = b | (val >= 0x80 ? 0x80 : 0);
	        val /= 0x80;
	    }
	}

	function reallocForRawMessage(startPos, len, pbf) {
	    var extraLen =
	        len <= 0x3fff ? 1 :
	        len <= 0x1fffff ? 2 :
	        len <= 0xfffffff ? 3 : Math.ceil(Math.log(len) / (Math.LN2 * 7));

	    // if 1 byte isn't enough for encoding message length, shift the data to the right
	    pbf.realloc(extraLen);
	    for (var i = pbf.pos - 1; i >= startPos; i--) pbf.buf[i + extraLen] = pbf.buf[i];
	}

	function writePackedVarint(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeVarint(arr[i]);   }
	function writePackedSVarint(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeSVarint(arr[i]);  }
	function writePackedFloat(arr, pbf)    { for (var i = 0; i < arr.length; i++) pbf.writeFloat(arr[i]);    }
	function writePackedDouble(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeDouble(arr[i]);   }
	function writePackedBoolean(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeBoolean(arr[i]);  }
	function writePackedFixed32(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed32(arr[i]);  }
	function writePackedSFixed32(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed32(arr[i]); }
	function writePackedFixed64(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed64(arr[i]);  }
	function writePackedSFixed64(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed64(arr[i]); }
	});

	var require$$2$1 = (index$5 && typeof index$5 === 'object' && 'default' in index$5 ? index$5['default'] : index$5);

	function Feature(vectorTileFeature, z, x, y) {
	    this._vectorTileFeature = vectorTileFeature;
	    vectorTileFeature._z = z;
	    vectorTileFeature._x = x;
	    vectorTileFeature._y = y;

	    this.properties = vectorTileFeature.properties;

	    if (vectorTileFeature._id) {
	        this.id = vectorTileFeature._id;
	    }
	}

	Feature.prototype = {
	    type: "Feature",

	    get geometry() {
	        if (this._geometry === undefined) {
	            this._geometry = this._vectorTileFeature.toGeoJSON(
	                this._vectorTileFeature._x,
	                this._vectorTileFeature._y,
	                this._vectorTileFeature._z).geometry;
	        }
	        return this._geometry;
	    },

	    set geometry(g) {
	        this._geometry = g;
	    },

	    toJSON: function() {
	        var json = {};
	        for (var i in this) {
	            if (i === '_geometry' || i === '_vectorTileFeature' || i === 'toJSON') continue;
	            json[i] = this[i];
	        }
	        return json;
	    }
	};

	var intersection = {
	    multiPolygonIntersectsBufferedMultiPoint: multiPolygonIntersectsBufferedMultiPoint$1,
	    multiPolygonIntersectsMultiPolygon: multiPolygonIntersectsMultiPolygon$1,
	    multiPolygonIntersectsBufferedMultiLine: multiPolygonIntersectsBufferedMultiLine$1
	};

	function multiPolygonIntersectsBufferedMultiPoint$1(multiPolygon, rings, radius) {
	    for (var j = 0; j < multiPolygon.length; j++) {
	        var polygon = multiPolygon[j];
	        for (var i = 0; i < rings.length; i++) {
	            var ring = rings[i];
	            for (var k = 0; k < ring.length; k++) {
	                var point = ring[k];
	                if (polygonContainsPoint(polygon, point)) return true;
	                if (pointIntersectsBufferedLine(point, polygon, radius)) return true;
	            }
	        }
	    }
	    return false;
	}

	function multiPolygonIntersectsMultiPolygon$1(multiPolygonA, multiPolygonB) {

	    if (multiPolygonA.length === 1 && multiPolygonA[0].length === 1) {
	        return multiPolygonContainsPoint(multiPolygonB, multiPolygonA[0][0]);
	    }

	    for (var m = 0; m < multiPolygonB.length; m++) {
	        var ring = multiPolygonB[m];
	        for (var n = 0; n < ring.length; n++) {
	            if (multiPolygonContainsPoint(multiPolygonA, ring[n])) return true;
	        }
	    }

	    for (var j = 0; j < multiPolygonA.length; j++) {
	        var polygon = multiPolygonA[j];
	        for (var i = 0; i < polygon.length; i++) {
	            if (multiPolygonContainsPoint(multiPolygonB, polygon[i])) return true;
	        }

	        for (var k = 0; k < multiPolygonB.length; k++) {
	            if (lineIntersectsLine(polygon, multiPolygonB[k])) return true;
	        }
	    }

	    return false;
	}

	function multiPolygonIntersectsBufferedMultiLine$1(multiPolygon, multiLine, radius) {
	    for (var i = 0; i < multiLine.length; i++) {
	        var line = multiLine[i];

	        for (var j = 0; j < multiPolygon.length; j++) {
	            var polygon = multiPolygon[j];

	            if (polygon.length >= 3) {
	                for (var k = 0; k < line.length; k++) {
	                    if (polygonContainsPoint(polygon, line[k])) return true;
	                }
	            }

	            if (lineIntersectsBufferedLine(polygon, line, radius)) return true;
	        }
	    }
	    return false;
	}

	function lineIntersectsBufferedLine(lineA, lineB, radius) {

	    if (lineA.length > 1) {
	        if (lineIntersectsLine(lineA, lineB)) return true;

	        // Check whether any point in either line is within radius of the other line
	        for (var j = 0; j < lineB.length; j++) {
	            if (pointIntersectsBufferedLine(lineB[j], lineA, radius)) return true;
	        }
	    }

	    for (var k = 0; k < lineA.length; k++) {
	        if (pointIntersectsBufferedLine(lineA[k], lineB, radius)) return true;
	    }

	    return false;
	}

	function lineIntersectsLine(lineA, lineB) {
	    for (var i = 0; i < lineA.length - 1; i++) {
	        var a0 = lineA[i];
	        var a1 = lineA[i + 1];
	        for (var j = 0; j < lineB.length - 1; j++) {
	            var b0 = lineB[j];
	            var b1 = lineB[j + 1];
	            if (lineSegmentIntersectsLineSegment(a0, a1, b0, b1)) return true;
	        }
	    }
	    return false;
	}


	// http://bryceboe.com/2006/10/23/line-segment-intersection-algorithm/
	function isCounterClockwise(a, b, c) {
	    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
	}

	function lineSegmentIntersectsLineSegment(a0, a1, b0, b1) {
	    return isCounterClockwise(a0, b0, b1) !== isCounterClockwise(a1, b0, b1) &&
	        isCounterClockwise(a0, a1, b0) !== isCounterClockwise(a0, a1, b1);
	}

	function pointIntersectsBufferedLine(p, line, radius) {
	    var radiusSquared = radius * radius;

	    if (line.length === 1) return p.distSqr(line[0]) < radiusSquared;

	    for (var i = 1; i < line.length; i++) {
	        // Find line segments that have a distance <= radius^2 to p
	        // In that case, we treat the line as "containing point p".
	        var v = line[i - 1], w = line[i];
	        if (distToSegmentSquared(p, v, w) < radiusSquared) return true;
	    }
	    return false;
	}

	// Code from http://stackoverflow.com/a/1501725/331379.
	function distToSegmentSquared(p, v, w) {
	    var l2 = v.distSqr(w);
	    if (l2 === 0) return p.distSqr(v);
	    var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
	    if (t < 0) return p.distSqr(v);
	    if (t > 1) return p.distSqr(w);
	    return p.distSqr(w.sub(v)._mult(t)._add(v));
	}

	// point in polygon ray casting algorithm
	function multiPolygonContainsPoint(rings, p) {
	    var c = false,
	        ring, p1, p2;

	    for (var k = 0; k < rings.length; k++) {
	        ring = rings[k];
	        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
	            p1 = ring[i];
	            p2 = ring[j];
	            if (((p1.y > p.y) !== (p2.y > p.y)) && (p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
	                c = !c;
	            }
	        }
	    }
	    return c;
	}

	function polygonContainsPoint(ring, p) {
	    var c = false;
	    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
	        var p1 = ring[i];
	        var p2 = ring[j];
	        if (((p1.y > p.y) !== (p2.y > p.y)) && (p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
	            c = !c;
	        }
	    }
	    return c;
	}

	var EXTENT = Bucket.EXTENT;
	var multiPolygonIntersectsBufferedMultiPoint = intersection.multiPolygonIntersectsBufferedMultiPoint;
	var multiPolygonIntersectsMultiPolygon = intersection.multiPolygonIntersectsMultiPolygon;
	var multiPolygonIntersectsBufferedMultiLine = intersection.multiPolygonIntersectsBufferedMultiLine;


	var FeatureIndexArray = new StructArrayType({
	    members: [
	        // the index of the feature in the original vectortile
	        { type: 'Uint32', name: 'featureIndex' },
	        // the source layer the feature appears in
	        { type: 'Uint16', name: 'sourceLayerIndex' },
	        // the bucket the feature appears in
	        { type: 'Uint16', name: 'bucketIndex' }
	    ]});

	function FeatureIndex(coord, overscaling, collisionTile) {
	    if (coord.grid) {
	        var serialized = coord;
	        var rawTileData = overscaling;
	        coord = serialized.coord;
	        overscaling = serialized.overscaling;
	        this.grid = new Grid(serialized.grid);
	        this.featureIndexArray = new FeatureIndexArray(serialized.featureIndexArray);
	        this.rawTileData = rawTileData;
	        this.bucketLayerIDs = serialized.bucketLayerIDs;
	    } else {
	        this.grid = new Grid(EXTENT, 16, 0);
	        this.featureIndexArray = new FeatureIndexArray();
	    }
	    this.coord = coord;
	    this.overscaling = overscaling;
	    this.x = coord.x;
	    this.y = coord.y;
	    this.z = coord.z - Math.log(overscaling) / Math.LN2;
	    this.setCollisionTile(collisionTile);
	}

	FeatureIndex.prototype.insert = function(feature, featureIndex, sourceLayerIndex, bucketIndex) {
	    var key = this.featureIndexArray.length;
	    this.featureIndexArray.emplaceBack(featureIndex, sourceLayerIndex, bucketIndex);
	    var geometry = loadGeometry(feature);

	    for (var r = 0; r < geometry.length; r++) {
	        var ring = geometry[r];

	        // TODO: skip holes when we start using vector tile spec 2.0

	        var bbox = [Infinity, Infinity, -Infinity, -Infinity];
	        for (var i = 0; i < ring.length; i++) {
	            var p = ring[i];
	            bbox[0] = Math.min(bbox[0], p.x);
	            bbox[1] = Math.min(bbox[1], p.y);
	            bbox[2] = Math.max(bbox[2], p.x);
	            bbox[3] = Math.max(bbox[3], p.y);
	        }

	        this.grid.insert(key, bbox[0], bbox[1], bbox[2], bbox[3]);
	    }
	};

	FeatureIndex.prototype.setCollisionTile = function(collisionTile) {
	    this.collisionTile = collisionTile;
	};

	FeatureIndex.prototype.serialize = function() {
	    var data = {
	        coord: this.coord,
	        overscaling: this.overscaling,
	        grid: this.grid.toArrayBuffer(),
	        featureIndexArray: this.featureIndexArray.serialize(),
	        bucketLayerIDs: this.bucketLayerIDs
	    };
	    return {
	        data: data,
	        transferables: [data.grid, data.featureIndexArray.arrayBuffer]
	    };
	};

	function translateDistance(translate) {
	    return Math.sqrt(translate[0] * translate[0] + translate[1] * translate[1]);
	}

	// Finds features in this tile at a particular position.
	FeatureIndex.prototype.query = function(args, styleLayers) {
	    if (!this.vtLayers) {
	        this.vtLayers = new require$$0.VectorTile(new require$$2$1(new Uint8Array(this.rawTileData))).layers;
	        this.sourceLayerCoder = new DictionaryCoder(this.vtLayers ? Object.keys(this.vtLayers).sort() : ['_geojsonTileLayer']);
	    }

	    var result = {};

	    var params = args.params || {},
	        pixelsToTileUnits = EXTENT / args.tileSize / args.scale,
	        filter = featureFilter(params.filter);

	    // Features are indexed their original geometries. The rendered geometries may
	    // be buffered, translated or offset. Figure out how much the search radius needs to be
	    // expanded by to include these features.
	    var additionalRadius = 0;
	    for (var id in styleLayers) {
	        var styleLayer = styleLayers[id];
	        var paint = styleLayer.paint;

	        var styleLayerDistance = 0;
	        if (styleLayer.type === 'line') {
	            styleLayerDistance = getLineWidth(paint) / 2 + Math.abs(paint['line-offset']) + translateDistance(paint['line-translate']);
	        } else if (styleLayer.type === 'fill') {
	            styleLayerDistance = translateDistance(paint['fill-translate']);
	        } else if (styleLayer.type === 'circle') {
	            styleLayerDistance = paint['circle-radius'] + translateDistance(paint['circle-translate']);
	        }
	        additionalRadius = Math.max(additionalRadius, styleLayerDistance * pixelsToTileUnits);
	    }

	    var queryGeometry = args.queryGeometry.map(function(q) {
	        return q.map(function(p) {
	            return new require$$1(p.x, p.y);
	        });
	    });

	    var minX = Infinity;
	    var minY = Infinity;
	    var maxX = -Infinity;
	    var maxY = -Infinity;
	    for (var i = 0; i < queryGeometry.length; i++) {
	        var ring = queryGeometry[i];
	        for (var k = 0; k < ring.length; k++) {
	            var p = ring[k];
	            minX = Math.min(minX, p.x);
	            minY = Math.min(minY, p.y);
	            maxX = Math.max(maxX, p.x);
	            maxY = Math.max(maxY, p.y);
	        }
	    }

	    var matching = this.grid.query(minX - additionalRadius, minY - additionalRadius, maxX + additionalRadius, maxY + additionalRadius);
	    matching.sort(topDownFeatureComparator);
	    this.filterMatching(result, matching, this.featureIndexArray, queryGeometry, filter, params.layers, styleLayers, args.bearing, pixelsToTileUnits);

	    var matchingSymbols = this.collisionTile.queryRenderedSymbols(minX, minY, maxX, maxY, args.scale);
	    matchingSymbols.sort();
	    this.filterMatching(result, matchingSymbols, this.collisionTile.collisionBoxArray, queryGeometry, filter, params.layers, styleLayers, args.bearing, pixelsToTileUnits);

	    return result;
	};

	function topDownFeatureComparator(a, b) {
	    return b - a;
	}

	function getLineWidth(paint) {
	    if (paint['line-gap-width'] > 0) {
	        return paint['line-gap-width'] + 2 * paint['line-width'];
	    } else {
	        return paint['line-width'];
	    }
	}

	FeatureIndex.prototype.filterMatching = function(result, matching, array, queryGeometry, filter, filterLayerIDs, styleLayers, bearing, pixelsToTileUnits) {
	    var previousIndex;
	    for (var k = 0; k < matching.length; k++) {
	        var index = matching[k];

	        // don't check the same feature more than once
	        if (index === previousIndex) continue;
	        previousIndex = index;

	        var match = array.get(index);

	        var layerIDs = this.bucketLayerIDs[match.bucketIndex];
	        if (filterLayerIDs && !arraysIntersect(filterLayerIDs, layerIDs)) continue;

	        var sourceLayerName = this.sourceLayerCoder.decode(match.sourceLayerIndex);
	        var sourceLayer = this.vtLayers[sourceLayerName];
	        var feature = sourceLayer.feature(match.featureIndex);

	        if (!filter(feature)) continue;

	        var geometry = null;

	        for (var l = 0; l < layerIDs.length; l++) {
	            var layerID = layerIDs[l];

	            if (filterLayerIDs && filterLayerIDs.indexOf(layerID) < 0) {
	                continue;
	            }

	            var styleLayer = styleLayers[layerID];
	            if (!styleLayer) continue;

	            var translatedPolygon;
	            if (styleLayer.type !== 'symbol') {
	                // all symbols already match the style

	                if (!geometry) geometry = loadGeometry(feature);

	                var paint = styleLayer.paint;

	                if (styleLayer.type === 'line') {
	                    translatedPolygon = translate(queryGeometry,
	                            paint['line-translate'], paint['line-translate-anchor'],
	                            bearing, pixelsToTileUnits);
	                    var halfWidth = getLineWidth(paint) / 2 * pixelsToTileUnits;
	                    if (paint['line-offset']) {
	                        geometry = offsetLine(geometry, paint['line-offset'] * pixelsToTileUnits);
	                    }
	                    if (!multiPolygonIntersectsBufferedMultiLine(translatedPolygon, geometry, halfWidth)) continue;

	                } else if (styleLayer.type === 'fill') {
	                    translatedPolygon = translate(queryGeometry,
	                            paint['fill-translate'], paint['fill-translate-anchor'],
	                            bearing, pixelsToTileUnits);
	                    if (!multiPolygonIntersectsMultiPolygon(translatedPolygon, geometry)) continue;

	                } else if (styleLayer.type === 'circle') {
	                    translatedPolygon = translate(queryGeometry,
	                            paint['circle-translate'], paint['circle-translate-anchor'],
	                            bearing, pixelsToTileUnits);
	                    var circleRadius = paint['circle-radius'] * pixelsToTileUnits;
	                    if (!multiPolygonIntersectsBufferedMultiPoint(translatedPolygon, geometry, circleRadius)) continue;
	                }
	            }

	            var geojsonFeature = new Feature(feature, this.z, this.x, this.y);
	            geojsonFeature.layer = styleLayer.serialize({
	                includeRefProperties: true
	            });
	            var layerResult = result[layerID];
	            if (layerResult === undefined) {
	                layerResult = result[layerID] = [];
	            }
	            layerResult.push(geojsonFeature);
	        }
	    }
	};

	function translate(queryGeometry, translate, translateAnchor, bearing, pixelsToTileUnits) {
	    if (!translate[0] && !translate[1]) {
	        return queryGeometry;
	    }

	    translate = require$$1.convert(translate);

	    if (translateAnchor === "viewport") {
	        translate._rotate(-bearing);
	    }

	    var translated = [];
	    for (var i = 0; i < queryGeometry.length; i++) {
	        var ring = queryGeometry[i];
	        var translatedRing = [];
	        for (var k = 0; k < ring.length; k++) {
	            translatedRing.push(ring[k].sub(translate._mult(pixelsToTileUnits)));
	        }
	        translated.push(translatedRing);
	    }
	    return translated;
	}

	function offsetLine(rings, offset) {
	    var newRings = [];
	    var zero = new require$$1(0, 0);
	    for (var k = 0; k < rings.length; k++) {
	        var ring = rings[k];
	        var newRing = [];
	        for (var i = 0; i < ring.length; i++) {
	            var a = ring[i - 1];
	            var b = ring[i];
	            var c = ring[i + 1];
	            var aToB = i === 0 ? zero : b.sub(a)._unit()._perp();
	            var bToC = i === ring.length - 1 ? zero : c.sub(b)._unit()._perp();
	            var extrude = aToB._add(bToC)._unit();

	            var cosHalfAngle = extrude.x * bToC.x + extrude.y * bToC.y;
	            extrude._mult(1 / cosHalfAngle);

	            newRing.push(extrude._mult(offset)._add(b));
	        }
	        newRings.push(newRing);
	    }
	    return newRings;
	}

	var EXTENT$5 = Bucket.EXTENT;
	/**
	 * A collision tile used to prevent symbols from overlapping. It keep tracks of
	 * where previous symbols have been placed and is used to check if a new
	 * symbol overlaps with any previously added symbols.
	 *
	 * @class CollisionTile
	 * @param {number} angle
	 * @param {number} pitch
	 * @private
	 */
	function CollisionTile(angle, pitch, collisionBoxArray) {
	    if (typeof angle === 'object') {
	        var serialized = angle;
	        collisionBoxArray = pitch;
	        angle = serialized.angle;
	        pitch = serialized.pitch;
	        this.grid = new Grid(serialized.grid);
	        this.ignoredGrid = new Grid(serialized.ignoredGrid);
	    } else {
	        this.grid = new Grid(EXTENT$5, 12, 6);
	        this.ignoredGrid = new Grid(EXTENT$5, 12, 0);
	    }

	    this.angle = angle;
	    this.pitch = pitch;

	    var sin = Math.sin(angle),
	        cos = Math.cos(angle);
	    this.rotationMatrix = [cos, -sin, sin, cos];
	    this.reverseRotationMatrix = [cos, sin, -sin, cos];

	    // Stretch boxes in y direction to account for the map tilt.
	    this.yStretch = 1 / Math.cos(pitch / 180 * Math.PI);

	    // The amount the map is squished depends on the y position.
	    // Sort of account for this by making all boxes a bit bigger.
	    this.yStretch = Math.pow(this.yStretch, 1.3);

	    this.collisionBoxArray = collisionBoxArray;
	    if (collisionBoxArray.length === 0) {
	        // the first collisionBoxArray is passed to a CollisionTile

	        // tempCollisionBox
	        collisionBoxArray.emplaceBack();

	        var maxInt16 = 32767;
	        //left
	        collisionBoxArray.emplaceBack(0, 0, 0, -maxInt16, 0, maxInt16, maxInt16,
	                0, 0, 0, 0, 0, 0, 0, 0,
	                0);
	        // right
	        collisionBoxArray.emplaceBack(EXTENT$5, 0, 0, -maxInt16, 0, maxInt16, maxInt16,
	                0, 0, 0, 0, 0, 0, 0, 0,
	                0);
	        // top
	        collisionBoxArray.emplaceBack(0, 0, -maxInt16, 0, maxInt16, 0, maxInt16,
	                0, 0, 0, 0, 0, 0, 0, 0,
	                0);
	        // bottom
	        collisionBoxArray.emplaceBack(0, EXTENT$5, -maxInt16, 0, maxInt16, 0, maxInt16,
	                0, 0, 0, 0, 0, 0, 0, 0,
	                0);
	    }

	    this.tempCollisionBox = collisionBoxArray.get(0);
	    this.edges = [
	        collisionBoxArray.get(1),
	        collisionBoxArray.get(2),
	        collisionBoxArray.get(3),
	        collisionBoxArray.get(4)
	    ];
	}

	CollisionTile.prototype.serialize = function() {
	    var data = {
	        angle: this.angle,
	        pitch: this.pitch,
	        grid: this.grid.toArrayBuffer(),
	        ignoredGrid: this.ignoredGrid.toArrayBuffer()
	    };
	    return {
	        data: data,
	        transferables: [data.grid, data.ignoredGrid]
	    };
	};

	CollisionTile.prototype.minScale = 0.25;
	CollisionTile.prototype.maxScale = 2;


	/**
	 * Find the scale at which the collisionFeature can be shown without
	 * overlapping with other features.
	 *
	 * @param {CollisionFeature} collisionFeature
	 * @returns {number} placementScale
	 * @private
	 */
	CollisionTile.prototype.placeCollisionFeature = function(collisionFeature, allowOverlap, avoidEdges) {

	    var collisionBoxArray = this.collisionBoxArray;
	    var minPlacementScale = this.minScale;
	    var rotationMatrix = this.rotationMatrix;
	    var yStretch = this.yStretch;

	    for (var b = collisionFeature.boxStartIndex; b < collisionFeature.boxEndIndex; b++) {

	        var box = collisionBoxArray.get(b);

	        var anchorPoint = box.anchorPoint._matMult(rotationMatrix);
	        var x = anchorPoint.x;
	        var y = anchorPoint.y;

	        var x1 = x + box.x1;
	        var y1 = y + box.y1 * yStretch;
	        var x2 = x + box.x2;
	        var y2 = y + box.y2 * yStretch;

	        box.bbox0 = x1;
	        box.bbox1 = y1;
	        box.bbox2 = x2;
	        box.bbox3 = y2;

	        if (!allowOverlap) {
	            var blockingBoxes = this.grid.query(x1, y1, x2, y2);

	            for (var i = 0; i < blockingBoxes.length; i++) {
	                var blocking = collisionBoxArray.get(blockingBoxes[i]);
	                var blockingAnchorPoint = blocking.anchorPoint._matMult(rotationMatrix);

	                minPlacementScale = this.getPlacementScale(minPlacementScale, anchorPoint, box, blockingAnchorPoint, blocking);
	                if (minPlacementScale >= this.maxScale) {
	                    return minPlacementScale;
	                }
	            }
	        }

	        if (avoidEdges) {
	            var rotatedCollisionBox;

	            if (this.angle) {
	                var reverseRotationMatrix = this.reverseRotationMatrix;
	                var tl = new require$$1(box.x1, box.y1).matMult(reverseRotationMatrix);
	                var tr = new require$$1(box.x2, box.y1).matMult(reverseRotationMatrix);
	                var bl = new require$$1(box.x1, box.y2).matMult(reverseRotationMatrix);
	                var br = new require$$1(box.x2, box.y2).matMult(reverseRotationMatrix);

	                rotatedCollisionBox = this.tempCollisionBox;
	                rotatedCollisionBox.anchorPointX = box.anchorPoint.x;
	                rotatedCollisionBox.anchorPointY = box.anchorPoint.y;
	                rotatedCollisionBox.x1 = Math.min(tl.x, tr.x, bl.x, br.x);
	                rotatedCollisionBox.y1 = Math.min(tl.y, tr.x, bl.x, br.x);
	                rotatedCollisionBox.x2 = Math.max(tl.x, tr.x, bl.x, br.x);
	                rotatedCollisionBox.y2 = Math.max(tl.y, tr.x, bl.x, br.x);
	                rotatedCollisionBox.maxScale = box.maxScale;
	            } else {
	                rotatedCollisionBox = box;
	            }

	            for (var k = 0; k < this.edges.length; k++) {
	                var edgeBox = this.edges[k];
	                minPlacementScale = this.getPlacementScale(minPlacementScale, box.anchorPoint, rotatedCollisionBox, edgeBox.anchorPoint, edgeBox);
	                if (minPlacementScale >= this.maxScale) {
	                    return minPlacementScale;
	                }
	            }
	        }
	    }

	    return minPlacementScale;
	};

	CollisionTile.prototype.queryRenderedSymbols = function(minX, minY, maxX, maxY, scale) {
	    var sourceLayerFeatures = {};
	    var result = [];

	    var collisionBoxArray = this.collisionBoxArray;
	    var rotationMatrix = this.rotationMatrix;
	    var anchorPoint = new require$$1(minX, minY)._matMult(rotationMatrix);

	    var queryBox = this.tempCollisionBox;
	    queryBox.anchorX = anchorPoint.x;
	    queryBox.anchorY = anchorPoint.y;
	    queryBox.x1 = 0;
	    queryBox.y1 = 0;
	    queryBox.x2 = maxX - minX;
	    queryBox.y2 = maxY - minY;
	    queryBox.maxScale = scale;

	    // maxScale is stored using a Float32. Convert `scale` to the stored Float32 value.
	    scale = queryBox.maxScale;

	    var searchBox = [
	        anchorPoint.x + queryBox.x1 / scale,
	        anchorPoint.y + queryBox.y1 / scale * this.yStretch,
	        anchorPoint.x + queryBox.x2 / scale,
	        anchorPoint.y + queryBox.y2 / scale * this.yStretch
	    ];

	    var blockingBoxKeys = this.grid.query(searchBox[0], searchBox[1], searchBox[2], searchBox[3]);
	    var blockingBoxKeys2 = this.ignoredGrid.query(searchBox[0], searchBox[1], searchBox[2], searchBox[3]);
	    for (var k = 0; k < blockingBoxKeys2.length; k++) {
	        blockingBoxKeys.push(blockingBoxKeys2[k]);
	    }

	    for (var i = 0; i < blockingBoxKeys.length; i++) {
	        var blocking = collisionBoxArray.get(blockingBoxKeys[i]);

	        var sourceLayer = blocking.sourceLayerIndex;
	        var featureIndex = blocking.featureIndex;
	        if (sourceLayerFeatures[sourceLayer] === undefined) {
	            sourceLayerFeatures[sourceLayer] = {};
	        }

	        if (!sourceLayerFeatures[sourceLayer][featureIndex]) {
	            var blockingAnchorPoint = blocking.anchorPoint.matMult(rotationMatrix);
	            var minPlacementScale = this.getPlacementScale(this.minScale, anchorPoint, queryBox, blockingAnchorPoint, blocking);
	            if (minPlacementScale >= scale) {
	                sourceLayerFeatures[sourceLayer][featureIndex] = true;
	                result.push(blockingBoxKeys[i]);
	            }
	        }
	    }

	    return result;
	};

	CollisionTile.prototype.getPlacementScale = function(minPlacementScale, anchorPoint, box, blockingAnchorPoint, blocking) {

	    // Find the lowest scale at which the two boxes can fit side by side without overlapping.
	    // Original algorithm:
	    var anchorDiffX = anchorPoint.x - blockingAnchorPoint.x;
	    var anchorDiffY = anchorPoint.y - blockingAnchorPoint.y;
	    var s1 = (blocking.x1 - box.x2) / anchorDiffX; // scale at which new box is to the left of old box
	    var s2 = (blocking.x2 - box.x1) / anchorDiffX; // scale at which new box is to the right of old box
	    var s3 = (blocking.y1 - box.y2) * this.yStretch / anchorDiffY; // scale at which new box is to the top of old box
	    var s4 = (blocking.y2 - box.y1) * this.yStretch / anchorDiffY; // scale at which new box is to the bottom of old box

	    if (isNaN(s1) || isNaN(s2)) s1 = s2 = 1;
	    if (isNaN(s3) || isNaN(s4)) s3 = s4 = 1;

	    var collisionFreeScale = Math.min(Math.max(s1, s2), Math.max(s3, s4));
	    var blockingMaxScale = blocking.maxScale;
	    var boxMaxScale = box.maxScale;

	    if (collisionFreeScale > blockingMaxScale) {
	        // After a box's maxScale the label has shrunk enough that the box is no longer needed to cover it,
	        // so unblock the new box at the scale that the old box disappears.
	        collisionFreeScale = blockingMaxScale;
	    }

	    if (collisionFreeScale > boxMaxScale) {
	        // If the box can only be shown after it is visible, then the box can never be shown.
	        // But the label can be shown after this box is not visible.
	        collisionFreeScale = boxMaxScale;
	    }

	    if (collisionFreeScale > minPlacementScale &&
	            collisionFreeScale >= blocking.placementScale) {
	        // If this collision occurs at a lower scale than previously found collisions
	        // and the collision occurs while the other label is visible

	        // this this is the lowest scale at which the label won't collide with anything
	        minPlacementScale = collisionFreeScale;
	    }

	    return minPlacementScale;
	};


	/**
	 * Remember this collisionFeature and what scale it was placed at to block
	 * later features from overlapping with it.
	 *
	 * @param {CollisionFeature} collisionFeature
	 * @param {number} minPlacementScale
	 * @private
	 */
	CollisionTile.prototype.insertCollisionFeature = function(collisionFeature, minPlacementScale, ignorePlacement) {

	    var grid = ignorePlacement ? this.ignoredGrid : this.grid;
	    var collisionBoxArray = this.collisionBoxArray;

	    for (var k = collisionFeature.boxStartIndex; k < collisionFeature.boxEndIndex; k++) {
	        var box = collisionBoxArray.get(k);
	        box.placementScale = minPlacementScale;
	        if (minPlacementScale < this.maxScale) {
	            grid.insert(k, box.bbox0, box.bbox1, box.bbox2, box.bbox3);
	        }
	    }
	};

	/**
	 * A collision box represents an area of the map that that is covered by a
	 * label. CollisionFeature uses one or more of these collision boxes to
	 * represent all the area covered by a single label. They are used to
	 * prevent collisions between labels.
	 *
	 * A collision box actually represents a 3d volume. The first two dimensions,
	 * x and y, are specified with `anchor` along with `x1`, `y1`, `x2`, `y2`.
	 * The third dimension, zoom, is limited by `maxScale` which determines
	 * how far in the z dimensions the box extends.
	 *
	 * As you zoom in on a map, all points on the map get further and further apart
	 * but labels stay roughly the same size. Labels cover less real world area on
	 * the map at higher zoom levels than they do at lower zoom levels. This is why
	 * areas are are represented with an anchor point and offsets from that point
	 * instead of just using four absolute points.
	 *
	 * Line labels are represented by a set of these boxes spaced out along a line.
	 * When you zoom in, line labels cover less real world distance along the line
	 * than they used to. Collision boxes near the edges that used to cover label
	 * no longer do. If a box doesn't cover the label anymore it should be ignored
	 * when doing collision checks. `maxScale` is how much you can scale the map
	 * before the label isn't within the box anymore.
	 * For example
	 * lower zoom:
	 * https://cloud.githubusercontent.com/assets/1421652/8060094/4d975f76-0e91-11e5-84b1-4edeb30a5875.png
	 * slightly higher zoom:
	 * https://cloud.githubusercontent.com/assets/1421652/8060061/26ae1c38-0e91-11e5-8c5a-9f380bf29f0a.png
	 * In the zoomed in image the two grey boxes on either side don't cover the
	 * label anymore. Their maxScale is smaller than the current scale.
	 *
	 *
	 * @class CollisionBoxArray
	 * @private
	 */

	var CollisionBoxArray = new StructArrayType({
	    members: [
	        // the box is centered around the anchor point
	        { type: 'Int16', name: 'anchorPointX' },
	        { type: 'Int16', name: 'anchorPointY' },

	        // distances to the edges from the anchor
	        { type: 'Int16', name: 'x1' },
	        { type: 'Int16', name: 'y1' },
	        { type: 'Int16', name: 'x2' },
	        { type: 'Int16', name: 'y2' },

	        // the box is only valid for scales < maxScale.
	        // The box does not block other boxes at scales >= maxScale;
	        { type: 'Float32', name: 'maxScale' },

	        // the index of the feature in the original vectortile
	        { type: 'Uint32', name: 'featureIndex' },
	        // the source layer the feature appears in
	        { type: 'Uint16', name: 'sourceLayerIndex' },
	        // the bucket the feature appears in
	        { type: 'Uint16', name: 'bucketIndex' },

	        // rotated and scaled bbox used for indexing
	        { type: 'Int16', name: 'bbox0' },
	        { type: 'Int16', name: 'bbox1' },
	        { type: 'Int16', name: 'bbox2' },
	        { type: 'Int16', name: 'bbox3' },

	        { type: 'Float32', name: 'placementScale' }
	    ]});

	extendAll(CollisionBoxArray.prototype.StructType.prototype, {
	    get anchorPoint() {
	        return new require$$1(this.anchorPointX, this.anchorPointY);
	    }
	});

	function WorkerTile(params) {
	    this.coord = params.coord;
	    this.uid = params.uid;
	    this.zoom = params.zoom;
	    this.tileSize = params.tileSize;
	    this.source = params.source;
	    this.overscaling = params.overscaling;
	    this.angle = params.angle;
	    this.pitch = params.pitch;
	    this.showCollisionBoxes = params.showCollisionBoxes;
	}

	WorkerTile.prototype.parse = function(data, layerFamilies, actor, rawTileData, callback) {

	    this.status = 'parsing';
	    this.data = data;

	    this.collisionBoxArray = new CollisionBoxArray();
	    var collisionTile = new CollisionTile(this.angle, this.pitch, this.collisionBoxArray);
	    var featureIndex = new FeatureIndex(this.coord, this.overscaling, collisionTile, data.layers);
	    var sourceLayerCoder = new DictionaryCoder(data.layers ? Object.keys(data.layers).sort() : ['_geojsonTileLayer']);

	    var stats = { _total: 0 };

	    var tile = this;
	    var bucketsById = {};
	    var bucketsBySourceLayer = {};
	    var i;
	    var layer;
	    var sourceLayerId;
	    var bucket;

	    // Map non-ref layers to buckets.
	    var bucketIndex = 0;
	    for (var layerId in layerFamilies) {
	        layer = layerFamilies[layerId][0];

	        if (layer.source !== this.source) continue;
	        if (layer.ref) continue;
	        if (layer.minzoom && this.zoom < layer.minzoom) continue;
	        if (layer.maxzoom && this.zoom >= layer.maxzoom) continue;
	        if (layer.layout && layer.layout.visibility === 'none') continue;
	        if (data.layers && !data.layers[layer.sourceLayer]) continue;

	        bucket = Bucket.create({
	            layer: layer,
	            index: bucketIndex++,
	            childLayers: layerFamilies[layerId],
	            zoom: this.zoom,
	            overscaling: this.overscaling,
	            showCollisionBoxes: this.showCollisionBoxes,
	            collisionBoxArray: this.collisionBoxArray,
	            sourceLayerIndex: sourceLayerCoder.encode(layer.sourceLayer || '_geojsonTileLayer')
	        });
	        bucket.createFilter();

	        bucketsById[layer.id] = bucket;

	        if (data.layers) { // vectortile
	            sourceLayerId = layer.sourceLayer;
	            bucketsBySourceLayer[sourceLayerId] = bucketsBySourceLayer[sourceLayerId] || {};
	            bucketsBySourceLayer[sourceLayerId][layer.id] = bucket;
	        }
	    }

	    // read each layer, and sort its features into buckets
	    if (data.layers) { // vectortile
	        for (sourceLayerId in bucketsBySourceLayer) {
	            if (layer.version === 1) {
	                warnOnce(
	                    'Vector tile source "' + this.source + '" layer "' +
	                    sourceLayerId + '" does not use vector tile spec v2 ' +
	                    'and therefore may have some rendering errors.'
	                );
	            }
	            layer = data.layers[sourceLayerId];
	            if (layer) {
	                sortLayerIntoBuckets(layer, bucketsBySourceLayer[sourceLayerId]);
	            }
	        }
	    } else { // geojson
	        sortLayerIntoBuckets(data, bucketsById);
	    }

	    function sortLayerIntoBuckets(layer, buckets) {
	        for (var i = 0; i < layer.length; i++) {
	            var feature = layer.feature(i);
	            feature.index = i;
	            for (var id in buckets) {
	                if (buckets[id].filter(feature))
	                    buckets[id].features.push(feature);
	            }
	        }
	    }

	    var buckets = [],
	        symbolBuckets = this.symbolBuckets = [],
	        otherBuckets = [];

	    featureIndex.bucketLayerIDs = {};

	    for (var id in bucketsById) {
	        bucket = bucketsById[id];
	        if (bucket.features.length === 0) continue;

	        featureIndex.bucketLayerIDs[bucket.index] = bucket.childLayers.map(getLayerId);

	        buckets.push(bucket);

	        if (bucket.type === 'symbol')
	            symbolBuckets.push(bucket);
	        else
	            otherBuckets.push(bucket);
	    }

	    var icons = {};
	    var stacks = {};
	    var deps = 0;


	    if (symbolBuckets.length > 0) {

	        // Get dependencies for symbol buckets
	        for (i = symbolBuckets.length - 1; i >= 0; i--) {
	            symbolBuckets[i].updateIcons(icons);
	            symbolBuckets[i].updateFont(stacks);
	        }

	        for (var fontName in stacks) {
	            stacks[fontName] = Object.keys(stacks[fontName]).map(Number);
	        }
	        icons = Object.keys(icons);

	        actor.send('get glyphs', {uid: this.uid, stacks: stacks}, function(err, newStacks) {
	            stacks = newStacks;
	            gotDependency(err);
	        });

	        if (icons.length) {
	            actor.send('get icons', {icons: icons}, function(err, newIcons) {
	                icons = newIcons;
	                gotDependency(err);
	            });
	        } else {
	            gotDependency();
	        }
	    }

	    // immediately parse non-symbol buckets (they have no dependencies)
	    for (i = otherBuckets.length - 1; i >= 0; i--) {
	        parseBucket(this, otherBuckets[i]);
	    }

	    if (symbolBuckets.length === 0)
	        return done();

	    function gotDependency(err) {
	        if (err) return callback(err);
	        deps++;
	        if (deps === 2) {
	            // all symbol bucket dependencies fetched; parse them in proper order
	            for (var i = symbolBuckets.length - 1; i >= 0; i--) {
	                parseBucket(tile, symbolBuckets[i]);
	            }
	            done();
	        }
	    }

	    function parseBucket(tile, bucket) {
	        var now = Date.now();
	        bucket.populateBuffers(collisionTile, stacks, icons);
	        var time = Date.now() - now;


	        if (bucket.type !== 'symbol') {
	            for (var i = 0; i < bucket.features.length; i++) {
	                var feature = bucket.features[i];
	                featureIndex.insert(feature, feature.index, bucket.sourceLayerIndex, bucket.index);
	            }
	        }

	        bucket.features = null;

	        stats._total += time;
	        stats[bucket.id] = (stats[bucket.id] || 0) + time;
	    }

	    function done() {
	        tile.status = 'done';

	        if (tile.redoPlacementAfterDone) {
	            tile.redoPlacement(tile.angle, tile.pitch, null);
	            tile.redoPlacementAfterDone = false;
	        }

	        var featureIndex_ = featureIndex.serialize();
	        var collisionTile_ = collisionTile.serialize();
	        var collisionBoxArray = tile.collisionBoxArray.serialize();
	        var transferables = [rawTileData].concat(featureIndex_.transferables).concat(collisionTile_.transferables);

	        var nonEmptyBuckets = buckets.filter(isBucketEmpty);

	        callback(null, {
	            buckets: nonEmptyBuckets.map(serializeBucket),
	            bucketStats: stats, // TODO put this in a separate message?
	            featureIndex: featureIndex_.data,
	            collisionTile: collisionTile_.data,
	            collisionBoxArray: collisionBoxArray,
	            rawTileData: rawTileData
	        }, getTransferables(nonEmptyBuckets).concat(transferables));
	    }
	};

	WorkerTile.prototype.redoPlacement = function(angle, pitch, showCollisionBoxes) {
	    if (this.status !== 'done') {
	        this.redoPlacementAfterDone = true;
	        this.angle = angle;
	        return {};
	    }

	    var collisionTile = new CollisionTile(angle, pitch, this.collisionBoxArray);

	    var buckets = this.symbolBuckets;

	    for (var i = buckets.length - 1; i >= 0; i--) {
	        buckets[i].placeFeatures(collisionTile, showCollisionBoxes);
	    }

	    var collisionTile_ = collisionTile.serialize();

	    var nonEmptyBuckets = buckets.filter(isBucketEmpty);

	    return {
	        result: {
	            buckets: nonEmptyBuckets.map(serializeBucket),
	            collisionTile: collisionTile_.data
	        },
	        transferables: getTransferables(nonEmptyBuckets).concat(collisionTile_.transferables)
	    };
	};

	function isBucketEmpty(bucket) {
	    for (var programName in bucket.arrayGroups) {
	        var programArrayGroups = bucket.arrayGroups[programName];
	        for (var k = 0; k < programArrayGroups.length; k++) {
	            var programArrayGroup = programArrayGroups[k];
	            for (var layoutOrPaint in programArrayGroup) {
	                var arrays = programArrayGroup[layoutOrPaint];
	                for (var bufferName in arrays) {
	                    if (arrays[bufferName].length > 0) return true;
	                }
	            }
	        }
	    }
	    return false;
	}

	function serializeBucket(bucket) {
	    return bucket.serialize();
	}

	function getTransferables(buckets) {
	    var transferables = [];
	    for (var i in buckets) {
	        var bucket = buckets[i];
	        for (var programName in bucket.arrayGroups) {
	            var programArrayGroups = bucket.arrayGroups[programName];
	            for (var k = 0; k < programArrayGroups.length; k++) {
	                var programArrayGroup = programArrayGroups[k];
	                for (var layoutOrPaint in programArrayGroup) {
	                    var arrays = programArrayGroup[layoutOrPaint];
	                    for (var bufferName in arrays) {
	                        transferables.push(arrays[bufferName].arrayBuffer);
	                    }
	                }
	            }
	        }
	    }
	    return transferables;
	}

	function getLayerId(layer) {
	    return layer.id;
	}

	function BackgroundStyleLayer() {
	    StyleLayer.apply(this, arguments);
	}

	BackgroundStyleLayer.prototype = inherit(StyleLayer, {});

	function CircleStyleLayer() {
	    StyleLayer.apply(this, arguments);
	}

	CircleStyleLayer.prototype = inherit(StyleLayer, {});

	function FillStyleLayer() {
	    StyleLayer.apply(this, arguments);
	}

	FillStyleLayer.prototype = inherit(StyleLayer, {

	    getPaintValue: function(name, globalProperties, featureProperties) {
	        if (name === 'fill-outline-color' && this.getPaintProperty('fill-outline-color') === undefined) {
	            return StyleLayer.prototype.getPaintValue.call(this, 'fill-color', globalProperties, featureProperties);
	        } else {
	            return StyleLayer.prototype.getPaintValue.call(this, name, globalProperties, featureProperties);
	        }
	    },

	    getPaintValueStopZoomLevels: function(name) {
	        if (name === 'fill-outline-color' && this.getPaintProperty('fill-outline-color') === undefined) {
	            return StyleLayer.prototype.getPaintValueStopZoomLevels.call(this, 'fill-color');
	        } else {
	            return StyleLayer.prototype.getPaintValueStopZoomLevels.call(this, arguments);
	        }
	    },

	    getPaintInterpolationT: function(name, zoom) {
	        if (name === 'fill-outline-color' && this.getPaintProperty('fill-outline-color') === undefined) {
	            return StyleLayer.prototype.getPaintInterpolationT.call(this, 'fill-color', zoom);
	        } else {
	            return StyleLayer.prototype.getPaintInterpolationT.call(this, name, zoom);
	        }
	    },

	    isPaintValueFeatureConstant: function(name) {
	        if (name === 'fill-outline-color' && this.getPaintProperty('fill-outline-color') === undefined) {
	            return StyleLayer.prototype.isPaintValueFeatureConstant.call(this, 'fill-color');
	        } else {
	            return StyleLayer.prototype.isPaintValueFeatureConstant.call(this, name);
	        }
	    },

	    isPaintValueZoomConstant: function(name) {
	        if (name === 'fill-outline-color' && this.getPaintProperty('fill-outline-color') === undefined) {
	            return StyleLayer.prototype.isPaintValueZoomConstant.call(this, 'fill-color');
	        } else {
	            return StyleLayer.prototype.isPaintValueZoomConstant.call(this, name);
	        }
	    }

	});

	function LineStyleLayer() {
	    StyleLayer.apply(this, arguments);
	}

	LineStyleLayer.prototype = inherit(StyleLayer, {

	    getPaintValue: function(name, globalProperties, featureProperties) {
	        var value = StyleLayer.prototype.getPaintValue.apply(this, arguments);

	        // If the line is dashed, scale the dash lengths by the line
	        // width at the previous round zoom level.
	        if (value && name === 'line-dasharray') {
	            var flooredZoom = Math.floor(globalProperties.zoom);
	            if (this._flooredZoom !== flooredZoom) {
	                this._flooredZoom = flooredZoom;
	                this._flooredLineWidth = this.getPaintValue('line-width', globalProperties, featureProperties);
	            }

	            value.fromScale *= this._flooredLineWidth;
	            value.toScale *= this._flooredLineWidth;
	        }

	        return value;
	    }
	});

	function RasterStyleLayer() {
	    StyleLayer.apply(this, arguments);
	}

	RasterStyleLayer.prototype = inherit(StyleLayer, {});

	function SymbolStyleLayer() {
	    StyleLayer.apply(this, arguments);
	}

	SymbolStyleLayer.prototype = inherit(StyleLayer, {

	    isHidden: function() {
	        if (StyleLayer.prototype.isHidden.apply(this, arguments)) return true;

	        var isTextHidden = this.paint['text-opacity'] === 0 || !this.layout['text-field'];
	        var isIconHidden = this.paint['icon-opacity'] === 0 || !this.layout['icon-image'];
	        if (isTextHidden && isIconHidden) return true;

	        return false;
	    },

	    getLayoutValue: function(name, globalProperties, featureProperties) {
	        if (name === 'text-rotation-alignment' &&
	                this.getLayoutValue('symbol-placement', globalProperties, featureProperties) === 'line' &&
	                !this.getLayoutProperty('text-rotation-alignment')) {
	            return 'map';
	        } else if (name === 'icon-rotation-alignment' &&
	                this.getLayoutValue('symbol-placement', globalProperties, featureProperties) === 'line' &&
	                !this.getLayoutProperty('icon-rotation-alignment')) {
	            return 'map';
	        } else {
	            return StyleLayer.prototype.getLayoutValue.apply(this, arguments);
	        }
	    }

	});

	/*
	 * Represents a transition between two declarations
	 */
	function StyleTransition(declaration, oldTransition, value) {

	    this.declaration = declaration;
	    this.startTime = this.endTime = (new Date()).getTime();

	    var type = declaration.type;
	    if ((type === 'string' || type === 'array') && declaration.transitionable) {
	        this.interp = interpZoomTransitioned;
	    } else {
	        this.interp = interpolate[type];
	    }

	    this.oldTransition = oldTransition;
	    this.duration = value.duration || 0;
	    this.delay = value.delay || 0;

	    if (!this.instant()) {
	        this.endTime = this.startTime + this.duration + this.delay;
	        this.ease = easeCubicInOut;
	    }

	    if (oldTransition && oldTransition.endTime <= this.startTime) {
	        // Old transition is done running, so we can
	        // delete its reference to its old transition.

	        delete oldTransition.oldTransition;
	    }
	}

	StyleTransition.prototype.instant = function() {
	    return !this.oldTransition || !this.interp || (this.duration === 0 && this.delay === 0);
	};

	/*
	 * Return the value of the transitioning property at zoom level `z` and optional time `t`
	 */
	StyleTransition.prototype.calculate = function(globalProperties, featureProperties) {
	    var value = this.declaration.calculate(
	        extend({}, globalProperties, {duration: this.duration}),
	        featureProperties
	    );

	    if (this.instant()) return value;

	    var t = globalProperties.time || Date.now();

	    if (t < this.endTime) {
	        var oldValue = this.oldTransition.calculate(
	            extend({}, globalProperties, {time: this.startTime}),
	            featureProperties
	        );
	        var eased = this.ease((t - this.startTime - this.delay) / this.duration);
	        value = this.interp(oldValue, value, eased);
	    }

	    return value;

	};

	// This function is used to smoothly transition between discrete values, such
	// as images and dasharrays.
	function interpZoomTransitioned(from, to, t) {
	    if ((from && from.to) === undefined || (to && to.to) === undefined) {
	        return undefined;
	    } else {
	        return {
	            from: from.to,
	            fromScale: from.toScale,
	            to: to.to,
	            toScale: to.toScale,
	            t: t
	        };
	    }
	}

	var index$7 = __commonjs(function (module) {
	'use strict';

	function createFunction(parameters, defaultType) {
	    var fun;

	    if (!isFunctionDefinition(parameters)) {
	        fun = function() { return parameters; };
	        fun.isFeatureConstant = true;
	        fun.isZoomConstant = true;

	    } else {
	        var zoomAndFeatureDependent = typeof parameters.stops[0][0] === 'object';
	        var featureDependent = zoomAndFeatureDependent || parameters.property !== undefined;
	        var zoomDependent = zoomAndFeatureDependent || !featureDependent;
	        var type = parameters.type || defaultType || 'exponential';

	        var innerFun;
	        if (type === 'exponential') {
	            innerFun = evaluateExponentialFunction;
	        } else if (type === 'interval') {
	            innerFun = evaluateIntervalFunction;
	        } else if (type === 'categorical') {
	            innerFun = evaluateCategoricalFunction;
	        } else {
	            throw new Error('Unknown function type "' + type + '"');
	        }

	        if (zoomAndFeatureDependent) {
	            var featureFunctions = {};
	            var featureFunctionStops = [];
	            for (var s = 0; s < parameters.stops.length; s++) {
	                var stop = parameters.stops[s];
	                if (featureFunctions[stop[0].zoom] === undefined) {
	                    featureFunctions[stop[0].zoom] = {
	                        zoom: stop[0].zoom,
	                        type: parameters.type,
	                        property: parameters.property,
	                        stops: []
	                    };
	                }
	                featureFunctions[stop[0].zoom].stops.push([stop[0].value, stop[1]]);
	            }

	            for (var z in featureFunctions) {
	                featureFunctionStops.push([featureFunctions[z].zoom, createFunction(featureFunctions[z])]);
	            }
	            fun = function(zoom, feature) {
	                return evaluateExponentialFunction({ stops: featureFunctionStops, base: parameters.base }, zoom)(zoom, feature);
	            };
	            fun.isFeatureConstant = false;
	            fun.isZoomConstant = false;

	        } else if (zoomDependent) {
	            fun = function(zoom) {
	                return innerFun(parameters, zoom);
	            };
	            fun.isFeatureConstant = true;
	            fun.isZoomConstant = false;
	        } else {
	            fun = function(zoom, feature) {
	                return innerFun(parameters, feature[parameters.property]);
	            };
	            fun.isFeatureConstant = false;
	            fun.isZoomConstant = true;
	        }
	    }

	    return fun;
	}

	function evaluateCategoricalFunction(parameters, input) {
	    for (var i = 0; i < parameters.stops.length; i++) {
	        if (input === parameters.stops[i][0]) {
	            return parameters.stops[i][1];
	        }
	    }
	    return parameters.stops[0][1];
	}

	function evaluateIntervalFunction(parameters, input) {
	    for (var i = 0; i < parameters.stops.length; i++) {
	        if (input < parameters.stops[i][0]) break;
	    }
	    return parameters.stops[Math.max(i - 1, 0)][1];
	}

	function evaluateExponentialFunction(parameters, input) {
	    var base = parameters.base !== undefined ? parameters.base : 1;

	    var i = 0;
	    while (true) {
	        if (i >= parameters.stops.length) break;
	        else if (input <= parameters.stops[i][0]) break;
	        else i++;
	    }

	    if (i === 0) {
	        return parameters.stops[i][1];

	    } else if (i === parameters.stops.length) {
	        return parameters.stops[i - 1][1];

	    } else {
	        return interpolate(
	            input,
	            base,
	            parameters.stops[i - 1][0],
	            parameters.stops[i][0],
	            parameters.stops[i - 1][1],
	            parameters.stops[i][1]
	        );
	    }
	}


	function interpolate(input, base, inputLower, inputUpper, outputLower, outputUpper) {
	    if (typeof outputLower === 'function') {
	        return function() {
	            var evaluatedLower = outputLower.apply(undefined, arguments);
	            var evaluatedUpper = outputUpper.apply(undefined, arguments);
	            return interpolate(input, base, inputLower, inputUpper, evaluatedLower, evaluatedUpper);
	        };
	    } else if (outputLower.length) {
	        return interpolateArray(input, base, inputLower, inputUpper, outputLower, outputUpper);
	    } else {
	        return interpolateNumber(input, base, inputLower, inputUpper, outputLower, outputUpper);
	    }
	}

	function interpolateNumber(input, base, inputLower, inputUpper, outputLower, outputUpper) {
	    var difference =  inputUpper - inputLower;
	    var progress = input - inputLower;

	    var ratio;
	    if (base === 1) {
	        ratio = progress / difference;
	    } else {
	        ratio = (Math.pow(base, progress) - 1) / (Math.pow(base, difference) - 1);
	    }

	    return (outputLower * (1 - ratio)) + (outputUpper * ratio);
	}

	function interpolateArray(input, base, inputLower, inputUpper, outputLower, outputUpper) {
	    var output = [];
	    for (var i = 0; i < outputLower.length; i++) {
	        output[i] = interpolateNumber(input, base, inputLower, inputUpper, outputLower[i], outputUpper[i]);
	    }
	    return output;
	}

	function isFunctionDefinition(value) {
	    return typeof value === 'object' && value.stops;
	}


	module.exports.isFunctionDefinition = isFunctionDefinition;

	module.exports.interpolated = function(parameters) {
	    return createFunction(parameters, 'exponential');
	};

	module.exports['piecewise-constant'] = function(parameters) {
	    return createFunction(parameters, 'interval');
	};
	});

	var MapboxGLFunction$1 = (index$7 && typeof index$7 === 'object' && 'default' in index$7 ? index$7['default'] : index$7);

	var interpolated = function(parameters) {
	    var inner = MapboxGLFunction$1.interpolated(parameters);
	    var outer = function(globalProperties, featureProperties) {
	        return inner(globalProperties && globalProperties.zoom, featureProperties || {});
	    };
	    outer.isFeatureConstant = inner.isFeatureConstant;
	    outer.isZoomConstant = inner.isZoomConstant;
	    return outer;
	};

	var piecewiseConstant = function(parameters) {
	    var inner = MapboxGLFunction$1['piecewiseConstant'](parameters);
	    var outer = function(globalProperties, featureProperties) {
	        return inner(globalProperties && globalProperties.zoom, featureProperties || {});
	    };
	    outer.isFeatureConstant = inner.isFeatureConstant;
	    outer.isZoomConstant = inner.isZoomConstant;
	    return outer;
	};

	var isFunctionDefinition = MapboxGLFunction$1.isFunctionDefinition;


	var MapboxGLFunction = Object.freeze({
	    interpolated: interpolated,
	    piecewiseConstant: piecewiseConstant,
	    isFunctionDefinition: isFunctionDefinition
	});

	var csscolorparser = __commonjs(function (module, exports) {
	// (c) Dean McNamee <dean@gmail.com>, 2012.
	//
	// https://github.com/deanm/css-color-parser-js
	//
	// Permission is hereby granted, free of charge, to any person obtaining a copy
	// of this software and associated documentation files (the "Software"), to
	// deal in the Software without restriction, including without limitation the
	// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
	// sell copies of the Software, and to permit persons to whom the Software is
	// furnished to do so, subject to the following conditions:
	//
	// The above copyright notice and this permission notice shall be included in
	// all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
	// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
	// IN THE SOFTWARE.

	// http://www.w3.org/TR/css3-color/
	var kCSSColorTable = {
	  "transparent": [0,0,0,0], "aliceblue": [240,248,255,1],
	  "antiquewhite": [250,235,215,1], "aqua": [0,255,255,1],
	  "aquamarine": [127,255,212,1], "azure": [240,255,255,1],
	  "beige": [245,245,220,1], "bisque": [255,228,196,1],
	  "black": [0,0,0,1], "blanchedalmond": [255,235,205,1],
	  "blue": [0,0,255,1], "blueviolet": [138,43,226,1],
	  "brown": [165,42,42,1], "burlywood": [222,184,135,1],
	  "cadetblue": [95,158,160,1], "chartreuse": [127,255,0,1],
	  "chocolate": [210,105,30,1], "coral": [255,127,80,1],
	  "cornflowerblue": [100,149,237,1], "cornsilk": [255,248,220,1],
	  "crimson": [220,20,60,1], "cyan": [0,255,255,1],
	  "darkblue": [0,0,139,1], "darkcyan": [0,139,139,1],
	  "darkgoldenrod": [184,134,11,1], "darkgray": [169,169,169,1],
	  "darkgreen": [0,100,0,1], "darkgrey": [169,169,169,1],
	  "darkkhaki": [189,183,107,1], "darkmagenta": [139,0,139,1],
	  "darkolivegreen": [85,107,47,1], "darkorange": [255,140,0,1],
	  "darkorchid": [153,50,204,1], "darkred": [139,0,0,1],
	  "darksalmon": [233,150,122,1], "darkseagreen": [143,188,143,1],
	  "darkslateblue": [72,61,139,1], "darkslategray": [47,79,79,1],
	  "darkslategrey": [47,79,79,1], "darkturquoise": [0,206,209,1],
	  "darkviolet": [148,0,211,1], "deeppink": [255,20,147,1],
	  "deepskyblue": [0,191,255,1], "dimgray": [105,105,105,1],
	  "dimgrey": [105,105,105,1], "dodgerblue": [30,144,255,1],
	  "firebrick": [178,34,34,1], "floralwhite": [255,250,240,1],
	  "forestgreen": [34,139,34,1], "fuchsia": [255,0,255,1],
	  "gainsboro": [220,220,220,1], "ghostwhite": [248,248,255,1],
	  "gold": [255,215,0,1], "goldenrod": [218,165,32,1],
	  "gray": [128,128,128,1], "green": [0,128,0,1],
	  "greenyellow": [173,255,47,1], "grey": [128,128,128,1],
	  "honeydew": [240,255,240,1], "hotpink": [255,105,180,1],
	  "indianred": [205,92,92,1], "indigo": [75,0,130,1],
	  "ivory": [255,255,240,1], "khaki": [240,230,140,1],
	  "lavender": [230,230,250,1], "lavenderblush": [255,240,245,1],
	  "lawngreen": [124,252,0,1], "lemonchiffon": [255,250,205,1],
	  "lightblue": [173,216,230,1], "lightcoral": [240,128,128,1],
	  "lightcyan": [224,255,255,1], "lightgoldenrodyellow": [250,250,210,1],
	  "lightgray": [211,211,211,1], "lightgreen": [144,238,144,1],
	  "lightgrey": [211,211,211,1], "lightpink": [255,182,193,1],
	  "lightsalmon": [255,160,122,1], "lightseagreen": [32,178,170,1],
	  "lightskyblue": [135,206,250,1], "lightslategray": [119,136,153,1],
	  "lightslategrey": [119,136,153,1], "lightsteelblue": [176,196,222,1],
	  "lightyellow": [255,255,224,1], "lime": [0,255,0,1],
	  "limegreen": [50,205,50,1], "linen": [250,240,230,1],
	  "magenta": [255,0,255,1], "maroon": [128,0,0,1],
	  "mediumaquamarine": [102,205,170,1], "mediumblue": [0,0,205,1],
	  "mediumorchid": [186,85,211,1], "mediumpurple": [147,112,219,1],
	  "mediumseagreen": [60,179,113,1], "mediumslateblue": [123,104,238,1],
	  "mediumspringgreen": [0,250,154,1], "mediumturquoise": [72,209,204,1],
	  "mediumvioletred": [199,21,133,1], "midnightblue": [25,25,112,1],
	  "mintcream": [245,255,250,1], "mistyrose": [255,228,225,1],
	  "moccasin": [255,228,181,1], "navajowhite": [255,222,173,1],
	  "navy": [0,0,128,1], "oldlace": [253,245,230,1],
	  "olive": [128,128,0,1], "olivedrab": [107,142,35,1],
	  "orange": [255,165,0,1], "orangered": [255,69,0,1],
	  "orchid": [218,112,214,1], "palegoldenrod": [238,232,170,1],
	  "palegreen": [152,251,152,1], "paleturquoise": [175,238,238,1],
	  "palevioletred": [219,112,147,1], "papayawhip": [255,239,213,1],
	  "peachpuff": [255,218,185,1], "peru": [205,133,63,1],
	  "pink": [255,192,203,1], "plum": [221,160,221,1],
	  "powderblue": [176,224,230,1], "purple": [128,0,128,1],
	  "red": [255,0,0,1], "rosybrown": [188,143,143,1],
	  "royalblue": [65,105,225,1], "saddlebrown": [139,69,19,1],
	  "salmon": [250,128,114,1], "sandybrown": [244,164,96,1],
	  "seagreen": [46,139,87,1], "seashell": [255,245,238,1],
	  "sienna": [160,82,45,1], "silver": [192,192,192,1],
	  "skyblue": [135,206,235,1], "slateblue": [106,90,205,1],
	  "slategray": [112,128,144,1], "slategrey": [112,128,144,1],
	  "snow": [255,250,250,1], "springgreen": [0,255,127,1],
	  "steelblue": [70,130,180,1], "tan": [210,180,140,1],
	  "teal": [0,128,128,1], "thistle": [216,191,216,1],
	  "tomato": [255,99,71,1], "turquoise": [64,224,208,1],
	  "violet": [238,130,238,1], "wheat": [245,222,179,1],
	  "white": [255,255,255,1], "whitesmoke": [245,245,245,1],
	  "yellow": [255,255,0,1], "yellowgreen": [154,205,50,1]}

	function clamp_css_byte(i) {  // Clamp to integer 0 .. 255.
	  i = Math.round(i);  // Seems to be what Chrome does (vs truncation).
	  return i < 0 ? 0 : i > 255 ? 255 : i;
	}

	function clamp_css_float(f) {  // Clamp to float 0.0 .. 1.0.
	  return f < 0 ? 0 : f > 1 ? 1 : f;
	}

	function parse_css_int(str) {  // int or percentage.
	  if (str[str.length - 1] === '%')
	    return clamp_css_byte(parseFloat(str) / 100 * 255);
	  return clamp_css_byte(parseInt(str));
	}

	function parse_css_float(str) {  // float or percentage.
	  if (str[str.length - 1] === '%')
	    return clamp_css_float(parseFloat(str) / 100);
	  return clamp_css_float(parseFloat(str));
	}

	function css_hue_to_rgb(m1, m2, h) {
	  if (h < 0) h += 1;
	  else if (h > 1) h -= 1;

	  if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
	  if (h * 2 < 1) return m2;
	  if (h * 3 < 2) return m1 + (m2 - m1) * (2/3 - h) * 6;
	  return m1;
	}

	function parseCSSColor(css_str) {
	  // Remove all whitespace, not compliant, but should just be more accepting.
	  var str = css_str.replace(/ /g, '').toLowerCase();

	  // Color keywords (and transparent) lookup.
	  if (str in kCSSColorTable) return kCSSColorTable[str].slice();  // dup.

	  // #abc and #abc123 syntax.
	  if (str[0] === '#') {
	    if (str.length === 4) {
	      var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
	      if (!(iv >= 0 && iv <= 0xfff)) return null;  // Covers NaN.
	      return [((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8),
	              (iv & 0xf0) | ((iv & 0xf0) >> 4),
	              (iv & 0xf) | ((iv & 0xf) << 4),
	              1];
	    } else if (str.length === 7) {
	      var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
	      if (!(iv >= 0 && iv <= 0xffffff)) return null;  // Covers NaN.
	      return [(iv & 0xff0000) >> 16,
	              (iv & 0xff00) >> 8,
	              iv & 0xff,
	              1];
	    }

	    return null;
	  }

	  var op = str.indexOf('('), ep = str.indexOf(')');
	  if (op !== -1 && ep + 1 === str.length) {
	    var fname = str.substr(0, op);
	    var params = str.substr(op+1, ep-(op+1)).split(',');
	    var alpha = 1;  // To allow case fallthrough.
	    switch (fname) {
	      case 'rgba':
	        if (params.length !== 4) return null;
	        alpha = parse_css_float(params.pop());
	        // Fall through.
	      case 'rgb':
	        if (params.length !== 3) return null;
	        return [parse_css_int(params[0]),
	                parse_css_int(params[1]),
	                parse_css_int(params[2]),
	                alpha];
	      case 'hsla':
	        if (params.length !== 4) return null;
	        alpha = parse_css_float(params.pop());
	        // Fall through.
	      case 'hsl':
	        if (params.length !== 3) return null;
	        var h = (((parseFloat(params[0]) % 360) + 360) % 360) / 360;  // 0 .. 1
	        // NOTE(deanm): According to the CSS spec s/l should only be
	        // percentages, but we don't bother and let float or percentage.
	        var s = parse_css_float(params[1]);
	        var l = parse_css_float(params[2]);
	        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
	        var m1 = l * 2 - m2;
	        return [clamp_css_byte(css_hue_to_rgb(m1, m2, h+1/3) * 255),
	                clamp_css_byte(css_hue_to_rgb(m1, m2, h) * 255),
	                clamp_css_byte(css_hue_to_rgb(m1, m2, h-1/3) * 255),
	                alpha];
	      default:
	        return null;
	    }
	  }

	  return null;
	}

	try { exports.parseCSSColor = parseCSSColor } catch(e) { }
	});

	var require$$0$5 = (csscolorparser && typeof csscolorparser === 'object' && 'default' in csscolorparser ? csscolorparser['default'] : csscolorparser);

	var parseCSSColor = require$$0$5.parseCSSColor;
	var colorCache = {};

	function parseColor(input) {

	    if (colorCache[input]) {
	        return colorCache[input];

	    // RGBA array
	    } else if (Array.isArray(input)) {
	        return input;

	    // GL function
	    } else if (input && input.stops) {
	        return extend({}, input, {
	            stops: input.stops.map(parseFunctionStopColor)
	        });

	    // Color string
	    } else if (typeof input === 'string') {
	        var parsedColor = parseCSSColor(input);
	        if (!parsedColor) { throw new Error('Invalid color ' + input); }

	        var output = colorDowngrade(parsedColor);
	        colorCache[input] = output;
	        return output;

	    } else {
	        throw new Error('Invalid color ' + input);
	    }

	}

	function parseFunctionStopColor(stop) {
	    return [stop[0], parseColor(stop[1])];
	}

	function colorDowngrade(color) {
	    return [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 1];
	}

	function StyleDeclaration(reference, value) {
	    this.type = reference.type;
	    this.transitionable = reference.transition;
	    this.value = clone(value);
	    this.isFunction = isFunctionDefinition(value);

	    // immutable representation of value. used for comparison
	    this.json = JSON.stringify(this.value);

	    var parsedValue = this.type === 'color' ? parseColor(this.value) : value;
	    this.calculate = MapboxGLFunction[reference.function || 'piecewiseConstant'](parsedValue);
	    this.isFeatureConstant = this.calculate.isFeatureConstant;
	    this.isZoomConstant = this.calculate.isZoomConstant;

	    if (reference.function === 'piecewiseConstant' && reference.transition) {
	        this.calculate = transitioned(this.calculate);
	    }

	    if (!this.isFeatureConstant && !this.isZoomConstant) {
	        this.stopZoomLevels = [];
	        var interpolationAmountStops = [];
	        var stops = this.value.stops;
	        for (var i = 0; i < this.value.stops.length; i++) {
	            var zoom = stops[i][0].zoom;
	            if (this.stopZoomLevels.indexOf(zoom) < 0) {
	                this.stopZoomLevels.push(zoom);
	                interpolationAmountStops.push([zoom, interpolationAmountStops.length]);
	            }
	        }

	        this.calculateInterpolationT = interpolated({
	            stops: interpolationAmountStops,
	            base: value.base
	        });
	    }
	}

	// This function is used to smoothly transition between discrete values, such
	// as images and dasharrays.
	function transitioned(calculate) {
	    return function(globalProperties, featureProperties) {
	        var z = globalProperties.zoom;
	        var zh = globalProperties.zoomHistory;
	        var duration = globalProperties.duration;

	        var fraction = z % 1;
	        var t = Math.min((Date.now() - zh.lastIntegerZoomTime) / duration, 1);
	        var fromScale = 1;
	        var toScale = 1;
	        var mix, from, to;

	        if (z > zh.lastIntegerZoom) {
	            mix = fraction + (1 - fraction) * t;
	            fromScale *= 2;
	            from = calculate({zoom: z - 1}, featureProperties);
	            to = calculate({zoom: z}, featureProperties);
	        } else {
	            mix = 1 - (1 - t) * fraction;
	            to = calculate({zoom: z}, featureProperties);
	            from = calculate({zoom: z + 1}, featureProperties);
	            fromScale /= 2;
	        }

	        if (from === undefined || to === undefined) {
	            return undefined;
	        } else {
	            return {
	                from: from,
	                fromScale: fromScale,
	                to: to,
	                toScale: toScale,
	                t: mix
	            };
	        }
	    };
	}

	var $version = 8;
	var $root = {"version":{"required":true,"type":"enum","values":[8],"doc":"Stylesheet version number. Must be 8.","example":8},"name":{"type":"string","doc":"A human-readable name for the style.","example":"Bright"},"metadata":{"type":"*","doc":"Arbitrary properties useful to track with the stylesheet, but do not influence rendering. Properties should be prefixed to avoid collisions, like 'mapbox:'."},"center":{"type":"array","value":"number","doc":"Default map center in longitude and latitude.  The style center will be used only if the map has not been positioned by other means (e.g. map options or user interaction).","example":[-73.9749,40.7736]},"zoom":{"type":"number","doc":"Default zoom level.  The style zoom will be used only if the map has not been positioned by other means (e.g. map options or user interaction).","example":12.5},"bearing":{"type":"number","default":0,"period":360,"units":"degrees","doc":"Default bearing, in degrees.  The style bearing will be used only if the map has not been positioned by other means (e.g. map options or user interaction).","example":29},"pitch":{"type":"number","default":0,"units":"degrees","doc":"Default pitch, in degrees. Zero is perpendicular to the surface.  The style pitch will be used only if the map has not been positioned by other means (e.g. map options or user interaction).","example":50},"sources":{"required":true,"type":"sources","doc":"Data source specifications.","example":{"mapbox-streets":{"type":"vector","url":"mapbox://mapbox.mapbox-streets-v6"}}},"sprite":{"type":"string","doc":"A base URL for retrieving the sprite image and metadata. The extensions `.png`, `.json` and scale factor `@2x.png` will be automatically appended. This property is required if any layer uses the 'sprite-image' layout property.","example":"mapbox://sprites/mapbox/bright-v8"},"glyphs":{"type":"string","doc":"A URL template for loading signed-distance-field glyph sets in PBF format. The URL must include `{fontstack}` and `{range}` tokens. This property is required if any layer uses the 'text-field' layout property.","example":"mapbox://fonts/mapbox/{fontstack}/{range}.pbf"},"transition":{"type":"transition","doc":"A global transition definition to use as a default across properties.","example":{"duration":300,"delay":0}},"layers":{"required":true,"type":"array","value":"layer","doc":"Layers will be drawn in the order of this array.","example":[{"id":"water","source":"mapbox-streets","source-layer":"water","type":"fill","paint":{"fill-color":"#00ffff"}}]}};
	var sources = {"*":{"type":"source","doc":"Specification of a data source. For vector and raster sources, either TileJSON or a URL to a TileJSON must be provided. For GeoJSON and video sources, a URL must be provided."}};
	var source = ["source_tile","source_geojson","source_video","source_image"];
	var source_tile = {"type":{"required":true,"type":"enum","values":["vector","raster"],"doc":"The data type of the tile source."},"url":{"type":"string","doc":"A URL to a TileJSON resource. Supported protocols are `http:`, `https:`, and `mapbox://<mapid>`."},"tiles":{"type":"array","value":"string","doc":"An array of one or more tile source URLs, as in the TileJSON spec."},"minzoom":{"type":"number","default":0,"doc":"Minimum zoom level for which tiles are available, as in the TileJSON spec."},"maxzoom":{"type":"number","default":22,"doc":"Maximum zoom level for which tiles are available, as in the TileJSON spec. Data from tiles at the maxzoom are used when displaying the map at higher zoom levels."},"tileSize":{"type":"number","default":512,"units":"pixels","doc":"The minimum visual size to display tiles for this layer. Only configurable for raster layers."},"*":{"type":"*","doc":"Other keys to configure the data source."}};
	var source_geojson = {"type":{"required":true,"type":"enum","values":["geojson"],"doc":"The data type of the GeoJSON source."},"data":{"type":"*","doc":"A URL to a GeoJSON file, or inline GeoJSON."},"maxzoom":{"type":"number","default":14,"doc":"Maximum zoom level at which to create vector tiles (higher means greater detail at high zoom levels)."},"buffer":{"type":"number","default":64,"doc":"Tile buffer size on each side (higher means fewer rendering artifacts near tile edges but slower performance)."},"tolerance":{"type":"number","default":3,"doc":"Douglas-Peucker simplification tolerance (higher means simpler geometries and faster performance)."},"cluster":{"type":"boolean","default":false,"doc":"If the data is a collection of point features, setting this to true clusters the points by radius into groups."},"clusterRadius":{"type":"number","default":400,"doc":"Radius of each cluster when clustering points, relative to 4096 tile."},"clusterMaxZoom":{"type":"number","doc":"Max zoom to cluster points on. Defaults to one zoom less than maxzoom (so that last zoom features are not clustered)."}};
	var source_video = {"type":{"required":true,"type":"enum","values":["video"],"doc":"The data type of the video source."},"urls":{"required":true,"type":"array","value":"string","doc":"URLs to video content in order of preferred format."},"coordinates":{"required":true,"doc":"Corners of video specified in longitude, latitude pairs.","type":"array","length":4,"value":{"type":"array","length":2,"value":"number","doc":"A single longitude, latitude pair."}}};
	var source_image = {"type":{"required":true,"type":"enum","values":["image"],"doc":"The data type of the image source."},"url":{"required":true,"type":"string","doc":"URL that points to an image"},"coordinates":{"required":true,"doc":"Corners of image specified in longitude, latitude pairs.","type":"array","length":4,"value":{"type":"array","length":2,"value":"number","doc":"A single longitude, latitude pair."}}};
	var layer = {"id":{"type":"string","doc":"Unique layer name.","required":true},"type":{"type":"enum","values":["fill","line","symbol","circle","raster","background"],"doc":"Rendering type of this layer."},"metadata":{"type":"*","doc":"Arbitrary properties useful to track with the layer, but do not influence rendering. Properties should be prefixed to avoid collisions, like 'mapbox:'."},"ref":{"type":"string","doc":"References another layer to copy `type`, `source`, `source-layer`, `minzoom`, `maxzoom`, `filter`, and `layout` properties from. This allows the layers to share processing and be more efficient."},"source":{"type":"string","doc":"Name of a source description to be used for this layer."},"source-layer":{"type":"string","doc":"Layer to use from a vector tile source. Required if the source supports multiple layers."},"minzoom":{"type":"number","minimum":0,"maximum":22,"doc":"The minimum zoom level on which the layer gets parsed and appears on."},"maxzoom":{"type":"number","minimum":0,"maximum":22,"doc":"The maximum zoom level on which the layer gets parsed and appears on."},"interactive":{"type":"boolean","doc":"Enable querying of feature data from this layer for interactivity.","default":false},"filter":{"type":"filter","doc":"A expression specifying conditions on source features. Only features that match the filter are displayed."},"layout":{"type":"layout","doc":"Layout properties for the layer."},"paint":{"type":"paint","doc":"Default paint properties for this layer."},"paint.*":{"type":"paint","doc":"Class-specific paint properties for this layer. The class name is the part after the first dot."}};
	var layout = ["layout_fill","layout_line","layout_circle","layout_symbol","layout_raster","layout_background"];
	var layout_background = {"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible","doc":"The display of this layer. `none` hides this layer."}};
	var layout_fill = {"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible","doc":"The display of this layer. `none` hides this layer."}};
	var layout_circle = {"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible","doc":"The display of this layer. `none` hides this layer."}};
	var layout_line = {"line-cap":{"type":"enum","function":"piecewise-constant","values":["butt","round","square"],"default":"butt","doc":"The display of line endings."},"line-join":{"type":"enum","function":"piecewise-constant","values":["bevel","round","miter"],"default":"miter","doc":"The display of lines when joining."},"line-miter-limit":{"type":"number","default":2,"function":"interpolated","doc":"Used to automatically convert miter joins to bevel joins for sharp angles.","requires":[{"line-join":"miter"}]},"line-round-limit":{"type":"number","default":1.05,"function":"interpolated","doc":"Used to automatically convert round joins to miter joins for shallow angles.","requires":[{"line-join":"round"}]},"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible","doc":"The display of this layer. `none` hides this layer."}};
	var layout_symbol = {"symbol-placement":{"type":"enum","function":"piecewise-constant","values":["point","line"],"default":"point","doc":"Label placement relative to its geometry. `line` can only be used on LineStrings and Polygons."},"symbol-spacing":{"type":"number","default":250,"minimum":1,"function":"interpolated","units":"pixels","doc":"Distance between two symbol anchors.","requires":[{"symbol-placement":"line"}]},"symbol-avoid-edges":{"type":"boolean","function":"piecewise-constant","default":false,"doc":"If true, the symbols will not cross tile edges to avoid mutual collisions. Recommended in layers that don't have enough padding in the vector tile to prevent collisions, or if it is a point symbol layer placed after a line symbol layer."},"icon-allow-overlap":{"type":"boolean","function":"piecewise-constant","default":false,"doc":"If true, the icon will be visible even if it collides with other previously drawn symbols.","requires":["icon-image"]},"icon-ignore-placement":{"type":"boolean","function":"piecewise-constant","default":false,"doc":"If true, other symbols can be visible even if they collide with the icon.","requires":["icon-image"]},"icon-optional":{"type":"boolean","function":"piecewise-constant","default":false,"doc":"If true, text will display without their corresponding icons when the icon collides with other symbols and the text does not.","requires":["icon-image","text-field"]},"icon-rotation-alignment":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"default":"viewport","doc":"Orientation of icon when map is rotated.","requires":["icon-image"]},"icon-size":{"type":"number","default":1,"minimum":0,"function":"interpolated","doc":"Scale factor for icon. 1 is original size, 3 triples the size.","requires":["icon-image"]},"icon-image":{"type":"string","function":"piecewise-constant","doc":"A string with {tokens} replaced, referencing the data property to pull from.","tokens":true},"icon-rotate":{"type":"number","default":0,"period":360,"function":"interpolated","units":"degrees","doc":"Rotates the icon clockwise.","requires":["icon-image"]},"icon-padding":{"type":"number","default":2,"minimum":0,"function":"interpolated","units":"pixels","doc":"Size of the additional area around the icon bounding box used for detecting symbol collisions.","requires":["icon-image"]},"icon-keep-upright":{"type":"boolean","function":"piecewise-constant","default":false,"doc":"If true, the icon may be flipped to prevent it from being rendered upside-down.","requires":["icon-image",{"icon-rotation-alignment":"map"},{"symbol-placement":"line"}]},"icon-offset":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","doc":"Offset distance of icon from its anchor. Positive values indicate right and down, while negative values indicate left and up.","requires":["icon-image"]},"text-rotation-alignment":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"default":"viewport","doc":"Orientation of text when map is rotated.","requires":["text-field"]},"text-field":{"type":"string","function":"piecewise-constant","default":"","tokens":true,"doc":"Value to use for a text label. Feature properties are specified using tokens like {field_name}."},"text-font":{"type":"array","value":"string","function":"piecewise-constant","default":["Open Sans Regular","Arial Unicode MS Regular"],"doc":"Font stack to use for displaying text.","requires":["text-field"]},"text-size":{"type":"number","default":16,"minimum":0,"units":"pixels","function":"interpolated","doc":"Font size.","requires":["text-field"]},"text-max-width":{"type":"number","default":10,"minimum":0,"units":"em","function":"interpolated","doc":"The maximum line width for text wrapping.","requires":["text-field"]},"text-line-height":{"type":"number","default":1.2,"units":"em","function":"interpolated","doc":"Text leading value for multi-line text.","requires":["text-field"]},"text-letter-spacing":{"type":"number","default":0,"units":"em","function":"interpolated","doc":"Text tracking amount.","requires":["text-field"]},"text-justify":{"type":"enum","function":"piecewise-constant","values":["left","center","right"],"default":"center","doc":"Text justification options.","requires":["text-field"]},"text-anchor":{"type":"enum","function":"piecewise-constant","values":["center","left","right","top","bottom","top-left","top-right","bottom-left","bottom-right"],"default":"center","doc":"Part of the text placed closest to the anchor.","requires":["text-field"]},"text-max-angle":{"type":"number","default":45,"units":"degrees","function":"interpolated","doc":"Maximum angle change between adjacent characters.","requires":["text-field",{"symbol-placement":"line"}]},"text-rotate":{"type":"number","default":0,"period":360,"units":"degrees","function":"interpolated","doc":"Rotates the text clockwise.","requires":["text-field"]},"text-padding":{"type":"number","default":2,"minimum":0,"units":"pixels","function":"interpolated","doc":"Size of the additional area around the text bounding box used for detecting symbol collisions.","requires":["text-field"]},"text-keep-upright":{"type":"boolean","function":"piecewise-constant","default":true,"doc":"If true, the text may be flipped vertically to prevent it from being rendered upside-down.","requires":["text-field",{"text-rotation-alignment":"map"},{"symbol-placement":"line"}]},"text-transform":{"type":"enum","function":"piecewise-constant","values":["none","uppercase","lowercase"],"default":"none","doc":"Specifies how to capitalize text, similar to the CSS `text-transform` property.","requires":["text-field"]},"text-offset":{"type":"array","doc":"Offset distance of text from its anchor. Positive values indicate right and down, while negative values indicate left and up.","value":"number","units":"ems","function":"interpolated","length":2,"default":[0,0],"requires":["text-field"]},"text-allow-overlap":{"type":"boolean","function":"piecewise-constant","default":false,"doc":"If true, the text will be visible even if it collides with other previously drawn symbols.","requires":["text-field"]},"text-ignore-placement":{"type":"boolean","function":"piecewise-constant","default":false,"doc":"If true, other symbols can be visible even if they collide with the text.","requires":["text-field"]},"text-optional":{"type":"boolean","function":"piecewise-constant","default":false,"doc":"If true, icons will display without their corresponding text when the text collides with other symbols and the icon does not.","requires":["text-field","icon-image"]},"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible","doc":"The display of this layer. `none` hides this layer."}};
	var layout_raster = {"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible","doc":"The display of this layer. `none` hides this layer."}};
	var filter = {"type":"array","value":"*","doc":"A filter selects specific features from a layer."};
	var filter_operator = {"type":"enum","values":["==","!=",">",">=","<","<=","in","!in","all","any","none","has","!has"],"doc":"The filter operator."};
	var geometry_type = {"type":"enum","values":["Point","LineString","Polygon"],"doc":"The geometry type for the filter to select."};
	var color_operation = {"type":"enum","values":["lighten","saturate","spin","fade","mix"],"doc":"A color operation to apply."};
	var function_stop = {"type":"array","minimum":0,"maximum":22,"value":["number","color"],"length":2,"doc":"Zoom level and value pair."};
	var paint = ["paint_fill","paint_line","paint_circle","paint_symbol","paint_raster","paint_background"];
	var paint_fill = {"fill-antialias":{"type":"boolean","function":"piecewise-constant","default":true,"doc":"Whether or not the fill should be antialiased."},"fill-opacity":{"type":"number","function":"interpolated","default":1,"minimum":0,"maximum":1,"doc":"The opacity given to the fill color.","transition":true},"fill-color":{"type":"color","default":"#000000","doc":"The color of the fill.","function":"interpolated","transition":true,"requires":[{"!":"fill-pattern"}]},"fill-outline-color":{"type":"color","doc":"The outline color of the fill. Matches the value of `fill-color` if unspecified.","function":"interpolated","transition":true,"requires":[{"!":"fill-pattern"},{"fill-antialias":true}]},"fill-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels","doc":"The geometry's offset. Values are [x, y] where negatives indicate left and up, respectively."},"fill-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"doc":"Control whether the translation is relative to the map (north) or viewport (screen)","default":"map","requires":["fill-translate"]},"fill-pattern":{"type":"string","function":"piecewise-constant","transition":true,"doc":"Name of image in sprite to use for drawing image fills. For seamless patterns, image width and height must be a factor of two (2, 4, 8, ..., 512)."}};
	var paint_line = {"line-opacity":{"type":"number","doc":"The opacity at which the line will be drawn.","function":"interpolated","default":1,"minimum":0,"maximum":1,"transition":true},"line-color":{"type":"color","doc":"The color with which the line will be drawn.","default":"#000000","function":"interpolated","transition":true,"requires":[{"!":"line-pattern"}]},"line-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels","doc":"The geometry's offset. Values are [x, y] where negatives indicate left and up, respectively."},"line-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"doc":"Control whether the translation is relative to the map (north) or viewport (screen)","default":"map","requires":["line-translate"]},"line-width":{"type":"number","default":1,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","doc":"Stroke thickness."},"line-gap-width":{"type":"number","default":0,"minimum":0,"doc":"Draws a line casing outside of a line's actual path. Value indicates the width of the inner gap.","function":"interpolated","transition":true,"units":"pixels"},"line-offset":{"type":"number","default":0,"doc":"The line's offset perpendicular to its direction. Values may be positive or negative, where positive indicates \"rightwards\" (if you were moving in the direction of the line) and negative indicates \"leftwards.\"","function":"interpolated","transition":true,"units":"pixels"},"line-blur":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","doc":"Blur applied to the line, in pixels."},"line-dasharray":{"type":"array","value":"number","function":"piecewise-constant","doc":"Specifies the lengths of the alternating dashes and gaps that form the dash pattern. The lengths are later scaled by the line width. To convert a dash length to pixels, multiply the length by the current line width.","minimum":0,"transition":true,"units":"line widths","requires":[{"!":"line-pattern"}]},"line-pattern":{"type":"string","function":"piecewise-constant","transition":true,"doc":"Name of image in sprite to use for drawing image lines. For seamless patterns, image width must be a factor of two (2, 4, 8, ..., 512)."}};
	var paint_circle = {"circle-radius":{"type":"number","default":5,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","doc":"Circle radius."},"circle-color":{"type":"color","default":"#000000","doc":"The color of the circle.","function":"interpolated","transition":true},"circle-blur":{"type":"number","default":0,"doc":"Amount to blur the circle. 1 blurs the circle such that only the centerpoint is full opacity.","function":"interpolated","transition":true},"circle-opacity":{"type":"number","doc":"The opacity at which the circle will be drawn.","default":1,"minimum":0,"maximum":1,"function":"interpolated","transition":true},"circle-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels","doc":"The geometry's offset. Values are [x, y] where negatives indicate left and up, respectively."},"circle-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"doc":"Control whether the translation is relative to the map (north) or viewport (screen)","default":"map","requires":["circle-translate"]}};
	var paint_symbol = {"icon-opacity":{"doc":"The opacity at which the icon will be drawn.","type":"number","default":1,"minimum":0,"maximum":1,"function":"interpolated","transition":true,"requires":["icon-image"]},"icon-color":{"type":"color","default":"#000000","function":"interpolated","transition":true,"doc":"The color of the icon. This can only be used with sdf icons.","requires":["icon-image"]},"icon-halo-color":{"type":"color","default":"rgba(0, 0, 0, 0)","function":"interpolated","transition":true,"doc":"The color of the icon's halo. Icon halos can only be used with sdf icons.","requires":["icon-image"]},"icon-halo-width":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","doc":"Distance of halo to the icon outline.","requires":["icon-image"]},"icon-halo-blur":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","doc":"Fade out the halo towards the outside.","requires":["icon-image"]},"icon-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels","doc":"Distance that the icon's anchor is moved from its original placement. Positive values indicate right and down, while negative values indicate left and up.","requires":["icon-image"]},"icon-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"doc":"Control whether the translation is relative to the map (north) or viewport (screen).","default":"map","requires":["icon-image","icon-translate"]},"text-opacity":{"type":"number","doc":"The opacity at which the text will be drawn.","default":1,"minimum":0,"maximum":1,"function":"interpolated","transition":true,"requires":["text-field"]},"text-color":{"type":"color","doc":"The color with which the text will be drawn.","default":"#000000","function":"interpolated","transition":true,"requires":["text-field"]},"text-halo-color":{"type":"color","default":"rgba(0, 0, 0, 0)","function":"interpolated","transition":true,"doc":"The color of the text's halo, which helps it stand out from backgrounds.","requires":["text-field"]},"text-halo-width":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","doc":"Distance of halo to the font outline. Max text halo width is 1/4 of the font-size.","requires":["text-field"]},"text-halo-blur":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","doc":"The halo's fadeout distance towards the outside.","requires":["text-field"]},"text-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels","doc":"Distance that the text's anchor is moved from its original placement. Positive values indicate right and down, while negative values indicate left and up.","requires":["text-field"]},"text-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"doc":"Control whether the translation is relative to the map (north) or viewport (screen).","default":"map","requires":["text-field","text-translate"]}};
	var paint_raster = {"raster-opacity":{"type":"number","doc":"The opacity at which the image will be drawn.","default":1,"minimum":0,"maximum":1,"function":"interpolated","transition":true},"raster-hue-rotate":{"type":"number","default":0,"period":360,"function":"interpolated","transition":true,"units":"degrees","doc":"Rotates hues around the color wheel."},"raster-brightness-min":{"type":"number","function":"interpolated","doc":"Increase or reduce the brightness of the image. The value is the minimum brightness.","default":0,"minimum":0,"maximum":1,"transition":true},"raster-brightness-max":{"type":"number","function":"interpolated","doc":"Increase or reduce the brightness of the image. The value is the maximum brightness.","default":1,"minimum":0,"maximum":1,"transition":true},"raster-saturation":{"type":"number","doc":"Increase or reduce the saturation of the image.","default":0,"minimum":-1,"maximum":1,"function":"interpolated","transition":true},"raster-contrast":{"type":"number","doc":"Increase or reduce the contrast of the image.","default":0,"minimum":-1,"maximum":1,"function":"interpolated","transition":true},"raster-fade-duration":{"type":"number","default":300,"minimum":0,"function":"interpolated","transition":true,"units":"milliseconds","doc":"Fade duration when a new tile is added."}};
	var paint_background = {"background-color":{"type":"color","default":"#000000","doc":"The color with which the background will be drawn.","function":"interpolated","transition":true,"requires":[{"!":"background-pattern"}]},"background-pattern":{"type":"string","function":"piecewise-constant","transition":true,"doc":"Name of image in sprite to use for drawing an image background. For seamless patterns, image width and height must be a factor of two (2, 4, 8, ..., 512)."},"background-opacity":{"type":"number","default":1,"minimum":0,"maximum":1,"doc":"The opacity at which the background will be drawn.","function":"interpolated","transition":true}};
	var transition = {"duration":{"type":"number","default":300,"minimum":0,"units":"milliseconds","doc":"Time allotted for transitions to complete."},"delay":{"type":"number","default":0,"minimum":0,"units":"milliseconds","doc":"Length of time before a transition begins."}};
	var require$$0$6 = {
		$version: $version,
		$root: $root,
		sources: sources,
		source: source,
		source_tile: source_tile,
		source_geojson: source_geojson,
		source_video: source_video,
		source_image: source_image,
		layer: layer,
		layout: layout,
		layout_background: layout_background,
		layout_fill: layout_fill,
		layout_circle: layout_circle,
		layout_line: layout_line,
		layout_symbol: layout_symbol,
		layout_raster: layout_raster,
		filter: filter,
		filter_operator: filter_operator,
		geometry_type: geometry_type,
		color_operation: color_operation,
		function_stop: function_stop,
		paint: paint,
		paint_fill: paint_fill,
		paint_line: paint_line,
		paint_circle: paint_circle,
		paint_symbol: paint_symbol,
		paint_raster: paint_raster,
		paint_background: paint_background,
		transition: transition,
		"function": {"stops":{"type":"array","required":true,"doc":"An array of stops.","value":"function_stop"},"base":{"type":"number","default":1,"minimum":0,"doc":"The exponential base of the interpolation curve. It controls the rate at which the result increases. Higher values make the result increase more towards the high end of the range. With `1` the stops are interpolated linearly."},"property":{"type":"string","doc":"The name of a global property or feature property to use as the function input.","default":"$zoom"},"type":{"type":"enum","values":["exponential","interval","categorical"],"doc":"The interpolation strategy to use in function evaluation.","default":"exponential"}}
	};

	var latest = __commonjs(function (module) {
	module.exports = require$$0$6;
	});

	var __latest = (latest && typeof latest === 'object' && 'default' in latest ? latest['default'] : latest);

	var inherits$1 = __commonjs(function (module) {
	'use strict';

	var inheritsImplementation;

	function inherits(ctor, superCtor) {
	  inheritsImplementation(ctor, superCtor);
	}

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  inheritsImplementation = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor;
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  inheritsImplementation = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor;
	    var TempCtor = function () {};
	    TempCtor.prototype = superCtor.prototype;
	    ctor.prototype = new TempCtor();
	    ctor.prototype.constructor = ctor;
	  }
	}

	module.exports = inherits;
	});

	var require$$0$8 = (inherits$1 && typeof inherits$1 === 'object' && 'default' in inherits$1 ? inherits$1['default'] : inherits$1);

	var util = __commonjs(function (module, exports, global) {
	'use strict';

	var inherits = require$$0$8;
	inherits = 'default' in inherits ? inherits['default'] : inherits;

	var isBufferImplementation;

	function isBuffer(arg) {
	  return isBufferImplementation(arg);
	}

	if (typeof Buffer === 'undefined') {
	  isBufferImplementation = function isBuffer(arg) {
	    return arg && typeof arg === 'object'
	      && typeof arg.copy === 'function'
	      && typeof arg.fill === 'function'
	      && typeof arg.readUInt8 === 'function';
	  };
	} else {
	  isBufferImplementation = function isBuffer(arg) {
	    return arg instanceof Buffer;
	  };
	}

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var formatRegExp = /%[sdj%]/g;
	function format(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	function deprecate(fn, msg) {
	  // Allow for deprecating things in the process of starting up.
	  if (isUndefined(global.process)) {
	    return function() {
	      return deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  if (process.noDeprecation === true) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnviron;
	function debuglog(set) {
	  if (isUndefined(debugEnviron))
	    debugEnviron = process.env.NODE_DEBUG || '';
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
	      var pid = process.pid;
	      debugs[set] = function() {
	        var msg = format.apply(this, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    _extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').substr(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.substr(1, name.length - 2);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var numLinesEst = 0;
	  var length = output.reduce(function(prev, cur) {
	    numLinesEst++;
	    if (cur.indexOf('\n') >= 0) numLinesEst++;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}

	function isNull(arg) {
	  return arg === null;
	}

	function isNullOrUndefined(arg) {
	  return arg == null;
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isString(arg) {
	  return typeof arg === 'string';
	}

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	function log() {
	  console.log('%s - %s', timestamp(), format.apply(this, arguments));
	}


	function _extend(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	}

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	exports.format = format;
	exports.deprecate = deprecate;
	exports.debuglog = debuglog;
	exports.inspect = inspect;
	exports.isArray = isArray;
	exports.isBoolean = isBoolean;
	exports.isNull = isNull;
	exports.isNullOrUndefined = isNullOrUndefined;
	exports.isNumber = isNumber;
	exports.isString = isString;
	exports.isSymbol = isSymbol;
	exports.isUndefined = isUndefined;
	exports.isRegExp = isRegExp;
	exports.isObject = isObject;
	exports.isDate = isDate;
	exports.isError = isError;
	exports.isFunction = isFunction;
	exports.isPrimitive = isPrimitive;
	exports.isBuffer = isBuffer;
	exports.log = log;
	exports.inherits = inherits;
	exports._extend = _extend;
	});

	var require$$0$7 = (util && typeof util === 'object' && 'default' in util ? util['default'] : util);

	var validation_error = __commonjs(function (module) {
	'use strict';

	var format = require$$0$7.format;

	function ValidationError(key, value /*, message, ...*/) {
	    this.message = (
	        (key ? key + ': ' : '') +
	        format.apply(format, Array.prototype.slice.call(arguments, 2))
	    );

	    if (value !== null && value !== undefined && value.__line__) {
	        this.line = value.__line__;
	    }
	}

	module.exports = ValidationError;
	});

	var require$$1$2 = (validation_error && typeof validation_error === 'object' && 'default' in validation_error ? validation_error['default'] : validation_error);

	var get_type = __commonjs(function (module) {
	'use strict';

	module.exports = function getType(val) {
	    if (val instanceof Number) {
	        return 'number';
	    } else if (val instanceof String) {
	        return 'string';
	    } else if (val instanceof Boolean) {
	        return 'boolean';
	    } else if (Array.isArray(val)) {
	        return 'array';
	    } else if (val === null) {
	        return 'null';
	    } else {
	        return typeof val;
	    }
	};
	});

	var require$$1$4 = (get_type && typeof get_type === 'object' && 'default' in get_type ? get_type['default'] : get_type);

	var validate_string = __commonjs(function (module) {
	'use strict';

	var getType = require$$1$4;
	var ValidationError = require$$1$2;

	module.exports = function validateString(options) {
	    var value = options.value;
	    var key = options.key;
	    var type = getType(value);

	    if (type !== 'string') {
	        return [new ValidationError(key, value, 'string expected, %s found', type)];
	    }

	    return [];
	};
	});

	var require$$0$9 = (validate_string && typeof validate_string === 'object' && 'default' in validate_string ? validate_string['default'] : validate_string);

	var unbundle_jsonlint = __commonjs(function (module) {
	'use strict';

	// Turn jsonlint-lines-primitives objects into primitive objects
	module.exports = function unbundle(value) {
	    if (value instanceof Number || value instanceof String || value instanceof Boolean) {
	        return value.valueOf();
	    } else {
	        return value;
	    }
	};
	});

	var require$$0$10 = (unbundle_jsonlint && typeof unbundle_jsonlint === 'object' && 'default' in unbundle_jsonlint ? unbundle_jsonlint['default'] : unbundle_jsonlint);

	var validate_enum = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var unbundle = require$$0$10;

	module.exports = function validateEnum(options) {
	    var key = options.key;
	    var value = options.value;
	    var valueSpec = options.valueSpec;
	    var errors = [];

	    if (valueSpec.values.indexOf(unbundle(value)) === -1) {
	        errors.push(new ValidationError(key, value, 'expected one of [%s], %s found', valueSpec.values.join(', '), value));
	    }
	    return errors;
	};
	});

	var require$$2$2 = (validate_enum && typeof validate_enum === 'object' && 'default' in validate_enum ? validate_enum['default'] : validate_enum);

	var validate_object = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var getType = require$$1$4;
	var validate = require$$1$3;

	module.exports = function validateObject(options) {
	    var key = options.key;
	    var object = options.value;
	    var valueSpec = options.valueSpec;
	    var objectElementValidators = options.objectElementValidators || {};
	    var style = options.style;
	    var styleSpec = options.styleSpec;
	    var errors = [];

	    var type = getType(object);
	    if (type !== 'object') {
	        return [new ValidationError(key, object, 'object expected, %s found', type)];
	    }

	    for (var objectKey in object) {
	        var valueSpecKey = objectKey.split('.')[0]; // treat 'paint.*' as 'paint'
	        var objectElementSpec = valueSpec && (valueSpec[valueSpecKey] || valueSpec['*']);
	        var objectElementValidator = objectElementValidators[valueSpecKey] || objectElementValidators['*'];

	        if (objectElementSpec || objectElementValidator) {
	            errors = errors.concat((objectElementValidator || validate)({
	                key: (key ? key + '.' : key) + objectKey,
	                value: object[objectKey],
	                valueSpec: objectElementSpec,
	                style: style,
	                styleSpec: styleSpec,
	                object: object,
	                objectKey: objectKey
	            }));

	        // tolerate root-level extra keys & arbitrary layer properties
	        // TODO remove this layer-specific logic
	        } else if (key !== '' && key.split('.').length !== 1) {
	            errors.push(new ValidationError(key, object[objectKey], 'unknown property "%s"', objectKey));
	        }
	    }

	    for (valueSpecKey in valueSpec) {
	        if (valueSpec[valueSpecKey].required && valueSpec[valueSpecKey]['default'] === undefined && object[valueSpecKey] === undefined) {
	            errors.push(new ValidationError(key, object, 'missing required property "%s"', valueSpecKey));
	        }
	    }

	    return errors;
	};
	});

	var require$$2$3 = (validate_object && typeof validate_object === 'object' && 'default' in validate_object ? validate_object['default'] : validate_object);

	var validate_source = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var unbundle = require$$0$10;
	var validateObject = require$$2$3;
	var validateEnum = require$$2$2;

	module.exports = function validateSource(options) {
	    var value = options.value;
	    var key = options.key;
	    var styleSpec = options.styleSpec;
	    var style = options.style;

	    if (!value.type) {
	        return [new ValidationError(key, value, '"type" is required')];
	    }

	    var type = unbundle(value.type);
	    switch (type) {
	        case 'vector':
	        case 'raster':
	            var errors = [];
	            errors = errors.concat(validateObject({
	                key: key,
	                value: value,
	                valueSpec: styleSpec.source_tile,
	                style: options.style,
	                styleSpec: styleSpec
	            }));
	            if ('url' in value) {
	                for (var prop in value) {
	                    if (['type', 'url', 'tileSize'].indexOf(prop) < 0) {
	                        errors.push(new ValidationError(key + '.' + prop, value[prop], 'a source with a "url" property may not include a "%s" property', prop));
	                    }
	                }
	            }
	            return errors;

	        case 'geojson':
	            return validateObject({
	                key: key,
	                value: value,
	                valueSpec: styleSpec.source_geojson,
	                style: style,
	                styleSpec: styleSpec
	            });

	        case 'video':
	            return validateObject({
	                key: key,
	                value: value,
	                valueSpec: styleSpec.source_video,
	                style: style,
	                styleSpec: styleSpec
	            });

	        case 'image':
	            return validateObject({
	                key: key,
	                value: value,
	                valueSpec: styleSpec.source_image,
	                style: style,
	                styleSpec: styleSpec
	            });

	        default:
	            return validateEnum({
	                key: key + '.type',
	                value: value.type,
	                valueSpec: {values: ['vector', 'raster', 'geojson', 'video', 'image']},
	                style: style,
	                styleSpec: styleSpec
	            });
	    }
	};
	});

	var require$$1$5 = (validate_source && typeof validate_source === 'object' && 'default' in validate_source ? validate_source['default'] : validate_source);

	var extend$1 = __commonjs(function (module) {
	'use strict';

	module.exports = function (output) {
	    for (var i = 1; i < arguments.length; i++) {
	        var input = arguments[i];
	        for (var k in input) {
	            output[k] = input[k];
	        }
	    }
	    return output;
	};
	});

	var require$$0$11 = (extend$1 && typeof extend$1 === 'object' && 'default' in extend$1 ? extend$1['default'] : extend$1);

	var validate_paint_property = __commonjs(function (module) {
	'use strict';

	var validate = require$$1$3;
	var ValidationError = require$$1$2;

	module.exports = function validatePaintProperty(options) {
	    var key = options.key;
	    var style = options.style;
	    var styleSpec = options.styleSpec;
	    var value = options.value;
	    var propertyKey = options.objectKey;
	    var layerSpec = styleSpec['paint_' + options.layerType];

	    var transitionMatch = propertyKey.match(/^(.*)-transition$/);

	    if (transitionMatch && layerSpec[transitionMatch[1]] && layerSpec[transitionMatch[1]].transition) {
	        return validate({
	            key: key,
	            value: value,
	            valueSpec: styleSpec.transition,
	            style: style,
	            styleSpec: styleSpec
	        });

	    } else if (options.valueSpec || layerSpec[propertyKey]) {
	        return validate({
	            key: options.key,
	            value: value,
	            valueSpec: options.valueSpec || layerSpec[propertyKey],
	            style: style,
	            styleSpec: styleSpec
	        });

	    } else {
	        return [new ValidationError(key, value, 'unknown property "%s"', propertyKey)];
	    }

	};
	});

	var require$$2$4 = (validate_paint_property && typeof validate_paint_property === 'object' && 'default' in validate_paint_property ? validate_paint_property['default'] : validate_paint_property);

	var validate_filter = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var validateEnum = require$$2$2;
	var getType = require$$1$4;
	var unbundle = require$$0$10;

	module.exports = function validateFilter(options) {
	    var value = options.value;
	    var key = options.key;
	    var styleSpec = options.styleSpec;
	    var type;

	    var errors = [];

	    if (getType(value) !== 'array') {
	        return [new ValidationError(key, value, 'array expected, %s found', getType(value))];
	    }

	    if (value.length < 1) {
	        return [new ValidationError(key, value, 'filter array must have at least 1 element')];
	    }

	    errors = errors.concat(validateEnum({
	        key: key + '[0]',
	        value: value[0],
	        valueSpec: styleSpec.filter_operator,
	        style: options.style,
	        styleSpec: options.styleSpec
	    }));

	    switch (unbundle(value[0])) {
	        case '<':
	        case '<=':
	        case '>':
	        case '>=':
	            if (value.length >= 2 && value[1] == '$type') {
	                errors.push(new ValidationError(key, value, '"$type" cannot be use with operator "%s"', value[0]));
	            }
	        /* falls through */
	        case '==':
	        case '!=':
	            if (value.length != 3) {
	                errors.push(new ValidationError(key, value, 'filter array for operator "%s" must have 3 elements', value[0]));
	            }
	        /* falls through */
	        case 'in':
	        case '!in':
	            if (value.length >= 2) {
	                type = getType(value[1]);
	                if (type !== 'string') {
	                    errors.push(new ValidationError(key + '[1]', value[1], 'string expected, %s found', type));
	                } else if (value[1][0] === '@') {
	                    errors.push(new ValidationError(key + '[1]', value[1], 'filter key cannot be a constant'));
	                }
	            }
	            for (var i = 2; i < value.length; i++) {
	                type = getType(value[i]);
	                if (value[1] == '$type') {
	                    errors = errors.concat(validateEnum({
	                        key: key + '[' + i + ']',
	                        value: value[i],
	                        valueSpec: styleSpec.geometry_type,
	                        style: options.style,
	                        styleSpec: options.styleSpec
	                    }));
	                } else if (type === 'string' && value[i][0] === '@') {
	                    errors.push(new ValidationError(key + '[' + i + ']', value[i], 'filter value cannot be a constant'));
	                } else if (type !== 'string' && type !== 'number' && type !== 'boolean') {
	                    errors.push(new ValidationError(key + '[' + i + ']', value[i], 'string, number, or boolean expected, %s found', type));
	                }
	            }
	            break;

	        case 'any':
	        case 'all':
	        case 'none':
	            for (i = 1; i < value.length; i++) {
	                errors = errors.concat(validateFilter({
	                    key: key + '[' + i + ']',
	                    value: value[i],
	                    style: options.style,
	                    styleSpec: options.styleSpec
	                }));
	            }
	            break;

	        case 'has':
	        case '!has':
	            type = getType(value[1]);
	            if (value.length !== 2) {
	                errors.push(new ValidationError(key, value, 'filter array for "%s" operator must have 2 elements', value[0]));
	            } else if (type !== 'string') {
	                errors.push(new ValidationError(key + '[1]', value[1], 'string expected, %s found', type));
	            } else if (value[1][0] === '@') {
	                errors.push(new ValidationError(key + '[1]', value[1], 'filter key cannot be a constant'));
	            }
	            break;

	    }

	    return errors;
	};
	});

	var require$$3$1 = (validate_filter && typeof validate_filter === 'object' && 'default' in validate_filter ? validate_filter['default'] : validate_filter);

	var validate_layer = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var unbundle = require$$0$10;
	var validateObject = require$$2$3;
	var validateFilter = require$$3$1;
	var validatePaintProperty = require$$2$4;
	var validateLayoutProperty = require$$1$1;
	var extend = require$$0$11;

	module.exports = function validateLayer(options) {
	    var errors = [];

	    var layer = options.value;
	    var key = options.key;
	    var style = options.style;
	    var styleSpec = options.styleSpec;

	    if (!layer.type && !layer.ref) {
	        errors.push(new ValidationError(key, layer, 'either "type" or "ref" is required'));
	    }
	    var type = unbundle(layer.type);
	    var ref = unbundle(layer.ref);

	    if (layer.id) {
	        for (var i = 0; i < options.arrayIndex; i++) {
	            var otherLayer = style.layers[i];
	            if (unbundle(otherLayer.id) === unbundle(layer.id)) {
	                errors.push(new ValidationError(key, layer.id, 'duplicate layer id "%s", previously used at line %d', layer.id, otherLayer.id.__line__));
	            }
	        }
	    }

	    if ('ref' in layer) {
	        ['type', 'source', 'source-layer', 'filter', 'layout'].forEach(function (p) {
	            if (p in layer) {
	                errors.push(new ValidationError(key, layer[p], '"%s" is prohibited for ref layers', p));
	            }
	        });

	        var parent;

	        style.layers.forEach(function(layer) {
	            if (layer.id == ref) parent = layer;
	        });

	        if (!parent) {
	            errors.push(new ValidationError(key, layer.ref, 'ref layer "%s" not found', ref));
	        } else if (parent.ref) {
	            errors.push(new ValidationError(key, layer.ref, 'ref cannot reference another ref layer'));
	        } else {
	            type = unbundle(parent.type);
	        }
	    } else if (type !== 'background') {
	        if (!layer.source) {
	            errors.push(new ValidationError(key, layer, 'missing required property "source"'));
	        } else {
	            var source = style.sources[layer.source];
	            if (!source) {
	                errors.push(new ValidationError(key, layer.source, 'source "%s" not found', layer.source));
	            } else if (source.type == 'vector' && type == 'raster') {
	                errors.push(new ValidationError(key, layer.source, 'layer "%s" requires a raster source', layer.id));
	            } else if (source.type == 'raster' && type != 'raster') {
	                errors.push(new ValidationError(key, layer.source, 'layer "%s" requires a vector source', layer.id));
	            } else if (source.type == 'vector' && !layer['source-layer']) {
	                errors.push(new ValidationError(key, layer, 'layer "%s" must specify a "source-layer"', layer.id));
	            }
	        }
	    }

	    errors = errors.concat(validateObject({
	        key: key,
	        value: layer,
	        valueSpec: styleSpec.layer,
	        style: options.style,
	        styleSpec: options.styleSpec,
	        objectElementValidators: {
	            filter: validateFilter,
	            layout: function(options) {
	                return validateObject({
	                    layer: layer,
	                    key: options.key,
	                    value: options.value,
	                    style: options.style,
	                    styleSpec: options.styleSpec,
	                    objectElementValidators: {
	                        '*': function(options) {
	                            return validateLayoutProperty(extend({layerType: type}, options));
	                        }
	                    }
	                });
	            },
	            paint: function(options) {
	                return validateObject({
	                    layer: layer,
	                    key: options.key,
	                    value: options.value,
	                    style: options.style,
	                    styleSpec: options.styleSpec,
	                    objectElementValidators: {
	                        '*': function(options) {
	                            return validatePaintProperty(extend({layerType: type}, options));
	                        }
	                    }
	                });
	            }
	        }
	    }));

	    return errors;
	};
	});

	var require$$3 = (validate_layer && typeof validate_layer === 'object' && 'default' in validate_layer ? validate_layer['default'] : validate_layer);

	var validate_number = __commonjs(function (module) {
	'use strict';

	var getType = require$$1$4;
	var ValidationError = require$$1$2;

	module.exports = function validateNumber(options) {
	    var key = options.key;
	    var value = options.value;
	    var valueSpec = options.valueSpec;
	    var type = getType(value);

	    if (type !== 'number') {
	        return [new ValidationError(key, value, 'number expected, %s found', type)];
	    }

	    if ('minimum' in valueSpec && value < valueSpec.minimum) {
	        return [new ValidationError(key, value, '%s is less than the minimum value %s', value, valueSpec.minimum)];
	    }

	    if ('maximum' in valueSpec && value > valueSpec.maximum) {
	        return [new ValidationError(key, value, '%s is greater than the maximum value %s', value, valueSpec.maximum)];
	    }

	    return [];
	};
	});

	var require$$0$12 = (validate_number && typeof validate_number === 'object' && 'default' in validate_number ? validate_number['default'] : validate_number);

	var validate_array = __commonjs(function (module) {
	'use strict';

	var getType = require$$1$4;
	var validate = require$$1$3;
	var ValidationError = require$$1$2;

	module.exports = function validateArray(options) {
	    var array = options.value;
	    var arraySpec = options.valueSpec;
	    var style = options.style;
	    var styleSpec = options.styleSpec;
	    var key = options.key;
	    var validateArrayElement = options.arrayElementValidator || validate;

	    if (getType(array) !== 'array') {
	        return [new ValidationError(key, array, 'array expected, %s found', getType(array))];
	    }

	    if (arraySpec.length && array.length !== arraySpec.length) {
	        return [new ValidationError(key, array, 'array length %d expected, length %d found', arraySpec.length, array.length)];
	    }

	    if (arraySpec['min-length'] && array.length < arraySpec['min-length']) {
	        return [new ValidationError(key, array, 'array length at least %d expected, length %d found', arraySpec['min-length'], array.length)];
	    }

	    var arrayElementSpec = {
	        "type": arraySpec.value
	    };

	    if (styleSpec.$version < 7) {
	        arrayElementSpec.function = arraySpec.function;
	    }

	    if (getType(arraySpec.value) === 'object') {
	        arrayElementSpec = arraySpec.value;
	    }

	    var errors = [];
	    for (var i = 0; i < array.length; i++) {
	        errors = errors.concat(validateArrayElement({
	            array: array,
	            arrayIndex: i,
	            value: array[i],
	            valueSpec: arrayElementSpec,
	            style: style,
	            styleSpec: styleSpec,
	            key: key + '[' + i + ']'
	        }));
	    }
	    return errors;
	};
	});

	var require$$1$6 = (validate_array && typeof validate_array === 'object' && 'default' in validate_array ? validate_array['default'] : validate_array);

	var validate_function = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var getType = require$$1$4;
	var validate = require$$1$3;
	var validateObject = require$$2$3;
	var validateArray = require$$1$6;
	var validateNumber = require$$0$12;

	module.exports = function validateFunction(options) {
	    var originalValueSpec = options.valueSpec;
	    var originalValue = options.value;

	    var stopKeyType;

	    return validateObject({
	        key: options.key,
	        value: options.value,
	        valueSpec: options.styleSpec.function,
	        style: options.style,
	        styleSpec: options.styleSpec,
	        objectElementValidators: { stops: validateFunctionStops }
	    });

	    function validateFunctionStops(options) {
	        var errors = [];
	        var value = options.value;

	        errors = errors.concat(validateArray({
	            key: options.key,
	            value: value,
	            valueSpec: options.valueSpec,
	            style: options.style,
	            styleSpec: options.styleSpec,
	            arrayElementValidator: validateFunctionStop
	        }));

	        if (getType(value) === 'array' && value.length === 0) {
	            errors.push(new ValidationError(options.key, value, 'array must have at least one stop'));
	        }

	        return errors;
	    }

	    function validateFunctionStop(options) {
	        var errors = [];
	        var value = options.value;
	        var key = options.key;

	        if (getType(value) !== 'array') {
	            return [new ValidationError(key, value, 'array expected, %s found', getType(value))];
	        }

	        if (value.length !== 2) {
	            return [new ValidationError(key, value, 'array length %d expected, length %d found', 2, value.length)];
	        }

	        var type = getType(value[0]);
	        if (!stopKeyType) stopKeyType = type;
	        if (type !== stopKeyType) {
	            return [new ValidationError(key, value, '%s stop key type must match previous stop key type %s', type, stopKeyType)];
	        }

	        if (type === 'object') {
	            if (value[0].zoom === undefined) {
	                return [new ValidationError(key, value, 'object stop key must have zoom')];
	            }
	            if (value[0].value === undefined) {
	                return [new ValidationError(key, value, 'object stop key must have value')];
	            }
	            errors = errors.concat(validateObject({
	                key: key + '[0]',
	                value: value[0],
	                valueSpec: { zoom: {} },
	                style: options.style,
	                styleSpec: options.styleSpec,
	                objectElementValidators: { zoom: validateNumber, value: validateValue }
	            }));
	        } else {
	            var isZoomFunction = !originalValue.property;
	            errors = errors.concat((isZoomFunction ? validateNumber : validateValue)({
	                key: key + '[0]',
	                value: value[0],
	                valueSpec: {},
	                style: options.style,
	                styleSpec: options.styleSpec
	            }));
	        }

	        errors = errors.concat(validate({
	            key: key + '[1]',
	            value: value[1],
	            valueSpec: originalValueSpec,
	            style: options.style,
	            styleSpec: options.styleSpec
	        }));

	        if (getType(value[0]) === 'number') {
	            if (originalValueSpec.function === 'piecewise-constant' && value[0] % 1 !== 0) {
	                errors.push(new ValidationError(key + '[0]', value[0], 'zoom level for piecewise-constant functions must be an integer'));
	            }

	            if (options.arrayIndex !== 0) {
	                if (value[0] < options.array[options.arrayIndex - 1][0]) {
	                    errors.push(new ValidationError(key + '[0]', value[0], 'array stops must appear in ascending order'));
	                }
	            }
	        }

	        return errors;
	    }

	    function validateValue(options) {
	        var errors = [];
	        var type = getType(options.value);
	        if (type !== 'number' && type !== 'string' && type !== 'array') {
	            errors.push(new ValidationError(options.key, options.value, 'property value must be a number, string or array'));
	        }
	        return errors;
	    }

	};
	});

	var require$$4 = (validate_function && typeof validate_function === 'object' && 'default' in validate_function ? validate_function['default'] : validate_function);

	var validate_constants = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var getType = require$$1$4;

	module.exports = function validateConstants(options) {
	    var key = options.key;
	    var constants = options.value;
	    var styleSpec = options.styleSpec;

	    if (styleSpec.$version > 7) {
	        if (constants) {
	            return [new ValidationError(key, constants, 'constants have been deprecated as of v8')];
	        } else {
	            return [];
	        }
	    } else {
	        var type = getType(constants);
	        if (type !== 'object') {
	            return [new ValidationError(key, constants, 'object expected, %s found', type)];
	        }

	        var errors = [];
	        for (var constantName in constants) {
	            if (constantName[0] !== '@') {
	                errors.push(new ValidationError(key + '.' + constantName, constants[constantName], 'constants must start with "@"'));
	            }
	        }
	        return errors;
	    }

	};
	});

	var require$$7 = (validate_constants && typeof validate_constants === 'object' && 'default' in validate_constants ? validate_constants['default'] : validate_constants);

	var validate_color = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var getType = require$$1$4;
	var parseCSSColor = require$$0$5.parseCSSColor;

	module.exports = function validateColor(options) {
	    var key = options.key;
	    var value = options.value;
	    var type = getType(value);

	    if (type !== 'string') {
	        return [new ValidationError(key, value, 'color expected, %s found', type)];
	    }

	    if (parseCSSColor(value) === null) {
	        return [new ValidationError(key, value, 'color expected, "%s" found', value)];
	    }

	    return [];
	};
	});

	var require$$8 = (validate_color && typeof validate_color === 'object' && 'default' in validate_color ? validate_color['default'] : validate_color);

	var validate_boolean = __commonjs(function (module) {
	'use strict';

	var getType = require$$1$4;
	var ValidationError = require$$1$2;

	module.exports = function validateBoolean(options) {
	    var value = options.value;
	    var key = options.key;
	    var type = getType(value);

	    if (type !== 'boolean') {
	        return [new ValidationError(key, value, 'boolean expected, %s found', type)];
	    }

	    return [];
	};
	});

	var require$$10 = (validate_boolean && typeof validate_boolean === 'object' && 'default' in validate_boolean ? validate_boolean['default'] : validate_boolean);

	var validate = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var getType = require$$1$4;
	var extend = require$$0$11;

	// Main recursive validation function. Tracks:
	//
	// - key: string representing location of validation in style tree. Used only
	//   for more informative error reporting.
	// - value: current value from style being evaluated. May be anything from a
	//   high level object that needs to be descended into deeper or a simple
	//   scalar value.
	// - valueSpec: current spec being evaluated. Tracks value.

	module.exports = function validate(options) {

	    var validateFunction = require$$4;
	    var validateObject = require$$2$3;
	    var VALIDATORS = {
	        '*': function() {
	            return [];
	        },
	        'array': require$$1$6,
	        'boolean': require$$10,
	        'number': require$$0$12,
	        'color': require$$8,
	        'constants': require$$7,
	        'enum': require$$2$2,
	        'filter': require$$3$1,
	        'function': require$$4,
	        'layer': require$$3,
	        'object': require$$2$3,
	        'source': require$$1$5,
	        'string': require$$0$9
	    };

	    var value = options.value;
	    var valueSpec = options.valueSpec;
	    var key = options.key;
	    var styleSpec = options.styleSpec;
	    var style = options.style;

	    if (getType(value) === 'string' && value[0] === '@') {
	        if (styleSpec.$version > 7) {
	            return [new ValidationError(key, value, 'constants have been deprecated as of v8')];
	        }
	        if (!(value in style.constants)) {
	            return [new ValidationError(key, value, 'constant "%s" not found', value)];
	        }
	        options = extend({}, options, { value: style.constants[value] });
	    }

	    if (valueSpec.function && getType(value) === 'object') {
	        return validateFunction(options);

	    } else if (valueSpec.type && VALIDATORS[valueSpec.type]) {
	        return VALIDATORS[valueSpec.type](options);

	    } else {
	        return validateObject(extend({}, options, {
	            valueSpec: valueSpec.type ? styleSpec[valueSpec.type] : valueSpec
	        }));
	    }
	};
	});

	var require$$1$3 = (validate && typeof validate === 'object' && 'default' in validate ? validate['default'] : validate);

	var validate_layout_property = __commonjs(function (module) {
	'use strict';

	var validate = require$$1$3;
	var ValidationError = require$$1$2;

	module.exports = function validateLayoutProperty(options) {
	    var key = options.key;
	    var style = options.style;
	    var styleSpec = options.styleSpec;
	    var value = options.value;
	    var propertyKey = options.objectKey;
	    var layerSpec = styleSpec['layout_' + options.layerType];

	    if (options.valueSpec || layerSpec[propertyKey]) {
	        var errors = [];

	        if (options.layerType === 'symbol') {
	            if (propertyKey === 'icon-image' && style && !style.sprite) {
	                errors.push(new ValidationError(key, value, 'use of "icon-image" requires a style "sprite" property'));
	            } else if (propertyKey === 'text-field' && style && !style.glyphs) {
	                errors.push(new ValidationError(key, value, 'use of "text-field" requires a style "glyphs" property'));
	            }
	        }

	        return errors.concat(validate({
	            key: options.key,
	            value: value,
	            valueSpec: options.valueSpec || layerSpec[propertyKey],
	            style: style,
	            styleSpec: styleSpec
	        }));

	    } else {
	        return [new ValidationError(key, value, 'unknown property "%s"', propertyKey)];
	    }

	};
	});

	var require$$1$1 = (validate_layout_property && typeof validate_layout_property === 'object' && 'default' in validate_layout_property ? validate_layout_property['default'] : validate_layout_property);

	var validate_glyphs_url = __commonjs(function (module) {
	'use strict';

	var ValidationError = require$$1$2;
	var validateString = require$$0$9;

	module.exports = function(options) {
	    var value = options.value;
	    var key = options.key;

	    var errors = validateString(options);
	    if (errors.length) return errors;

	    if (value.indexOf('{fontstack}') === -1) {
	        errors.push(new ValidationError(key, value, '"glyphs" url must include a "{fontstack}" token'));
	    }

	    if (value.indexOf('{range}') === -1) {
	        errors.push(new ValidationError(key, value, '"glyphs" url must include a "{range}" token'));
	    }

	    return errors;
	};
	});

	var require$$5 = (validate_glyphs_url && typeof validate_glyphs_url === 'object' && 'default' in validate_glyphs_url ? validate_glyphs_url['default'] : validate_glyphs_url);

	var $version$1 = 8;
	var $root$1 = {"version":{"required":true,"type":"enum","values":[8]},"name":{"type":"string"},"metadata":{"type":"*"},"center":{"type":"array","value":"number"},"zoom":{"type":"number"},"bearing":{"type":"number","default":0,"period":360,"units":"degrees"},"pitch":{"type":"number","default":0,"units":"degrees"},"sources":{"required":true,"type":"sources"},"sprite":{"type":"string"},"glyphs":{"type":"string"},"transition":{"type":"transition"},"layers":{"required":true,"type":"array","value":"layer"}};
	var sources$1 = {"*":{"type":"source"}};
	var source$1 = ["source_tile","source_geojson","source_video","source_image"];
	var source_tile$1 = {"type":{"required":true,"type":"enum","values":["vector","raster"]},"url":{"type":"string"},"tiles":{"type":"array","value":"string"},"minzoom":{"type":"number","default":0},"maxzoom":{"type":"number","default":22},"tileSize":{"type":"number","default":512,"units":"pixels"},"*":{"type":"*"}};
	var source_geojson$1 = {"type":{"required":true,"type":"enum","values":["geojson"]},"data":{"type":"*"},"maxzoom":{"type":"number","default":14},"buffer":{"type":"number","default":64},"tolerance":{"type":"number","default":3},"cluster":{"type":"boolean","default":false},"clusterRadius":{"type":"number","default":400},"clusterMaxZoom":{"type":"number"}};
	var source_video$1 = {"type":{"required":true,"type":"enum","values":["video"]},"urls":{"required":true,"type":"array","value":"string"},"coordinates":{"required":true,"type":"array","length":4,"value":{"type":"array","length":2,"value":"number"}}};
	var source_image$1 = {"type":{"required":true,"type":"enum","values":["image"]},"url":{"required":true,"type":"string"},"coordinates":{"required":true,"type":"array","length":4,"value":{"type":"array","length":2,"value":"number"}}};
	var layer$1 = {"id":{"type":"string","required":true},"type":{"type":"enum","values":["fill","line","symbol","circle","raster","background"]},"metadata":{"type":"*"},"ref":{"type":"string"},"source":{"type":"string"},"source-layer":{"type":"string"},"minzoom":{"type":"number","minimum":0,"maximum":22},"maxzoom":{"type":"number","minimum":0,"maximum":22},"interactive":{"type":"boolean","default":false},"filter":{"type":"filter"},"layout":{"type":"layout"},"paint":{"type":"paint"},"paint.*":{"type":"paint"}};
	var layout$1 = ["layout_fill","layout_line","layout_circle","layout_symbol","layout_raster","layout_background"];
	var layout_background$1 = {"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible"}};
	var layout_fill$1 = {"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible"}};
	var layout_circle$1 = {"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible"}};
	var layout_line$1 = {"line-cap":{"type":"enum","function":"piecewise-constant","values":["butt","round","square"],"default":"butt"},"line-join":{"type":"enum","function":"piecewise-constant","values":["bevel","round","miter"],"default":"miter"},"line-miter-limit":{"type":"number","default":2,"function":"interpolated","requires":[{"line-join":"miter"}]},"line-round-limit":{"type":"number","default":1.05,"function":"interpolated","requires":[{"line-join":"round"}]},"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible"}};
	var layout_symbol$1 = {"symbol-placement":{"type":"enum","function":"piecewise-constant","values":["point","line"],"default":"point"},"symbol-spacing":{"type":"number","default":250,"minimum":1,"function":"interpolated","units":"pixels","requires":[{"symbol-placement":"line"}]},"symbol-avoid-edges":{"type":"boolean","function":"piecewise-constant","default":false},"icon-allow-overlap":{"type":"boolean","function":"piecewise-constant","default":false,"requires":["icon-image"]},"icon-ignore-placement":{"type":"boolean","function":"piecewise-constant","default":false,"requires":["icon-image"]},"icon-optional":{"type":"boolean","function":"piecewise-constant","default":false,"requires":["icon-image","text-field"]},"icon-rotation-alignment":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"default":"viewport","requires":["icon-image"]},"icon-size":{"type":"number","default":1,"minimum":0,"function":"interpolated","requires":["icon-image"]},"icon-image":{"type":"string","function":"piecewise-constant","tokens":true},"icon-rotate":{"type":"number","default":0,"period":360,"function":"interpolated","units":"degrees","requires":["icon-image"]},"icon-padding":{"type":"number","default":2,"minimum":0,"function":"interpolated","units":"pixels","requires":["icon-image"]},"icon-keep-upright":{"type":"boolean","function":"piecewise-constant","default":false,"requires":["icon-image",{"icon-rotation-alignment":"map"},{"symbol-placement":"line"}]},"icon-offset":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","requires":["icon-image"]},"text-rotation-alignment":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"default":"viewport","requires":["text-field"]},"text-field":{"type":"string","function":"piecewise-constant","default":"","tokens":true},"text-font":{"type":"array","value":"string","function":"piecewise-constant","default":["Open Sans Regular","Arial Unicode MS Regular"],"requires":["text-field"]},"text-size":{"type":"number","default":16,"minimum":0,"units":"pixels","function":"interpolated","requires":["text-field"]},"text-max-width":{"type":"number","default":10,"minimum":0,"units":"em","function":"interpolated","requires":["text-field"]},"text-line-height":{"type":"number","default":1.2,"units":"em","function":"interpolated","requires":["text-field"]},"text-letter-spacing":{"type":"number","default":0,"units":"em","function":"interpolated","requires":["text-field"]},"text-justify":{"type":"enum","function":"piecewise-constant","values":["left","center","right"],"default":"center","requires":["text-field"]},"text-anchor":{"type":"enum","function":"piecewise-constant","values":["center","left","right","top","bottom","top-left","top-right","bottom-left","bottom-right"],"default":"center","requires":["text-field"]},"text-max-angle":{"type":"number","default":45,"units":"degrees","function":"interpolated","requires":["text-field",{"symbol-placement":"line"}]},"text-rotate":{"type":"number","default":0,"period":360,"units":"degrees","function":"interpolated","requires":["text-field"]},"text-padding":{"type":"number","default":2,"minimum":0,"units":"pixels","function":"interpolated","requires":["text-field"]},"text-keep-upright":{"type":"boolean","function":"piecewise-constant","default":true,"requires":["text-field",{"text-rotation-alignment":"map"},{"symbol-placement":"line"}]},"text-transform":{"type":"enum","function":"piecewise-constant","values":["none","uppercase","lowercase"],"default":"none","requires":["text-field"]},"text-offset":{"type":"array","value":"number","units":"ems","function":"interpolated","length":2,"default":[0,0],"requires":["text-field"]},"text-allow-overlap":{"type":"boolean","function":"piecewise-constant","default":false,"requires":["text-field"]},"text-ignore-placement":{"type":"boolean","function":"piecewise-constant","default":false,"requires":["text-field"]},"text-optional":{"type":"boolean","function":"piecewise-constant","default":false,"requires":["text-field","icon-image"]},"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible"}};
	var layout_raster$1 = {"visibility":{"type":"enum","function":"piecewise-constant","values":["visible","none"],"default":"visible"}};
	var filter$1 = {"type":"array","value":"*"};
	var filter_operator$1 = {"type":"enum","values":["==","!=",">",">=","<","<=","in","!in","all","any","none","has","!has"]};
	var geometry_type$1 = {"type":"enum","values":["Point","LineString","Polygon"]};
	var color_operation$1 = {"type":"enum","values":["lighten","saturate","spin","fade","mix"]};
	var function_stop$1 = {"type":"array","minimum":0,"maximum":22,"value":["number","color"],"length":2};
	var paint$1 = ["paint_fill","paint_line","paint_circle","paint_symbol","paint_raster","paint_background"];
	var paint_fill$1 = {"fill-antialias":{"type":"boolean","function":"piecewise-constant","default":true},"fill-opacity":{"type":"number","function":"interpolated","default":1,"minimum":0,"maximum":1,"transition":true},"fill-color":{"type":"color","default":"#000000","function":"interpolated","transition":true,"requires":[{"!":"fill-pattern"}]},"fill-outline-color":{"type":"color","function":"interpolated","transition":true,"requires":[{"!":"fill-pattern"},{"fill-antialias":true}]},"fill-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels"},"fill-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"default":"map","requires":["fill-translate"]},"fill-pattern":{"type":"string","function":"piecewise-constant","transition":true}};
	var paint_line$1 = {"line-opacity":{"type":"number","function":"interpolated","default":1,"minimum":0,"maximum":1,"transition":true},"line-color":{"type":"color","default":"#000000","function":"interpolated","transition":true,"requires":[{"!":"line-pattern"}]},"line-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels"},"line-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"default":"map","requires":["line-translate"]},"line-width":{"type":"number","default":1,"minimum":0,"function":"interpolated","transition":true,"units":"pixels"},"line-gap-width":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels"},"line-offset":{"type":"number","default":0,"function":"interpolated","transition":true,"units":"pixels"},"line-blur":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels"},"line-dasharray":{"type":"array","value":"number","function":"piecewise-constant","minimum":0,"transition":true,"units":"line widths","requires":[{"!":"line-pattern"}]},"line-pattern":{"type":"string","function":"piecewise-constant","transition":true}};
	var paint_circle$1 = {"circle-radius":{"type":"number","default":5,"minimum":0,"function":"interpolated","transition":true,"units":"pixels"},"circle-color":{"type":"color","default":"#000000","function":"interpolated","transition":true},"circle-blur":{"type":"number","default":0,"function":"interpolated","transition":true},"circle-opacity":{"type":"number","default":1,"minimum":0,"maximum":1,"function":"interpolated","transition":true},"circle-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels"},"circle-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"default":"map","requires":["circle-translate"]}};
	var paint_symbol$1 = {"icon-opacity":{"type":"number","default":1,"minimum":0,"maximum":1,"function":"interpolated","transition":true,"requires":["icon-image"]},"icon-color":{"type":"color","default":"#000000","function":"interpolated","transition":true,"requires":["icon-image"]},"icon-halo-color":{"type":"color","default":"rgba(0, 0, 0, 0)","function":"interpolated","transition":true,"requires":["icon-image"]},"icon-halo-width":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","requires":["icon-image"]},"icon-halo-blur":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","requires":["icon-image"]},"icon-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels","requires":["icon-image"]},"icon-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"default":"map","requires":["icon-image","icon-translate"]},"text-opacity":{"type":"number","default":1,"minimum":0,"maximum":1,"function":"interpolated","transition":true,"requires":["text-field"]},"text-color":{"type":"color","default":"#000000","function":"interpolated","transition":true,"requires":["text-field"]},"text-halo-color":{"type":"color","default":"rgba(0, 0, 0, 0)","function":"interpolated","transition":true,"requires":["text-field"]},"text-halo-width":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","requires":["text-field"]},"text-halo-blur":{"type":"number","default":0,"minimum":0,"function":"interpolated","transition":true,"units":"pixels","requires":["text-field"]},"text-translate":{"type":"array","value":"number","length":2,"default":[0,0],"function":"interpolated","transition":true,"units":"pixels","requires":["text-field"]},"text-translate-anchor":{"type":"enum","function":"piecewise-constant","values":["map","viewport"],"default":"map","requires":["text-field","text-translate"]}};
	var paint_raster$1 = {"raster-opacity":{"type":"number","default":1,"minimum":0,"maximum":1,"function":"interpolated","transition":true},"raster-hue-rotate":{"type":"number","default":0,"period":360,"function":"interpolated","transition":true,"units":"degrees"},"raster-brightness-min":{"type":"number","function":"interpolated","default":0,"minimum":0,"maximum":1,"transition":true},"raster-brightness-max":{"type":"number","function":"interpolated","default":1,"minimum":0,"maximum":1,"transition":true},"raster-saturation":{"type":"number","default":0,"minimum":-1,"maximum":1,"function":"interpolated","transition":true},"raster-contrast":{"type":"number","default":0,"minimum":-1,"maximum":1,"function":"interpolated","transition":true},"raster-fade-duration":{"type":"number","default":300,"minimum":0,"function":"interpolated","transition":true,"units":"milliseconds"}};
	var paint_background$1 = {"background-color":{"type":"color","default":"#000000","function":"interpolated","transition":true,"requires":[{"!":"background-pattern"}]},"background-pattern":{"type":"string","function":"piecewise-constant","transition":true},"background-opacity":{"type":"number","default":1,"minimum":0,"maximum":1,"function":"interpolated","transition":true}};
	var transition$1 = {"duration":{"type":"number","default":300,"minimum":0,"units":"milliseconds"},"delay":{"type":"number","default":0,"minimum":0,"units":"milliseconds"}};
	var require$$0$13 = {
		$version: $version$1,
		$root: $root$1,
		sources: sources$1,
		source: source$1,
		source_tile: source_tile$1,
		source_geojson: source_geojson$1,
		source_video: source_video$1,
		source_image: source_image$1,
		layer: layer$1,
		layout: layout$1,
		layout_background: layout_background$1,
		layout_fill: layout_fill$1,
		layout_circle: layout_circle$1,
		layout_line: layout_line$1,
		layout_symbol: layout_symbol$1,
		layout_raster: layout_raster$1,
		filter: filter$1,
		filter_operator: filter_operator$1,
		geometry_type: geometry_type$1,
		color_operation: color_operation$1,
		function_stop: function_stop$1,
		paint: paint$1,
		paint_fill: paint_fill$1,
		paint_line: paint_line$1,
		paint_circle: paint_circle$1,
		paint_symbol: paint_symbol$1,
		paint_raster: paint_raster$1,
		paint_background: paint_background$1,
		transition: transition$1,
		"function": {"stops":{"type":"array","required":true,"value":"function_stop"},"base":{"type":"number","default":1,"minimum":0},"property":{"type":"string","default":"$zoom"},"type":{"type":"enum","values":["exponential","interval","categorical"],"default":"exponential"}}
	};

	var latest_min = __commonjs(function (module) {
	module.exports = require$$0$13;
	});

	var require$$6 = (latest_min && typeof latest_min === 'object' && 'default' in latest_min ? latest_min['default'] : latest_min);

	var validate_style_min = __commonjs(function (module) {
	'use strict';

	var validateConstants = require$$7;
	var validate = require$$1$3;
	var latestStyleSpec = require$$6;
	var validateGlyphsURL = require$$5;

	/**
	 * Validate a Mapbox GL style against the style specification. This entrypoint,
	 * `mapbox-gl-style-spec/lib/validate_style.min`, is designed to produce as
	 * small a browserify bundle as possible by omitting unnecessary functionality
	 * and legacy style specifications.
	 *
	 * @param {Object} style The style to be validated.
	 * @param {Object} [styleSpec] The style specification to validate against.
	 *     If omitted, the latest style spec is used.
	 * @returns {Array<ValidationError>}
	 * @example
	 *   var validate = require('mapbox-gl-style-spec/lib/validate_style.min');
	 *   var errors = validate(style);
	 */
	function validateStyleMin(style, styleSpec) {
	    styleSpec = styleSpec || latestStyleSpec;

	    var errors = [];

	    errors = errors.concat(validate({
	        key: '',
	        value: style,
	        valueSpec: styleSpec.$root,
	        styleSpec: styleSpec,
	        style: style,
	        objectElementValidators: {
	            glyphs: validateGlyphsURL
	        }
	    }));

	    if (styleSpec.$version > 7 && style.constants) {
	        errors = errors.concat(validateConstants({
	            key: 'constants',
	            value: style.constants,
	            style: style,
	            styleSpec: styleSpec
	        }));
	    }

	    return sortErrors(errors);
	}

	validateStyleMin.source = wrapCleanErrors(require$$1$5);
	validateStyleMin.layer = wrapCleanErrors(require$$3);
	validateStyleMin.filter = wrapCleanErrors(require$$3$1);
	validateStyleMin.paintProperty = wrapCleanErrors(require$$2$4);
	validateStyleMin.layoutProperty = wrapCleanErrors(require$$1$1);

	function sortErrors(errors) {
	    return [].concat(errors).sort(function (a, b) {
	        return a.line - b.line;
	    });
	}

	function wrapCleanErrors(inner) {
	    return function() {
	        return sortErrors(inner.apply(this, arguments));
	    };
	}

	module.exports = validateStyleMin;
	});

	var __min = (validate_style_min && typeof validate_style_min === 'object' && 'default' in validate_style_min ? validate_style_min['default'] : validate_style_min);

	var emitErrors = function throwErrors(emitter, errors) {
	    if (errors && errors.length) {
	        for (var i = 0; i < errors.length; i++) {
	            emitter.fire('error', { error: new Error(errors[i].message) });
	        }
	        return true;
	    } else {
	        return false;
	    }
	};

	var throwErrors = function throwErrors(emitter, errors) {
	    if (errors) {
	        for (var i = 0; i < errors.length; i++) {
	            throw new Error(errors[i].message);
	        }
	    }
	};


	var validateStyle = Object.freeze({
	    default: __min,
	    emitErrors: emitErrors,
	    throwErrors: throwErrors
	});

	/**
	 * Methods mixed in to other classes for event capabilities.
	 * @mixin Evented
	 */
	var Evented = {

	    /**
	     * Subscribe to a specified event with a listener function the latter gets the data object that was passed to `fire` and additionally `target` and `type` properties
	     *
	     * @param {string} type Event type
	     * @param {Function} listener Function to be called when the event is fired
	     * @returns {Object} `this`
	     */
	    on: function(type, listener) {
	        this._events = this._events || {};
	        this._events[type] = this._events[type] || [];
	        this._events[type].push(listener);

	        return this;
	    },

	    /**
	     * Remove a event listener
	     *
	     * @param {string} [type] Event type. If none is specified, remove all listeners
	     * @param {Function} [listener] Function to be called when the event is fired. If none is specified all listeners are removed
	     * @returns {Object} `this`
	     */
	    off: function(type, listener) {
	        if (!type) {
	            // clear all listeners if no arguments specified
	            delete this._events;
	            return this;
	        }

	        if (!this.listens(type)) return this;

	        if (listener) {
	            var idx = this._events[type].indexOf(listener);
	            if (idx >= 0) {
	                this._events[type].splice(idx, 1);
	            }
	            if (!this._events[type].length) {
	                delete this._events[type];
	            }
	        } else {
	            delete this._events[type];
	        }

	        return this;
	    },

	    /**
	     * Call a function once when an event has fired
	     *
	     * @param {string} type Event type.
	     * @param {Function} listener Function to be called once when the event is fired
	     * @returns {Object} `this`
	     */
	    once: function(type, listener) {
	        var wrapper = function(data) {
	            this.off(type, wrapper);
	            listener.call(this, data);
	        }.bind(this);
	        this.on(type, wrapper);
	        return this;
	    },

	    /**
	     * Fire event of a given string type with the given data object
	     *
	     * @param {string} type Event type
	     * @param {Object} [data] Optional data passed to the event receiver (e.g. {@link EventData})
	     * @returns {Object} `this`
	     */
	    fire: function(type, data) {
	        if (!this.listens(type)) return this;

	        data = extend({}, data);
	        extend(data, {type: type, target: this});

	        // make sure adding/removing listeners inside other listeners won't cause infinite loop
	        var listeners = this._events[type].slice();

	        for (var i = 0; i < listeners.length; i++) {
	            listeners[i].call(this, data);
	        }

	        return this;
	    },

	    /**
	     * Check if an event is registered to a type
	     * @param {string} type Event type
	     * @returns {boolean} `true` if there is at least one registered listener for events of type `type`
	     */
	    listens: function(type) {
	        return !!(this._events && this._events[type]);
	    }
	};

	var TRANSITION_SUFFIX = '-transition';

	StyleLayer.create = function(layer, refLayer) {
	    var Classes = {
	        background: BackgroundStyleLayer,
	        circle: CircleStyleLayer,
	        fill: FillStyleLayer,
	        line: LineStyleLayer,
	        raster: RasterStyleLayer,
	        symbol: SymbolStyleLayer
	    };
	    return new Classes[(refLayer || layer).type](layer, refLayer);
	};

	function StyleLayer(layer, refLayer) {
	    this.set(layer, refLayer);
	}

	StyleLayer.prototype = inherit(Evented, {

	    set: function(layer, refLayer) {
	        this.id = layer.id;
	        this.ref = layer.ref;
	        this.metadata = layer.metadata;
	        this.type = (refLayer || layer).type;
	        this.source = (refLayer || layer).source;
	        this.sourceLayer = (refLayer || layer)['source-layer'];
	        this.minzoom = (refLayer || layer).minzoom;
	        this.maxzoom = (refLayer || layer).maxzoom;
	        this.filter = (refLayer || layer).filter;

	        this.paint = {};
	        this.layout = {};

	        this._paintSpecifications = __latest['paint_' + this.type];
	        this._layoutSpecifications = __latest['layout_' + this.type];

	        this._paintTransitions = {}; // {[propertyName]: StyleTransition}
	        this._paintTransitionOptions = {}; // {[className]: {[propertyName]: { duration:Number, delay:Number }}}
	        this._paintDeclarations = {}; // {[className]: {[propertyName]: StyleDeclaration}}
	        this._layoutDeclarations = {}; // {[propertyName]: StyleDeclaration}
	        this._layoutFunctions = {}; // {[propertyName]: Boolean}

	        var paintName, layoutName;

	        // Resolve paint declarations
	        for (var key in layer) {
	            var match = key.match(/^paint(?:\.(.*))?$/);
	            if (match) {
	                var klass = match[1] || '';
	                for (paintName in layer[key]) {
	                    this.setPaintProperty(paintName, layer[key][paintName], klass);
	                }
	            }
	        }

	        // Resolve layout declarations
	        if (this.ref) {
	            this._layoutDeclarations = refLayer._layoutDeclarations;
	        } else {
	            for (layoutName in layer.layout) {
	                this.setLayoutProperty(layoutName, layer.layout[layoutName]);
	            }
	        }

	        // set initial layout/paint values
	        for (paintName in this._paintSpecifications) {
	            this.paint[paintName] = this.getPaintValue(paintName);
	        }
	        for (layoutName in this._layoutSpecifications) {
	            this._updateLayoutValue(layoutName);
	        }
	    },

	    setLayoutProperty: function(name, value) {

	        if (value == null) {
	            delete this._layoutDeclarations[name];
	        } else {
	            var key = 'layers.' + this.id + '.layout.' + name;
	            if (this._handleErrors(undefined, key, name, value)) return;
	            this._layoutDeclarations[name] = new StyleDeclaration(this._layoutSpecifications[name], value);
	        }
	        this._updateLayoutValue(name);
	    },

	    getLayoutProperty: function(name) {
	        return (
	            this._layoutDeclarations[name] &&
	            this._layoutDeclarations[name].value
	        );
	    },

	    getLayoutValue: function(name, globalProperties, featureProperties) {
	        var specification = this._layoutSpecifications[name];
	        var declaration = this._layoutDeclarations[name];

	        if (declaration) {
	            return declaration.calculate(globalProperties, featureProperties);
	        } else {
	            return specification.default;
	        }
	    },

	    setPaintProperty: function(name, value, klass) {
	        var validateStyleKey = 'layers.' + this.id + (klass ? '["paint.' + klass + '"].' : '.paint.') + name;

	        if (endsWith(name, TRANSITION_SUFFIX)) {
	            if (!this._paintTransitionOptions[klass || '']) {
	                this._paintTransitionOptions[klass || ''] = {};
	            }
	            if (value === null || value === undefined) {
	                delete this._paintTransitionOptions[klass || ''][name];
	            } else {
	                if (this._handleErrors(undefined, validateStyleKey, name, value)) return;
	                this._paintTransitionOptions[klass || ''][name] = value;
	            }
	        } else {
	            if (!this._paintDeclarations[klass || '']) {
	                this._paintDeclarations[klass || ''] = {};
	            }
	            if (value === null || value === undefined) {
	                delete this._paintDeclarations[klass || ''][name];
	            } else {
	                if (this._handleErrors(undefined, validateStyleKey, name, value)) return;
	                this._paintDeclarations[klass || ''][name] = new StyleDeclaration(this._paintSpecifications[name], value);
	            }
	        }
	    },

	    getPaintProperty: function(name, klass) {
	        klass = klass || '';
	        if (endsWith(name, TRANSITION_SUFFIX)) {
	            return (
	                this._paintTransitionOptions[klass] &&
	                this._paintTransitionOptions[klass][name]
	            );
	        } else {
	            return (
	                this._paintDeclarations[klass] &&
	                this._paintDeclarations[klass][name] &&
	                this._paintDeclarations[klass][name].value
	            );
	        }
	    },

	    getPaintValue: function(name, globalProperties, featureProperties) {
	        var specification = this._paintSpecifications[name];
	        var transition = this._paintTransitions[name];

	        if (transition) {
	            return transition.calculate(globalProperties, featureProperties);
	        } else if (specification.type === 'color' && specification.default) {
	            return parseColor(specification.default);
	        } else {
	            return specification.default;
	        }
	    },

	    getPaintValueStopZoomLevels: function(name) {
	        var transition = this._paintTransitions[name];
	        if (transition) {
	            return transition.declaration.stopZoomLevels;
	        } else {
	            return [];
	        }
	    },

	    getPaintInterpolationT: function(name, zoom) {
	        var transition = this._paintTransitions[name];
	        return transition.declaration.calculateInterpolationT({ zoom: zoom });
	    },

	    isPaintValueFeatureConstant: function(name) {
	        var transition = this._paintTransitions[name];

	        if (transition) {
	            return transition.declaration.isFeatureConstant;
	        } else {
	            return true;
	        }
	    },

	    isPaintValueZoomConstant: function(name) {
	        var transition = this._paintTransitions[name];

	        if (transition) {
	            return transition.declaration.isZoomConstant;
	        } else {
	            return true;
	        }
	    },


	    isHidden: function(zoom) {
	        if (this.minzoom && zoom < this.minzoom) return true;
	        if (this.maxzoom && zoom >= this.maxzoom) return true;
	        if (this.layout['visibility'] === 'none') return true;
	        if (this.paint[this.type + '-opacity'] === 0) return true;
	        return false;
	    },

	    updatePaintTransitions: function(classes, options, globalOptions, animationLoop) {
	        var declarations = extend({}, this._paintDeclarations['']);
	        for (var i = 0; i < classes.length; i++) {
	            extend(declarations, this._paintDeclarations[classes[i]]);
	        }

	        var name;
	        for (name in declarations) { // apply new declarations
	            this._applyPaintDeclaration(name, declarations[name], options, globalOptions, animationLoop);
	        }
	        for (name in this._paintTransitions) {
	            if (!(name in declarations)) // apply removed declarations
	                this._applyPaintDeclaration(name, null, options, globalOptions, animationLoop);
	        }
	    },

	    updatePaintTransition: function(name, classes, options, globalOptions, animationLoop) {
	        var declaration = this._paintDeclarations[''][name];
	        for (var i = 0; i < classes.length; i++) {
	            var classPaintDeclarations = this._paintDeclarations[classes[i]];
	            if (classPaintDeclarations && classPaintDeclarations[name]) {
	                declaration = classPaintDeclarations[name];
	            }
	        }
	        this._applyPaintDeclaration(name, declaration, options, globalOptions, animationLoop);
	    },

	    // update all zoom-dependent layout/paint values
	    recalculate: function(zoom, zoomHistory) {
	        for (var paintName in this._paintTransitions) {
	            this.paint[paintName] = this.getPaintValue(paintName, {zoom: zoom, zoomHistory: zoomHistory});
	        }
	        for (var layoutName in this._layoutFunctions) {
	            this.layout[layoutName] = this.getLayoutValue(layoutName, {zoom: zoom, zoomHistory: zoomHistory});
	        }
	    },

	    serialize: function(options) {
	        var output = {
	            'id': this.id,
	            'ref': this.ref,
	            'metadata': this.metadata,
	            'minzoom': this.minzoom,
	            'maxzoom': this.maxzoom
	        };

	        for (var klass in this._paintDeclarations) {
	            var key = klass === '' ? 'paint' : 'paint.' + klass;
	            output[key] = mapObject(this._paintDeclarations[klass], getDeclarationValue);
	        }

	        if (!this.ref || (options && options.includeRefProperties)) {
	            extend(output, {
	                'type': this.type,
	                'source': this.source,
	                'source-layer': this.sourceLayer,
	                'filter': this.filter,
	                'layout': mapObject(this._layoutDeclarations, getDeclarationValue)
	            });
	        }

	        return filterObject(output, function(value, key) {
	            return value !== undefined && !(key === 'layout' && !Object.keys(value).length);
	        });
	    },

	    // set paint transition based on a given paint declaration
	    _applyPaintDeclaration: function (name, declaration, options, globalOptions, animationLoop) {
	        var oldTransition = options.transition ? this._paintTransitions[name] : undefined;

	        if (declaration === null || declaration === undefined) {
	            var spec = this._paintSpecifications[name];
	            declaration = new StyleDeclaration(spec, spec.default);
	        }

	        if (oldTransition && oldTransition.declaration.json === declaration.json) return;

	        var transitionOptions = extend({
	            duration: 300,
	            delay: 0
	        }, globalOptions, this.getPaintProperty(name + TRANSITION_SUFFIX));

	        var newTransition = this._paintTransitions[name] =
	                new StyleTransition(declaration, oldTransition, transitionOptions);

	        if (!newTransition.instant()) {
	            newTransition.loopID = animationLoop.set(newTransition.endTime - Date.now());
	        }
	        if (oldTransition) {
	            animationLoop.cancel(oldTransition.loopID);
	        }
	    },

	    // update layout value if it's constant, or mark it as zoom-dependent
	    _updateLayoutValue: function(name) {
	        var declaration = this._layoutDeclarations[name];

	        if (declaration && declaration.isFunction) {
	            this._layoutFunctions[name] = true;
	        } else {
	            delete this._layoutFunctions[name];
	            this.layout[name] = this.getLayoutValue(name);
	        }
	    },

	    _handleErrors: function(validate, key, name, value) {
	        return emitErrors(this, validate.call(validateStyle, {
	            key: key,
	            layerType: this.type,
	            objectKey: name,
	            value: value,
	            styleSpec: __latest,
	            // Workaround for https://github.com/mapbox/mapbox-gl-js/issues/2407
	            style: {glyphs: true, sprite: true}
	        }));
	    }
	});

	function getDeclarationValue(declaration) {
	    return declaration.value;
	}

	var getJSON = function(url, callback) {
	    var xhr = new XMLHttpRequest();
	    xhr.open('GET', url, true);
	    xhr.setRequestHeader('Accept', 'application/json');
	    xhr.onerror = function(e) {
	        callback(e);
	    };
	    xhr.onload = function() {
	        if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
	            var data;
	            try {
	                data = JSON.parse(xhr.response);
	            } catch (err) {
	                return callback(err);
	            }
	            callback(null, data);
	        } else {
	            callback(new Error(xhr.statusText));
	        }
	    };
	    xhr.send();
	    return xhr;
	};

	var getArrayBuffer = function(url, callback) {
	    var xhr = new XMLHttpRequest();
	    xhr.open('GET', url, true);
	    xhr.responseType = 'arraybuffer';
	    xhr.onerror = function(e) {
	        callback(e);
	    };
	    xhr.onload = function() {
	        if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
	            callback(null, xhr.response);
	        } else {
	            callback(new Error(xhr.statusText));
	        }
	    };
	    xhr.send();
	    return xhr;
	};

	var within = __commonjs(function (module) {
	'use strict';

	module.exports = within;

	function within(ids, coords, qx, qy, r, nodeSize) {
	    var stack = [0, ids.length - 1, 0];
	    var result = [];
	    var r2 = r * r;

	    while (stack.length) {
	        var axis = stack.pop();
	        var right = stack.pop();
	        var left = stack.pop();

	        if (right - left <= nodeSize) {
	            for (var i = left; i <= right; i++) {
	                if (sqDist(coords[2 * i], coords[2 * i + 1], qx, qy) <= r2) result.push(ids[i]);
	            }
	            continue;
	        }

	        var m = Math.floor((left + right) / 2);

	        var x = coords[2 * m];
	        var y = coords[2 * m + 1];

	        if (sqDist(x, y, qx, qy) <= r2) result.push(ids[m]);

	        var nextAxis = (axis + 1) % 2;

	        if (axis === 0 ? qx - r <= x : qy - r <= y) {
	            stack.push(left);
	            stack.push(m - 1);
	            stack.push(nextAxis);
	        }
	        if (axis === 0 ? qx + r >= x : qy + r >= y) {
	            stack.push(m + 1);
	            stack.push(right);
	            stack.push(nextAxis);
	        }
	    }

	    return result;
	}

	function sqDist(ax, ay, bx, by) {
	    var dx = ax - bx;
	    var dy = ay - by;
	    return dx * dx + dy * dy;
	}
	});

	var require$$0$15 = (within && typeof within === 'object' && 'default' in within ? within['default'] : within);

	var range = __commonjs(function (module) {
	'use strict';

	module.exports = range;

	function range(ids, coords, minX, minY, maxX, maxY, nodeSize) {
	    var stack = [0, ids.length - 1, 0];
	    var result = [];
	    var x, y;

	    while (stack.length) {
	        var axis = stack.pop();
	        var right = stack.pop();
	        var left = stack.pop();

	        if (right - left <= nodeSize) {
	            for (var i = left; i <= right; i++) {
	                x = coords[2 * i];
	                y = coords[2 * i + 1];
	                if (x >= minX && x <= maxX && y >= minY && y <= maxY) result.push(ids[i]);
	            }
	            continue;
	        }

	        var m = Math.floor((left + right) / 2);

	        x = coords[2 * m];
	        y = coords[2 * m + 1];

	        if (x >= minX && x <= maxX && y >= minY && y <= maxY) result.push(ids[m]);

	        var nextAxis = (axis + 1) % 2;

	        if (axis === 0 ? minX <= x : minY <= y) {
	            stack.push(left);
	            stack.push(m - 1);
	            stack.push(nextAxis);
	        }
	        if (axis === 0 ? maxX >= x : maxY >= y) {
	            stack.push(m + 1);
	            stack.push(right);
	            stack.push(nextAxis);
	        }
	    }

	    return result;
	}
	});

	var require$$1$7 = (range && typeof range === 'object' && 'default' in range ? range['default'] : range);

	var sort = __commonjs(function (module) {
	'use strict';

	module.exports = sortKD;

	function sortKD(ids, coords, nodeSize, left, right, depth) {
	    if (right - left <= nodeSize) return;

	    var m = Math.floor((left + right) / 2);

	    select(ids, coords, m, left, right, depth % 2);

	    sortKD(ids, coords, nodeSize, left, m - 1, depth + 1);
	    sortKD(ids, coords, nodeSize, m + 1, right, depth + 1);
	}

	function select(ids, coords, k, left, right, inc) {

	    while (right > left) {
	        if (right - left > 600) {
	            var n = right - left + 1;
	            var m = k - left + 1;
	            var z = Math.log(n);
	            var s = 0.5 * Math.exp(2 * z / 3);
	            var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
	            var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
	            var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
	            select(ids, coords, k, newLeft, newRight, inc);
	        }

	        var t = coords[2 * k + inc];
	        var i = left;
	        var j = right;

	        swapItem(ids, coords, left, k);
	        if (coords[2 * right + inc] > t) swapItem(ids, coords, left, right);

	        while (i < j) {
	            swapItem(ids, coords, i, j);
	            i++;
	            j--;
	            while (coords[2 * i + inc] < t) i++;
	            while (coords[2 * j + inc] > t) j--;
	        }

	        if (coords[2 * left + inc] === t) swapItem(ids, coords, left, j);
	        else {
	            j++;
	            swapItem(ids, coords, j, right);
	        }

	        if (j <= k) left = j + 1;
	        if (k <= j) right = j - 1;
	    }
	}

	function swapItem(ids, coords, i, j) {
	    swap(ids, i, j);
	    swap(coords, 2 * i, 2 * j);
	    swap(coords, 2 * i + 1, 2 * j + 1);
	}

	function swap(arr, i, j) {
	    var tmp = arr[i];
	    arr[i] = arr[j];
	    arr[j] = tmp;
	}
	});

	var require$$2$5 = (sort && typeof sort === 'object' && 'default' in sort ? sort['default'] : sort);

	var kdbush = __commonjs(function (module) {
	'use strict';

	var sort = require$$2$5;
	var range = require$$1$7;
	var within = require$$0$15;

	module.exports = kdbush;

	function kdbush(points, getX, getY, nodeSize, ArrayType) {
	    return new KDBush(points, getX, getY, nodeSize, ArrayType);
	}

	function KDBush(points, getX, getY, nodeSize, ArrayType) {
	    getX = getX || defaultGetX;
	    getY = getY || defaultGetY;
	    ArrayType = ArrayType || Array;

	    this.nodeSize = nodeSize || 64;
	    this.points = points;

	    this.ids = new ArrayType(points.length);
	    this.coords = new ArrayType(points.length * 2);

	    for (var i = 0; i < points.length; i++) {
	        this.ids[i] = i;
	        this.coords[2 * i] = getX(points[i]);
	        this.coords[2 * i + 1] = getY(points[i]);
	    }

	    sort(this.ids, this.coords, this.nodeSize, 0, this.ids.length - 1, 0);
	}

	KDBush.prototype = {
	    range: function (minX, minY, maxX, maxY) {
	        return range(this.ids, this.coords, minX, minY, maxX, maxY, this.nodeSize);
	    },

	    within: function (x, y, r) {
	        return within(this.ids, this.coords, x, y, r, this.nodeSize);
	    }
	};

	function defaultGetX(p) { return p[0]; }
	function defaultGetY(p) { return p[1]; }
	});

	var require$$0$14 = (kdbush && typeof kdbush === 'object' && 'default' in kdbush ? kdbush['default'] : kdbush);

	var index$8 = __commonjs(function (module) {
	'use strict';

	var kdbush = require$$0$14;

	module.exports = supercluster;

	function supercluster(options) {
	    return new SuperCluster(options);
	}

	function SuperCluster(options) {
	    this.options = extend(Object.create(this.options), options);
	    this.trees = new Array(this.options.maxZoom + 1);
	}

	SuperCluster.prototype = {
	    options: {
	        minZoom: 0,   // min zoom to generate clusters on
	        maxZoom: 16,  // max zoom level to cluster the points on
	        radius: 40,   // cluster radius in pixels
	        extent: 512,  // tile extent (radius is calculated relative to it)
	        nodeSize: 64, // size of the KD-tree leaf node, affects performance
	        log: false    // whether to log timing info
	    },

	    load: function (points) {
	        var log = this.options.log;

	        if (log) console.time('total time');

	        var timerId = 'prepare ' + points.length + ' points';
	        if (log) console.time(timerId);

	        this.points = points;

	        // generate a cluster object for each point
	        var clusters = points.map(createPointCluster);
	        if (log) console.timeEnd(timerId);

	        // cluster points on max zoom, then cluster the results on previous zoom, etc.;
	        // results in a cluster hierarchy across zoom levels
	        for (var z = this.options.maxZoom; z >= this.options.minZoom; z--) {
	            var now = +Date.now();

	            // index input points into a KD-tree
	            this.trees[z + 1] = kdbush(clusters, getX, getY, this.options.nodeSize, Float32Array);

	            clusters = this._cluster(clusters, z); // create a new set of clusters for the zoom

	            if (log) console.log('z%d: %d clusters in %dms', z, clusters.length, +Date.now() - now);
	        }

	        // index top-level clusters
	        this.trees[this.options.minZoom] = kdbush(clusters, getX, getY, this.options.nodeSize, Float32Array);

	        if (log) console.timeEnd('total time');

	        return this;
	    },

	    getClusters: function (bbox, zoom) {
	        var tree = this.trees[this._limitZoom(zoom)];
	        var ids = tree.range(lngX(bbox[0]), latY(bbox[3]), lngX(bbox[2]), latY(bbox[1]));
	        var clusters = [];
	        for (var i = 0; i < ids.length; i++) {
	            var c = tree.points[ids[i]];
	            clusters.push(c.id !== -1 ? this.points[c.id] : getClusterJSON(c));
	        }
	        return clusters;
	    },

	    getTile: function (z, x, y) {
	        var z2 = Math.pow(2, z);
	        var extent = this.options.extent;
	        var p = this.options.radius / extent;
	        var tree = this.trees[this._limitZoom(z)];
	        var ids = tree.range(
	            (x - p) / z2,
	            (y - p) / z2,
	            (x + 1 + p) / z2,
	            (y + 1 + p) / z2);

	        if (!ids.length) return null;

	        var tile = {
	            features: []
	        };
	        for (var i = 0; i < ids.length; i++) {
	            var c = tree.points[ids[i]];
	            var feature = {
	                type: 1,
	                geometry: [[
	                    Math.round(extent * (c.x * z2 - x)),
	                    Math.round(extent * (c.y * z2 - y))
	                ]],
	                tags: c.id !== -1 ? this.points[c.id].properties : getClusterProperties(c)
	            };
	            tile.features.push(feature);
	        }
	        return tile;
	    },

	    _limitZoom: function (z) {
	        return Math.max(this.options.minZoom, Math.min(z, this.options.maxZoom + 1));
	    },

	    _cluster: function (points, zoom) {
	        var clusters = [];
	        var r = this.options.radius / (this.options.extent * Math.pow(2, zoom));

	        // loop through each point
	        for (var i = 0; i < points.length; i++) {
	            var p = points[i];
	            // if we've already visited the point at this zoom level, skip it
	            if (p.zoom <= zoom) continue;
	            p.zoom = zoom;

	            // find all nearby points
	            var tree = this.trees[zoom + 1];
	            var neighborIds = tree.within(p.x, p.y, r);

	            var foundNeighbors = false;
	            var numPoints = p.numPoints;
	            var wx = p.x * numPoints;
	            var wy = p.y * numPoints;

	            for (var j = 0; j < neighborIds.length; j++) {
	                var b = tree.points[neighborIds[j]];
	                // filter out neighbors that are too far or already processed
	                if (zoom < b.zoom) {
	                    foundNeighbors = true;
	                    b.zoom = zoom; // save the zoom (so it doesn't get processed twice)
	                    wx += b.x * b.numPoints; // accumulate coordinates for calculating weighted center
	                    wy += b.y * b.numPoints;
	                    numPoints += b.numPoints;
	                }
	            }

	            clusters.push(foundNeighbors ? createCluster(wx / numPoints, wy / numPoints, numPoints, -1) : p);
	        }

	        return clusters;
	    }
	};

	function createCluster(x, y, numPoints, id) {
	    return {
	        x: x, // weighted cluster center
	        y: y,
	        zoom: Infinity, // the last zoom the cluster was processed at
	        id: id, // index of the source feature in the original input array
	        numPoints: numPoints
	    };
	}

	function createPointCluster(p, i) {
	    var coords = p.geometry.coordinates;
	    return createCluster(lngX(coords[0]), latY(coords[1]), 1, i);
	}

	function getClusterJSON(cluster) {
	    return {
	        type: 'Feature',
	        properties: getClusterProperties(cluster),
	        geometry: {
	            type: 'Point',
	            coordinates: [xLng(cluster.x), yLat(cluster.y)]
	        }
	    };
	}

	function getClusterProperties(cluster) {
	    var count = cluster.numPoints;
	    var abbrev = count >= 10000 ? Math.round(count / 1000) + 'k' :
	                 count >= 1000 ? (Math.round(count / 100) / 10) + 'k' : count;
	    return {
	        cluster: true,
	        point_count: count,
	        point_count_abbreviated: abbrev
	    };
	}

	// longitude/latitude to spherical mercator in [0..1] range
	function lngX(lng) {
	    return lng / 360 + 0.5;
	}
	function latY(lat) {
	    var sin = Math.sin(lat * Math.PI / 180),
	        y = (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
	    return y < 0 ? 0 :
	           y > 1 ? 1 : y;
	}

	// spherical mercator to longitude/latitude
	function xLng(x) {
	    return (x - 0.5) * 360;
	}
	function yLat(y) {
	    var y2 = (180 - y * 360) * Math.PI / 180;
	    return 360 * Math.atan(Math.exp(y2)) / Math.PI - 90;
	}

	function extend(dest, src) {
	    for (var id in src) dest[id] = src[id];
	    return dest;
	}

	function getX(p) {
	    return p.x;
	}
	function getY(p) {
	    return p.y;
	}
	});

	var supercluster = (index$8 && typeof index$8 === 'object' && 'default' in index$8 ? index$8['default'] : index$8);

	var tile = __commonjs(function (module) {
	'use strict';

	module.exports = createTile;

	function createTile(features, z2, tx, ty, tolerance, noSimplify) {
	    var tile = {
	        features: [],
	        numPoints: 0,
	        numSimplified: 0,
	        numFeatures: 0,
	        source: null,
	        x: tx,
	        y: ty,
	        z2: z2,
	        transformed: false,
	        min: [2, 1],
	        max: [-1, 0]
	    };
	    for (var i = 0; i < features.length; i++) {
	        tile.numFeatures++;
	        addFeature(tile, features[i], tolerance, noSimplify);

	        var min = features[i].min,
	            max = features[i].max;

	        if (min[0] < tile.min[0]) tile.min[0] = min[0];
	        if (min[1] < tile.min[1]) tile.min[1] = min[1];
	        if (max[0] > tile.max[0]) tile.max[0] = max[0];
	        if (max[1] > tile.max[1]) tile.max[1] = max[1];
	    }
	    return tile;
	}

	function addFeature(tile, feature, tolerance, noSimplify) {

	    var geom = feature.geometry,
	        type = feature.type,
	        simplified = [],
	        sqTolerance = tolerance * tolerance,
	        i, j, ring, p;

	    if (type === 1) {
	        for (i = 0; i < geom.length; i++) {
	            simplified.push(geom[i]);
	            tile.numPoints++;
	            tile.numSimplified++;
	        }

	    } else {

	        // simplify and transform projected coordinates for tile geometry
	        for (i = 0; i < geom.length; i++) {
	            ring = geom[i];

	            // filter out tiny polylines & polygons
	            if (!noSimplify && ((type === 2 && ring.dist < tolerance) ||
	                                (type === 3 && ring.area < sqTolerance))) {
	                tile.numPoints += ring.length;
	                continue;
	            }

	            var simplifiedRing = [];

	            for (j = 0; j < ring.length; j++) {
	                p = ring[j];
	                // keep points with importance > tolerance
	                if (noSimplify || p[2] > sqTolerance) {
	                    simplifiedRing.push(p);
	                    tile.numSimplified++;
	                }
	                tile.numPoints++;
	            }

	            simplified.push(simplifiedRing);
	        }
	    }

	    if (simplified.length) {
	        tile.features.push({
	            geometry: simplified,
	            type: type,
	            tags: feature.tags || null
	        });
	    }
	}
	});

	var require$$0$16 = (tile && typeof tile === 'object' && 'default' in tile ? tile['default'] : tile);

	var clip = __commonjs(function (module) {
	'use strict';

	module.exports = clip;

	/* clip features between two axis-parallel lines:
	 *     |        |
	 *  ___|___     |     /
	 * /   |   \____|____/
	 *     |        |
	 */

	function clip(features, scale, k1, k2, axis, intersect, minAll, maxAll) {

	    k1 /= scale;
	    k2 /= scale;

	    if (minAll >= k1 && maxAll <= k2) return features; // trivial accept
	    else if (minAll > k2 || maxAll < k1) return null; // trivial reject

	    var clipped = [];

	    for (var i = 0; i < features.length; i++) {

	        var feature = features[i],
	            geometry = feature.geometry,
	            type = feature.type,
	            min, max;

	        min = feature.min[axis];
	        max = feature.max[axis];

	        if (min >= k1 && max <= k2) { // trivial accept
	            clipped.push(feature);
	            continue;
	        } else if (min > k2 || max < k1) continue; // trivial reject

	        var slices = type === 1 ?
	                clipPoints(geometry, k1, k2, axis) :
	                clipGeometry(geometry, k1, k2, axis, intersect, type === 3);

	        if (slices.length) {
	            // if a feature got clipped, it will likely get clipped on the next zoom level as well,
	            // so there's no need to recalculate bboxes
	            clipped.push({
	                geometry: slices,
	                type: type,
	                tags: features[i].tags || null,
	                min: feature.min,
	                max: feature.max
	            });
	        }
	    }

	    return clipped.length ? clipped : null;
	}

	function clipPoints(geometry, k1, k2, axis) {
	    var slice = [];

	    for (var i = 0; i < geometry.length; i++) {
	        var a = geometry[i],
	            ak = a[axis];

	        if (ak >= k1 && ak <= k2) slice.push(a);
	    }
	    return slice;
	}

	function clipGeometry(geometry, k1, k2, axis, intersect, closed) {

	    var slices = [];

	    for (var i = 0; i < geometry.length; i++) {

	        var ak = 0,
	            bk = 0,
	            b = null,
	            points = geometry[i],
	            area = points.area,
	            dist = points.dist,
	            len = points.length,
	            a, j, last;

	        var slice = [];

	        for (j = 0; j < len - 1; j++) {
	            a = b || points[j];
	            b = points[j + 1];
	            ak = bk || a[axis];
	            bk = b[axis];

	            if (ak < k1) {

	                if ((bk > k2)) { // ---|-----|-->
	                    slice.push(intersect(a, b, k1), intersect(a, b, k2));
	                    if (!closed) slice = newSlice(slices, slice, area, dist);

	                } else if (bk >= k1) slice.push(intersect(a, b, k1)); // ---|-->  |

	            } else if (ak > k2) {

	                if ((bk < k1)) { // <--|-----|---
	                    slice.push(intersect(a, b, k2), intersect(a, b, k1));
	                    if (!closed) slice = newSlice(slices, slice, area, dist);

	                } else if (bk <= k2) slice.push(intersect(a, b, k2)); // |  <--|---

	            } else {

	                slice.push(a);

	                if (bk < k1) { // <--|---  |
	                    slice.push(intersect(a, b, k1));
	                    if (!closed) slice = newSlice(slices, slice, area, dist);

	                } else if (bk > k2) { // |  ---|-->
	                    slice.push(intersect(a, b, k2));
	                    if (!closed) slice = newSlice(slices, slice, area, dist);
	                }
	                // | --> |
	            }
	        }

	        // add the last point
	        a = points[len - 1];
	        ak = a[axis];
	        if (ak >= k1 && ak <= k2) slice.push(a);

	        // close the polygon if its endpoints are not the same after clipping

	        last = slice[slice.length - 1];
	        if (closed && last && (slice[0][0] !== last[0] || slice[0][1] !== last[1])) slice.push(slice[0]);

	        // add the final slice
	        newSlice(slices, slice, area, dist);
	    }

	    return slices;
	}

	function newSlice(slices, slice, area, dist) {
	    if (slice.length) {
	        // we don't recalculate the area/length of the unclipped geometry because the case where it goes
	        // below the visibility threshold as a result of clipping is rare, so we avoid doing unnecessary work
	        slice.area = area;
	        slice.dist = dist;

	        slices.push(slice);
	    }
	    return [];
	}
	});

	var require$$0$17 = (clip && typeof clip === 'object' && 'default' in clip ? clip['default'] : clip);

	var wrap$1 = __commonjs(function (module) {
	'use strict';

	var clip = require$$0$17;

	module.exports = wrap;

	function wrap(features, buffer, intersectX) {
	    var merged = features,
	        left  = clip(features, 1, -1 - buffer, buffer,     0, intersectX, -1, 2), // left world copy
	        right = clip(features, 1,  1 - buffer, 2 + buffer, 0, intersectX, -1, 2); // right world copy

	    if (left || right) {
	        merged = clip(features, 1, -buffer, 1 + buffer, 0, intersectX, -1, 2); // center world copy

	        if (left) merged = shiftFeatureCoords(left, 1).concat(merged); // merge left into center
	        if (right) merged = merged.concat(shiftFeatureCoords(right, -1)); // merge right into center
	    }

	    return merged;
	}

	function shiftFeatureCoords(features, offset) {
	    var newFeatures = [];

	    for (var i = 0; i < features.length; i++) {
	        var feature = features[i],
	            type = feature.type;

	        var newGeometry;

	        if (type === 1) {
	            newGeometry = shiftCoords(feature.geometry, offset);
	        } else {
	            newGeometry = [];
	            for (var j = 0; j < feature.geometry.length; j++) {
	                newGeometry.push(shiftCoords(feature.geometry[j], offset));
	            }
	        }

	        newFeatures.push({
	            geometry: newGeometry,
	            type: type,
	            tags: feature.tags,
	            min: [feature.min[0] + offset, feature.min[1]],
	            max: [feature.max[0] + offset, feature.max[1]]
	        });
	    }

	    return newFeatures;
	}

	function shiftCoords(points, offset) {
	    var newPoints = [];
	    newPoints.area = points.area;
	    newPoints.dist = points.dist;

	    for (var i = 0; i < points.length; i++) {
	        newPoints.push([points[i][0] + offset, points[i][1], points[i][2]]);
	    }
	    return newPoints;
	}
	});

	var require$$1$8 = (wrap$1 && typeof wrap$1 === 'object' && 'default' in wrap$1 ? wrap$1['default'] : wrap$1);

	var transform = __commonjs(function (module, exports) {
	'use strict';

	exports.tile = transformTile;
	exports.point = transformPoint;

	// Transforms the coordinates of each feature in the given tile from
	// mercator-projected space into (extent x extent) tile space.
	function transformTile(tile, extent) {
	    if (tile.transformed) return tile;

	    var z2 = tile.z2,
	        tx = tile.x,
	        ty = tile.y,
	        i, j, k;

	    for (i = 0; i < tile.features.length; i++) {
	        var feature = tile.features[i],
	            geom = feature.geometry,
	            type = feature.type;

	        if (type === 1) {
	            for (j = 0; j < geom.length; j++) geom[j] = transformPoint(geom[j], extent, z2, tx, ty);

	        } else {
	            for (j = 0; j < geom.length; j++) {
	                var ring = geom[j];
	                for (k = 0; k < ring.length; k++) ring[k] = transformPoint(ring[k], extent, z2, tx, ty);
	            }
	        }
	    }

	    tile.transformed = true;

	    return tile;
	}

	function transformPoint(p, extent, z2, tx, ty) {
	    var x = Math.round(extent * (p[0] * z2 - tx)),
	        y = Math.round(extent * (p[1] * z2 - ty));
	    return [x, y];
	}
	});

	var require$$3$2 = (transform && typeof transform === 'object' && 'default' in transform ? transform['default'] : transform);

	var simplify = __commonjs(function (module) {
	'use strict';

	module.exports = simplify;

	// calculate simplification data using optimized Douglas-Peucker algorithm

	function simplify(points, tolerance) {

	    var sqTolerance = tolerance * tolerance,
	        len = points.length,
	        first = 0,
	        last = len - 1,
	        stack = [],
	        i, maxSqDist, sqDist, index;

	    // always retain the endpoints (1 is the max value)
	    points[first][2] = 1;
	    points[last][2] = 1;

	    // avoid recursion by using a stack
	    while (last) {

	        maxSqDist = 0;

	        for (i = first + 1; i < last; i++) {
	            sqDist = getSqSegDist(points[i], points[first], points[last]);

	            if (sqDist > maxSqDist) {
	                index = i;
	                maxSqDist = sqDist;
	            }
	        }

	        if (maxSqDist > sqTolerance) {
	            points[index][2] = maxSqDist; // save the point importance in squared pixels as a z coordinate
	            stack.push(first);
	            stack.push(index);
	            first = index;

	        } else {
	            last = stack.pop();
	            first = stack.pop();
	        }
	    }
	}

	// square distance from a point to a segment
	function getSqSegDist(p, a, b) {

	    var x = a[0], y = a[1],
	        bx = b[0], by = b[1],
	        px = p[0], py = p[1],
	        dx = bx - x,
	        dy = by - y;

	    if (dx !== 0 || dy !== 0) {

	        var t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);

	        if (t > 1) {
	            x = bx;
	            y = by;

	        } else if (t > 0) {
	            x += dx * t;
	            y += dy * t;
	        }
	    }

	    dx = px - x;
	    dy = py - y;

	    return dx * dx + dy * dy;
	}
	});

	var require$$0$18 = (simplify && typeof simplify === 'object' && 'default' in simplify ? simplify['default'] : simplify);

	var convert = __commonjs(function (module) {
	'use strict';

	module.exports = convert;

	var simplify = require$$0$18;

	// converts GeoJSON feature into an intermediate projected JSON vector format with simplification data

	function convert(data, tolerance) {
	    var features = [];

	    if (data.type === 'FeatureCollection') {
	        for (var i = 0; i < data.features.length; i++) {
	            convertFeature(features, data.features[i], tolerance);
	        }
	    } else if (data.type === 'Feature') {
	        convertFeature(features, data, tolerance);

	    } else {
	        // single geometry or a geometry collection
	        convertFeature(features, {geometry: data}, tolerance);
	    }
	    return features;
	}

	function convertFeature(features, feature, tolerance) {
	    var geom = feature.geometry,
	        type = geom.type,
	        coords = geom.coordinates,
	        tags = feature.properties,
	        i, j, rings;

	    if (type === 'Point') {
	        features.push(create(tags, 1, [projectPoint(coords)]));

	    } else if (type === 'MultiPoint') {
	        features.push(create(tags, 1, project(coords)));

	    } else if (type === 'LineString') {
	        features.push(create(tags, 2, [project(coords, tolerance)]));

	    } else if (type === 'MultiLineString' || type === 'Polygon') {
	        rings = [];
	        for (i = 0; i < coords.length; i++) {
	            rings.push(project(coords[i], tolerance));
	        }
	        features.push(create(tags, type === 'Polygon' ? 3 : 2, rings));

	    } else if (type === 'MultiPolygon') {
	        rings = [];
	        for (i = 0; i < coords.length; i++) {
	            for (j = 0; j < coords[i].length; j++) {
	                rings.push(project(coords[i][j], tolerance));
	            }
	        }
	        features.push(create(tags, 3, rings));

	    } else if (type === 'GeometryCollection') {
	        for (i = 0; i < geom.geometries.length; i++) {
	            convertFeature(features, {
	                geometry: geom.geometries[i],
	                properties: tags
	            }, tolerance);
	        }

	    } else {
	        throw new Error('Input data is not a valid GeoJSON object.');
	    }
	}

	function create(tags, type, geometry) {
	    var feature = {
	        geometry: geometry,
	        type: type,
	        tags: tags || null,
	        min: [2, 1], // initial bbox values;
	        max: [-1, 0]  // note that coords are usually in [0..1] range
	    };
	    calcBBox(feature);
	    return feature;
	}

	function project(lonlats, tolerance) {
	    var projected = [];
	    for (var i = 0; i < lonlats.length; i++) {
	        projected.push(projectPoint(lonlats[i]));
	    }
	    if (tolerance) {
	        simplify(projected, tolerance);
	        calcSize(projected);
	    }
	    return projected;
	}

	function projectPoint(p) {
	    var sin = Math.sin(p[1] * Math.PI / 180),
	        x = (p[0] / 360 + 0.5),
	        y = (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);

	    y = y < -1 ? -1 :
	        y > 1 ? 1 : y;

	    return [x, y, 0];
	}

	// calculate area and length of the poly
	function calcSize(points) {
	    var area = 0,
	        dist = 0;

	    for (var i = 0, a, b; i < points.length - 1; i++) {
	        a = b || points[i];
	        b = points[i + 1];

	        area += a[0] * b[1] - b[0] * a[1];

	        // use Manhattan distance instead of Euclidian one to avoid expensive square root computation
	        dist += Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
	    }
	    points.area = Math.abs(area / 2);
	    points.dist = dist;
	}

	// calculate the feature bounding box for faster clipping later
	function calcBBox(feature) {
	    var geometry = feature.geometry,
	        min = feature.min,
	        max = feature.max;

	    if (feature.type === 1) calcRingBBox(min, max, geometry);
	    else for (var i = 0; i < geometry.length; i++) calcRingBBox(min, max, geometry[i]);

	    return feature;
	}

	function calcRingBBox(min, max, points) {
	    for (var i = 0, p; i < points.length; i++) {
	        p = points[i];
	        min[0] = Math.min(p[0], min[0]);
	        max[0] = Math.max(p[0], max[0]);
	        min[1] = Math.min(p[1], min[1]);
	        max[1] = Math.max(p[1], max[1]);
	    }
	}
	});

	var require$$4$1 = (convert && typeof convert === 'object' && 'default' in convert ? convert['default'] : convert);

	var index$9 = __commonjs(function (module) {
	'use strict';

	module.exports = geojsonvt;

	var convert = require$$4$1,     // GeoJSON conversion and preprocessing
	    transform = require$$3$2, // coordinate transformation
	    clip = require$$0$17,           // stripe clipping algorithm
	    wrap = require$$1$8,           // date line processing
	    createTile = require$$0$16;     // final simplified tile generation


	function geojsonvt(data, options) {
	    return new GeoJSONVT(data, options);
	}

	function GeoJSONVT(data, options) {
	    options = this.options = extend(Object.create(this.options), options);

	    var debug = options.debug;

	    if (debug) console.time('preprocess data');

	    var z2 = 1 << options.maxZoom, // 2^z
	        features = convert(data, options.tolerance / (z2 * options.extent));

	    this.tiles = {};
	    this.tileCoords = [];

	    if (debug) {
	        console.timeEnd('preprocess data');
	        console.log('index: maxZoom: %d, maxPoints: %d', options.indexMaxZoom, options.indexMaxPoints);
	        console.time('generate tiles');
	        this.stats = {};
	        this.total = 0;
	    }

	    features = wrap(features, options.buffer / options.extent, intersectX);

	    // start slicing from the top tile down
	    if (features.length) this.splitTile(features, 0, 0, 0);

	    if (debug) {
	        if (features.length) console.log('features: %d, points: %d', this.tiles[0].numFeatures, this.tiles[0].numPoints);
	        console.timeEnd('generate tiles');
	        console.log('tiles generated:', this.total, JSON.stringify(this.stats));
	    }
	}

	GeoJSONVT.prototype.options = {
	    maxZoom: 14,            // max zoom to preserve detail on
	    indexMaxZoom: 5,        // max zoom in the tile index
	    indexMaxPoints: 100000, // max number of points per tile in the tile index
	    solidChildren: false,   // whether to tile solid square tiles further
	    tolerance: 3,           // simplification tolerance (higher means simpler)
	    extent: 4096,           // tile extent
	    buffer: 64,             // tile buffer on each side
	    debug: 0                // logging level (0, 1 or 2)
	};

	GeoJSONVT.prototype.splitTile = function (features, z, x, y, cz, cx, cy) {

	    var stack = [features, z, x, y],
	        options = this.options,
	        debug = options.debug,
	        solid = null;

	    // avoid recursion by using a processing queue
	    while (stack.length) {
	        y = stack.pop();
	        x = stack.pop();
	        z = stack.pop();
	        features = stack.pop();

	        var z2 = 1 << z,
	            id = toID(z, x, y),
	            tile = this.tiles[id],
	            tileTolerance = z === options.maxZoom ? 0 : options.tolerance / (z2 * options.extent);

	        if (!tile) {
	            if (debug > 1) console.time('creation');

	            tile = this.tiles[id] = createTile(features, z2, x, y, tileTolerance, z === options.maxZoom);
	            this.tileCoords.push({z: z, x: x, y: y});

	            if (debug) {
	                if (debug > 1) {
	                    console.log('tile z%d-%d-%d (features: %d, points: %d, simplified: %d)',
	                        z, x, y, tile.numFeatures, tile.numPoints, tile.numSimplified);
	                    console.timeEnd('creation');
	                }
	                var key = 'z' + z;
	                this.stats[key] = (this.stats[key] || 0) + 1;
	                this.total++;
	            }
	        }

	        // save reference to original geometry in tile so that we can drill down later if we stop now
	        tile.source = features;

	        // if it's the first-pass tiling
	        if (!cz) {
	            // stop tiling if we reached max zoom, or if the tile is too simple
	            if (z === options.indexMaxZoom || tile.numPoints <= options.indexMaxPoints) continue;

	        // if a drilldown to a specific tile
	        } else {
	            // stop tiling if we reached base zoom or our target tile zoom
	            if (z === options.maxZoom || z === cz) continue;

	            // stop tiling if it's not an ancestor of the target tile
	            var m = 1 << (cz - z);
	            if (x !== Math.floor(cx / m) || y !== Math.floor(cy / m)) continue;
	        }

	        // stop tiling if the tile is solid clipped square
	        if (!options.solidChildren && isClippedSquare(tile, options.extent, options.buffer)) {
	            if (cz) solid = z; // and remember the zoom if we're drilling down
	            continue;
	        }

	        // if we slice further down, no need to keep source geometry
	        tile.source = null;

	        if (debug > 1) console.time('clipping');

	        // values we'll use for clipping
	        var k1 = 0.5 * options.buffer / options.extent,
	            k2 = 0.5 - k1,
	            k3 = 0.5 + k1,
	            k4 = 1 + k1,
	            tl, bl, tr, br, left, right;

	        tl = bl = tr = br = null;

	        left  = clip(features, z2, x - k1, x + k3, 0, intersectX, tile.min[0], tile.max[0]);
	        right = clip(features, z2, x + k2, x + k4, 0, intersectX, tile.min[0], tile.max[0]);

	        if (left) {
	            tl = clip(left, z2, y - k1, y + k3, 1, intersectY, tile.min[1], tile.max[1]);
	            bl = clip(left, z2, y + k2, y + k4, 1, intersectY, tile.min[1], tile.max[1]);
	        }

	        if (right) {
	            tr = clip(right, z2, y - k1, y + k3, 1, intersectY, tile.min[1], tile.max[1]);
	            br = clip(right, z2, y + k2, y + k4, 1, intersectY, tile.min[1], tile.max[1]);
	        }

	        if (debug > 1) console.timeEnd('clipping');

	        if (tl) stack.push(tl, z + 1, x * 2,     y * 2);
	        if (bl) stack.push(bl, z + 1, x * 2,     y * 2 + 1);
	        if (tr) stack.push(tr, z + 1, x * 2 + 1, y * 2);
	        if (br) stack.push(br, z + 1, x * 2 + 1, y * 2 + 1);
	    }

	    return solid;
	};

	GeoJSONVT.prototype.getTile = function (z, x, y) {
	    var options = this.options,
	        extent = options.extent,
	        debug = options.debug;

	    var z2 = 1 << z;
	    x = ((x % z2) + z2) % z2; // wrap tile x coordinate

	    var id = toID(z, x, y);
	    if (this.tiles[id]) return transform.tile(this.tiles[id], extent);

	    if (debug > 1) console.log('drilling down to z%d-%d-%d', z, x, y);

	    var z0 = z,
	        x0 = x,
	        y0 = y,
	        parent;

	    while (!parent && z0 > 0) {
	        z0--;
	        x0 = Math.floor(x0 / 2);
	        y0 = Math.floor(y0 / 2);
	        parent = this.tiles[toID(z0, x0, y0)];
	    }

	    if (!parent || !parent.source) return null;

	    // if we found a parent tile containing the original geometry, we can drill down from it
	    if (debug > 1) console.log('found parent tile z%d-%d-%d', z0, x0, y0);

	    // it parent tile is a solid clipped square, return it instead since it's identical
	    if (isClippedSquare(parent, extent, options.buffer)) return transform.tile(parent, extent);

	    if (debug > 1) console.time('drilling down');
	    var solid = this.splitTile(parent.source, z0, x0, y0, z, x, y);
	    if (debug > 1) console.timeEnd('drilling down');

	    // one of the parent tiles was a solid clipped square
	    if (solid !== null) {
	        var m = 1 << (z - solid);
	        id = toID(solid, Math.floor(x / m), Math.floor(y / m));
	    }

	    return this.tiles[id] ? transform.tile(this.tiles[id], extent) : null;
	};

	function toID(z, x, y) {
	    return (((1 << z) * y + x) * 32) + z;
	}

	function intersectX(a, b, x) {
	    return [x, (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0]) + a[1], 1];
	}
	function intersectY(a, b, y) {
	    return [(y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) + a[0], y, 1];
	}

	function extend(dest, src) {
	    for (var i in src) dest[i] = src[i];
	    return dest;
	}

	// checks whether a tile is a whole-area fill after clipping; if it is, there's no sense slicing it further
	function isClippedSquare(tile, extent, buffer) {

	    var features = tile.source;
	    if (features.length !== 1) return false;

	    var feature = features[0];
	    if (feature.type !== 3 || feature.geometry.length > 1) return false;

	    var len = feature.geometry[0].length;
	    if (len !== 5) return false;

	    for (var i = 0; i < len; i++) {
	        var p = transform.point(feature.geometry[0][i], extent, tile.z2, tile.x, tile.y);
	        if ((p[0] !== -buffer && p[0] !== extent + buffer) ||
	            (p[1] !== -buffer && p[1] !== extent + buffer)) return false;
	    }

	    return true;
	}
	});

	var geojsonvt = (index$9 && typeof index$9 === 'object' && 'default' in index$9 ? index$9['default'] : index$9);

	var index$12 = __commonjs(function (module) {
	module.exports.RADIUS = 6378137;
	module.exports.FLATTENING = 1/298.257223563;
	module.exports.POLAR_RADIUS = 6356752.3142;
	});

	var require$$0$20 = (index$12 && typeof index$12 === 'object' && 'default' in index$12 ? index$12['default'] : index$12);

	var index$11 = __commonjs(function (module) {
	var wgs84 = require$$0$20;

	module.exports.geometry = geometry;
	module.exports.ring = ringArea;

	function geometry(_) {
	    if (_.type === 'Polygon') return polygonArea(_.coordinates);
	    else if (_.type === 'MultiPolygon') {
	        var area = 0;
	        for (var i = 0; i < _.coordinates.length; i++) {
	            area += polygonArea(_.coordinates[i]);
	        }
	        return area;
	    } else {
	        return null;
	    }
	}

	function polygonArea(coords) {
	    var area = 0;
	    if (coords && coords.length > 0) {
	        area += Math.abs(ringArea(coords[0]));
	        for (var i = 1; i < coords.length; i++) {
	            area -= Math.abs(ringArea(coords[i]));
	        }
	    }
	    return area;
	}

	/**
	 * Calculate the approximate area of the polygon were it projected onto
	 *     the earth.  Note that this area will be positive if ring is oriented
	 *     clockwise, otherwise it will be negative.
	 *
	 * Reference:
	 * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for
	 *     Polygons on a Sphere", JPL Publication 07-03, Jet Propulsion
	 *     Laboratory, Pasadena, CA, June 2007 http://trs-new.jpl.nasa.gov/dspace/handle/2014/40409
	 *
	 * Returns:
	 * {float} The approximate signed geodesic area of the polygon in square
	 *     meters.
	 */

	function ringArea(coords) {
	    var area = 0;

	    if (coords.length > 2) {
	        var p1, p2;
	        for (var i = 0; i < coords.length - 1; i++) {
	            p1 = coords[i];
	            p2 = coords[i + 1];
	            area += rad(p2[0] - p1[0]) * (2 + Math.sin(rad(p1[1])) + Math.sin(rad(p2[1])));
	        }

	        area = area * wgs84.RADIUS * wgs84.RADIUS / 2;
	    }

	    return area;
	}

	function rad(_) {
	    return _ * Math.PI / 180;
	}
	});

	var require$$0$19 = (index$11 && typeof index$11 === 'object' && 'default' in index$11 ? index$11['default'] : index$11);

	var index$10 = __commonjs(function (module) {
	var geojsonArea = require$$0$19;

	module.exports = rewind;

	function rewind(gj, outer) {
	    switch ((gj && gj.type) || null) {
	        case 'FeatureCollection':
	            gj.features = gj.features.map(curryOuter(rewind, outer));
	            return gj;
	        case 'Feature':
	            gj.geometry = rewind(gj.geometry, outer);
	            return gj;
	        case 'Polygon':
	        case 'MultiPolygon':
	            return correct(gj, outer);
	        default:
	            return gj;
	    }
	}

	function curryOuter(a, b) {
	    return function(_) { return a(_, b); };
	}

	function correct(_, outer) {
	    if (_.type === 'Polygon') {
	        _.coordinates = correctRings(_.coordinates, outer);
	    } else if (_.type === 'MultiPolygon') {
	        _.coordinates = _.coordinates.map(curryOuter(correctRings, outer));
	    }
	    return _;
	}

	function correctRings(_, outer) {
	    outer = !!outer;
	    _[0] = wind(_[0], !outer);
	    for (var i = 1; i < _.length; i++) {
	        _[i] = wind(_[i], outer);
	    }
	    return _;
	}

	function wind(_, dir) {
	    return cw(_) === dir ? _ : _.reverse();
	}

	function cw(_) {
	    return geojsonArea.ring(_) >= 0;
	}
	});

	var rewind = (index$10 && typeof index$10 === 'object' && 'default' in index$10 ? index$10['default'] : index$10);

	var VectorTileFeature$1 = require$$0.VectorTileFeature;
	var EXTENT$6 = Bucket.EXTENT;

	// conform to vectortile api
	function GeoJSONWrapper(features) {
	    this.features = features;
	    this.length = features.length;
	    this.extent = EXTENT$6;
	}

	GeoJSONWrapper.prototype.feature = function(i) {
	    return new FeatureWrapper(this.features[i]);
	};

	function FeatureWrapper(feature) {
	    this.type = feature.type;
	    if (feature.type === 1) {
	        this.rawGeometry = [];
	        for (var i = 0; i < feature.geometry.length; i++) {
	            this.rawGeometry.push([feature.geometry[i]]);
	        }
	    } else {
	        this.rawGeometry = feature.geometry;
	    }
	    this.properties = feature.tags;
	    this.extent = EXTENT$6;
	}

	FeatureWrapper.prototype.loadGeometry = function() {
	    var rings = this.rawGeometry;
	    this.geometry = [];

	    for (var i = 0; i < rings.length; i++) {
	        var ring = rings[i],
	            newRing = [];
	        for (var j = 0; j < ring.length; j++) {
	            newRing.push(new require$$1(ring[j][0], ring[j][1]));
	        }
	        this.geometry.push(newRing);
	    }
	    return this.geometry;
	};

	FeatureWrapper.prototype.bbox = function() {
	    if (!this.geometry) this.loadGeometry();

	    var rings = this.geometry,
	        x1 = Infinity,
	        x2 = -Infinity,
	        y1 = Infinity,
	        y2 = -Infinity;

	    for (var i = 0; i < rings.length; i++) {
	        var ring = rings[i];

	        for (var j = 0; j < ring.length; j++) {
	            var coord = ring[j];

	            x1 = Math.min(x1, coord.x);
	            x2 = Math.max(x2, coord.x);
	            y1 = Math.min(y1, coord.y);
	            y2 = Math.max(y2, coord.y);
	        }
	    }

	    return [x1, y1, x2, y2];
	};

	FeatureWrapper.prototype.toGeoJSON = VectorTileFeature$1.prototype.toGeoJSON;

	var geojson_wrapper = __commonjs(function (module) {
	'use strict'

	var Point = require$$1
	var VectorTileFeature = require$$0.VectorTileFeature

	module.exports = GeoJSONWrapper

	// conform to vectortile api
	function GeoJSONWrapper (features) {
	  this.features = features
	  this.length = features.length
	}

	GeoJSONWrapper.prototype.feature = function (i) {
	  return new FeatureWrapper(this.features[i])
	}

	function FeatureWrapper (feature) {
	  this.type = feature.type
	  this.rawGeometry = feature.type === 1 ? [feature.geometry] : feature.geometry
	  this.properties = feature.tags
	  this.extent = 4096
	}

	FeatureWrapper.prototype.loadGeometry = function () {
	  var rings = this.rawGeometry
	  this.geometry = []

	  for (var i = 0; i < rings.length; i++) {
	    var ring = rings[i]
	    var newRing = []
	    for (var j = 0; j < ring.length; j++) {
	      newRing.push(new Point(ring[j][0], ring[j][1]))
	    }
	    this.geometry.push(newRing)
	  }
	  return this.geometry
	}

	FeatureWrapper.prototype.bbox = function () {
	  if (!this.geometry) this.loadGeometry()

	  var rings = this.geometry
	  var x1 = Infinity
	  var x2 = -Infinity
	  var y1 = Infinity
	  var y2 = -Infinity

	  for (var i = 0; i < rings.length; i++) {
	    var ring = rings[i]

	    for (var j = 0; j < ring.length; j++) {
	      var coord = ring[j]

	      x1 = Math.min(x1, coord.x)
	      x2 = Math.max(x2, coord.x)
	      y1 = Math.min(y1, coord.y)
	      y2 = Math.max(y2, coord.y)
	    }
	  }

	  return [x1, y1, x2, y2]
	}

	FeatureWrapper.prototype.toGeoJSON = VectorTileFeature.prototype.toGeoJSON
	});

	var require$$0$21 = (geojson_wrapper && typeof geojson_wrapper === 'object' && 'default' in geojson_wrapper ? geojson_wrapper['default'] : geojson_wrapper);

	var vectorTilePb = __commonjs(function (module, exports) {
	'use strict';

	// tile ========================================

	var tile = exports.tile = {read: readTile, write: writeTile};

	tile.GeomType = {
	    "Unknown": 0,
	    "Point": 1,
	    "LineString": 2,
	    "Polygon": 3
	};

	function readTile(pbf, end) {
	    return pbf.readFields(readTileField, {"layers": []}, end);
	}

	function readTileField(tag, tile, pbf) {
	    if (tag === 3) tile.layers.push(readLayer(pbf, pbf.readVarint() + pbf.pos));
	}

	function writeTile(tile, pbf) {
	    var i;
	    if (tile.layers !== undefined) for (i = 0; i < tile.layers.length; i++) pbf.writeMessage(3, writeLayer, tile.layers[i]);
	}

	// value ========================================

	tile.value = {read: readValue, write: writeValue};

	function readValue(pbf, end) {
	    return pbf.readFields(readValueField, {}, end);
	}

	function readValueField(tag, value, pbf) {
	    if (tag === 1) value.string_value = pbf.readString();
	    else if (tag === 2) value.float_value = pbf.readFloat();
	    else if (tag === 3) value.double_value = pbf.readDouble();
	    else if (tag === 4) value.int_value = pbf.readVarint();
	    else if (tag === 5) value.uint_value = pbf.readVarint();
	    else if (tag === 6) value.sint_value = pbf.readSVarint();
	    else if (tag === 7) value.bool_value = pbf.readBoolean();
	}

	function writeValue(value, pbf) {
	    if (value.string_value !== undefined) pbf.writeStringField(1, value.string_value);
	    if (value.float_value !== undefined) pbf.writeFloatField(2, value.float_value);
	    if (value.double_value !== undefined) pbf.writeDoubleField(3, value.double_value);
	    if (value.int_value !== undefined) pbf.writeVarintField(4, value.int_value);
	    if (value.uint_value !== undefined) pbf.writeVarintField(5, value.uint_value);
	    if (value.sint_value !== undefined) pbf.writeSVarintField(6, value.sint_value);
	    if (value.bool_value !== undefined) pbf.writeBooleanField(7, value.bool_value);
	}

	// feature ========================================

	tile.feature = {read: readFeature, write: writeFeature};

	function readFeature(pbf, end) {
	    var feature = pbf.readFields(readFeatureField, {}, end);
	    if (feature.type === undefined) feature.type = "Unknown";
	    return feature;
	}

	function readFeatureField(tag, feature, pbf) {
	    if (tag === 1) feature.id = pbf.readVarint();
	    else if (tag === 2) feature.tags = pbf.readPackedVarint();
	    else if (tag === 3) feature.type = pbf.readVarint();
	    else if (tag === 4) feature.geometry = pbf.readPackedVarint();
	}

	function writeFeature(feature, pbf) {
	    if (feature.id !== undefined) pbf.writeVarintField(1, feature.id);
	    if (feature.tags !== undefined) pbf.writePackedVarint(2, feature.tags);
	    if (feature.type !== undefined) pbf.writeVarintField(3, feature.type);
	    if (feature.geometry !== undefined) pbf.writePackedVarint(4, feature.geometry);
	}

	// layer ========================================

	tile.layer = {read: readLayer, write: writeLayer};

	function readLayer(pbf, end) {
	    return pbf.readFields(readLayerField, {"features": [], "keys": [], "values": []}, end);
	}

	function readLayerField(tag, layer, pbf) {
	    if (tag === 15) layer.version = pbf.readVarint();
	    else if (tag === 1) layer.name = pbf.readString();
	    else if (tag === 2) layer.features.push(readFeature(pbf, pbf.readVarint() + pbf.pos));
	    else if (tag === 3) layer.keys.push(pbf.readString());
	    else if (tag === 4) layer.values.push(readValue(pbf, pbf.readVarint() + pbf.pos));
	    else if (tag === 5) layer.extent = pbf.readVarint();
	}

	function writeLayer(layer, pbf) {
	    if (layer.version !== undefined) pbf.writeVarintField(15, layer.version);
	    if (layer.name !== undefined) pbf.writeStringField(1, layer.name);
	    var i;
	    if (layer.features !== undefined) for (i = 0; i < layer.features.length; i++) pbf.writeMessage(2, writeFeature, layer.features[i]);
	    if (layer.keys !== undefined) for (i = 0; i < layer.keys.length; i++) pbf.writeStringField(3, layer.keys[i]);
	    if (layer.values !== undefined) for (i = 0; i < layer.values.length; i++) pbf.writeMessage(4, writeValue, layer.values[i]);
	    if (layer.extent !== undefined) pbf.writeVarintField(5, layer.extent);
	}
	});

	var require$$1$9 = (vectorTilePb && typeof vectorTilePb === 'object' && 'default' in vectorTilePb ? vectorTilePb['default'] : vectorTilePb);

	var index$13 = __commonjs(function (module) {
	var Pbf = require$$2$1
	var vtpb = require$$1$9
	var GeoJSONWrapper = require$$0$21

	module.exports = fromVectorTileJs
	module.exports.fromVectorTileJs = fromVectorTileJs
	module.exports.fromGeojsonVt = fromGeojsonVt
	module.exports.GeoJSONWrapper = GeoJSONWrapper

	/**
	 * Serialize a vector-tile-js-created tile to pbf
	 *
	 * @param {Object} tile
	 * @return {Buffer} uncompressed, pbf-serialized tile data
	 */
	function fromVectorTileJs (tile) {
	  var layers = []
	  for (var l in tile.layers) {
	    layers.push(prepareLayer(tile.layers[l]))
	  }

	  var out = new Pbf()
	  vtpb.tile.write({ layers: layers }, out)
	  return out.finish()
	}

	/**
	 * Serialized a geojson-vt-created tile to pbf.
	 *
	 * @param {Object} layers - An object mapping layer names to geojson-vt-created vector tile objects
	 * @return {Buffer} uncompressed, pbf-serialized tile data
	 */
	function fromGeojsonVt (layers) {
	  var l = {}
	  for (var k in layers) {
	    l[k] = new GeoJSONWrapper(layers[k].features)
	    l[k].name = k
	  }
	  return fromVectorTileJs({layers: l})
	}

	/**
	 * Prepare the given layer to be serialized by the auto-generated pbf
	 * serializer by encoding the feature geometry and properties.
	 */
	function prepareLayer (layer) {
	  var preparedLayer = {
	    name: layer.name || '',
	    version: layer.version || 1,
	    extent: layer.extent || 4096,
	    keys: [],
	    values: [],
	    features: []
	  }

	  var keycache = {}
	  var valuecache = {}

	  for (var i = 0; i < layer.length; i++) {
	    var feature = layer.feature(i)
	    feature.geometry = encodeGeometry(feature.loadGeometry())

	    var tags = []
	    for (var key in feature.properties) {
	      var keyIndex = keycache[key]
	      if (typeof keyIndex === 'undefined') {
	        preparedLayer.keys.push(key)
	        keyIndex = preparedLayer.keys.length - 1
	        keycache[key] = keyIndex
	      }
	      var value = wrapValue(feature.properties[key])
	      var valueIndex = valuecache[value.key]
	      if (typeof valueIndex === 'undefined') {
	        preparedLayer.values.push(value)
	        valueIndex = preparedLayer.values.length - 1
	        valuecache[value.key] = valueIndex
	      }
	      tags.push(keyIndex)
	      tags.push(valueIndex)
	    }

	    feature.tags = tags
	    preparedLayer.features.push(feature)
	  }

	  return preparedLayer
	}

	function command (cmd, length) {
	  return (length << 3) + (cmd & 0x7)
	}

	function zigzag (num) {
	  return (num << 1) ^ (num >> 31)
	}

	/**
	 * Encode a polygon's geometry into an array ready to be serialized
	 * to mapbox vector tile specified geometry data.
	 *
	 * @param {Array} Rings, each being an array of [x, y] tile-space coordinates
	 * @return {Array} encoded geometry
	 */
	function encodeGeometry (geometry) {
	  var encoded = []
	  var x = 0
	  var y = 0
	  var rings = geometry.length
	  for (var r = 0; r < rings; r++) {
	    var ring = geometry[r]
	    encoded.push(command(1, 1)) // moveto
	    for (var i = 0; i < ring.length; i++) {
	      if (i === 1) {
	        encoded.push(command(2, ring.length - 1)) // lineto
	      }
	      var dx = ring[i].x - x
	      var dy = ring[i].y - y
	      encoded.push(zigzag(dx), zigzag(dy))
	      x += dx
	      y += dy
	    }
	  }

	  return encoded
	}

	/**
	 * Wrap a property value according to its type. The returned object
	 * is of the form { xxxx_value: primitiveValue }, which is what the generated
	 * protobuf serializer expects.
	 */
	function wrapValue (value) {
	  var result
	  var type = typeof value
	  if (type === 'string') {
	    result = { string_value: value }
	  } else if (type === 'boolean') {
	    result = { bool_value: value }
	  } else if (type === 'number') {
	    if (value !== (value | 0)) {
	      result = { float_value: value }
	    } else if (value < 0) {
	      result = { sint_value: value }
	    } else {
	      result = { uint_value: value }
	    }
	  } else {
	    result = { string_value: '' + value }
	  }

	  result.key = type + ':' + value
	  return result
	}
	});

	var vtpbf = (index$13 && typeof index$13 === 'object' && 'default' in index$13 ? index$13['default'] : index$13);

	function worker(self) {
	    return new Worker(self);
	};

	function Worker(self) {
	    this.self = self;
	    this.actor = new Actor(self, this);
	    this.loading = {};

	    this.loaded = {};
	    this.geoJSONIndexes = {};
	}

	extend(Worker.prototype, {
	    'set layers': function(layers) {
	        this.layers = {};
	        var that = this;

	        // Filter layers and create an id -> layer map
	        var childLayerIndicies = [];
	        for (var i = 0; i < layers.length; i++) {
	            var layer = layers[i];
	            if (layer.type === 'fill' || layer.type === 'line' || layer.type === 'circle' || layer.type === 'symbol') {
	                if (layer.ref) {
	                    childLayerIndicies.push(i);
	                } else {
	                    setLayer(layer);
	                }
	            }
	        }

	        // Create an instance of StyleLayer per layer
	        for (var j = 0; j < childLayerIndicies.length; j++) {
	            setLayer(layers[childLayerIndicies[j]]);
	        }

	        function setLayer(serializedLayer) {
	            var styleLayer = StyleLayer.create(
	                serializedLayer,
	                serializedLayer.ref && that.layers[serializedLayer.ref]
	            );
	            styleLayer.updatePaintTransitions({}, {transition: false});
	            that.layers[styleLayer.id] = styleLayer;
	        }

	        this.layerFamilies = createLayerFamilies(this.layers);
	    },

	    'update layers': function(layers) {
	        var that = this;
	        var id;
	        var layer;

	        // Update ref parents
	        for (id in layers) {
	            layer = layers[id];
	            if (layer.ref) updateLayer(layer);
	        }

	        // Update ref children
	        for (id in layers) {
	            layer = layers[id];
	            if (!layer.ref) updateLayer(layer);
	        }

	        function updateLayer(layer) {
	            var refLayer = that.layers[layer.ref];
	            if (that.layers[layer.id]) {
	                that.layers[layer.id].set(layer, refLayer);
	            } else {
	                that.layers[layer.id] = StyleLayer.create(layer, refLayer);
	            }
	            that.layers[layer.id].updatePaintTransitions({}, {transition: false});
	        }

	        this.layerFamilies = createLayerFamilies(this.layers);
	    },

	    'load tile': function(params, callback) {
	        var source = params.source,
	            uid = params.uid;

	        if (!this.loading[source])
	            this.loading[source] = {};


	        var tile = this.loading[source][uid] = new WorkerTile(params);

	        tile.xhr = getArrayBuffer(params.url, done.bind(this));

	        function done(err, data) {
	            delete this.loading[source][uid];

	            if (err) return callback(err);

	            tile.data = new require$$0.VectorTile(new require$$2$1(new Uint8Array(data)));
	            tile.parse(tile.data, this.layerFamilies, this.actor, data, callback);

	            this.loaded[source] = this.loaded[source] || {};
	            this.loaded[source][uid] = tile;
	        }
	    },

	    'reload tile': function(params, callback) {
	        var loaded = this.loaded[params.source],
	            uid = params.uid;
	        if (loaded && loaded[uid]) {
	            var tile = loaded[uid];
	            tile.parse(tile.data, this.layerFamilies, this.actor, params.rawTileData, callback);
	        }
	    },

	    'abort tile': function(params) {
	        var loading = this.loading[params.source],
	            uid = params.uid;
	        if (loading && loading[uid]) {
	            loading[uid].xhr.abort();
	            delete loading[uid];
	        }
	    },

	    'remove tile': function(params) {
	        var loaded = this.loaded[params.source],
	            uid = params.uid;
	        if (loaded && loaded[uid]) {
	            delete loaded[uid];
	        }
	    },

	    'redo placement': function(params, callback) {
	        var loaded = this.loaded[params.source],
	            loading = this.loading[params.source],
	            uid = params.uid;

	        if (loaded && loaded[uid]) {
	            var tile = loaded[uid];
	            var result = tile.redoPlacement(params.angle, params.pitch, params.showCollisionBoxes);

	            if (result.result) {
	                callback(null, result.result, result.transferables);
	            }

	        } else if (loading && loading[uid]) {
	            loading[uid].angle = params.angle;
	        }
	    },

	    'parse geojson': function(params, callback) {
	        var indexData = function(err, data) {
	            rewind(data, true);
	            if (err) return callback(err);
	            if (typeof data != 'object') {
	                return callback(new Error("Input data is not a valid GeoJSON object."));
	            }
	            try {
	                this.geoJSONIndexes[params.source] = params.cluster ?
	                    supercluster(params.superclusterOptions).load(data.features) :
	                    geojsonvt(data, params.geojsonVtOptions);
	            } catch (err) {
	                return callback(err);
	            }
	            callback(null);
	        }.bind(this);

	        // Not, because of same origin issues, urls must either include an
	        // explicit origin or absolute path.
	        // ie: /foo/bar.json or http://example.com/bar.json
	        // but not ../foo/bar.json
	        if (params.url) {
	            getJSON(params.url, indexData);
	        } else if (typeof params.data === 'string') {
	            indexData(null, JSON.parse(params.data));
	        } else {
	            return callback(new Error("Input data is not a valid GeoJSON object."));
	        }
	    },

	    'load geojson tile': function(params, callback) {
	        var source = params.source,
	            coord = params.coord;

	        if (!this.geoJSONIndexes[source]) return callback(null, null); // we couldn't load the file

	        var geoJSONTile = this.geoJSONIndexes[source].getTile(Math.min(coord.z, params.maxZoom), coord.x, coord.y);

	        var tile = geoJSONTile ? new WorkerTile(params) : undefined;

	        this.loaded[source] = this.loaded[source] || {};
	        this.loaded[source][params.uid] = tile;

	        if (geoJSONTile) {
	            var geojsonWrapper = new GeoJSONWrapper(geoJSONTile.features);
	            geojsonWrapper.name = '_geojsonTileLayer';
	            var pbf = vtpbf({ layers: { '_geojsonTileLayer': geojsonWrapper }});
	            if (pbf.byteOffset !== 0 || pbf.byteLength !== pbf.buffer.byteLength) {
	                // Compatibility with node Buffer (https://github.com/mapbox/pbf/issues/35)
	                pbf = new Uint8Array(pbf);
	            }
	            tile.parse(geojsonWrapper, this.layerFamilies, this.actor, pbf.buffer, callback);
	        } else {
	            return callback(null, null); // nothing in the given tile
	        }
	    }
	});

	function createLayerFamilies(layers) {
	    var families = {};

	    for (var layerId in layers) {
	        var layer = layers[layerId];
	        var parentLayerId = layer.ref || layer.id;
	        var parentLayer = layers[parentLayerId];

	        if (parentLayer.layout && parentLayer.layout.visibility === 'none') continue;

	        families[parentLayerId] = families[parentLayerId] || [];
	        if (layerId === parentLayerId) {
	            families[parentLayerId].unshift(layer);
	        } else {
	            families[parentLayerId].push(layer);
	        }
	    }

	    return families;
	}

	return worker;

}));