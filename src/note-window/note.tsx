import React from 'react'
import ReactDOM from 'react-dom/client'
import NoteApp from './NoteApp'
import '../shared/styles/index.css'
import './note-window.css' // Import the CSS to hide traffic lights

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NoteApp />
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})

// Listen for color changes from settings window
window.ipcRenderer.on('note-color-changed', (_event, color) => {
  console.log('Note window received color change:', color)
  
  // Dispatch a custom event that the NoteApp can listen to
  const event = new CustomEvent('noteColorChanged', { detail: { color } })
  window.dispatchEvent(event)
})

// Listen for toolbar toggle from settings window
window.ipcRenderer.on('toggle-toolbar', (_event, isVisible) => {
  console.log('Note window received toolbar toggle:', isVisible)
  
  // Dispatch a custom event that the NoteApp can listen to
  const event = new CustomEvent('noteToolbarToggle', { detail: { isVisible } })
  window.dispatchEvent(event)
})
