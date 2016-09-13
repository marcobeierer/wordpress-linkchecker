=== Link Checker ===
Contributors: mbsec
Tags: link checker, broken links, dead links, dead link checker, broken link checker, broken, link, links, maintenance, plugin, seo
Requires at least: 4.2
Tested up to: 4.6
Stable tag: 1.4.0
License: GPL v3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

An easy to use link checker for WordPress to detect broken links and images on your website.

== Description ==
The [Link Checker](https://www.marcobeierer.com/wordpress-plugins/link-checker) for WordPress uses an external service to crawl your website and and find broken links and images on your website. 

In contrast to search engine tools like the Google Search Console, which only show if a URL on your website is not reachable, it does not matter for the Link Checker if the links leads to an internal or external URL. The Link Checker will find all dead links. 

The Link Checker works for every plugin out of the box. The computation costs for your website is also very low because the crawler does the heavy work and just acts like a normal visitor, who visits all pages of you website once.

= Features =
* Simple setup.
* Works out of the box with all WordPress plugins.
* Low computation costs for your webserver.

= Technical Features =
* Respects your robots.txt file (also the crawl-delay directive).
	* You could use the user-agent MB-SiteCrawler to control the crawler.

= Additional Technical Features of the Professional Version =
* Check if embedded internal and external images are broken.
* Scheduler to automatically check a website once a day and get a summary report by email.

= Upcoming Technical Features =
* Support for checking the availability of videos, CSS files and JS files.

= Technical Requirements =
* cURL 7.18.1 or higher.
	* PHP 5.3 should be compiled against a compatible cURL version in the most cases. PHP 5.4 or higher should by default provide a compatible cURL version.
* OpenSSL 0.9.8f or higher.

= Limitations of the Basic Version =
The free basic version of the Link Checker allows you to check the first 500 internal and external links on your website. If you need more capacity, you could buy a token for the professional version of the Link Checker to check up to 50'000 links.

[Link Checker Professional](https://www.marcobeierer.com/wordpress-plugins/link-checker-professional)

= Use of an External Server =
The Link Checker uses an external server, operated by the developer of the plugin, to crawl your website and detect broken links. This means, that there is some communication between your website and the server. The only data that is communicated to the external server by your website is the URL of your website and the fact that you are using WordPress. The server than crawlers your website (as a normal visitor does) and answers with a list of the found broken links.

== Installation ==
1. Upload the 'link-checker' folder to the '/wp-content/plugins/' directory.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Access the generator with the "Link Checker" button in the sidebar and use the "Check your website" button to start the process. 
4. The found broken links will be reported to you when the crawler has finished.

== Frequently Asked Questions ==

= Why could the Link Checker not access my site? =
A reason if the Link Checker could not access your site could be that the crawler of the Link Checker is blocked by your hosting provider. I have observed this issue especially with free and really cheap hosting providers. Some block crawlers (and regular visitors) already after five fast sequential requests. The issue could be fixed by whitelisting the IP of the crawler. However, I think this option is not available for the affected hosting services. Alternatively it is possible to use the crawl-delay directive in your robots.txt to set the delay between two requests.

= Which user-agent should I use in the robots.txt file? =
The Link Checker uses a custom user-agent group named MB-SiteCrawler. This allows you a fine grained control of which pages are checked. If you do not define a group for the custom user-agent in your robots.txt file, the default set in the * group apply.

= Does the Link Checker work in my local development environment? =
No, the Link Checker needs to crawl your website and the generator has no access to you local network.

= The Link Checker is very slow. What can I do? =
In the most cases this is due to the fact that you have set a large value for the crawl-delay directive in your robots.txt file. Some hosters also add the crawl-delay directive automatically to your robots.txt file. The crawl-delay defines the time in seconds between to requests of the crawler.

== Screenshots ==

1. List of broken links found by the Link Checker.

== Changelog ==

= 1.4.0 =
*Release Data - 13th September, 2016*

* Added news subpage.
* Added custom status codes documentation.

= 1.3.0 =
*Release Data - 12th July, 2016*

* Added an option to define the maximum number of concurrent connections.
* Better handling of requests to servers that do not response to HEAD requests correctly. This prevents some false positives.
* Bugfixes
	* Implemented Cache-Control for AJAX requests.
	* Fixed the PHP short tag issue.

= 1.2.1 =
*Release Date - 1st February, 2016*

* Bugfix: Replaced get_site_url() with get_home_url(), which referes to the option "Site Address (URL)".

= 1.2.0 =
*Release Date - 23th December, 2015*

* Implemented a scheduler to automatically check a website once a day.
* Improved cURL error messages.

= 1.1.3 =
*Release Date - 11th November, 2015*

* Implemented error message if backend is down.
* Implemented better error messages to detect problems on startup.

= 1.1.2 =
*Release Date - 20th October, 2015*

* Show sales message in status message only if basic version is used.
* Fixed file_get_contents bug.

= 1.1.1 =
*Release Date - 4th October, 2015*

* Bug fix release.

= 1.1.0 =
*Release Date - 4th October, 2015*

* Added support for check of embedded image.
* Some improvements and bug fixes in the backend service.
* Implemented a simple template engine.
* Implemented 15 seconds timeout for connection establishment.

= 1.0.4 =
*Release Date - 27th September, 2015*

* Another bug fix release for an issue with PHP 5.3.

= 1.0.3 =
*Release Date - 27th September, 2015*

* Load shared_functions.php only if needed.

= 1.0.2 =
*Release Date - 27th September, 2015*

* Bug fix release, one file was missing in the previous release.

= 1.0.1 =
*Release Date - 27th September, 2015*

* Added a check for the correct cURL version.
* Added a check if the plugin is used in a local development environment.

= 1.0.0 =
*Release Date - 20th September, 2015*

* Do only transfer the results once at the end of the scan and not at each status update request.
	* The status update interval was due to this change reduced to one second again.
* Better interface messages for use with updated API.
* Display number of already checked links.
* Check if the backend service is up and running at the start of a link check.

= 1.0.0-rc.1 =
*Release Date - 17th September, 2015*

* Implemented token support for the Link Checker Professional.
* Reset list of broken links directly and not at the first find if a second check is executed.
* Undone change introduced in 1.0.0-beta.3: Pages blocked by the robots.txt file are not parsed from now on as in versions older than 1.0.0-beta.3. I rethought this point and think crawlers should respect the robots.txt, no matter which purpose the crawler has.
* Support for custom user-agent group (MB-SiteCrawler) in robots.txt.
* Better error reporting if website is not reachable.
* Reset limit reached message before each run.
* A status update is now requested every 2.5 seconds instead of every second.

= 1.0.0-beta.3 =
*Release Date - 21th August, 2015*

*Please note that the plugin was not changed, just the backend service.*

* The Link Checker is now able to detect the same dead link on multiple pages. Until now the Link Checker only showed the first page where the dead link was found.
* Pages, blocked by the robots.txt file, were not parsed in earlier version. This is fixed now.
* Fixed an issue with the evaluation of the HTML base tag. A base tag href value with a trailing slash was not evaluated correctly before.
* Implemented a timeout on the connection. URLs which time out are shown with an error 500 in the Link Checker.
* Some smaller bug fixes and performance improvements.

= 1.0.0-beta.2 =
*Release Date - 14th August, 2015*

* Changed menu position to a more unique one.

= 1.0.0-beta.1 =
*Release Date - 8th August, 2015*

* Initial release.

