function padl(n, s) {
	while (s.length < n) {
		s += ' ';
	}
	return s;
}

function padr(n, s) {
	while (s.length < n) {
		s = ' ' + s;
	}
	return s;
}

module.exports = function runSuite(suite) {
	return suite
		.on('start', function() {
			console.log(this.name);
			console.log('-------------------------------------------------------');
		})
		.on('cycle', function logResults(e) {
			var t = e.target;


			if (t.failure) {
				console.error(padl(10, t.name) + 'FAILED: ' + e.target.failure);
			} else {
				var result = padl(24, t.name)
					+ padr(22, t.hz.toFixed(2) + ' op/s')
					+ ' \xb1' + padr(7, t.stats.rme.toFixed(2) + '%')
					+ padr(15, ' (' + t.stats.sample.length + ' samples)');

				console.log(result);
			}
		})
		.on('complete', function() {
			console.log('-------------------------------------------------------');
		})
		.on('error', function(e) {
			console.log(e)
		})
		.run();
};