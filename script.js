let threadId = null;
let messageCount = 0;
const chatContainer = document.getElementById('chat-container');
const chatInput = document.querySelector('#chat-input input');
const chatSendButton = document.querySelector('#chat-input button');
const chatMessages = document.getElementById('chat-messages');
const resetChat = document.getElementById('reset-chat');
const chatForm = document.getElementById('chat-form');
const SERVERLESS_FUNCTION_URL = 'https://europe-central2-mickiewicz.cloudfunctions.net/chat'; // Zmień na URL swojej funkcji

async function initializeChat() {
    try {
        messageCount = 0;
        console.log('Chat initialized with thread ID:', threadId);
        displayMessage('assistant', 'Cześć, jestem Adam Mickiewicz i chętnie Ci o sobie opowiem. :)');
    } catch (error) {
        console.error('Error initializing chat:', error);
    }
}

async function sendMessage(message) {
    try {
        displayMessage('user', message);
        displayTypingIndicator();
        messageCount++;

        const response = await fetch(SERVERLESS_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                threadId: threadId
            }),
        });
        const data = await response.json();
        removeTypingIndicator();
        if (data.threadId) {
            threadId = data.threadId
        }
        displayMessage('assistant', data.response, true);
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
    }
}

function displayMessage(role, message, isMarkdown = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${role}-message`);

    if (isMarkdown) {
        messageElement.innerHTML = marked.parse(message);
    } else {
        messageElement.textContent = message;
    }

    chatMessages.appendChild(messageElement);
    scrollToBottom();
}


function scrollToBottom() {
    const lastMessage = chatMessages.lastElementChild;
    if (lastMessage) {
        const containerHeight = chatMessages.clientHeight;
        const lastMessageBottom = lastMessage.offsetTop + lastMessage.offsetHeight;
        if (lastMessageBottom > containerHeight) {
            chatMessages.scrollTop = lastMessageBottom - containerHeight;
        }
    }

}


function displayTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('typing-indicator');
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingIndicator);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typingIndicator = chatMessages.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}


// Event Listeners
resetChat.addEventListener('click', () => {
    // Reset all counters when closing the chat
    messageCount = 0;
    chatMessages.innerHTML = '';
    threadId = null; // ustawiamy na null
    initializeChat();
});
    
chatForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const message = chatInput.value.trim();
      if (message) {
        sendMessage(message);
        chatInput.value = '';
    }
});


chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        chatSendButton.click();
    }
});


// Initialize chat on page load
window.onload = function () {
    initializeChat();
};
