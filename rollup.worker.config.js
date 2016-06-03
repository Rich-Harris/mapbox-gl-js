import config from './rollup.config.js';

export default Object.assign( {}, config, {
	entry: 'js/source/worker.js',
	dest: 'dist/mapbox-gl-dev.worker.js'
});
