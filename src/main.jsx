// The starting point. Vite loads this file first (see the <script> tag in
// index.html), and it hands control to React.
//
// You will almost never need to change anything here.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css' // importing CSS from JS is a Vite thing; it just works

// index.html contains <div id="root"></div>. React takes over that div and
// draws the whole app inside it.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode is a development-only helper. It deliberately runs some code
  // twice to surface bugs early. It does nothing in the built app, so if you
  // see something happen twice while developing, this is why.
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
