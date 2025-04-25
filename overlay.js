// Global variables for storing analysis results and solutions data
let currentResults = {
  speech: {},
  vision: {},
  hearing: {},
  language: {}
};

let isRecognizing = false;
let currentPageUrl = null;
let audioState = 'play'; // 'play', 'pause', or 'resume'
let audioPosition = 0;

// Initialize with empty data structure for each category
currentResults = {
  speech: {
    voiceControl: false,
    speechToText: false,
    noSpeechOnly: false
  },
  vision: {
    screenReader: false,
    keyboardNavigation: false,
    highContrast: false
  },
  hearing: {
    captions: false,
    transcripts: false,
    visualAlerts: false
  },
  language: {
    simpleLanguage: false,
    consistentNavigation: false,
    errorPrevention: false
  }
};

// Global variable for the speech synthesis utterance
let currentSpeechUtterance = null;

// Wait for document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Overlay DOM loaded - Fixed version");
  
  // Load solutions data immediately
  loadSolutionsData();
  
  // Initialize Direct Button Handlers
  setupButtonHandlers();
  
  // Attach tab navigation handlers
  setupTabNavigation();
  
  // Initialize the theme based on saved preference
  initializeTheme();
  
  // Setup drag handle for moving the overlay
  setupDragHandle();
  
  // Initialize speech recognition
  initSpeechRecognition();
  
  // Listen for messages from parent window (content script)
  listenForMessages();
  
  // Fix speech-to-text functionality
  fixSpeechToTextInChat();
  
  // Setup tell-me-button functionality
  setupTellMeButton();
});

// Function to set up all general button handlers
function setupButtonHandlers() {
  console.log("Setting up button handlers");

  // Close Button
  const closeButton = document.getElementById('closeButton');
  if (closeButton) {
    closeButton.onclick = () => window.parent.postMessage({ action: 'closeOverlay' }, '*');
  }

  // Analyze Button
  const analyzeButton = document.getElementById('analyzeButton');
  if (analyzeButton) {
    analyzeButton.onclick = () => {
      console.log("Analyze button clicked");
      const loadingElement = document.getElementById('loading');
      if (loadingElement) {
        loadingElement.style.display = 'flex';
        loadingElement.querySelector('.loading-text').textContent = 'Analyzing page...';
      }
      window.parent.postMessage({ action: 'runAnalysis' }, '*');
    };
  }

  // Settings Dropdown Toggle
  const settingsButton = document.getElementById('settingsButton');
  const settingsDropdown = document.getElementById('settingsDropdown');
  if (settingsButton && settingsDropdown) {
    settingsButton.onclick = (e) => {
      e.stopPropagation();
      settingsDropdown.style.display = settingsDropdown.style.display === 'block' ? 'none' : 'block';
    };
    document.addEventListener('click', (e) => {
      if (!settingsButton.contains(e.target) && !settingsDropdown.contains(e.target)) {
        settingsDropdown.style.display = 'none';
      }
    });
  }
  
  // Settings Menu Items
  setupSettingsMenuItems(); 

  // Back Button (Details View)
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.onclick = hideDetailsView;
  }
  
  // Feature Selection Start Button
  const startAnalysisButton = document.getElementById('startAnalysis');
  if (startAnalysisButton) {
      startAnalysisButton.onclick = () => {
          console.log("Start Analysis button clicked");
          saveFeatureSelections();
          const featureOverlay = document.getElementById('featureSelectionOverlay');
          if(featureOverlay) featureOverlay.style.display = 'none';
          if (analyzeButton) analyzeButton.click(); // Trigger analysis after selection
      };
  }
  
  // Chat related buttons
  setupChatButtons();

  console.log("General button handlers setup complete.");
}

// Function to set up settings menu handlers
function setupSettingsMenuItems() {
    console.log("Setting up settings menu item handlers");
    const settingsDropdown = document.getElementById('settingsDropdown');
    const closeDropdown = () => { if (settingsDropdown) settingsDropdown.style.display = 'none'; };

    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) darkModeToggle.onclick = () => { toggleDarkMode(); closeDropdown(); };

    const exportReport = document.getElementById('exportReport');
    if (exportReport) exportReport.onclick = () => { exportReadinessReport(); closeDropdown(); };

    const exportSolutions = document.getElementById('exportSolutions');
    if (exportSolutions) exportSolutions.onclick = () => { exportSolutionsReport(); closeDropdown(); };
    else console.warn("Export solution button not found in settings menu!");
    
    const resetPreferences = document.getElementById('resetReferences');
    if (resetPreferences) {
      resetPreferences.onclick = () => {
        localStorage.removeItem('darkMode');
        localStorage.removeItem('sidebarMinimized');
        document.body.classList.remove('dark-mode');
        const sidebarContainer = document.querySelector('.sidebar-container');
        if (sidebarContainer) sidebarContainer.classList.remove('minimized');
        showNotification("Preferences reset to default");
        showFeatureSelection();
        closeDropdown();
      };
    }

    const contactSamantha = document.getElementById('contactSamantha');
    if (contactSamantha) {
      contactSamantha.onclick = () => {
        console.log("Contact Samantha clicked");
        window.open('mailto:sr5516@nyu.edu?subject=Unless%20Support%20Request', '_blank');
        closeDropdown();
      };
    }
  
    const about = document.getElementById('about');
    if (about) {
      about.onclick = () => {
        console.log("About clicked");
        showNotification("Unless - Multimodal Accessibility Analyzer v1.0.8");
        closeDropdown();
      };
    }
} // End of setupSettingsMenuHandlers

// Function to set up chat buttons
function setupChatButtons() {
  // Chat button
  const chatButton = document.getElementById('chatButton');
  const chatPanel = document.getElementById('chatPanel');
  if (chatButton && chatPanel) {
    chatButton.onclick = function() {
      console.log("Chat button clicked");
      chatPanel.style.display = 'flex';
    };
  }
  
  // Chat close button
  const chatClose = document.getElementById('chatClose');
  if (chatClose && chatPanel) {
    chatClose.onclick = function() {
      console.log("Chat close button clicked");
      chatPanel.style.display = 'none';
    };
  }
  
  // Chat send button
  const chatSend = document.getElementById('chatSend');
  const chatInput = document.getElementById('chatInput');
  if (chatSend && chatInput) {
    chatSend.onclick = function() {
      console.log("Chat send button clicked");
      sendChatMessage();
    };
    
    // Also send message on Enter key
    chatInput.onkeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    };
  }
  
  // Chat voice button - new functionality
  const chatVoice = document.getElementById('chatVoice');
  if (chatVoice) {
    chatVoice.onclick = function() {
      console.log("Chat voice button clicked");
      toggleSpeechRecognition();
    };
  }
}

