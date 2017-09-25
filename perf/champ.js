'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

//      

function Entry(value     , key        ) {
	this.value = value;
	this.key = key;
	this.time = Date.now();
}

/**
 *
 */
class StringLruCache {
	            
	              
	              
	                    

	// optimized entry creation by creating a struct instead of an Object

	constructor(max        = 255, batchSize        = 10) {
		this._max = max;
		this._batch = batchSize;
		this._cache = {};
		this._cacheLength = 0;
	}

	_sortByDate(a     , b     ) {
		return a.time - b.time
	}

	_cleanupOldest() {
		var cache = this._cache;
		var items              = [];
		for (var key in cache) {
			items.push(cache[key]);
		}
		items.sort(this._sortByDate)
			.slice(0, this._batch)
			.reduce((cache, item) => {
				delete cache[item.key];
				return cache
			}, cache);

	}

	add(key        , value     ) {
		var _cache = this._cache;
		this._cacheLength += 1;
		if (this._cacheLength === this._max) {
			this._cleanupOldest();
		}

		_cache[key] = new this.Entry(value, key);

		return this;
	}


	has(key        )          {
		return key in this._cache
	}

	remove(key        ) {
		delete this._cache[key];
		return this;
	}

	getOrCreate(key        , factory          ) {
		if (key in this._cache)
			return this._cache[key].value;

		var result = factory(key);
		this.add(key, result);
		return result
	}
}

StringLruCache.prototype.Entry = Entry;

class StringCache {
	constructor(max = 255) {
		this.size = 0;
		this.max = max;
		this.prev = Object.create(null);
		this.cache = Object.create(null);
	}

	_update(key, value) {
		this.cache[key] = value;
		this.size ++;
		if(this.size >= this.max) {
			this.size = 0;
			this.prev = this.cache;
			this.cache = Object.create(null);
		}
		return value;
	}

	has(key) {
		return this.cache[key] !== undefined || this.prev !== undefined
	}

	remove (key) {
		if(this.cache[key] !== undefined)
			this.cache[key] = undefined;
		if(this.prev[key] !== undefined)
			this.prev[key] = undefined;
	}

	getOrCreate(key, factory) {
		var value = this.cache[key];
		if (value !== undefined)
			return value;
		if ((value = this.prev[key]) !== undefined)
			return this._update(key, value)

		return this._update(key, factory(key))
	}
}

'use strict';

// = string ================================================================================================

var CACHE = new StringCache();

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


