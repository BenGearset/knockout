var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceNewProxy = exports.affectedToPathList = exports.markToTrack = exports.trackMemo = void 0;
// symbols
var TRACK_MEMO_SYMBOL = Symbol();
var GET_ORIGINAL_SYMBOL = Symbol();
// properties
var AFFECTED_PROPERTY = 'a';
var FROZEN_PROPERTY = 'f';
var PROXY_PROPERTY = 'p';
var PROXY_CACHE_PROPERTY = 'c';
var NEXT_OBJECT_PROPERTY = 'n';
var CHANGED_PROPERTY = 'g';
var HAS_KEY_PROPERTY = 'h';
var ALL_OWN_KEYS_PROPERTY = 'w';
var HAS_OWN_KEY_PROPERTY = 'o';
var KEYS_PROPERTY = 'k';

var getOwnPropertyDescriptorsPolyfill = function (obj) {
    if (obj === null || obj === undefined) {
        throw new TypeError('Cannot convert undefined or null to object')
    }

    var protoPropDescriptor = Object.getOwnPropertyDescriptor(obj, '__proto__')
    var descriptors = {}
    if (protoPropDescriptor) {
        descriptors = { '__proto__': protoPropDescriptor };
    }

    Object.getOwnPropertyNames(obj).forEach( function (name) {descriptors[name] = Object.getOwnPropertyDescriptor(obj, name)} );

    return descriptors
}
// function to create a new bare proxy
var newProxy = function (target, handler) { return new Proxy(target, handler); };
// get object prototype
var getProto = Object.getPrototypeOf;
var objectsToTrack = new WeakMap();
// check if obj is a plain object or an array
var isObjectToTrack = function (obj) { return (obj && (objectsToTrack.has(obj)
    ? objectsToTrack.get(obj)
    : (getProto(obj) === Object.prototype || getProto(obj) === Array.prototype))); };
// check if it is object
var isObject = function (x) { return (typeof x === 'object' && x !== null); };
// check if frozen
var isFrozen = function (obj) { return (Object.isFrozen(obj) || (
// Object.isFrozen() doesn't detect non-writable properties
// See: https://github.com/dai-shi/proxy-compare/pull/8
    Object.values(getOwnPropertyDescriptorsPolyfill(obj)).some(function (descriptor) { return !descriptor.writable; }))); };
// copy frozen object
var unfrozenCache = new WeakMap();
var unfreeze = function (obj) {
    var unfrozen = unfrozenCache.get(obj);
    if (!unfrozen) {
        if (Array.isArray(obj)) {
            // Arrays need a special way to copy
            unfrozen = Array.from(obj);
        }
        else {
            // For non-array objects, we create a new object keeping the prototype
            // with changing all configurable options (otherwise, proxies will complain)
            var descriptors = getOwnPropertyDescriptorsPolyfill(obj);
            Object.values(descriptors).forEach(function (desc) { desc.configurable = true; });
            unfrozen = Object.create(getProto(obj), descriptors);
        }
        unfrozenCache.set(obj, unfrozen);
    }
    return unfrozen;
};
var createProxyHandler = function (origObj, frozen) {
    var _a;
    var state = (_a = {},
        _a[FROZEN_PROPERTY] = frozen,
        _a);
    var trackObject = false; // for trackMemo
    var recordUsage = function (type, key) {
        if (!trackObject) {
            var used = state[AFFECTED_PROPERTY].get(origObj);
            if (!used) {
                used = {};
                state[AFFECTED_PROPERTY].set(origObj, used);
            }
            if (type === ALL_OWN_KEYS_PROPERTY) {
                used[ALL_OWN_KEYS_PROPERTY] = true;
            }
            else {
                var set = used[type];
                if (!set) {
                    set = new Set();
                    used[type] = set;
                }
                set.add(key);
            }
        }
    };
    var recordObjectAsUsed = function () {
        trackObject = true;
        state[AFFECTED_PROPERTY]['delete'](origObj);
    };
    var handler = {
        get: function (target, key) {
            if (key === GET_ORIGINAL_SYMBOL) {
                return origObj;
            }
            recordUsage(KEYS_PROPERTY, key);
            return (0, ko.createProxy)(Reflect.get(target, key), state[AFFECTED_PROPERTY], state[PROXY_CACHE_PROPERTY]);
        },
        has: function (target, key) {
            if (key === TRACK_MEMO_SYMBOL) {
                recordObjectAsUsed();
                return true;
            }
            recordUsage(HAS_KEY_PROPERTY, key);
            return Reflect.has(target, key);
        },
        getOwnPropertyDescriptor: function (target, key) {
            recordUsage(HAS_OWN_KEY_PROPERTY, key);
            return Reflect.getOwnPropertyDescriptor(target, key);
        },
        ownKeys: function (target) {
            recordUsage(ALL_OWN_KEYS_PROPERTY);
            return Reflect.ownKeys(target);
        }
    };
    if (frozen) {
        handler.set = handler.deleteProperty = function () { return false; };
    }
    return [handler, state];
};
var getOriginalObject = function (obj) { return (
// unwrap proxy
    obj[GET_ORIGINAL_SYMBOL]
    // otherwise
    || obj); };
