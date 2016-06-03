import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import strip from 'rollup-plugin-strip';
import alias from 'rollup-plugin-alias';

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
		strip(),
		commonjs(),
		alias({
			// TODO use the ES versions...
			assert: 'node_modules/assert-jsnext/dist/assert.js',
			util: 'node_modules/util-jsnext/dist/util.js'
		}),

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
