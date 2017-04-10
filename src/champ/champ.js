import {hash} from './hash'
import {NodeIterator} from './NodeIterator'

// = helpers ==============================================================================

// SameValue algorithm
const is = Object.is || ((x, y) =>
	( x === y ? (x !== 0 || 1 / x === 1 / y) : (x !== x && y !== y)))

function equiv(k1, k2) {
	if (k1 === null || k1 === undefined) return false;
	if(is(k1, k2)) return true;
	if(typeof k1.equals == 'function') return k1.equals(k2);
	return false;
}



// = array helpers =========================================================================

function arraycopy(src, srcPos, dest, destPos, length) {
	var i = 0;
	while (i < length) {
		dest[i+destPos] = src[i+srcPos];
		i += 1;
	}
	return dest;
}

function aClone(src) {
	var len = src.length;
	var dest = new Array(len);
	for (var i = 0; len > i; i++) {
		dest[i] = src[i];
	}
	return src;
}

function aInsertPair(index, key, value, src) {
	var dest = new Array(2 + src.length);

	arraycopy(src, 0, dest, 0, index);
	dest[index] = key;
	dest[index + 1] = value;
	arraycopy(src, index, dest, (2 + index), (src.length - index));
	return dest;
}

function aRemovePair(index, array) {
	var newArray = new Array(array.length - 2);
	arraycopy(array, 0, newArray, 0, 2 * index);
	arraycopy(array, 2 * (index + 1), newArray, 2 * index, newArray.length - 2 * index);
	return newArray;
}

function aSetSafe(i, value, src) {
	var dest = aClone(src);
	dest[i] = value;
	return dest;
}

function objSet(name, value, obj) {
	obj[name] = value;
	return obj;
}


/* Bit Ops
 ******************************************************************************/
/**
 Hamming weight. a.k.a popcount
 Taken from: http://jsperf.com/hamming-weight
 */
function popcount(v) {
	v = v - ((v >> 1) & 0x55555555);
	v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
	return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
}

function mask(hash, shift) {
	return (hash >>> shift) & 0x01f;
	// return (hash >>> shift) & 0b11111;
}

function bitpos(hash, shift) {
	return 1 << mask(hash, shift);
}

function toBitmap(x) {
	return 1 << x;
}

function fromBitmap(bitmap, bit) {
	return popcount(bitmap & (bit - 1));
}

const bitmapNodeIndex = fromBitmap


// = transience ===========================================================================


/**
 * lightweight change tracking ferry for parent/child messaging
 * also used to indicate ownership, while minimizing memory leaks(vs using parent directly, which prevents GC)
 */
class Transaction {
	static reset(transaction) {
		if (!ttransactionr) return;
		if (transaction.isLengthDifferent) {
			delete transaction.isLengthDifferent
		}
		return transaction
	}
	static isAllowedToEdit(node, transaction)
	{
		return node && transaction === node;
	}

	static setLengthChanged(transaction)
	{
		this.isLengthDifferent = true;
		return transaction;
	}


}
// = class ==============================================================================


function MapEntry(key, value) {
	if (!(this instanceof MapEntry))
		return new MapEntry(key, value);

	this.key = key;
	this.value = value;
// 	var arr = new Array(2);
// 	arr[0] = key;
// 	arr[1] = value;
}



/**
 *
 * Node types:
 * IndexedNode
 * CollisionNode - multiple keys but 1 value
 * ArrayNode - internal node containing many children
 * LeafNode - a single value
 */






class IndexedNode<K, V> {

	constructor(owner, dataMap: number, nodeMap: number, array: Array) {
		this.nodeMap = nodeMap;
		this.dataMap = dataMap;
		this.array = array;
		this.edit = owner;
	}

	// useful when attempting to squash
	isSingle() {
		return (popcount(this.dataMap) == 2) && (this.nodeMap == 0)
	}

	_copyAndSet(edit, idx, val) {
		if (edit.isAllowedToEdit(this.edit)) {
			this.array[idx] = val;
			return this;
		} else {

			return new IndexedNode(edit, this.dataMap, this.nodeMap, aSetSafe(idx, val, this.array));
		}
	}

	_mergeTwoKeyValuePairs(edit, shift, current_hash, current_key, current_val, hash, key, val) {
		if ((32 < shift) && (current_hash == hash)) {
			return new CollisionNode(edit, current_hash, 2, [current_key, current_val, key, val]);
		}
		var current_mask = mask(current_hash, shift);
		var _mask = mask(hash, shift);

		if (current_mask == _mask) {
			var new_node = this._mergeTwoKeyValuePairs(edit, (shift + 5), current_hash, current_key, current_val, hash, key, val);
			return new IndexedNode(edit, 0, bitpos(current_hash, shift), [new_node]);
		}

		var arr = current_mask < _mask ? [current_key, current_val, key, val] : [key, val, current_key, current_val];
		return new IndexedNode(edit, (bitpos(current_hash, shift) | bitpos(hash, shift)), 0, arr);
	}

