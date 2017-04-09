function smi(i32) {
	return i32 >>> 1 & 0x40000000 | i32 & 0xbfffffff;
}

var STRING_HASH_CACHE = {};
var STRING_HASH_CACHE_SIZE = 0;

function cachedHashString(string) {
	var hash = STRING_HASH_CACHE[string];
	if (hash === undefined) {
		hash = hashString(string);
		if (STRING_HASH_CACHE_SIZE === 255) {
			STRING_HASH_CACHE_SIZE = 0;
			STRING_HASH_CACHE = {};
		}
		STRING_HASH_CACHE_SIZE++;
		STRING_HASH_CACHE[string] = hash;
	}
	return hash;
}

// http://jsperf.com/hashing-strings
function hashString(string) {
	// This is the hash from JVM
	// The hash code for a string is computed as
	// s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
	// where s[i] is the ith character of the string and n is the length of
	// the string. We "mod" the result to make it between 0 (inclusive) and 2^31
	// (exclusive) by dropping high bits.
	var hash = 0;
	for (var ii = 0; ii < string.length; ii++) {
		hash = 31 * hash + string.charCodeAt(ii) | 0;
	}
	return smi(hash);
}


var objHashUID = 0;

// try and reuse hashes from other libs:
// immutable.js: __immutablehash__
// closure/mori: dynamically generated... :/


var hashObj = (function() {
	var OBJ_HASH_CACHE;
	var supportsWeakMap = typeof WeakMap === 'function';


	if (supportsWeakMap) {
		OBJ_HASH_CACHE = new WeakMap();

		return function weakHash(obj) {
			if(Object.hasOwnProperty('__immutablehash__')) {
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
		if(Object.hasOwnProperty('__immutablehash__')) {
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
	if (o && typeof o.valueOf === 'function') {
		o = o.valueOf();
	}
	if (o === false || o === null || o === undefined) {
		return 0;
	}

	if (o === true) {
		return 1;
	}
	var type = typeof o;
	if (type === 'number') {
		if (o !== o || o === Infinity) {
			return 0;
		}
		var h = o | 0;
		if (h !== o) {
			h ^= o * 0xffffffff;
		}
		while (o > 0xffffffff) {
			o /= 0xffffffff;
			h ^= o;
		}
		return smi(h);
	}
	if (type === 'string') {
		return o.length > 16 ? cachedHashString(o) : hashString(o);
	}
	if (typeof o.hashCode === 'function') {
		return o.hashCode();
	}
	if (type === 'object') {
		return hashJSObj(o);
	}
	if (typeof o.toString === 'function') {
		o = o.toString();
	}
	return hashString('' + o);
}