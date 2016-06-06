var fs = require( 'fs' );
var path = require( 'path' );
var resolve = path.resolve;
var dirname = path.dirname;
var glob = require( 'glob' );

process.chdir( path.join( __dirname, '..' ) );

var browserFilePattern = /util\/(ajax|browser|canvas|dom|dispatcher)'/gm;

function getTempNameFromPath ( path ) {
	return '__' + /\w+$/.exec( path )[0];
}

var transformers = {
	'js/mapbox-gl.js': ( source, modulePath ) => {
		var imports = [];

		var code = source
			.replace( browserFilePattern, `util/browser/$1'` )
			.replace( /var (\w+) = require\('(.+)'\);/g, ( match, name, importPath ) => {
				var resolvedPath = resolve( dirname( modulePath ), importPath  );

				if ( resolvedPath in nameExporters ) return `import * as ${name} from '${importPath}';`;
				return `import ${name} from '${importPath}';`;
			})
			.replace( /mapboxgl\.(\w+) = require\('(.+)'\)(?:\.(\w+))?;/gm, ( match, name, importPath, prop ) => {
				var resolvedPath = resolve( dirname( modulePath ), importPath );

				imports.push( `import ${ resolvedPath in nameExporters ? '* as ' : ''}${name} from '${importPath}';\n` );
				return `mapboxgl.${name} = ${prop ? `${name}.${prop}` : name};`;
			})
			.replace( /mapboxgl\.util = util;/, 'mapboxgl.util = Object.assign({}, util);' )
			.replace( 'var mapboxgl = module.exports = {};', `var mapboxgl = {};\nexport default mapboxgl;` );

		code = imports.join( '' ) + code;

		return code;
	},

	_default: ( source, modulePath ) => {
		var imports = [];
		var defaultExport;

		let imported = {};

		var code = source

			// special cases
			.replace( `var window = require('../util/browser').window;`, `var window = browser.window;` )
			.replace( `Object.defineProperty(exports, 'devicePixelRatio', {
    get: function() { return window.devicePixelRatio; }
});`, `export var devicePixelRatio = window.devicePixelRatio;` )

			.replace( `var worker = new WebWorkify(require('../../source/worker'));`, `var worker = new Worker("TODO")` )
			.replace( `var WebWorkify = require('webworkify');`, '' )

			.replace( browserFilePattern, `util/browser/$1'` )
			.replace( `exports.supported = require('mapbox-gl-js-supported');`, `export { default as supported } from 'mapbox-gl-js-supported';` )
			.replace( /piecewise-constant/g, 'piecewiseConstant' )
			.replace( `exports['piecewiseConstant']`, `export var piecewiseConstant` )

			// generic replacements
			.replace( /(?:var |    )(\w+) = require\('(.+)'\)[,;]/g, ( match, name, importPath ) => {
				var resolvedPath = resolve( dirname( modulePath ), importPath );

				const importStatement = ( resolvedPath in nameExporters ) ?
					`import * as ${name} from '${importPath}';` :
					`import ${name} from '${importPath}';`;

				return importStatement;
			})
			.replace( /(?:var |    )(\w+) = require\('(.+)'\)\.(\w+)[,;]/g, ( match, localName, importPath, importedName ) => {
				var resolvedPath = resolve( dirname( modulePath ), importPath );

				if ( resolvedPath in nameExporters ) {
					if ( importedName ) {
						if ( localName === importedName ) {
							return `import { ${localName} } from '${importPath}';`;
						}

						return `import { ${localName} as ${importedName} } from '${importPath}';`;
					}

					return `import * as ${name} from '${importPath}';`;
				}

				if ( importedName ) {
					const tmp = getTempNameFromPath( importPath );

					const importStatement = `import ${tmp} from '${importPath}';\n`;

					if ( !~imports.indexOf( importStatement ) ) imports.push( importStatement );
					return `${importStatement}var ${localName} = ${tmp}.${localName};`;
				}

				return `import ${localName} from '${importPath};`;
			})
			.replace( /^module\.exports = /gm, 'export default ')
			.replace( /^(?:module\.)?exports\.(\w+) = (.+);/gm, ( match, exportedName, localName ) => {
				if ( exportedName === localName ) return `export { ${exportedName} };`;
				return `export var ${exportedName} = ${localName};`;
			})
			.replace( /^(?:module\.)?exports\.(\w+) = /gm, 'export var $1 = ' )
			.replace( /var (\w+) = module.exports = function/gm, `export default function $1` )
			.replace( /(?:module\.)?exports\./gm, '' )
			.replace( /var (\w+) = module.exports =/g, ( match, name ) => {
				defaultExport = name;
				return `var ${name} =`;
			})

			// remaining inline requires
			.replace( /require\('(.+)'\)/gm, ( match, importPath ) => {
				var resolvedPath = resolve( dirname( modulePath ), importPath );
				var name = getTempNameFromPath( importPath );

				const importStatement = ( resolvedPath in nameExporters ) ?
					`import * as ${name} from '${importPath}';\n` :
					`import ${name} from '${importPath}';\n`;

				if ( !~imports.indexOf( importStatement ) ) imports.push( importStatement );
				return name;
			});

		// ugh
		imports = imports.filter( statement => {
			return !~code.indexOf( statement );
		});

		return imports.join( '' ) + code + ( defaultExport ? `\n\nexport default ${defaultExport};` : '' );
	}
};

var files = glob.sync( 'js/**/*.js' ).map( path => {
	const source = fs.readFileSync( path, 'utf-8' );

	return {
		path,
		source,
		exportsNames: /exports\.\w+/.test( source ),
		exportsDefault: /module\.exports =/.test( source )
	};
});

var nameExporters = {};
var defaultExporters = {};
var browserFiles = files.filter( file => browserFilePattern.test( file.path ) ).map( file => {
	return { path: file.path.replace( browserFilePattern, `util/browser/$1'` ) };
});
files.concat( browserFiles ).forEach( file => {
	if ( file.exportsNames ) nameExporters[ path.resolve( file.path ).replace( '.js', '' ) ] = true;
	if ( file.exportsDefault ) defaultExporters[ path.resolve( file.path ).replace( '.js', '' ) ] = true;

	if ( file.exportsNames && file.exportsDefault ) console.error( 'exports both:', file.path );
});

console.log( 'nameExporters', nameExporters )

files.forEach( file => {
	var transformer = transformers[ file.path ] || transformers._default;
	fs.writeFileSync( file.path, transformer( file.source, file.path ) );
});
