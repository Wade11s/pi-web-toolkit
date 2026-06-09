# Content Preview Test Results

Generated: 2026-06-09T09:12:02.553Z
Total: 12 | Passed: 12 | Failed: 0 | Regressed: 0 | New: 0

| Site | Status | Length | Preview |
|------|--------|--------|---------|
| wikipedia-article | ✓ | 502 | Scraping a web page involves fetching it and then extracting... |
| simple-page | ✓ | 101 | This domain is for use in documentation examples without nee... |
| hacker-news-feed | ✓ | 500 | 1. Apple reveals new AI architecture built around Google Gem... |
| news-article | ✓ | 152 | Whatever one's perspective, it seems certain that away from ... |
| tech-blog | ✓ | 77 | EnglishBahasa IndonesiaDeutschEspañolFrançaisPolskiPortuguês... |
| github-repo | ✓ | 349 | TypeScript is a language for application-scale JavaScript. T... |
| documentation | ✓ | 452 | This tutorial does not attempt to be comprehensive and cover... |
| forum-discussion | ✓ | 140 | This website uses a security service to protect against mali... |
| chinese-content | ✓ | 279 | 网页抓取和网页索引极其相似，其中网页索引指的是大多数搜索引擎采用使用的机器人或网络爬虫等技术。与此相反，网页抓取更侧重于... |
| japanese-content | ✓ | 331 | ウェブスクレイピングは多くの検索エンジンによって採用されている、ボットを利用してウェブ上の情報にインデックス付けを行うウ... |
| product-page | ✓ | 389 | Get credit toward iPhone 17, iPhone Air, or iPhone 17 Pro wh... |
| reddit-post | ✓ | 266 | This page may contain sensitive or adult content that’s not ... |

## Regression diffs


## Details

### wikipedia-article
- **URL**: https://en.wikipedia.org/wiki/Web_scraping
- **Expected**: Extracts body paragraph, skips TOC and language links
- **Status**: PASS
- **Preview (502 chars)**: Scraping a web page involves fetching it and then extracting data from it. Fetching is the downloading of a page (which a browser does when a user views a page). Therefore, web crawling is a main comp...

### simple-page
- **URL**: https://example.com
- **Expected**: Returns the single paragraph
- **Status**: PASS
- **Preview (101 chars)**: This domain is for use in documentation examples without needing permission. Avoid use in operations....

### hacker-news-feed
- **URL**: https://news.ycombinator.com
- **Expected**: Extracts story titles, skips nav table noise
- **Status**: PASS
- **Preview (500 chars)**: 1. Apple reveals new AI architecture built around Google Gemini models (macrumors.com) 496 points by unclefuzzy 11 hours ago hide 382 comments 2. Old'aVista – The most powerful guide to the old Intern...

### news-article
- **URL**: https://www.bbc.com/news/articles/czeyx8ewn98o
- **Expected**: Extracts article lead paragraph
- **Status**: PASS
- **Preview (152 chars)**: Whatever one's perspective, it seems certain that away from the on-field spectacle, this super-sized World Cup could be among the most contentious ever....

### tech-blog
- **URL**: https://blog.mozilla.org/en/products/firefox/
- **Expected**: Extracts blog post previews
- **Status**: PASS
- **Preview (77 chars)**: EnglishBahasa IndonesiaDeutschEspañolFrançaisPolskiPortuguêsРусский正體中文Format...

### github-repo
- **URL**: https://github.com/microsoft/TypeScript
- **Expected**: Extracts project description
- **Status**: PASS
- **Preview (349 chars)**: TypeScript is a language for application-scale JavaScript. TypeScript adds optional types to JavaScript that support tools for large-scale JavaScript applications for any browser, for any host, on any...

### documentation
- **URL**: https://docs.python.org/3/tutorial/index.html
- **Expected**: Extracts tutorial overview
- **Status**: PASS
- **Preview (452 chars)**: This tutorial does not attempt to be comprehensive and cover every single feature, or even every commonly used feature. Instead, it introduces many of Python’s most noteworthy features, and will give ...

### forum-discussion
- **URL**: https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster-than-processing-an-unsorted-array
- **Expected**: Extracts question body, skips sidebar
- **Status**: PASS
- **Preview (140 chars)**: This website uses a security service to protect against malicious bots. This page is displayed while the website verifies you are not a bot....

### chinese-content
- **URL**: https://zh.wikipedia.org/wiki/%E7%BD%91%E9%A1%B5%E6%8A%93%E5%8F%96
- **Expected**: Extracts Chinese body text
- **Status**: PASS
- **Preview (279 chars)**: 网页抓取和网页索引极其相似，其中网页索引指的是大多数搜索引擎采用使用的机器人或网络爬虫等技术。与此相反，网页抓取更侧重于转换网络上非结构化数据（常见的是HTML格式）成为能在一个中央数据库和电子表格中储存和分析的结构化数据。网页抓取也涉及到网络自动化，它利用计算机软件模拟了人的浏览。网页抓取的用途包括在线的价格比较，联系人抓取，气象数据监测，网页变化检测，科研，混搭 "混搭 (互聯網)")和Web...

### japanese-content
- **URL**: https://ja.wikipedia.org/wiki/%E3%82%A6%E3%82%A7%E3%83%96%E3%82%B9%E3%82%AF%E3%83%AC%E3%82%A4%E3%83%94%E3%83%B3%E3%82%B0
- **Expected**: Extracts Japanese body text
- **Status**: PASS
- **Preview (331 chars)**: ウェブスクレイピングは多くの検索エンジンによって採用されている、ボットを利用してウェブ上の情報にインデックス付けを行うウェブインデクシング")と密接な関係がある。ウェブスクレイピングではウェブ上の非構造化データの変換、一般的にはHTMLフォーマットからデータベースやスプレッドシートに格納・分析可能な構造化データへの変換に、より焦点が当てられている。また、コンピュータソフトウェアを利用して人間のブラ...

### product-page
- **URL**: https://www.apple.com/iphone/
- **Expected**: Extracts product description text
- **Status**: PASS
- **Preview (389 chars)**: Get credit toward iPhone 17, iPhone Air, or iPhone 17 Pro when you trade in an eligible smartphone.Get credit toward iPhone 17, iPhone Air, or iPhone 17 Pro when you trade in an eligible smartphone.\ ...

### reddit-post
- **URL**: https://www.reddit.com/r/programming/comments/1h1a2b3/what_are_your_favorite_developer_tools/
- **Expected**: Extracts post body, skips comment noise
- **Status**: PASS
- **Preview (266 chars)**: This page may contain sensitive or adult content that’s not for everyone. To view it, please log in to confirm your age.  By continuing, you also agree that use of this site constitutes acceptance of ...
