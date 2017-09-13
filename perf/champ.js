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

// = string ================================================================================================

var CACHE = new StringLruCache();

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


function hash(o) {
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
		return hashNumber(o)
	}
	if (type === 'string') {
		return cachedHashString(o);
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


/**
 *
 * @param type - node type ('IndexedNode'|'CollisionNode')
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

	if (type === 'IndexedNode') {
		this.dataMap = hash$$1;
		this.nodeMap = altHash;
	} else { // CollisionNode
		this.hash = hash$$1;
		// this.length = length
	}
}

function IndexedNode(owner, dataMap        , nodeMap        , items                 )                  {
	return new Node('IndexedNode', owner, items, dataMap, nodeMap)
}

function CollisionNode(owner, hash$$1, items                 )                    {
	return new Node('CollisionNode', owner, items, hash$$1, null)
}


const NodeTrait = {
	equals
	// , ...Arrays
	// , ...Transactions
	// , ...Bitwise

	// useful when attempting to squash
	, isSingle(node          ) {
		if (node.type === 'CollisionNode')
			return node.data.length === 1;
		return (this.popcount(node.dataMap) === 1) && (node.nodeMap === 0)
	}

	// = get value  =================================================================================

	, find(key, node          , notFound ) {
		if (!node) return notFound;

		return this._findRecurse(0, hash(key), key, node, notFound);
	}

	, _findRecurse(shift        , hash$$1        , key     , node          , notFound ) {
		var data = node.data
			, entry;

		if (node.type === 'CollisionNode') {
			for (var i = 0, len = data.length; len > i; i += 2) {
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
		var { data } = collisionNode;
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
		if (node.type === 'CollisionNode')
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
		if (node.type === 'IndexedNode')
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

		if (node.type === 'IndexedNode') {
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

const Api = {
	empty()                  {
		return EMPTY;
	}

	, put(key     , value     , node           = EMPTY, transaction             ) {

		return NodeTrait.put(0, hash(key), new MapEntry(key, value), node, Transactions.reset(transaction))
	}

	, remove(key     , node          , transaction              ) {

		return NodeTrait.remove(0, hash(key), key, node, Transactions.reset(transaction));
	}


	, get: NodeTrait.find.bind(NodeTrait)

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

class NodeIterator  {

	constructor(node, f) {

		this.TUPLE = {value: null, done: false};
		this.NULL = {};
		this.format = f;

// 		this.next_entry = NULL;
//
// 		this.nodes = new Array(7);
// 		this.cursor_lengths = new Array(7);
//
//
// 		this.f = f;
//
// 		var array = this.array = node.array
// 		this.lvl = 0;
// 		this.data_idx = 0;
//
// 		this.data_len = node.dataArity();
// 		this.nodes[0] = node;
// 		this.cursor_lengths[0] = node.nodeArity();
//
// 		if (this.data_len == 0) {
// 			this.advance();
// 		} else {
// 			this.data_len -= 1;
// 		}
//
// 		this.next_entry = this.f(array[(this.data_idx * 2)], array[((this.data_idx * 2) + 1)]);
	}

//
// 	advance() {
// 		if (this.data_idx < this.data_len) {
// 			this.data_idx = this.data_idx + 1;
// 			this.next_entry = this.f(array[(this.data_idx * 2)], array[((this.data_idx * 2) + 1)]);
//
// 			return true;
// 		} else {
// 			while (this.lvl >= 0) {
// 				var node_idx = this.cursor_lengths[this.lvl];
// 				if (node_idx == 0) {
// 					this.lvl = this.lvl - 1;
// 				} else {
// 					this.cursor_lengths[this.lvl] = (node_idx - 1);
//
// 					var node = this.nodes[this.lvl].getNode(node_idx);
// 					var has_nodes = node.hasNodes();
// 					var new_lvl = has_nodes ? (this.lvl + 1) : this.lvl;
//
// 					if (has_nodes) {
// 						this.nodes[new_lvl] = node;
// 						this.cursor_lengths[new_lvl] = node.nodeArity();
// 					}
//
// 					if (node.hasData()) {
// 						this.array = node.array
// 						this.lvl = new_lvl;
// 						this.data_idx = 0;
// 						this.data_len = (node.dataArity() - 1);
// 						this.next_entry = this.f(array[(this.data_idx * 2)], array[((this.data_idx * 2) + 1)]);
//
// 						return true;
// 					}
//
// 					lvl += 1;
// 				}
// 			}
//
// 			return false;
// 		}
// 	}
//
// 	hasNext() {
// 		if (this.next_entry != NULL) {
// 			return true;
// 		}
//
// 		return advance();
// 	}
//
	next() {
		var ret = this.next_entry;
		if (ret !== this.NULL) {
			this.next_entry = NULL;
			return ret;
		} else if (this.advance()) {
			return this.next();
		}
		throw new NoSuchElementException();
	}

}

function equals$1(k1, k2) {
	if (k1 === null || k1 === undefined) return false;
	if (k1 === k2) return true;
	if (typeof k1.equals === 'function') return k1.equals(k2);
	return false;
}

// = array helpers =========================================================================

const Arrays$1 = {

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

const Bitwise$1 = {
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
		return this.popcount(bitmap & (bit - 1));
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
const Transaction = {
	reset(transaction) {
		if (!transaction) return;

		delete transaction.isLengthDifferent;

		return transaction
	},

	isAllowedToEdit(nodeOwner, transaction) {
		return nodeOwner && transaction === nodeOwner;
	},

	setLengthChanged(transaction) {
		this.isLengthDifferent = true;
		return transaction;
	}
};


// = class ==============================================================================

//use a constructor vs a pojo here for better performance
function MapEntry$1(key, value) {
	if (!(this instanceof MapEntry$1))
		return new MapEntry$1(key, value);

	this.key = key;
	this.value = value;
}


/**
 *
 * @param type - node type ('IndexedNode'|'CollisionNode')
 * @param owner - any object which can represent the current
 * transaction. used to detect if mutation optimizations are
 * allowed
 * @param data - an array keys, values and subnodes
 * @param hash - used to calculate index of current concrete values
 * @param altHash - used to calculate index of subnodes
 * @param length
 * @constructor
 */
function Node$1     (type, owner , data            , hash$$1        , altHash         , length         ) {
	this.edit = owner;
	this.data = data;
	this.type = type;

	if (type === 'IndexedNode') {
		this.dataMap = hash$$1;
		this.nodeMap = altHash;
	} else { // CollisionNode
		this.hash = hash$$1;
		this.length = length;
	}
}

function IndexedNode$1(owner, dataMap        , nodeMap        , items       )       {
	return new Node$1('IndexedNode', owner, items, dataMap, nodeMap)
}

function CollisionNode$1(owner, hash$$1, length, items       )       {
	return new Node$1('CollisionNode', owner, items, hash$$1, null, length)
}


const NodeTrait$1 = {
	equals: equals$1

	// useful when attempting to squash
	, isSingle(node      ) {
		if (node.type === 'CollisionNode')
			return node.length === 1;
		return (this.popcount(node.dataMap) === 2) && (node.nodeMap === 0)
	}

	// = get value  =================================================================================

	, find(key, node, notFound) {
		if (!node) return notFound;

		return this._findRecurse(0, hash(key), key, node, notFound);
	}

	, _findRecurse(shift, hash$$1, key, node, notFound) {
		const data = node.data;

		if (node.type === 'CollisionNode') {
			for (var i = 0, len = data.length; len > i; i += 2) {
				if (this.equals(key, data[i]))
					return i;
			}
			return notFound
		}

		// - IndexedNode ------------------------

		var bit = this.bitpos(hash$$1, shift);

		if ((node.dataMap & bit) !== 0) { // if in this node's data

			var idx = 2 * this.hashFragment(node.dataMap, bit);
			return key === data[idx] ? data[idx + 1] : notFound;
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

	, _copyAndMigrateToNode(edit, bit, child, node) {
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

	, _mergeTwoKeyValuePairs(edit, shift, oldHash, oldKey, oldValue, hash$$1, key, value) {
		if ((32 < shift) && (oldHash === hash$$1)) {
			return CollisionNode$1(edit, oldHash, 2, [oldKey, oldValue, key, value]);
		}
		var oldMask = this.mask(oldHash, shift)
			, mask = this.mask(hash$$1, shift);

		if (oldMask === mask) {
			return IndexedNode$1(edit
				, 0
				, this.bitpos(oldHash, shift)
				, [ this._mergeTwoKeyValuePairs(edit
					, (shift + 5)
					, oldHash
					, oldKey
					, oldValue
					, hash$$1
					, key
					, value) ]);
		}

		var arr = oldMask < mask ? [oldKey, oldValue, key, value] : [key, value, oldKey, oldValue];
		return IndexedNode$1(edit, (this.bitpos(oldHash, shift) | this.bitpos(hash$$1, shift)), 0, arr);
	}

	, _IndexedPut(shift, hash$$1, key, value, node, edit) {
		var bit = this.bitpos(hash$$1, shift);
		var { data, nodeMap, dataMap } = node;

		if ((dataMap & bit) !== 0) { // is existing key/value
			var idx = 2 * this.hashFragment(dataMap, bit);
			var existingKey = data[idx];

			if (key === existingKey) {
				return this._updateValue(idx + 1, value, node, edit);
			}

			var oldValue = node.data[idx + 1];
			var newChild = this._mergeTwoKeyValuePairs(edit
				, (shift + 5)
				, hash(existingKey)
				, existingKey
				, oldValue
				, hash$$1
				, key
				, value);

			return this._copyAndMigrateToNode(this.setLengthChanged(edit)
				, bit
				, newChild
				, node);

		} else if ((nodeMap & bit) !== 0) { // is in existing child node
			var index = data.length - 1 - this.hashFragment(nodeMap, bit);
			var child = data[index];
			var newChild = this.put(shift + 5, hash$$1, key, value, child, edit);

			return child === newChild ? node : this._updateValue(index, newChild, node, edit);
		}

		// does not exist, insert as new key/value
		return IndexedNode$1(this.setLengthChanged(edit)
			, (dataMap | bit)
			, nodeMap
			, this.aInsertPair((2 * this.hashFragment(dataMap, bit)), key, value, data));
	}

	, _CollisionPut(shift, hash$$1, key, value, node, edit) {
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

	, put(shift, hash$$1, key, value, node, edit) {
		if (node.type === 'CollisionNode')
			return this._CollisionPut(shift, hash$$1, key, value, node, edit)

		return this._IndexedPut(shift, hash$$1, key, value, node, edit)
	}

	// = remove =================================================================================

	, _IndexedRemove(shift, hash$$1, key, node, edit) {
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

	, remove(shift        , hash$$1        , key, node      , edit )       {
		if (node.type === 'IndexedNode')
			return this._IndexedRemove(shift, hash$$1, key, node, edit);

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
				return this.put(0, hash$$1, data[idx], data[(idx + 1)], EMPTY$1, edit);
			default:
				return CollisionNode$1(edit, hash$$1, (node.length - 1), this.aRemovePair(node.data, (index / 2)));
		}

	}

	// = iterate =================================================================================

	, kvreduce(fn, seed   , node      )    {
		const {data} = node;

		if (node.type === 'IndexedNode') {
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
			var len = (2 * this.length);

			var i = 0;
			while (i < len) {
				seed = fn(seed, data[i], data[i + 1]);
				i = i + 2;
			}
		}
		return seed;
	}
};
Object.assign(NodeTrait$1, Bitwise$1);
Object.assign(NodeTrait$1, Transaction);
Object.assign(NodeTrait$1, Arrays$1);


const EMPTY_ITERATOR$1 = {
	next() {
		return {done: true}
	}
};

const EMPTY$1 = IndexedNode$1(null, 0, 0, []);

const Api$1 = {
	empty() {
		return EMPTY$1;
	},

	put(key, value, node = EMPTY$1, transaction) {

		return NodeTrait$1.put(0, hash(key), key, value, node, Transaction.reset(transaction))
	},

	remove(key, node, transaction) {
		if (!node) return this;

		return NodeTrait$1.remove(0, hash(key), key, node, Transaction.reset(transaction));
	},

	get: NodeTrait$1.find.bind(NodeTrait$1),

	includes(key, node) {
		const NOT_FOUND = {};
		return NodeTrait$1.find(key, node, NOT_FOUND) === NOT_FOUND
	},

	iterator(root, valueResolver) {
		valueResolver = valueResolver || ((key, value) => value);
		return (root && root.length) ? NodeIterator(root, valueResolver) : EMPTY_ITERATOR$1;
	},

	keyIterator(root) {
		return this.iterator(root, (key, value) => key);
	},

	entryIterator(root) {
		return this.iterator(root, (key, value) => MapEntry$1(key, value));
	},

	kvreduce: NodeTrait$1.kvreduce,

	//todo: pretty sure reduce should yield values only
	reduce(fn, seed, node) {
		return node.kvreduce((acc, key, value) =>
			fn(acc, MapEntry$1(key, value)), seed);
	}

	// keys: use reduce
	// values: use reduce
	// entries: use reduce
	// map: use reduce
	// filter: use reduce
	// pick: use reduce
	// merge
};

exports.Entry = Api;
exports.Inline = Api$1;
