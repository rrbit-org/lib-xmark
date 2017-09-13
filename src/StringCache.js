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