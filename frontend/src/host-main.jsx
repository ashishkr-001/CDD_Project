import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import HostApp from "./HostApp.jsx";

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HostApp />
  </React.StrictMode>
)
