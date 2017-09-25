// @flow
import {hash as createHash} from './hash'

'use strict';
// = helpers ==============================================================================


function equals(k1, k2) {
	if (k1 === null || k1 === undefined) return false;
	if (k1 === k2) return true;
	if (typeof k1.equals === 'function') return k1.equals(k2);
	return false;
}

// = array helpers =========================================================================

var Arrays = {

	aCopy(src: Array, srcPos: number, dest: Array, destPos: number, length: number): Array {
		var i = 0;
		while (i < length) {
			dest[i + destPos] = src[i + srcPos];
			i += 1;
		}
		return dest;
	}

	, aClone(list: Array): Array {
		var len = list.length;
		var copy = new Array(len);
		for (var i = 0; len > i; i++) {
			copy[i] = list[i];
		}
		return copy;
	}

	, aInsertPair(index, key, value, list: Array): Array {
		var dest = new Array(2 + list.length);

		this.aCopy(list, 0, dest, 0, index);
		dest[index] = key;
		dest[index + 1] = value;
		this.aCopy(list, index, dest, (2 + index), (list.length - index));
		return dest;
	}

	, aRemovePair(index, list: Array): Array {
		var newArray = new Array(list.length - 2);
		this.aCopy(list, 0, newArray, 0, 2 * index);
		this.aCopy(list, 2 * (index + 1), newArray, 2 * index, newArray.length - 2 * index);
		return newArray;
	}

	, aUpdate(i: number, value: T, list: Array<T>): Array {
		var dest = this.aClone(list);
		dest[i] = value;
		return dest;
	}

	// pair array ops ----------------------------------

	, dualRemove(index: number, list: Array): Array {
		var copy = new Array(list.length - 2);
		this.aCopy(list, 0, copy, 0, 2 * index);
		this.aCopy(list, 2 * (index + 1), copy, 2 * index, copy.length - 2 * index);
		return copy;
	}

	, dualUpdate(index: number, key, value, list: Array) {
		var copy = this.aClone(list)
		copy[index] = key
		copy[index + 1] = value
		return copy
	}

	, dualInsert(index: number, key, value, list: Array): Array {
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
}


/* Bit Ops
 ***************************************************************************** */

var Bitwise = {
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
		var v = bitmap & (bit - 1)
		v = v - ((v >> 1) & 0x55555555);
		v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
		return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
	}

	, toBitmap(x) {
		return 1 << x;
	}

	, mask(hash, shift) {
		return (hash >>> shift) & 0x01f;
	}

	, bitpos(hash, shift) {
		return 1 << ((hash >>> shift) & 0x01f);
	}
}


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
})


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
function Node<K,V>(type, owner: Transaction, data: Array<K|V>, hash: number, altHash: number, length: number) {


	if (type === INDEXED_NODE) {
		this.dataMap = hash;
		this.nodeMap = altHash;
	} else { // CollisionNode
		this.hash = hash
		this.length = length
	}

	this.data = data;
	this.type = type;
	this.edit = owner;
}

function _CollisionNode(owner, hash, length, items) {
	this.data = items
	this.hash = hash
	this.edit = owner
	this.length = length

}

function _IndexedNode(owner, dataMap, nodeMap, items) {
	this.data = items
	this.dataMap = dataMap
	this.nodeMap = nodeMap
	this.edit = owner
}

Object.assign(_IndexedNode.prototype, Arrays, Bitwise, Transaction, {
	createHash,

	isSingle(node: Node) {
		if (node.type === COLLISION_NODE)
			return node.length === 1;
		return (this.popcount(node.dataMap) === 2) && (node.nodeMap === 0)
	},

	_updateValue(idx, value, iNode, edit) {
		if (this.isAllowedToEdit(iNode.edit, edit)) {
			iNode.data[idx] = value;
			return iNode;
		}
		return IndexedNode(edit, iNode.dataMap, iNode.nodeMap, this.aUpdate(idx, value, iNode.data));
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

		return IndexedNode(edit, (dataMap ^ bit), (nodeMap | bit), squashed);
	},

	_mergeTwoKeyValuePairs(shift, oldHash, oldKey, oldValue, hash, key, value, edit) {
		if ((32 < shift) && (oldHash === hash)) {
			return CollisionNode(edit, oldHash, 2, [oldKey, oldValue, key, value]);
		}
		var oldMask = this.mask(oldHash, shift)
			, mask = this.mask(hash, shift);

		if (oldMask === mask) {
			return IndexedNode(edit
				, 0
				, this.bitpos(oldHash, shift)
				, [ this._mergeTwoKeyValuePairs((shift + 5)
					, oldHash
					, oldKey
					, oldValue
					, hash
					, key
					, value
					, edit) ]);
		}

		var arr = oldMask < mask ? [oldKey, oldValue, key, value] : [key, value, oldKey, oldValue];
		return IndexedNode(edit, (this.bitpos(oldHash, shift) | this.bitpos(hash, shift)), 0, arr);
	},

	putWithHash(shift, hash, key, value, node, edit) { // IndexedNode specific
		var bit = this.bitpos(hash, shift);
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
				, hash
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
			var newChild = child.putWithHash(shift + 5, hash, key, value, child, edit);

			return child === newChild ? node : this._updateValue(index, newChild, node, edit);
		}

		// does not exist, insert as new key/value
		return IndexedNode(this.setLengthChanged(edit)
			, (dataMap | bit)
			, nodeMap
			, this.aInsertPair((2 * this.hashFragment(dataMap, bit)), key, value, data));
	},

	put(key, value, transaction) {
		return this.putWithHash(0, this.createHash(key), key, value, this, this.start(transaction))
	},
})




