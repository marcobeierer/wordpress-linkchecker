=== Link Checker ===
Contributors: mbsec
Tags: link checker, broken links, dead links, dead link checker, broken link checker
Requires at least: 4.2
Tested up to: 4.3
Stable tag: 1.0.0-beta.1
License: GPL v3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

An easy to use Link Checker for WordPress to detect broken internal and external links on your website.

== Description ==
The link checker uses an external service to crawl your website and and find broken links on your website. If the links are internal or external does not matter. The link checker will find them all. The generator works for every plugin out of the box. The computation costs for your website is also very low because the crawler does the heavy work and just acts like a normal visitor, who visits all pages of you website once.

= Features =
* Simple setup.
* Works out of the box with all WordPress plugins.
* Low computation costs for your webserver.

= Technical Features =
* Respects your robots.txt file (also the crawl-delay directive).

= Upcoming Technical Features =
* Support for checking the availability of embedded images, videos, CSS files and JS files.

= Limitations =
During the beta phase the service is limited to check the first 500 URLs of your website. After the beta phase, you could buy a token to check up to 50000 URLs. If you already need more URLs, please contact me by email.

== Installation ==
1. Upload the 'mb-link-checker' folder to the '/wp-content/plugins/' directory.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Access the generator with the "Link Checker" button in the sidebar and use the "Check your website" button to start the process. 
4. The found broken links will be reported to you when the crawler has finished.

== Changelog ==
= 1.0.0-beta.1 =
*Release Date - 8th August, 2015*

* Initial release.

