import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from "react-router-dom"
import App from './App.jsx'
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Native UI setup must never prevent React from mounting. A rejected plugin
// call previously had no fallback and could leave reviewers with a blank view.
if (Capacitor.isNativePlatform()) {
  Promise.allSettled([
    StatusBar.setBackgroundColor({ color: '#000000' }),
    StatusBar.setStyle({ style: Style.Light }),
  ]);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
