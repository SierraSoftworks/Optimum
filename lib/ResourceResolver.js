var path = require('path'),
	fs = require('fs'),
	EventEmitter = require('events').EventEmitter,
	util = require('util'),
	request = require('superagent'),
	_ = require('lodash');

module.exports = ResourceResolver;

function ResourceResolver(localDirectory, options) {
	EventEmitter.call(this);
	this.localDirectory = path.resolve(process.cwd(), localDirectory);
	this.cache = {};
	this.options = options || {};
	_.defaults(this.options, {
		encoding: 'utf-8'
	});
}

util.inherits(ResourceResolver, EventEmitter);

ResourceResolver.prototype.resolve = function(resource) {
	var target = resource;
	if(/^(\w+:)?\/\//.test(resource)) return { url: resource, local: false };
	if(/^\/[^\/]/.test(target))
		target = target.substr(1);
	target = path.resolve(this.localDirectory, target);
	try {
		fs.statSync(target);
		return { url: target, local: true };
	} catch(ex) {
		return { url: resource, local: false };
	}
};

ResourceResolver.prototype.isMinified = function(resource) {
	return /\.min\.\w+$/.test(resource);
};

ResourceResolver.prototype.getType = function(resource) {
	var type = /\w+$/.exec(resource);
	return type[0];
};

ResourceResolver.prototype.forCache = function(resource, content, group) {
	var res = {
		type: this.getType(resource),
		group: group
	};

	if(this.isMinified(resource)) res.minified = content;
	else res.content = content;

	return res;
};

ResourceResolver.prototype.fetch = function(resource, group, done) {
	var self = this;

	this.emit('request', resource);

	if (this.cache[resource]) {
		setTimeout(function () { done(null, self.cache[resource]) }, 0);
		return;
	}

	var resolved = this.resolve(resource);

	if (resolved.local) {
		this.emit('fsRead', resource, resolved.url);
		return fs.readFile(resolved.url, { encoding: this.options.encoding }, function (err, content) {
			if (err) {
				self.emit('notFound', 404, resource, resolved.url);
				return done(null, null);
			};

			self.cache[resource] = self.forCache(resource, content, group);

			return done(null, self.cache[resource]);
		});
	}
	else {
		this.emit('httpGet', resource, resolved.url);
		request.get(resolved.url).end(function (err, res) {
			if (err) {
				self.emit('notFound', 404, resource, resolved.url);
				return done(null, null);
			};

			if (res.ok) {
				self.cache[resource] = self.forCache(resource, res.text, group);
				return done(null, self.cache[resource]);
			}

			self.emit('notFound', err.code, resource, resolved.url);
			return done(null, null);
		});
	}
};