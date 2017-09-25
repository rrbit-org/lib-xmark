var runSuite = require('./runSuite'),
	Benchmark = require("benchmark"),
	mori = require("mori"),
	Immutable = require("immutable"),
	Faucett = require("@nathanfaucett/immutable-hash_map"),
	hamt = require('hamt'),
	CollectableMap = require('@collectable/map'),
	champ = require('./champ'),
	Inline = champ.Inline,
	Entry = champ.Entry,
	supaHamt = champ.Hamt

;




// var SIZE = 8
// var SIZE = 16
// var SIZE = 32
var SIZE = 128
// var SIZE = 1024
// var SIZE = 32768

var data = {
	fb: (function() {
		var map = Immutable.Map()
		for (var i = 0; SIZE > i; i++)
			map = map.set('key' + i, 'val' + i)

		return map
	} ()),
	faucett: (function() {
		var map = Faucett.EMPTY
		for (var i = 0; SIZE > i; i++)
			map = map.set('key' + i, 'val' + i)
		return map
	}()),
	mori: (function() {
		var map = mori.hashMap(0,0)
		for (var i = 1; SIZE > i; i++)
			map = mori.assoc(map,'key' + i, 'val' + i)
		return map
	}()),
	hamt: (function() {
		var map = hamt.empty
		for (var i = 0; SIZE > i; i++)
			map = map.set('key' + i, 'val' + i)
		return map
	}()),
	shamt: (function() {
		var map = supaHamt.empty
		for (var i = 0; SIZE > i; i++)
			map = map.set('key' + i, 'val' + i)
		return map
	}()),
	collectable: (function() {
		var map = CollectableMap.empty()
		for (var i = 0; SIZE > i; i++)
			map = CollectableMap.set('key' + i, 'val' + i, map)
		return map
	}()),
	champ_in: (function() {
		var map = Inline.empty()
		for (var i = 0; SIZE > i; i++)
			map = Inline.put('key' + i, 'val' + i, map)
		return map
	}()),
	champ_en: (function() {
		var map = Entry.empty()
		for (var i = 0; SIZE > i; i++)
			map = Entry.put('key' + i, 'val' + i, map)
		return map
	}()),
	native:(function() {
		var map = {}
		for (var i = 0; SIZE > i; i++)
			map['key' + i] = 'val' + i
		return map
	}()),
	Map: (function() {
		var map = new Map()
		for (var i = 0; SIZE > i; i++)
			map.set('key' + i, 'val' + i)
		return map
	}()),
}

var suite = new Benchmark.Suite('compare lookup performance');

suite.add('immutable-js', function() {
	for (var i = 0; SIZE > i; i++)
		var value = data.fb.get('key' + i)
})


// suite.add('mori', function() {
// 	for (var i = 0; SIZE > i; i++)
// 		 var value = mori.get('key' + i, data.mori)
// })

suite.add('hamt', function() {
	for (var i = 0; SIZE > i; i++)
		 var value = data.hamt.get('key' + i)
})

suite.add('collectable', function() {
	for (var i = 0; SIZE > i; i++)
		 var value = CollectableMap.get('key' + i, data.collectable)
})

suite.add('champ:inline', function() {
	var map = data.champ_in
	for (var i = 0; SIZE > i; i++)
		 var value = map.get('key' + i)
})

suite.add('champ:entry', function() {
	var map = data.champ_en
	for (var i = 0; SIZE > i; i++)
		 var value = Entry.lookup('key' + i, map)
})

suite.add('champ:hamt', function() {
	var map = data.hamt
	for (var i = 0; SIZE > i; i++)
		 var value = map.get('key' + i)
})

suite.add('js object', function() {
	for (var i = 0; SIZE > i; i++)
		 var value = data.native['key' + i]
})

suite.add('native Map', function() {
	for (var i = 0; SIZE > i; i++)
		 var value = data.Map.get('key' + i)
})

suite.add('faucett', function() {
	for (var i = 0; SIZE > i; i++)
		 var value = data.faucett.get('key' + i)
})
runSuite(suite)