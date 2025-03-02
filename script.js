let threadId = null;
let messageCount = 0;
let welcomeMessageShown = false;
let isFirstLoad = true;
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
    chatMessages.innerHTML = '';
    const storedChatData = localStorage.getItem('chatData');
    if (storedChatData) {
        const chatData = JSON.parse(storedChatData);
        if (chatData.messages) {
            chatData.messages.forEach(msg => {
                displayMessage(msg.role, msg.message, msg.isMarkdown, false); // isStreaming ustaw na false przy ładowaniu
            });
        }
        threadId = chatData.threadId;
        messageCount = chatData.messageCount;
        welcomeMessageShown = true;
        console.log('Chat loaded from local storage with thread ID:', threadId);
        scrollToBottom();
    }
}

async function initializeChat(showWelcomeMessage = true) {
    try {
        if (isFirstLoad) {
            loadChatFromLocalStorage();
            isFirstLoad = false;
        }

        if (!localStorage.getItem('chatData') && showWelcomeMessage && !welcomeMessageShown) {
            displayMessage('assistant', 'Cześć, jestem Adam Mickiewicz i chętnie Ci o sobie opowiem. :)');
            displayMessage('assistant', 'Odpowiedzi generowane są przez AI, zachowaj do nich dystans.');
            welcomeMessageShown = true;
            saveChatToLocalStorage();
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

        if (!response.ok) {
            removeTypingIndicator();
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        removeTypingIndicator();

        const assistantMessageElement = displayMessage('assistant', '', false, true);
        let partialResponse = "";

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("Strumień zakończony.");
                saveChatToLocalStorage();
                break;
            }
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
                const content = line.substring(5); // Usuń "data: "
                try {
                    const payload = JSON.parse(content);
                    if (payload.response) {
                        console.log("Odebrano chunk SSE:", payload.response);
                        partialResponse += payload.response;
                        assistantMessageElement.innerHTML = marked.parse(partialResponse); // PARSUJ MARKDOWN I WYŚWIETLAJ W TRAKCIE STRUMIENIOWANIA
                        scrollToBottom();
                    }
                    if (payload.threadId) {
                        threadId = payload.threadId;
                    }
                    if (payload.done) {
                        console.log("Odpowiedź DONE signal odebrany.");
                        if (payload.fullResponse) {
                            // Nie trzeba ponownie parsować Markdown tutaj
                        }
                        reader.cancel();
                        saveChatToLocalStorage();
                        return;
                    }
                    if (payload.error) {
                        console.error("Błąd ze strumienia:", payload.error);
                        assistantMessageElement.textContent = "Przepraszam, wystąpił błąd.";
                        reader.cancel();
                        return;
                    }

                } catch (e) {
                    console.error("Błąd parsowania JSON:", e, content);
                }
            }
        }


    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
        displayMessage('assistant', 'Przepraszam, wystąpił problem z serwerem.', false);
    }
}

function displayMessage(role, message, isMarkdown = false, isStreaming = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${role}-message`);

    if (!isStreaming) { // Jeśli to nie jest strumieniowanie, ustaw całą wiadomość od razu
        if (isMarkdown) {
            messageElement.innerHTML = marked.parse(message);
        } else {
            messageElement.textContent = message;
        }
    } else {
        // Dla strumieniowania, wiadomość jest budowana stopniowo, więc element jest początkowo pusty
    }

    chatMessages.appendChild(messageElement);
    scrollToBottom();
    return messageElement; // Zwróć element wiadomości, aby można go było aktualizować w strumieniu
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
    if (window.innerWidth <= 768) {
        mobileWelcomeScreen.style.display = 'flex';
        chatWrapper.style.display = 'none';
        backButton.style.display = 'flex';
        leftSide.style.display = 'none';
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
    isFirstLoad = true;
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
    showWelcomeScreen();
});

startChatButton.addEventListener('click', () => {
    setWelcomeSeen();
    hideWelcomeScreen();
});

window.onload = function () {
    if (window.innerWidth <= 768) {
        showWelcomeScreen();
    } else {
        hideWelcomeScreen();
    }
    initializeChat();
};

window.addEventListener('resize', function () {
    if (window.innerWidth <= 768) {
        backButton.style.display = 'flex';
    } else {
        backButton.style.display = 'none';
        hideWelcomeScreen();
    }
});
