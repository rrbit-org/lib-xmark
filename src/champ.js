import {hash as hashMe} from './hash'
import {NodeIterator} from './NodeIterator'

// = helpers ==============================================================================

// SameValue algorithm
const is = Object.is || ((x, y) =>
	( x === y ? (x !== 0 || 1 / x === 1 / y) : (x !== x && y !== y)))

function equals(k1, k2) {
	if (k1 === null || k1 === undefined) return false;
	if (k1 === k2) return true;
	if (typeof k1.equals === 'function') return k1.equals(k2);
	return false;
}

// = array helpers =========================================================================

const Arrays = {

	aCopy(src: Array, srcPos: number, dest: Array, destPos: number, length: number): Array {
		var i = 0;
		while (i < length) {
			dest[i + destPos] = src[i + srcPos];
			i += 1;
		}
		return dest;
	}

	, aClone(src: Array): Array {
		var len = src.length;
		var dest = new Array(len);
		for (var i = 0; len > i; i++) {
			dest[i] = src[i];
		}
		return src;
	}

	, aInsertPair(index, key, value, src): Array {
		var dest = new Array(2 + src.length);

		this.aCopy(src, 0, dest, 0, index);
		dest[index] = key;
		dest[index + 1] = value;
		this.aCopy(src, index, dest, (2 + index), (src.length - index));
		return dest;
	}

	, aRemovePair(index, array: Array): Array {
		var newArray = new Array(array.length - 2);
		this.aCopy(array, 0, newArray, 0, 2 * index);
		this.aCopy(array, 2 * (index + 1), newArray, 2 * index, newArray.length - 2 * index);
		return newArray;
	}

	, aSetSafe(i: number, value: T, src: Array<T>): Array {
		var dest = this.aClone(src);
		dest[i] = value;
		return dest;
	}
	, aInsert(index, value, array) {
		var len = array.length + 1
		var list = new Array(len)
		for (var i = 0; index > i; i++) {
			list[i] = array[i]
		}
		list[index] = value
		for (var i = index; len > i; i++) {
			list[i + 1] = array[i]
		}
		return
	}

	// pair array ops ----------------------------------

	, dualRemove(index: number, array: Array): Array {
		var newArray = new Array(array.length - 2);
		this.aCopy(array, 0, newArray, 0, 2 * index);
		this.aCopy(array, 2 * (index + 1), newArray, 2 * index, newArray.length - 2 * index);
		return newArray;
	}

	, dualUpdate(index: number, key, value, items: Array) {
		items = [...items]
		items[index] = key
		items[index + 1] = value
		return items
	}

	, dualInsert(index: number, key, value, src): Array {
		var i = 0,
			len = src.length,
			dest = new Array(2 + len);

		for (i = 0; index > i; i++) {
			dest[i] = src[i];
		}

		dest[index] = key;
		dest[index + 1] = value;

		for (i = index; len > i; i++) {
			dest[i + 2] = src[i];
		}
		return dest;
	}
}


/* Bit Ops
 ***************************************************************************** */