// Function to fix speech-to-text functionality in chat
function fixSpeechToTextInChat() {
  const voiceInputButton = document.getElementById('voice-input-button');
  const chatInput = document.getElementById('chat-input');
  
  if (!voiceInputButton || !chatInput) return;
  
  voiceInputButton.addEventListener('click', function() {
    try {
      // Use browser's speech recognition API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        showSpeechError("Speech recognition not supported in this browser");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      // Show active state
      voiceInputButton.classList.add('active');
      
      recognition.start();
      
      recognition.onresult = function(event) {
        const speechResult = event.results[0][0].transcript;
        chatInput.value = speechResult;
        voiceInputButton.classList.remove('active');
      };
      
      recognition.onerror = function(event) {
        console.error('Speech recognition error', event.error);
        voiceInputButton.classList.remove('active');
        showSpeechError("Error: " + event.error);
      };
      
      recognition.onend = function() {
        voiceInputButton.classList.remove('active');
      };
    } catch (error) {
      console.error('Speech recognition error:', error);
      showSpeechError("Speech recognition failed to initialize");
    }
  });
}

// Helper function to show speech error
function showSpeechError(message) {
  const chatInput = document.getElementById('chat-input');
  if (!chatInput) return;
  
  // Add error styling
  chatInput.classList.add('speech-to-text-error');
  
  // Create error message if doesn't exist
  let errorMsg = document.querySelector('.speech-error-message');
  if (!errorMsg) {
    errorMsg = document.createElement('div');
    errorMsg.className = 'speech-error-message';
    chatInput.parentNode.appendChild(errorMsg);
  }
  
  errorMsg.textContent = message;
  
  // Remove error after 3 seconds
  setTimeout(() => {
    chatInput.classList.remove('speech-to-text-error');
    if (errorMsg) {
      errorMsg.textContent = '';
    }
  }, 3000);
}

function initSpeechRecognition() {
  try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      // Check for permission before initializing
      navigator.permissions.query({ name: 'microphone' })
        .then(function(permissionStatus) {
          if (permissionStatus.state === 'granted') {
            // Permission already granted, proceed with initialization
            initializeSpeechRecognition();
          } else if (permissionStatus.state === 'prompt') {
            // Permission needs to be requested
            console.log('Microphone permission needs to be requested.');
            // You can add a UI element here to prompt the user to enable microphone
            // For example, a button that triggers the request.
            // For now, we'll just log a message.
            showNotification("Please allow microphone access for voice input.");
            initializeSpeechRecognition();
          } else if (permissionStatus.state === 'denied') {
            // Permission denied
            console.warn('Microphone permission denied.');
            showNotification("Microphone access is denied. Voice input will not work.");
          }
          permissionStatus.onchange = function() {
            console.log("Permission status changed to: ", this.state);
            if (this.state === 'granted') {
              initializeSpeechRecognition();
            }
          }
        })
        .catch(function(err) {
          console.error('Error querying microphone permission:', err);
        });
    } else {
      console.warn("Speech Recognition not supported by this browser");
    }
  } catch (e) {
    console.error("Error initializing speech recognition:", e);
  }
}

function initializeSpeechRecognition() {
  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = false;
  speechRecognition.interimResults = false;
  speechRecognition.lang = 'en-US';

  speechRecognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.value = transcript;
    }
  };

  speechRecognition.onend = function() {
    isRecognizing = false;
    const chatVoice = document.getElementById('chatVoice');
    if (chatVoice) {
      chatVoice.classList.remove('active');
    }
  };

  speechRecognition.onerror = function(event) {
    console.error("Speech recognition error:", event.error);
    isRecognizing = false;
    const chatVoice = document.getElementById('chatVoice');
    if (chatVoice) {
      chatVoice.classList.remove('active');
    }
    if (event.error === 'not-allowed') {
      showNotification("Microphone access was denied. Please check your browser settings.");
    } else {
      showNotification("Speech recognition error: " + event.error);
    }
  };

  console.log("Speech recognition initialized");
}


// Toggle speech recognition
function toggleSpeechRecognition() {
  if (!speechRecognition) {
    showNotification("Speech recognition is not supported in your browser");
    return;
  }
  
  const chatVoice = document.getElementById('chatVoice');
  
  if (isRecognizing) {
    // Stop recognition
    speechRecognition.stop();
    isRecognizing = false;
    if (chatVoice) chatVoice.classList.remove('active');
    console.log("Speech recognition stopped");
  } else {
    // Start recognition
    try {
      speechRecognition.start();
      isRecognizing = true;
      if (chatVoice) chatVoice.classList.add('active');
      console.log("Speech recognition started");
    } catch (e) {
      console.error("Error starting speech recognition:", e);
      showNotification("Could not start speech recognition");
    }
  }
}

// Function to send chat message
function sendChatMessage() {
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  
  if (!chatInput || !chatMessages) return;
  
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Add user message
  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'chat-message user';
  userMessageDiv.innerHTML = `<div class="message-text">${message}</div>`;
  chatMessages.appendChild(userMessageDiv);
  
  // Clear input
  chatInput.value = '';
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Generate assistant response after a short delay
  setTimeout(() => {
    const response = generateAssistantResponse(message);
    
    // Add assistant message
    const assistantMessageDiv = document.createElement('div');
    assistantMessageDiv.className = 'chat-message assistant';
    assistantMessageDiv.innerHTML = `<div class="message-text">${response}</div>`;
    chatMessages.appendChild(assistantMessageDiv);
    
    // Scroll to bottom again
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 500);
}

// Simple assistant response generator
function generateAssistantResponse(message) {
  // Convert to lowercase for easier matching
  const lowerMessage = message.toLowerCase();
  
  // Simple response logic based on keywords
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your accessibility expert. How can I help you today?";
  }
  
  if (lowerMessage.includes('voice control') || lowerMessage.includes('speech recognition')) {
    return "Voice control allows users to interact with websites using spoken commands. This is particularly important for users with motor disabilities or those who prefer using voice for navigation.";
  }
  
  if (lowerMessage.includes('screen reader')) {
    return "Screen readers are essential tools for users with visual impairments. They convert digital text into synthesized speech. To make websites compatible with screen readers, use proper semantic HTML, provide alt text for images, and ensure keyboard accessibility.";
  }
  
  if (lowerMessage.includes('caption') || lowerMessage.includes('transcript')) {
    return "Captions and transcripts make audio and video content accessible to users who are deaf or hard of hearing. They also benefit users in noisy environments or those who prefer reading to listening.";
  }
  
  // Default response
  return "That's an interesting question about accessibility. The key to good accessibility is providing multiple ways (multimodal approaches) for users to interact with your content. Is there a specific feature you'd like to know more about?";
}

