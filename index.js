import React from 'react';
import ReactDOM from 'react-dom/client'; // For React 18+
import App from './app'; // Import your main App component

// Get the root DOM element where the React app will be mounted
const rootElement = document.getElementById('root');

// Create a React root and render the App component
const root = ReactDOM.createRoot(rootElement);
root.render( <
    React.StrictMode >
    <
    App / >
    <
    /React.StrictMode>
);
