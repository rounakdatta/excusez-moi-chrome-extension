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

const findAllElements = () => {
  return $('[' + DATA_ATTR_ELEMENT_ID + ']');
};

const findElementById = (elementId) => {
  const q = $('[' + DATA_ATTR_ELEMENT_ID + '=' + elementId + ']');
  return q.length > 0 ? $(q[0]) : null;
};

const checkIfQueryDone = () => {
  const allElements = findAllElements();
  const waitingElements = allElements.filter((idx, node) => {
    return $(node).attr(DATA_ATTR_SUCCESS) === undefined;
  });

  if (waitingElements.length === 0) {
    console.log('Query done');
    chrome.runtime.sendMessage({
      type: MessageType.QUERY_DONE
    });
  }
};

// Heuristic to decide whether the element is worth searching.
const searchableElement = (idx, el) => {
  const validToken = (token) => {
    if (!token) {
      return false;
    }

    const alphaNum = token.match(/[a-zA-Z0-9]/g);
    return alphaNum && alphaNum.length > 0;
  };

  // Split by spaces, remove tokens without alphanumeric characters.
  const tokens = $(el).text().split(' ').filter(validToken);
  return tokens.length > MIN_TOKENS;
};

const handleQuery = (msg) => {
  console.log('Searching query:', msg.query);

  const textElements = $('p,ul,ol');
  const searchable = textElements
    .filter(searchableElement)
    .filter((idx, el) => el.offsetParent !== null);

  console.log('Searching', searchable.length, 'text elements');
  if (searchable.length === 0) {
    return chrome.runtime.sendMessage({
      type: MessageType.QUERY_DONE
    });
  }

  searchable.each((idx, element) => {
    const context = $(element).text().trim();
    const elementId = uuidv4();
    $(element).attr(DATA_ATTR_ELEMENT_ID, elementId);
    chrome.runtime.sendMessage(
      {
        type: MessageType.QUESTION,
        elementId: elementId,
        question: msg.query,
        context: context
      },
      handleMsg
    );
  });
};

const handleModelSuccess = (msg) => {
  console.log("LETSDOIT")
  console.log(msg)
  // Mark question on dom.
  const element = findElementById(msg.question.elementId);
  element.attr(DATA_ATTR_SUCCESS, 'true');

  for (const answer of msg.answers) {
    console.log("PRINTINT OUT THE ANSWER")
    console.log(answer)
    chrome.runtime.sendMessage({
      type: MessageType.QUERY_RESULT,
      answer: answer,
      elementId: msg.question.elementId
    });
  }

  checkIfQueryDone();
};

const handleModelErr = (msg) => {
  console.log('Model error: ', msg);

  // Mark question on dom.
  const element = findElementById(msg.question.elementId);
  element.attr(DATA_ATTR_SUCCESS, 'false');

  chrome.runtime.sendMessage({
    type: MessageType.QUERY_ERROR,
    error: msg.error,
    elementId: msg.elementId
  });

  checkIfQueryDone();
};

const clearSelection = () => {
  // Remove old highlight if it exists.
  const oldElement = $('[' + DATA_ATTR_SELECTED + ']');
  if (oldElement.length > 0) {
    oldElement.removeAttr(DATA_ATTR_SELECTED);
    var instance = new Mark(oldElement[0]);
    instance.unmark({
      done: () => {
        $('.' + CLASS_NAME_MARKED_SCORE).remove();
      }
    });
  }
};

const handleSelection = (msg) => {
  clearSelection();

  // Add new highlight;
  const element = findElementById(msg.elementId);
  element.attr(DATA_ATTR_SELECTED, 'true');
  // TODO: figure out later why injecting CSS didn't work
  element.css({
    'border-style': 'dashed',
    'border-color': 'black',
    'border-width': 'thick'
  })

  element[0].scrollIntoView({
    block: 'end',
    inline: 'nearest'
  });
  var instance = new Mark(element[0]);
  instance.mark(msg.answer.text, {
    className: CLASS_NAME_MARKED,
    acrossElements: true,
    separateWordSearch: false,
    done: () => {
      const scoreEl = $('<span/>')
        .addClass(CLASS_NAME_MARKED_SCORE)
        .text(msg.answer.score.toFixed(4));
      $('.' + CLASS_NAME_MARKED)
        .first()
        .append(scoreEl);
    }
  });
};

const handleClear = () => {
  clearSelection();
  findAllElements()
    .removeAttr(DATA_ATTR_SUCCESS)
    .removeAttr(DATA_ATTR_ELEMENT_ID);
};


// this function scrapes the complete DOM in plain readable text
// and sends it back to background for preparation
const scrapeContentAsPlainTextAndSendForPreparation = () => {
  const currentUrl = window.location.href;
  const options = {
    wordwrap: 130,
    // ...
  };

  const dirtyHtml = document.documentElement.outerHTML;
  const plainText = convert(dirtyHtml, options);
  console.log(plainText)

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

// this function tries to highlight the answer on the DOM
const displayHighlightsOnPage = (msg) => {
  // we'll have to look at the entire body to find out the highlights
  const markInstance = new Mark(document.body)
  const highlightingOptions = {
    className: "highlighted",
    element:  "span"
  };
  const stringToHighlight = msg.answer.resp
  console.log(stringToHighlight)

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

  // highlights can be hrefs as well, so we'll put a border around the parent elements
  // for a better finding experience
  // const highlightedElements = document.querySelectorAll("." + CLASS_NAME_MARKED);
  // console.log(highlightedElements)
  // highlightedElements.forEach(element => {
  //   element.parentElement.style.borderStyle = 'dashed';
  //   element.parentElement.style.borderColor = 'black';
  //   element.parentElement.style.borderWidth = 'thick';
  // })
}

const handleMsg = (msg, sender, callback) => {
  if (!msg) {
    return;
  }

  console.log('recieved msg:', msg, 'from:', sender);

  switch (msg.type) {
    case MessageType.POPUP_LOADED:
    case MessageType.MODEL_LOADED:
    case MessageType.MODEL_ERROR:
      break;

    case MessageType.SCRAPE_CONTENT_TEXT:
      scrapeContentAsPlainTextAndSendForPreparation();
      break;

    case MessageType.HIGHLIGHT_ANSWER:
      displayHighlightsOnPage(msg);
      break;

    case MessageType.QUERY:
      handleQuery(msg);
      break;
    case MessageType.QUESTION_RESULT:
      handleModelSuccess(msg);
      break;
    case MessageType.QUESTION_ERROR:
      handleModelErr(msg);
      break;
    case MessageType.SELECT:
      handleSelection(msg);
      break;
    case MessageType.CLEAR:
      handleClear();
      break;

    default:
      console.error('Did not recognize message type:', msg);
  }
};

chrome.runtime.onMessage.addListener(handleMsg);