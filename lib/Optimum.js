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
		if(err) return self.emit('error', err);

		var $ = cheerio.load(data);
		var headScripts = $('head script[src]');
		var bodyScripts = $('body script[src]')
		var headStyles = $('head link[rel=stylesheet]');
		var bodyStyles = $('body link[rel=stylesheet]');

		headScripts.remove();
		bodyScripts.remove();
		headStyles.remove();
		bodyStyles.remove();

		var resources = _.union(
			_.map(headScripts, function(s) { return { uri: s.attribs.src, group: 'head' }; }),
			_.map(bodyScripts, function(s) { return { uri: s.attribs.src, group: 'body' }; }),
			_.map(headStyles, function(s) { return { uri: s.attribs.href, group: 'head' }; }),
			_.map(bodyStyles, function(s) { return { uri: s.attribs.href, group: 'body' }; })
		);

		async.parallel(
			resources.map(function(r) { return function(done) { self.resolver.fetch(r.uri, r.group, done); } }),
			function(err, resources) {
				if(err) return self.emit('error', err);
				resources = _.groupBy(resources, 'group');
				var frozen = _.map(resources, function(res, group) {
					return { target: $(group), frozen: self.processor.freeze(res, group) };
				});

				_.each(frozen, function(frz) {
					_.each(frz.frozen, function(res) {
						frz.target.append(cheerio(res.element));
						self.emit('resource', res.type, res.name, res.content);
					});
				});

				return self.emit('document', resource, self.processor.minify({ type: 'html', content: $.html() }));
			}
		);
	});
};