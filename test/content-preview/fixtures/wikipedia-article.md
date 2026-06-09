[Jump to content](#bodyContent)

Main menu

move to sidebar
hide

Navigation

* [Main page](/wiki/Main_Page "Visit the main page [ctrl-option-z]")
* [Contents](/wiki/Wikipedia:Contents "Guides to browsing Wikipedia")
* [Current events](/wiki/Portal:Current_events "Articles related to current events")
* [Random article](/wiki/Special:Random "Visit a randomly selected article [ctrl-option-x]")
* [About Wikipedia](/wiki/Wikipedia:About "Learn about Wikipedia and how it works")
* [Contact us](//en.wikipedia.org/wiki/Wikipedia:Contact_us "How to contact Wikipedia")

Contribute

* [Help](/wiki/Help:Contents "Guidance on how to use and edit Wikipedia")
* [Learn to edit](/wiki/Help:Introduction "Learn how to edit Wikipedia")
* [Community portal](/wiki/Wikipedia:Community_portal "The hub for editors")
* [Recent changes](/wiki/Special:RecentChanges "A list of recent changes to Wikipedia [ctrl-option-r]")
* [Upload file](/wiki/Wikipedia:File_upload_wizard "Add images or other media for use on Wikipedia")
* [Special pages](/wiki/Special:SpecialPages "A list of all special pages [ctrl-option-q]")

[![Wikipedia](/static/images/mobile/copyright/wikipedia-wordmark-en-25.svg)](/wiki/Main_Page)

[Search](/wiki/Special:Search "Search Wikipedia [ctrl-option-f]")

Search

* [Donate](https://donate.wikimedia.org/?wmf_source=donate&wmf_medium=sidebar&wmf_campaign=en.wikipedia.org&uselang=en)
* [Create account](/w/index.php?title=Special:CreateAccount&returnto=Web+scraping "You are encouraged to create an account and log in; however, it is not mandatory")
* [Log in](/w/index.php?title=Special:UserLogin&returnto=Web+scraping "You're encouraged to log in; however, it's not mandatory. [ctrl-option-o]")

* [Donate](https://donate.wikimedia.org/?wmf_source=donate&wmf_medium=sidebar&wmf_campaign=en.wikipedia.org&uselang=en)
* [Create account](/w/index.php?title=Special:CreateAccount&returnto=Web+scraping "You are encouraged to create an account and log in; however, it is not mandatory")
* [Log in](/w/index.php?title=Special:UserLogin&returnto=Web+scraping "You're encouraged to log in; however, it's not mandatory. [ctrl-option-o]")

Contents
--------

move to sidebar
hide

* [(Top)](#)
* [1
  History](#History)
* [2
  Techniques](#Techniques)


  Toggle Techniques subsection
  + [2.1
    Human copy-and-paste](#Human_copy-and-paste)
  + [2.2
    Text pattern matching](#Text_pattern_matching)
  + [2.3
    HTTP programming](#HTTP_programming)
  + [2.4
    HTML parsing](#HTML_parsing)
  + [2.5
    DOM parsing](#DOM_parsing)
  + [2.6
    Vertical aggregation](#Vertical_aggregation)
  + [2.7
    Semantic annotation recognizing](#Semantic_annotation_recognizing)
  + [2.8
    Computer vision web-page analysis](#Computer_vision_web-page_analysis)
* [3
  Legal issues](#Legal_issues)


  Toggle Legal issues subsection
  + [3.1
    United States](#United_States)
  + [3.2
    European Union](#European_Union)
  + [3.3
    Australia](#Australia)
  + [3.4
    India](#India)
* [4
  Methods to prevent web scraping](#Methods_to_prevent_web_scraping)
* [5
  See also](#See_also)
* [6
  References](#References)

Web scraping
============

* [العربية](https://ar.wikipedia.org/wiki/%D8%AA%D8%AC%D8%B1%D9%8A%D9%81_%D9%88%D9%8A%D8%A8 "تجريف ويب – Arabic")
* [الدارجة](https://ary.wikipedia.org/wiki/%D8%AA%D8%BA%D8%B1%D8%A7%D9%81_%D9%84%D9%88%D9%8A%D8%A8 "تغراف لويب – Moroccan Arabic")
* [Català](https://ca.wikipedia.org/wiki/Web_scraping "Web scraping – Catalan")
* [Čeština](https://cs.wikipedia.org/wiki/Web_scraping "Web scraping – Czech")
* [Deutsch](https://de.wikipedia.org/wiki/Screen_Scraping "Screen Scraping – German")
* [Español](https://es.wikipedia.org/wiki/Web_scraping "Web scraping – Spanish")
* [Euskara](https://eu.wikipedia.org/wiki/Web_scraping "Web scraping – Basque")
* [فارسی](https://fa.wikipedia.org/wiki/%D8%AA%D8%B1%D8%A7%D8%B4%DB%8C%D8%AF%D9%86_%D9%88%D8%A8 "تراشیدن وب – Persian")
* [Français](https://fr.wikipedia.org/wiki/Web_scraping "Web scraping – French")
* [Bahasa Indonesia](https://id.wikipedia.org/wiki/Penggalian_web "Penggalian web – Indonesian")
* [Íslenska](https://is.wikipedia.org/wiki/Vefs%C3%B6fnun "Vefsöfnun – Icelandic")
* [Italiano](https://it.wikipedia.org/wiki/Web_scraping "Web scraping – Italian")
* [日本語](https://ja.wikipedia.org/wiki/%E3%82%A6%E3%82%A7%E3%83%96%E3%82%B9%E3%82%AF%E3%83%AC%E3%82%A4%E3%83%94%E3%83%B3%E3%82%B0 "ウェブスクレイピング – Japanese")
* [한국어](https://ko.wikipedia.org/wiki/%EC%9B%B9_%EC%8A%A4%ED%81%AC%EB%9E%98%ED%95%91 "웹 스크래핑 – Korean")
* [Latviešu](https://lv.wikipedia.org/wiki/Rasmo%C5%A1ana "Rasmošana – Latvian")
* [Nederlands](https://nl.wikipedia.org/wiki/Scrapen "Scrapen – Dutch")
* [Português](https://pt.wikipedia.org/wiki/Web_scraping "Web scraping – Portuguese")
* [Русский](https://ru.wikipedia.org/wiki/%D0%92%D0%B5%D0%B1-%D1%81%D0%BA%D1%80%D0%B5%D0%B9%D0%BF%D0%B8%D0%BD%D0%B3 "Веб-скрейпинг – Russian")
* [Türkçe](https://tr.wikipedia.org/wiki/Web_kaz%C4%B1ma "Web kazıma – Turkish")
* [Українська](https://uk.wikipedia.org/wiki/Web_scraping "Web scraping – Ukrainian")
* [粵語](https://zh-yue.wikipedia.org/wiki/%E7%B6%B2%E9%A0%81%E5%88%AE%E6%96%99 "網頁刮料 – Cantonese")
* [中文](https://zh.wikipedia.org/wiki/%E7%BD%91%E9%A1%B5%E6%8A%93%E5%8F%96 "网页抓取 – Chinese")

[Edit links](https://www.wikidata.org/wiki/Special:EntityPage/Q665452#sitelinks-wikipedia "Edit interlanguage links")

* [Article](/wiki/Web_scraping "View the content page [ctrl-option-c]")
* [Talk](/wiki/Talk:Web_scraping "Discuss improvements to the content page [ctrl-option-t]")

* [Read](/wiki/Web_scraping)
* [Edit](/w/index.php?title=Web_scraping&action=edit "Edit this page [ctrl-option-e]")
* [View history](/w/index.php?title=Web_scraping&action=history "Past revisions of this page [ctrl-option-h]")

Tools

move to sidebar
hide

Actions

* [Read](/wiki/Web_scraping)
* [Edit](/w/index.php?title=Web_scraping&action=edit "Edit this page [ctrl-option-e]")
* [View history](/w/index.php?title=Web_scraping&action=history)

General

* [What links here](/wiki/Special:WhatLinksHere/Web_scraping "List of all English Wikipedia pages containing links to this page [ctrl-option-j]")
* [Related changes](/wiki/Special:RecentChangesLinked/Web_scraping "Recent changes in pages linked from this page [ctrl-option-k]")
* [Upload file](//en.wikipedia.org/wiki/Wikipedia:File_Upload_Wizard "Upload files [ctrl-option-u]")
* [Permanent link](https://en.wikipedia.org/w/index.php?title=Web_scraping&oldid=1355278840 "Permanent link to this revision of this page")
* [Page information](/w/index.php?title=Web_scraping&action=info "More information about this page")
* [Cite this page](/w/index.php?title=Special:CiteThisPage&page=Web_scraping&id=1355278840&wpFormIdentifier=titleform "Information on how to cite this page")
* [Get shortened URL](/w/index.php?title=Special:UrlShortener&url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FWeb_scraping)
* [Edit interlanguage links](https://www.wikidata.org/wiki/Special:EntityPage/Q665452#sitelinks-wikipedia "Edit interlanguage links")

Print/export

* [Download as PDF](/w/index.php?title=Special:DownloadAsPdf&page=Web_scraping&action=show-download-screen "Download this page as a PDF file")
* [Printable version](/w/index.php?title=Web_scraping&printable=yes "Printable version of this page [ctrl-option-p]")

In other projects

* [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Web_scraping)
* [Wikidata item](https://www.wikidata.org/wiki/Special:EntityPage/Q665452 "Structured data on this page hosted by Wikidata [ctrl-option-g]")

Appearance

move to sidebar
hide

Text

* Small

  Standard

  Large

This page always uses small font size

Width

* Standard

  Wide

The content is as wide as possible for your browser window.

Color

* Automatic

  Light

  Dark

This page is always in light mode.

From Wikipedia, the free encyclopedia

For broader coverage of this topic, see [Data scraping](/wiki/Data_scraping "Data scraping").

"Web scraper" redirects here. For websites that scrape content, see [Scraper site](/wiki/Scraper_site "Scraper site").

|  |  |
| --- | --- |
| [icon](/wiki/File:Question_book-new.svg) | This article **needs additional citations for [verification](/wiki/Wikipedia:Verifiability "Wikipedia:Verifiability")**. Please help [improve this article](/wiki/Special:EditPage/Web_scraping "Special:EditPage/Web scraping") by [adding citations to reliable sources](/wiki/Help:Referencing_for_beginners "Help:Referencing for beginners"). Unsourced material may be challenged and removed. *Find sources:* ["Web scraping"](https://www.google.com/search?as_eq=wikipedia&q=%22Web+scraping%22) – [news](https://www.google.com/search?tbm=nws&q=%22Web+scraping%22+-wikipedia&tbs=ar:1) **·** [newspapers](https://www.google.com/search?&q=%22Web+scraping%22&tbs=bkt:s&tbm=bks) **·** [books](https://www.google.com/search?tbs=bks:1&q=%22Web+scraping%22+-wikipedia) **·** [scholar](https://scholar.google.com/scholar?q=%22Web+scraping%22) **·** [JSTOR](https://www.jstor.org/action/doBasicSearch?Query=%22Web+scraping%22&acc=on&wc=on) *(April 2023)* *([Learn how and when to remove this message](/wiki/Help:Maintenance_template_removal "Help:Maintenance template removal"))* |

**Web scraping**, **web harvesting**, or **web data extraction** is [data scraping](/wiki/Data_scraping "Data scraping") used for [extracting data](/wiki/Data_extraction "Data extraction") from [websites](/wiki/Website "Website").[[1]](#cite_note-1) Web scraping software may directly access the [World Wide Web](/wiki/World_Wide_Web "World Wide Web") using the [Hypertext Transfer Protocol](/wiki/Hypertext_Transfer_Protocol "Hypertext Transfer Protocol") or a web browser. While web scraping can be done manually by a software user, the term typically refers to automated processes implemented using a [bot](/wiki/Internet_bot "Internet bot") or [web crawler](/wiki/Web_crawler "Web crawler"). It is a form of copying in which specific data is gathered and copied from the web, typically into a central local [database](/wiki/Database "Database") or [spreadsheet](/wiki/Spreadsheet "Spreadsheet"), for later [retrieval](/wiki/Data_retrieval "Data retrieval") or [analysis](/wiki/Data_analysis "Data analysis").

Scraping a web page involves fetching it and then extracting data from it. Fetching is the downloading of a page (which a browser does when a user views a page). Therefore, web crawling is a main component of web scraping, to fetch pages for later processing. Having fetched, extraction can take place. The content of a page may be [parsed](/wiki/Parsing "Parsing"), searched and reformatted, and its data copied into a spreadsheet or loaded into a database. Web scrapers typically take something out of a page, to make use of it for another purpose somewhere else. An example would be finding and copying names and telephone numbers, companies and their URLs, or e-mail addresses to a list (contact scraping). Another example is collecting competitors product prices for marketing purposes, which can involve gathering large-scale pricing datasets from e-commerce websites and analysing them using data science techniques such as trend analysis, predictive modelling, and competitive benchmarking.

[Contact scraping](/wiki/Contact_scraping "Contact scraping") is a type of web scraping that is used as a component of applications used for [web indexing](/wiki/Web_indexing "Web indexing"), [web mining](/wiki/Web_mining "Web mining") and [data mining](/wiki/Data_mining "Data mining"), online price change monitoring and [price comparison](/wiki/Comparison_shopping_website "Comparison shopping website"), product review scraping (to watch the competition), gathering real estate listings, weather data monitoring, [website change detection](/wiki/Change_detection_and_notification "Change detection and notification"), research, tracking online presence and reputation, [web mashup](/wiki/Web_mashup "Web mashup"), and [web data integration](/wiki/Web_data_integration "Web data integration").

[Web pages](/wiki/Web_page "Web page") are built using text-based [markup languages](/wiki/Markup_languages "Markup languages") ([HTML](/wiki/HTML "HTML") and [XHTML](/wiki/XHTML "XHTML")), and frequently contain a wealth of data in text form. However, most web pages are designed for human [end-users](/wiki/End-user_(computer_science) "End-user (computer science)") and not for ease of automated use. As a result, specialized tools and software have been developed to facilitate the scraping of web pages. Web scraping applications include [market research](/wiki/Market_research "Market research"), price comparison, content monitoring and [artificial intelligence](/wiki/Artificial_intelligence "Artificial intelligence"). Businesses rely on web scraping services to efficiently gather and utilize this data.

Newer forms of web scraping involve monitoring [data feeds](/wiki/Data_feed "Data feed") from [web servers](/wiki/Web_servers "Web servers"). For example, [JSON](/wiki/JSON "JSON") is commonly used as a transport mechanism between the client and the web server.

There are methods that some websites use to prevent web scraping, such as detecting and disallowing bots from crawling (viewing) their pages. In response, web scraping systems use techniques involving [DOM](/wiki/Document_Object_Model "Document Object Model") parsing, [computer vision](/wiki/Computer_vision "Computer vision") and [natural language processing](/wiki/Natural_language_processing "Natural language processing") to simulate human-like browsing to enable gathering web page content for offline parsing.

History
-------

[[edit](/w/index.php?title=Web_scraping&action=edit&section=1 "Edit section: History")]

After the [birth of the World Wide Web](/wiki/History_of_the_World_Wide_Web "History of the World Wide Web") in 1989, the first web robot,[[2]](#cite_note-2)[World Wide Web Wanderer](/wiki/World_Wide_Web_Wanderer "World Wide Web Wanderer"), was created in June 1993, which was intended only to measure the size of the web.

In December 1993, the first crawler-based web search engine, [JumpStation](/wiki/JumpStation "JumpStation"), was launched.[*[citation needed](/wiki/Wikipedia:Citation_needed "Wikipedia:Citation needed")*] As there were fewer websites available on the web, search engines at that time used to rely on human administrators to collect and format links. In comparison, Jump Station was the first WWW search engine to rely on a web robot.

In 2000, the first Web [API](/wiki/API "API") and [API](/wiki/API "API") crawler were created. In 2000, [Salesforce](/wiki/Salesforce.com "Salesforce.com") and [eBay](/wiki/EBay "EBay") launched their own API, with which programmers could access and download some of the data available to the public.[[3]](#cite_note-3) Since then, many websites offer web APIs for people to access their public database.

Techniques
----------

[[edit](/w/index.php?title=Web_scraping&action=edit&section=2 "Edit section: Techniques")]

|  |  |
| --- | --- |
|  | This section **contains [instructions or advice](/wiki/Wikipedia:What_Wikipedia_is_not#GUIDE "Wikipedia:What Wikipedia is not")**. Wikipedia is not a guidebook; please help [rewrite such content](https://en.wikipedia.org/w/index.php?title=Web_scraping&action=edit) to be encyclopedic or move it to [Wikiversity](https://en.wikiversity.org/wiki/ "v:"), [Wikibooks](https://en.wikibooks.org/wiki/ "b:"), or [Wikivoyage](https://en.wikivoyage.org/wiki/ "voy:"). *(October 2025)* |

Data extraction techniques range from manual collection to sophisticated automated systems. Advanced methods analyze the underlying structure of web pages to transform unstructured content into a [machine-readable format](/wiki/Machine-readable_medium_and_data "Machine-readable medium and data"). These techniques utilize [text processing](/wiki/Text_processing "Text processing") or [artificial intelligence](/wiki/Artificial_intelligence "Artificial intelligence"), aligning with the technical goals of the [Semantic Web](/wiki/Semantic_Web "Semantic Web").

### Human copy-and-paste

[[edit](/w/index.php?title=Web_scraping&action=edit&section=3 "Edit section: Human copy-and-paste")]

The simplest form of web scraping is manual copying and pasting of data from a web page into a text file or spreadsheet. This approach requires no technical tools and can be used when automated scraping is blocked by website restrictions or when human judgment is necessary to interpret complex content. However, manual scraping is highly inefficient for large datasets, as it is time-consuming, prone to human error, and mentally exhausting. For this reason, it is generally considered impractical compared to automated methods, except in cases where automation is not feasible.

### Text pattern matching

[[edit](/w/index.php?title=Web_scraping&action=edit&section=4 "Edit section: Text pattern matching")]

A simple approach to extract information from web pages is to use the UNIX [grep](/wiki/Grep "Grep") command or [regular expression](/wiki/Regular_expression "Regular expression")-matching facilities of programming languages (for instance [Perl](/wiki/Perl "Perl") or [Python](/wiki/Python_(programming_language) "Python (programming language)")), in order to find text matching a specified pattern.

### HTTP programming

[[edit](/w/index.php?title=Web_scraping&action=edit&section=5 "Edit section: HTTP programming")]

[Static](/wiki/Static_web_page "Static web page") and [dynamic web pages](/wiki/Dynamic_web_page "Dynamic web page") can be retrieved by posting HTTP requests to the remote web server using [socket programming](/wiki/Socket_programming "Socket programming").

### HTML parsing

[[edit](/w/index.php?title=Web_scraping&action=edit&section=6 "Edit section: HTML parsing")]

Many websites have large collections of pages generated dynamically from an underlying structured source, like a database. Data of the same category are typically encoded into similar pages by a common script or template. In data mining, a program that detects such templates in a particular information source, extracts its content, and translates it into a relational form, is called a [wrapper](/wiki/Wrapper_(data_mining) "Wrapper (data mining)"). Wrapper generation algorithms assume that input pages of a wrapper induction system conform to a common template and that they can be easily identified in terms of a URL common scheme.[[4]](#cite_note-4) Moreover, some [semi-structured data](/wiki/Semi-structured_data "Semi-structured data") query languages, such as [XQuery](/wiki/XQuery "XQuery") and the HTQL, can be used to parse HTML pages and to retrieve and transform page content.

### DOM parsing

[[edit](/w/index.php?title=Web_scraping&action=edit&section=7 "Edit section: DOM parsing")]

Further information: [Document Object Model](/wiki/Document_Object_Model "Document Object Model")

By using a program such as [Selenium](/wiki/Selenium_(software) "Selenium (software)") or [Playwright](/wiki/Playwright_(software) "Playwright (software)"), developers can control a web browser such as [Chrome](/wiki/ChromeOS "ChromeOS") or [Firefox](/wiki/Firefox "Firefox") to load, navigate, and retrieve data from websites. This method can be especially useful for scraping data from dynamic sites since a web browser will fully load each page. Once an entire page is loaded, developers can access and parse the [DOM](/wiki/Document_Object_Model "Document Object Model") using an expression language such as [XPath](/wiki/XPath "XPath").

### Vertical aggregation

[[edit](/w/index.php?title=Web_scraping&action=edit&section=8 "Edit section: Vertical aggregation")]

There are several companies that have developed vertical specific harvesting platforms. These platforms create and monitor a multitude of "bots" for specific verticals with no "man in the loop" (no direct human involvement), and no work related to a specific target site. The preparation involves establishing the knowledge base for the entire vertical and then the platform creates the bots automatically. The platform's robustness is measured by the quality of the information it retrieves (usually number of fields) and its scalability (how quick it can scale up to hundreds or thousands of sites). This scalability is mostly used to target the [Long Tail](/wiki/Long_Tail "Long Tail") of sites that common aggregators find complicated or too labor-intensive to harvest content from.

### Semantic annotation recognizing

[[edit](/w/index.php?title=Web_scraping&action=edit&section=9 "Edit section: Semantic annotation recognizing")]

The pages being scraped may embrace [metadata](/wiki/Metadata "Metadata") or semantic markups and annotations, which can be used to locate specific data snippets. If the annotations are embedded in the pages, as [Microformat](/wiki/Microformat "Microformat") does, this technique can be viewed as a special case of DOM parsing. In another case, the annotations, organized into a semantic layer,[[5]](#cite_note-5) are stored and managed separately from the web pages, so the scrapers can retrieve data schema and instructions from this layer before scraping the pages.

### Computer vision web-page analysis

[[edit](/w/index.php?title=Web_scraping&action=edit&section=10 "Edit section: Computer vision web-page analysis")]

There are efforts using [machine learning](/wiki/Machine_learning "Machine learning") and [computer vision](/wiki/Computer_vision "Computer vision") that attempt to identify and extract information from web pages by interpreting pages visually as a human being might.[[6]](#cite_note-6)

Legal issues
------------

[[edit](/w/index.php?title=Web_scraping&action=edit&section=11 "Edit section: Legal issues")]

|  |  |
| --- | --- |
| Globe icon. | The examples and perspective in this section **deal primarily with the United States and do not represent a [worldwide view](/wiki/Wikipedia:WikiProject_Countering_systemic_bias "Wikipedia:WikiProject Countering systemic bias") of the subject**. You may [improve this section](https://en.wikipedia.org/w/index.php?title=Web_scraping&action=edit), discuss the issue on the [talk page](/wiki/Talk:Web_scraping "Talk:Web scraping"), or create a new section, as appropriate. *(October 2015)* *([Learn how and when to remove this message](/wiki/Help:Maintenance_template_removal "Help:Maintenance template removal"))* |

The legality of web scraping varies across the world. In general, web scraping may be against the [terms of service](/wiki/Terms_of_service "Terms of service") of some websites, but the enforceability of these terms is unclear.[[7]](#cite_note-7)

### United States

[[edit](/w/index.php?title=Web_scraping&action=edit&section=12 "Edit section: United States")]

In the United States, website owners can use three major [legal claims](/wiki/Cause_of_action "Cause of action") to prevent undesired web scraping: (1) copyright infringement (compilation), (2) violation of the [Computer Fraud and Abuse Act](/wiki/Computer_Fraud_and_Abuse_Act "Computer Fraud and Abuse Act") ("CFAA"), and (3) [trespass to chattel](/wiki/Trespass_to_chattels "Trespass to chattels").[[8]](#cite_note-8) However, the effectiveness of these claims relies upon meeting various criteria, and the case law is still evolving. For example, with regard to copyright, while outright duplication of original expression will in many cases be illegal, in the United States the courts ruled in [*Feist Publications v. Rural Telephone Service*](/wiki/Feist_Publications,_Inc.,_v._Rural_Telephone_Service_Co. "Feist Publications, Inc., v. Rural Telephone Service Co.") that duplication of facts is allowable.

U.S. courts have acknowledged that users of "scrapers" or "robots" may be held liable for committing [trespass to chattels](/wiki/Trespass_to_chattels "Trespass to chattels"),[[9]](#cite_note-9)[[10]](#cite_note-10) which involves a computer system itself being considered personal property upon which the user of a scraper is trespassing. The best known of these cases, *[eBay v. Bidder's Edge](/wiki/EBay_v._Bidder%27s_Edge "EBay v. Bidder's Edge")*, resulted in an injunction ordering Bidder's Edge to stop accessing, collecting, and indexing auctions from the eBay web site. This case involved automatic placing of bids, known as [auction sniping](/wiki/Auction_sniping "Auction sniping"). However, in order to succeed on a claim of trespass to [chattels](/wiki/Personal_property "Personal property"), the [plaintiff](/wiki/Plaintiff "Plaintiff") must demonstrate that the [defendant](/wiki/Defendant "Defendant") intentionally and without authorization interfered with the plaintiff's possessory interest in the computer system and that the defendant's unauthorized use caused damage to the plaintiff. Not all cases of web spidering brought before the courts have been considered trespass to chattels.[[11]](#cite_note-11)

One of the first major tests of [screen scraping](/wiki/Screen_scraping "Screen scraping") involved [American Airlines](/wiki/American_Airlines "American Airlines") (AA), and a firm called FareChase.[[12]](#cite_note-12) AA successfully obtained an [injunction](/wiki/Injunction "Injunction") from a Texas trial court, stopping FareChase from selling software that enables users to compare online fares if the software also searches AA's website. The airline argued that FareChase's websearch software trespassed on AA's servers when it collected the publicly available data. FareChase filed an appeal in March 2003. By June, FareChase and AA agreed to settle and the appeal was dropped.[[13]](#cite_note-13)

[Southwest Airlines](/wiki/Southwest_Airlines "Southwest Airlines") has also challenged screen-scraping practices, and has involved both FareChase and another firm, Outtask, in a legal claim. Southwest Airlines charged that the screen-scraping is Illegal since it is an example of "Computer Fraud and Abuse" and has led to "Damage and Loss" and "Unauthorized Access" of Southwest's site. It also constitutes "Interference with Business Relations", "Trespass", and "Harmful Access by Computer". They also claimed that screen-scraping constitutes what is legally known as "Misappropriation and Unjust Enrichment", as well as being a breach of the web site's user agreement. Outtask denied all these claims, claiming that the prevailing law, in this case, should be [US Copyright law](/wiki/US_Copyright_law "US Copyright law") and that under copyright, the pieces of information being scraped would not be subject to copyright protection. Although the cases were never resolved in the [Supreme Court of the United States](/wiki/Supreme_Court_of_the_United_States "Supreme Court of the United States"), FareChase was eventually shuttered by parent company [Yahoo!](/wiki/Yahoo! "Yahoo!"), and Outtask was purchased by travel expense company Concur.[[14]](#cite_note-impervawp2011-14)
In 2012, a startup called 3Taps scraped classified housing ads from Craigslist. Craigslist sent 3Taps a cease-and-desist letter and blocked their IP addresses and later sued, in *[Craigslist v. 3Taps](/wiki/Craigslist_v._3Taps "Craigslist v. 3Taps")*. The court held that the cease-and-desist letter and IP blocking was sufficient for Craigslist to properly claim that 3Taps had violated the [Computer Fraud and Abuse Act](/wiki/Computer_Fraud_and_Abuse_Act "Computer Fraud and Abuse Act") (CFAA).

Although these are early scraping decisions, and the theories of liability are not uniform, it is difficult to ignore a pattern emerging that the courts are prepared to protect proprietary content on commercial sites from uses which are undesirable to the owners of such sites. However, the degree of protection for such content is not settled and will depend on the type of access made by the scraper, the amount of information accessed and copied, the degree to which the access adversely affects the site owner's system and the types and manner of prohibitions on such conduct.[[15]](#cite_note-15)

While the law in this area becomes more settled, entities contemplating using scraping programs to access a public web site should also consider whether such action is authorized by reviewing the terms of use and other terms or notices posted on or made available through the site. In *[Cvent Inc.](/wiki/Cvent "Cvent") v. [Eventbrite Inc.](/wiki/Eventbrite "Eventbrite")* (2010), the United States [district court for the eastern district of Virginia](/wiki/United_States_District_Court_for_the_Eastern_District_of_Virginia "United States District Court for the Eastern District of Virginia"), ruled that the terms of use should be brought to the users' attention in order for a [browsewrap](/wiki/Browsewrap "Browsewrap") contract or license to be enforceable.[[16]](#cite_note-16) In a 2014 case, filed in the [United States District Court for the Eastern District of Pennsylvania](/wiki/United_States_District_Court_for_the_Eastern_District_of_Pennsylvania "United States District Court for the Eastern District of Pennsylvania"),[[17]](#cite_note-17) e-commerce site [QVC](/wiki/QVC "QVC") objected to the Pinterest-like shopping aggregator Resultly's 'scraping of QVC's site for real-time pricing data. QVC alleges that Resultly "excessively crawled" QVC's retail site (allegedly sending 200-300 search requests to QVC's website per minute, sometimes to up to 36,000 requests per minute) which caused QVC's site to crash for two days, resulting in lost sales for QVC.[[18]](#cite_note-18) QVC's complaint alleges that the defendant disguised its web crawler to mask its source IP address and thus prevented QVC from quickly repairing the problem. This is a particularly interesting scraping case because QVC is seeking damages for the unavailability of their website, which QVC claims was caused by Resultly.

In the plaintiff's web site during the period of this trial, the terms of use link are displayed among all the links of the site, at the bottom of the page as most sites on the internet. This ruling contradicts the Irish ruling described below. The court also rejected the plaintiff's argument that the browse-wrap restrictions were enforceable in view of Virginia's adoption of the Uniform Computer Information Transactions Act (UCITA)—a uniform law that many believed was in favor on common browse-wrap contracting practices.[[19]](#cite_note-19)

In *[Facebook, Inc. v. Power Ventures, Inc.](/wiki/Facebook,_Inc._v._Power_Ventures,_Inc. "Facebook, Inc. v. Power Ventures, Inc.")*, a district court ruled in 2012 that Power Ventures could not scrape Facebook pages on behalf of a Facebook user. The case is on appeal, and the [Electronic Frontier Foundation](/wiki/Electronic_Frontier_Foundation "Electronic Frontier Foundation") filed a brief in 2015 asking that it be overturned.[[20]](#cite_note-20)[[21]](#cite_note-21) In *[Associated Press v. Meltwater U.S. Holdings, Inc.](/wiki/Associated_Press_v._Meltwater_U.S._Holdings,_Inc. "Associated Press v. Meltwater U.S. Holdings, Inc.")*, a court in the US held Meltwater liable for scraping and republishing news information from the Associated Press, but a court in the United Kingdom held in favor of Meltwater.

The [Ninth Circuit](/wiki/Ninth_Circuit "Ninth Circuit") ruled in 2019 that web scraping did not violate the CFAA in *[hiQ Labs v. LinkedIn](/wiki/HiQ_Labs_v._LinkedIn "HiQ Labs v. LinkedIn")*. The case was appealed to the [United States Supreme Court](/wiki/United_States_Supreme_Court "United States Supreme Court"), which returned the case to the Ninth Circuit to reconsider the case in light of the 2021 Supreme Court decision in *[Van Buren v. United States](/wiki/Van_Buren_v._United_States "Van Buren v. United States")* which narrowed the applicability of the CFAA.[[22]](#cite_note-22) On this review, the Ninth Circuit upheld their prior decision.[[23]](#cite_note-23)

[Internet Archive](/wiki/Internet_Archive "Internet Archive") collects and distributes a significant number of publicly available web pages without being considered to be in violation of copyright laws.[*[citation needed](/wiki/Wikipedia:Citation_needed "Wikipedia:Citation needed")*]

### European Union

[[edit](/w/index.php?title=Web_scraping&action=edit&section=13 "Edit section: European Union")]

In February 2006, the [Danish Maritime and Commercial Court](/wiki/Maritime_and_Commercial_Court_(Denmark) "Maritime and Commercial Court (Denmark)") (Copenhagen) ruled that systematic crawling, indexing, and deep linking by portal site ofir.dk of real estate site Home.dk does not conflict with Danish law or the database directive of the European Union.[[24]](#cite_note-24)

Ethical data scraping supports offmarket sourcing in business but must comply with GDPR to avoid privacy violations in automated data collection.[[25]](#cite_note-25)

In a February 2010 case complicated by matters of jurisdiction, Ireland's High Court delivered a verdict that illustrates the [inchoate](/wiki/Inchoate_offense "Inchoate offense") state of developing case law. In the case of *Ryanair Ltd v Billigfluege.de GmbH*, Ireland's High Court ruled [Ryanair's](/wiki/Ryanair "Ryanair") "[click-wrap](/wiki/Clickwrap "Clickwrap")" agreement to be legally binding. In contrast to the findings of the United States District Court Eastern District of Virginia and those of the Danish Maritime and Commercial Court, Justice [Michael Hanna](/wiki/Michael_Hanna_(judge) "Michael Hanna (judge)") ruled that the hyperlink to Ryanair's terms and conditions was plainly visible, and that placing the onus on the user to agree to terms and conditions in order to gain access to online services is sufficient to comprise a contractual relationship.[[26]](#cite_note-26) The decision is under appeal in Ireland's Supreme Court.[[27]](#cite_note-27)

On April 30, 2020, the French Data Protection Authority (CNIL) released new guidelines on web scraping.[[28]](#cite_note-28) The CNIL guidelines made it clear that publicly available data is still personal data and cannot be repurposed without the knowledge of the person to whom that data belongs.[[29]](#cite_note-29)

### Australia

[[edit](/w/index.php?title=Web_scraping&action=edit&section=14 "Edit section: Australia")]

In Australia, the [Spam Act 2003](/wiki/Spam_Act_2003 "Spam Act 2003") outlaws some forms of web harvesting, although this only applies to email addresses.[[30]](#cite_note-30)[[31]](#cite_note-31)

### India

[[edit](/w/index.php?title=Web_scraping&action=edit&section=15 "Edit section: India")]

Besides a few cases dealing with IPR infringement, Indian courts have not expressly ruled on the legality of web scraping. However, since all common forms of electronic contracts are enforceable in India, violating the terms of use prohibiting data scraping will be a violation of the contract law. It will also violate the [Information Technology Act, 2000](/wiki/Information_Technology_Act,_2000#:~:text=From_Wikipedia,_the_free_encyclopedia_The_Information_Technology,in_India_dealing_with_cybercrime_and_electronic_commerce. "Information Technology Act, 2000"), which penalizes unauthorized access to a computer resource or extracting data from a computer resource.

Methods to prevent web scraping
-------------------------------

[[edit](/w/index.php?title=Web_scraping&action=edit&section=16 "Edit section: Methods to prevent web scraping")]

The administrator of a website can use various measures to stop or slow a bot. Some techniques include:

* Blocking an [IP address](/wiki/IP_address "IP address") either manually or based on criteria such as [geolocation](/wiki/Geolocation "Geolocation") and [DNSRBL](/wiki/DNSBL "DNSBL"). This will also block all browsing from that address.
* Disabling any [web service](/wiki/Web_service "Web service") [API](/wiki/Application_programming_interface "Application programming interface") that the website's system might expose.
* Bots sometimes declare who they are (using [user agent](/wiki/User_agent "User agent") [strings](/wiki/String_(computer_science) "String (computer science)")) and can be blocked on that basis using [robots.txt](/wiki/Robots_exclusion_standard "Robots exclusion standard"); '[googlebot](/wiki/Googlebot "Googlebot")' is an example. Other bots make no distinction between themselves and a human using a browser.
* Bots can be blocked by monitoring excess traffic.
* Bots can sometimes be blocked with tools to verify that it is a real person accessing the site, like a [CAPTCHA](/wiki/CAPTCHA "CAPTCHA"). Bots are sometimes coded to explicitly break specific CAPTCHA patterns or may employ third-party services that utilize human labor to read and respond in real-time to CAPTCHA challenges. They can be triggered because the bot is: 1) making too many requests in a short time, 2) using low-quality proxies, or 3) not covering the web scraper’s fingerprint properly.[[32]](#cite_note-32)
* Commercial anti-bot services: Companies offer anti-bot and anti-scraping services for websites. A few web [application firewalls](/wiki/Application_firewall "Application firewall") have limited bot detection capabilities as well. However, many such solutions are not very effective.[[33]](#cite_note-33)
* Locating bots with a [honeypot](/wiki/Honeypot_(computing) "Honeypot (computing)") or other method to identify the IP addresses of automated crawlers.
* [Obfuscation](/wiki/Obfuscation "Obfuscation") using [CSS sprites](/wiki/CSS_sprite "CSS sprite") to display such data as telephone numbers or email addresses, at the cost of [accessibility](/wiki/Web_accessibility "Web accessibility") to [screen reader](/wiki/Screen_reader "Screen reader") users.
* Because bots rely on consistency in the front-end code of a target website, adding small variations to the HTML/CSS surrounding important data and navigation elements would require more human involvement in the initial set up of a bot and if done effectively may render the target website too difficult to scrape due to the diminished ability to automate the scraping process.[[34]](#cite_note-34)
* Websites can declare if crawling is allowed or not in the [robots.txt](/wiki/Robots_exclusion_standard "Robots exclusion standard") file and allow partial access, limit the crawl rate, specify the optimal time to crawl and more.
* Trapping bots in a [tarpit](/wiki/Tarpit_(networking) "Tarpit (networking)"), feeding them nonsensical data to [poison their dataset](/wiki/Data_poisoning "Data poisoning"). This method is particularly effective against bots which ignore robots.txt files.[[35]](#cite_note-35)
* TLS Fingerprinting: Modern security systems analyze the [Transport Layer Security](/wiki/Transport_Layer_Security "Transport Layer Security") (TLS) handshake to identify the client application. Different clients (e.g., [Google Chrome](/wiki/Google_Chrome "Google Chrome") vs. a [Python](/wiki/Python_(programming_language) "Python (programming language)") script) send [cryptographic ciphers](/wiki/Cipher_suite "Cipher suite") and extensions in unique orders. This creates a unique "fingerprint" (such as a JA3 signature) that allows servers to detect and block automated scripts regardless of their [IP address](/wiki/IP_address "IP address").[[36]](#cite_note-SalesforceJA3-36)[[37]](#cite_note-HasDataTLS-37)

See also
--------

[[edit](/w/index.php?title=Web_scraping&action=edit&section=17 "Edit section: See also")]

* [![icon](//upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Crystal_Clear_app_linneighborhood.svg/40px-Crystal_Clear_app_linneighborhood.svg.png)](/wiki/File:Crystal_Clear_app_linneighborhood.svg)[Internet portal](/wiki/Portal:Internet "Portal:Internet")

* [Archive.today](/wiki/Archive.today "Archive.today")
* [Common Crawl Foundation](/wiki/Common_Crawl_Foundation "Common Crawl Foundation")
* [Comparison of feed aggregators](/wiki/Comparison_of_feed_aggregators "Comparison of feed aggregators")
* [Data scraping](/wiki/Data_scraping "Data scraping")
* [Data wrangling](/wiki/Data_wrangling "Data wrangling")
* [Importer](/wiki/Importer_(computing) "Importer (computing)")
* [Job wrapping](/wiki/Job_wrapping "Job wrapping")
* [Knowledge extraction](/wiki/Knowledge_extraction "Knowledge extraction")
* [OpenSocial](/wiki/OpenSocial "OpenSocial")
* [Scraper site](/wiki/Scraper_site "Scraper site")
* [Fake news website](/wiki/Fake_news_website "Fake news website")
* [Spamdexing](/wiki/Spamdexing "Spamdexing")
* [Domain name drop list](/wiki/Domain_name_drop_list "Domain name drop list")
* [Text corpus](/wiki/Text_corpus "Text corpus")
* [Web archiving](/wiki/Web_archiving "Web archiving")
* [Web crawler](/wiki/Web_crawler "Web crawler")
* [Offline reader](/wiki/Offline_reader "Offline reader")
* [Link farm](/wiki/Link_farm "Link farm") (blog network)
* [Search engine scraping](/wiki/Search_engine_scraping "Search engine scraping")
* [Web crawlers](/wiki/Category:Web_crawlers "Category:Web crawlers")

References
----------

[[edit](/w/index.php?title=Web_scraping&action=edit&section=18 "Edit section: References")]

1. **[^](#cite_ref-1 "Jump up")** Thapelo, Tsaone Swaabow; Namoshe, Molaletsa; Matsebe, Oduetse; Motshegwa, Tshiamo; Bopape, Mary-Jane Morongwa (2021-07-28). ["SASSCAL WebSAPI: A Web Scraping Application Programming Interface to Support Access to SASSCAL's Weather Data"](https://doi.org/10.5334%2Fdsj-2021-024). *Data Science Journal*. **20** 24. [doi](/wiki/Doi_(identifier) "Doi (identifier)"):[10.5334/dsj-2021-024](https://doi.org/10.5334%2Fdsj-2021-024). [ISSN](/wiki/ISSN_(identifier) "ISSN (identifier)") [1683-1470](https://search.worldcat.org/issn/1683-1470). [S2CID](/wiki/S2CID_(identifier) "S2CID (identifier)") [237719804](https://api.semanticscholar.org/CorpusID:237719804).
2. **[^](#cite_ref-2 "Jump up")** ["Search Engine History.com"](http://www.searchenginehistory.com/). *Search Engine History*. Retrieved November 26, 2019.
3. **[^](#cite_ref-3 "Jump up")** ["eBay, API's, and the Connected Web"](https://thehistoryoftheweb.com/ebay-apis-connected-web/). *THE HISTORY OF THE WEB*. 3 September 1995. Retrieved June 23, 2025.
4. **[^](#cite_ref-4 "Jump up")** Song, Ruihua; Microsoft Research (Sep 14, 2007). ["Joint optimization of wrapper generation and template detection"](https://web.archive.org/web/20161011080619/https://pdfs.semanticscholar.org/4fb4/3c5a212df751e84c3b2f8d29fabfe56c3616.pdf) (PDF). *Proceedings of the 13th ACM SIGKDD international conference on Knowledge discovery and data mining*. p. 894. [doi](/wiki/Doi_(identifier) "Doi (identifier)"):[10.1145/1281192.1281287](https://doi.org/10.1145%2F1281192.1281287). [ISBN](/wiki/ISBN_(identifier) "ISBN (identifier)") [9781595936097](/wiki/Special:BookSources/9781595936097 "Special:BookSources/9781595936097"). [S2CID](/wiki/S2CID_(identifier) "S2CID (identifier)") [833565](https://api.semanticscholar.org/CorpusID:833565). Archived from [the original](https://pdfs.semanticscholar.org/4fb4/3c5a212df751e84c3b2f8d29fabfe56c3616.pdf) (PDF) on October 11, 2016.
5. **[^](#cite_ref-5 "Jump up")** [Semantic annotation based web scraping](http://www.gooseeker.com/en/node/knowledgebase/freeformat)
6. **[^](#cite_ref-6 "Jump up")** Roush, Wade (2012-07-25). ["Diffbot Is Using Computer Vision to Reinvent the Semantic Web"](http://www.xconomy.com/san-francisco/2012/07/25/diffbot-is-using-computer-vision-to-reinvent-the-semantic-web/). *Xconomy*. www.xconomy.com. Retrieved 2013-03-15.
7. **[^](#cite_ref-7 "Jump up")** ["FAQ about linking – Are website terms of use binding contracts?"](https://web.archive.org/web/20020308222536/http://www.chillingeffects.org/linking/faq.cgi#QID596). www.chillingeffects.org. 2007-08-20. Archived from [the original](http://www.chillingeffects.org/linking/faq.cgi#QID596) on 2002-03-08. Retrieved 2007-08-20.
8. **[^](#cite_ref-8 "Jump up")** Kenneth, Hirschey, Jeffrey (2014-01-01). ["Symbiotic Relationships: Pragmatic Acceptance of Data Scraping"](http://scholarship.law.berkeley.edu/btlj/vol29/iss4/16/). *Berkeley Technology Law Journal*. **29** (4). [doi](/wiki/Doi_(identifier) "Doi (identifier)"):[10.15779/Z38B39B](https://doi.org/10.15779%2FZ38B39B). [ISSN](/wiki/ISSN_(identifier) "ISSN (identifier)") [1086-3818](https://search.worldcat.org/issn/1086-3818).`{{cite journal}}`: CS1 maint: multiple names: authors list ([link](/wiki/Category:CS1_maint:_multiple_names:_authors_list "Category:CS1 maint: multiple names: authors list"))
9. **[^](#cite_ref-9 "Jump up")** ["Internet Law, Ch. 06: Trespass to Chattels"](http://www.tomwbell.com/NetLaw/Ch06.html). www.tomwbell.com. 2007-08-20. Retrieved 2007-08-20.
10. **[^](#cite_ref-10 "Jump up")** ["What are the "trespass to chattels" claims some companies or website owners have brought?"](https://web.archive.org/web/20020308222536/http://www.chillingeffects.org/linking/faq.cgi#QID460). www.chillingeffects.org. 2007-08-20. Archived from [the original](http://www.chillingeffects.org/linking/faq.cgi#QID460) on 2002-03-08. Retrieved 2007-08-20.
11. **[^](#cite_ref-11 "Jump up")** ["Ticketmaster Corp. v. Tickets.com, Inc"](http://www.tomwbell.com/NetLaw/Ch07/Ticketmaster.html). 2007-08-20. Retrieved 2007-08-20.
12. **[^](#cite_ref-12 "Jump up")** ["American Airlines v. FareChase"](https://web.archive.org/web/20110723131832/http://www.fornova.net/documents/AAFareChase.pdf) (PDF). 2007-08-20. Archived from [the original](http://www.fornova.net/documents/AAFareChase.pdf) (PDF) on 2011-07-23. Retrieved 2007-08-20.
13. **[^](#cite_ref-13 "Jump up")** ["American Airlines, FareChase Settle Suit"](https://web.archive.org/web/20160305025808/http://www.thefreelibrary.com/American+Airlines,+FareChase+Settle+Suit.-a0103213546). The Free Library. 2003-06-13. Archived from [the original](http://www.thefreelibrary.com/American+Airlines,+FareChase+Settle+Suit.-a0103213546) on 2016-03-05. Retrieved 2012-02-26.
14. **[^](#cite_ref-impervawp2011_14-0 "Jump up")** Imperva (2011). [Detecting and Blocking Site Scraping Attacks](http://www.imperva.com/docs/WP_Detecting_and_Blocking_Site_Scraping_Attacks.pdf). Imperva white paper.
15. **[^](#cite_ref-15 "Jump up")** Adler, Kenneth A. (2003-07-29). ["Controversy Surrounds 'Screen Scrapers': Software Helps Users Access Web Sites But Activity by Competitors Comes Under Scrutiny"](https://web.archive.org/web/20110211123854/http://library.findlaw.com/2003/Jul/29/132944.html). Archived from [the original](http://library.findlaw.com/2003/Jul/29/132944.html) on 2011-02-11. Retrieved 2010-10-27.
16. **[^](#cite_ref-16 "Jump up")** ["CVENT, Inc. v. Eventbrite, Inc.,et al"](https://web.archive.org/web/20130921054619/http://www.fornova.net/documents/Cvent.pdf) (PDF). 2014-11-24. Archived from [the original](http://www.fornova.net/documents/Cvent.pdf) (PDF) on 2013-09-21. Retrieved 2015-11-05.
17. **[^](#cite_ref-17 "Jump up")** ["QVC Inc. v. Resultly LLC, No. 14-06714 (E.D. Pa. filed Nov. 24, 2014)"](https://www.scribd.com/doc/249068700/LinkedIn-v-Resultly-LLC-Complaint?secret_password=pEVKDbnvhQL52oKfdrmT). *United States District Court for the Eastern District of Pennsylvania*. Retrieved 5 November 2015.
18. **[^](#cite_ref-18 "Jump up")** Neuburger, Jeffrey D (5 December 2014). ["QVC Sues Shopping App for Web Scraping That Allegedly Triggered Site Outage"](http://newmedialaw.proskauer.com/2014/12/05/qvc-sues-shopping-app-for-web-scraping-that-allegedly-triggered-site-outage/). *The National Law Review*. Proskauer Rose LLP. Retrieved 5 November 2015.
19. **[^](#cite_ref-19 "Jump up")** ["Did Iqbal/Twombly Raise the Bar for Browsewrap Claims?"](https://web.archive.org/web/20110723132015/http://www.fornova.net/documents/pblog-bna-com.pdf) (PDF). 2010-09-17. Archived from [the original](http://www.fornova.net/documents/pblog-bna-com.pdf) (PDF) on 2011-07-23. Retrieved 2010-10-27.
20. **[^](#cite_ref-20 "Jump up")** ["Can Scraping Non-Infringing Content Become Copyright Infringement... Because Of How Scrapers Work? | Techdirt"](https://www.techdirt.com/articles/20090605/2228205147.shtml). *Techdirt*. 2009-06-10. Retrieved 2016-05-24.
21. **[^](#cite_ref-21 "Jump up")** ["Facebook v. Power Ventures"](https://www.eff.org/cases/facebook-v-power-ventures). *Electronic Frontier Foundation*. July 2011. Retrieved 2016-05-24.
22. **[^](#cite_ref-22 "Jump up")** Chung, Andrew (June 14, 2021). ["U.S. Supreme Court revives LinkedIn bid to shield personal data"](https://www.reuters.com/technology/us-supreme-court-revives-linkedin-bid-shield-personal-data-2021-06-14/). [Reuters](/wiki/Reuters "Reuters"). Retrieved June 14, 2021.
23. **[^](#cite_ref-23 "Jump up")** Whittaker, Zack (18 April 2022). ["Web scraping is legal, US appeals court reaffirms"](https://techcrunch.com/2022/04/18/web-scraping-legal-court/). *TechCrunch*.
24. **[^](#cite_ref-24 "Jump up")** ["UDSKRIFT AF SØ- & HANDELSRETTENS DOMBOG"](https://web.archive.org/web/20071012005033/http://www.bvhd.dk/uploads/tx_mocarticles/S_-_og_Handelsrettens_afg_relse_i_Ofir-sagen.pdf) (PDF) (in Danish). bvhd.dk. 2006-02-24. Archived from [the original](http://www.bvhd.dk/uploads/tx_mocarticles/S_-_og_Handelsrettens_afg_relse_i_Ofir-sagen.pdf) (PDF) on 2007-10-12. Retrieved 2007-05-30.
25. **[^](#cite_ref-25 "Jump up")** ["AI Act | Shaping Europe's digital future"](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai). *digital-strategy.ec.europa.eu*. 2025-09-16. Retrieved 2025-09-28.
26. **[^](#cite_ref-26 "Jump up")** ["High Court of Ireland Decisions >> Ryanair Ltd -v- Billigfluege.de GMBH 2010 IEHC 47 (26 February 2010)"](http://www.bailii.org/ie/cases/IEHC/2010/H47.html). British and Irish Legal Information Institute. 2010-02-26. Retrieved 2012-04-19.
27. **[^](#cite_ref-27 "Jump up")** Matthews, Áine (June 2010). ["Intellectual Property: Website Terms of Use"](https://web.archive.org/web/20120624103316/http://www.lkshields.ie/htmdocs/publications/newsletters/update26/update26_03.htm). *Issue 26: June 2010*. LK Shields Solicitors Update. p. 03. Archived from [the original](http://www.lkshields.ie/htmdocs/publications/newsletters/update26/update26_03.htm) on 2012-06-24. Retrieved 2012-04-19.
28. **[^](#cite_ref-28 "Jump up")** ["La réutilisation des données publiquement accessibles en ligne à des fins de démarchage commercial | CNIL"](https://www.cnil.fr/fr/la-reutilisation-des-donnees-publiquement-accessibles-en-ligne-des-fins-de-demarchage-commercial). *www.cnil.fr* (in French). Retrieved 2020-07-05.
29. **[^](#cite_ref-29 "Jump up")** FindDataLab.com (2020-06-09). ["Can You Still Perform Web Scraping With The New CNIL Guidelines?"](https://medium.com/@finddatalab/can-you-still-perform-web-scraping-with-the-new-cnil-guidelines-bf3e20d0edc2). *Medium*. Retrieved 2020-07-05.
30. **[^](#cite_ref-30 "Jump up")** National Office for the Information Economy (February 2004). ["Spam Act 2003: An overview for business"](https://web.archive.org/web/20191203113701/https://www.lloyds.com/~/media/5880dae185914b2487bed7bd63b96286.ashx). Australian Communications Authority. p. 6. Archived from [the original](https://www.lloyds.com/~/media/5880dae185914b2487bed7bd63b96286.ashx) on 2019-12-03. Retrieved 2017-12-07.
31. **[^](#cite_ref-31 "Jump up")** National Office for the Information Economy (February 2004). ["Spam Act 2003: A practical guide for business"](http://www.webstartdesign.com.au/spam_business_practical_guide.pdf) (PDF). Australian Communications Authority. p. 20. Retrieved 2017-12-07.
32. **[^](#cite_ref-32 "Jump up")** ["Web Scraping for Beginners: A Guide 2024"](https://proxyway.com/guides/what-is-web-scraping). *Proxyway*. 2023-08-31. Retrieved 2024-03-15.
33. **[^](#cite_ref-33 "Jump up")** Mayank Dhiman [Breaking Fraud & Bot Detection Solutions](https://s3.us-west-2.amazonaws.com/research-papers-mynk/Breaking-Fraud-And-Bot-Detection-Solutions.pdf) *OWASP AppSec Cali' 2018* Retrieved February 10, 2018.
34. **[^](#cite_ref-34 "Jump up")** ["What is web scraping?"](https://datadome.co/guides/scraping/what-is-web-scraping-guide/). *DataDome*. 2022-03-06. Retrieved 2025-12-16.
35. **[^](#cite_ref-35 "Jump up")** Belanger, Ashley (28 January 2025). ["AI haters build tarpits to trap and trick AI scrapers that ignore robots.txt"](https://arstechnica.com/tech-policy/2025/01/ai-haters-build-tarpits-to-trap-and-trick-ai-scrapers-that-ignore-robots-txt/). *Ars Technica*.
36. **[^](#cite_ref-SalesforceJA3_36-0 "Jump up")** ["JA3 - A method for profiling SSL/TLS Clients"](https://github.com/salesforce/ja3). Salesforce Engineering. Retrieved 2026-01-27.
37. **[^](#cite_ref-HasDataTLS_37-0 "Jump up")** Ermakovich, Sergey. ["What Is Web Scraping?"](https://hasdata.com/blog/web-scraping#how-web-scraping-actually-works). *HasData*. Retrieved 2026-01-27.

Retrieved from "<https://en.wikipedia.org/w/index.php?title=Web_scraping&oldid=1355278840>"

[Category](/wiki/Help:Category "Help:Category"):

* [Web scraping](/wiki/Category:Web_scraping "Category:Web scraping")

Hidden categories:

* [CS1 maint: multiple names: authors list](/wiki/Category:CS1_maint:_multiple_names:_authors_list "Category:CS1 maint: multiple names: authors list")
* [CS1 Danish-language sources (da)](/wiki/Category:CS1_Danish-language_sources_(da) "Category:CS1 Danish-language sources (da)")
* [CS1 French-language sources (fr)](/wiki/Category:CS1_French-language_sources_(fr) "Category:CS1 French-language sources (fr)")
* [Articles with short description](/wiki/Category:Articles_with_short_description "Category:Articles with short description")
* [Short description is different from Wikidata](/wiki/Category:Short_description_is_different_from_Wikidata "Category:Short description is different from Wikidata")
* [Articles needing additional references from April 2023](/wiki/Category:Articles_needing_additional_references_from_April_2023 "Category:Articles needing additional references from April 2023")
* [All articles needing additional references](/wiki/Category:All_articles_needing_additional_references "Category:All articles needing additional references")
* [All articles with unsourced statements](/wiki/Category:All_articles_with_unsourced_statements "Category:All articles with unsourced statements")
* [Articles with unsourced statements from January 2026](/wiki/Category:Articles_with_unsourced_statements_from_January_2026 "Category:Articles with unsourced statements from January 2026")
* [Articles needing cleanup from October 2025](/wiki/Category:Articles_needing_cleanup_from_October_2025 "Category:Articles needing cleanup from October 2025")
* [All pages needing cleanup](/wiki/Category:All_pages_needing_cleanup "Category:All pages needing cleanup")
* [Articles containing how-to sections](/wiki/Category:Articles_containing_how-to_sections "Category:Articles containing how-to sections")
* [Articles with limited geographic scope from October 2015](/wiki/Category:Articles_with_limited_geographic_scope_from_October_2015 "Category:Articles with limited geographic scope from October 2015")
* [United States-centric](/wiki/Category:United_States-centric "Category:United States-centric")
* [Articles with unsourced statements from April 2023](/wiki/Category:Articles_with_unsourced_statements_from_April_2023 "Category:Articles with unsourced statements from April 2023")

* This page was last edited on 20 May 2026, at 23:28 (UTC).
* Text is available under the [Creative Commons Attribution-ShareAlike 4.0 License](/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License "Wikipedia:Text of the Creative Commons Attribution-ShareAlike 4.0 International License");
  additional terms may apply. By using this site, you agree to the [Terms of Use](https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Terms_of_Use "foundation:Special:MyLanguage/Policy:Terms of Use") and [Privacy Policy](https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Privacy_policy "foundation:Special:MyLanguage/Policy:Privacy policy"). Wikipedia® is a registered trademark of the [Wikimedia Foundation, Inc.](https://wikimediafoundation.org/), a non-profit organization.

* [Privacy policy](https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Privacy_policy)
* [About Wikipedia](/wiki/Wikipedia:About)
* [Disclaimers](/wiki/Wikipedia:General_disclaimer)
* [Contact Wikipedia](//en.wikipedia.org/wiki/Wikipedia:Contact_us)
* [Legal & safety contacts](https://foundation.wikimedia.org/wiki/Special:MyLanguage/Legal:Wikimedia_Foundation_Legal_and_Safety_Contact_Information)
* [Code of Conduct](https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Universal_Code_of_Conduct)
* [Developers](https://developer.wikimedia.org)
* [Statistics](https://stats.wikimedia.org/#/en.wikipedia.org)
* [Cookie statement](https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Cookie_statement)
* [Mobile view](//en.wikipedia.org/w/index.php?title=Web_scraping&mobileaction=toggle_view_mobile)

* [![Wikimedia Foundation](/static/images/footer/wikimedia.svg)](https://www.wikimedia.org/)
* [![Powered by MediaWiki](/w/resources/assets/mediawiki_compact.svg)](https://www.mediawiki.org/)

Search