// Function to set up tab navigation
function setupTabNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.onclick = function() {
      console.log("Tab clicked:", this.getAttribute('data-tab'));
      
      // Remove active class from all items
      navItems.forEach(nav => nav.classList.remove('active'));
      
      // Add active class to clicked item
      this.classList.add('active');
      
      // Get the tab name
      const tabName = this.getAttribute('data-tab');
      
      // Hide all tab content
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Show selected tab content
      const selectedTab = document.getElementById(`${tabName}-content`);
      if (selectedTab) {
        selectedTab.classList.add('active');
      }
    };
  });
}

// Function to save feature selections
function saveFeatureSelections() {
  console.log("Saving feature selections");
  
  const checkboxes = document.querySelectorAll('.feature-option-checkbox');
  const preferences = {
    categories: {
      speech: false,
      vision: false,
      hearing: false,
      language: false
    },
    features: {
      speech: {},
      vision: {},
      hearing: {},
      language: {}
    }
  };
  
  checkboxes.forEach(checkbox => {
    const category = checkbox.getAttribute('data-category');
    const feature = checkbox.getAttribute('data-feature');
    
    if (category && feature) {
      // Ensure category is marked as active if any feature is selected
      if (checkbox.checked) {
        preferences.categories[category] = true;
      }
      
      // Store feature preference
      if (!preferences.features[category]) {
        preferences.features[category] = {};
      }
      
      preferences.features[category][feature] = checkbox.checked;
    }
  });
  
  // Store preferences to be processed by the background script
  window.parent.postMessage({
    action: 'savePreferences',
    preferences: preferences
  }, '*');
  
  showNotification("Feature preferences saved");
}

// Function to load solutions data
function loadSolutionsData() {
  console.log("Loading solutions data");
  
  // Try to load from chrome.runtime.getURL if available
  try {
    fetch(chrome.runtime.getURL('solutions-data.json'))
      .then(response => response.json())
      .then(data => {
        console.log("Solutions data loaded from extension");
        solutionsData = data;
      })
      .catch(error => {
        console.error("Error loading solutions data from extension:", error);
        // Load fallback data
        loadFallbackSolutionsData();
      });
  } catch (e) {
    console.log("Chrome runtime not available, using fallback data");
    loadFallbackSolutionsData();
  }
}

// Function to load fallback solutions data
function loadFallbackSolutionsData() {
  // Simple structure with some default solutions
  solutionsData = {
    speech: { voiceControl: [], speechToText: [], noSpeechOnly: [] },
    vision: { screenReader: [], keyboardNavigation: [], highContrast: [] },
    hearing: { captions: [], transcripts: [], visualAlerts: [] },
    language: { simpleLanguage: [], consistentNavigation: [], errorPrevention: [] }
  };
  
  // Add some sample solutions
  solutionsData.speech.voiceControl = [
    {
      id: "chrome-voice",
      title: "Chrome Voice Control",
      description: "Enable built-in voice commands in Chrome",
      link: "chrome://settings/accessibility",
      tags: ["popular", "easiest", "$0"]
    }
  ];
  
  solutionsData.vision.screenReader = [
    {
      id: "nvda",
      title: "NVDA Screen Reader",
      description: "Free, open-source screen reader for Windows",
      link: "https://www.nvaccess.org/download/",
      tags: ["popular", "$0"]
    }
  ];
}

// Function to setup drag handle
function setupDragHandle() {
  const dragHandle = document.getElementById('dragHandle');
  if (dragHandle) {
    dragHandle.onmousedown = function(e) {
      console.log("Drag handle mousedown event");
      window.parent.postMessage({
        action: 'dragHandleMouseDown',
        clientX: e.clientX,
        clientY: e.clientY
      }, '*');
    };
  }
}

// Function to listen for messages from parent window
// Update the listenForMessages function to capture URL from analysis results
function listenForMessages() {
  window.addEventListener('message', function(event) {
    try {
      console.log("Overlay received message:", event.data);
      
      const message = event.data;
      if (!message || !message.action) {
        console.warn("Received invalid message format:", message);
        return;
      }
      
      // Message handling logic
      switch (message.action) {
        case 'updateResults':
          if (message.category && message.results) {
            // Capture the URL if it's provided in the message
            if (message.url) {
              currentPageUrl = message.url;
              console.log("Page URL captured:", currentPageUrl);
            }
            updateResults(message.category, message.results);
          } else {
            console.warn("Invalid updateResults message:", message);
          }
          break;
          
        // Other cases remain the same
        case 'analysisTimeout':
          const loadingElement = document.getElementById('loading');
          if (loadingElement) loadingElement.style.display = 'none';
          showNotification("Analysis timed out. The page may be too complex or slow to respond.");
          break;
          
        case 'analysisError':
          const loadingEl = document.getElementById('loading');
          if (loadingEl) loadingEl.style.display = 'none';
          showNotification(`Analysis error: ${message.error || 'Unknown error'}`);
          break;
        
        // Add a specific case for capturing URL
        case 'setPageUrl':
          if (message.url) {
            currentPageUrl = message.url;
            console.log("Page URL set:", currentPageUrl);
          }
          break;
          
        // Other cases remain the same
        case 'showFeatureSelection':
          const featureSelectionOverlay = document.getElementById('featureSelectionOverlay');
          if (featureSelectionOverlay) {
            featureSelectionOverlay.style.display = 'flex';
          }
          break;
          
        case 'analysisComplete':
          console.log("Analysis complete");
          break;
          
        default:
          console.warn("Unknown message action:", message.action);
      }
    } catch (error) {
      console.error("Error handling message:", error, event.data);
    }
  });
}

// Function to update results in UI
function updateResults(category, results) {
  console.log("Updating results for category:", category, results);
  
  // Store results
  currentResults[category] = results;
  
  // Hide loading state
  const loadingElement = document.getElementById('loading');
  if (loadingElement) loadingElement.style.display = 'none';
  
  // Update tab content based on category
  const tabContent = document.getElementById(`${category}-content`);
  if (tabContent) {
    // Clear previous results
    tabContent.innerHTML = '';
    
    // Add features based on category
    if (category === 'speech') {
      displaySpeechFeatures(tabContent, results);
    } else if (category === 'vision') {
      displayVisionFeatures(tabContent, results);
    } else if (category === 'hearing') {
      displayHearingFeatures(tabContent, results);
    } else if (category === 'language') {
      console.log("Calling displayLanguageFeatures with results:", results); // Added log
      displayLanguageFeatures(tabContent, results);
    }
  } else {
    console.warn(`Tab content container not found for category: ${category}-content`); // Added log
  }
  
  // Calculate and update overall score
  updateAccessibilityScore();
}