/**
 * Create a proxy.
 *
 * This function will create a proxy at top level and proxy nested objects as you access them,
 * in order to keep track of which properties were accessed via get/has proxy handlers:
 *
 * NOTE: Printing of WeakMap is hard to inspect and not very readable
 * for this purpose you can use the `affectedToPathList` helper.
 *
 * @param {object} obj - Object that will be wrapped on the proxy.
 * @param {WeakMap<object, unknown>} affected -
 * WeakMap that will hold the tracking of which properties in the proxied object were accessed.
 * @param {WeakMap<object, unknown>} [proxyCache] -
 * WeakMap that will help keep referential identity for proxies.
 * @returns {Proxy<object>} - Object wrapped in a proxy.
 *
 * @example
 * import { createProxy } from 'proxy-compare';
 *
 * const original = { a: "1", c: "2", d: { e: "3" } };
 * const affected = new WeakMap();
 * const proxy = createProxy(original, affected);
 *
 * proxy.a // Will mark as used and track its value.
 * // This will update the affected WeakMap with original as key
 * // and a Set with "a"
 *
 * proxy.d // Will mark "d" as accessed to track and proxy itself ({ e: "3" }).
 * // This will update the affected WeakMap with original as key
 * // and a Set with "d"
 */
ko.createProxy = function (obj, affected, proxyCache) {
    if (!isObjectToTrack(obj))
        return obj;
    var target = getOriginalObject(obj);
    var frozen = isFrozen(target);
    var handlerAndState = (proxyCache && proxyCache.get(target));
    if (!handlerAndState || handlerAndState[1][FROZEN_PROPERTY] !== frozen) {
        handlerAndState = createProxyHandler(target, frozen);
        handlerAndState[1][PROXY_PROPERTY] = newProxy(frozen ? unfreeze(target) : target, handlerAndState[0]);
        if (proxyCache) {
            proxyCache.set(target, handlerAndState);
        }
    }
    handlerAndState[1][AFFECTED_PROPERTY] = affected;
    handlerAndState[1][PROXY_CACHE_PROPERTY] = proxyCache;
    return handlerAndState[1][PROXY_PROPERTY];
};
var isAllOwnKeysChanged = function (prevObj, nextObj) {
    var prevKeys = Reflect.ownKeys(prevObj);
    var nextKeys = Reflect.ownKeys(nextObj);
    return prevKeys.length !== nextKeys.length
        || prevKeys.some(function (k, i) { return k !== nextKeys[i]; });
};
/**
 * Compare changes on objects.
 *
 * This will compare the affected properties on tracked objects inside the proxy
 * to check if there were any changes made to it,
 * by default if no property was accessed on the proxy it will attempt to do a
 * reference equality check for the objects provided (Object.is(a, b)). If you access a property
 * on the proxy, then isChanged will only compare the affected properties.
 *
 * @param {object} prevObj - The previous object to compare.
 * @param {object} nextObj - Object to compare with the previous one.
 * @param {WeakMap<object, unknown>} affected -
 * WeakMap that holds the tracking of which properties in the proxied object were accessed.
 * @param {WeakMap<object, unknown>} [cache] -
 * WeakMap that holds a cache of the comparisons for better performance with repetitive comparisons,
 * and to avoid infinite loop with circular structures.
 * @returns {boolean} - Boolean indicating if the affected property on the object has changed.
 *
 * @example
 * import { createProxy, isChanged } from 'proxy-compare';
 *
 * const obj = { a: "1", c: "2", d: { e: "3" } };
 * const affected = new WeakMap();
 *
 * const proxy = createProxy(obj, affected);
 *
 * proxy.a
 *
 * isChanged(obj, { a: "1" }, affected) // false
 *
 * proxy.a = "2"
 *
 * isChanged(obj, { a: "1" }, affected) // true
 */
 ko.isChanged = function (prevObj, nextObj, affected, cache) {
    var _a, _b;
    if (Object.is(prevObj, nextObj)) {
        return false;
    }
    if (!isObject(prevObj) || !isObject(nextObj))
        return true;
    var used = affected.get(getOriginalObject(prevObj));
    if (!used)
        return true;
    if (cache) {
        var hit = cache.get(prevObj);
        if (hit && hit[NEXT_OBJECT_PROPERTY] === nextObj) {
            return hit[CHANGED_PROPERTY];
        }
        // for object with cycles
        cache.set(prevObj, (_a = {},
            _a[NEXT_OBJECT_PROPERTY] = nextObj,
            _a[CHANGED_PROPERTY] = false,
            _a));
    }
    var changed = null;
    try {
        for (var _i = 0, _c = used[HAS_KEY_PROPERTY] || []; _i < _c.length; _i++) {
            var key = _c[_i];
            changed = Reflect.has(prevObj, key) !== Reflect.has(nextObj, key);
            if (changed)
                return changed;
        }
        if (used[ALL_OWN_KEYS_PROPERTY] === true) {
            changed = isAllOwnKeysChanged(prevObj, nextObj);
            if (changed)
                return changed;
        }
        else {
            for (var _d = 0, _e = used[HAS_OWN_KEY_PROPERTY] || []; _d < _e.length; _d++) {
                var key = _e[_d];
                var hasPrev = !!Reflect.getOwnPropertyDescriptor(prevObj, key);
                var hasNext = !!Reflect.getOwnPropertyDescriptor(nextObj, key);
                changed = hasPrev !== hasNext;
                if (changed)
                    return changed;
            }
        }
        for (var _f = 0, _g = used[KEYS_PROPERTY] || []; _f < _g.length; _f++) {
            var key = _g[_f];
            changed = (0, ko.isChanged)(prevObj[key], nextObj[key], affected, cache);
            if (changed)
                return changed;
        }
        if (changed === null)
            changed = true;
        return changed;
    }
    finally {
        if (cache) {
            cache.set(prevObj, (_b = {},
                _b[NEXT_OBJECT_PROPERTY] = nextObj,
                _b[CHANGED_PROPERTY] = changed,
                _b));
        }
    }
};
// explicitly track object with memo
var trackMemo = function (obj) {
    if (isObjectToTrack(obj)) {
        return TRACK_MEMO_SYMBOL in obj;
    }
    return false;
};
exports.trackMemo = trackMemo;
/**
 * Unwrap proxy to get the original object.
 *
 * Used to retrieve the original object used to create the proxy instance with `createProxy`.
 *
 * @param {Proxy<object>} obj -  The proxy wrapper of the originial object.
 * @returns {object | null} - Return either the unwrapped object if exists.
 *
 * @example
 * import { createProxy, getUntracked } from 'proxy-compare';
 *
 * const original = { a: "1", c: "2", d: { e: "3" } };
 * const affected = new WeakMap();
 *
 * const proxy = createProxy(original, affected);
 * const originalFromProxy = getUntracked(proxy)
 *
 * Object.is(original, originalFromProxy) // true
 * isChanged(original, originalFromProxy, affected) // false
 */
