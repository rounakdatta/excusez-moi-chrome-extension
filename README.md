# <img src="public/icons/icon_48.png" width="45" align="left"> Excusez Moi

Semantic search on webpages by asking natural questions

## About

Often webpages are huge and Ctrl-F might not always be the Swiss Army knife for quickly finding information. This extension tries to fix that by allowing you to ask questions in natural language. It can also help you find URLs buried in hyperlinks.

### How it works

Whenever you activate the extension (either by clicking on the icon / key shortcut), it first starts to understand  [^1] the article. Once ready, as you can write your query in the box and submit, it'll fetch the answers [^2] and highlight them on the webpage.

[^1]: The article's entire textual content is sent to OpenAI to generate embeddings out of it
[^2]: The search query terms' embeddings are also generated and matched across the document's embeddings for relevant sections. OpenAI's chat completion is able to generate an answer out of the relevant sections.

### Get going

#### Chrome Web Store
[![ChromeWebStore](https://i.imgur.com/Yns6w2k.png)]()

#### Build from source
- Download as ZIP
- Load as unpackaged extension

## Contribution

The extension is rough around the edges, and often points out inaccurate results. Pull requests are welcome!

## Logo

A haystack and a magnifying glass.

## Credits

- This project was bootstrapped with [Chrome Extension CLI](https://github.com/dutiyesh/chrome-extension-cli)
- This project was heavily inspired by the architecture and UI elements of [Shift-Ctrl-F](https://github.com/model-zoo/shift-ctrl-f)
