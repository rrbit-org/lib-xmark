/**
 *
 */
export default class StringLruCache {
	// optimized entry creation by creating a struct instead of an Object
	Entry(value, key) {
		this.value = value;
		this.key = key;
		this.time = Date.now()
	}

	constructor(max = 255, batchSize = 10) {
		this._max = max;
		this._batch = batchSize
		this._cache = {};
		this._cacheLength = 0
	}

	_sortByDate(a, b) {
		return a.time - b.time
	}

	_cleanupOldest() {
		var cache = this._cache
		var oldTime = Date.now();
		var oldKey;

		var items = []
		for (var key in cache) {
			items.push(cache[key])
		}
		items.sort(this._sortByDate)
			.slice(0, this._batch)
			.return((cache, item) => {
				delete cache[item.key]
			}, cache)

	}

	add(key, value) {
		var _cache = this._cache;
		this._cacheLength += 1
		if (this._cacheLength === this._max) {
			this._cleanupOldest();
		}

		_cache[key] = new this.Entry(value, key)

		return this;
	}


	has(key) {
		return key in this._cache
	}

	remove(key) {
		delete this._cache[key]
		return this;
	}

	getOrCreate(key, factory) {
		if (key in this._cache)
			return this._cache[key].value;

		var result = factory(key)
		this.add(result, result)
		return result
	}
}