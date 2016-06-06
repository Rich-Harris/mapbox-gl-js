import Point from 'point-geometry';
import UnitBezier from 'unitbezier';
import earcut from 'earcut';
import quickselect from 'quickselect';
import featureFilter from 'feature-filter';
import assert from 'assert';
import Grid from 'grid-index';
import vt from 'vector-tile';
import Protobuf from 'pbf';
import MapboxGLFunction from 'mapbox-gl-function';
import __csscolorparser from 'csscolorparser';
import __latest from 'mapbox-gl-style-spec/reference/latest';
import __min from 'mapbox-gl-style-spec/lib/validate_style.min';
import supercluster from 'supercluster';
import geojsonvt from 'geojson-vt';
import rewind from 'geojson-rewind';
import vtpbf from 'vt-pbf';

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

    var triangleIndices = earcut(flattened, holeIndices);

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

Anchor.prototype = Object.create(Point.prototype);

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
    var tl = new Point(left, top);
    var tr = new Point(right, top);
    var br = new Point(right, bottom);
    var bl = new Point(left, bottom);

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

    return [new SymbolQuad(new Point(anchor.x, anchor.y), tl, tr, bl, br, shapedIcon.image.rect, 0, minScale, Infinity)];
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
                anchorPoint: new Point(anchor.x, anchor.y),
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

            otl = new Point(x1, y1),
            otr = new Point(x2, y1),
            obl = new Point(x1, y2),
            obr = new Point(x2, y2);

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

    var newAnchorPoint = new Point(anchor.x, anchor.y);
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
                p0 = new Point(x1, p0.y + (p1.y - p0.y) * ((x1 - p0.x) / (p1.x - p0.x)))._round();
            } else if (p1.x < x1) {
                p1 = new Point(x1, p0.y + (p1.y - p0.y) * ((x1 - p0.x) / (p1.x - p0.x)))._round();
            }

            if (p0.y < y1 && p1.y < y1) {
                continue;
            } else if (p0.y < y1) {
                p0 = new Point(p0.x + (p1.x - p0.x) * ((y1 - p0.y) / (p1.y - p0.y)), y1)._round();
            } else if (p1.y < y1) {
                p1 = new Point(p0.x + (p1.x - p0.x) * ((y1 - p0.y) / (p1.y - p0.y)), y1)._round();
            }

            if (p0.x >= x2 && p1.x >= x2) {
                continue;
            } else if (p0.x >= x2) {
                p0 = new Point(x2, p0.y + (p1.y - p0.y) * ((x2 - p0.x) / (p1.x - p0.x)))._round();
            } else if (p1.x >= x2) {
                p1 = new Point(x2, p0.y + (p1.y - p0.y) * ((x2 - p0.x) / (p1.x - p0.x)))._round();
            }

            if (p0.y >= y2 && p1.y >= y2) {
                continue;
            } else if (p0.y >= y2) {
                p0 = new Point(p0.x + (p1.x - p0.x) * ((y2 - p0.y) / (p1.y - p0.y)), y2)._round();
            } else if (p1.y >= y2) {
                p1 = new Point(p0.x + (p1.x - p0.x) * ((y2 - p0.y) / (p1.y - p0.y)), y2)._round();
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

                var tl = new Point(box.x1, box.y1 * yStretch)._rotate(angle);
                var tr = new Point(box.x2, box.y1 * yStretch)._rotate(angle);
                var bl = new Point(box.x1, box.y2 * yStretch)._rotate(angle);
                var br = new Point(box.x2, box.y2 * yStretch)._rotate(angle);

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
function Buffer(array, arrayType, type) {
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
Buffer.prototype.bind = function(gl) {
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
Buffer.prototype.setVertexAttribPointers = function(gl, program) {
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
Buffer.prototype.destroy = function(gl) {
    if (this.buffer) {
        gl.deleteBuffer(this.buffer);
    }
};

/**
 * @enum {string} BufferType
 * @private
 * @readonly
 */
Buffer.BufferType = {
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
Buffer.ELEMENT_ATTRIBUTE_TYPE = 'Uint16';

/**
 * WebGL performs best if vertex attribute offsets are aligned to 4 byte boundaries.
 * @private
 * @readonly
 */
Buffer.VERTEX_ATTRIBUTE_ALIGNMENT = 4;

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

        assert(member.name.length);
        assert(member.type in viewTypes);

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
            assert(i !== 0);
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
                        var type = (arrayType.members.length && arrayType.members[0].name === 'vertices' ? Buffer.BufferType.ELEMENT : Buffer.BufferType.VERTEX);
                        return new Buffer(array, arrayType, type);
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
                alignment: Buffer.VERTEX_ATTRIBUTE_ALIGNMENT
            });

            programArrayTypes.layout.vertex = VertexArrayType;

            var layerPaintAttributes = this.paintAttributes[programName];
            for (var layerName in layerPaintAttributes) {
                var PaintVertexArrayType = new StructArrayType({
                    members: layerPaintAttributes[layerName].attributes,
                    alignment: Buffer.VERTEX_ATTRIBUTE_ALIGNMENT
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
            type: Buffer.ELEMENT_ATTRIBUTE_TYPE,
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
                assert(attribute.name.slice(0, 2) === 'a_');
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
    assert(string in this._stringToNumber);
    return this._stringToNumber[string];
};

DictionaryCoder.prototype.decode = function(n) {
    assert(n < this._numberToString.length);
    return this._numberToString[n];
};

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
        this.vtLayers = new vt.VectorTile(new Protobuf(new Uint8Array(this.rawTileData))).layers;
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
            return new Point(p.x, p.y);
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

    translate = Point.convert(translate);

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
    var zero = new Point(0, 0);
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
                var tl = new Point(box.x1, box.y1).matMult(reverseRotationMatrix);
                var tr = new Point(box.x2, box.y1).matMult(reverseRotationMatrix);
                var bl = new Point(box.x1, box.y2).matMult(reverseRotationMatrix);
                var br = new Point(box.x2, box.y2).matMult(reverseRotationMatrix);

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
    var anchorPoint = new Point(minX, minY)._matMult(rotationMatrix);

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
        return new Point(this.anchorPointX, this.anchorPointY);
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

var interpolated = function(parameters) {
    var inner = MapboxGLFunction.interpolated(parameters);
    var outer = function(globalProperties, featureProperties) {
        return inner(globalProperties && globalProperties.zoom, featureProperties || {});
    };
    outer.isFeatureConstant = inner.isFeatureConstant;
    outer.isZoomConstant = inner.isZoomConstant;
    return outer;
};

var piecewiseConstant = function(parameters) {
    var inner = MapboxGLFunction['piecewiseConstant'](parameters);
    var outer = function(globalProperties, featureProperties) {
        return inner(globalProperties && globalProperties.zoom, featureProperties || {});
    };
    outer.isFeatureConstant = inner.isFeatureConstant;
    outer.isZoomConstant = inner.isZoomConstant;
    return outer;
};

var isFunctionDefinition = MapboxGLFunction.isFunctionDefinition;


var MapboxGLFunction$1 = Object.freeze({
    interpolated: interpolated,
    piecewiseConstant: piecewiseConstant,
    isFunctionDefinition: isFunctionDefinition
});

var parseCSSColor = __csscolorparser.parseCSSColor;
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
    this.calculate = MapboxGLFunction$1[reference.function || 'piecewiseConstant'](parsedValue);
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

var VectorTileFeature = vt.VectorTileFeature;
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
            newRing.push(new Point(ring[j][0], ring[j][1]));
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

FeatureWrapper.prototype.toGeoJSON = VectorTileFeature.prototype.toGeoJSON;

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

            tile.data = new vt.VectorTile(new Protobuf(new Uint8Array(data)));
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

export default worker;