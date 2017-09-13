// @flow
import { hash as createHash } from './hash'
// import {NodeIterator} from './NodeIterator'

// = flow types ==============================================================================

type TransactionInstance = { isLengthDifferent: boolean }
type Transaction = ?TransactionInstance;


type CollisionNodeType = {
	edit: Transaction,
	data: Array<MapEntry>,
	type: string,
	hash: number
}

type IndexedNodeType = {
	edit: Transaction,
	data: Array<MapEntry | NodeType | Node>,
	type: string,
	dataMap: number,
	nodeMap: number
}

type NodeType = IndexedNodeType | CollisionNodeType

// = helpers ==============================================================================

// SameValue algorithm
// const is = Object.is || ((x, y) =>
// 	( x === y ? (x !== 0 || 1 / x === 1 / y) : (x !== x && y !== y)))

function equals(k1: any, k2: any): boolean {
	if (k1 === null || k1 === undefined) return false;
	if (k1 === k2) return true;
	if (typeof k1.equals === 'function') return k1.equals(k2);
	return false;
}

// = array helpers =========================================================================

const Arrays = {

	aCopy(src: Array<any>, srcPos: number, dest: Array<any>, destPos: number, length: number): Array<any> {
		var i = 0;
		while (i < length) {
			dest[i + destPos] = src[i + srcPos];
			i += 1;
		}
		return dest;
	}

	, aClone(list: Array<any>): Array<any> {
		var len = list.length;
		var copy = new Array(len);
		for (var i = 0; len > i; i++) {
			copy[i] = list[i];
		}
		return copy;
	}

	, aRemove(index, list: Array<any>): Array<any> {
		var copy = new Array(list.length - 1);
		this.aCopy(list, 0, copy, 0, index);
		this.aCopy(list, index + 1, copy, index, copy.length - index);
		return copy;
	}

	, aUpdate(i: number, value: T, list: Array<T>): Array<T> {
		var copy = this.aClone(list);
		copy[i] = value;
		return copy;
	}

	, aInsert(index, value: T, list: Array<T>): Array<T> {
		var dest = new Array(1 + list.length);

		this.aCopy(list, 0, dest, 0, index);
		dest[index] = value;
		this.aCopy(list, index, dest, (1 + index), (list.length - index));
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
	popcount(v: number): number {
		v = v - ((v >> 1) & 0x55555555);
		v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
		return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
	}

	, hashFragment(bitmap: number, bit: number): number {
		return this.popcount(bitmap & (bit - 1));
	}

	, toBitmap(x: number): number {
		return 1 << x;
	}

	, mask(hash: number, shift: number): number {
		return (hash >>> shift) & 0x01f;
	}

	, bitpos(hash: number, shift: number): number {
		return 1 << ((hash >>> shift) & 0x01f);
	}
}


// = transience ===========================================================================

/**
 * lightweight change tracking ferry for parent/child messaging
 * also used to indicate ownership, while minimizing memory leaks(vs using parent directly, which prevents GC)
 */
const Transactions = {
	reset(transaction: Transaction): Transaction {
		if (!transaction) return;

		delete transaction.isLengthDifferent;

		return transaction
	}

	, isAllowedToEdit(nodeOwner: Transaction, transaction: Transaction): boolean {
		return nodeOwner && transaction === nodeOwner;
	}

	, setLengthChanged(transaction: Transaction): Transaction {
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
function Node(type, owner?, data: Array<MapEntry>, hash: number, altHash?: number) {
	this.edit = owner;
	this.data = data;
	this.type = type;

	if (type === 'IndexedNode') {
		this.dataMap = hash;
		this.nodeMap = altHash;
	} else { // CollisionNode
		this.hash = hash
		// this.length = length
	}
}

function IndexedNode(owner, dataMap: number, nodeMap: number, items: Array<MapEntry>): IndexedNodeType {
	return new Node('IndexedNode', owner, items, dataMap, nodeMap)
}

function CollisionNode(owner, hash, items: Array<MapEntry>): CollisionNodeType {
	return new Node('CollisionNode', owner, items, hash, null)
}


const NodeTrait = {
	equals
	, createHash
	// , ...Arrays
	// , ...Transactions
	// , ...Bitwise

	// useful when attempting to squash
	, isSingle(node: NodeType) {
		if (node.type === 'CollisionNode')
			return node.data.length === 1;
		return (this.popcount(node.dataMap) === 1) && (node.nodeMap === 0)
	}

	// = get value  =================================================================================

	, lookup(key, node, notFound) {
		var bit = 0,
			shift = 0,
			nodeMap = 0,
			dataMap = 0,
			hash = createHash(key),
			data,
			entry;

		while (node) {
			data = node.data

			if (node.type === 'CollisionNode') {
				return this._lookupCollision(key, data, notFound)
			}

			nodeMap = node.nodeMap
			dataMap = node.dataMap
			// IndexedNode
			bit = 1 << ((hash >>> shift) & 0x01f)

			if ((dataMap & bit)) { // if in this node's data

				entry = data[this.hashFragment(dataMap, bit)];
				return key === entry.key ? entry.value : notFound;
			}

			if (!(nodeMap & bit)) {
				return notFound
			}
			node = data[data.length - 1 - this.hashFragment(nodeMap, bit)]
			shift += 5
		}
		return notFound
	}
	, _lookupCollision(key, entries, notFound) {
		for (var i = 0, len = entries.length; len > i; i++) {
			var entry = entries[i]
			if (key === entry.key)
				return entry.value;
		}
		return notFound
	}

	, find(key, node: NodeType, notFound?) {
		if (!node) return notFound;

		return this._findRecurse(0, createHash(key), key, node, notFound);
	}

	, _findRecurse(shift: number, hash: number, key: any, node: NodeType, notFound?) {
		var data = node.data
			, entry;

		if (node.type === 'CollisionNode') {
			for (var i = 0, len = data.length; len > i; i += 1) {
				entry = data[i]
				if (this.equals(key, entry.key))
					return entry.value
			}
			return notFound
		}

		// - IndexedNode ------------------------

		var bit = this.bitpos(hash, shift);

		if ((node.dataMap & bit) !== 0) { // if in this node's data

			var entry = data[this.hashFragment(node.dataMap, bit)];
			return key === entry.key ? entry.value : notFound;
		}

		if ((node.nodeMap & bit) === 0) // if not in a child node
			return notFound


		return this._findRecurse((shift + 5)
			, hash
			, key
			, data[data.length - 1 - this.hashFragment(node.nodeMap, bit)]
			, notFound);
	}

	// = update/append =================================================================================

	, _findMatchingKey(key: any, collisionNode: NodeType) {
		var { data } = collisionNode
		for (var i = 0, len = data.length; len > i; i++) {
			if (this.equals(key, data[i].key)) {
				return i;
			}
		}
		return -1;
	}

	, _updateValue(idx: number, value: any, node: NodeType, edit: Transaction): Node {
		if (this.isAllowedToEdit(node.edit, edit)) {
			node.data[idx] = value;
			return node;
		}
		return IndexedNode(edit, node.dataMap, node.nodeMap, this.aUpdate(idx, value, node.data));
	}

	, _copyAndMigrateToNode(edit: Transaction, bit: number, child: NodeType, node: IndexedNodeType): Node {
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

	, _mergeTwoEntries(edit: Transaction, shift: number, oldHash: number, oldEntry: MapEntry, hash: number, entry: MapEntry): Node {
		if ((32 < shift) && (oldHash === hash)) {
			return CollisionNode(edit, oldHash, [oldEntry, entry]);
		}
		var oldMask = this.mask(oldHash, shift)
			, mask = this.mask(hash, shift);

		if (oldMask === mask) {
			return IndexedNode(edit
				, 0
				, this.bitpos(oldHash, shift)
				, [this._mergeTwoEntries(edit
					, (shift + 5)
					, oldHash
					, oldEntry
					, hash
					, entry)]);
		}

		return IndexedNode(edit
			, (this.bitpos(oldHash, shift) | this.bitpos(hash, shift))
			, 0
			, oldMask < mask ? [oldEntry, entry] : [entry, oldEntry]);
	}

	, _IndexedPut(shift, hash, entry: MapEntry, node: IndexedNodeType, edit: Transaction): Node {
		var bit = this.bitpos(hash, shift);
		var { data, nodeMap, dataMap } = node;

		if ((dataMap & bit) !== 0) { // is existing key/value
			var idx = this.hashFragment(dataMap, bit);
			var existingEntry = data[idx];

			if (entry.key === existingEntry.key) {
				return this._updateValue(idx + 1, entry, node, edit);
			}

			var newChild = this._mergeTwoEntries(edit
				, (shift + 5)
				, createHash(existingEntry.key)
				, existingEntry
				, hash
				, entry);

			return this._copyAndMigrateToNode(this.setLengthChanged(edit)
				, bit
				, newChild
				, node);

		} else if ((nodeMap & bit) !== 0) { // is in existing child node
			var index = data.length - 1 - this.hashFragment(nodeMap, bit);
			var child = data[index];
			var newChild = this.put(shift + 5, hash, entry, child, edit);

			return child === newChild ? node : this._updateValue(index, newChild, node, edit);
		}

		// does not exist, insert as new key/value
		return IndexedNode(this.setLengthChanged(edit)
			, (dataMap | bit)
			, nodeMap
			, this.aInsert(this.hashFragment(dataMap, bit), entry, data));
	}

	, _CollisionPut(shift: number, hash: number, entry: MapEntry, node: CollisionNodeType, edit: Transaction): CollisionNodeType {
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

	, put(shift, hash, entry: MapEntry, node: NodeType, edit: Transaction): Node {
		if (node.type === 'CollisionNode')
			return this._CollisionPut(shift, hash, entry, (node: CollisionNodeType), edit)

		return this._IndexedPut(shift, hash, entry, (node: IndexedNodeType), edit)
	}

	// = remove =================================================================================

	, _IndexedRemove(shift: number, hash: number, key: any, node: IndexedNodeType, edit: Transaction): IndexedNodeType {
		//TODO: convert to entries
		var index: number;
		var bit = this.bitpos(hash, shift);
		var { dataMap, nodeMap, data } = node

		if ((dataMap & bit) !== 0) {
			index = this.hashFragment(dataMap, bit);

			// hash may be the same, but since we use a higher perf hashing... that doesn't mean it's really the same key
			if (key === data[index].key) {
				this.setLengthChanged(edit);

				if (this.popcount(dataMap) === 1 && (nodeMap === 0)) {

					return IndexedNode(edit, (shift === 0 ? dataMap ^ bit : this.bitpos(hash, 0)), 0, [data[1 ^ index]]);
				}
				return IndexedNode(edit, dataMap ^ bit, nodeMap, this.aRemove(index, data));
			}
			//no matching key
			return node;
		}

		if ((nodeMap & bit) !== 0) {
			index = data.length - 1 - this.hashFragment(nodeMap, bit);
			var child: NodeType = data[index];
			var newChild = this.remove(shift + 5, hash, key, child, edit);

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

	, remove(shift: number, hash: number, key: any, node: NodeType, edit?): Node {
		if (node.type === 'IndexedNode')
			return this._IndexedRemove(shift, hash, key, (node: IndexedNodeType), edit);

		// Collision Node
		var index = this._findMatchingKey(key, (node: CollisionNodeType));
		if (index === -1)
			return node;

		var data = node.data;
		this.setLengthChanged(edit);
		switch (data.length) {
			case 1:
				return EMPTY;
			case 2:
				// if there will only be one child, squash to an IndexedNode
				return this.put(0, hash, data[1 ^ index], EMPTY, edit);
			default:
				return CollisionNode(edit, hash, this.aRemove(index, data));
		}
	}

	// = iterate =================================================================================

	, kvreduce(fn: Function, seed: T, node: NodeType): T {
		var data = node.data

		if (node.type === 'IndexedNode') {
			var entryLen = this.popcount((node: IndexedNode).dataMap);
			var nodeLen = entryLen + this.popcount((node: IndexedNode).nodeMap);

			var i = 0;
			while (i < nodeLen) {
				if (i < entryLen) {
					seed = fn(seed, (data[i]: MapEntry));
					i = i + 1;
				} else {
					seed = this.kvreduce(fn, seed, (data[i]: NodeType));
					i = i + 1;
				}
			}
		} else { // Collision Node
			var len = data.length;

			var i = 0;
			while (i < len) {
				seed = fn(seed, (data[i]: MapEntry));
				i = i + 2;
			}
		}
		return seed;
	}
}
Object.assign(NodeTrait, Bitwise)
Object.assign(NodeTrait, Transactions)
Object.assign(NodeTrait, Arrays)


const EMPTY_ITERATOR = {
	next() {
		return { done: true }
	}
};

const EMPTY = IndexedNode(null, 0, 0, [])

export const Api = {
	empty(): IndexedNodeType {
		return EMPTY;
	}

	, put(key: any, value: any, node: NodeType = EMPTY, transaction: Transaction) {

		return NodeTrait.put(0, createHash(key), new MapEntry(key, value), node, Transactions.reset(transaction))
	}

	, remove(key: any, node: NodeType, transaction?: Transaction) {

		return NodeTrait.remove(0, createHash(key), key, node, Transactions.reset(transaction));
	}


	, lookup: NodeTrait.lookup.bind(NodeTrait)

	, includes(key: any, node: NodeType): boolean {
		const NOT_FOUND = {}
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
	, reduce(fn: Function, seed: T, node: NodeType): T {
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
