let threadId = null;
let messageCount = 0;
let welcomeMessageShown = false;
const chatContainer = document.getElementById('chat-container');
const chatInput = document.querySelector('#chat-input-frame input');
const chatSendButton = document.querySelector('#chat-input button');
const chatMessages = document.getElementById('chat-messages');
const resetChat = document.getElementById('reset-chat');
const resetButtonMobile = document.getElementById('reset'); // Referencja do nowego przycisku resetowania
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
         if(!threadId && showWelcomeMessage && !welcomeMessageShown) {
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

function clearChat() {
    messageCount = 0;
    chatMessages.innerHTML = '';
    threadId = null;
    localStorage.removeItem('chatData');
    welcomeMessageShown = false;
    initializeChat();
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
    mobileWelcomeScreen.style.display = 'flex';
    chatWrapper.style.display = 'none';
    backButton.style.display = 'none';
    if (window.innerWidth <= 768) {
        leftSide.style.display = 'none';
    } else {
        leftSide.style.display = 'flex';
    }
});

startChatButton.addEventListener('click', () => {
    requestAnimationFrame(() => {
        mobileWelcomeScreen.style.display = 'none';
        chatWrapper.style.display = 'flex';
        if (window.innerWidth <= 768) {
            backButton.style.display = 'flex';
            leftSide.style.display = 'none';
        }
    });
});

window.onload = function () {
    if (window.innerWidth > 768) {
        mobileWelcomeScreen.style.display = 'none';
        chatWrapper.style.display = 'flex';
        backButton.style.display = 'none';
         initializeChat();
    } else {
           mobileWelcomeScreen.style.display = 'flex';
          chatWrapper.style.display = 'none';
          initializeChat(); // Przywróć wywołanie initializeChat
    }
};

window.addEventListener('resize', function () {
    if (window.innerWidth <= 768) {
        mobileWelcomeScreen.style.display = 'flex';
        chatWrapper.style.display = 'none';
        backButton.style.display = 'flex';
    } else {
        mobileWelcomeScreen.style.display = 'none';
        chatWrapper.style.display = 'flex';
        backButton.style.display = 'none';
    }
});
