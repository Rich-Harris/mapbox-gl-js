import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';

export default {
	entry: 'js/mapbox-gl.js',
	dest: 'dist/mapbox-gl-dev.js',
	plugins: [
		json(),
		commonjs(),
		nodeResolve({
			main: true,
			preferBuiltins: false
		})
	],
	format: 'umd',
	moduleName: 'mapboxgl'
};
