import StringCache from './StringCache'


// = string ================================================================================================

var CACHE = new StringCache()

function cachedHashString(string) {
	return string.length > 16 ? CACHE.getOrCreate(string, hashString) : hashString(string);
}


function hashString(string) {
	var hash = 0;
	for (var i = 0, len = string.length; len > i; i++) {
		hash = 31 * hash + string.charCodeAt(i) | 0;
	}
	return hash >>> 1 & 0x40000000 | hash & 0xbfffffff
}

// = number ================================================================================================

function hashNumber(i) {
	if (i !== i || i === Infinity) {
		return 0;
	}
	var hash = i | 0;
	if (hash !== i) {
		hash ^= i * 0xffffffff;
	}
	while (i > 0xffffffff) {
		i /= 0xffffffff;
		hash ^= i;
	}
	return hash >>> 1 & 0x40000000 | hash & 0xbfffffff
}

// = object ================================================================================================
var objHashUID = 0;

var hashObj = (function() {
	var OBJ_HASH_CACHE;
	var supportsWeakMap = typeof WeakMap === 'function';


	if (supportsWeakMap) {
		OBJ_HASH_CACHE = new WeakMap();

		return function weakHash(obj) {
			if (Object.hasOwnProperty('__immutablehash__')) {
				return obj['__immutablehash__'];
			}
			var hash = OBJ_HASH_CACHE.get(obj);
			if (hash !== undefined) {
				return hash;
			}

			hash = ++objHashUID;
			if (objHashUID & 0x40000000) {
				objHashUID = 0;
			}

			// prefer storing the hash on the object directly, keeps the weakmap small
			// and lookup performance reasonable
			if (Object.isExtensible(obj)) {
				Object.defineProperty(obj, '__immutablehash__', {
					enumerable: false,
					configurable: false,
					writable: false,
					value: hash
				});
			} else {
				OBJ_HASH_CACHE.set(obj, hash);
			}
			return hash;
		}
	}

	return function simpleHash(obj) {
		var hash;
		if (Object.hasOwnProperty('__immutablehash__')) {
			return obj['__immutablehash__'];
		}

		// if object is frozen, we can still do a more expensive hashing
		if (!Object.isExtensible(obj)) {
			return hashString(JSON.stringify(obj))
		}

		hash = ++objHashUID;
		if (objHashUID & 0x40000000) {
			objHashUID = 0;
		}

		Object.defineProperty(obj, '__immutablehash__', {
			enumerable: false,
			configurable: false,
			writable: false,
			value: hash
		});
		return hash;
	}

})();


export function hash(o) {
	var type = typeof o;

	if (type === 'string') {
		var len = o.length, hash = 0;
		if (len > 16) return CACHE.getOrCreate(o, hashString);

		for (var i = 0; len > i; i++) {
			hash = 31 * hash + o.charCodeAt(i) | 0;
		}
		return hash >>> 1 & 0x40000000 | hash & 0xbfffffff

	}
	if (type === 'number') {
		return hashNumber(o)
	}
	if (o === false || o === null || o === undefined) {
		return 0;
	}
	if (o === true) {
		return 1;
	}
	if (typeof o.hashCode === 'function') {
		return o.hashCode();
	}
	// object or array
	if (type === 'object') {
		return hashObj(o);
	}
	//function, class
	if (typeof o.toString === 'function') {
		o = o.toString();
	}
	return hashString('' + o);
}