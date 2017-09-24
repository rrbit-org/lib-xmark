// @flow

function Entry(value: any, key: string) {
	this.value = value;
	this.key = key;
	this.time = Date.now()
}

/**
 *
 */
export default class StringLruCache {
	_max: number
	_batch: number
	_cache: Object
	_cacheLength: number

	// optimized entry creation by creating a struct instead of an Object

	constructor(max:number = 255, batchSize:number = 10) {
		this._max = max;
		this._batch = batchSize
		this._cache = {};
		this._cacheLength = 0
	}

	_sortByDate(a: any, b: any) {
		return a.time - b.time
	}

	_cleanupOldest() {
		var cache = this._cache
		var oldTime = Date.now();
		var oldKey;

		var items:Array<Entry> = []
		for (var key in cache) {
			items.push(cache[key])
		}
		items.sort(this._sortByDate)
			.slice(0, this._batch)
			.reduce((cache, item) => {
				delete cache[item.key]
				return cache
			}, cache)

	}

	add(key: string, value: any) {
		var _cache = this._cache;
		this._cacheLength += 1
		if (this._cacheLength === this._max) {
			this._cleanupOldest();
		}

		_cache[key] = new this.Entry(value, key)

		return this;
	}


	has(key: string): boolean {
		return key in this._cache
	}

	remove(key: string) {
		delete this._cache[key]
		return this;
	}

	getOrCreate(key: string, factory: Function) {
		if (key in this._cache)
			return this._cache[key].value;

		var result = factory(key)
		this.add(key, result)
		return result
	}
}

StringLruCache.prototype.Entry = Entry

export class StringCache {
	constructor(max = 255) {
		this.size = 0
		this.max = max
		this.prev = Object.create(null)
		this.cache = Object.create(null)
	}

	_update(key, value) {
		this.cache[key] = value
		this.size ++
		if(this.size >= this.max) {
			this.size = 0
			this.prev = this.cache
			this.cache = Object.create(null)
		}
		return value;
	}

	has(key) {
		return this.cache[key] !== undefined || this.prev !== undefined
	}

	remove (key) {
		if(this.cache[key] !== undefined)
			this.cache[key] = undefined
		if(this.prev[key] !== undefined)
			this.prev[key] = undefined
	}

	getOrCreate(key, factory) {
		var value = this.cache[key]
		if (value !== undefined)
			return value;
		if ((value = this.prev[key]) !== undefined)
			return this._update(key, value)

		return this._update(key, factory(key))
	}
}