ko.getUntracked = function (obj) {
    if (isObjectToTrack(obj)) {
        return obj[GET_ORIGINAL_SYMBOL] || null;
    }
    return null;
};
/**
 * Mark object to be tracked.
 *
 * This function marks an object that will be passed into `createProxy`
 * as marked to track or not. By default only Array and Object are marked to track,
 * so this is useful for example to mark a class instance to track or to mark a object
 * to be untracked when creating your proxy.
 *
 * @param obj - Object to mark as tracked or not.
 * @param mark - Boolean indicating whether you want to track this object or not.
 * @returns - No return.
 *
 * @example
 * import { createProxy, markToTrack, isChanged } from 'proxy-compare';
 *
 * const nested = { e: "3" }
 *
 * markToTrack(nested, false)
 *
 * const original = { a: "1", c: "2", d: nested };
 * const affected = new WeakMap();
 *
 * const proxy = createProxy(original, affected);
 *
 * proxy.d.e
 *
 * isChanged(original, { d: { e: "3" } }, affected) // true
 */
var markToTrack = function (obj, mark) {
    if (mark === void 0) { mark = true; }
    objectsToTrack.set(obj, mark);
};
exports.markToTrack = markToTrack;
/**
 * Convert `affected` to path list
 *
 * `affected` is a weak map which is not printable.
 * This function is can convert it to printable path list.
 * It's for debugging purpose.
 *
 * @param obj - An object that is used with `createProxy`.
 * @param affected - A weak map that is used with `createProxy`.
 * @param onlyWithValues - An optional boolean to exclude object getters.
 * @returns - An array of paths.
 */
