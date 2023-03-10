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

console.log("lets do some preparation")
fetch("http://localhost:8000/api/v1/prepare", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "url": "https://rounakdatta.github.io/blog",
    "content": "I know that jackfruits are quite popular in Rishra. You generally find jackfruits in Mini Market."
  })
})
.then(response => {
  if (!response.ok) {
    console.log("oops preparations failed")
    throw new Error("boom, preparation failed", response)
  }
})
.then(_ => {
  // window.__qna_model = "PREP_DONE";
  sendMessageToPopup({
    type: MessageType.MODEL_LOADED
  });
  console.log('Model loaded');
})

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

chrome.runtime.onMessage.addListener((msg, sender, callback) => {
  console.log('recieve msg:', msg);
  switch (msg.type) {
    case MessageType.QUERY:
    case MessageType.QUERY_RESULT:
    case MessageType.QUERY_ERROR:
    case MessageType.QUERY_DONE:
      break;

    case MessageType.POPUP_LOADED:
      // If model is loaded, respond with a "model loaded"
      // message. Otherwise, wait for the model to load.
      if (true) {
        sendMessageToPopup({
          type: MessageType.MODEL_LOADED
        });
      }
      break;

    case MessageType.QUESTION:
      console.log("now I'll try to answer the question properly")
      return handleAnswer(msg, callback);

    default:
      console.error('Did not recognize message type: ', msg);
      return true;
  }
});