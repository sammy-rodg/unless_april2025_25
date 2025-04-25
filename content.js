// Content script for unless Accessibility Analyzer

// Global variables
let overlayFrame = null;
let isOverlayVisible = false;

// Initialize when content script loads
console.log("Unless content script initialized");

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "toggleOverlay") {
    try {
      if (isOverlayVisible) {
        hideOverlay();
      } else {
        showOverlay(message.isFirstUse);
      }
      sendResponse({ success: true, visible: isOverlayVisible });
    } catch (error) {
      console.error("Error toggling overlay:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;  // Keep the message channel open for async response
  } 
  else if (message.action === "checkOverlayStatus") {
    sendResponse({ visible: isOverlayVisible });
    return true;
  }
  else if (message.action === "updateResults" || 
           message.action === "analysisTimeout" || 
           message.action === "analysisError" ||
           message.action === "permissionNeeded" ||
           message.action === "permissionResult" ||
           message.action === "analysisComplete") {
    // Forward results to the overlay
    if (overlayFrame && isOverlayVisible) {
      overlayFrame.contentWindow.postMessage(message, "*");
    }
    return true;
  }
});

// Create and show the overlay
function showOverlay(isFirstUse = false) {
  console.log("Showing overlay, first use:", isFirstUse);
  
  if (overlayFrame) {
    overlayFrame.style.display = 'block';
    isOverlayVisible = true;
    
    // Send message to iframe to show first use if needed
    if (isFirstUse) {
      setTimeout(() => {
        overlayFrame.contentWindow.postMessage({
          action: "showFeatureSelection"
        }, "*");
      }, 300);
    }
    
    return;
  }

  // Create iframe to contain our overlay UI
  overlayFrame = document.createElement('iframe');
  overlayFrame.id = 'accessibility-analyzer-overlay';
  overlayFrame.src = chrome.runtime.getURL('overlay.html');
  
  // Set up styles for the overlay
  overlayFrame.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 320px;
    height: 600px;
    max-height: 90vh;
    border: none;
    z-index: 2147483647;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    transition: all 0.3s ease;
    background-color: white;
  `;
  
  document.body.appendChild(overlayFrame);
  
  // Set visibility flag after frame is loaded
  overlayFrame.onload = function() {
    isOverlayVisible = true;
    console.log("Overlay frame loaded");
    
    // If first use, show feature selection after a delay
    if (isFirstUse) {
      setTimeout(() => {
        overlayFrame.contentWindow.postMessage({
          action: "showFeatureSelection"
        }, "*");
      }, 300);
    }
  };
  
  // Make the overlay draggable
  makeFrameDraggable(overlayFrame);
  
  // Listen for messages from the iframe
  window.addEventListener('message', handleFrameMessages);
}

// Hide the overlay
function hideOverlay() {
  console.log("Hiding overlay");
  if (overlayFrame) {
    overlayFrame.style.display = 'none';
    isOverlayVisible = false;
  }
}

// Handle messages from the iframe
function handleFrameMessages(event) {
  // Make sure message is from our overlay
  if (!overlayFrame || event.source !== overlayFrame.contentWindow) return;
  
  console.log("Received message from overlay:", event.data);
  
  const message = event.data;
  
  if (message.action === "closeOverlay") {
    hideOverlay();
  }
  else if (message.action === "runAnalysis") {
    // Forward to background script
    chrome.runtime.sendMessage({
      action: "runAnalysis"
    });
  }
  else if (message.action === "resizeOverlay") {
    if (message.state === "minimized") {
      // Set frame to minimized state
      overlayFrame.style.width = '70px';
      overlayFrame.style.height = '350px';
      overlayFrame.style.borderRadius = '40px';
    } else if (message.state === "normal") {
      // Restore to normal size and position
      overlayFrame.style.width = '320px';
      overlayFrame.style.height = '600px';
      overlayFrame.style.borderRadius = '12px';
    }
  }
  else if (message.action === "saveSettings") {
    // Forward settings to background script
    chrome.runtime.sendMessage({
      action: "saveSettings",
      settings: message.settings
    });
  }
  else if (message.action === "updateAnalytics") {
    // Forward analytics update to background script
    chrome.runtime.sendMessage(message);
  }
  else if (message.action === "setFirstUse") {
    // Forward first use setting to background script
    chrome.runtime.sendMessage({
      action: "setFirstUse",
      value: message.value
    });
  }
}

// Make the overlay draggable
function makeFrameDraggable(frame) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let isDragging = false;
  
  // Listen for messages from iframe to start dragging
  window.addEventListener('message', function(e) {
    if (e.data.action === 'dragHandleMouseDown') {
      // Start dragging
      isDragging = true;
      pos3 = e.data.clientX;
      pos4 = e.data.clientY;
      
      // Prevent any weird iframe interactions while dragging
      frame.style.pointerEvents = 'none';
      
      // Create overlay for dragging
      const overlay = document.createElement('div');
      overlay.id = 'accessibility-overlay-drag-cover';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2147483646;
        cursor: grabbing;
        background: transparent;
      `;
      document.body.appendChild(overlay);
    }
  });
  
  // Mouse move event for dragging
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    // Calculate new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Set new position
    frame.style.top = (frame.offsetTop - pos2) + "px";
    frame.style.right = 'auto'; // Clear right positioning if set
    frame.style.left = (frame.offsetLeft - pos1) + "px";
  });
  
  // Mouse up event to stop dragging
  document.addEventListener('mouseup', function() {
    if (!isDragging) return;
    
    // Stop dragging
    isDragging = false;
    frame.style.pointerEvents = 'auto';
    const cover = document.getElementById('accessibility-overlay-drag-cover');
    if (cover) cover.remove();
  });
}

console.log("Content script loaded");