// Function to update accessibility score
function updateAccessibilityScore() {
  console.log("Updating accessibility score");
  
  let totalFeatures = 0;
  let availableFeatures = 0;
  
  for (const category in currentResults) {
    const results = currentResults[category];
    
    for (const feature in results) {
      totalFeatures++;
      if (results[feature] === true) {
        availableFeatures++;
      }
    }
  }
  
  // Calculate percentage score
  const score = totalFeatures > 0 ? Math.round((availableFeatures / totalFeatures) * 100) : 0;
  
  // Update UI
  const accessibilityScore = document.getElementById('accessibilityScore');
  const scoreDescription = document.getElementById('scoreDescription');
  const scoreCircle = document.getElementById('scoreCircle');
  
  if (accessibilityScore) accessibilityScore.textContent = score;
  
  // Update score circle styling based on score
  if (scoreCircle) {
    scoreCircle.className = 'score-circle';
    
    if (score < 30) {
      scoreCircle.classList.add('poor');
      if (scoreDescription) scoreDescription.textContent = 'Poor - Major accessibility issues';
    } else if (score < 60) {
      scoreCircle.classList.add('fair');
      if (scoreDescription) scoreDescription.textContent = 'Fair - Needs improvement';
    } else if (score < 85) {
      scoreCircle.classList.add('good');
      if (scoreDescription) scoreDescription.textContent = 'Good - Some issues to address';
    } else {
      scoreCircle.classList.add('excellent');
      if (scoreDescription) scoreDescription.textContent = 'Excellent - High accessibility';
    }
  }
}

// Function to display speech features
function displaySpeechFeatures(container, results) {
  // Add title
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = 'Speech Accessibility Features';
  container.appendChild(title);
  
  // Add features
  addFeatureItem(container, 'Voice Control Support', results.voiceControl, 
    'Ability to control the website using voice commands and voice assistants.',
    'speech', 'voiceControl');
  
  addFeatureItem(container, 'Speech-to-Text Input', results.speechToText,
    'Ability to use voice input for text fields, forms, and other interactive elements.',
    'speech', 'speechToText');
  
  addFeatureItem(container, 'Non-Voice Alternatives', results.noSpeechOnly,
    'All voice-controlled features have alternative methods of interaction.',
    'speech', 'noSpeechOnly');
}

// Function to display vision features
function displayVisionFeatures(container, results) {
  // Add title
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = 'Vision Accessibility Features';
  container.appendChild(title);
  
  // Add features
  addFeatureItem(container, 'Screen Reader Compatibility', results.screenReader,
    'Content is properly structured for screen readers and other assistive technologies.',
    'vision', 'screenReader');
  
  addFeatureItem(container, 'Keyboard Navigation', results.keyboardNavigation,
    'All functionality is accessible using keyboard-only navigation.',
    'vision', 'keyboardNavigation');
  
  addFeatureItem(container, 'High Contrast', results.highContrast,
    'Text and interactive elements have sufficient color contrast for readability.',
    'vision', 'highContrast');
}

// Function to display hearing features
function displayHearingFeatures(container, results) {
  // Add title
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = 'Hearing Accessibility Features';
  container.appendChild(title);
  
  // Add features
  addFeatureItem(container, 'Captions', results.captions,
    'Videos have closed captions or subtitles for spoken content.',
    'hearing', 'captions');
  
  addFeatureItem(container, 'Transcripts', results.transcripts,
    'Audio content has text transcripts available.',
    'hearing', 'transcripts');
  
  addFeatureItem(container, 'Visual Alerts', results.visualAlerts,
    'Audio alerts and notifications have visual indicators.',
    'hearing', 'visualAlerts');
}

// Function to display language features
function displayLanguageFeatures(container, results) {
  console.log("Inside displayLanguageFeatures. Container:", container, "Results:", results);
  
  // Add title
  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = 'Language Accessibility Features';
  container.appendChild(title);
  
  // Check if results object is valid
  if (!results || typeof results !== 'object') {
    console.error("Invalid results object passed to displayLanguageFeatures:", results);
    const error = document.createElement('p');
    error.textContent = 'Error: Could not load language features.';
    container.appendChild(error);
    return;
  }
  
  // Add features
  addFeatureItem(container, 'Simple Language', results.simpleLanguage,
    'Content is written in clear, simple language that is easy to understand.',
    'language', 'simpleLanguage');
  
  addFeatureItem(container, 'Consistent Navigation', results.consistentNavigation,
    'Navigation patterns are consistent throughout the website.',
    'language', 'consistentNavigation');
  
  addFeatureItem(container, 'Error Prevention', results.errorPrevention,
    'Forms and interactive elements help prevent and correct errors.',
    'language', 'errorPrevention');
}

// Helper function to add a feature item
function addFeatureItem(container, name, available, description, category, featureKey) {
  const item = document.createElement('div');
  item.className = 'feature-item';
  
  const header = document.createElement('div');
  header.className = 'feature-header';
  
  const featureName = document.createElement('div');
  featureName.className = 'feature-name';
  featureName.textContent = name;
  header.appendChild(featureName);
  
  const status = document.createElement('div');
  status.className = `feature-status ${available ? 'status-available' : 'status-unavailable'}`;
  status.textContent = available ? '✓ Available' : '✗ Not Available';
  header.appendChild(status);
  
  item.appendChild(header);
  
  const featureDescription = document.createElement('div');
  featureDescription.className = 'feature-description';
  featureDescription.textContent = description;
  item.appendChild(featureDescription);
  
  // Settings/Solutions Buttons now trigger the details view
  if (available) {
    // Add verification method
    const verificationMethod = document.createElement('div');
    verificationMethod.className = 'verification-method';
    
    const methodText = getVerificationMethodText(category, featureKey);
    verificationMethod.innerHTML = `
      <div class="verification-title">Verification Method:</div>
      <div class="verification-details">${methodText}</div>
    `;
    item.appendChild(verificationMethod);
    
    // Add settings button
    const settingsButton = document.createElement('button');
    settingsButton.className = 'settings-button';
    settingsButton.innerHTML = '<span class="settings-icon">⚙️</span> Adjust Settings';
    settingsButton.onclick = function() {
      console.log("Settings button clicked for:", category, featureKey);
      const settingsHtml = getSettingsContainerHTML(category, featureKey);
      showDetailsView(`${name} Settings`, settingsHtml);
    };
    item.appendChild(settingsButton);

  } else {
    // Add solutions button
    const solutionsButton = document.createElement('button');
    solutionsButton.className = 'solutions-button';
    solutionsButton.innerHTML = '<span class="solutions-icon">💡</span> How to enable';
    solutionsButton.onclick = function() {
      console.log("Solutions button clicked for:", category, featureKey);
      const solutionsHtml = getSolutionsContainerHTML(category, featureKey);
      showDetailsView(`How to enable ${name}`, solutionsHtml);
    };
    item.appendChild(solutionsButton);
  }
  
  // Add community benefit data
  addCommunityBenefitData(item, category, featureKey);
  
  container.appendChild(item);
}

