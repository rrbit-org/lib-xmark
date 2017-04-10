import {MapTrait as xmark} from './champ';

var TEST_KEYS = ('groak hugger-mugger crapulous grumpish snowbroth jargogle apricity twattle ' +
	'elflock gorgonize cockalorum snoutfair jollux curglaff brabble twitter-light ' +
	'lunting beef-witted monsterful callipgyian fuzzle quockerwodger resistentialism ' +
	'lethophobia slubberdegullio crumuring lumming bunbury scurrilous gallimaufry thrice').split(' ')

test('basic construction', () => {
	var map = xmark.empty();
	map = map.put("foo", "bar", map)
});

test('test put', () => {
	var map = TEST_KEYS.reduce((map, word) => xmark.put(word, word), xmark.empty())

	expect(map).toBeTruthy()
});

test('test get', () => {
	var map = TEST_KEYS.reduce((map, word) => xmark.put(word, word, map), xmark.empty())

	expect(xmark.get('groak', map, 'not Found ?')).toEqual('groak')
});


test('test remove', () => {
	var map = TEST_KEYS.reduce((map, word) => xmark.put(word, word, map), xmark.empty())

	map = xmark.remove('groak', map)
	expect(xmark.get('groak', map, 'not Found ?')).toEqual('not Found ?')
});