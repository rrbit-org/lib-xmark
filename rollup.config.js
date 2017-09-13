import flow from 'rollup-plugin-flow';

export default {
	entry: 'src/index.js',
	format: 'cjs',
	plugins: [ flow({ all: true }) ],
	dest: 'perf/champ.js'
};