// NEW Function to get HTML for the solutions container
function getSolutionsContainerHTML(category, feature) {
  let solutionsHtml = '<div class="solutions-container">';
  const solutions = solutionsData[category] && solutionsData[category][feature];

  if (solutions && solutions.length > 0) {
    solutionsHtml += '<ol class="solutions-list">';
    solutions.forEach((solution, index) => {
      solutionsHtml += `<li class="solution-item">
        <div class="solution-title-link"><a href="${solution.link}" target="_blank" class="solution-link" data-category="${category}" data-feature="${feature}">${solution.title}</a></div>
        <div class="solution-description">${solution.description}</div>`;
      
      if (solution.tags && solution.tags.length > 0) {
        solutionsHtml += '<div class="solution-tags">';
        solution.tags.forEach(tag => {
          solutionsHtml += `<span class="tag tag-${tag.replace('$', 'free').toLowerCase()}">${tag}</span>`;
        });
        solutionsHtml += '</div>';
      }
      solutionsHtml += '</li>';
    });
    solutionsHtml += '</ol>';
  } else {
    solutionsHtml += '<div class="no-solutions">No specific solutions available for this feature.</div>';
  }
  
  solutionsHtml += '</div>';
  return solutionsHtml;
}

// NEW Function to get HTML for the settings container
function getSettingsContainerHTML(category, feature) {
  let settingsHtml = '<div class="settings-container">';
  settingsHtml += '<div class="settings-content">' + getSettingsHTML(category, feature) + '</div>';
  // Note: Save button is removed here as settings adjustment is not fully implemented
  // If needed, add a way to save/apply settings within this view.
  settingsHtml += '</div>';
  return settingsHtml;
}

// Function to get settings HTML based on feature
function getSettingsHTML(category, feature) {
  // Simple settings options - in a real implementation, these would be more complex
  if (category === 'speech') {
    if (feature === 'voiceControl') {
      return `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable voice commands
          </label>
          <div class="setting-desc">Allow websites to listen for voice commands</div>
        </div>
      `;
    } else if (feature === 'speechToText') {
      return `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable speech-to-text
          </label>
          <div class="setting-desc">Allow dictation in text inputs</div>
        </div>
      `;
    }
  } else if (category === 'vision') {
    if (feature === 'screenReader') {
      return `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable screen reader
          </label>
          <div class="setting-desc">Use screen reader for this website</div>
        </div>
      `;
    } else if (feature === 'highContrast') {
      return `
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" checked> Enable high contrast
          </label>
          <div class="setting-desc">Apply high contrast to this website</div>
        </div>
      `;
    }
  }
  
  // Default settings
  return `
    <div class="setting-group">
      <div class="setting-desc">No configurable settings available for this feature.</div>
    </div>
  `;
}

// Function to add community benefit data
function addCommunityBenefitData(container, category, feature) {
  // Sample community data - would be more comprehensive in a real implementation
  const data = {
    users: 15000,
    improvementRate: 85,
    testimonial: {
      quote: "This feature dramatically improved my browsing experience.",
      author: "Alex M."
    }
  };
  
  // Create community data container
  const communityContainer = document.createElement('div');
  communityContainer.className = 'community-data';
  
  // Add title
  const title = document.createElement('h4');
  title.className = 'community-title';
  title.textContent = 'Community Impact';
  communityContainer.appendChild(title);
  
  // Add stats
  const stats = document.createElement('div');
  stats.className = 'community-stats';
  stats.innerHTML = `
    <div class="stat">
      <span class="stat-value">${data.users.toLocaleString()}</span>
      <span class="stat-label">Users Benefiting</span>
    </div>
    <div class="stat">
      <span class="stat-value">${data.improvementRate}%</span>
      <span class="stat-label">Report Improvement</span>
    </div>
  `;
  communityContainer.appendChild(stats);
  
  // Add testimonial
  const testimonial = document.createElement('div');
  testimonial.className = 'testimonial';
  testimonial.innerHTML = `
    <blockquote>"${data.testimonial.quote}"</blockquote>
    <cite>- ${data.testimonial.author}</cite>
  `;
  communityContainer.appendChild(testimonial);
  
  // Add to container
  container.appendChild(communityContainer);
}

// Function to get verification method text
function getVerificationMethodText(category, feature) {
  // Sample verification methods - would be more accurate in a real implementation
  if (category === 'speech') {
    if (feature === 'voiceControl') {
      return "Detected voice control API and voice command buttons in the interface.";
    } else if (feature === 'speechToText') {
      return "Found microphone buttons associated with text input fields.";
    } else if (feature === 'noSpeechOnly') {
      return "Verified all voice commands have keyboard or pointer alternatives.";
    }
  } else if (category === 'vision') {
    if (feature === 'screenReader') {
      return "Found proper ARIA attributes and semantic HTML structure.";
    } else if (feature === 'keyboardNavigation') {
      return "Verified all interactive elements can be accessed and operated via keyboard.";
    } else if (feature === 'highContrast') {
      return "Analyzed text and background color contrast ratios according to WCAG standards.";
    }
  }
  
  // Default verification method
  return "Used automated and manual testing techniques to verify this feature.";
}

// Function to get feature name
function getFeatureName(category, feature) {
  const featureNames = {
    speech: {
      voiceControl: 'Voice Control',
      speechToText: 'Speech-to-Text',
      noSpeechOnly: 'Non-Voice Alternatives'
    },
    vision: {
      screenReader: 'Screen Reader Compatibility',
      keyboardNavigation: 'Keyboard Navigation',
      highContrast: 'High Contrast'
    },
    hearing: {
      captions: 'Captions',
      transcripts: 'Transcripts',
      visualAlerts: 'Visual Alerts'
    },
    language: {
      simpleLanguage: 'Simple Language',
      consistentNavigation: 'Consistent Navigation',
      errorPrevention: 'Error Prevention'
    }
  };
  
  return featureNames[category]?.[feature] || feature;
}

// Function to read features aloud
function readFeaturesAloud() {
  console.log("Reading features aloud");
  
  if (Object.keys(currentResults).length === 0) {
    speakText("Please analyze the page first to get information about available features.");
    return;
  }
  
  // Build speech text
  let speechText = "Here's the Access+ Score. ";
  
  // Get score info
  const accessibilityScore = document.getElementById('accessibilityScore');
  const scoreDescription = document.getElementById('scoreDescription');
  
  if (accessibilityScore && scoreDescription) {
    speechText += `Overall  Access+ Score is ${accessibilityScore.textContent} percent. ${scoreDescription.textContent}. `;
  }
  
  // Available features
  let availableFeatures = [];
  let unavailableFeatures = [];
  
  Object.keys(currentResults).forEach(category => {
    const results = currentResults[category];
    
    Object.keys(results).forEach(feature => {
      if (results[feature] === true) {
        availableFeatures.push(getFeatureName(category, feature));
      } else {
        unavailableFeatures.push(getFeatureName(category, feature));
      }
    });
  });
  
  // Add available features to speech
  speechText += "Available features include: ";
  if (availableFeatures.length > 0) {
    speechText += availableFeatures.join(", ") + ". ";
  } else {
    speechText += "None. ";
  }
  
  // Add unavailable features to speech
  speechText += "Features not available include: ";
  if (unavailableFeatures.length > 0) {
    speechText += unavailableFeatures.join(", ") + ". ";
  } else {
    speechText += "None. Great job! ";
  }
  
  // Speak the text
  speakText(speechText);
}

