import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const Popup = () => {
    return (
        <div className="p-4 w-80">
            <h1 className="text-xl font-bold mb-2">Bookmarkify</h1>
            <button className="bg-blue-500 text-white px-4 py-2 rounded">
                Save Current Page
            </button>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>
);