	_copyAndMigrateToNode(edit, bit, node) {
		var array = this.array;
		var idx_old = (2 * bitmapNodeIndex(this.dataMap, bit));
		var idx_new = (array.length - 2 - bitmapNodeIndex(this.nodeMap, bit));
		var dst = new Array(array.length - 1);

		arraycopy(array, 0, dst, 0, idx_old);
		arraycopy(array, (2 + idx_old), dst, idx_old, (idx_new - idx_old));
		dst[idx_new] = node;
		arraycopy(array, (2 + idx_new), dst, (idx_new + 1), (array.length - 2 - idx_new));

		return new IndexedNode(edit, (this.dataMap ^ bit), (this.nodeMap | bit), dst);
	}

	find(shift, hash, key, notFound) {
		var bit = bitpos(hash, shift);

		if ((this.dataMap & bit) != 0) {
			var idx = bitmapNodeIndex(this.dataMap, bit);
			var current_key = this.array[(2 * idx)];

			if (current_key == key) {
				return this.array[((2 * idx) + 1)];
			} else {
				return notFound;
			}
		} else if ((this.nodeMap & bit) != 0) {
			return (this.array[this.array.length - 1 - bitmapNodeIndex(this.nodeMap, bit)]).find((shift + 5), hash, key, notFound);
		} else {
			return notFound;
		}
	}

	put(edit, shift, hash, key, val) {
		var bit = bitpos(hash, shift);

		if ((this.dataMap & bit) != 0) { // is existing key/value
			var idx = bitmapNodeIndex(this.dataMap, bit);
			var current_key = this.array[(2 * idx)];

			if (key == current_key) {
				//todo: mutated but not tracked???
				return this._copyAndSet(((2 * idx) + 1), val);
			}

			var current_val = this.array[(2 * idx) + 1];
			var new_node = this._mergeTwoKeyValuePairs((shift + 5), hash(current_key), current_key, current_val, hash, key, val);
			edit.setLengthChanged();

			return this._copyAndMigrateToNode(bit, new_node);

		} else if ((this.nodeMap & bit) != 0) { // is in existing child node
			var index = this.array.length - 1 - bitmapNodeIndex(this.nodeMap, bit);
			var child = this.array[index];
			var newNode = child.put(edit, (shift + 5), hash, key, val);

			if (child == newNode) {
				return this;
			}
			return this._copyAndSet(edit, index, newNode);

		}

		// does not exist, insert as new key/value
		return new IndexedNode(edit.setLengthChanged(),
								(this.dataMap | bit),
								this.nodeMap,
								aInsertPair((2 * bitmapNodeIndex(this.dataMap, bit)), key, val, this.array));
	}

	_copyAndRemoveValue(edit, bit) {
		var index = (2 * bitmapNodeIndex(this.dataMap, bit));
		var src = this.array;
		var dst = new Array(src.length - 2);
		arraycopy(src, 0, dst, 0, index);
		arraycopy(src, index + 2, dst, index, (src.length - index - 2));

		return new IndexedNode(edit, (this.dataMap ^ bit), this.nodeMap, dst);
	}

	_copyAndMigrateToInline(edit, bit, node) {
		var src = this.array;
		var index = (src.length - 1 - bitmapNodeIndex(this.nodeMap, bit));
		var newIndex = (2 * bitmapNodeIndex(this.dataMap, bit));
		var dst = new Array(src.length + 1);

		arraycopy(src, 0, dst, 0, newIndex);
		dst[newIndex] = node.array[0];
		dst[newIndex + 1] = node.array[1];
		arraycopy(src, newIndex, dst, (newIndex + 2), (index - newIndex));
		arraycopy(src, (index + 1), dst, (index + 2), (src.length - 1 - index));

		return new IndexedNode(edit, (this.dataMap | bit), (this.nodeMap ^ bit), dst);
	}