// Function to speak text using web speech API
function speakText(text) {
  console.log("Speaking text:", text);
  
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Speak
    window.speechSynthesis.speak(utterance);
  } else {
    console.error("Speech synthesis not supported");
    showNotification("Speech synthesis is not supported in your browser");
  }
}

// Function to export  Access+ Score report as HTML
function exportReadinessReport() {
  console.log("Exporting readiness report");
  
  if (Object.keys(currentResults).length === 0) {
    showNotification("Please analyze the page first");
    return;
  }
  
  // Get current date and page info
  const date = new Date().toLocaleDateString();
  let pageUrl = "Unknown Page";
  try {
    pageUrl = window.parent.location.href;
  } catch (e) {
    console.error("Could not access parent location:", e);
  }
  
  // Build HTML report
  let htmlReport = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access+ Score Report</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
      }
      
      h1, h2, h3 {
        color: #444;
      }
      
      .report-header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }
      
      .report-date {
        color: #666;
        font-style: italic;
        margin-bottom: 15px;
      }
      
      .report-description {
        max-width: 750px;
        margin: 0 auto 25px auto;
        padding: 15px 20px;
        background-color: #f7f9fc;
        border-radius: 8px;
        border-left: 4px solid #5B42F3;
        text-align: left;
      }
      
      .report-description ul {
        margin: 10px 0;
        padding-left: 25px;
      }
      
      .report-description li {
        margin-bottom: 8px;
      }
      
      .rocket-emoji {
        font-size: 1.2em;
      }
      
      .strong-text {
        font-weight: bold;
      }
      
      .score-container {
        background-color: #f9f9f9;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        text-align: center;
      }
      
      .score-number {
        font-size: 48px;
        font-weight: bold;
        color: #5B42F3;
      }
      
      .score-description {
        margin-top: 10px;
      }
      
      .category-section {
        margin-bottom: 30px;
      }
      
      .feature-item {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
      }
      
      .feature-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .feature-name {
        font-weight: bold;
        font-size: 16px;
      }
      
      .feature-status {
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .status-available {
        background-color: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
      }
      
      .status-unavailable {
        background-color: rgba(244, 67, 54, 0.2);
        color: #F44336;
      }
      
      .feature-description {
        color: #666;
        margin-bottom: 10px;
      }
      
      .verification-method {
        background-color: #f0f8ff;
        border-radius: 4px;
        padding: 10px;
        font-size: 14px;
        border-left: 3px solid #4285f4;
      }
      
      .report-footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        font-size: 12px;
        color: #666;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="report-header">
      <h1>Access+ Score | Your Multimodal Starting Point</h1>
      <div class="report-date">Generated on ${date}</div>
      <div>Analyzed Page: ${pageUrl}</div>
      
      <div class="report-description">
        <p>By analyzing <span class="strong-text">12 popular multimodal features</span>, Access+ provides:</p>
        <ul>
          <li><span class="strong-text">Access+ Score</span> – A snapshot of your webpage's <span class="strong-text">current multimodal integration level</span>.</li>
          <li><span class="strong-text">Actionable Insights</span> – Best practices & community-driven recommendations to <span class="strong-text">guide your next adoption steps</span>.</li>
          <li><span class="strong-text">A Pathway to Innovation</span> – Helping you integrate <span class="strong-text">more tools</span> to enhance efficiency and expand communication possibilities.</li>
        </ul>
        <p class="rocket-emoji">🚀 <span class="strong-text">Start here. Unlock more. Discover what's possible.</span></p>
      </div>
    </div>
    
    <div class="score-container">
      <div class="score-number">${document.getElementById('accessibilityScore').textContent}%</div>
      <div class="score-description">${document.getElementById('scoreDescription').textContent}</div>
    </div>
  `;
  
  // Add category sections
  const categories = ['speech', 'vision', 'hearing', 'language'];
  const categoryTitles = {
    'speech': 'Speech Accessibility Features',
    'vision': 'Vision Accessibility Features',
    'hearing': 'Hearing Accessibility Features',
    'language': 'Language Accessibility Features'
  };
  
  categories.forEach(category => {
    const results = currentResults[category];
    if (!results) return;
    
    htmlReport += `
    <div class="category-section">
      <h2>${categoryTitles[category]}</h2>
    `;
    
    // Add features
    Object.keys(results).forEach(feature => {
      const available = results[feature];
      const featureName = getFeatureName(category, feature);
      const description = getFeatureDescription(category, feature);
      
      htmlReport += `
      <div class="feature-item">
        <div class="feature-header">
          <div class="feature-name">${featureName}</div>
          <div class="feature-status ${available ? 'status-available' : 'status-unavailable'}">
            ${available ? '✓ Available' : '✗ Not Available'}
          </div>
        </div>
        <div class="feature-description">${description}</div>
      `;
      
      // If available, add verification method
      if (available) {
        htmlReport += `
        <div class="verification-method">
          <strong>Verification Method:</strong> ${getVerificationMethodText(category, feature)}
        </div>
        `;
      }
      
      htmlReport += `</div>`;
    });
    
    htmlReport += `</div>`;
  });
  
  // Add footer
  htmlReport += `
    <div class="report-footer">
      <p>Generated by Unless - Multimodal Accessibility Analyzer</p>
    </div>
  </body>
  </html>
  `;
  
  // Create download
  downloadHTML(htmlReport, "access-plus-score-report.html");
  showNotification("Access+ Score Report exported successfully");
}

// Function to export solutions report as HTML
function exportSolutionsReport() {
  console.log("Exporting Answer Key");
  
  if (Object.keys(currentResults).length === 0) {
    showNotification("Please analyze the page first");
    return;
  }
  
  // Get current date and page info
  const date = new Date().toLocaleDateString();
  let pageUrl = currentPageUrl || "Unknown Page";
  
  // Build HTML report
  let htmlReport = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access+ Answer Key Report</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
      }
      
      h1, h2, h3 {
        color: #444;
      }
      
      .report-header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }
      
      .report-date {
        color: #666;
        font-style: italic;
        margin-bottom: 15px;
      }
      
      .page-url {
        word-break: break-all;
        margin-bottom: 15px;
      }
      
      .report-description {
        max-width: 750px;
        margin: 0 auto 25px auto;
        padding: 15px 20px;
        background-color: #f7f9fc;
        border-radius: 8px;
        border-left: 4px solid #5B42F3;
        text-align: left;
      }
      
      .report-description ul {
        margin: 10px 0;
        padding-left: 25px;
      }
      
      .report-description li {
        margin-bottom: 8px;
      }
      
      .rocket-emoji {
        font-size: 1.2em;
      }
      
      .strong-text {
        font-weight: bold;
      }
      
      .category-section {
        margin-bottom: 30px;
      }
      
      .feature-item {
        background-color: #f5f5f5;
        border-radius: 8px;
        margin-bottom: 20px;
        overflow: hidden;
      }
      
      .feature-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background-color: #eeeeee;
      }
      
      .feature-name {
        font-weight: bold;
        font-size: 16px;
      }
      
      .feature-status {
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        background-color: rgba(244, 67, 54, 0.2);
        color: #F44336;
      }
      
      .solutions-container {
        padding: 15px;
      }
      
      .no-solutions {
        color: #666;
        font-style: italic;
      }
      
      .solution-item {
        margin-bottom: 15px;
        padding-bottom: 15px;
        border-bottom: 1px solid #eee;
      }
      
      .solution-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      
      .solution-title {
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .solution-link {
        color: #5B42F3;
        text-decoration: none;
        display: block;
        margin-top: 5px;
        word-break: break-all;
      }
      
      .solution-link:hover {
        text-decoration: underline;
      }
      
      .tag-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      
      .tag {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 50px;
        font-size: 11px;
        font-weight: 500;
        color: white;
      }
      
      .tag-popular { background-color: #9C27B0; }
      .tag-easiest { background-color: #2196F3; }
      .tag-free, .tag-0 { background-color: #4CAF50; }
      .tag-premium { background-color: #F44336; }
      .tag-ai { background-color: #E91E63; }
      .tag-nlp { background-color: #FF9800; }
      .tag-freemium { background-color: #795548; }
      
      .report-footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        font-size: 12px;
        color: #666;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="report-header">
      <h1>Access+ Answer Key | Increase Your Access+ Score</h1>
      <div class="report-date">Generated on ${date}</div>
      <div class="page-url">Analyzed Page: ${pageUrl}</div>
      
      <div class="report-description">
        <p>The <span class="strong-text">Access+ Score</span> is your <span class="strong-text">webpage's roadmap</span> to adopting multimodal tools that boost <span class="strong-text">accessibility, productivity, and communication</span>.</p>
        
        <p><span class="strong-text">What It Provides:</span></p>
        <ul>
          <li><span class="strong-text">Multimodal Readiness</span> – A snapshot of <span class="strong-text">what's present, what's missing</span>, and where to start.</li>
          <li><span class="strong-text">Actionable Recommendations</span> – Best practices and tools ranked by <span class="strong-text">cost, quality, and impact</span>.</li>
          <li><span class="strong-text">Adoption Pathway</span> – Clear steps to <span class="strong-text">optimize workflows</span> and expand communication.</li>
        </ul>
        
        <p class="rocket-emoji">🚀 <span class="strong-text">Let's get you trying MORE! Your journey to multimodal adoption starts now.</span></p>
      </div>
    </div>
  `;
  
  // Add category sections
  const categories = ['speech', 'vision', 'hearing', 'language'];
  const categoryTitles = {
    'speech': 'Speech Accessibility Solutions',
    'vision': 'Vision Accessibility Solutions',
    'hearing': 'Hearing Accessibility Solutions',
    'language': 'Language Accessibility Solutions'
  };
  
  // Check if we have any unavailable features
  let hasUnavailableFeatures = false;
  categories.forEach(category => {
    const results = currentResults[category];
    if (!results) return;
    
    Object.keys(results).forEach(feature => {
      if (!results[feature]) {
        hasUnavailableFeatures = true;
      }
    });
  });
  
  if (!hasUnavailableFeatures) {
    htmlReport += `
    <div class="category-section">
      <h2>No Accessibility Issues Found</h2>
      <p>Congratulations! All analyzed accessibility features are available on this page. No specific solutions are needed at this time.</p>
    </div>
    `;
  } else {
    // Add sections for each category with unavailable features
    categories.forEach(category => {
      const results = currentResults[category];
      if (!results) return;
      
      // Check if there are any unavailable features in this category
      const unavailableFeatures = Object.keys(results).filter(feature => !results[feature]);
      if (unavailableFeatures.length === 0) return;
      
      htmlReport += `
      <div class="category-section">
        <h2>${categoryTitles[category]}</h2>
      `;
      
      // Add features
      unavailableFeatures.forEach(feature => {
        const featureName = getFeatureName(category, feature);
        const description = getFeatureDescription(category, feature);
        
        htmlReport += `
        <div class="feature-item">
          <div class="feature-header">
            <div class="feature-name">${featureName}</div>
            <div class="feature-status">✗ Not Available</div>
          </div>
          <div class="solutions-container">
            <p>${description}</p>
        `;
        
        // Add solutions
        const solutions = solutionsData[category] && solutionsData[category][feature];
        if (solutions && solutions.length > 0) {
          htmlReport += `<h3>Recommended Solutions:</h3>`;
          
          solutions.forEach((solution, index) => {
            htmlReport += `
            <div class="solution-item">
              <div class="solution-title">${index + 1}. ${solution.title}</div>
              <p>${solution.description}</p>
              <a href="${solution.link}" class="solution-link" target="_blank">${solution.link}</a>
            `;
            
            // Add tags
            if (solution.tags && solution.tags.length > 0) {
              htmlReport += `<div class="tag-container">`;
              solution.tags.forEach(tag => {
                htmlReport += `<span class="tag tag-${tag.replace('$', 'free').toLowerCase()}">${tag}</span>`;
              });
              htmlReport += `</div>`;
            }
            
            htmlReport += `</div>`;
          });
        } else {
          htmlReport += `<div class="no-solutions">No specific solutions available for this feature.</div>`;
        }
        
        htmlReport += `
          </div>
        </div>
        `;
      });
      
      htmlReport += `</div>`;
    });
  }
  
  // Add footer
  htmlReport += `
    <div class="report-footer">
      <p>Generated by Unless - Multimodal Accessibility Analyzer</p>
    </div>
  </body>
  </html>
  `;
  
  // Create download
  downloadHTML(htmlReport, "access-plus-answer-key.html");
  showNotification("Access+ Answer Key exported successfully");
}

