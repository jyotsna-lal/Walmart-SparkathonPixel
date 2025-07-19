import React, { useState, useEffect, useRef } from 'react';

// Main App component
const App = () => {
    // State to store chat messages
    const [messages, setMessages] = useState([]);
    // State to store current user input
    const [input, setInput] = useState('');
    // State to manage loading indicator
    const [isLoading, setIsLoading] = useState(false);

    // Ref for scrolling to the bottom of the chat
    const messagesEndRef = useRef(null);

    // Scroll to the latest message whenever messages state updates
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Function to send a message
    const sendMessage = async () => {
        if (input.trim() === '') return;

        const userMessage = { sender: 'user', text: input };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setInput(''); // Clear input field

        setIsLoading(true); // Show loading indicator

        try {
            // Construct chat history for the API call
            let chatHistory = messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));
            chatHistory.push({ role: "user", parts: [{ text: input }] });

            // Updated initial prompt to enforce one question at a time and guide simulated product suggestions
            const initialPrompt = `You are a helpful Walmart product recommendation chatbot named Wall-E. Your goal is to help users find products based on their preferences and budget.
            
            **Important Instructions:**
            1.  **Ask only ONE question at a time.** Wait for the user's response before asking the next question.
            2.  Start by asking about the occasion.
            3.  If the user mentions a "birthday party", ask: "How old is the birthday person?"
            4.  After getting the age, ask: "Do you have a theme in mind?"
            5.  After getting the theme, ask: "What's your approximate budget for these items?"
            6.  Once you have the occasion, age (if birthday), theme (if birthday), and budget, provide product recommendations.
            7.  **For product recommendations:**
                * Suggest specific, plausible product names, brief descriptions, *simulated* prices, and a concise search query for Walmart.com.
                * Do NOT include direct links in the text. The application will construct the link based on the search query.
                * Always include a clear disclaimer that these are *simulated* recommendations and not live data from Walmart.com.
                * Format each product recommendation on a new line using the exact format:
                    **PRODUCT:** [Product Name] | [Brief Description] | [Simulated Price] | [Search Query for Walmart.com]
                * Provide 3-5 product recommendations.
                * After listing products, add the disclaimer: "Please note: These are simulated product recommendations and do not reflect live inventory or pricing from Walmart.com. Clicking on a product will take you to a search results page on Walmart.com."
            
            Keep your responses concise and conversational.
            `;

            // Prepend the initial prompt to the chat history for the API call
            const payload = {
                contents: [{ role: "user", parts: [{ text: initialPrompt }] }, ...chatHistory]
            };

            const apiKey = ""; // Canvas will provide this automatically
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const botResponseText = result.candidates[0].content.parts[0].text;
                setMessages((prevMessages) => [...prevMessages, { sender: 'bot', text: botResponseText }]);
            } else {
                console.error("Unexpected API response structure:", result);
                setMessages((prevMessages) => [...prevMessages, { sender: 'bot', text: "Sorry, I couldn't get a recommendation right now. Please try again." }]);
            }
        } catch (error) {
            console.error("Error communicating with Gemini API:", error);
            setMessages((prevMessages) => [...prevMessages, { sender: 'bot', text: "There was an error connecting to the service. Please try again." }]);
        } finally {
            setIsLoading(false); // Hide loading indicator
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    // Function to render messages, including parsing simulated product cards
    const renderMessageContent = (message) => {
        // Regex to find product lines: **PRODUCT:** [Name] | [Desc] | [Price] | [Search Query]
        const productRegex = /\*\*PRODUCT:\*\* (.*?)\s\|\s(.*?)\s\|\s(.*?)\s\|\s(.*?)(?=\n|\s*$)/g;
        let content = message.text;
        const products = [];
        let match;

        // Extract all product matches
        while ((match = productRegex.exec(content)) !== null) {
            products.push({
                name: match[1].trim(),
                description: match[2].trim(),
                price: match[3].trim(),
                searchQuery: match[4].trim()
            });
            // Remove the matched product line from the content to process remaining text
            content = content.replace(match[0], '');
        }

        // Split remaining content by newlines to handle paragraphs/disclaimers
        const paragraphs = content.split('\n').filter(p => p.trim() !== '');

        return (
            <>
                {paragraphs.map((paragraph, idx) => (
                    // Render regular text, allowing markdown for bolding and line breaks
                    <p key={`p-${idx}`} dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}></p>
                ))}
                {products.length > 0 && (
                    <div className="mt-4 space-y-4">
                        {products.map((product, idx) => (
                            <a
                                key={`product-${idx}`}
                                href={`https://www.walmart.com/search?q=${encodeURIComponent(product.searchQuery)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block" // Make the entire card clickable
                            >
                                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex items-center space-x-4 transition duration-300 transform hover:scale-[1.02] hover:shadow-xl cursor-pointer">
                                    {/* Placeholder image with a slightly better look */}
                                    <img
                                        src={`https://placehold.co/70x70/E0F2F7/2C3E50?text=Item`}
                                        alt="Product Placeholder"
                                        className="rounded-lg shadow-sm"
                                    />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-lg text-gray-900">{product.name}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                                        <p className="text-xl font-bold text-green-600 mt-2">{product.price}</p>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4 font-inter">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col h-[85vh] overflow-hidden border border-gray-200">
                {/* Chat Header */}
                <div className="p-5 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-t-3xl flex items-center justify-center shadow-md">
                    {/* Wall-E inspired robot icon (simple SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 mr-3 text-yellow-300">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM9.75 10.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5ZM9 15.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                    <h1 className="text-3xl font-extrabold tracking-wide">Wall-E</h1>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-gray-50">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-600 text-lg mt-12 animate-fade-in">
                            Hello! I'm Wall-E, your personal Walmart product recommender. <br/><br/> What occasion are you shopping for today?
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`rounded-2xl p-4 max-w-[80%] shadow-lg transition-all duration-300 ease-in-out ${
                                    msg.sender === 'user'
                                        ? 'bg-blue-500 text-white rounded-br-none'
                                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                                }`}
                            >
                                {renderMessageContent(msg)}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white text-gray-800 rounded-2xl p-4 rounded-bl-none shadow-lg border border-gray-100">
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                                    <span className="text-gray-700">Wall-E is thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} /> {/* Scroll target */}
                </div>

                {/* Chat Input Area */}
                <div className="p-5 border-t border-gray-200 flex items-center bg-white rounded-b-3xl shadow-inner">
                    <input
                        type="text"
                        className="flex-1 p-4 border border-gray-300 rounded-full focus:outline-none focus:ring-3 focus:ring-blue-300 transition duration-300 text-lg placeholder-gray-500"
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        className="ml-4 p-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-full shadow-lg hover:from-blue-700 hover:to-purple-800 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 transition duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading || input.trim() === ''}
                    >
                        {/* Send icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
