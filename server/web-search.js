async function webSearch(query, options = {}) {

    const apiKey = process.env.BRAVE_API_KEY;

    if (!apiKey) {
        throw new Error("BRAVE_API_KEY غير موجود في server/.env");
    }

    const params = new URLSearchParams();

    params.set("q", query);
    params.set("count", String(options.count || 6));
    params.set("country", options.country || "MA");
    params.set("search_lang", options.search_lang || "ar");
    params.set("safesearch", "moderate");

    if (options.freshness) {
        params.set("freshness", options.freshness);
    }

    if (options.news) {
        params.set("result_filter", "news");
    }

    const response = await fetch(
        "https://api.search.brave.com/res/v1/web/search?" +
        params.toString(),
        {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": apiKey
            }
        }
    );

    if (!response.ok) {
        const text = await response.text();
        throw new Error(
            `Brave Search ${response.status}: ${text}`
        );
    }

    const data = await response.json();

    const results = [];

    if (data.web && Array.isArray(data.web.results)) {

        for (const item of data.web.results) {

            results.push({
                title: item.title || "",
                description: item.description || "",
                url: item.url || ""
            });

        }
    }

    if (data.news && Array.isArray(data.news.results)) {

        for (const item of data.news.results) {

            results.push({
                title: item.title || "",
                description: item.description || "",
                url: item.url || ""
            });

        }
    }

    return results.slice(0, options.count || 6);
}

module.exports = webSearch;