const Bitwise = {
	/**
	 Hamming weight. a.k.a popcount
	 Taken from: http://jsperf.com/hamming-weight
	 */
	popcount(v) {
		v = v - ((v >> 1) & 0x55555555);
		v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
		return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
	}

	, fromBitmap(bitmap, bit) {
		return this.popcount(bitmap & (bit - 1));
	}

	, toBitmap(x) {
		return 1 << x;
	}

	, mask(hash, shift) {
		return (hash >>> shift) & 0x01f;
		// return (hash >>> shift) & 0b11111;
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
}


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
 * Node types:
 * IndexedNode
 * CollisionNode - multiple keys but 1 value
 * ArrayNode - internal node containing many children
 * LeafNode - a single value
 */



function Node<T>(type, owner?, items: Array<T>, hash, altHash, length) {
	this.edit = owner;
	this.array = items;
	this.type = type;

	if (type === 'IndexedNode') {
		this.dataMap = hash;
		this.nodeMap = altHash;
	} else { // CollisionNode
		this.hash = hash
		this.length = length
	}
}

function IndexedNode(owner, dataMap: number, nodeMap: number, items: Array<T>): Node<T> {
	return new Node('IndexedNode', owner, items, dataMap, nodeMap)
}

function CollisionNode(owner, hash, length, items: Array<T>): Node<T> {
	return new Node('CollisionNode', owner, items, hash, null, length)
}


const NodeTrait = {

	equals
	, ...Bitwise
	, ...Transaction
	, ...Arrays

	// useful when attempting to squash
	, isSingle(node) {
		if (node.type === 'CollisionNode')
			return node.length === 1;
		return (this.popcount(node.dataMap) === 2) && (node.nodeMap === 0)
	}

	// = get value  =================================================================================

	, find(key, node, notFound) {
		if (!node) return notFound;

		return this._findRecurse(0, hashMe(key), key, node, notFound);
	}

	, _findRecurse(shift, hash, key, node, notFound) {
		const array = node.array

		if (node.type === 'CollisionNode') {
			for (var i = 0, len = node.length; len > i; i += 2) {
				if (this.equals(key, array[i]))
					return i;
			}
			return notFound
		}

		// - IndexedNode ------------------------

		var bit = this.bitpos(hash, shift);

		if ((node.dataMap & bit) !== 0) { // if in this node's data

			var idx = 2 * this.fromBitmap(node.dataMap, bit);
			return key === array[idx] ? array[idx + 1] : notFound;
		}

		if ((node.nodeMap & bit) === 0) // if not in a child node
			return notFound


		return this._findRecurse((shift + 5)
			, hash
			, key
			, array[array.length - 1 - this.fromBitmap(node.nodeMap, bit)]
			, notFound);
	}

	// = update/append =================================================================================

	, _findMatchingKey(key, collisionNode) {
		var len = collisionNode.length;
		var arr = collisionNode.array;
		for (var i = 0; i < len; i += 2) {
			if (this.equals(key, arr[i])) {
				return i;
			}
		}
		return -1;
	}

	, _copyAndSet(edit, idx, value, node) {
		if (this.isAllowedToEdit(node.edit, edit)) {
			node.array[idx] = value;
			return node;
		} else {

			return IndexedNode(edit, node.dataMap, node.nodeMap, this.aSetSafe(idx, value, node.array));
		}
	}

	, _copyAndMigrateToNode(edit, bit, child, node) {
		var array = node.array;
		var oldIndex = (2 * this.fromBitmap(node.dataMap, bit));
		var newIndex = (array.length - 2 - this.fromBitmap(node.nodeMap, bit));

		var dst = new Array(array.length - 1);
		this.aCopy(array, 0, dst, 0, oldIndex);
		this.aCopy(array, (2 + oldIndex), dst, oldIndex, (newIndex - oldIndex));
		dst[newIndex] = child;
		this.aCopy(array, (2 + newIndex), dst, (newIndex + 1), (array.length - 2 - newIndex));

		// var dst = array.slice(0, oldIndex)
		// 	.concat(array.slice(oldIndex + 2, newIndex))
		// 	.concat([child])
		// 	.concat(array.slice(newIndex + 2))

		return IndexedNode(edit, (node.dataMap ^ bit), (node.nodeMap | bit), dst);
	}

	, _mergeTwoKeyValuePairs(edit, shift, current_hash, current_key, current_val, hash, key, val) {
		if ((32 < shift) && (current_hash === hash)) {
			return CollisionNode(edit, current_hash, 2, [current_key, current_val, key, val]);
		}
		var current_mask = this.mask(current_hash, shift);
		var _mask = this.mask(hash, shift);

		if (current_mask === _mask) {
			var new_node = this._mergeTwoKeyValuePairs(edit, (shift + 5), current_hash, current_key, current_val, hash, key, val);
			return IndexedNode(edit, 0, this.bitpos(current_hash, shift), [new_node]);
		}

		var arr = current_mask < _mask ? [current_key, current_val, key, val] : [key, val, current_key, current_val];
		return IndexedNode(edit, (this.bitpos(current_hash, shift) | this.bitpos(hash, shift)), 0, arr);
	}

	, _putIndexed(edit, shift, hash, key, value, node) {
		var bit = this.bitpos(hash, shift);
		var array = node.array

		if ((node.dataMap & bit) !== 0) { // is existing key/value
			var idx = this.fromBitmap(node.dataMap, bit);
			var oldKey = array[(2 * idx)];

			if (key === oldKey) {
				return this._copyAndSet(edit, ((2 * idx) + 1), value, node);
			}

			var oldValue = node.array[(2 * idx) + 1];
			var newChild = this._mergeTwoKeyValuePairs(edit, (shift + 5), hashMe(oldKey), oldKey, oldValue, hash, key, value);

			return this._copyAndMigrateToNode(this.setLengthChanged(edit), bit, newChild, node);

		} else if ((node.nodeMap & bit) !== 0) { // is in existing child node
			var index = array.length - 1 - this.fromBitmap(node.nodeMap, bit);
			var child = array[index];
			var newChild = this.put(edit, (shift + 5), hash, key, value, child);

			return child === newChild ? node : this._copyAndSet(edit, index, newChild, node);
		}

		// does not exist, insert as new key/value
		return IndexedNode(this.setLengthChanged(edit),
			(node.dataMap | bit),
			node.nodeMap,
			this.aInsertPair((2 * this.fromBitmap(node.dataMap, bit)), key, value, array));
	}

	, _putCollision(edit, shift, hash, key, value, node) {
		var newArray;
		var index = this._findMatchingKey(key);
		// transient put
		if (this.isAllowedToEdit(node.edit, edit)) {
			if (index === -1) {
				this.setLengthChanged(edit);

				node.array = this.dualInsert(node.array.length, key, value, node.array);
				node.length += 1;
			} else if (node.array[index + 1] !== value) {
				node.array[index + 1] = value;
			}
			return node;
		}

		// immutable put
		if (index !== -1) {
			if (node.array[index + 1] === value) { // value is same, do nothing
				return node;
			}
			return CollisionNode(edit, node.hash, (node.length + 1), this.aSetSafe(index + 1, value, node.array));
		}
		newArray = [...node.array, key, value];
		this.setLengthChanged(edit);
		return CollisionNode(edit, node.hash, node.length + 1, newArray);
	}

	, put(edit, shift, hash, key, value, node) {
		if (node.type === 'IndexedNode')
			return this._putIndexed(edit, shift, hash, key, value, node)
		else
			return this._putCollision(edit, shift, hash, key, value, node)
	}

	// = remove =================================================================================

	, _copyAndRemoveValue(edit, bit, node) {
		var index = (2 * this.fromBitmap(node.dataMap, bit));
		// var src = node.array;
		// var dst = new Array(src.length - 2);
		// this.aCopy(src, 0, dst, 0, index);
		// this.aCopy(src, index + 2, dst, index, (src.length - index - 2));

		var dst = this.dualRemove(index, node.array)

		return IndexedNode(edit, (node.dataMap ^ bit), node.nodeMap, dst);
	}

	, _copyAndMigrateToInline(edit, bit, newChild, node) {
		var array = node.array;
		var index = (array.length - 1 - this.fromBitmap(node.nodeMap, bit));
		var newIndex = (2 * this.fromBitmap(node.dataMap, bit));

		// var dst = new Array(array.length + 1);
		// this.aCopy(array, 0, dst, 0, newIndex);
		// dst[newIndex] = newChild.array[0];
		// dst[newIndex + 1] = newChild.array[1];
		// this.aCopy(array, newIndex, dst, (newIndex + 2), (index - newIndex));
		// this.aCopy(array, (index + 1), dst, (index + 2), (array.length - 1 - index));

		var dst = array
			.slice(0, newIndex)
			.concat(newChild.array.slice(0,2))
			.concat(array.slice(newIndex, index))
			.concat(array.slice(index + 1))

		return IndexedNode(edit, (node.dataMap | bit), (node.nodeMap ^ bit), dst);
	}
	, _removeIndexed(edit, shift, hash, key, node) {
		var index;
		var bit = this.bitpos(hash, shift);
		var { dataMap, nodeMap, array } = node

		if ((dataMap & bit) !== 0) {
			index = this.fromBitmap(dataMap, bit);

			// hash may be the same, but since we use a higher perf hashing... that doesn't mean it's really the same key
			if (key === array[2 * index]) {
				this.setLengthChanged(edit);

				if (this.popcount(dataMap) === 2 && (nodeMap === 0)) {
					// var arr = index == 0 ? [this.array[2], this.array[3]] : [this.array[0], this.array[1]];

					return IndexedNode(edit,
						(shift === 0 ? dataMap ^ bit : this.bitpos(hash, 0)),
						0, //nodeMap hash
						(index === 0 ? array.slice(2, 4) : array.slice(0, 2)));
				}
				return this._copyAndRemoveValue(edit, bit, node);
			}
			return node;
		}

		if ((nodeMap & bit) !== 0) {
			index = array.length - 1 - this.fromBitmap(nodeMap, bit);
			var child = array[index];
			var newChild = this.remove(edit, (shift + 5), hash, key, child);

			if (child !== newChild) {
				if (this.isSingle(newChild)) { // migrate to inline
					if (dataMap === 0 && this.popcount(nodeMap) === 1) {
						return newChild;
					}

					var newIndex = (2 * this.fromBitmap(dataMap, bit));

					return IndexedNode(edit
						, dataMap | bit
						, nodeMap ^ bit
						, array
							.slice(0, newIndex)
							.concat(newChild.array.slice(0,2))
							.concat(array.slice(newIndex, index))
							.concat(array.slice(index + 1)));
				}
				return this._copyAndSet(edit, index, newChild, node);
			}
		}

		return node;
	}

	, remove(edit, shift, hash, key, node): Node {
		if (node.type === 'IndexedNode')
			return this._removeIndexed(edit, shift, hash, key, node);

		var index = this._findMatchingKey(key);
		if (index === -1)
			return node;


		this.setLengthChanged(edit);
		switch (node.length) {
			case 1:
				return EMPTY;
			case 2:
				var array = node.array;
				var idx = (this.equals(key, array[0])) ? 2 : 0;
				return this.put(edit, 0, hash, array[idx], array[(idx + 1)], EMPTY);
			default:
				return CollisionNode(edit, hash, (node.length - 1), this.aRemovePair(node.array, (index / 2)));
		}

	}

	// = iterate =================================================================================

	, kvreduce(fn, seed: T, node: Node): T {
		const {array} = node

		if (node.type === 'IndexedNode') {
			var entryLen = (2 * this.popcount(node.dataMap));
			var nodeLen = entryLen + this.popcount(node.nodeMap);

			var i = 0;
			while (i < nodeLen) {
				if (i < entryLen) {
					seed = fn(seed, array[i], array[i + 1]);
					i = i + 2;
				} else {
					seed = this.kvreduce(fn, seed, array[i]);
					i = i + 1;
				}
			}
		} else { // Collision Node
			var len = (2 * this.length);

			var i = 0;
			while (i < len) {
				seed = fn(seed, array[i], array[i + 1]);
				i = i + 2;
			}
		}
		return seed;
	}
}


const EMPTY_ITERATOR = {
	next() {
		return {done: true}
	}
};

const EMPTY = IndexedNode(null, 0, 0, [])

export const Api = {
	empty() {
		return EMPTY;
	},

	put(key, value, node = EMPTY, transaction) {

		return NodeTrait.put(Transaction.reset(transaction), 0, hashMe(key), key, value, node)
	},

	remove(key, node, transaction) {
		if (!node) return this;

		return NodeTrait.remove(Transaction.reset(transaction), 0, hashMe(key), key, node);
	},

	get: NodeTrait.find.bind(NodeTrait),

	includes(key, node) {
		const NOT_FOUND = {}
		return NodeTrait.find(key, node) === NOT_FOUND
	},

	length(node) {
		return node.length
	},

	iterator(root, valueResolver) {
		valueResolver = valueResolver || ((key, value) => value);
		return (root && root.length) ? NodeIterator(root, valueResolver) : EMPTY_ITERATOR;
	},

	keyIterator(root) {
		return this.iterator(root, (key, value) => key);
	},

	entryIterator(root) {
		return this.iterator(root, (key, value) => MapEntry(key, value));
	},

	kvreduce: NodeTrait.kvreduce,

	//todo: pretty sure reduce should yield values only
	reduce(fn, seed, node) {
		return node.kvreduce((acc, key, value) =>
			fn(acc, MapEntry(key, value)), seed);
	}

	// keys: use reduce
	// values: use reduce
	// entries: use reduce
	// map: use reduce
	// filter: use reduce
	// pick: use reduce
	// merge
};
