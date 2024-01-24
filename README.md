# ballotpedia_db_convert

Tool to convert a [Ballotpedia](https://ballotpedia.org/) bulk DB JSON file into a origin data source JSON file for import into [XPOC browser extension](https://github.com/microsoft/xpoc-framework/tree/main/samples/browser-extension).

## Creating the XPOC origin data source

Using a Ballotpedia contact database JSON file, and a Ballotpedia logo image, invoke the convert.js script, e.g.,

```
node convert.js metabase_query_results.json ballotpedia_logo.png
```

This results in a `ballotpedia.json` origin data source file.

## Importing the origin data source into the XPOC browser extension

1. First, make sure the [XPOC Browser Extension](https://github.com/microsoft/xpoc-framework/tree/main/samples/browser-extension) is installed in your browser. It is useful to pin the extension to the browser's toolbar.

2. Open the extension's popup menu, click the `Options` tab, click the "Choose file" option, and select the generated `ballotpedia.json`.

3. Visiting pages listed as contacts in Ballotpedia politician pages should now display a validated origin in the extension's popup.