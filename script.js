let threadId = null;
let messageCount = 0;
let sessionStarted = false;
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

function saveChatToLocalStorage() {
    const chatData = {
        messages: Array.from(chatMessages.children).map(element => ({
            role: element.classList.contains('user-message') ? 'user' : 'assistant',
            message: element.innerHTML,
            isMarkdown: element.innerHTML.includes("<p>")
        })),
        threadId: threadId,
        messageCount: messageCount,
        sessionStarted: sessionStarted
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
        sessionStarted = chatData.sessionStarted || false;
        console.log('Chat loaded from local storage with thread ID:', threadId, 'Session started:', sessionStarted);
        scrollToBottom();
    }
}

async function initializeChat() {
    try {
        messageCount = 0;
        loadChatFromLocalStorage();
        if (window.innerWidth <= 768) { // Tylko na mobile
            if (!sessionStarted) {
                showWelcomeScreen();
                displayMessage('assistant', 'Cześć, jestem Adam Mickiewicz i chętnie Ci o sobie opowiem. :)');
            } else {
                hideWelcomeScreen();
            }
        } else {
            hideWelcomeScreen(); // Na desktopie zawsze ukryj
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

function clearChat() {
    messageCount = 0;
    chatMessages.innerHTML = '';
    threadId = null;
    localStorage.removeItem('chatData');
    sessionStarted = false; // Resetujemy stan sesji
    if (window.innerWidth <= 768) {
        hideWelcomeScreen(); // Po resecie na mobile wracamy do widoku czatu
    }
}

function showWelcomeScreen() {
    mobileWelcomeScreen.style.display = 'flex';
    chatWrapper.style.display = 'none';
    backButton.style.display = 'none';
    if (window.innerWidth <= 768) {
        leftSide.style.display = 'none';
    }
}

function hideWelcomeScreen() {
    mobileWelcomeScreen.style.display = 'none';
    chatWrapper.style.display = 'flex';
    if (window.innerWidth <= 768) {
        backButton.style.display = 'flex';
        leftSide.style.display = 'none';
    }
}

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
    if (window.innerWidth <= 768) {
        showWelcomeScreen();
    }
});

startChatButton.addEventListener('click', () => {
    sessionStarted = true;
    saveChatToLocalStorage();
    hideWelcomeScreen();
});

window.onload = function () {
    initializeChat();
};

window.addEventListener('resize', function () {
    if (window.innerWidth <= 768) {
        if (sessionStarted) {
            hideWelcomeScreen();
        } else {
            showWelcomeScreen();
        }
    } else {
        hideWelcomeScreen(); // Na desktopie zawsze ukryj
    }
});
