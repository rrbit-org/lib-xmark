import {Api} from './champ';
import {hash as createHash} from './hash'

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
	const map = Api.empty();
	Api.put("foo", "bar", map)
});

test('test put', () => {
	const map = TEST_KEYS.reduce((map, word) => Api.put(word, word, map), Api.empty())
	// var map = Api.put('foo', 'fooVal', Api.empty())

	expect(map).toBeTruthy()
});

test('test get', () => {
	const map = TEST_KEYS.reduce((map, word) => Api.put(word, word, map), Api.empty())

	expect(Api.get('groak', map, NOT_FOUND)).toEqual('groak')

	TEST_KEYS.forEach(key => {
		expect(Api.get(key, map, NOT_FOUND)).toEqual(key)
	})
});


describe('test remove', () => {
	const map = TEST_KEYS.reduce((map, word) => Api.put(word, word, map), Api.empty())

	it('removes a single key', () => {

		const noGroak = Api.remove('groak', map)
		expect(Api.get('groak', noGroak, NOT_FOUND)).toEqual(NOT_FOUND)
	})


	it('removes immutably without affecting source', () => {

		TEST_KEYS.forEach(key => {
			expect(Api.get(key, map, NOT_FOUND)).toEqual(key)
		})
	})
});