	remove(edit, shift, hash, key) {
		var bit = bitpos(hash, shift);
		var dataMap = this.dataMap;
		var nodeMap = this.nodeMap;

		if ((dataMap & bit) != 0) {
			var index = bitmapNodeIndex(dataMap, bit);
			var array = this.array;

			// hash may be the same, but since we use a higher perf hashing... that doesn't mean it's really the same key
			if (key == array[2 * index]) {
				edit.setLengthChanged();

				if (popcount(dataMap) == 2 && (nodeMap == 0)) {
					// var arr = index == 0 ? [this.array[2], this.array[3]] : [this.array[0], this.array[1]];

					return new IndexedNode(edit,
											(shift == 0 ? dataMap ^ bit : bitpos(hash, 0)),
											0, //nodeMap hash
											(index == 0 ? array.slice(2,4) : array.slice(0,2)));
				}
				return this._copyAndRemoveValue(edit, bit);
			}
			return this;
		}

		if ((nodeMap & bit) != 0) {
			var index = this.array.length - 1 - bitmapNodeIndex(this.nodeMap, bit);
			var child = this.array[index];
			var newNode = child.remove(edit, (shift + 5), hash, key);

			if (child != newNode) {
				if (newNode.isSingle()) {
					if (dataMap == 0 && popcount(nodeMap) == 1) {
						return newNode;
					}
					return this._copyAndMigrateToInline(edit, bit, newNode);
				}
				return this._copyAndSet(edit, index, newNode);
			}
		}

		return this;
	}

	kvreduce(fn, seed) {
		var array = this.array;
		var entryLen = (2 * popcount(this.dataMap));
		var nodeLen = entryLen + popcount(this.nodeMap);

		var i = 0;
		while (i < nodeLen) {
			if (i < entryLen) {
				seed = fn(seed, array[i], array[i + 1]);
				i = i + 2;
			} else {
				seed = array[i].kvreduce(fn, seed);
				i = i + 1;
			}
		}
		return seed;
	}
}

IndexedNode.EMPTY = new IndexedNode(null, 0, 0, []);



class CollisionNode<K, V> {
	constructor(owner: Transaction, hash: number, length: number, array: Array) {
		this.hash = hash;
		this.length = length;
		this.array = array;
		this.edit = owner;
	}

	isSingle() {
		return this.length === 1;
	}

	find(shift, hash, key, notFound) {
		var index = this.findIndex(key);
		if(index !== -1 && equiv(key, this.array[index])) {
			return this.array[index + 1];
		}
		return notFound;
	}

	findIndex(key) {
		var len = this.length;
		var arr = this.array;
		for (var i = 0; i < len; i += 2) {
			if (equiv(key, arr[i])) {
				return i;
			}
		}
		return -1;
	}

	_put(index, key, value, edit) {
		var newArray;
		if (index !== -1 ) {
			if(this.array[index + 1] == value) { // value is same, do nothing
				return this;
			}

			return new CollisionNode(edit, this.hash, (this.length + 1), aSetSafe(index + 1, value, this.array));
		}
		newArray = aClone(this.array);
		newArray.push(key);
		newArray.push(value);
		edit.setLengthChanged();
		return new CollisionNode(edit, this.hash, this.length + 1, newArray);
	}

	_putǃ(index, key, value, edit) {
		if(index == -1) {
			edit.setLengthChanged();
			var newArray = aClone(this.array);
			newArray.push(key);
			newArray.push(value);

			this.array = newArray;
			this.length += 1;
		} else if(this.array[index + 1] != value) {
			this.array[index + 1] = value;
		}
		return this;
	}

	put(edit, shift, hash, key, val) {
		var index = this.findIndex(key);
		if (edit.isAllowedToEdit(this.edit)) { // todo: don't auto mutate
			return this._putǃ(index, key, val, edit);
		} else {
			return this._put(index, key, val, edit);
		}
	}

	remove(edit, shift, hash, key) {
		var index = this.findIndex(key);
		if (index != -1) {
			edit.setLengthChanged();
			switch (this.length) {
				case 1:
					return IndexedNode.EMPTY;
				case 2:
					var hash_idx = (equiv(key, this.array[0])) ? 2 : 0;
					return IndexedNode.EMPTY.put(edit, 0, hash, this.array[hash_idx], this.array[(hash_idx + 1)], edit);
				default:
					return new CollisionNode(edit, hash, (this.length - 1), aRemovePair(this.array, (index / 2)));
			}
		}
		return this;
	}

	kvreduce(fn, seed) {
		var array = this.array;
		var len = (2 * this.length);

		var i = 0;
		while (i < len) {
			seed = fn(seed, array[i], array[i + 1]);
			i = i + 2;
		}
		return seed;
	}
}

const EMPTY_ITERATOR = {
	next() {
		return { done: true }
	}
};



export const MapTrait = {
	empty() {
		return IndexedNode.EMPTY;
	},

	put(key, value, node, transaction) {
		return (node || IndexedNode.EMPTY).put(Transaction.reset(transaction), 0, hash(key), value)
	},

	remove(key, node, transaction) {
		if (!this.root) return this;

		return node.remove(Transaction.reset(transaction), 0, hash(key), key);
	},

	get(key, node, notFound) {
		return node.find(0, hash(key), key, notFound);
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

	kvreduce(fn, seed, node) {
		return node.kvreduce(fn, seed)
	},

	reduce(fn, seed, node) {
		return node.kvreduce((acc, key, value) =>
			fn(acc, MapEntry(key, value)), seed);
	}
};
