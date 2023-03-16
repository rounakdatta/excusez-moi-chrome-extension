// whatever you log here will be written to the extension's console
import '../public/icons/icon_16.png';
import '../public/icons/icon_48.png';
import '../public/icons/icon_128.png';

import { Component, MessageType } from './message_types';

const sendMessageToContent = (message) => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab) {
      console.log('Send msg to content:', message);
      chrome.tabs.sendMessage(activeTab.id, message);
    } else {
      console.log('Unable to send msg, no active tab:', message);
    }
  });
};

const sendMessageToPopup = (message) => {
  console.log('Send msg to popup:', message);
  chrome.runtime.sendMessage(message);
};

// this function calls the backend with the preparation material
const askBackendToPrepare = (msg) => {
  fetch("http://localhost:8000/api/v1/prepare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "url": msg.url,
      "content": msg.material
    })
  })
  .then(response => {
    if (!response.ok) {
      const err = "preparation: backend api call failed"
      console.log(err)
      throw new Error(err, response)
    }
  })
  .then(_ => {
    sendMessageToPopup({
      type: MessageType.PREPARATION_DONE
    });
    console.log("preparation: done");
  })
}

// this function calls the backend with the question expecting an apt answer
const getAnswerFromBackend = (msg) => {
  fetch("http://localhost:8000/api/v1/answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "url": msg.url,
      "content": msg.query
    })
  })
  .then(response => {
    if (!response.ok) {
      const err = "answer: backend api call failed"
      console.log(err)
      throw new Error(err, response)
    } else {
      return response.json()
    }
  })
  .then(answers => {
    sendMessageToContent({
      type: MessageType.HIGHLIGHT_ANSWER,
      answer: answers
    });

    console.log("answer: done");
  });
}

chrome.runtime.onMessage.addListener((msg, sender, callback) => {
  console.log('recieve msg:', msg);
  switch (msg.type) {
    case MessageType.PREPARATION_DONE:
    case MessageType.HIGHLIGHT_ANSWER:
    case MessageType.MAKE_ANSWERS_ITERABLE:
    case MessageType.SEARCH_OPERATION_DONE:
    case MessageType.SELECT:
    case MessageType.CLEAR:
      break;

    case MessageType.POPUP_LOADED:
      sendMessageToContent({
        type: MessageType.SCRAPE_CONTENT_TEXT
      });
      
      break;

    case MessageType.PREPARE:
      return askBackendToPrepare(msg);

    case MessageType.ASK_QUESTION:
      return getAnswerFromBackend(msg);

    default:
      console.error('Did not recognize message type: ', msg);
      return true;
  }
});