Object.assign(_CollisionNode.prototype, Arrays, Bitwise, Transaction, {
	equals,
	createHash,

	_findMatchingKey(key, collisionNode) {
		var { length, data } = collisionNode
		for (var i = 0; i < length; i += 2) {
			if (this.equals(key, data[i])) {
				return i;
			}
		}
		return -1;
	},

	putWithHash(shift, hash, key, value, node, edit) {
		throw new Error('oops, not implemented yet')
	},

	put(key, value, edit) {
		var node = this;
		var edit = this.start(edit)
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
			return CollisionNode(edit, node.hash, (node.length + 1), this.aUpdate(index + 1, value, node.data));
		}
		newArray = this.dualInsert(node.data.length, key, value, node.data);
		this.setLengthChanged(edit);
		return CollisionNode(edit, node.hash, node.length + 1, newArray);
	},




	removeWithHash(shift: number, hash: number, key, node: Node, edit): Node {

		var index = this._findMatchingKey(key, node);
		if (index === -1)
			return node;


		this.setLengthChanged(edit);
		switch (node.length) {
			case 1:
				return EMPTY;
			case 2:
				var data = node.data;
				var idx = (this.equals(key, data[0])) ? 2 : 0;
				return EMPTY.putWithHash(0, hash, data[idx], data[(idx + 1)], EMPTY, edit);
			default:
				return CollisionNode(edit, hash, (node.length - 1), this.aRemovePair(node.data, (index / 2)));
		}

	},

	remove(key, trans) {
		this.removeWithHash(0, createHash(key), key, node, this.start(trans));
	}
})



function IndexedNode(owner, dataMap: number, nodeMap: number, items: Array): Node {
	// return new Node(INDEXED_NODE, owner, items, dataMap, nodeMap, 0)
	return new _IndexedNode(owner, dataMap, nodeMap, items)
}

function CollisionNode(owner, hash, length, items: Array): Node {
	// return new Node(COLLISION_NODE, owner, items, hash, 0, length)
	return new _CollisionNode(owner, hash, length, items)
}