function hash(o) {
	var type = typeof o;

	if (type === 'string') {
		var len = o.length, hash = 0;
		if (len > 16) return CACHE.getOrCreate(o, hashString);

		// for (var i = 0; len > i; i++) {
		// 	hash = 31 * hash + o.charCodeAt(i) | 0;
		// }
		// return hash >>> 1 & 0x40000000 | hash & 0xbfffffff
		for (var i = 0; i < len; ++i) {
			hash = (hash << 5) - hash + o.charCodeAt(i) | 0;
		}
		return hash;

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

//      
// import {NodeIterator} from './NodeIterator'
'use strict';
// = flow types ==============================================================================

                                                         
                                        


                          
                   
                       
              
             
 

                        
                   
                                         
              
                 
                
 

                                                   

// = helpers ==============================================================================

// SameValue algorithm
// const is = Object.is || ((x, y) =>
// 	( x === y ? (x !== 0 || 1 / x === 1 / y) : (x !== x && y !== y)))

function equals(k1     , k2     )          {
	if (k1 === null || k1 === undefined) return false;
	if (k1 === k2) return true;
	if (typeof k1.equals === 'function') return k1.equals(k2);
	return false;
}

// = array helpers =========================================================================

const Arrays = {

	aCopy(src            , srcPos        , dest            , destPos        , length        )             {
		var i = 0;
		while (i < length) {
			dest[i + destPos] = src[i + srcPos];
			i += 1;
		}
		return dest;
	}

	, aClone(list            )             {
		var len = list.length;
		var copy = new Array(len);
		for (var i = 0; len > i; i++) {
			copy[i] = list[i];
		}
		return copy;
	}

	, aRemove(index, list            )             {
		var copy = new Array(list.length - 1);
		this.aCopy(list, 0, copy, 0, index);
		this.aCopy(list, index + 1, copy, index, copy.length - index);
		return copy;
	}

	, aUpdate(i        , value   , list          )           {
		var copy = this.aClone(list);
		copy[i] = value;
		return copy;
	}

	, aInsert(index, value   , list          )           {
		var dest = new Array(1 + list.length);

		this.aCopy(list, 0, dest, 0, index);
		dest[index] = value;
		this.aCopy(list, index, dest, (1 + index), (list.length - index));
		return dest;
	}
};


/* Bit Ops
 ***************************************************************************** */

const Bitwise = {
	/**
	 Hamming weight. a.k.a popcount
	 Taken from: http://jsperf.com/hamming-weight
	 */
	popcount(v        )         {
		v = v - ((v >> 1) & 0x55555555);
		v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
		return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
	}

	, hashFragment(bitmap        , bit        )         {
		return this.popcount(bitmap & (bit - 1));
	}

	, toBitmap(x        )         {
		return 1 << x;
	}

	, mask(hash$$1        , shift        )         {
		return (hash$$1 >>> shift) & 0x01f;
	}

	, bitpos(hash$$1        , shift        )         {
		return 1 << ((hash$$1 >>> shift) & 0x01f);
	}
};


// = transience ===========================================================================

/**
 * lightweight change tracking ferry for parent/child messaging
 * also used to indicate ownership, while minimizing memory leaks(vs using parent directly, which prevents GC)
 */
const Transactions = {
	reset(transaction             )              {
		if (!transaction) return;

		delete transaction.isLengthDifferent;

		return transaction
	}

	, isAllowedToEdit(nodeOwner             , transaction             )          {
		return nodeOwner && transaction === nodeOwner;
	}

	, setLengthChanged(transaction             )              {
		this.isLengthDifferent = true;
		return transaction;
	}
};


// = class ==============================================================================

//use a constructor vs a pojo here for better performance
function MapEntry(key, value) {
	if (!(this instanceof MapEntry))
		return new MapEntry(key, value);

	this.key = key;
	this.value = value;
}

var INDEXED_NODE = 0;
var COLLISION_NODE = 1;

/**
 *
 * @param type - node type (INDEXED_NODE|COLLISION_NODE)
 * @param owner - any object which can represent the current
 * transaction. used to detect if mutation optimizations are
 * allowed
 * @param data - an array keys, values and subnodes
 * @param hash - used to calculate index of current concrete values
 * @param altHash - used to calculate index of subnodes
 * @param length
 * @constructor
 */
function Node(type, owner , data                 , hash$$1        , altHash         ) {
	this.edit = owner;
	this.data = data;
	this.type = type;

	if (type === INDEXED_NODE) {
		this.dataMap = hash$$1;
		this.nodeMap = altHash;
	} else { // CollisionNode
		this.hash = hash$$1;
		// this.length = length
	}
}

Node.prototype.get = function(key, notFound) {
	return NodeTrait.lookup(key, this, notFound)
};

function IndexedNode(owner, dataMap        , nodeMap        , items                 )                  {
	return new Node(INDEXED_NODE, owner, items, dataMap, nodeMap)
}

function CollisionNode(owner, hash$$1, items                 )                    {
	return new Node(COLLISION_NODE, owner, items, hash$$1, null)
}


const NodeTrait = {
	equals
	, createHash: hash
	// , ...Arrays
	// , ...Transactions
	// , ...Bitwise

	// useful when attempting to squash
	, isSingle(node          ) {
		if (node.type === COLLISION_NODE)
			return node.data.length === 1;
		return (this.popcount(node.dataMap) === 1) && (node.nodeMap === 0)
	}

	// = get value  =================================================================================

	, lookup(key, node, notFound) {
		var bit = 0,
			i = 0,
			shift = 0,
			nodeMap = 0,
			dataMap = 0,
			hash$$1 = this.createHash(key),
			data,
			entry;

		while (node) {
			data = node.data;

			if (node.type === 1) { //COLLISION_NODE
				for (i = 0, len = data.length; len > i; i += 2) {
					if (key === data[i])
						return data[i + 1];
				}
				return notFound
			}

			nodeMap = node.nodeMap;
			dataMap = node.dataMap;
			// IndexedNode
			bit = 1 << ((hash$$1 >>> shift) & 0x01f);

			if ((dataMap & bit)) { // if in this node's data

				i = dataMap & (bit - 1);
				i = i - ((i >> 1) & 0x55555555);
				i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
				i = ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
				entry = data[i];
				return key === entry.key ? entry.value : notFound;
			}

			if (!(nodeMap & bit)) {
				return notFound
			}

			i = nodeMap & (bit - 1);
			i = i - ((i >> 1) & 0x55555555);
			i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
			i = ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;

			node = data[data.length - 1 - i];
			shift += 5;
		}
		return notFound
	}
	, _lookupCollision(key, entries, notFound) {
		for (var i = 0, len = entries.length; len > i; i++) {
			var entry = entries[i];
			if (key === entry.key)
				return entry.value;
		}
		return notFound
	}

	, find(key, node          , notFound ) {
		if (!node) return notFound;

		return this._findRecurse(0, hash(key), key, node, notFound);
	}

	, _findRecurse(shift        , hash$$1        , key     , node          , notFound ) {
		var data = node.data
			, entry;

		if (node.type === COLLISION_NODE) {
			for (var i = 0, len = data.length; len > i; i += 1) {
				entry = data[i];
				if (this.equals(key, entry.key))
					return entry.value
			}
			return notFound
		}

		// - IndexedNode ------------------------

		var bit = this.bitpos(hash$$1, shift);

		if ((node.dataMap & bit) !== 0) { // if in this node's data

			var entry = data[this.hashFragment(node.dataMap, bit)];
			return key === entry.key ? entry.value : notFound;
		}

		if ((node.nodeMap & bit) === 0) // if not in a child node
			return notFound


		return this._findRecurse((shift + 5)
			, hash$$1
			, key
			, data[data.length - 1 - this.hashFragment(node.nodeMap, bit)]
			, notFound);
	}

	// = update/append =================================================================================

	, _findMatchingKey(key     , collisionNode          ) {
		var data = collisionNode.data;
		for (var i = 0, len = data.length; len > i; i++) {
			if (this.equals(key, data[i].key)) {
				return i;
			}
		}
		return -1;
	}

	, _updateValue(idx        , value     , node          , edit             )       {
		if (this.isAllowedToEdit(node.edit, edit)) {
			node.data[idx] = value;
			return node;
		}
		return IndexedNode(edit, node.dataMap, node.nodeMap, this.aUpdate(idx, value, node.data));
	}

	, _copyAndMigrateToNode(edit             , bit        , child          , node                 )       {
		var { data, nodeMap, dataMap } = node;
		var oldIndex = this.hashFragment(dataMap, bit);
		var newIndex = (data.length - 1 - this.hashFragment(nodeMap, bit));

		var squashed = new Array(data.length - 1);
		// drop first key + value
		this.aCopy(data, 0, squashed, 0, oldIndex);
		this.aCopy(data, (1 + oldIndex), squashed, oldIndex, (newIndex - oldIndex));
		squashed[newIndex] = child;
		// drop second key + value
		this.aCopy(data, (1 + newIndex), squashed, (1 + newIndex), (data.length - 1 - newIndex));

		return IndexedNode(edit, (dataMap ^ bit), (nodeMap | bit), squashed);
	}

	, _mergeTwoEntries(edit             , shift        , oldHash        , oldEntry          , hash$$1        , entry          )       {
		if ((32 < shift) && (oldHash === hash$$1)) {
			return CollisionNode(edit, oldHash, [oldEntry, entry]);
		}
		var oldMask = this.mask(oldHash, shift)
			, mask = this.mask(hash$$1, shift);

		if (oldMask === mask) {
			return IndexedNode(edit
				, 0
				, this.bitpos(oldHash, shift)
				, [this._mergeTwoEntries(edit
					, (shift + 5)
					, oldHash
					, oldEntry
					, hash$$1
					, entry)]);
		}

		return IndexedNode(edit
			, (this.bitpos(oldHash, shift) | this.bitpos(hash$$1, shift))
			, 0
			, oldMask < mask ? [oldEntry, entry] : [entry, oldEntry]);
	}

	, _IndexedPut(shift, hash$$1, entry          , node                 , edit             )       {
		var bit = this.bitpos(hash$$1, shift);
		var { data, nodeMap, dataMap } = node;

		if ((dataMap & bit) !== 0) { // is existing key/value
			var idx = this.hashFragment(dataMap, bit);
			var existingEntry = data[idx];

			if (entry.key === existingEntry.key) {
				return this._updateValue(idx + 1, entry, node, edit);
			}

			var newChild = this._mergeTwoEntries(edit
				, (shift + 5)
				, hash(existingEntry.key)
				, existingEntry
				, hash$$1
				, entry);

			return this._copyAndMigrateToNode(this.setLengthChanged(edit)
				, bit
				, newChild
				, node);

		} else if ((nodeMap & bit) !== 0) { // is in existing child node
			var index = data.length - 1 - this.hashFragment(nodeMap, bit);
			var child = data[index];
			var newChild = this.put(shift + 5, hash$$1, entry, child, edit);

			return child === newChild ? node : this._updateValue(index, newChild, node, edit);
		}

		// does not exist, insert as new key/value
		return IndexedNode(this.setLengthChanged(edit)
			, (dataMap | bit)
			, nodeMap
			, this.aInsert(this.hashFragment(dataMap, bit), entry, data));
	}

	, _CollisionPut(shift        , hash$$1        , entry          , node                   , edit             )                    {
		var index = this._findMatchingKey(entry.key, node);
		// transient put
		if (this.isAllowedToEdit(node.edit, edit)) {
			if (index === -1) {
				this.setLengthChanged(edit);

				node.data = this.aInsert(node.data.length, entry, node.data);

			} else if (node.data[index].value !== entry.value) {
				node.data[index] = entry;
			}
			return node;
		}

		// immutable put
		if (index !== -1) {
			if (node.data[index].value === entry.value) { // value is same, do nothing
				return node;
			}
			return CollisionNode(edit, node.hash, this.aUpdate(index, entry, node.data));
		}
		this.setLengthChanged(edit);
		return CollisionNode(edit, node.hash, this.aInsert(node.data.length, entry, node.data));
	}

	, put(shift, hash$$1, entry          , node          , edit             )       {
		if (node.type === COLLISION_NODE)
			return this._CollisionPut(shift, hash$$1, entry, (node                   ), edit)

		return this._IndexedPut(shift, hash$$1, entry, (node                 ), edit)
	}

	// = remove =================================================================================

	, _IndexedRemove(shift        , hash$$1        , key     , node                 , edit             )                  {
		//TODO: convert to entries
		var index;
		var bit = this.bitpos(hash$$1, shift);
		var { dataMap, nodeMap, data } = node;

		if ((dataMap & bit) !== 0) {
			index = this.hashFragment(dataMap, bit);

			// hash may be the same, but since we use a higher perf hashing... that doesn't mean it's really the same key
			if (key === data[index].key) {
				this.setLengthChanged(edit);

				if (this.popcount(dataMap) === 1 && (nodeMap === 0)) {

					return IndexedNode(edit, (shift === 0 ? dataMap ^ bit : this.bitpos(hash$$1, 0)), 0, [data[1 ^ index]]);
				}
				return IndexedNode(edit, dataMap ^ bit, nodeMap, this.aRemove(index, data));
			}
			//no matching key
			return node;
		}

		if ((nodeMap & bit) !== 0) {
			index = data.length - 1 - this.hashFragment(nodeMap, bit);
			var child           = data[index];
			var newChild = this.remove(shift + 5, hash$$1, key, child, edit);

			if (child !== newChild) {
				if (this.isSingle(newChild)) {
					if (dataMap === 0 && this.popcount(nodeMap) === 1) {
						return newChild;
					}

					// if only one subnode, hoist values up one level
					var newIndex = this.hashFragment(dataMap, bit);

					return IndexedNode(edit
						, dataMap | bit
						, nodeMap ^ bit
						, data
							.slice(0, newIndex)
							.concat(newChild.data.slice(0, 1))
							.concat(data.slice(newIndex, index))
							.concat(data.slice(index + 1)));
				}
				return this._updateValue(index, newChild, node, edit);
			}
		}

		return node;
	}

	, remove(shift        , hash$$1        , key     , node          , edit )       {
		if (node.type === INDEXED_NODE)
			return this._IndexedRemove(shift, hash$$1, key, (node                 ), edit);

		// Collision Node
		var index = this._findMatchingKey(key, (node                   ));
		if (index === -1)
			return node;

		var data = node.data;
		this.setLengthChanged(edit);
		switch (data.length) {
			case 1:
				return EMPTY;
			case 2:
				// if there will only be one child, squash to an IndexedNode
				return this.put(0, hash$$1, data[1 ^ index], EMPTY, edit);
			default:
				return CollisionNode(edit, hash$$1, this.aRemove(index, data));
		}
	}

	// = iterate =================================================================================

	, kvreduce(fn          , seed   , node          )    {
		var data = node.data;

		if (node.type === INDEXED_NODE) {
			var entryLen = this.popcount((node             ).dataMap);
			var nodeLen = entryLen + this.popcount((node             ).nodeMap);

			var i = 0;
			while (i < nodeLen) {
				if (i < entryLen) {
					seed = fn(seed, (data[i]          ));
					i = i + 1;
				} else {
					seed = this.kvreduce(fn, seed, (data[i]          ));
					i = i + 1;
				}
			}
		} else { // Collision Node
			var len = data.length;

			var i = 0;
			while (i < len) {
				seed = fn(seed, (data[i]          ));
				i = i + 2;
			}
		}
		return seed;
	}
};
Object.assign(NodeTrait, Bitwise);
Object.assign(NodeTrait, Transactions);
Object.assign(NodeTrait, Arrays);


const EMPTY = IndexedNode(null, 0, 0, []);

const Map = {
	empty()                  {
		return EMPTY;
	}

	, put(key     , value     , node           = EMPTY, transaction             ) {

		return NodeTrait.put(0, hash(key), new MapEntry(key, value), node, Transactions.reset(transaction))
	}

	, remove(key     , node          , transaction              ) {

		return NodeTrait.remove(0, hash(key), key, node, Transactions.reset(transaction));
	}


	, lookup: NodeTrait.lookup.bind(NodeTrait)

	, includes(key     , node          )          {
		const NOT_FOUND = {};
		return NodeTrait.find(key, node, NOT_FOUND) === NOT_FOUND
	}

	// iterator(root, valueResolver) {
	// 	valueResolver = valueResolver || ((key, value) => value);
	// 	return (root && root.length) ? NodeIterator(root, valueResolver) : EMPTY_ITERATOR;
	// },
	//
	// keyIterator(root) {
	// 	return this.iterator(root, (key, value) => key);
	// },
	//
	// entryIterator(root) {
	// 	return this.iterator(root, (key, value) => MapEntry(key, value));
	// },

	, kvreduce: NodeTrait.kvreduce

	//todo: pretty sure reduce should yield values only
	, reduce(fn          , seed   , node          )    {
		return NodeTrait.kvreduce((acc, key, value) => fn(acc, MapEntry(key, value)), seed, node);
	}

	// keys: use reduce
	// values: use reduce
	// entries: use reduce
	// map: use reduce
	// filter: use reduce
	// pick: use reduce
	// merge
};

//      
'use strict';
// = helpers ==============================================================================


function equals$1(k1, k2) {
	if (k1 === null || k1 === undefined) return false;
	if (k1 === k2) return true;
	if (typeof k1.equals === 'function') return k1.equals(k2);
	return false;
}

// = array helpers =========================================================================

var Arrays$1 = {

	aCopy(src       , srcPos        , dest       , destPos        , length        )        {
		var i = 0;
		while (i < length) {
			dest[i + destPos] = src[i + srcPos];
			i += 1;
		}
		return dest;
	}

	, aClone(list       )        {
		var len = list.length;
		var copy = new Array(len);
		for (var i = 0; len > i; i++) {
			copy[i] = list[i];
		}
		return copy;
	}

	, aInsertPair(index, key, value, list       )        {
		var dest = new Array(2 + list.length);

		this.aCopy(list, 0, dest, 0, index);
		dest[index] = key;
		dest[index + 1] = value;
		this.aCopy(list, index, dest, (2 + index), (list.length - index));
		return dest;
	}

	, aRemovePair(index, list       )        {
		var newArray = new Array(list.length - 2);
		this.aCopy(list, 0, newArray, 0, 2 * index);
		this.aCopy(list, 2 * (index + 1), newArray, 2 * index, newArray.length - 2 * index);
		return newArray;
	}

	, aUpdate(i        , value   , list          )        {
		var dest = this.aClone(list);
		dest[i] = value;
		return dest;
	}

	// pair array ops ----------------------------------

	, dualRemove(index        , list       )        {
		var copy = new Array(list.length - 2);
		this.aCopy(list, 0, copy, 0, 2 * index);
		this.aCopy(list, 2 * (index + 1), copy, 2 * index, copy.length - 2 * index);
		return copy;
	}

	, dualUpdate(index        , key, value, list       ) {
		var copy = this.aClone(list);
		copy[index] = key;
		copy[index + 1] = value;
		return copy
	}

	, dualInsert(index        , key, value, list       )        {
		var i = 0,
			len = list.length,
			copy = new Array(2 + len);

		for (i = 0; index > i; i++) {
			copy[i] = list[i];
		}

		copy[index] = key;
		copy[index + 1] = value;

		for (i = index; len > i; i++) {
			copy[i + 2] = list[i];
		}
		return copy;
	}
};


/* Bit Ops
 ***************************************************************************** */

var Bitwise$1 = {
	/**
	 Hamming weight. a.k.a popcount
	 Taken from: http://jsperf.com/hamming-weight
	 */
	popcount(v) {
		v = v - ((v >> 1) & 0x55555555);
		v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
		return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
	}

	, hashFragment(bitmap, bit) {
		var v = bitmap & (bit - 1);
		v = v - ((v >> 1) & 0x55555555);
		v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
		return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
	}

	, toBitmap(x) {
		return 1 << x;
	}

	, mask(hash$$1, shift) {
		return (hash$$1 >>> shift) & 0x01f;
	}

	, bitpos(hash$$1, shift) {
		return 1 << ((hash$$1 >>> shift) & 0x01f);
	}
};


// = transience ===========================================================================

/**
 * lightweight change tracking ferry for parent/child messaging
 * also used to indicate ownership, while minimizing memory leaks(vs using parent directly, which prevents GC)
 */
function Transaction() {
	if (!(this instanceof Transaction))
		return new Transaction()
}

Object.assign(Transaction, {
	reset(transaction) {
		if (!transaction) return;

		delete transaction.isLengthDifferent;

		return transaction
	}

	, start(transaction) {
		return transaction ? this.reset(transaction) : new Transaction();
	}

	, isAllowedToEdit(nodeOwner, transaction) {
		return nodeOwner && transaction === nodeOwner;
	}

	, setLengthChanged(transaction) {

		transaction.isLengthDifferent = true;
		return transaction;
	}
});


// = class ==============================================================================

//use a constructor vs a pojo here for better performance
function MapEntry$1(key, value) {
	if (!(this instanceof MapEntry$1))
		return new MapEntry$1(key, value);

	this.key = key;
	this.value = value;
}

var INDEXED_NODE$1 = 0;
var COLLISION_NODE$1 = 1;

/**
 *
 * @param type - node type (INDEXED_NODE|COLLISION_NODE)
 * @param owner - any object which can represent the current
 * transaction. used to detect if mutation optimizations are
 * allowed
 * @param data - an array keys, values and subnodes
 * @param hash - used to calculate index of current concrete values
 * @param altHash - used to calculate index of subnodes
 * @param length
 * @constructor
 */
function Node$1     (type, owner             , data            , hash$$1        , altHash        , length        ) {


	if (type === INDEXED_NODE$1) {
		this.dataMap = hash$$1;
		this.nodeMap = altHash;
	} else { // CollisionNode
		this.hash = hash$$1;
		this.length = length;
	}

	this.data = data;
	this.type = type;
	this.edit = owner;
}

function IndexedNode$1(owner, dataMap        , nodeMap        , items       )       {
	return new Node$1(INDEXED_NODE$1, owner, items, dataMap, nodeMap, 0)
}

function CollisionNode$1(owner, hash$$1, length, items       )       {
	return new Node$1(COLLISION_NODE$1, owner, items, hash$$1, 0, length)
}


var Trie = {
	equals: equals$1
	, createHash: hash

	// useful when attempting to squash
	, isSingle(node      ) {
		if (node.type === COLLISION_NODE$1)
			return node.length === 1;
		return (this.popcount(node.dataMap) === 2) && (node.nodeMap === 0)
	}

	// = get value  =================================================================================

	, lookup(key, node, notFound) {
		var i = 0,
			bit = 0,
			shift = 0,
			hash$$1 = this.createHash(key),
			nodeMap = 0,
			dataMap = 0,
			data = null;

		while (node) {
			data = node.data;

			if (node.type === 1) { // collision node
				for (i = 0, len = data.length; len > i; i += 2) {
					if (key === data[i])
						return data[i + 1];
				}
				return notFound
			}


			dataMap = node.dataMap;
			// IndexedNode
			bit = 1 << ((hash$$1 >>> shift) & 0x01f);

			if ((dataMap & bit)) { // if in this node's data

				i = dataMap & (bit - 1);
				i = i - ((i >> 1) & 0x55555555);
				i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
				i = ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;

				i = 2 * i;
				return key === data[i] ? data[i + 1] : notFound;
			}

			nodeMap = node.nodeMap;
			if (!(nodeMap & bit)) {
				return notFound
			}

			i = nodeMap & (bit - 1);
			i = i - ((i >> 1) & 0x55555555);
			i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
			i = ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;

			node = data[data.length - 1 - i];
			shift += 5;
		}
		return notFound
	}

	// = update/append =================================================================================

	, _findMatchingKey(key, collisionNode) {
		var { length, data } = collisionNode;
		for (var i = 0; i < length; i += 2) {
			if (this.equals(key, data[i])) {
				return i;
			}
		}
		return -1;
	}

	, _updateValue(idx, value, node, edit) {
		if (this.isAllowedToEdit(node.edit, edit)) {
			node.data[idx] = value;
			return node;
		}
		return IndexedNode$1(edit, node.dataMap, node.nodeMap, this.aUpdate(idx, value, node.data));
	}

	, _copyAndMigrateToNode(bit, child, node, edit) {
		var { data, nodeMap, dataMap } = node;
		var oldIndex = (2 * this.hashFragment(dataMap, bit));
		var newIndex = (data.length - 2 - this.hashFragment(nodeMap, bit));

		var squashed = new Array(data.length - 1);
		// drop first key + value
		this.aCopy(data, 0, squashed, 0, oldIndex);
		this.aCopy(data, (2 + oldIndex), squashed, oldIndex, (newIndex - oldIndex));
		squashed[newIndex] = child;
		// drop second key + value
		this.aCopy(data, (2 + newIndex), squashed, (newIndex + 1), (data.length - 2 - newIndex));

		return IndexedNode$1(edit, (dataMap ^ bit), (nodeMap | bit), squashed);
	}

	, _mergeTwoKeyValuePairs(shift, oldHash, oldKey, oldValue, hash$$1, key, value, edit) {
		if ((32 < shift) && (oldHash === hash$$1)) {
			return CollisionNode$1(edit, oldHash, 2, [oldKey, oldValue, key, value]);
		}
		var oldMask = this.mask(oldHash, shift)
			, mask = this.mask(hash$$1, shift);

		if (oldMask === mask) {
			return IndexedNode$1(edit
				, 0
				, this.bitpos(oldHash, shift)
				, [ this._mergeTwoKeyValuePairs((shift + 5)
					, oldHash
					, oldKey
					, oldValue
					, hash$$1
					, key
					, value
					, edit) ]);
		}

		var arr = oldMask < mask ? [oldKey, oldValue, key, value] : [key, value, oldKey, oldValue];
		return IndexedNode$1(edit, (this.bitpos(oldHash, shift) | this.bitpos(hash$$1, shift)), 0, arr);
	}

	, _indexedPut(shift, hash$$1, key, value, node, edit) {
		var bit = this.bitpos(hash$$1, shift);
		var { data, nodeMap, dataMap } = node;

		if ((dataMap & bit) !== 0) { // is existing key/value
			var idx = 2 * this.hashFragment(dataMap, bit);
			var existingKey = data[idx];

			if (key === existingKey) {
				return this._updateValue(idx + 1, value, node, edit);
			}

			var oldValue = node.data[idx + 1];
			var newChild = this._mergeTwoKeyValuePairs((shift + 5)
				, this.createHash(existingKey)
				, existingKey
				, oldValue
				, hash$$1
				, key
				, value
				, edit);

			return this._copyAndMigrateToNode(bit
				, newChild
				, node
				, this.setLengthChanged(edit));

		} else if ((nodeMap & bit) !== 0) { // is in existing child node
			var index = data.length - 1 - this.hashFragment(nodeMap, bit);
			var child = data[index];
			var newChild = this.putWithHash(shift + 5, hash$$1, key, value, child, edit);

			return child === newChild ? node : this._updateValue(index, newChild, node, edit);
		}

		// does not exist, insert as new key/value
		return IndexedNode$1(this.setLengthChanged(edit)
			, (dataMap | bit)
			, nodeMap
			, this.aInsertPair((2 * this.hashFragment(dataMap, bit)), key, value, data));
	}

	, _collisionPut(shift, hash$$1, key, value, node, edit) {
		var newArray;
		var index = this._findMatchingKey(key, node);
		// transient put
		if (this.isAllowedToEdit(node.edit, edit)) {
			if (index === -1) {
				this.setLengthChanged(edit);

				node.data = this.dualInsert(node.data.length, key, value, node.data);
				node.length += 1;
			} else if (node.data[index + 1] !== value) {
				node.data[index + 1] = value;
			}
			return node;
		}

		// immutable put
		if (index !== -1) {
			if (node.data[index + 1] === value) { // value is same, do nothing
				return node;
			}
			return CollisionNode$1(edit, node.hash, (node.length + 1), this.aUpdate(index + 1, value, node.data));
		}
		newArray = [...node.data, key, value];
		this.setLengthChanged(edit);
		return CollisionNode$1(edit, node.hash, node.length + 1, newArray);
	}

	, putWithHash(shift, hash$$1, key, value, node, edit) {
		if (node.type === COLLISION_NODE$1)
			return this._collisionPut(shift, hash$$1, key, value, node, edit)

		return this._indexedPut(shift, hash$$1, key, value, node, edit)
	}
	, put(key, value, node, transaction) {
		return this.putWithHash(0, this.createHash(key), key, value, node, this.start(transaction))
	}

	// = remove =================================================================================

	, _indexedRemove(shift, hash$$1, key, node, edit) {
		var index;
		var bit = this.bitpos(hash$$1, shift);
		var { dataMap, nodeMap, data } = node;

		if ((dataMap & bit) !== 0) {
			index = this.hashFragment(dataMap, bit);

			// hash may be the same, but since we use a higher perf hashing... that doesn't mean it's really the same key
			if (key === data[2 * index]) {
				this.setLengthChanged(edit);

				if (this.popcount(dataMap) === 2 && (nodeMap === 0)) {

					return IndexedNode$1(edit,
						(shift === 0 ? dataMap ^ bit : this.bitpos(hash$$1, 0)),
						0, //nodeMap hash
						(index === 0 ? data.slice(2, 4) : data.slice(0, 2)));
				}

				return IndexedNode$1(edit
					, dataMap ^ bit
					, nodeMap
					, this.dualRemove(2 * index, data));
			}
			//no matching key
			return node;
		}

		if ((nodeMap & bit) !== 0) {
			index = data.length - 1 - this.hashFragment(nodeMap, bit);
			var child = data[index];
			var newChild = this.remove(shift + 5, hash$$1, key, child, edit);

			if (child !== newChild) {
				if (this.isSingle(newChild)) {
					if (dataMap === 0 && this.popcount(nodeMap) === 1) {
						return newChild;
					}

					// if only one subnode, hoist values up one level
					var newIndex = 2 * this.hashFragment(dataMap, bit);

					return IndexedNode$1(edit
						, dataMap | bit
						, nodeMap ^ bit
						, data
							.slice(0, newIndex)
							.concat(newChild.data.slice(0,2))
							.concat(data.slice(newIndex, index))
							.concat(data.slice(index + 1)));
				}
				return this._updateValue(index, newChild, node, edit);
			}
		}

		return node;
	}

	, remove(shift        , hash$$1        , key, node      , edit)       {
		if (node.type === INDEXED_NODE$1)
			return this._indexedRemove(shift, hash$$1, key, node, edit);

		// Collision Node

		var index = this._findMatchingKey(key,node);
		if (index === -1)
			return node;


		this.setLengthChanged(edit);
		switch (node.length) {
			case 1:
				return EMPTY$1;
			case 2:
				var data = node.data;
				var idx = (this.equals(key, data[0])) ? 2 : 0;
				return this.putWithHash(0, hash$$1, data[idx], data[(idx + 1)], EMPTY$1, edit);
			default:
				return CollisionNode$1(edit, hash$$1, (node.length - 1), this.aRemovePair(node.data, (index / 2)));
		}

	}

	// = iterate =================================================================================

	, kvreduce(fn, seed, node) {
		var data = node.data;

		if (node.type === INDEXED_NODE$1) {
			var entryLen = (2 * this.popcount(node.dataMap));
			var nodeLen = entryLen + this.popcount(node.nodeMap);

			var i = 0;
			while (i < nodeLen) {
				if (i < entryLen) {
					seed = fn(seed, data[i], data[i + 1]);
					i = i + 2;
				} else {
					seed = this.kvreduce(fn, seed, data[i]);
					i = i + 1;
				}
			}
		} else { // Collision Node
			var len = (2 * data.length);

			var i = 0;
			while (i < len) {
				seed = fn(seed, data[i], data[i + 1]);
				i = i + 2;
			}
		}
		return seed;
	}

	, iterator: function* iterator(node) {
		var data = node.data;

		if (node.type === INDEXED_NODE$1) {
			var entryLen = (2 * this.popcount(node.dataMap));
			var nodeLen = entryLen + this.popcount(node.nodeMap);

			var i = 0;
			while (i < nodeLen) {
				if (i < entryLen) {
					yield MapEntry$1(data[i], data[i + 1]);
					i = i + 2;
				} else {
					yield* iterator(data[i]);
					i = i + 1;
				}
			}
		} else { // Collision Node
			var len = (2 * data.length);

			var i = 0;
			while (i < len) {
				yield MapEntry$1(data[i], data[i + 1]);
				i = i + 2;
			}
		}
	}
};
Object.assign(Trie, Bitwise$1);
Object.assign(Trie, Transaction);
Object.assign(Trie, Arrays$1);


var EMPTY$1 = IndexedNode$1(null, 0, 0, []);


// create common reducer helpers once, to save creating a function on every call
var Reducer = {
	// store common values on the reducer's seed/accumulator to avoid closures(faster)
	FastFerry: function FastFerry(fn, seed) {
		if (!(this instanceof FastFerry))
			return new FastFerry(fn, seed);

		this.hamt = EMPTY$1;
		this.trans = Transaction.start();
		this.fn = fn;
		this.seed = seed;
	}

	, mapFn(ferry, key, value) {

		ferry.hamt = Trie.put(key, ferry.fn(value), ferry.hamt, ferry.trans);
		return ferry
	}
	, mapWithKeyFn(ferry, key, value) {

		ferry.hamt = Trie.put(key, ferry.fn(key, value), ferry.hamt, ferry.trans);
		return ferry
	}

	, filterFn(ferry, key, value) {
		if (ferry.fn(value))
			ferry.hamt = Trie.put(key, value, ferry.hamt, ferry.trans);

		return ferry
	}

	, filterWithKeyFn(ferry, key, value) {
		if (ferry.fn(key, value))
			ferry.hamt = Trie.put(key, value, ferry.hamt, ferry.trans);

		return ferry
	}

	, reduceValueFn(ferry, key, value) {
		ferry.seed = ferry.fn(ferry.seed, value);
		return ferry
	}
	, foldValueFn(ferry, key, value) {}
};

var Map$1 = {
	empty() {
		return EMPTY$1;
	}

	, of(key, value) {
		return Trie.put(key, value, EMPTY$1, null)
	}

	, initialize(size, fn) {
		var hamt = EMPTY$1;
		var trans = Transaction.start();

		for (var i = 0; size > i; i++) {
			var { key, value } = fn(i);
			hamt = Trie.put(key, value, hamt, trans);
		}

		return hamt
	}
	, put: Trie.put.bind(Trie)

	, remove(key, node, transaction) {

		return Trie.remove(0, hash(key), key, node, Transaction.start(transaction));
	}

	, lookup: Trie.lookup.bind(Trie)

	, includes(key, trie) {
		var NOT_FOUND = {};
		return Trie.lookup(key, trie, NOT_FOUND) !== NOT_FOUND
	}

	, iterator: Trie.iterator

	//todo: pretty sure reduce should yield values only
	, reduce(fn, seed, trie) {
		return Trie.kvreduce(Reducer.reduceValueFn, Reducer.FastFerry(fn, seed), trie).seed
	}

	, reduceWithKey: Trie.kvreduce

	, map(fn, trie) {
		return Trie.kvreduce(Reducer.mapFn, Reducer.FastFerry(fn), trie).hamt
	}

	, mapWithKey(fn, trie) {
		return Trie.kvreduce(Reducer.mapWithKeyFn, Reducer.FastFerry(fn), trie).hamt
	}

	, filter(fn, trie) {
		return Trie.kvreduce(Reducer.filterFn
			, Reducer.FastFerry(fn)
			, trie).hamt
	}
	, filterWithKey(fn, trie) {
		return Trie.kvreduce(Reducer.filterWithKeyFn, Reducer.FastFerry(fn), trie).hamt
	}

	, merge(target, src) {
		return Trie.kvreduce((ferry, key, value) => {
			ferry.hamt = Trie.put(key, value, ferry.hamt, ferry.trans);
			return ferry
		}, { hamt: target, trans: Transaction() }, src).hamt
	}

};

Object.assign(Node$1.prototype, {
	lookup: Trie.lookup.bind(Trie)

	, get: function(key, notFound) {
		return this.lookup(key, this, notFound)
	}

	, _put: Trie.put.bind(Trie)
	, put: function(key, value) {
		return this._put(key, value, this)
	}
});

//      
'use strict';
// = helpers ==============================================================================


function equals$2(k1, k2) {
	if (k1 === null || k1 === undefined) return false;
	if (k1 === k2) return true;
	if (typeof k1.equals === 'function') return k1.equals(k2);
	return false;
}

// = array helpers =========================================================================

var Arrays$2 = {

	aCopy(src       , srcPos        , dest       , destPos        , length        )        {
		var i = 0;
		while (i < length) {
			dest[i + destPos] = src[i + srcPos];
			i += 1;
		}
		return dest;
	}

	, aClone(list       )        {
		var len = list.length;
		var copy = new Array(len);
		for (var i = 0; len > i; i++) {
			copy[i] = list[i];
		}
		return copy;
	}

	, aInsertPair(index, key, value, list       )        {
		var dest = new Array(2 + list.length);

		this.aCopy(list, 0, dest, 0, index);
		dest[index] = key;
		dest[index + 1] = value;
		this.aCopy(list, index, dest, (2 + index), (list.length - index));
		return dest;
	}

	, aRemovePair(index, list       )        {
		var newArray = new Array(list.length - 2);
		this.aCopy(list, 0, newArray, 0, 2 * index);
		this.aCopy(list, 2 * (index + 1), newArray, 2 * index, newArray.length - 2 * index);
		return newArray;
	}

	, aUpdate(i        , value   , list          )        {
		var dest = this.aClone(list);
		dest[i] = value;
		return dest;
	}

	// pair array ops ----------------------------------

	, dualRemove(index        , list       )        {
		var copy = new Array(list.length - 2);
		this.aCopy(list, 0, copy, 0, 2 * index);
		this.aCopy(list, 2 * (index + 1), copy, 2 * index, copy.length - 2 * index);
		return copy;
	}

	, dualUpdate(index        , key, value, list       ) {
		var copy = this.aClone(list);
		copy[index] = key;
		copy[index + 1] = value;
		return copy
	}

	, dualInsert(index        , key, value, list       )        {
		var i = 0,
			len = list.length,
			copy = new Array(2 + len);

		for (i = 0; index > i; i++) {
			copy[i] = list[i];
		}

		copy[index] = key;
		copy[index + 1] = value;

		for (i = index; len > i; i++) {
			copy[i + 2] = list[i];
		}
		return copy;
	}
};


/* Bit Ops
 ***************************************************************************** */

var Bitwise$2 = {
	/**
	 Hamming weight. a.k.a popcount
	 Taken from: http://jsperf.com/hamming-weight
	 */
	popcount(v) {
		v = v - ((v >> 1) & 0x55555555);
		v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
		return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
	}

	, hashFragment(bitmap, bit) {
		var v = bitmap & (bit - 1);
		v = v - ((v >> 1) & 0x55555555);
		v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
		return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
	}

	, toBitmap(x) {
		return 1 << x;
	}

	, mask(hash$$1, shift) {
		return (hash$$1 >>> shift) & 0x01f;
	}

	, bitpos(hash$$1, shift) {
		return 1 << ((hash$$1 >>> shift) & 0x01f);
	}
};


// = transience ===========================================================================

/**
 * lightweight change tracking ferry for parent/child messaging
 * also used to indicate ownership, while minimizing memory leaks(vs using parent directly, which prevents GC)
 */
function Transaction$1() {
	if (!(this instanceof Transaction$1))
		return new Transaction$1()
}

Object.assign(Transaction$1, {
	reset(transaction) {
		if (!transaction) return;

		delete transaction.isLengthDifferent;

		return transaction
	}

	, start(transaction) {
		return transaction ? this.reset(transaction) : new Transaction$1();
	}

	, isAllowedToEdit(nodeOwner, transaction) {
		return nodeOwner && transaction === nodeOwner;
	}

	, setLengthChanged(transaction) {

		transaction.isLengthDifferent = true;
		return transaction;
	}
});


// = class ==============================================================================

//use a constructor vs a pojo here for better performance
function MapEntry$2(key, value) {
	if (!(this instanceof MapEntry$2))
		return new MapEntry$2(key, value);

	this.key = key;
	this.value = value;
}

var INDEXED_NODE$2 = 0;
var COLLISION_NODE$2 = 1;

function IndexedNode$2(owner, dataMap        , nodeMap        , items       )       {
	// return new _IndexedNode(owner, dataMap, nodeMap, items)

	this.data = items;
	this.dataMap = dataMap;
	this.nodeMap = nodeMap;
	this.edit = owner;
}

function CollisionNode$2(owner, hash$$1, length, items       )       {
	// return new Node(COLLISION_NODE, owner, items, hash, 0, length)
	// return new _CollisionNode(owner, hash, length, items)

	this.data = items;
	this.hash = hash$$1;
	this.edit = owner;
	this.length = length;
}

Object.assign(IndexedNode$2.prototype, Arrays$2, Bitwise$2, Transaction$1, {
	createHash: hash,

	// = update/append =================================================================================
	isSingle(node      ) {
		if (node.type === COLLISION_NODE$2)
			return node.length === 1;
		return (this.popcount(node.dataMap) === 2) && (node.nodeMap === 0)
	},

	_updateValue(idx, value, iNode, edit) {
		if (this.isAllowedToEdit(iNode.edit, edit)) {
			iNode.data[idx] = value;
			return iNode;
		}
		return new IndexedNode$2(edit, iNode.dataMap, iNode.nodeMap, this.aUpdate(idx, value, iNode.data));
	},

	_copyAndMigrateToNode(bit, child, node, edit) {
		var { data, nodeMap, dataMap } = node;
		var oldIndex = (2 * this.hashFragment(dataMap, bit));
		var newIndex = (data.length - 2 - this.hashFragment(nodeMap, bit));

		var squashed = new Array(data.length - 1);
		// drop first key + value
		this.aCopy(data, 0, squashed, 0, oldIndex);
		this.aCopy(data, (2 + oldIndex), squashed, oldIndex, (newIndex - oldIndex));
		squashed[newIndex] = child;
		// drop second key + value
		this.aCopy(data, (2 + newIndex), squashed, (newIndex + 1), (data.length - 2 - newIndex));

		return new IndexedNode$2(edit, (dataMap ^ bit), (nodeMap | bit), squashed);
	},

	_mergeTwoKeyValuePairs(shift, oldHash, oldKey, oldValue, hash$$1, key, value, edit) {
		if ((32 < shift) && (oldHash === hash$$1)) {
			return new CollisionNode$2(edit, oldHash, 2, [oldKey, oldValue, key, value]);
		}
		var oldMask = this.mask(oldHash, shift)
			, mask = this.mask(hash$$1, shift);

		if (oldMask === mask) {
			return new IndexedNode$2(edit
				, 0
				, this.bitpos(oldHash, shift)
				, [ this._mergeTwoKeyValuePairs((shift + 5)
					, oldHash
					, oldKey
					, oldValue
					, hash$$1
					, key
					, value
					, edit) ]);
		}

		var arr = oldMask < mask ? [oldKey, oldValue, key, value] : [key, value, oldKey, oldValue];
		return new IndexedNode$2(edit, (this.bitpos(oldHash, shift) | this.bitpos(hash$$1, shift)), 0, arr);
	},

	putWithHash(shift, hash$$1, key, value, node, edit) { // IndexedNode specific
		var bit = this.bitpos(hash$$1, shift);
		var { data, nodeMap, dataMap } = node;

		if ((dataMap & bit) !== 0) { // is existing key/value
			var idx = 2 * this.hashFragment(dataMap, bit);
			var existingKey = data[idx];

			if (key === existingKey) {
				return this._updateValue(idx + 1, value, node, edit);
			}

			var oldValue = node.data[idx + 1];
			var newChild = this._mergeTwoKeyValuePairs((shift + 5)
				, this.createHash(existingKey)
				, existingKey
				, oldValue
				, hash$$1
				, key
				, value
				, edit);

			return this._copyAndMigrateToNode(bit
				, newChild
				, node
				, this.setLengthChanged(edit));

		} else if ((nodeMap & bit) !== 0) { // is in existing child node
			var index = data.length - 1 - this.hashFragment(nodeMap, bit);
			var child = data[index];
			var newChild = child.putWithHash(shift + 5, hash$$1, key, value, child, edit);

			return child === newChild ? node : this._updateValue(index, newChild, node, edit);
		}

		// does not exist, insert as new key/value
		return new IndexedNode$2(this.setLengthChanged(edit)
			, (dataMap | bit)
			, nodeMap
			, this.aInsertPair((2 * this.hashFragment(dataMap, bit)), key, value, data));
	},

	put(key, value, transaction) {
		return this.putWithHash(0, this.createHash(key), key, value, this, this.start(transaction))
	},

	// = remove =================================================================================

	removeWithHash(shift, hash$$1, key, node, edit) {
		var index;
		var bit = this.bitpos(hash$$1, shift);
		var { dataMap, nodeMap, data } = node;

		if ((dataMap & bit) !== 0) {
			index = this.hashFragment(dataMap, bit);

			// hash may be the same, but since we use a higher perf hashing... that doesn't mean it's really the same key
			if (key === data[2 * index]) {
				this.setLengthChanged(edit);

				if (this.popcount(dataMap) === 2 && (nodeMap === 0)) {

					return new IndexedNode$2(edit,
						(shift === 0 ? dataMap ^ bit : this.bitpos(hash$$1, 0)),
						0, //nodeMap hash
						(index === 0 ? data.slice(2, 4) : data.slice(0, 2)));
				}

				return new IndexedNode$2(edit
					, dataMap ^ bit
					, nodeMap
					, this.dualRemove(2 * index, data));
			}
			//no matching key
			return node;
		}

		if ((nodeMap & bit) !== 0) {
			index = data.length - 1 - this.hashFragment(nodeMap, bit);
			var child = data[index];
			var newChild = this.remove(shift + 5, hash$$1, key, child, edit);

			if (child !== newChild) {
				if (this.isSingle(newChild)) {
					if (dataMap === 0 && this.popcount(nodeMap) === 1) {
						return newChild;
					}

					// if only one subnode, hoist values up one level
					var newIndex = 2 * this.hashFragment(dataMap, bit);

					return new IndexedNode$2(edit
						, dataMap | bit
						, nodeMap ^ bit
						, data
							.slice(0, newIndex)
							.concat(newChild.data.slice(0,2))
							.concat(data.slice(newIndex, index))
							.concat(data.slice(index + 1)));
				}
				return this._updateValue(index, newChild, node, edit);
			}
		}

		return node;
	},

	remove(key, trans) {
		this.removeWithHash(0, hash(key), key, node, this.start(trans));
	},
});




Object.assign(CollisionNode$2.prototype, Arrays$2, Bitwise$2, Transaction$1, {
	equals: equals$2,
	createHash: hash,

	// = update/append =================================================================================
	_findMatchingKey(key, collisionNode) {
		var { length, data } = collisionNode;
		for (var i = 0; i < length; i += 2) {
			if (this.equals(key, data[i])) {
				return i;
			}
		}
		return -1;
	},

	putWithHash(shift, hash$$1, key, value, node, edit) {
		//throw new Error('oops, not implemented yet')
		return this.put(key, value, edit)
	},

	put(key, value, edit) {
		var node = this;
		var edit = this.start(edit);
		var newArray;
		var index = this._findMatchingKey(key, node);
		// transient put
		if (this.isAllowedToEdit(node.edit, edit)) {
			if (index === -1) {
				this.setLengthChanged(edit);

				node.data = this.dualInsert(node.data.length, key, value, node.data);
				node.length += 1;
			} else if (node.data[index + 1] !== value) {
				node.data[index + 1] = value;
			}
			return node;
		}

		// immutable put
		if (index !== -1) {
			if (node.data[index + 1] === value) { // value is same, do nothing
				return node;
			}
			return new CollisionNode$2(edit, node.hash, (node.length + 1), this.aUpdate(index + 1, value, node.data));
		}
		newArray = this.dualInsert(node.data.length, key, value, node.data);
		this.setLengthChanged(edit);
		return new CollisionNode$2(edit, node.hash, node.length + 1, newArray);
	},




	// = remove =================================================================================
	removeWithHash(shift        , hash$$1        , key, node, edit) {

		var index = this._findMatchingKey(key, node);
		if (index === -1)
			return node;


		this.setLengthChanged(edit);
		switch (node.length) {
			case 1:
				return EMPTY$2;
			case 2:
				var data = node.data;
				var idx = (this.equals(key, data[0])) ? 2 : 0;
				return EMPTY$2.putWithHash(0, hash$$1, data[idx], data[(idx + 1)], EMPTY$2, edit);
			default:
				return new CollisionNode$2(edit, hash$$1, (node.length - 1), this.aRemovePair(node.data, (index / 2)));
		}

	},

	remove(key, trans) {
		this.removeWithHash(0, hash(key), key, this, this.start(trans));
	}
});




var Trie$1 = Object.assign({}, Bitwise$2, {
	createHash: hash

	// = get value  =================================================================================

	, lookup(key, node, notFound) {
		var i = 0,
			bit = 0,
			shift = 0,
			hash$$1 = this.createHash(key),
			nodeMap = 0,
			dataMap = 0,
			data = null;

		while (node) {
			data = node.data;

			if (node.type === 1) { // collision node
				for (i = 0, len = data.length; len > i; i += 2) {
					if (key === data[i])
						return data[i + 1];
				}
				return notFound
			}


			dataMap = node.dataMap;
			// IndexedNode
			bit = 1 << ((hash$$1 >>> shift) & 0x01f);

			if ((dataMap & bit)) { // if in this node's data
				// inlined Bitwise.hashFragment
				i = dataMap & (bit - 1);
				i = i - ((i >> 1) & 0x55555555);
				i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
				i = ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;

				i = 2 * i;
				return key === data[i] ? data[i + 1] : notFound;
			}

			nodeMap = node.nodeMap;
			if (!(nodeMap & bit)) {
				return notFound
			}
			//inlined Bitwise.hashFragment
			i = nodeMap & (bit - 1);
			i = i - ((i >> 1) & 0x55555555);
			i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
			i = ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;

			node = data[data.length - 1 - i];
			shift += 5;
		}
		return notFound
	}

	// = iterate =================================================================================

	, kvreduce(fn, seed, node) {
		var data = node.data;

		if (node.type === INDEXED_NODE$2) {
			var entryLen = (2 * this.popcount(node.dataMap));
			var nodeLen = entryLen + this.popcount(node.nodeMap);

			var i = 0;
			while (i < nodeLen) {
				if (i < entryLen) {
					seed = fn(seed, data[i], data[i + 1]);
					i = i + 2;
				} else {
					seed = this.kvreduce(fn, seed, data[i]);
					i = i + 1;
				}
			}
		} else { // Collision Node
			var len = (2 * data.length);

			var i = 0;
			while (i < len) {
				seed = fn(seed, data[i], data[i + 1]);
				i = i + 2;
			}
		}
		return seed;
	}

	, iterator: function* iterator(node) {
		var data = node.data;

		if (node.type === INDEXED_NODE$2) {
			var entryLen = (2 * this.popcount(node.dataMap));
			var nodeLen = entryLen + this.popcount(node.nodeMap);

			var i = 0;
			while (i < nodeLen) {
				if (i < entryLen) {
					yield MapEntry$2(data[i], data[i + 1]);
					i = i + 2;
				} else {
					yield* iterator(data[i]);
					i = i + 1;
				}
			}
		} else { // Collision Node
			var len = (2 * data.length);

			var i = 0;
			while (i < len) {
				yield MapEntry$2(data[i], data[i + 1]);
				i = i + 2;
			}
		}
	}
});


var EMPTY$2 = new IndexedNode$2(null, 0, 0, []);


// create common reducer helpers once, to save creating a function on every call
var Reducer$1 = {
	// store common values on the reducer's seed/accumulator to avoid closures(faster)
	FastFerry: function FastFerry(fn, seed) {
		if (!(this instanceof FastFerry))
			return new FastFerry(fn, seed);

		this.hamt = EMPTY$2;
		this.trans = Transaction$1.start();
		this.fn = fn;
		this.seed = seed;
	}

	, mapFn(ferry, key, value) {

		ferry.hamt = Trie$1.put(key, ferry.fn(value), ferry.hamt, ferry.trans);
		return ferry
	}
	, mapWithKeyFn(ferry, key, value) {

		ferry.hamt = Trie$1.put(key, ferry.fn(key, value), ferry.hamt, ferry.trans);
		return ferry
	}

	, filterFn(ferry, key, value) {
		if (ferry.fn(value))
			ferry.hamt = Trie$1.put(key, value, ferry.hamt, ferry.trans);

		return ferry
	}

	, filterWithKeyFn(ferry, key, value) {
		if (ferry.fn(key, value))
			ferry.hamt = Trie$1.put(key, value, ferry.hamt, ferry.trans);

		return ferry
	}

	, reduceValueFn(ferry, key, value) {
		ferry.seed = ferry.fn(ferry.seed, value);
		return ferry
	}
	, foldValueFn(ferry, key, value) {}
};

var Map$2 = {
	empty() {
		return EMPTY$2;
	}

	, of(key, value) {
		return Trie$1.put(key, value, EMPTY$2, null)
	}

	, initialize(size, fn) {
		var hamt = EMPTY$2;
		var trans = Transaction$1.start();

		for (var i = 0; size > i; i++) {
			var { key, value } = fn(i);
			hamt = Trie$1.put(key, value, hamt, trans);
		}

		return hamt
	}
	, put: (key, value, trie, transaction) => trie.put(key, value, transaction)

	, remove(key, node, transaction) {

		return Trie$1.remove(0, hash(key), key, node, Transaction$1.start(transaction));
	}

	, lookup: Trie$1.lookup.bind(Trie$1)

	, includes(key, trie) {
		var NOT_FOUND = {};
		return Trie$1.lookup(key, trie, NOT_FOUND) !== NOT_FOUND
	}

	, iterator: Trie$1.iterator

	//todo: pretty sure reduce should yield values only
	, reduce(fn, seed, trie) {
		return Trie$1.kvreduce(Reducer$1.reduceValueFn, Reducer$1.FastFerry(fn, seed), trie).seed
	}

	, reduceWithKey: Trie$1.kvreduce

	, map(fn, trie) {
		return Trie$1.kvreduce(Reducer$1.mapFn, Reducer$1.FastFerry(fn), trie).hamt
	}

	, mapWithKey(fn, trie) {
		return Trie$1.kvreduce(Reducer$1.mapWithKeyFn, Reducer$1.FastFerry(fn), trie).hamt
	}

	, filter(fn, trie) {
		return Trie$1.kvreduce(Reducer$1.filterFn
			, Reducer$1.FastFerry(fn)
			, trie).hamt
	}
	, filterWithKey(fn, trie) {
		return Trie$1.kvreduce(Reducer$1.filterWithKeyFn, Reducer$1.FastFerry(fn), trie).hamt
	}

	, merge(target, src) {
		return Trie$1.kvreduce((ferry, key, value) => {
			ferry.hamt = ferry.hamt.put(key, value, ferry.hamt, ferry.trans);
			return ferry
		}, { hamt: target, trans: Transaction$1() }, src).hamt
	}

};

Object.assign(CollisionNode$2.prototype, {
	createHash: hash,
	lookup: Trie$1.lookup,
	get: function(key, notFound) {
		return this.lookup(key, this, notFound)
	}
});

Object.assign(IndexedNode$2.prototype, {
	createHash: hash,
	lookup: Trie$1.lookup,
	get: function(key, notFound) {
		return this.lookup(key, this, notFound)
	}
});

'use strict';

/* Configuration
 ******************************************************************************/
var SIZE = 5;

var BUCKET_SIZE = Math.pow(2, SIZE);

var MASK = BUCKET_SIZE - 1;

var MAX_INDEX_NODE = BUCKET_SIZE / 2;

var MIN_ARRAY_NODE = BUCKET_SIZE / 4;

/*
 ******************************************************************************/
var Nothing = {};

function constant(x) {
	return function () {
		return x;
	};
}

function defaultValBind(f, defaultValue) {
	return function (x) {
		return f(arguments.length === 0 ? defaultValue : x);
	};
}

function hash$1(str) {
	var type = typeof str;

	if (type === 'undefined') return 0;
	if (type === 'number') return str;
	str += '';

	var hash = 0;
	for (var i = 0, len = str.length; i < len; ++i) {
		var c = str.charCodeAt(i);
		hash = (hash << 5) - hash + c | 0;
	}
	return hash;
}

function hashFragment(shift, h) {
	return h >>> shift & MASK;
}

function toBitmap(x) {
	return 1 << x;
}

function fromBitmap(bitmap, bit) {
	var v = bitmap & (bit - 1);
	v = v - ((v >> 1) & 0x55555555);
	v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
	return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
}

/**
 Set a value in an array.

 @param at Index to change.
 @param v New value
 @param arr Array.
 */
var arrayUpdate = function arrayUpdate(at, v, arr) {
	var len = arr.length;
	var out = new Array(len);
	for (var i = 0; i < len; ++i) {
		out[i] = arr[i];
	}out[at] = v;
	return out;
};

/**
 Remove a value from an array.

 @param at Index to remove.
 @param arr Array.
 */
var arraySpliceOut = function arraySpliceOut(at, arr) {
	var len = arr.length;
	var out = new Array(len - 1);
	var i = 0,
		g = 0;
	while (i < at) {
		out[g++] = arr[i++];
	}++i;
	while (i < len) {
		out[g++] = arr[i++];
	}return out;
};

/**
 Insert a value into an array.

 @param at Index to insert at.
 @param v Value to insert,
 @param arr Array.
 */
var arraySpliceIn = function arraySpliceIn(at, v, arr) {
	var len = arr.length;
	var out = new Array(len + 1);
	var i = 0,
		g = 0;
	while (i < at) {
		out[g++] = arr[i++];
	}out[g++] = v;
	while (i < len) {
		out[g++] = arr[i++];
	}return out;
};

/* Node Structures
 ******************************************************************************/
var LEAF = 1;
var COLLISION = 2;
var INDEX = 3;
var ARRAY = 4;

/**
 Empty node.
 */
var emptyNode = { __hamt_isEmpty: true };

function isEmptyNode(x) {
	return x === emptyNode || x && x.__hamt_isEmpty;
}

/**
 Leaf holding a value.

 @member hash Hash of key.
 @member key Key.
 @member value Value stored.
 */
function Leaf(hash, key, value) {
	return {
		type: LEAF,
		hash: hash,
		key: key,
		value: value,
		_modify: Leaf__modify
	}
}

/**
 Leaf holding multiple values with the same hash but different keys.

 @member hash Hash of key.
 @member children Array of collision children node.
 */
function Collision(hash, children) {
	return {
		type: COLLISION,
		hash: hash,
		children: children,
		_modify: Collision__modify
	}
}

/**
 Internal node with a sparse set of children.

 Uses a bitmap and array to pack children.

 @member mask Bitmap that encode the positions of children in the array.
 @member children Array of child nodes.
 */
function IndexedNode$3(mask, children) {
	return {
		type: INDEX,
		mask: mask,
		children: children,
		_modify: IndexedNode__modify
	}
}

/**
 Internal node with many children.

 @member size Number of children.
 @member children Array of child nodes.
 */
function ArrayNode(size, children) {
	return {
		type: ARRAY,
		size: size,
		children: children,
		_modify: ArrayNode__modify
	}
}

/**
 Is `node` a leaf node?
 */
function isLeaf(node) {
	return node === emptyNode || node.type === LEAF || node.type === COLLISION;
}

/* Internal node operations.
 ******************************************************************************/
/**
 Expand an indexed node into an array node.

 @param frag Index of added child.
 @param child Added child.
 @param mask Index node mask before child added.
 @param subNodes Index node children before child added.
 */
function expand(frag, child, bitmap, subNodes) {
	var arr = [];
	var bit = bitmap;
	var count = 0;
	for (var i = 0; bit; ++i) {
		if (bit & 1) arr[i] = subNodes[count++];
		bit >>>= 1;
	}
	arr[frag] = child;
	return ArrayNode(count + 1, arr);
}

/**
 Collapse an array node into a indexed node.

 @param count Number of elements in new array.
 @param removed Index of removed element.
 @param elements Array node children before remove.
 */
function pack(count, removed, elements) {
	var children = new Array(count - 1);
	var g = 0;
	var bitmap = 0;
	for (var i = 0, len = elements.length; i < len; ++i) {
		if (i !== removed) {
			var elem = elements[i];
			if (elem && !isEmptyNode(elem)) {
				children[g++] = elem;
				bitmap |= 1 << i;
			}
		}
	}
	return IndexedNode$3(bitmap, children);
}

/**
 Merge two leaf nodes.

 @param shift Current shift.
 @param h1 Node 1 hash.
 @param n1 Node 1.
 @param h2 Node 2 hash.
 @param n2 Node 2.
 */
function mergeLeaves(shift, h1, n1, h2, n2) {
	if (h1 === h2) return Collision(h1, [n2, n1]);

	var subH1 = hashFragment(shift, h1);
	var subH2 = hashFragment(shift, h2);
	return IndexedNode$3(toBitmap(subH1) | toBitmap(subH2), subH1 === subH2 ? [mergeLeaves(shift + SIZE, h1, n1, h2, n2)] : subH1 < subH2 ? [n1, n2] : [n2, n1]);
}

/**
 Update an entry in a collision list.

 @param hash Hash of collision.
 @param list Collision list.
 @param f Update function.
 @param k Key to update.
 @param size Size reference
 */
function updateCollisionList(h, list, f, k, size) {
	var len = list.length;
	for (var i = 0; i < len; ++i) {
		var child = list[i];
		if (child.key === k) {
			var value = child.value;
			var _newValue = f(value);
			if (_newValue === value) return list;

			if (_newValue === Nothing) {
				--size.value;
				return arraySpliceOut(i, list);
			}
			return arrayUpdate(i, Leaf(h, k, _newValue), list);
		}
	}

	var newValue = f();
	if (newValue === Nothing) return list;
	++size.value;
	return arrayUpdate(len, Leaf(h, k, newValue), list);
}

/* Editing
 ******************************************************************************/
function Leaf__modify(shift, f, h, k, size) {
	if (k === this.key) {
		var _v = f(this.value);
		if (_v === this.value) return this;
		if (_v === Nothing) {
			--size.value;
			return emptyNode;
		}
		return Leaf(h, k, _v);
	}
	var v = f();
	if (v === Nothing) return this;
	++size.value;
	return mergeLeaves(shift, this.hash, this, h, Leaf(h, k, v));
}

function Collision__modify(shift, f, h, k, size) {
	if (h === this.hash) {
		var list = updateCollisionList(this.hash, this.children, f, k, size);
		if (list === this.children) return this;

		return list.length > 1 ? Collision(this.hash, list) : list[0]; // collapse single element collision list
	}
	var v = f();
	if (v === Nothing) return this;
	++size.value;
	return mergeLeaves(shift, this.hash, this, h, Leaf(h, k, v));
}

function IndexedNode__modify(shift, f, h, k, size) {
	var mask = this.mask;
	var children = this.children;
	var frag = hashFragment(shift, h);
	var bit = toBitmap(frag);
	var indx = fromBitmap(mask, bit);
	var exists = mask & bit;
	var current = exists ? children[indx] : emptyNode;
	var child = current._modify(shift + SIZE, f, h, k, size);

	if (current === child) return this;

	if (exists && isEmptyNode(child)) {
		// remove
		var bitmap = mask & ~bit;
		if (!bitmap) return emptyNode;
		return children.length <= 2 && isLeaf(children[indx ^ 1]) ? children[indx ^ 1] // collapse
			: IndexedNode$3(bitmap, arraySpliceOut(indx, children));
	}
	if (!exists && !isEmptyNode(child)) {
		// add
		return children.length >= MAX_INDEX_NODE ? expand(frag, child, mask, children) : IndexedNode$3(mask | bit, arraySpliceIn(indx, child, children));
	}

	// modify
	return IndexedNode$3(mask, arrayUpdate(indx, child, children));
}

function ArrayNode__modify(shift, f, h, k, size) {
	var count = this.size;
	var children = this.children;
	var frag = hashFragment(shift, h);
	var child = children[frag];
	var newChild = (child || emptyNode)._modify(shift + SIZE, f, h, k, size);

	if (child === newChild) return this;

	if (isEmptyNode(child) && !isEmptyNode(newChild)) {
		// add
		return ArrayNode(count + 1, arrayUpdate(frag, newChild, children));
	}
	if (!isEmptyNode(child) && isEmptyNode(newChild)) {
		// remove
		return count - 1 <= MIN_ARRAY_NODE ? pack(count, frag, children) : ArrayNode(count - 1, arrayUpdate(frag, emptyNode, children));
	}

	// modify
	return ArrayNode(count, arrayUpdate(frag, newChild, children));
}

emptyNode._modify = function (_, f, h, k, size) {
	var v = f();
	if (v === Nothing) return emptyNode;
	++size.value;
	return Leaf(h, k, v);
};





/* Queries
 ******************************************************************************/
/**
 Lookup the value for `key` in `map` using a custom `hash`.

 Returns the value or `alt` if none.
 */
function tryGetHash(alt, hash, key, map) {
	var node = map._root;
	var shift = 0;
	while (true) {
		switch (node.type) {
			case 1: //leaf
			{
				return key === node.key ? node.value : alt;
			}
			case 2: //collision
			{
				if (hash === node.hash) {
					var children = node.children;
					for (var i = 0, len = children.length; i < len; ++i) {
						var child = children[i];
						if (key === child.key) return child.value;
					}
				}
				return alt;
			}
			case 3: //indexed
			{

				var bit = 1 << (hash >>> shift & 31);
				if (node.mask & bit) {

					var v = node.mask & (bit - 1);
					v = v - ((v >> 1) & 0x55555555);
					v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
					v = ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;

					node = node.children[v];
					shift += SIZE;
					break;
				}
				return alt;
			}
			case 4: //array
			{
				node = node.children[(hash >>> shift & 31)];
				if (node) {
					shift += SIZE;
					break;
				}
				return alt;
			}
			default:
				return alt;
		}
	}
}


/**
 Lookup the value for `key` in `map` using a custom `hash`.

 Returns the value or `undefined` if none.
 */
function getHash(hash, key, map) {
	return tryGetHash(undefined, hash, key, map);
}


/**
 Does an entry exist for `key` in `map`? Uses custom `hash`.
 */
function hasHash(hash, key, map) {
	return tryGetHash(Nothing, hash, key, map) !== Nothing;
}


/**
 Does an entry exist for `key` in `map`? Uses internal hash function.
 */
function has(key, map) {
	return hasHash(hash$1(key), key, map);
}

/**
 Empty node.
 */
const empty = new Map$3(emptyNode, 0);

/**
 Is `value` a map?
 */
function isMap(value) {
	return !!(value && value.__hamt_isMap);
}

/**
 Does `map` contain any elements?
 */
function isEmpty(map) {
	return !!(isMap(map) && isEmptyNode(map._root));
}

/* Updates
 ******************************************************************************/
/**
 Alter the value stored for `key` in `map` using function `f` using
 custom hash.

 `f` is invoked with the current value for `k` if it exists,
 or `defaultValue` if it is specified. Otherwise, `f` is invoked with no arguments
 if no such value exists.

 `modify` will always either update or insert a value into the map.

 Returns a map with the modified value. Does not alter `map`.
 */
function modifyHash(f, hash, key, map) {
	var size = { value: map._size };
	var newRoot = map._root._modify(0, f, hash, key, size);
	return map.setTree(newRoot, size.value);
}


/**
 Alter the value stored for `key` in `map` using function `f` using
 internal hash function.

 @see `modifyHash`
 */
function modify(f, key, map) {
	return modifyHash(f, hash$1(key), key, map);
}


/**
 Same as `modifyHash`, but invokes `f` with `defaultValue` if no entry exists.

 @see `modifyHash`
 */
function modifyValueHash(f, defaultValue, hash, key, map) {
	return modifyHash(defaultValBind(f, defaultValue), hash, key, map);
}


/**
 @see `modifyValueHash`
 */
function modifyValue(f, defaultValue, key, map) {
	return modifyValueHash(f, defaultValue, hash$1(key), key, map);
}


/**
 Store `value` for `key` in `map` using custom `hash`.

 Returns a map with the modified value. Does not alter `map`.
 */
function setHash(hash, key, value, map) {
	return modifyHash(constant(value), hash, key, map);
}


/**
 Store `value` for `key` in `map` using internal hash function.

 @see `setHash`
 */
function set(key, value, map) {
	return setHash(hash$1(key), key, value, map);
}

/**
 Remove the entry for `key` in `map`.

 Returns a map with the value removed. Does not alter `map`.
 */
var del = constant(Nothing);

function removeHash(hash, key, map) {
	return modifyHash(del, hash, key, map);
}

/**
 Remove the entry for `key` in `map` using internal hash function.

 @see `removeHash`
 */
function remove(key, map) {
	return removeHash(hash$1(key), key, map);
}

/* Traversal
 ******************************************************************************/
/**
 Apply a continuation.
 */
function appk(k) {
	return k && lazyVisitChildren(k[0], k[1], k[2], k[3], k[4]);
}

/**
 Recursively visit all values stored in an array of nodes lazily.
 */
function lazyVisitChildren(len, children, i, f, k) {
	while (i < len) {
		var child = children[i++];
		if (child && !isEmptyNode(child)) return lazyVisit(child, f, [len, children, i, f, k]);
	}
	return appk(k);
}

/**
 Recursively visit all values stored in `node` lazily.
 */
function lazyVisit(node, f, k) {
	switch (node.type) {
		case LEAF:
			return { value: f(node), rest: k };

		case COLLISION:
		case ARRAY:
		case INDEX:
			var children = node.children;
			return lazyVisitChildren(children.length, children, 0, f, k);

		default:
			return appk(k);
	}
}

var DONE = { done: true };

/**
 Javascript iterator over a map.
 */
function MapIterator(v) {
	this.v = v;
}

MapIterator.prototype.next = function () {
	if (!this.v) return DONE;
	var v0 = this.v;
	this.v = appk(v0.rest);
	return v0;
};

MapIterator.prototype[Symbol.iterator] = function () {
	return this;
};

/**
 Lazily visit each value in map with function `f`.
 */
function visit(map, f) {
	return new MapIterator(lazyVisit(map._root, f));
}

/**
 Get a Javascsript iterator of `map`.

 Iterates over `[key, value]` arrays.
 */
function buildPairs(x) {
	return [x.key, x.value];
}
function entries(map) {
	return visit(map, buildPairs);
}


/**
 Get array of all keys in `map`.

 Order is not guaranteed.
 */
function buildKeys(x) {
	return x.key;
}

function keys(map) {
	return visit(map, buildKeys);
}


/**
 Get array of all values in `map`.

 Order is not guaranteed, duplicates are preserved.
 */
function buildValues(x) {
	return x.value;
}

function values(map) {
	return visit(map, buildValues);
}

/* Fold
 ******************************************************************************/
/**
 Visit every entry in the map, aggregating data.

 Order of nodes is not guaranteed.

 @param f Function mapping accumulated value, value, and key to new value.
 @param z Starting value.
 @param m HAMT
 */
function fold(f, z, m) {
	var root = m._root;
	if (root.type === LEAF) return f(z, root.value, root.key);

	var toVisit = [root.children];
	var children = undefined;
	while (children = toVisit.pop()) {
		for (var i = 0, len = children.length; i < len;) {
			var child = children[i++];
			if (child && child.type) {
				if (child.type === LEAF) z = f(z, child.value, child.key);else toVisit.push(child.children);
			}
		}
	}
	return z;
}

/**
 Visit every entry in the map, aggregating data.

 Order of nodes is not guaranteed.

 @param f Function invoked with value and key
 @param map HAMT
 */
function forEach(f, map) {
	return fold(function (_, value, key) {
		return f(value, key, map);
	}, null, map);
}

/* Aggregate
 ******************************************************************************/
/**
 Get the number of entries in `map`.
 */
function count(map) {
	return map._size;
}


/*
 ******************************************************************************/
function Map$3(root, size) {
	this._root = root;
	this._size = size;
}

Object.defineProperty(Map$3.prototype, 'size', {
	get: Map$3.prototype.count
});


Object.assign(Map$3.prototype, {
	count: function() {
		return count(this)
	}
	, forEach: function(f) {
		return forEach(f, this)
	}
	, fold: function(f, seed) {
		return fold(f, seed, this)
	}
	, values: function() {
		return values(this)
	}
	, keys: function() {
		return keys(this)
	}
	, entries: function() {
		return entries(this)
	}
	, remove: function(key) {
		return remove(key, this)
	}
	, removeHash: function(hash, key) {
		return removeHash(hash, key, this)
	}
	, set: function(key, value) {
		return set(key, value, this);
	}
	, setHash: function (hash, key, value) {
		return setHash(hash, key, value, this);
	}
	, modifyValue: function (key, f, defaultValue) {
		return modifyValue(f, defaultValue, key, this);
	}
	, modifyValueHash: function (hash, key, f, defaultValue) {
		return modifyValueHash(f, defaultValue, hash, key, this);
	}
	, modify: function (key, f) {
		return modify(f, key, this);
	}
	, modifyHash: function (hash, key, f) {
		return modifyHash(f, hash, key, this);
	}
	, isEmpty: function () {
		return isEmpty(this);
	}
	, has: function (key) {
		return has(key, this);
	}
	, hasHash: function (hash, key) {
		return hasHash(hash, key, this);
	}
	, get: function (key, alt) {
		return tryGetHash(alt, hash$1(key), key, this);
	}
	, getHash: function (hash, key) {
		return getHash(hash, key, this);
	}
	, tryGet: function (alt, key) {
		return tryGetHash(alt, hash$1(key), key, this);
	}
	, tryGetHash: function(alt, hash, key) {
		return tryGetHash(alt, hash, key, this);
	}
	, setTree: function (root, size) {
		return root === this._root ? this : new Map$3(root, size);
	}
	, __hamt_isMap: true
});

var hamt = Object.freeze({
	empty: empty,
	remove: remove,
	fold: fold
});

exports.Entry = Map;
exports.Inline = Map$1;
exports.Oop = Map$2;
exports.Hamt = hamt;
