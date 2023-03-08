'use strict';

import './css/popup.css';

import React from 'react';
import { render } from 'react-dom';
import SearchBar from './popup/search_bar';

console.log("popped up")

render(<SearchBar />, window.document.getElementById('app-container'));