// Helper function to get feature description
function getFeatureDescription(category, feature) {
  // Feature descriptions
  const descriptions = {
    speech: {
      voiceControl: 'Ability to control the website using voice commands and voice assistants.',
      speechToText: 'Ability to use voice input for text fields, forms, and other interactive elements.',
      noSpeechOnly: 'All voice-controlled features have alternative methods of interaction.'
    },
    vision: {
      screenReader: 'Content is properly structured for screen readers and other assistive technologies.',
      keyboardNavigation: 'All functionality is accessible using keyboard-only navigation.',
      highContrast: 'Text and interactive elements have sufficient color contrast for readability.'
    },
    hearing: {
      captions: 'Videos have closed captions or subtitles for spoken content.',
      transcripts: 'Audio content has text transcripts available.',
      visualAlerts: 'Audio alerts and notifications have visual indicators.'
    },
    language: {
      simpleLanguage: 'Content uses clear, simple language that is easy to understand.',
      consistentNavigation: 'Navigation patterns are consistent and predictable across the site.',
      errorPrevention: 'Forms and interactive elements help prevent and correct errors.'
    }
  };
  
  return descriptions[category]?.[feature] || '';
}

// Helper function to download HTML content
function downloadHTML(htmlContent, filename) {
  const blob = new Blob([htmlContent], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Function to initialize theme
function initializeTheme() {
  console.log("Initializing theme");
  
  const savedDarkMode = localStorage.getItem('darkMode') === 'true';
  if (savedDarkMode) {
    document.body.classList.add('dark-mode');
  }
}

// Function to toggle dark mode
function toggleDarkMode() {
  console.log("Toggling dark mode");
  
  const isDarkMode = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
  
  showNotification(isDarkMode ? "Dark mode enabled" : "Light mode enabled");
}

// Function to show notification
function showNotification(message) {
  console.log("Showing notification:", message);
  
  // Remove any existing notification
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

function setupTellMeButton() {
  const tellMeButton = document.getElementById('tellMeButton');
  if (!tellMeButton) return;

  // Set initial state
  tellMeButton.setAttribute('data-state', 'play');

  // Remove any existing click handlers to prevent duplicates
  const newButton = tellMeButton.cloneNode(true);
  tellMeButton.parentNode.replaceChild(newButton, tellMeButton);

  // Add click handler
  newButton.addEventListener('click', () => {
    console.log("Tell me button clicked, current state:", audioState);
    
    if (audioState === 'play') {
        // Start playing audio
        startAudio(); // This will call speakText
        // speakText will set state to pause when speech starts
    } else if (audioState === 'pause') {
        // Pause audio
        pauseAudio();
        audioState = 'resume';
        newButton.setAttribute('data-state', 'resume');
    } else if (audioState === 'resume') {
        // Resume audio
        resumeAudio();
        audioState = 'pause';
        newButton.setAttribute('data-state', 'pause');
    }
  });
}

function startAudio() {
  console.log("Starting audio generation");
  
  // Build the full speech text including highlights
  let speechText = "";
  const accessibilityScoreElement = document.getElementById('accessibilityScore');
  const scoreDescriptionElement = document.getElementById('scoreDescription');

  if (Object.keys(currentResults).length === 0 || !accessibilityScoreElement || !scoreDescriptionElement) {
    speechText = "Please analyze the page first to get information about available features.";
    speakText(speechText); // Speak the error/prompt message
    // Reset button state immediately if analysis hasn't run
    audioState = 'play';
    document.getElementById('tellMeButton').setAttribute('data-state', 'play');
    return;
  }

  // Score Summary
  speechText += "Here's the Access+ Score summary. ";
  speechText += `Overall Access+ Score is ${accessibilityScoreElement.textContent} percent. Status: ${scoreDescriptionElement.textContent}. `;

  // Feature Highlights
  let availableFeatures = [];
  let unavailableFeatures = [];
  
  Object.keys(currentResults).forEach(category => {
    if (category === '__proto__' || !currentResults.hasOwnProperty(category)) return; // Basic security/check
    const results = currentResults[category];
    Object.keys(results).forEach(feature => {
      if (feature === '__proto__' || !results.hasOwnProperty(feature)) return;
      const featureName = getFeatureName(category, feature);
      if (results[feature] === true) {
        availableFeatures.push(featureName);
      } else {
        unavailableFeatures.push(featureName);
      }
    });
  });

  speechText += "Available features include: ";
  speechText += availableFeatures.length > 0 ? availableFeatures.join(", ") + ". " : "None. ";
  
  speechText += "Features not available include: ";
  speechText += unavailableFeatures.length > 0 ? unavailableFeatures.join(", ") + ". " : "None. ";

  // Start speaking the full text
  speakText(speechText);
}

// Updated function to speak text and manage state
function speakText(text) {
  console.log("Speaking text:", text);
  const tellMeButton = document.getElementById('tellMeButton');

  if ('speechSynthesis' in window) {
    // Cancel any ongoing or paused speech before starting new
    window.speechSynthesis.cancel(); 
    
    currentSpeechUtterance = new SpeechSynthesisUtterance(text);
    
    currentSpeechUtterance.onstart = () => {
        console.log("Speech started");
        audioState = 'pause'; // State becomes 'pause' once speech starts
        if (tellMeButton) tellMeButton.setAttribute('data-state', 'pause');
    };

    currentSpeechUtterance.onend = () => {
      console.log("Speech finished naturally");
      audioState = 'play'; // Reset state to play when finished
      if (tellMeButton) tellMeButton.setAttribute('data-state', 'play');
      currentSpeechUtterance = null;
    };
    
    currentSpeechUtterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      showNotification("Speech synthesis error: " + event.error);
      audioState = 'play'; // Reset state on error
      if (tellMeButton) tellMeButton.setAttribute('data-state', 'play');
      currentSpeechUtterance = null;
    };
    
    // Speak
    window.speechSynthesis.speak(currentSpeechUtterance);

  } else {
    console.error("Speech synthesis not supported");
    showNotification("Speech synthesis is not supported in your browser");
    // Ensure state is reset if speech synth isn't available
    audioState = 'play'; 
    if (tellMeButton) tellMeButton.setAttribute('data-state', 'play');
  }
}

function pauseAudio() {
  console.log("Pausing audio");
  if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
  } else {
    console.log("Speech synthesis not speaking or already paused, cannot pause.");
  }
}

function resumeAudio() {
  console.log("Resuming audio");
  if (window.speechSynthesis && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  } else {
    console.log("Speech synthesis not paused, cannot resume.");
  }
}

// Function to show the details view
function showDetailsView(title, contentHtml) {
  const sidebarContent = document.getElementById('sidebarContent');
  const detailsViewTitle = document.getElementById('details-view-title');
  const detailsViewContent = document.getElementById('details-view-content');

  if (sidebarContent && detailsViewTitle && detailsViewContent) {
    detailsViewTitle.textContent = title;
    detailsViewContent.innerHTML = contentHtml;
    sidebarContent.classList.add('details-active');
    console.log("Showing details view for:", title);
  } else {
    console.error("Could not find necessary elements for details view.");
  }
}

// Function to hide the details view
function hideDetailsView() {
  const sidebarContent = document.getElementById('sidebarContent');
  const detailsViewContent = document.getElementById('details-view-content');
  
  if (sidebarContent && detailsViewContent) {
    sidebarContent.classList.remove('details-active');
    detailsViewContent.innerHTML = ''; // Clear content
    console.log("Hiding details view");
  } 
}