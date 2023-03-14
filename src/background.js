// whatever you log here will be written to the extension's console
import '../public/icons/icon_16.png';
import '../public/icons/icon_48.png';
import '../public/icons/icon_128.png';

import { Component, MessageType } from './message_types';

// const qna = require('@tensorflow-models/qna');

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

// console.log("lets do some preparation")
// fetch("http://localhost:8000/api/v1/prepare", {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json"
//   },
//   body: JSON.stringify({
//     "url": "https://rounakdatta.github.io/blog",
//     "content": "I know that jackfruits are quite popular in Rishra. You generally find jackfruits in Mini Market."
//   })
// })
// .then(response => {
//   if (!response.ok) {
//     console.log("oops preparations failed")
//     throw new Error("boom, preparation failed", response)
//   }
// })
// .then(_ => {
//   // window.__qna_model = "PREP_DONE";
//   sendMessageToPopup({
//     type: MessageType.MODEL_LOADED
//   });
//   console.log('Model loaded');
// })

// qna.load().then((model) => {
//   window.__qna_model = model;
//   sendMessageToPopup({
//     type: MessageType.MODEL_LOADED
//   });
//   console.log('Model loaded');
// });

async function findAnswers(question, context) {
  // call API here again
  console.log(question)
  console.log(context)

  return [
    {
      text: "test mode",
      score: 2
    }
  ]
  // print("HERE IT IS")

  // return ["something"]
  // //   return answers
}

const handleAnswer = (msg) => {
  findAnswers(msg.question, msg.context)
    .then((answers) => {
      console.log("now let me send it")
      console.log(answers)
      sendMessageToContent({
        type: MessageType.QUESTION_RESULT,
        question: msg,
        answers: answers
      });
    })
    .catch((error) => {
      sendMessageToContent({
        type: MessageType.QUESTION_ERROR,
        question: msg,
        answers: [],
        error: error
      });
    });

  return true;
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
  })
}

chrome.runtime.onMessage.addListener((msg, sender, callback) => {
  console.log('recieve msg:', msg);
  switch (msg.type) {
    case MessageType.QUERY:
    case MessageType.QUERY_RESULT:
    case MessageType.QUERY_ERROR:
    case MessageType.QUERY_DONE:
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

    case MessageType.QUESTION:
      console.log("now I'll try to answer the question properly")
      return handleAnswer(msg, callback);

    default:
      console.error('Did not recognize message type: ', msg);
      return true;
  }
});

// as soon as the popup is loaded, we need to ask content script to start preparations
// support both extension button click as well as shortcut key
// TODO: remove the extra arguments
// chrome.action.onClicked.addListener(function (tab) {
//   console.log("lets send something")
//   sendMessageToContent({
//     type: MessageType.SCRAPE_CONTENT_TEXT
//   });
// });

// chrome.commands.onCommand.addListener((command) => {
//   sendMessageToContent({
//     type: MessageType.SCRAPE_CONTENT_TEXT
//   });
// });
