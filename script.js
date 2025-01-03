let threadId = null;
let messageCount = 0;
let welcomeMessageShown = false;
const chatContainer = document.getElementById('chat-container');
const chatInput = document.querySelector('#chat-input-frame input');
const chatSendButton = document.querySelector('#chat-input button');
const chatMessages = document.getElementById('chat-messages');
const resetChat = document.getElementById('reset-chat');
const resetButtonMobile = document.getElementById('reset');
const SERVERLESS_FUNCTION_URL = 'https://europe-central2-mickiewicz.cloudfunctions.net/chat';
const chatForm = document.getElementById('chat-form');
const backButton = document.getElementById('back-button');
const leftSide = document.querySelector('.left-side');
const mobileWelcomeScreen = document.querySelector('.mobile-welcome-screen');
const chatWrapper = document.getElementById('chat-wrapper');
const startChatButton = document.getElementById('start-chat-button');

// Session storage management
const hasSeenWelcome = () => sessionStorage.getItem('hasSeenWelcome') === 'true';
const setWelcomeSeen = () => sessionStorage.setItem('hasSeenWelcome', 'true');

function saveChatToLocalStorage() {
    const chatData = {
        messages: Array.from(chatMessages.children).map(element => ({
            role: element.classList.contains('user-message') ? 'user' : 'assistant',
            message: element.innerHTML,
            isMarkdown: element.innerHTML.includes("<p>")
        })),
        threadId: threadId,
        messageCount: messageCount
    };
    localStorage.setItem('chatData', JSON.stringify(chatData));
}

function loadChatFromLocalStorage() {
    const storedChatData = localStorage.getItem('chatData');
    if (storedChatData) {
        const chatData = JSON.parse(storedChatData);
        if (chatData.messages) {
            chatData.messages.forEach(msg => {
                displayMessage(msg.role, msg.message, msg.isMarkdown);
            });
        }
        threadId = chatData.threadId;
        messageCount = chatData.messageCount;
        console.log('Chat loaded from local storage with thread ID:', threadId);
        scrollToBottom();
    }
}

async function initializeChat(showWelcomeMessage = true) {
    try {
        messageCount = 0;
        loadChatFromLocalStorage();
        if (!threadId && showWelcomeMessage && !welcomeMessageShown) {
            displayMessage('assistant', 'Cześć, jestem Adam Mickiewicz i chętnie Ci o sobie opowiem. :)');
            console.log('Chat initialized with thread ID:', threadId);
            welcomeMessageShown = true;
        }
    } catch (error) {
        console.error('Error initializing chat:', error);
    }
}

async function sendMessage(message) {
    try {
        console.log('Wysyłanie wiadomości:', message);
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
        console.log('Odpowiedź serwera:', response);
        const data = await response.json();
        removeTypingIndicator();
        console.log('Dane z serwera:', data);
        if (data.threadId) {
            threadId = data.threadId;
        }
        displayMessage('assistant', data.response, true);
        saveChatToLocalStorage();
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

function showWelcomeScreen() {
    if (window.innerWidth <= 768 && !hasSeenWelcome()) {
        mobileWelcomeScreen.style.display = 'flex';
        chatWrapper.style.display = 'none';
        backButton.style.display = 'flex';
        leftSide.style.display = 'none';
    } else {
        hideWelcomeScreen();
    }
}

function hideWelcomeScreen() {
    mobileWelcomeScreen.style.display = 'none';
    chatWrapper.style.display = 'flex';
    if (window.innerWidth <= 768) {
        backButton.style.display = 'flex';
        leftSide.style.display = 'none';
    } else {
        backButton.style.display = 'none';
        leftSide.style.display = 'flex';
    }
}

function clearChat() {
    messageCount = 0;
    chatMessages.innerHTML = '';
    threadId = null;
    localStorage.removeItem('chatData');
    welcomeMessageShown = false;
    
    if (window.innerWidth <= 768) {
        sessionStorage.removeItem('hasSeenWelcome');
        showWelcomeScreen();
    } else {
        initializeChat();
    }
}

// Event Listeners
resetChat.addEventListener('click', clearChat);
resetButtonMobile.addEventListener('click', clearChat);

chatForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (message) {
        sendMessage(message);
        chatInput.value = '';
    }
});

backButton.addEventListener('click', () => {
    if (!hasSeenWelcome()) {
        showWelcomeScreen();
    } else {
        hideWelcomeScreen();
    }
});

startChatButton.addEventListener('click', () => {
    setWelcomeSeen();
    hideWelcomeScreen();
    initializeChat();
});

// Initial setup
window.onload = function () {
    showWelcomeScreen();
    initializeChat();
};

window.addEventListener('resize', function () {
    if (window.innerWidth <= 768) {
        if (!hasSeenWelcome()) {
            showWelcomeScreen();
        }
    } else {
        hideWelcomeScreen();
    }
});
