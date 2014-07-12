# Optimum
**A full stack HTML+JS+CSS minification an optimization framework**

```bash
optimum index.html
```

Optimum attempts to take the headache out of content minification by removing many of the hurdles you generally need to jump through when developing your applications. It's most notable feature is the ability to automatically rewrite your HTML files to contain only minified JS and CSS files (which are intelligently aggregated) where ever possible.

Optimum was originally designed to support our development of Angular.js applications, so in many ways it is targetted at applications which make use of some kind of `layout.html` file with a set of common resources. To cut down on application loading times it is often desirable to minify these resources and aggregate them into a single file, reducing the amount of bandwidth required as well as the number of required requests and therefore boosting first-load performance.

## Features
 - No setup necessary, just run and you're done
 - Intelligent minification and aggregation
 - Develop naturally, deploy minified
 - Retrieves and aggregates remote CSS and JS files automatically

## Limitations
Optimum works best in scenarios where your design is based on a layout template of some kind, which contains common scripts and styles used throughout your application. This works well, since Optimum creates "bundles" for each of your resource types (CSS, JS etc.) which contain everything your site needs to run. The obvious downside is that if your website uses a lot of scripts, these files can become rather large (especially when you're working with libraries like Angular.js), but by minifying these files and bundling them together you can generally reduce site load times (especially on your first load) by a very large margin.

Optimum will also attempt to maintain the order in which your scripts and styles appear to the best of its ability, however this is only maintained within resources of that type - so if you've got Coffee script files and JavaScript files then you'll need to ensure that they don't mind the order that they're loaded in - or do some manual re-ordering afterwards. For most scanarios this isn't an issue.