var Trie = {
	equals
	, createHash

	// = get value  =================================================================================

	, lookup(key, node, notFound) {
		var i = 0,
			bit = 0,
			shift = 0,
			hash = this.createHash(key),
			nodeMap = 0,
			dataMap = 0,
			data = null;

		while (node) {
			data = node.data

			if (node.type === 1) { // collision node
				for (i = 0, len = data.length; len > i; i += 2) {
					if (key === data[i])
						return data[i + 1];
				}
				return notFound
			}


			dataMap = node.dataMap
			// IndexedNode
			bit = 1 << ((hash >>> shift) & 0x01f);

			if ((dataMap & bit)) { // if in this node's data

				i = dataMap & (bit - 1)
				i = i - ((i >> 1) & 0x55555555);
				i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
				i = ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;

				i = 2 * i
				return key === data[i] ? data[i + 1] : notFound;
			}

			nodeMap = node.nodeMap
			if (!(nodeMap & bit)) {
				return notFound
			}

			i = nodeMap & (bit - 1)
			i = i - ((i >> 1) & 0x55555555);
			i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
			i = ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;

			node = data[data.length - 1 - i]
			shift += 5
		}
		return notFound
	}

	// = update/append =================================================================================


	// = remove =================================================================================

	, _indexedRemove(shift, hash, key, node, edit) {
		var index;
		var bit = this.bitpos(hash, shift);
		var { dataMap, nodeMap, data } = node

		if ((dataMap & bit) !== 0) {
			index = this.hashFragment(dataMap, bit);

			// hash may be the same, but since we use a higher perf hashing... that doesn't mean it's really the same key
			if (key === data[2 * index]) {
				this.setLengthChanged(edit);

				if (this.popcount(dataMap) === 2 && (nodeMap === 0)) {

					return IndexedNode(edit,
						(shift === 0 ? dataMap ^ bit : this.bitpos(hash, 0)),
						0, //nodeMap hash
						(index === 0 ? data.slice(2, 4) : data.slice(0, 2)));
				}

				return IndexedNode(edit
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
			var newChild = this.remove(shift + 5, hash, key, child, edit);

			if (child !== newChild) {
				if (this.isSingle(newChild)) {
					if (dataMap === 0 && this.popcount(nodeMap) === 1) {
						return newChild;
					}

					// if only one subnode, hoist values up one level
					var newIndex = 2 * this.hashFragment(dataMap, bit);

					return IndexedNode(edit
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

	, remove(shift: number, hash: number, key, node: Node, edit): Node {
		if (node.type === INDEXED_NODE)
			return this._indexedRemove(shift, hash, key, node, edit);

		// Collision Node

		var index = this._findMatchingKey(key,node);
		if (index === -1)
			return node;


		this.setLengthChanged(edit);
		switch (node.length) {
			case 1:
				return EMPTY;
			case 2:
				var data = node.data;
				var idx = (this.equals(key, data[0])) ? 2 : 0;
				return this.putWithHash(0, hash, data[idx], data[(idx + 1)], EMPTY, edit);
			default:
				return CollisionNode(edit, hash, (node.length - 1), this.aRemovePair(node.data, (index / 2)));
		}

	}

	// = iterate =================================================================================

	, kvreduce(fn, seed, node) {
		var data = node.data

		if (node.type === INDEXED_NODE) {
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
		var data = node.data

		if (node.type === INDEXED_NODE) {
			var entryLen = (2 * this.popcount(node.dataMap));
			var nodeLen = entryLen + this.popcount(node.nodeMap);

			var i = 0;
			while (i < nodeLen) {
				if (i < entryLen) {
					yield MapEntry(data[i], data[i + 1]);
					i = i + 2;
				} else {
					yield* iterator(data[i])
					i = i + 1;
				}
			}
		} else { // Collision Node
			var len = (2 * data.length);

			var i = 0;
			while (i < len) {
				yield MapEntry(data[i], data[i + 1]);
				i = i + 2;
			}
		}
	}
}
Object.assign(Trie, Bitwise)
Object.assign(Trie, Transaction)
Object.assign(Trie, Arrays)


var EMPTY_ITERATOR = {
	next() {
		return {done: true}
	}
};

var EMPTY = IndexedNode(null, 0, 0, [])


// create common reducer helpers once, to save creating a function on every call
var Reducer = {
	// store common values on the reducer's seed/accumulator to avoid closures(faster)
	FastFerry: function FastFerry(fn, seed) {
		if (!(this instanceof FastFerry))
			return new FastFerry(fn, seed);

		this.hamt = EMPTY
		this.trans = Transaction.start()
		this.fn = fn
		this.seed = seed
	}

	, mapFn(ferry, key, value) {

		ferry.hamt = Trie.put(key, ferry.fn(value), ferry.hamt, ferry.trans)
		return ferry
	}
	, mapWithKeyFn(ferry, key, value) {

		ferry.hamt = Trie.put(key, ferry.fn(key, value), ferry.hamt, ferry.trans)
		return ferry
	}

	, filterFn(ferry, key, value) {
		if (ferry.fn(value))
			ferry.hamt = Trie.put(key, value, ferry.hamt, ferry.trans)

		return ferry
	}

	, filterWithKeyFn(ferry, key, value) {
		if (ferry.fn(key, value))
			ferry.hamt = Trie.put(key, value, ferry.hamt, ferry.trans)

		return ferry
	}

	, reduceValueFn(ferry, key, value) {
		ferry.seed = ferry.fn(ferry.seed, value)
		return ferry
	}
	, foldValueFn(ferry, key, value) {}
}

export var Map = {
	empty() {
		return EMPTY;
	}

	, of(key, value) {
		return Trie.put(key, value, EMPTY, null)
	}

	, initialize(size, fn) {
		var hamt = EMPTY
		var trans = Transaction.start()

		for (var i = 0; size > i; i++) {
			var { key, value } = fn(i)
			hamt = Trie.put(key, value, hamt, trans)
		}

		return hamt
	}
	, put: (key, value, trie, transaction) => trie.put(key, value, transaction)

	, remove(key, node, transaction) {

		return Trie.remove(0, createHash(key), key, node, Transaction.start(transaction));
	}

	, lookup: Trie.lookup.bind(Trie)

	, includes(key, trie) {
		var NOT_FOUND = {}
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
			ferry.hamt = Trie.put(key, value, ferry.hamt, ferry.trans)
			return ferry
		}, { hamt: target, trans: Transaction() }, src).hamt
	}

};

Object.assign(Node.prototype, {
	lookup: Trie.lookup.bind(Trie)

	, get: function(key, notFound) {
		return this.lookup(key, this, notFound)
	}

	, _put: Trie.put.bind(Trie)
	, put: function(key, value) {
		return this._put(key, value, this)
	}
})