// whatever you log here would be printed in the main tab window's console
import './css/inject.css';
import Mark from 'mark.js';
import {
  DATA_ATTR_ELEMENT_ID,
  DATA_ATTR_SELECTED,
  DATA_ATTR_SUCCESS,
  CLASS_NAME_MARKED,
  CLASS_NAME_MARKED_SCORE,
  MIN_TOKENS
} from './constants';
import { Component, MessageType } from './message_types';

import $ from 'jquery';
import { v4 as uuidv4 } from 'uuid';
import { convert } from 'html-to-text';
import { TidyURL } from 'tidy-url';
import { removeStopwords } from 'stopword';

// we'll remove tracking links from all URLs so that our LLM is not fed with junk
const cleanseAllUrlsInPage = () => {
  const allAnchorTags = document.getElementsByTagName("a");
  for (var i = 0; i < allAnchorTags.length; i++) {
    const anchorTag = allAnchorTags[i]
    const originalUrl = anchorTag.href 
    anchorTag.href = TidyURL.clean(originalUrl).url
  }
}

// we'll remove stopwords from the text
// TODO: we have disabled for now
const removeStopwordsInPageText = (fullText) => {
  const trimmedText = removeStopwords(fullText.split(" ")).join(" ")
  return trimmedText
}

// this function scrapes the complete DOM in plain readable text
// and sends it back to background for preparation
const scrapeContentAsPlainTextAndSendForPreparation = () => {
  cleanseAllUrlsInPage()

  const currentUrl = window.location.href;
  const options = {
    wordwrap: 130,
    // ...
  };

  const dirtyHtml = document.documentElement.outerHTML;
  const plainText = convert(dirtyHtml, options);

  chrome.runtime.sendMessage(
    {
      type: MessageType.PREPARE,
      url: currentUrl,
      material: plainText
    }
  );
}

function trimTrailingSlashInUrl(url) {
  if(url.substr(-1) === '/') {
      return url.substr(0, url.length - 1);
  }
  return url;
}

const removeHighlightsOnPage = () => {
  const markInstance = new Mark(document.body);
  markInstance.unmark();
}

const handleSelection = (msg) => {
  const element = document.getElementById(msg.elementId)
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center'
});
}

// this function tries to highlight the answer on the DOM
const displayHighlightsOnPage = (msg) => {
  // we'll first remove all the existing highlights on page
  removeHighlightsOnPage();

  const allAnswers = msg.answer.answers
  allAnswers.forEach((answer) => {
    const stringToHighlight = answer["resp"]
    console.log(stringToHighlight)
    // if backend returns response code as `KZZ`, that means no response was found, so we skip
    if ("KZZ" == stringToHighlight) {
      return;
    }

    // we'll have to look at the entire body to find out the highlights
    const markInstance = new Mark(document.body)
    const highlightingOptions = {
      className: "highlighted",
      element:  "span"
    };

    // there could be multiple results, we split by comma
    const stringsToSearch = stringToHighlight.split(',').map(c => c.trim());

    // apply the highlights
    markInstance.mark(stringsToSearch, {
      className: CLASS_NAME_MARKED,
      acrossElements: true,
      separateWordSearch: false,
      accuracy: "loose",
      done: () => {
        console.log("ok done")
      }
    });

    // however sometimes answer can be in the hyperlinks, in that case we need to find the parent element
    const cleansedUrlStrings = stringsToSearch.map(trimTrailingSlashInUrl)
    const allHyperlinksInPage = document.querySelectorAll("a")
    allHyperlinksInPage.forEach(hyperlink => {
      if (cleansedUrlStrings.includes(trimTrailingSlashInUrl(hyperlink.href))) {
        markInstance.mark(hyperlink.textContent, {
          className: CLASS_NAME_MARKED,
          acrossElements: true,
          separateWordSearch: false,
          accuracy: "loose",
          done: () => {
            console.log("ok url highlighting done")
          }
        })
      }

    })

    // we send a search done message to popup so that the loading banner is stopped
    chrome.runtime.sendMessage(
      {
        type: MessageType.SEARCH_OPERATION_DONE,
      }
    );

  });

  const elementIdsOfHighlightedElements = []

  const highlightedResults = document.querySelectorAll("mark");
  highlightedResults.forEach((element, index) => {
      // we assign each of these highlighted elements an id
      element.id = Math.random().toString(36).slice(2, 7);
      elementIdsOfHighlightedElements.push(element.id)
  });

  // aggregate all results and send to popup for iterability
  chrome.runtime.sendMessage(
    {
      type: MessageType.MAKE_ANSWERS_ITERABLE,
      answers: elementIdsOfHighlightedElements
    }
  );
}

const handleMsg = (msg, sender, callback) => {
  if (!msg) {
    return;
  }

  console.log('recieved msg:', msg, 'from:', sender);

  switch (msg.type) {
    case MessageType.PREPARE:
    case MessageType.PREPARATION_DONE:
    case MessageType.ASK_QUESTION:
    case MessageType.MAKE_ANSWERS_ITERABLE:
    case MessageType.SEARCH_OPERATION_DONE:
      break

    case MessageType.SCRAPE_CONTENT_TEXT:
      scrapeContentAsPlainTextAndSendForPreparation();
      break;

    case MessageType.HIGHLIGHT_ANSWER:
      displayHighlightsOnPage(msg);
      break;

    case MessageType.SELECT:
      handleSelection(msg);
      break;
    case MessageType.CLEAR:
      removeHighlightsOnPage();
      break;

    default:
      console.error('Did not recognize message type:', msg);
  }
};

chrome.runtime.onMessage.addListener(handleMsg);
