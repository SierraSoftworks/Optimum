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

var ResourceProcessor = require('./ResourceProcessor'),
	ResourceResolver = require('./ResourceResolver');

module.exports = Optimum;

function Optimum(options) {
	this.options = options || {};
	_.defaults(this.options, {
		resourceDirectory: process.cwd(),
		outputDirectory: process.cwd(),
		encoding: 'utf-8'
	});

	this.resolver = new ResourceResolver(this.options.resourceDirectory, {
		encoding: this.options.encoding
	});

	this.processor = new ResourceProcessor(this.options.processors);
}

util.inherits(Optimum, EventEmitter);

Optimum.prototype.optimize = function(resource) {
	var self = this;
	fs.readFile(resource, { encoding: this.options.encoding }, function(err, data) {
		if(err) return done(err);

		var $ = cheerio.load(data);
		var scripts = $('script[src]');
		var styles = $('link[rel=stylesheet]');

		scripts.remove();
		styles.remove();

		var resources = _.union(_.map(scripts, function(s) { return s.attribs.src; }), _.map(styles, function(s) { return s.attribs.href; }));

		async.parallel(
			resources.map(function(r) { return function(done) { self.resolver.fetch(r, done); } }), 
			function(err, resources) {
				if(err) return self.emit('error', err);
				var frozen = self.processor.freeze(resources);

				var head = $('head');
				for(var i = 0; i < frozen.length; i++) {
					head.append(cheerio(frozen[i].element));
					self.emit('resource', frozen[i].type, frozen[i].name, frozen[i].content);
				}

				return self.emit('document', resource, self.processor.minify({ type: 'html', content: $.html() }));
			}
		);
	});
};