var path = require('path'),
	fs = require('fs'),
	uglify = require('uglify-js'),
	sqwish = require('sqwish'),
	html = require('html-minifier'),
	cheerio = require('cheerio'),
	_ = require('lodash'),
	async = require('async'),
	crypto = require('crypto'),
	EventEmitter = require('events').EventEmitter,
	util = require('util');

module.exports = Optimum;

function Optimum(options) {
	this.options = options || {};
	_.defaults(this.options, {
		revision: crypto.pseudoRandomBytes(8).toString('hex'),
		rootDirectory: process.cwd(),
		outputDirectory: process.cwd(),
		encoding: 'utf-8'
	});
}

util.inherits(Optimum, EventEmitter);

Optimum.prototype.optimize = function(resource) {
	var self = this;
	var target = path.resolve(this.options.rootDirectory, resource);
	fs.readFile(target, { encoding: this.options.encoding }, function(err, data) {
		if(err) return done(err);

		var $ = cheerio.load(data);
		self.optimizeHtml($, function(err, minified) {
			if(err) return self.emit('error', err);
			return self.emit('document', resource, minified.html());
		});
	});
};

Optimum.prototype.optimizeHtml = function(document, done) {
	var self = this;


	var scripts = document('script[src]');
	var styles = document('link[rel=stylesheet]');

	scripts.remove();
	styles.remove();

	async.parallel([
		function(done) {
			self.optimizeJs(scripts, done);
		},
		function(done) {
			self.optimizeCss(styles, done);
		}
	], function(err, add) {
		if(err) return done(err);
		add = _.flatten(add, true);

		var head = document('head');
		for(var i = 0; i < add.length; i++)
			head.prepend(add[i]);

		document = cheerio.load(html.minify(document.html(), {
			removeComments: true,
			removeCommentsFromCDATA: true,
			collapseWhitespace: true,
			collapseBooleanAttributes: true,
			removeAttributeQuotes: true,
			removeEmptyAttributes: true
		}));

		return done(null, document);
	});
};

Optimum.prototype.optimizeJs = function(scripts, done) {
	return this.optimizeGeneric(scripts, 
		function(script) { return script.attribs.src; },
		function(content) { return uglify.minify(content, { fromString: true }).code; },
		'.min.js',
		function(path) { return cheerio('<script src="' + path + '"/>'); },
		done);
};

Optimum.prototype.optimizeCss = function(styles, done) {
	return this.optimizeGeneric(styles, 
		function(style) { return style.attribs.href; },
		function(content) { return sqwish.minify(content); },
		'.min.css',
		function(path) { return cheerio('<link rel="stylesheet" href="' + path + '.min.css"/>'); },
		done);
};

Optimum.prototype.optimizeGeneric = function(objects, resolve, minify, extension, wrap, done) {
	var self = this;
	var minified = {};

	async.parallel(_.map(objects.toArray(), function(object) {
		return function(done) {
			var src = resolve(object);
			var target = self.options.rootDirectory + src;
			console.log(target);
			fs.readFile(target, { encoding: self.options.encoding }, function(err, content) {
				if(err) return done(null, object);

				var dir = path.dirname(src);
				var min = /\.min\.\w+$/.test(src) ? content : minify(content);

				if(minified.hasOwnProperty(dir))
					minified[dir] += '\n\n' + min;
				else
					minified[dir] = min;

				return done(null, false);
			});
		};
	}), function(err, keep) {
		keep = _.pull(keep, false);

		for(var k in minified)
			keep.unshift(wrap(k + '/' + self.options.revision + extension));

		console.log(util.inspect(minified));
		
		_.each(minified, function(content, relPath) {
			self.emit('resource', path.resolve(relPath, self.options.revision + extension), content);
		});

		return done(null, keep);
	});
};