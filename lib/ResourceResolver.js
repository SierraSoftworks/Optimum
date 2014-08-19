var path = require('path'),
	fs = require('fs'),
	request = require('superagent'),
	_ = require('lodash');

module.exports = ResourceResolver;

function ResourceResolver(localDirectory, options) {
	this.localDirectory = path.resolve(process.cwd(), localDirectory);
	this.cache = {};
	this.options = options || {};
	_.defaults(this.options, {
		encoding: 'utf-8'
	})
}

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

ResourceResolver.prototype.forCache = function(resource, content) {
	var res = {
		type: this.getType(resource)
	};

	if(this.isMinified(resource)) res.minified = content;
	else res.content = content;

	return res;
};

ResourceResolver.prototype.fetch = function(resource, group, done) {
	var self = this;

	console.log('FETCH %s', resource);

	if(this.cache[resource]) return done(null, { content: this.cache[resource].content, group: group });

	var resolved = this.resolve(resource);

	if(resolved.local)
		return fs.readFile(resolved.url, { encoding: this.options.encoding }, function(err, content) {
			if(err) return done(err);
			self.cache[resource] = self.forCache(resource, content);

			return done(null, { content: self.cache[resource], group: group });
		});

	request.get(resolved.url).end(function(err, res) {
		if(err) return done(err);
		if(res.ok) {
			self.cache[resource] = self.forCache(resource, res.text);
			return done(null, { content: self.cache[resource], group: group });
		}
		return done(new Error(res.error.message))
	});
};