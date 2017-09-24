import {Map} from './champ';

var TEST_KEYS = [
	'groak',
	'hugger-mugger',
	'crapulous',
	'grumpish',
	'snowbroth',
	'jargogle',
	'apricity',
	'twattle',
	'elflock',
	'gorgonize',
	'cockalorum',
	'snoutfair',
	'jollux',
	'curglaff',
	'brabble',
	'twitter-light',
	'lunting',
	'beef-witted',
	'monsterful',
	'callipgyian',
	'fuzzle',
	'quockerwodger',
	'resistentialism',
	'lethophobia',
	'slubberdegullio',
	'crumuring',
	'lumming',
	'bunbury',
	'scurrilous',
	'gallimaufry',
	'thrice'
]

const NOT_FOUND = 'Not Found?'

// test('hashing', function() {
//
// 	TEST_KEYS.forEach(key =>
// 		expect(createHash(key)).toEqual(''))
// })

test('basic construction', () => {
	const map = Map.empty();
	Map.put("foo", "bar", map)
});

test('test put', () => {
	const map = TEST_KEYS.reduce((map, word) => Map.put(word, word, map), Map.empty())
	// var map = Map.put('foo', 'fooVal', Map.empty())

	expect(map).toBeTruthy()
});

test('test lookup', () => {
	const map = TEST_KEYS.reduce((map, word) => Map.put(word, word, map), Map.empty())

	expect(Map.lookup('groak', map, NOT_FOUND)).toEqual('groak')

	TEST_KEYS.forEach(key => {
		expect(Map.lookup(key, map, NOT_FOUND)).toEqual(key)
	})
});

describe('large maps', function() {
	var SIZE = 32768
	var map;

	it('test put', function() {
		var _map = Map.empty()
		for (var i = 0, s = SIZE; s > i; i++) {
			_map = Map.put('_key:' + i, '_value:' + i, _map)
		}
		map = _map
	})

	it('test lookup', function() {

		for (var i = 0, s = SIZE; s > i; i++) {
			expect(Map.lookup('_key:' + i, map, NOT_FOUND)).toEqual('_value:' + i)
		}
	})
})


describe('test remove', () => {
	const map = TEST_KEYS.reduce((map, word) => Map.put(word, word, map), Map.empty())

	it('removes a single key', () => {

		const noGroak = Map.remove('groak', map)
		expect(Map.lookup('groak', noGroak, NOT_FOUND)).toEqual(NOT_FOUND)
	})


	it('removes immutably without affecting source', () => {

		TEST_KEYS.forEach(key => {
			expect(Map.lookup(key, map, NOT_FOUND)).toEqual(key)
		})
	})
});