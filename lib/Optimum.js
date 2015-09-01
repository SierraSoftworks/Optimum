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

	this.resources = {
		head: {
			scripts: [],
			styles: []
		},
		body: {
			scripts: [],
			styles: []
		}
	};
}

util.inherits(Optimum, EventEmitter);

Optimum.prototype.optimize = function(resource, callback) {
	var self = this;
	fs.readFile(resource, { encoding: this.options.encoding }, function(err, data) {
		if(err) return callback ? callback(err) : self.emit('error', err);

		var $ = cheerio.load(data);
		var headScripts = $('head script[src]');
		var bodyScripts = $('body script[src]')
		var headStyles = $('head link[rel=stylesheet]');
		var bodyStyles = $('body link[rel=stylesheet]');

		headScripts.remove();
		bodyScripts.remove();
		headStyles.remove();
		bodyStyles.remove();

		self.resources.head.scripts = _.uniq(self.resources.head.scripts.concat(_.map(headScripts, function (s) { return s.attribs.src; })));
		self.resources.head.styles  = _.uniq(self.resources.head.styles.concat(_.map(headStyles, function (s) { return s.attribs.href; })));
		self.resources.body.scripts = _.uniq(self.resources.body.scripts.concat(_.map(bodyScripts, function (s) { return s.attribs.src; })));
		self.resources.body.styles  = _.uniq(self.resources.body.styles.concat(_.map(bodyStyles, function (s) { return s.attribs.href; })));

		var resources = _.union(
			_.map(self.resources.head.scripts, function(s) { return { uri: s, group: 'head' }; }),
			_.map(self.resources.head.styles, function(s) { return { uri: s, group: 'head' }; }),
			_.map(self.resources.body.scripts, function(s) { return { uri: s, group: 'body' }; }),
			_.map(self.resources.body.styles, function(s) { return { uri: s, group: 'body' }; })
		);

		async.parallel(
			resources.map(function(r) { return function(done) { self.resolver.fetch(r.uri, r.group, done); } }),
			function(err, resources) {
				if(err) return callback ? callback(err) : self.emit('error', err);
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

				self.emit('document', resource, self.processor.minify({ type: 'html', content: $.html() }));
				callback && callback(null);
			}
		);
	});
};