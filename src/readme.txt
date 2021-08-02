=== Link Checker ===
Contributors: mbsec
Tags: seo, links, maintenance, broken link checker, link checker, dead link checker, link, broken links, dead links
Requires at least: 4.5
Tested up to: 5.8
Stable tag: 1.18.2
License: GPL v3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

An easy to use link checker for WordPress to detect broken links and images on your website.

== Description ==
The [Link Checker](https://www.marcobeierer.com/wordpress-plugins/link-checker) for WordPress uses an external service to crawl your website and find broken links and images on your website. 

In contrast to search engine tools like the Google Search Console, which only show if a URL on your website is not reachable, it does not matter for the Link Checker if the links leads to an internal or external URL. The Link Checker will find all dead links. 

The Link Checker works for every plugin out of the box. The computation costs for your website is also very low because the crawler does the heavy work and just acts like a normal visitor, who visits all pages of you website once.

= Videos =
You can find videos about the Link Checker on the [Link Checker for WordPress playlist on YouTube](https://www.youtube.com/watch?v=8rUFDp09tjs&list=PL5VYcNma6nfxIrlbpz0f1avXT_JIrUZA1).

[youtube https://www.youtube.com/watch?v=8rUFDp09tjs&list=PL5VYcNma6nfxIrlbpz0f1avXT_JIrUZA1]

= Features =
* **Simple setup**.
* **Works out of the box** with all WordPress plugins.
* **Low computation costs** for your webserver.
* Lists all broken links and redirects on your website.
* Support for Polylang (probably also WPML) sites.

= Technical Features =
* Respects your robots.txt file (also the crawl-delay directive).
	* You can use the user-agents MB-LinkChecker to control the crawler.

= Additional Features of the Professional Version =
* Check if embedded internal and external **images** are broken.
* Check if embedded **YouTube videos** are broken.
* Scheduler to **automatically check a website** once a day and get a summary report by email.
* The result can be exported as CSV file.
* Form login support to check protected pages like membership areas.
* The result is saved on the Link Checker server so that it can be fetched multiple times without requiring a recheck. For example from different users or with different browsers.

= Upcoming Features =
* Support for checking the availability of videos, CSS files and JS files.

= Technical Requirements =
* Works with **PHP 5.6 and 7**.

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
2. Stats of the Link Checker after a check has finished.

== Changelog ==

= 1.18.2 =
*Release Date - 2nd August, 2021*

* Updated 'Tested up to' information.

= 1.18.1 =
*Release Date - 19st October, 2020*

* Updated 'Tested up to' information.

= 1.18.0 =
*Release Date - 30st June, 2019*

* Added selectable interval (daily, weekly, bi-weekly, every 30 days) to scheduler.
* Added _Mark all with same status code and domain as working_ function.
* Improved documentation/glossary.

= 1.17.0 =
*Release Date - 22st March, 2019*

* Added form login support.
* Fixed a security vulnerability (XSS).

= 1.16.2 =
*Release Date - 1st March, 2019*

* Updated 'Tested up to' information.

= 1.16.1 =
*Release Date - 20th December, 2018*

* Bugfix for broken CSV download in Firefox.

= 1.16.0 =
*Release Date - 21th September, 2018*

* Show edit link for URLs that could be assigned to a post.
* Improved status codes page.
* Improved professional version page.
* Bugfix: Reset retries count before every check.
* Crawler: Performance optimizations and some bug fixes.

= 1.15.1 =
*Release Date - 21th July, 2018*

* Force CSS reload because an old version is cached for users of older versions.

= 1.15.0 =
*Release Date - 21th July, 2018*

* Export result as CSV file for users of the professional version.
* Result is saved on server for customers of the professional version. So the same result can be downloaded by multiple users or with multiple browsers.
* Added hint how to change scheduler email address.

= 1.14.0 =
*Release Date - 15th July, 2018*

* Added message with recommendations for Wordfence users.
* Result from cache is loaded even if a check is currently running.
* Old result is not cleared anymore when a new check is started, but just when the new check has finished.
* Split up the 'Progress and Stats' tab in two separate tabs.
* Added status code and response text to error message.
* Bugfix: Handle failed IsRunning request.

= 1.13.0 =
*Release Date - 12th May, 2018*

* Added a feedback form.

= 1.12.1 =
*Release Date - 8th May, 2018*

* Bugfix: Start button was not shown in some cases.

= 1.12.0 =
*Release Date - 8th May, 2018*

* New 'Mark as fixed on all pages' button.
* Added Polylang integration.
	* Probably also works with WPML.
* Compression of results before they get stored in browser cache.
* Moved scheduler to tab in main view.

= 1.11.0 =
*Release Date - 22th April, 2018*

* Redesigned user interface.
	* Pagination.
	* All-in-one (links, images, videos, working redirects, unhandled resources) result view.
* Performance of user interface was improved so that it's now possible to view result tables with more than 100'000 broken links or redirects.
* Use IndexedDB instead of localStorage to store result so that the result set size is not limited to about 5 MB anymore.

= 1.10.0 =
*Release Date - 19th April, 2018*

* Auto-resume support if the Link Checker gets opened and a check is already running on the server.
* Implemented a warning for high crawl-delays.
* Added a stop button to stop the current check.
* Implemented protection for check hijacking if token is used.

= 1.9.1 =
*Release Date - 17th April, 2018*

* Fixed redirect stats.

= 1.9.0 =
*Release Date - 17th April, 2018*

* Highlighting of redirects.
* Added option to show working redirects.
	* Has to be enabled in the settings.
* Fixed a conflict of the settings page with the settings page of the *Broken Link Checker* plugin.

= 1.8.0 =
*Release Date - 9th April, 2018*

* Results are saved now and don't get discarded when leaving the Link Checker anymore.
* Improved navigation with tabs.
* More detailed stats.
* Crawler
	* Added status code 603 (Unknown authority error) with explanation.
	* Added cookie support.

= 1.7.0 =
*Release Date - 4th March, 2018*

* Added support for broken embedded YouTube videos.
* Remove all whitespace (line breaks, spaces, tabs) from token. This prevents Copy and Paste issues.
* Improvement notification message for daily checks.
* Crawler performance improvements.

= 1.6.0 =
*Release Date - 1st March, 2018*

* Added info box to scheduler and hide register form if no token is present.
* Hide broken images string and show info that not available.
* Implemented three retries if request could not be sent or no response was received.
* Explain changed status codes (598 is now 601 and 599 is 602).
* Added unhandled resources and images.
* Crawler
	* Implemented better blocked by robots detection and handling (for external links).

= 1.5.1 =
*Release Date - 26th February, 2018*

* Release 1.5.0 missed some files.

= 1.5.0 =
*Release Date - 26th February, 2018*

* Requires WordPress 4.5
* Fixed broken links could be removed from the results table with the _Mark as fixed_ button. 
* Added section for links blocked by robots.txt and a _Mark as working_ button to mark them as working after a manual check.
* Added common status code information.
* Broken links in the result table are linked now for the case that someone likes to verify that a link is really broken.
* Set default concurrent connections to three.
* Improved user interface.

= 1.4.1 =
*Release Date - 11th February, 2018*

* Improvements to the crawler.
* Updated compatibility information (tested up to WordPress 4.9).
* Bugfixes
	* Fixed returned status code of failing proxy requests.
	* fixed call to wp_die()

= 1.4.0 =
*Release Date - 14th September, 2016*

* Added news subpage.
* Added custom status codes documentation.

= 1.3.0 =
*Release Date - 12th July, 2016*

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