var affectedToPathList = function (obj, affected, onlyWithValues) {
    var list = [];
    var seen = new WeakSet();
    var walk = function (x, path) {
        var _a, _b, _c;
        if (seen.has(x)) {
            // for object with cycles
            return;
        }
        if (isObject(x)) {
            seen.add(x);
        }
        var used = isObject(x) && affected.get(getOriginalObject(x));
        if (used) {
            (_a = used[HAS_KEY_PROPERTY]) === null || _a === void 0 ? void 0 : _a.forEach(function (key) {
                var segment = ":has(".concat(String(key), ")");
                list.push(path ? __spreadArray(__spreadArray([], path, true), [segment], false) : [segment]);
            });
            if (used[ALL_OWN_KEYS_PROPERTY] === true) {
                var segment = ':ownKeys';
                list.push(path ? __spreadArray(__spreadArray([], path, true), [segment], false) : [segment]);
            }
            else {
                (_b = used[HAS_OWN_KEY_PROPERTY]) === null || _b === void 0 ? void 0 : _b.forEach(function (key) {
                    var segment = ":hasOwn(".concat(String(key), ")");
                    list.push(path ? __spreadArray(__spreadArray([], path, true), [segment], false) : [segment]);
                });
            }
            (_c = used[KEYS_PROPERTY]) === null || _c === void 0 ? void 0 : _c.forEach(function (key) {
                if (!onlyWithValues || 'value' in (Object.getOwnPropertyDescriptor(x, key) || {})) {
                    walk(x[key], path ? __spreadArray(__spreadArray([], path, true), [key], false) : [key]);
                }
            });
        }
        else if (path) {
            list.push(path);
        }
    };
    walk(obj);
    return list;
};
exports.affectedToPathList = affectedToPathList;
/**
 * replace newProxy function.
 *
 * This can be used if you want to use proxy-polyfill.
 * Note that proxy-polyfill can't polyfill everything.
 * Use it at your own risk.
 */
var replaceNewProxy = function (fn) {
    newProxy = fn;
};
exports.replaceNewProxy = replaceNewProxy;
ko.exportSymbol('isChanged', ko.isChanged);
ko.exportSymbol('createProxy', ko.createProxy);
ko.exportSymbol('getUntracked', ko.getUntracked);
