// Background script for unless Accessibility Analyzer

// Global state tracking
let userPreferences = {
  categories: {
    speech: true,
    language: true, 
    vision: true,
    hearing: true
  },
  features: {
    speech: {
      voiceControl: true,
      speechToText: true,
      noSpeechOnly: true
    },
    vision: {
      screenReader: true,
      keyboardNavigation: true,
      highContrast: true
    },
    hearing: {
      captions: true,
      transcripts: true,
      visualAlerts: true
    },
    language: {
      simpleLanguage: true,
      consistentNavigation: true,
      errorPrevention: true
    }
  },
  autoScan: true,
  showRecommendations: true,
  userAnalytics: true,
  darkMode: false
};

// User analytics data
let userAnalytics = {
  scannedPages: 0,
  featureClicks: {
    speech: 0,
    vision: 0, 
    hearing: 0,
    language: 0
  },
  solutionLinkClicks: 0,
  exportReports: 0,
  lastScanDate: null,
  timeSpentAnalyzing: 0
};

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Check if this is first use
  chrome.storage.local.get(['firstUse'], (result) => {
    const isFirstUse = result.firstUse !== false;
    
    // Toggle overlay on current page
    chrome.tabs.sendMessage(tab.id, { 
      action: "toggleOverlay", 
      isFirstUse: isFirstUse 
    }, (response) => {
      // If no response, content script may not be loaded
      if (chrome.runtime.lastError) {
        console.log("Content script not available:", chrome.runtime.lastError.message);
        
        // Inject content script and try again
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { 
              action: "toggleOverlay", 
              isFirstUse: isFirstUse 
            });
          }, 200);
        }).catch(err => {
          console.error("Failed to inject content script:", err);
        });
      }
    });
  });
});

// Function to generate test results for testing
function generateTestResults(tabId) {
  console.log("Generating test results for tab:", tabId);

  // Generate random results for each category
  const speechResults = {
    voiceControl: Math.random() > 0.5,
    speechToText: Math.random() > 0.5,
    noSpeechOnly: Math.random() > 0.5
  };
  
  const visionResults = {
    screenReader: Math.random() > 0.5,
    keyboardNavigation: Math.random() > 0.5,
    highContrast: Math.random() > 0.5
  };
  
  const hearingResults = {
    captions: Math.random() > 0.5,
    transcripts: Math.random() > 0.5,
    visualAlerts: Math.random() > 0.5
  };
  
  const languageResults = {
    simpleLanguage: Math.random() > 0.5,
    consistentNavigation: Math.random() > 0.5,
    errorPrevention: Math.random() > 0.5
  };
  
  // Send results with a slight delay to simulate analysis
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, {
      action: "updateResults",
      category: "speech",
      results: speechResults
    });
  }, 500);
  
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, {
      action: "updateResults",
      category: "vision",
      results: visionResults
    });
  }, 800);
  
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, {
      action: "updateResults",
      category: "hearing",
      results: hearingResults
    });
  }, 1100);
  
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, {
      action: "updateResults",
      category: "language",
      results: languageResults
    });
  }, 1400);
  
  // Update analytics
  userAnalytics.scannedPages++;
  userAnalytics.lastScanDate = new Date().toISOString();
  chrome.storage.local.set({ userAnalytics: userAnalytics });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);
  
  if (message.action === "runAnalysis") {
    // Run analysis for the specified tab
    if (message.tabId) {
      generateTestResults(message.tabId);
    } else if (sender.tab) {
      generateTestResults(sender.tab.id);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          generateTestResults(tabs[0].id);
        }
      });
    }
    
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "saveSettings") {
    // Save settings
    console.log("Saving settings:", message.settings);
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "setFirstUse") {
    // Set first use flag
    chrome.storage.local.set({ firstUse: message.value === true });
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "getAnalytics") {
    // Return analytics data
    sendResponse({ analytics: userAnalytics });
    return true;
  }
  else if (message.action === "updateAnalytics") {
    // Update analytics data
    if (message.category) {
      userAnalytics.featureClicks[message.category] = (userAnalytics.featureClicks[message.category] || 0) + 1;
    }
    
    if (message.solutionLinkClicked) {
      userAnalytics.solutionLinkClicks++;
    }
    
    if (message.exportReport) {
      userAnalytics.exportReports++;
    }
    
    chrome.storage.local.set({ userAnalytics: userAnalytics });
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "toggleDarkMode") {
    // Toggle dark mode setting
    userPreferences.darkMode = !userPreferences.darkMode;
    chrome.storage.local.set({ 
      userPreferences: userPreferences,
      darkMode: userPreferences.darkMode 
    });
    sendResponse({ success: true, darkMode: userPreferences.darkMode });
    return true;
  }
  else if (message.action === "contactSupport") {
    // Open email client to contact Samantha
    chrome.tabs.create({ 
      url: "mailto:sr5516@nyu.edu?subject=Unless%20Support%20Request"
    });
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "downloadReport") {
    // For HTML reports, we don't need to do anything in the background script
    // as this will be handled by the overlay.js file directly
    // Just track analytics
    userAnalytics.exportReports++;
    chrome.storage.local.set({ userAnalytics: userAnalytics });
    sendResponse({ success: true });
    return true;
  }
  
  return false; // No async response needed
});