import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { Analytics } from '@vercel/analytics/react'
import './styles/globals.css'
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/><Analytics/></React.StrictMode>)
