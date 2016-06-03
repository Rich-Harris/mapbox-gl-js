import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';

const EMPTY = '__empty__';

var nodeResolveInstance = nodeResolve({
	main: true,
	preferBuiltins: false
});

export default {
	entry: 'js/mapbox-gl.js',
	dest: 'dist/mapbox-gl-dev.js',
	plugins: [
		json(),
		commonjs(),

		// handle zlib-backport nonsense
		{
			resolveId: importee => importee === 'node-zlib-backport' ? EMPTY : null,
			load: id => id === EMPTY ? `export default {};` : null
		},

		// {
		// 	resolveId: ( importee, importer ) => {
		// 		var resolved = nodeResolveInstance.resolveId( importee, importer );
		// 		if ( resolved ) console.log( 'importee, importer', importee, importer );
		// 		return resolved;
		// 	}
		// },

		nodeResolve({
			main: true,
			preferBuiltins: false
		})
	],
	format: 'umd',
	moduleName: 'mapboxgl'
};
