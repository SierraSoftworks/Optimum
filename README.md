# Optimum
**A full stack HTML+JS+CSS minification an optimization framework**

Optimum attempts to take the headache out of content minification by removing many of the hurdles you generally need to jump through when developing your applications. It's most notable feature is the ability to automatically rewrite your HTML files to contain only minified JS and CSS files (which are intelligently aggregated) where ever possible.

Optimum was originally designed to support our development of Angular.js applications, so in many ways it is targetted at applications which make use of some kind of `layout.html` file with a set of common resources. To cut down on application loading times it is often desirable to minify these resources and aggregate them into a single file, reducing the amount of bandwidth required as well as the number of required requests and therefore boosting first-load performance.

## Features
 - No setup necessary, just run and you're done
 - Intelligent minification and aggregation
 - Develop naturally, deploy minified

## Limitations
There are a number of small limitations regarding the way in which different cases are handled at the moment (keep in mind that this is the first release of Optimum and it was thrown together in a mere 3 hours...). Notably, Optimum assumes that any stylesheet or script it cannot find locally is hosted on a CDN, and will ignore it. It will also, in an effort to keep things a bit organized, only aggregate files within a common parent directory. So javascript files in `/js` won't be aggregated with files from `/ctrl` for example. It also assumes that pre-minified resources are named in the form `*.min.*`, and will not attempt to run UglifyJS or Sqwish on them.