var sqwish = require('sqwish'),
	uglify = require('uglify-js'),
	html = require('html-minifier'),
	_ = require('lodash');

module.exports = ResourceProcessor;

var defaultProcessors = {
	'js': {
		minify: function(resource) { return uglify.minify(resource, { fromString: true }).code; },
		delimiter: '\n;\n',
		wrap: function(path) { return '<script src="' + path + '"></script>'; },
		saveTo: 'scripts.min.js'
	},
	'css': {
		minify: function(resource) { return sqwish.minify(resource); },
		delimiter: '\n\n',
		wrap: function(path) { return '<link rel="stylesheet" href="' + path + '"/>'; },
		saveTo: 'styles.min.css'
	},
	'html': {
		minify: function(resource) { 
			return html.minify(resource, {
				removeComments: true,
				removeCommentsFromCDATA: true,
				collapseWhitespace: true,
				collapseBooleanAttributes: true,
				removeAttributeQuotes: true,
				removeEmptyAttributes: true
			});
		}
	}
};

function ResourceProcessor(processors) {
	this.processors = processors || {};
	_.defaults(this.processors, defaultProcessors);
}

ResourceProcessor.prototype.minify = function(resource) {
	if(resource.minified) return resource.minified;
	if(!this.processors.hasOwnProperty(resource.type)) return resource.content;
	return resource.minified = this.processors[resource.type].minify(resource.content);
};

ResourceProcessor.prototype.combine = function(resources, delimiter) {
	return _.map(resources, this.minify, this).join(delimiter || '');
};

ResourceProcessor.prototype.freeze = function(resources) {
	var self = this;
	var types = _.groupBy(resources, 'type');
	var frozen = _.map(types, function(resources, type) {
		var name = self.processors[type] && self.processors[type].saveTo || ('optimum.min.' + type);
		var content = self.combine(resources, self.processors[type] && self.processors[type].delimiter);
		var element = self.processors[type] && self.processors[type].wrap && self.processors[type].wrap('/' + name);
		return {
			type: type,
			name: name,
			content: content,
			element: element
		};
	});

	return frozen;
};