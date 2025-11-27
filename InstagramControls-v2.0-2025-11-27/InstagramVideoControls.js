'use strict';
function InstagramVideoControls() {

    let showLog = false;

    /** @var {HTMLVideoElement} */
    let player;

    let config = {};

    // true after .init() was called.
    let initialized = false;

    const knownVideoElements = new Set();

    // OSD overlay element for visual feedback
    let osdElement = null;
    let osdTimeout = null;

    // Robust volume persistence - keeps last known volume in memory as primary source
    // Falls back to storage if memory is not set
    let lastKnownVolume = null; // null means not yet loaded
    let lastKnownPlaybackRate = null;
    
    // Global mute state - once user unmutes, all videos should be unmuted
    // Starts as true (muted) and once unmuted stays unmuted for the session
    let globalMuteState = true; // true = muted, false = unmuted
    let userHasUnmuted = false; // tracks if user has ever unmuted in this session

    /**
     * Gets the volume to apply to videos, with fallback chain:
     * 1. In-memory lastKnownVolume (most reliable, survives rapid scrolling)
     * 2. config.volumeLevel (from storage, may be stale)
     * 3. Default of 1.0
     */
    function getVolumeToApply() {
        if (lastKnownVolume !== null && !isNaN(lastKnownVolume)) {
            return lastKnownVolume;
        }
        if (config.volumeLevel !== undefined && !isNaN(config.volumeLevel)) {
            return config.volumeLevel;
        }
        return 1.0;
    }

    /**
     * Gets the playback rate to apply to videos
     */
    function getPlaybackRateToApply() {
        if (lastKnownPlaybackRate !== null && !isNaN(lastKnownPlaybackRate)) {
            return lastKnownPlaybackRate;
        }
        if (config.playbackRate !== undefined && !isNaN(config.playbackRate)) {
            return config.playbackRate;
        }
        return 1.0;
    }

    /**
     * Force-apply volume to a video element, bypassing "different enough" checks
     * Also handles Chrome's autoplay mute policy
     */
    function forceApplyVolume(videoPlayer, volume) {
        if (!videoPlayer || isNaN(volume)) return;
        
        try {
            // Clamp volume to valid range
            const clampedVolume = Math.max(0, Math.min(1, volume));
            videoPlayer.volume = clampedVolume;
            log(`forceApplyVolume: set to ${clampedVolume}`);
        } catch (ex) {
            log('forceApplyVolume failed:', ex);
        }
    }

    /**
     * Force-apply playback rate to a video element
     */
    function forceApplyPlaybackRate(videoPlayer, rate) {
        if (!videoPlayer || isNaN(rate)) return;
        
        try {
            // Clamp rate to reasonable range
            const clampedRate = Math.max(0.0625, Math.min(16, rate));
            videoPlayer.playbackRate = clampedRate;
            log(`forceApplyPlaybackRate: set to ${clampedRate}`);
        } catch (ex) {
            log('forceApplyPlaybackRate failed:', ex);
        }
    }
    
    /**
     * Set global unmute state - once user unmutes, all current and future videos are unmuted
     */
    function setGlobalUnmuted() {
        if (!userHasUnmuted) {
            userHasUnmuted = true;
            globalMuteState = false;
            console.log('[InstagramControls] User unmuted - all videos will now be unmuted');
            // Unmute all currently known videos
            unmuteAllVideos();
        }
    }
    
    /**
     * Unmute all known video elements
     */
    function unmuteAllVideos() {
        knownVideoElements.forEach(video => {
            if (video && document.body.contains(video)) {
                video.muted = false;
                // Also click Instagram's mute button if it shows muted
                clickInstagramUnmuteButton(video);
            }
        });
    }
    
    /**
     * Apply mute state to a video based on global state
     * If user has unmuted before, new videos are automatically unmuted
     */
    function applyGlobalMuteState(video) {
        if (userHasUnmuted && video) {
            video.muted = false;
            // Small delay to let Instagram's UI initialize
            setTimeout(() => {
                clickInstagramUnmuteButton(video);
            }, 100);
        }
    }
    
    /**
     * Find and click Instagram's unmute button for a video
     * Searches for button[aria-label="Toggle audio"] and div[role="button"] with muted SVG
     * Clicks only the FIRST detected mute button, ignores any additional ones
     */
    function clickInstagramUnmuteButton(video) {
        if (!video) return false;
        
        try {
            // Collect all potential mute buttons, then click only the first one found
            
            // Check 1: "Toggle audio" button (newer Instagram UI)
            const toggleAudioButtons = document.querySelectorAll('button[aria-label="Toggle audio"]');
            for (const btn of toggleAudioButtons) {
                const svg = btn.querySelector('svg');
                if (svg) {
                    const ariaLabel = svg.getAttribute('aria-label') || '';
                    // Click if in muted state
                    if (ariaLabel.toLowerCase().includes('muted') || 
                        ariaLabel.toLowerCase().includes('off') ||
                        !ariaLabel.toLowerCase().includes('playing')) {
                        console.log('[InstagramControls] Found Toggle audio button (muted), clicking once...');
                        btn.click();
                        return true; // Exit immediately after first click
                    }
                }
            }
            
            // Check 2: SVG with aria-label "Audio is muted" (older UI / Reels)
            const mutedSvgs = document.querySelectorAll('svg[aria-label="Audio is muted"]');
            for (const svg of mutedSvgs) {
                const clickable = svg.closest('[role="button"]') || svg.closest('button');
                if (clickable) {
                    console.log('[InstagramControls] Found muted button via SVG aria-label, clicking once...');
                    clickable.click();
                    return true; // Exit immediately after first click
                }
            }
            
            // Check 3: viewBox="0 0 48 48" which indicates muted state
            const allSvgs = document.querySelectorAll('svg[viewBox="0 0 48 48"]');
            for (const svg of allSvgs) {
                const ariaLabel = svg.getAttribute('aria-label') || '';
                const title = svg.querySelector('title');
                const titleText = title ? title.textContent : '';
                
                if (ariaLabel.toLowerCase().includes('muted') ||
                    titleText.toLowerCase().includes('muted')) {
                    const clickable = svg.closest('[role="button"]') || svg.closest('button');
                    if (clickable) {
                        console.log('[InstagramControls] Found muted button via viewBox, clicking once...');
                        clickable.click();
                        return true; // Exit immediately after first click
                    }
                }
            }
            
            // Check 4: Search near the video element
            let root = video.closest('article') || video.closest('div[role="dialog"]') || video.parentElement;
            for (let i = 0; i < 15 && root; i++) {
                const roleButtons = root.querySelectorAll('[role="button"]');
                for (const btn of roleButtons) {
                    const svg = btn.querySelector('svg');
                    if (svg) {
                        const ariaLabel = svg.getAttribute('aria-label') || '';
                        const viewBox = svg.getAttribute('viewBox') || '';
                        
                        if ((ariaLabel.toLowerCase().includes('audio') && ariaLabel.toLowerCase().includes('muted')) ||
                            (viewBox === '0 0 48 48' && ariaLabel.toLowerCase().includes('audio'))) {
                            console.log('[InstagramControls] Found muted button near video, clicking once...');
                            btn.click();
                            return true; // Exit immediately after first click
                        }
                    }
                }
                root = root.parentElement;
            }
            
            console.log('[InstagramControls] Could not find muted button to click');
            return false;
        } catch (ex) {
            console.log('[InstagramControls] clickInstagramUnmuteButton failed:', ex);
            return false;
        }
    }
    
    /**
     * Click Instagram's mute button (to mute, not unmute)
     * Searches for button[aria-label="Toggle audio"] and div[role="button"] with unmuted SVG
     * Clicks only the FIRST detected unmuted button, ignores any additional ones
     */
    function clickInstagramMuteButton(video) {
        if (!video) return false;
        
        try {
            // Check 1: "Toggle audio" button showing audio is playing
            const toggleAudioButtons = document.querySelectorAll('button[aria-label="Toggle audio"]');
            for (const btn of toggleAudioButtons) {
                const svg = btn.querySelector('svg');
                if (svg) {
                    const ariaLabel = svg.getAttribute('aria-label') || '';
                    // If it shows "Audio is playing", click to mute
                    if (ariaLabel.toLowerCase().includes('playing') || 
                        (!ariaLabel.toLowerCase().includes('muted') && ariaLabel.toLowerCase().includes('audio'))) {
                        console.log('[InstagramControls] Found Toggle audio button (playing), clicking once to mute...');
                        btn.click();
                        return true; // Exit immediately after first click
                    }
                }
            }
            
            // Check 2: SVG with aria-label about audio but NOT muted
            const audioSvgs = document.querySelectorAll('svg[aria-label*="Audio"], svg[aria-label*="audio"]');
            for (const svg of audioSvgs) {
                const ariaLabel = svg.getAttribute('aria-label') || '';
                if (ariaLabel.toLowerCase().includes('muted')) continue;
                if (ariaLabel.toLowerCase().includes('playing') || ariaLabel.toLowerCase().includes('audio')) {
                    const clickable = svg.closest('[role="button"]') || svg.closest('button');
                    if (clickable) {
                        console.log('[InstagramControls] Found unmuted button, clicking once to mute...');
                        clickable.click();
                        return true; // Exit immediately after first click
                    }
                }
            }
            
            // Check 3: viewBox="0 0 24 24" which indicates unmuted state
            const allSvgs = document.querySelectorAll('svg[viewBox="0 0 24 24"]');
            for (const svg of allSvgs) {
                const ariaLabel = svg.getAttribute('aria-label') || '';
                if (ariaLabel.toLowerCase().includes('audio') && !ariaLabel.toLowerCase().includes('muted')) {
                    const clickable = svg.closest('[role="button"]') || svg.closest('button');
                    if (clickable) {
                        console.log('[InstagramControls] Found audio button via viewBox 24x24, clicking once...');
                        clickable.click();
                        return true; // Exit immediately after first click
                    }
                }
            }
            
            return clicked;
        } catch (ex) {
            console.log('[InstagramControls] clickInstagramMuteButton failed:', ex);
            return false;
        }
    }

    /**
     * Shows a visual overlay with volume/speed info
     * @param {string} message - Text to display
     * @param {number} [duration=1500] - How long to show in ms
     */
    function showOSD(message, duration = 1500) {
        if (!osdElement) {
            osdElement = document.createElement('div');
            osdElement.id = 'ctrls4insta-osd';
            osdElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 16px 32px;
                border-radius: 8px;
                font-size: 24px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                z-index: 999999;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;
            document.body.appendChild(osdElement);
        }

        osdElement.textContent = message;
        osdElement.style.opacity = '1';

        if (osdTimeout) {
            clearTimeout(osdTimeout);
        }
        osdTimeout = setTimeout(() => {
            if (osdElement) {
                osdElement.style.opacity = '0';
            }
        }, duration);
    }

    /**
     * Navigate to next or previous reel
     * Works with Instagram's scroll-snap container
     * @param {string} direction - 'next' or 'previous'
     */
    let isNavigating = false;
    let lastNavigationTime = 0;
    
    function navigateReel(direction) {
        // Debounce - minimum 800ms between navigations
        const now = Date.now();
        if (isNavigating || (now - lastNavigationTime) < 800) {
            console.log('[InstagramControls] Navigation blocked (debounce)');
            return false;
        }
        
        isNavigating = true;
        lastNavigationTime = now;
        console.log(`[InstagramControls] navigateReel: ${direction}`);
        
        const isNext = direction === 'next';
        
        // Find Instagram's scroll-snap container first
        let scrollContainer = null;
        const containers = document.querySelectorAll('*');
        
        for (const el of containers) {
            const style = window.getComputedStyle(el);
            // Instagram uses scroll-snap-type: y mandatory
            if (style.scrollSnapType && style.scrollSnapType.includes('y')) {
                scrollContainer = el;
                console.log('[InstagramControls] Found scroll-snap container');
                break;
            }
            // Fallback: look for scrollable container with videos
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                el.scrollHeight > el.clientHeight + 100 &&
                el.querySelector('video')) {
                scrollContainer = el;
            }
        }
        
        if (scrollContainer) {
            // Use the scroll container - scroll by exactly one viewport height
            // Instagram's scroll-snap will handle snapping to the correct reel
            const scrollAmount = isNext ? window.innerHeight : -window.innerHeight;
            
            scrollContainer.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
            });
            
            console.log(`[InstagramControls] Scrolled container by ${scrollAmount}px`);
        } else {
            // Fallback: scroll the document
            window.scrollBy({
                top: isNext ? window.innerHeight : -window.innerHeight,
                behavior: 'smooth'
            });
            console.log('[InstagramControls] No scroll container, scrolled window');
        }
        
        // Reset navigation lock and sync PiP after scroll animation
        setTimeout(() => {
            const newVideo = findVisibleVideo();
            if (newVideo) {
                updatePiPVideo(newVideo);
            }
            isNavigating = false;
        }, 700);
        
        showOSD(isNext ? '⏭️ Next Reel' : '⏮️ Previous Reel', 800);
        return true;
    }
    
    /**
     * Find the video element currently visible in the viewport
     * @returns {HTMLVideoElement|null}
     */
    function findVisibleVideo() {
        const allVideos = Array.from(document.querySelectorAll('video'));
        const viewportHeight = window.innerHeight;
        const viewportCenter = viewportHeight / 2;
        
        let bestVideo = null;
        let minDistance = Infinity;
        
        for (const video of allVideos) {
            const rect = video.getBoundingClientRect();
            if (rect.height > 100) {
                const videoCenter = rect.top + rect.height / 2;
                const distance = Math.abs(videoCenter - viewportCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestVideo = video;
                }
            }
        }
        
        return bestVideo;
    }
    
    // Store reference to current PiP window to prevent close/reopen flicker
    let currentPiPWindow = null;

    /**
     * Update Picture-in-Picture to show a different video
     * Uses seamless transition to avoid window minimize/maximize flicker
     * @param {HTMLVideoElement} newVideo - The video to show in PiP
     */
    function updatePiPVideo(newVideo) {
        if (!newVideo) return;
        
        // For Document PiP, dispatch event to trigger sync
        if (documentPiPWindow && !documentPiPWindow.closed) {
            console.log('[InstagramControls] Document PiP active, dispatching sync event');
            window.dispatchEvent(new CustomEvent('pip-sync-video'));
            return;
        }
        
        const currentPiPVideo = document.pictureInPictureElement;
        if (!currentPiPVideo) return;
        
        // If it's the same video, no need to switch
        if (currentPiPVideo === newVideo) return;
        
        console.log('[InstagramControls] Switching PiP to new video (seamless)');
        
        // Prepare the new video before switching
        if (userHasUnmuted) {
            newVideo.muted = false;
        }
        newVideo.volume = getVolumeToApply();
        newVideo.playbackRate = getPlaybackRateToApply();
        
        // Start playing the new video in background
        newVideo.play().catch(() => {});
        
        // Wait a moment for the new video to buffer, then switch
        const doSwitch = () => {
            document.exitPictureInPicture()
                .then(() => {
                    // Immediately request PiP on new video (minimal delay to prevent window closing)
                    return newVideo.requestPictureInPicture();
                })
                .then((pipWindow) => {
                    currentPiPWindow = pipWindow;
                    console.log('[InstagramControls] PiP switched successfully');
                    setupPiPKeepPlaying(newVideo);
                })
                .catch(err => {
                    console.log('[InstagramControls] PiP switch failed:', err);
                });
        };
        
        // Check if video is ready
        if (newVideo.readyState >= 2) {
            doSwitch();
        } else {
            newVideo.addEventListener('canplay', doSwitch, { once: true });
        }
    }
    
    /**
     * Override Page Visibility API when in PiP mode
     * This prevents Instagram from detecting tab is hidden and pausing the video
     */
    let visibilityOverrideActive = false;
    let originalHiddenDescriptor = null;
    let originalVisibilityStateDescriptor = null;
    
    function enableVisibilityOverride() {
        if (visibilityOverrideActive) return;
        visibilityOverrideActive = true;
        
        console.log('[InstagramControls] Enabling visibility override for PiP');
        
        // Store original descriptors
        originalHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
        originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
        
        // Override document.hidden to always return false
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: function() {
                return false;
            }
        });
        
        // Override document.visibilityState to always return 'visible'
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: function() {
                return 'visible';
            }
        });
        
        // Block visibilitychange events from reaching Instagram's listeners
        window.addEventListener('visibilitychange', blockVisibilityChange, true);
        document.addEventListener('visibilitychange', blockVisibilityChange, true);
    }
    
    function disableVisibilityOverride() {
        if (!visibilityOverrideActive) return;
        visibilityOverrideActive = false;
        
        console.log('[InstagramControls] Disabling visibility override');
        
        // Restore original descriptors
        if (originalHiddenDescriptor) {
            Object.defineProperty(document, 'hidden', originalHiddenDescriptor);
        } else {
            delete document.hidden;
        }
        
        if (originalVisibilityStateDescriptor) {
            Object.defineProperty(document, 'visibilityState', originalVisibilityStateDescriptor);
        } else {
            delete document.visibilityState;
        }
        
        // Remove event blockers
        window.removeEventListener('visibilitychange', blockVisibilityChange, true);
        document.removeEventListener('visibilitychange', blockVisibilityChange, true);
    }
    
    function blockVisibilityChange(event) {
        if (visibilityOverrideActive) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    }
    
    /**
     * Set up handlers to keep video playing in PiP when tab is hidden/minimized
     * Uses visibility API override to prevent Instagram from pausing
     * @param {HTMLVideoElement} video - The video element in PiP
     */
    function setupPiPKeepPlaying(video) {
        if (!video || video._pipKeepPlayingSetup) return;
        video._pipKeepPlayingSetup = true;
        
        console.log('[InstagramControls] Setting up PiP keep-playing handlers');
        
        // Enable visibility override when entering PiP
        enableVisibilityOverride();
        
        // Clean up when leaving PiP
        const leavePiPHandler = () => {
            console.log('[InstagramControls] Left PiP, cleaning up');
            disableVisibilityOverride();
            video.removeEventListener('leavepictureinpicture', leavePiPHandler);
            video._pipKeepPlayingSetup = false;
        };
        video.addEventListener('leavepictureinpicture', leavePiPHandler);
    }
    
    // Store reference to Document PiP window
    let documentPiPWindow = null;
    
    /**
     * Open video in Document Picture-in-Picture with custom controls
     * This allows on-screen buttons for volume, mute, next/prev
     */
    async function openDocumentPiP(video) {
        if (!video) {
            video = findVisibleVideo();
        }
        if (!video) {
            console.log('[InstagramControls] No video found for Document PiP');
            return;
        }
        
        // Check if Document PiP API is supported
        if (!('documentPictureInPicture' in window)) {
            console.log('[InstagramControls] Document PiP not supported in this browser');
            showOSD('❌ Document PiP not supported', 1500);
            return;
        }
        
        try {
            // Close existing PiP if any
            if (documentPiPWindow && !documentPiPWindow.closed) {
                documentPiPWindow.close();
            }
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }
            
            // Request Document PiP window - larger for fullscreen video
            documentPiPWindow = await window.documentPictureInPicture.requestWindow({
                width: 360,
                height: 640, // Vertical video ratio (9:16)
            });
            
            // Enable visibility override
            enableVisibilityOverride();
            
            // Copy styles to PiP window
            const pipDoc = documentPiPWindow.document;
            
            // Add simple, clean styles - video fullscreen with overlay controls
            const style = pipDoc.createElement('style');
            style.textContent = `
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    background: #000; 
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    user-select: none;
                }
                
                /* Video fills entire window */
                .video-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #000;
                }
                video {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                
                /* Controls overlay - appears on hover */
                .controls-overlay {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 12px 16px;
                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                body:hover .controls-overlay { opacity: 1; }
                
                /* Progress bar */
                .progress-bar {
                    width: 100%;
                    height: 4px;
                    background: rgba(255,255,255,0.3);
                    border-radius: 2px;
                    cursor: pointer;
                    margin-bottom: 10px;
                }
                .progress-bar:hover { height: 6px; }
                .progress-fill {
                    height: 100%;
                    background: #fff;
                    border-radius: 2px;
                    width: 0%;
                }
                
                /* Simple button row */
                .controls-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                }
                
                /* Simple web-style buttons */
                button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 8px;
                    opacity: 0.9;
                    transition: opacity 0.15s, transform 0.15s;
                }
                button:hover { 
                    opacity: 1; 
                    transform: scale(1.1);
                }
                button:active { transform: scale(0.95); }
                
                .play-btn { font-size: 32px; }
                
                /* Volume slider */
                .volume-group {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .volume-slider {
                    width: 60px;
                    height: 4px;
                    -webkit-appearance: none;
                    background: rgba(255,255,255,0.3);
                    border-radius: 2px;
                    cursor: pointer;
                }
                .volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    background: #fff;
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                /* Time display */
                .time-display {
                    color: rgba(255,255,255,0.7);
                    font-size: 11px;
                    position: absolute;
                    right: 16px;
                    bottom: 50px;
                }
                
                /* Scroll hint */
                .scroll-hint {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.7);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.15s;
                }
                .scroll-hint.show { opacity: 1; }
            `;
            pipDoc.head.appendChild(style);
            
            // Create video container (fullscreen)
            const container = pipDoc.createElement('div');
            container.className = 'video-container';
            
            // Scroll hint overlay
            const scrollHint = pipDoc.createElement('div');
            scrollHint.className = 'scroll-hint';
            container.appendChild(scrollHint);
            
            // IMPORTANT: Move the actual video element to PiP window (not clone!)
            const originalParent = video.parentElement;
            const originalNextSibling = video.nextSibling;
            const originalStyles = video.style.cssText;
            
            video.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
            video.controls = false;
            container.appendChild(video);
            
            let currentVideo = video;
            
            // Function to sync PiP with new video after navigation
            function syncPiPVideo() {
                const newVideo = findVisibleVideo();
                if (newVideo && newVideo !== currentVideo) {
                    // Return old video to its place
                    if (currentVideo.parentElement === container) {
                        const restore = currentVideo._pipRestore;
                        if (restore) {
                            currentVideo.style.cssText = restore.styles;
                            currentVideo.controls = true;
                            if (restore.parent) {
                                restore.parent.insertBefore(currentVideo, restore.sibling);
                            }
                        }
                    }
                    
                    // Move new video to PiP
                    const newRestore = {
                        parent: newVideo.parentElement,
                        sibling: newVideo.nextSibling,
                        styles: newVideo.style.cssText
                    };
                    
                    newVideo.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
                    newVideo.controls = false;
                    container.appendChild(newVideo);
                    newVideo._pipRestore = newRestore;
                    
                    // Update UI with simple icons
                    playBtn.innerHTML = newVideo.paused ? '▶' : '⏸';
                    muteBtn.innerHTML = newVideo.muted ? '🔇' : '🔊';
                    volumeSlider.value = Math.round(newVideo.volume * 100);
                    
                    // Add event listeners to new video
                    newVideo.addEventListener('play', () => playBtn.innerHTML = '⏸');
                    newVideo.addEventListener('pause', () => playBtn.innerHTML = '▶');
                    newVideo.addEventListener('timeupdate', updateProgress);
                    newVideo.addEventListener('volumechange', updateVolumeUI);
                    
                    currentVideo = newVideo;
                    console.log('[InstagramControls] Document PiP synced to new video');
                }
            }
            
            // Listen for sync events from navigateReel
            const syncHandler = () => syncPiPVideo();
            window.addEventListener('pip-sync-video', syncHandler);
            
            // Store restore info for initial video
            currentVideo._pipRestore = { parent: originalParent, sibling: originalNextSibling, styles: originalStyles };
            
            // Progress bar
            const progressBar = pipDoc.createElement('div');
            progressBar.className = 'progress-bar';
            
            const progressFill = pipDoc.createElement('div');
            progressFill.className = 'progress-fill';
            progressBar.appendChild(progressFill);
            
            // Time display
            const timeDisplay = pipDoc.createElement('div');
            timeDisplay.className = 'time-display';
            timeDisplay.textContent = '0:00 / 0:00';
            
            // Format time helper
            function formatTime(seconds) {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            }
            
            // Update progress bar
            function updateProgress() {
                if (currentVideo.duration) {
                    const percent = (currentVideo.currentTime / currentVideo.duration) * 100;
                    progressFill.style.width = percent + '%';
                    timeDisplay.textContent = `${formatTime(currentVideo.currentTime)} / ${formatTime(currentVideo.duration)}`;
                }
            }
            currentVideo.addEventListener('timeupdate', updateProgress);
            
            // Seek on progress bar click
            progressBar.onclick = (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                currentVideo.currentTime = percent * currentVideo.duration;
            };
            
            // Controls row - simple web-style buttons
            const controlsRow = pipDoc.createElement('div');
            controlsRow.className = 'controls-row';
            
            // Previous button
            const prevBtn = pipDoc.createElement('button');
            prevBtn.innerHTML = '⏮';
            prevBtn.title = 'Previous Reel';
            prevBtn.onclick = () => navigateReel('previous');
            
            // Play/Pause button
            const playBtn = pipDoc.createElement('button');
            playBtn.className = 'play-btn';
            playBtn.innerHTML = currentVideo.paused ? '▶' : '⏸';
            playBtn.title = 'Play/Pause';
            playBtn.onclick = () => {
                if (currentVideo.paused) {
                    currentVideo.play();
                } else {
                    currentVideo.pause();
                }
            };
            currentVideo.addEventListener('play', () => playBtn.innerHTML = '⏸');
            currentVideo.addEventListener('pause', () => playBtn.innerHTML = '▶');
            
            // Next button  
            const nextBtn = pipDoc.createElement('button');
            nextBtn.innerHTML = '⏭';
            nextBtn.title = 'Next Reel';
            nextBtn.onclick = () => navigateReel('next');
            
            // Mute button
            const muteBtn = pipDoc.createElement('button');
            muteBtn.innerHTML = currentVideo.muted ? '🔇' : '🔊';
            muteBtn.title = 'Mute/Unmute';
            muteBtn.onclick = () => {
                currentVideo.muted = !currentVideo.muted;
                muteBtn.innerHTML = currentVideo.muted ? '🔇' : '🔊';
                if (!currentVideo.muted) {
                    setGlobalUnmuted();
                } 
            };
            
            // Volume slider
            const volumeGroup = pipDoc.createElement('div');
            volumeGroup.className = 'volume-group';
            
            const volumeSlider = pipDoc.createElement('input');
            volumeSlider.type = 'range';
            volumeSlider.className = 'volume-slider';
            volumeSlider.min = '0';
            volumeSlider.max = '100';
            volumeSlider.value = Math.round(currentVideo.volume * 100);
            
            function updateVolumeUI() {
                volumeSlider.value = Math.round(currentVideo.volume * 100);
                muteBtn.innerHTML = currentVideo.muted ? '🔇' : '🔊';
            }
            
            volumeSlider.oninput = () => {
                const vol = volumeSlider.value / 100;
                currentVideo.volume = vol;
                lastKnownVolume = vol;
                if (vol > 0 && currentVideo.muted) {
                    currentVideo.muted = false;
                    muteBtn.innerHTML = '🔊';
                    setGlobalUnmuted();
                }
            };
            
            currentVideo.addEventListener('volumechange', updateVolumeUI);
            
            volumeGroup.appendChild(muteBtn);
            volumeGroup.appendChild(volumeSlider);
            
            // Assemble controls
            controlsRow.appendChild(prevBtn);
            controlsRow.appendChild(playBtn);
            controlsRow.appendChild(nextBtn);
            controlsRow.appendChild(volumeGroup);
            
            // Controls overlay container
            const controlsOverlay = pipDoc.createElement('div');
            controlsOverlay.className = 'controls-overlay';
            controlsOverlay.appendChild(progressBar);
            controlsOverlay.appendChild(controlsRow);
            
            // Assemble UI - video container + overlay
            pipDoc.body.appendChild(container);
            pipDoc.body.appendChild(timeDisplay);
            pipDoc.body.appendChild(controlsOverlay);
            
            // Scroll to navigate reels
            let scrollTimeout;
            container.addEventListener('wheel', (e) => {
                e.preventDefault();
                
                // Show scroll hint
                scrollHint.textContent = e.deltaY > 0 ? '⬇️ Next' : '⬆️ Previous';
                scrollHint.classList.add('show');
                
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    scrollHint.classList.remove('show');
                    
                    if (e.deltaY > 0) {
                        navigateReel('next');
                    } else {
                        navigateReel('previous');
                    }
                }, 150);
            }, { passive: false });
            
            // Click on video to play/pause
            container.addEventListener('click', (e) => {
                if (e.target === container || e.target === currentVideo) {
                    if (currentVideo.paused) {
                        currentVideo.play();
                    } else {
                        currentVideo.pause();
                    }
                }
            });
            
            // Start playing
            currentVideo.play().catch(() => {});
            
            // Handle window close - restore video to original location
            documentPiPWindow.addEventListener('pagehide', () => {
                console.log('[InstagramControls] Document PiP closed, restoring video');
                disableVisibilityOverride();
                
                // Remove sync event listener
                window.removeEventListener('pip-sync-video', syncHandler);
                
                if (currentVideo._pipRestore) {
                    const restore = currentVideo._pipRestore;
                    currentVideo.style.cssText = restore.styles;
                    currentVideo.controls = true;
                    if (restore.parent) {
                        restore.parent.insertBefore(currentVideo, restore.sibling);
                    }
                    delete currentVideo._pipRestore;
                }
                
                documentPiPWindow = null;
            });
            
            console.log('[InstagramControls] Document PiP opened with custom controls');
            
        } catch (err) {
            console.error('[InstagramControls] Document PiP failed:', err);
            showOSD('❌ PiP Failed: ' + err.message, 1500);
        }
    }
    
    /**
     * Set up global listener for PiP enter events on any video
     * Intercepts standard PiP and redirects to our custom Document PiP
     */
    function setupGlobalPiPListener() {
        // When user clicks native PiP button, intercept and open our custom PiP instead
        document.addEventListener('enterpictureinpicture', (event) => {
            const video = event.target;
            console.log('[InstagramControls] Standard PiP triggered, redirecting to Document PiP');
            
            // Exit standard PiP immediately
            document.exitPictureInPicture().then(() => {
                // Open our custom Document PiP
                openDocumentPiP(video);
            }).catch(() => {
                // If exit fails, still try to open Document PiP
                openDocumentPiP(video);
            });
        }, true);
        
        console.log('[InstagramControls] Global PiP listener set up');
    }
    
    /**
     * Set up volume control for PiP video
     * Uses mouse wheel and keyboard for volume adjustment
     */
    function setupPiPVolumeControl(video) {
        if (!video || video._pipVolumeSetup) return;
        video._pipVolumeSetup = true;
        
        console.log('[InstagramControls] Setting up PiP volume controls');
        
        // Mouse wheel for volume control on the video
        const wheelHandler = (e) => {
            if (document.pictureInPictureElement === video) {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.1 : -0.1; // Scroll up = volume up
                const newVolume = Math.max(0, Math.min(1, video.volume + delta));
                video.volume = newVolume;
                lastKnownVolume = newVolume;
                
                // Unmute if raising volume from muted state
                if (newVolume > 0 && video.muted) {
                    video.muted = false;
                    setGlobalUnmuted();
                    clickInstagramUnmuteButton(video);
                }
                
                showOSD(`🔊 ${Math.round(newVolume * 100)}%`, 600);
                console.log(`[InstagramControls] PiP volume wheel: ${Math.round(newVolume * 100)}%`);
            }
        };
        video.addEventListener('wheel', wheelHandler, { passive: false });
        
        // Double-click to toggle mute
        const dblClickHandler = (e) => {
            if (document.pictureInPictureElement === video) {
                video.muted = !video.muted;
                if (!video.muted) {
                    setGlobalUnmuted();
                    clickInstagramUnmuteButton(video);
                } else {
                    clickInstagramMuteButton(video);
                }
                showOSD(video.muted ? '🔇 Muted' : `🔊 ${Math.round(video.volume * 100)}%`, 600);
            }
        };
        video.addEventListener('dblclick', dblClickHandler);
        
        // Clean up when leaving PiP
        video.addEventListener('leavepictureinpicture', () => {
            video.removeEventListener('wheel', wheelHandler);
            video.removeEventListener('dblclick', dblClickHandler);
            video._pipVolumeSetup = false;
        }, { once: true });
    }
    
    /**
     * Set up swipe navigation in PiP window
     * Swipe up = next reel, swipe down = previous reel
     */
    function setupPiPSwipeNavigation(video, pipWindow) {
        if (!pipWindow) return;
        
        // Unfortunately, we can't directly add touch listeners to PiP window
        // But we can use the video element's events which still fire in PiP
        let touchStartY = 0;
        let touchEndY = 0;
        const MIN_SWIPE_DISTANCE = 50;
        
        const handleTouchStart = (e) => {
            touchStartY = e.touches[0].clientY;
        };
        
        const handleTouchEnd = (e) => {
            touchEndY = e.changedTouches[0].clientY;
            const swipeDistance = touchStartY - touchEndY;
            
            if (Math.abs(swipeDistance) > MIN_SWIPE_DISTANCE) {
                if (swipeDistance > 0) {
                    // Swiped up - next reel
                    console.log('[InstagramControls] PiP swipe up - next reel');
                    navigateReel('next');
                } else {
                    // Swiped down - previous reel
                    console.log('[InstagramControls] PiP swipe down - previous reel');
                    navigateReel('previous');
                }
            }
        };
        
        video.addEventListener('touchstart', handleTouchStart, { passive: true });
        video.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // Clean up on PiP exit
        video.addEventListener('leavepictureinpicture', () => {
            video.removeEventListener('touchstart', handleTouchStart);
            video.removeEventListener('touchend', handleTouchEnd);
        }, { once: true });
        
        console.log('[InstagramControls] PiP swipe navigation set up');
    }

    /**
     * Set up Picture-in-Picture media session actions for reel navigation and volume
     * This adds next/previous track buttons and other controls to the PiP window
     */
    function setupPiPMediaSession() {
        if (!('mediaSession' in navigator)) {
            log('MediaSession API not supported');
            return;
        }

        try {
            // Set up next track action (skip to next reel)
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                log('PiP: nexttrack action triggered');
                navigateReel('next');
            });

            // Set up previous track action (go to previous reel)
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                log('PiP: previoustrack action triggered');
                navigateReel('previous');
            });
            
            // Set up play action
            navigator.mediaSession.setActionHandler('play', () => {
                const video = document.pictureInPictureElement;
                if (video) {
                    video.play().catch(() => {});
                    // Mark as unmuted when user plays
                    setGlobalUnmuted();
                }
            });
            
            // Set up pause action
            navigator.mediaSession.setActionHandler('pause', () => {
                const video = document.pictureInPictureElement;
                if (video) video.pause();
            });
            
            // Note: Volume controls in PiP are not directly available via MediaSession API
            // Volume is controlled via the video element's native controls or keyboard shortcuts
            // However, we can handle seek which some systems show as volume-like
            
            // Set up seek forward (can be used as volume up)
            try {
                navigator.mediaSession.setActionHandler('seekforward', (details) => {
                    const video = document.pictureInPictureElement;
                    if (video) {
                        // Use as volume up
                        const newVolume = Math.min(1, video.volume + 0.1);
                        video.volume = newVolume;
                        lastKnownVolume = newVolume;
                        showOSD(`🔊 ${Math.round(newVolume * 100)}%`, 800);
                    }
                });
            } catch (e) { /* Handler not supported */ }
            
            // Set up seek backward (can be used as volume down)
            try {
                navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                    const video = document.pictureInPictureElement;
                    if (video) {
                        // Use as volume down
                        const newVolume = Math.max(0, video.volume - 0.1);
                        video.volume = newVolume;
                        lastKnownVolume = newVolume;
                        showOSD(`🔊 ${Math.round(newVolume * 100)}%`, 800);
                    }
                });
            } catch (e) { /* Handler not supported */ }

            // Set metadata so PiP shows proper info
            if (isInstagramReelsPage()) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Instagram Reel',
                    artist: 'Instagram',
                    album: 'Reels'
                });
            }

            log('PiP media session handlers set up successfully');
        } catch (ex) {
            log('Failed to set up PiP media session:', ex);
        }
    }
    
    /**
     * Set up keyboard shortcuts that work even when PiP is active
     * Ctrl+Up/Down for volume, Ctrl+Left/Right for navigation
     */
    function setupPiPKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore events we dispatched ourselves
            if (e._fromInstagramControls) return;
            
            // Only handle if we're in PiP mode or Instagram is in background
            const pipVideo = document.pictureInPictureElement;
            if (!pipVideo) return;
            
            // Volume control with Ctrl+Up/Down
            if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();
                const delta = e.key === 'ArrowUp' ? 0.1 : -0.1;
                const newVolume = Math.max(0, Math.min(1, pipVideo.volume + delta));
                pipVideo.volume = newVolume;
                lastKnownVolume = newVolume;
                
                if (newVolume > 0 && pipVideo.muted) {
                    pipVideo.muted = false;
                    setGlobalUnmuted();
                }
                
                showOSD(`🔊 ${Math.round(newVolume * 100)}%`, 800);
            }
            
            // Navigation with Ctrl+Left/Right (handled by background script, but this is backup)
            if (e.ctrlKey && e.key === 'ArrowRight') {
                navigateReel('next');
            }
            if (e.ctrlKey && e.key === 'ArrowLeft') {
                navigateReel('previous');
            }
            
            // Mute/Unmute with M key
            if (e.key === 'm' || e.key === 'M') {
                pipVideo.muted = !pipVideo.muted;
                if (!pipVideo.muted) {
                    setGlobalUnmuted();
                    clickInstagramUnmuteButton(pipVideo);
                } else {
                    clickInstagramMuteButton(pipVideo);
                }
                showOSD(pipVideo.muted ? '🔇 Muted' : `🔊 ${Math.round(pipVideo.volume * 100)}%`, 800);
            }
            
            // Volume up/down with +/- or =/- keys (no modifier needed)
            if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') {
                if (!e.ctrlKey && e.key === 'ArrowUp') return; // Let Ctrl+Up handle it
                const newVolume = Math.min(1, pipVideo.volume + 0.1);
                pipVideo.volume = newVolume;
                lastKnownVolume = newVolume;
                if (pipVideo.muted) {
                    pipVideo.muted = false;
                    setGlobalUnmuted();
                    clickInstagramUnmuteButton(pipVideo);
                }
                showOSD(`🔊 ${Math.round(newVolume * 100)}%`, 600);
            }
            if (e.key === '-' || e.key === '_' || e.key === 'ArrowDown') {
                if (!e.ctrlKey && e.key === 'ArrowDown') return; // Let Ctrl+Down handle it
                const newVolume = Math.max(0, pipVideo.volume - 0.1);
                pipVideo.volume = newVolume;
                lastKnownVolume = newVolume;
                showOSD(`🔊 ${Math.round(newVolume * 100)}%`, 600);
            }
            
            // Number keys 0-9 for quick volume levels
            if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.altKey) {
                const level = parseInt(e.key) / 10; // 0 = 0%, 5 = 50%, 9 = 90%
                pipVideo.volume = level === 0 ? 0 : level;
                lastKnownVolume = pipVideo.volume;
                if (level > 0 && pipVideo.muted) {
                    pipVideo.muted = false;
                    setGlobalUnmuted();
                    clickInstagramUnmuteButton(pipVideo);
                }
                showOSD(`🔊 ${Math.round(pipVideo.volume * 100)}%`, 600);
            }
        });
        
        console.log('[InstagramControls] PiP keyboard shortcuts set up');
    }
    
    /**
     * Set up global keyboard shortcut to open Document PiP with custom controls
     * Press P to open enhanced PiP, Shift+P for standard PiP
     */
    function setupDocumentPiPShortcut() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            
            // P key to toggle Document PiP (or standard PiP if not supported)
            if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                
                // If already in Document PiP, close it
                if (documentPiPWindow && !documentPiPWindow.closed) {
                    documentPiPWindow.close();
                    documentPiPWindow = null;
                    showOSD('📺 PiP Closed', 800);
                    return;
                }
                
                // If in standard PiP, exit it
                if (document.pictureInPictureElement) {
                    document.exitPictureInPicture().catch(() => {});
                    showOSD('📺 PiP Closed', 800);
                    return;
                }
                
                // Open Document PiP
                const video = findVisibleVideo();
                if (video) {
                    openDocumentPiP(video);
                    showOSD('📺 PiP with Controls', 1000);
                } else {
                    showOSD('❌ No video found', 1000);
                }
            }
        });
        console.log('[InstagramControls] Document PiP shortcut (P key) set up');
    }

    /**
     * Listen for messages from background script (for hotkey commands)
     */
    function setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('[InstagramControls] Received message:', message);
            log('Received message:', message);
            
            if (message.action === 'next-reel') {
                console.log('[InstagramControls] Navigating to next reel');
                navigateReel('next');
                sendResponse({success: true});
            } else if (message.action === 'previous-reel') {
                console.log('[InstagramControls] Navigating to previous reel');
                navigateReel('previous');
                sendResponse({success: true});
            }
            
            return true; // Keep message channel open for async response
        });
        console.log('[InstagramControls] Message listener set up');
    }

    /**
     * @param {Node?} contextNode
     * @return {HTMLVideoElement[]}
     */
    function getVideos(contextNode = undefined) {
        return util.queryAll("video", contextNode);
    }

    function now() {
        return new Date().getTime();
    }

    function modifyVideo(video) {
        if (videoControlsAlreadyInitialized(video)) {
            return;
        }

        // Try to find a component root element, which is basically a div that's a few parents above the video element,
        // and serves as a container for all the instagram GUI stuff, like buttons, images, overlays, the video element etc...

        // .EmbedVideo is found when were in an iframe used by a 3rd party to embed instagram.
        let componentRoot = video.closest(".EmbedVideo");
        if (!componentRoot) {
            // Try to find the style of root used on instagram.com when they overlay the video with a big play button.
            componentRoot = util.recordEx('gevcre', getEstimatedVideoComponentRootElement)(video);
        }

        if (!componentRoot) {
            // If we reached here, either they changed their dom structure, or its a video without the insta-junk markup. This seems to happen
            // on very long videos - they just present a native html5 player, although they still disable downloads and other stuff.
            // We'll just go up 4 parents like the other cases and hope for the best lol.
            // I think we aren't likely to find any overlay buttons in this case, at least I havent encountered any yet.
            // this should probably be the 5th parent instead of 4th, to be consistent /w our other code, but 4th works, and is safer.
            componentRoot = nthParent(video, 4);
        }

        if (componentRoot) {
            util.recordEx('mve', modifyVideoElement)(componentRoot);
            util.recordEx('mowipc', modifyOverlayWithInstagramPlayControl)(componentRoot, video);
        }
    }

    function modifyAllPresentVideos() {
        getVideos().forEach(modifyVideo);
    }

    function hide(el) {
        // Being visibility:hidden also prevents mouse events.
        // Also, a hidden element retains its size as determined by the bounding box.
        // Both of these factors matter, and other code depends on them being that way.
        el && el.style && (el.style.visibility = 'hidden');
    }

    /**
     * This element is their control which pauses the vid when you hold the mouse down.
     * It interferes with the <video> receiving mousemove events necessary to show the native controls,
     * and also interferes w/ normal click to toggle play/pause.
     *
     * Unfortunately, there's some sub elements that look like they may have functionality,
     * and by hiding their root, we might be breaking features. There's a
     *      role=dialog
     * and also a
     *      aria-label="Cancel Popup" role=button
     *
     * todo need to investigate more. a child of the Cancel Popup div had a name and clickable link to a users
     * instagram page on one video.
     * @param videoElement
     */
    function incapacitateStoryVideoPausingOverlays(videoElement) {
        // There's more than 1 element overlaying the video. Hide all the siblings.
        // Also, they change this markup often.
        // Null-safety: check parentElement exists before accessing children
        if (videoElement && videoElement.parentElement) {
            Array.from(videoElement.parentElement.children).filter(el => el !== videoElement).forEach(hide);
        }
    }

    function modifyVideoElement(embedRootElem) {

        getVideos(embedRootElem).forEach(videoPlayer => {

            if (videoControlsAlreadyInitialized(videoPlayer)) {
                // Skip, we've already processed this element.
                return;
            }

            // This is used as a css selector to redefine the style instatard uses to hide the native media controls.
            // We use the dataset instead of a class because the react framework that they use will overwrite some other properties, erasing our class name.
            videoPlayer.dataset.nativeControlsISetJooFree = "1";
            knownVideoElements.add(videoPlayer);

            // Enable native controls. Some instagram videos actually already have them enabled.
            videoPlayer.controls = true;

            // They tend to not show the download video option, so we reenable it by clearing the list of restricted controls.
            // But often this results in a failed download if the user clicks the button.
            videoPlayer.setAttribute('controlsList', '');

            if (isInstagramStoriesPage()) {
                incapacitateStoryVideoPausingOverlays(videoPlayer);
            }

            // TWO-WAY MUTE BUTTON SYNC
            // Sync our HTML5 controls with Instagram's mute button in BOTH directions
            // Using direct DOM search instead of findVolumeOrTagsButtons for reliability
            let lastMuteSync = 0;
            const MUTE_SYNC_COOLDOWN = 300;
            let lastKnownMuteState = videoPlayer.muted;
            
            // Listen for mute state changes from our HTML5 controls
            videoPlayer.addEventListener('volumechange', () => {
                const now = Date.now();
                if (now - lastMuteSync < MUTE_SYNC_COOLDOWN) return;
                
                const currentMuted = videoPlayer.muted;
                
                // Only act if mute state actually changed
                if (currentMuted !== lastKnownMuteState) {
                    console.log(`[InstagramControls] HTML5 mute changed: ${lastKnownMuteState} -> ${currentMuted}`);
                    lastKnownMuteState = currentMuted;
                    lastMuteSync = now;
                    
                    // Sync to Instagram's button
                    setTimeout(() => {
                        if (currentMuted) {
                            // We muted via HTML5, click IG's unmuted button to mute it too
                            clickInstagramMuteButton(videoPlayer);
                        } else {
                            // We unmuted via HTML5, click IG's muted button to unmute it too
                            clickInstagramUnmuteButton(videoPlayer);
                            // Also set global unmute state
                            if (!userHasUnmuted) {
                                setGlobalUnmuted();
                            }
                        }
                    }, 50);
                }
            });
            
            // Also try to find and sync with IG button initially
            const buttons = findVolumeOrTagsButtons(embedRootElem, videoPlayer);
            if (buttons.audioButton) {
                const muteButton = buttons.audioButton;
                
                // Listen for clicks on Instagram's button
                muteButton.addEventListener('click', () => {
                    setTimeout(() => {
                        // Check IG button state and sync to our video
                        const svg = muteButton.querySelector('svg');
                        if (svg) {
                            const ariaLabel = svg.getAttribute('aria-label') || '';
                            const viewBox = svg.getAttribute('viewBox') || '';
                            const isMuted = ariaLabel.toLowerCase().includes('muted') || viewBox === '0 0 48 48';
                            
                            if (videoPlayer.muted !== isMuted) {
                                console.log(`[InstagramControls] IG button clicked, syncing video.muted to ${isMuted}`);
                                lastKnownMuteState = isMuted;
                                videoPlayer.muted = isMuted;
                                
                                if (!isMuted && !userHasUnmuted) {
                                    setGlobalUnmuted();
                                }
                            }
                        }
                    }, 100);
                });
            }

            // We debounce this event handler because it can fire rapidly when dragging the volume slider, and it can sometimes create
            // a complicated feedback loop involving this handler and I think either the storage change event, or maybe just
            // queued up events, which causes the volume to skip around as you drag it due to the backlog of events.
            // Use valuesAreDifferentEnough instead of strict equality to tolerate float imprecision.
            // Note: volumechange fires on both volume or mute change.
            videoPlayer.addEventListener('volumechange', util.debounce(evt => {
                const vVol = videoPlayer.volume;
                // Always update in-memory cache so new videos get the right volume
                if (valuesAreDifferentEnough(lastKnownVolume || 1, vVol)) {
                    lastKnownVolume = vVol;
                    log(`Volume changed to ${vVol}, updating lastKnownVolume`);
                }
                
                if (config.rememberVolumeLevel && valuesAreDifferentEnough(config.volumeLevel, vVol)) {
                    const cVol = config.volumeLevel;
                    // Update in-memory config immediately so new videos get the fresh value without waiting for storage round-trip.
                    config.volumeLevel = vVol;
                    saveVolumeLevel(vVol);
                    // Propagate to all other known videos on this page right away.
                    log(`The volume changed. cVol=${cVol} vVol=${vVol}`, evt);
                    setVolumeOfPreviouslySeenVideoElements(vVol);
                }
            }, 150)); // Reduced debounce for faster response

            videoPlayer.addEventListener('ratechange', util.debounce(evt => {
                const newRate = videoPlayer.playbackRate;
                // Always update in-memory cache
                if (valuesAreDifferentEnough(lastKnownPlaybackRate || 1, newRate)) {
                    lastKnownPlaybackRate = newRate;
                    log(`Playback rate changed to ${newRate}, updating lastKnownPlaybackRate`);
                }
                
                if (config.rememberPlaybackRate && valuesAreDifferentEnough(config.playbackRate, newRate)) {
                    // Update in-memory config immediately so new videos get the fresh value without waiting for storage round-trip.
                    config.playbackRate = newRate;
                    savePlaybackRate(newRate);
                    setPlaybackRateOfPreviouslySeenVideoElements(newRate);
                    log('The playbackRate changed.', evt, newRate);
                }
            }, 150));
            
            // GLOBAL MUTE STATE TRACKING
            // Track mute state changes from both our HTML5 controls and Instagram's button
            // Use a dedicated listener that checks the actual muted property
            let lastMutedState = videoPlayer.muted;
            
            const checkMuteStateChange = () => {
                const currentMuted = videoPlayer.muted;
                
                // Detect unmute action (muted was true, now false)
                if (lastMutedState && !currentMuted) {
                    console.log('[InstagramControls] Video unmuted via controls - setting global unmute');
                    if (!userHasUnmuted) {
                        setGlobalUnmuted();
                    }
                }
                
                lastMutedState = currentMuted;
            };
            
            // Listen for volumechange which fires on mute toggle
            videoPlayer.addEventListener('volumechange', checkMuteStateChange);
            
            // Also poll briefly after video starts playing to catch any mute changes
            // This helps catch cases where the mute state changes but event doesn't fire
            const muteCheckInterval = setInterval(() => {
                if (!document.body.contains(videoPlayer)) {
                    clearInterval(muteCheckInterval);
                    return;
                }
                checkMuteStateChange();
            }, 500);
            
            // Stop polling after 30 seconds to save resources
            setTimeout(() => clearInterval(muteCheckInterval), 30000);

            // ROBUST VOLUME APPLICATION
            // Apply volume/rate multiple times to handle Instagram's own volume manipulation
            // and race conditions with their React components
            const applySettings = () => {
                const volumeToApply = getVolumeToApply();
                const rateToApply = getPlaybackRateToApply();
                
                if (config.rememberVolumeLevel || lastKnownVolume !== null) {
                    forceApplyVolume(videoPlayer, volumeToApply);
                }
                if (config.rememberPlaybackRate || lastKnownPlaybackRate !== null) {
                    forceApplyPlaybackRate(videoPlayer, rateToApply);
                }
                
                // Apply global mute state - if user has unmuted before, unmute this video too
                if (userHasUnmuted) {
                    videoPlayer.muted = false;
                }
            };
            
            // Apply immediately
            applySettings();
            
            // Apply again after short delays to counteract Instagram's volume resets
            // These delays help catch cases where Instagram's JS runs after our initial set
            setTimeout(applySettings, 50);
            setTimeout(applySettings, 150);
            setTimeout(applySettings, 500);
            
            // Also apply global mute state and try to click Instagram's unmute button
            // Multiple attempts because Instagram's UI may take time to initialize
            if (userHasUnmuted) {
                const applyUnmute = () => {
                    videoPlayer.muted = false;
                    clickInstagramUnmuteButton(videoPlayer);
                };
                setTimeout(applyUnmute, 100);
                setTimeout(applyUnmute, 300);
                setTimeout(applyUnmute, 600);
                setTimeout(applyUnmute, 1000);
            }

            // We probably only need to add css to the page once, but im worried react might remove it in some obscure
            // case, so adding it over and over seems safer.
            redefineWebkitMediaControlHidingCssRule();

            try {
                // This func has a high chance of failing w/ NPE if instagram changes their dom layout.
                // It's not critical for this function to succeed, so we just keep going if it throws.
                // We only want to modify videos on stories.
                if (isInstagramStoriesPage()) {
                    // We call the func multiple times because on stories, if we transition from watching a story video
                    // to another story video, there's a brief moment where the transition animation runs that we have
                    // two video elements in the dom, and the new video starts off tiny as it animates in.
                    // If our func runs during this time, the sizing gets screwed up because it measures a tiny video.
                    // So, we just run it a few times, hoping that their browser will be fast enough to render it full size within 1.5 seconds.
                    modifyVideoHeightIfSendMessageBoxOrLikeButtonIsBlockingVideoControls(videoPlayer);
                    setTimeout(() => modifyVideoHeightIfSendMessageBoxOrLikeButtonIsBlockingVideoControls(videoPlayer), 300);
                    setTimeout(() => modifyVideoHeightIfSendMessageBoxOrLikeButtonIsBlockingVideoControls(videoPlayer), 600);
                    setTimeout(() => modifyVideoHeightIfSendMessageBoxOrLikeButtonIsBlockingVideoControls(videoPlayer), 1500);
                }
            } catch (ex) {
                log(ex);
            }
        });
    }

    function videoControlsAlreadyInitialized(videoPlayer) {
        return !!videoPlayer.dataset.nativeControlsISetJooFree;
    }

    function setPlaybackRateIfChanged(player, newPlaybackRate) {
        // Only update if the current playbackRate is different from the new playbackRate (avoids triggering a new ratechange event).
        if (player && !isNaN(newPlaybackRate) && valuesAreDifferentEnough(player.playbackRate,  newPlaybackRate)) {
            try {
                player.playbackRate = newPlaybackRate;
            } catch (ex) {
                log('failed to set playback rate. it was probably out of range.', {player, playbackRate: newPlaybackRate, ex});
            }
        }
    }

    function setVolumeIfChanged(player, newVolume) {
        // Only update if the current volume is different from the new volume (avoids triggering a new volumechange event).
        const currentVolume = player.volume;
        if (player && !isNaN(newVolume) && valuesAreDifferentEnough(currentVolume,  newVolume)) {
            try {
                //log('before set vol');
                player.volume = newVolume;
                log(`setVolumeIfChanged old=${currentVolume} new=${newVolume}`, new Date().toISOString());
                // If you notice sometimes videos autoplay but start muted, it's likely this Chrome feature: https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
            } catch (ex) {
                log('failed to set volume. it was probably out of range.', {player, volume: newVolume, ex});
            }
        }
    }

    function setVolumeOfPreviouslySeenVideoElements(volume) {
        // Update in-memory cache
        lastKnownVolume = volume;
        getKnownVideoElements().forEach(video => {
            forceApplyVolume(video, volume);
        });
    }

    function setPlaybackRateOfPreviouslySeenVideoElements(playbackRate) {
        // Update in-memory cache
        lastKnownPlaybackRate = playbackRate;
        getKnownVideoElements().forEach(video => {
            forceApplyPlaybackRate(video, playbackRate);
        });
    }

    /**
     *
     * @param {number} floatVal1
     * @param {number} floatVal2
     * @param {number} [minimumDiff]
     */
    function valuesAreDifferentEnough(floatVal1, floatVal2, minimumDiff = 0.01) {
        return Math.abs(floatVal1 > floatVal2 ? floatVal1 - floatVal2 : floatVal2 - floatVal1) >= minimumDiff;
    }

    function getKnownVideoElements() {
        // Clean up videos no longer in the DOM to prevent memory leaks
        for (const v of knownVideoElements) {
            if (!document.body.contains(v)) {
                knownVideoElements.delete(v);
            }
        }
        return knownVideoElements;
    }

    function saveVolumeLevel(volumeLevel) {
        saveUserConfig({volumeLevel});
    }

    function savePlaybackRate(playbackRate) {
        saveUserConfig({playbackRate});
    }

    /**
     * They set "display: none" to hide the native controls, so we redefine their oppressive style.
     * Some pages require a high specificity selector, so we add [controls] for no other reason
     * than to increase specificity.
     */
    function redefineWebkitMediaControlHidingCssRule() {
        const id = "native-controls-i-set-joo-free";
        const css = `video[data-${id}][controls]::-webkit-media-controls { display: flex; }`;

        // Prevent from adding css multiple times per page, while re-adding it if it disappears.
        if (!document.getElementById(id)) {
            addCss(css, id);
        }
    }

    function addCss(cssCode, id) {
        const styleElement = document.createElement("style");
        id && styleElement.setAttribute("id", id);
        styleElement.appendChild(document.createTextNode(cssCode));
        document.getElementsByTagName("head")[0].appendChild(styleElement);
    }

    /**
     * The buttons array is more likely to be present and filled. The audioButton and tagsButton
     * are more likely to break in the future.
     *
     * @returns {{audioButton: Node, buttons: Node[], tagsButton: Node}}
     */
    function findVolumeOrTagsButtons(embedRootElem, video) {
        const videoRect = video.getBoundingClientRect();

        function locatedInBottomThirdOfVideoRect(el) {
            const elRect = el.getBoundingClientRect();
            // Check if button is in bottom 1/3 of video.
            return elRect.bottom <= videoRect.bottom && elRect.top >= videoRect.bottom - (videoRect.height / 3);
        }

        function hasApproximateSizeOfSmallButton(el) {
            const elRect = el.getBoundingClientRect();
            return elRect.width >= 10 && elRect.width <= 60 && elRect.height >= 10 && elRect.height <= 60;
        }

        function matchesAriaLabel(elem, text) {
            const ariaLabel = elem.getAttribute('aria-label');
            return (ariaLabel || '').toLowerCase().includes(text);
        }

        function svgStrokePathMatches(button, svgStrokePath) {
            const path = button.querySelector('path');
            if (!path) {
                return false;
            }
            // Hopefully they don't change their icons too often, causing this to fail.
            const d = path.getAttribute('d');
            return d && d.toLowerCase().includes(svgStrokePath.toLowerCase());
        }

        function looksLikeAudioButton(button) {
            // This check only likely to work for lang=english.
            if (matchesAriaLabel(button, 'audio')) {
                return true;
            }

            // M1.5 13.3c-.8 0-1.5.7-1.5 1.5v18.4c0 .8.7 1.5 1.5 1.5h8.7l12.9 12.9c.9.9 2.5.3 2.5-1v-9.8c0-.4-.2-.8-.4-1.1l-22-22c-.3-.3-.7-.4-1.1-.4h-.6zm46.8 31.4-5.5-5.5C44.9 36.6 48 31.4 48 24c0-11.4-7.2-17.4-7.2-17.4-.6-.6-1.6-.6-2.2 0L37.2 8c-.6.6-.6 1.6 0 2.2 0 0 5.7 5 5.7 13.8 0 5.4-2.1 9.3-3.8 11.6L35.5 32c1.1-1.7 2.3-4.4 2.3-8 0-6.8-4.1-10.3-4.1-10.3-.6-.6-1.6-.6-2.2 0l-1.4 1.4c-.6.6-.6 1.6 0 2.2 0 0 2.6 2 2.6 6.7 0 1.8-.4 3.2-.9 4.3L25.5 22V1.4c0-1.3-1.6-1.9-2.5-1L13.5 10 3.3-.3c-.6-.6-1.5-.6-2.1 0L-.2 1.1c-.6.6-.6 1.5 0 2.1L4 7.6l26.8 26.8 13.9 13.9c.6.6 1.5.6 2.1 0l1.4-1.4c.7-.6.7-1.6.1-2.2z
            return svgStrokePathMatches(button, 'M1.5 13.3c-.8 0-1.5.7-1.5 1.5v18.4c0');
        }

        function looksLikeTagsButton(button) {
            // This check only likely to work for lang=english.
            const svg = button.querySelector('svg');
            if (svg && matchesAriaLabel(svg, 'tags')) {
                return true;
            }

            // We fall back to comparing part of the svg path.
            // M21.334 23H2.666a1 1 0 0 1-1-1v-1.354a6.279 6.279 0 0 1 6.272-6.272h8.124a6.279 6.279 0 0 1 6.271 6.271V22a1 1 0 0 1-1 1ZM12 13.269a6 6 0 1 1 6-6 6.007 6.007 0 0 1-6 6Z
            return svgStrokePathMatches(button, 'M21.334 23H2.666a1 1 0 0 1-1-1v-1.354a6.279 6.279');
        }

        // On stories, the audio button is in a different location, so we try to
        // reorient. Also, there's no tags button.
        let buttons;
        if (isInstagramStoriesPage()) {
            const section = embedRootElem.closest('section');
            if (section) {
                const header = section.querySelector('header');
                if (header) {
                    embedRootElem = header;
                }
            }
            buttons = util.queryAll("button:has(svg)", embedRootElem)
                .filter(hasApproximateSizeOfSmallButton);
        } else {
            buttons = util.queryAll("button:has(svg)", embedRootElem)
                .filter(locatedInBottomThirdOfVideoRect)
                .filter(hasApproximateSizeOfSmallButton);
        }

        const audioButton = buttons.filter(looksLikeAudioButton)[0];
        const tagsButton = buttons.filter(looksLikeTagsButton)[0];
        return {buttons, audioButton, tagsButton};
    }

    function modifyOverlayWithInstagramPlayControl(embedRootElem, video) {
        // Hide the clear overlay that prevents click events from reaching the actual video element + controls.
        util.queryAll(".videoSpritePlayButton", embedRootElem).map(el => el.parentNode).forEach(hide);

        // Some more clear overlays may be hidden by this.
        // getVideoCoveringButtons(embedRootElem).forEach(hide);

        function findPlayButton(embedRootElem, video) {
            // If browser lang = english, this is easy by looking for the aria-label.
            const playButton = util.query("[role=button][aria-label=Play]", embedRootElem);
            if (playButton) {
                return playButton;
            }
            // Otherwise we need to look at dimensions + attributes.
            return util.queryAll("[role=button][aria-label]", embedRootElem).filter(el => {
                const rect = el.getBoundingClientRect();
                const parentRect = el.parentElement.getBoundingClientRect();
                // todo, check if rect centered in parent?
                // Check if elem is big, but not the entire size of its parent - well say less than 80% of parent dimensions.
                if (rect.width >= 80 && rect.height >= 80 && rect.width < parentRect.width * 0.8 && rect.height < parentRect.height * 0.8) {
                    // Now check if parent covers video
                    return looksLikeCoversVideo(el.parentElement, video);
                }
            })[0];
        }

        function findControlButton(embedRootElem, video) {
            // If browser lang = english, this is easy by looking for the aria-label.
            const controlButton = util.query("[role=button][aria-label=Control]", embedRootElem);
            if (controlButton) {
                return controlButton;
            }
            // Otherwise we need to look at dimensions + attributes.
            return getVideoCoveringButtons(embedRootElem, video)[0];
        }

        // Now, the main big play button in the middle/center of the video has a parent that has the same size
        // as the video itself. We want to keep this because the instagram code has click listeners on it, and they
        // use it to toggle play pause state and that's important so that videos auto play or stay paused properly
        // when scrolling on the home page. But, the overlay covers the html5 controls, so we need to resize the
        // overlay upwards so it doesnt cover the bottom of the video where the controls are.
        // 70px should be just enough. If we do too much, like 300px, then the play button wont be vertically centered.
        // Also, we want the user to click the overlay when toggling play pause, and not the video itself, so instagram code
        // properly manages play/pause state. If we raise the overlay too much, we increase the area where they could click
        // the video.
        // TODO measure this instead of assuming 70px is correct. Maybe measure from the top of the mute or like button,
        // and use the value so long as it seems reasonable and abut where we expect it to be located?
        const heightOfHtml5Controls = '70px';
        const playButton = findPlayButton(embedRootElem, video);
        if (playButton) {
            // The default styles should be set to top: 0; bottom: 0; but they could also be top: 0px etc..
            playButton.parentElement.style.bottom = heightOfHtml5Controls;
        }

        const controlButton = findControlButton(embedRootElem, video);
        if (controlButton) {
            // On some pages (so far just on /reels/ urls) we end up adding a 70px spacing twice, which is too much.
            // So we try to avoid this specific case.
            if (!controlButton.closest('[data-instancekey]') && !controlButton.matches('[data-visualcompletion]')) {
                controlButton.style.bottom = heightOfHtml5Controls;
            }
        }

        // Nov 2022
        // Some users are getting a new version of the GUI.
        // Old/current style
        // <div>
        // 	<div>
        // 		<div>
        // 			<div>
        // 				<video/>
        // 			</div>
        // 		</div>
        // 	</div>
        // 	<div><span aria-label=Play></span></div>
        // 	<div aria-label=Control></div>
        // 	<div><button>audio</button> </div>
        // 	<div><button>tags</button> </div>
        // </div>
        //
        //
        // New style. probably started for some users mid nov 2022.
        // It also seems the new reels feature uses this new style even when the rest of the GUI/pages uses the old style.
        // <div>
        // 	<div>
        // 		<div>
        // 			<div>
        // 				<video/>
        // 				<div data-instancekey>
        // 					<div data-visualcompletion>
        //                      <!-- Note, there can be another element layer here wrapping the role=presentation. -->
        //                      <!-- Also, sometimes the role=presentation element doesn't exist, but this occurs on pages we dont want to modify anyway. -->
        // 						<div role="presentation">
        // 							<div>
        // 								<div></div>
        // 							</div>
        // 						</div>
        // 						<div>
        // 							<button>audio</button>
        // 						</div>
        // 						<div>
        // 							<button>tags</button>
        // 						</div>
        // 					</div>
        // 				</div>
        // 			</div>
        // 		</div>
        // 	</div>
        // </div>

        // I cant reproduce this yet, but a friendly user sent me his non-working html source, so we'll just try
        // make a fix based on that. This is a temporary band aid until I can reproduce it myself.

        const videoSiblings = util.getAllElementSiblings(video);
        const divInstanceKey = videoSiblings.filter(elem => {
            return elem.matches('[data-instancekey]') && elem.querySelector('div[data-instancekey] > div[data-visualcompletion] div[role=presentation]');
            // return elem.matches('[data-instancekey]') && elem.querySelector('div[data-instancekey] > div[data-visualcompletion] > div[role=presentation]');
        })[0];

        if (divInstanceKey) {
            // New GUI style.
            const divVisualCompletion = divInstanceKey.querySelector('div[data-visualcompletion]');
            if (divVisualCompletion) {
                const divPresentation = divVisualCompletion.querySelector('div[role=presentation]');
                if (divPresentation) {
                    divVisualCompletion.style.setProperty('bottom', heightOfHtml5Controls);
                    divVisualCompletion.style.setProperty('height', `calc(100% - ${heightOfHtml5Controls})`);
                    if (!isInstagramReelsPage()) {
                        divPresentation.style.setProperty('bottom', heightOfHtml5Controls);
                    } else {
                        // Avoid double spacing on the reels page.
                        //divPresentation.style.setProperty('bottom', heightOfHtml5Controls);
                    }
                }
            }

            findVolumeOrTagsButtons(divInstanceKey, video).buttons.forEach(button => {
                // We don't need to raise the button since we raised the entire container.
                button.parentElement.classList.add('ctrls4insta-fade-button');
            });


            // On reels videos, they have a transparent grey background overlay on top of the video to make their white text stand out.
            // But, we move this div upwards so the video controls are clickable, which creates an ugly band where there's no background suddenly.
            // So, we disable the IG gradient, which gets darker towards the bottom, and replace it with a gradient that
            // is not only lighter, but also that gets extra light towards the very bottom. Kinda the opposite of the IG gradient.
            // Theirs is top to bottom: light to dark, ours is dark to light.
            // It should still help the user read the white text when the background video is also white/light, while not making such an ugly
            // visual disruption when the background shading ends.
            // But, the class name is likely to change and break...
            if (isInstagramReelsPage()) {
                const className = 'xutac5l';
                embedRootElem.querySelectorAll('.' + className).forEach(el => {
                    el.style.backgroundImage = 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.2) 98%, rgba(0,0,0,0) 100%)';
                    log('qqqqqq', el);
                });
            }

        } else {
            findVolumeOrTagsButtons(embedRootElem, video).buttons.forEach(button => {
                button.parentElement.classList.add('ctrls4insta-raise-button');
                button.parentElement.classList.add('ctrls4insta-fade-button');
            });
        }



    }

    // This will return a div right below the section element. Maybe the section is more reliable?
    function getComponentRootForStoryVideo(video) {
        function hasChildrenMatchingAllSelectors(elem, cssSelectors) {
            const childNodes = Array.from(elem.childNodes);
            return cssSelectors.every(selector => childNodes.some(node => node.matches(selector)));
        }

        for (let ancestor of nParents(video, 8)) {
            if (hasChildrenMatchingAllSelectors(ancestor, ['button', 'div', 'header'])) {
                return ancestor;
            }
        }
    }

    /**
     * We use height: calc(100% - 50px) on the video, but the 100% part won't work unless all the ancestors
     * have either height: 100% or a specific defined height. In the past, this was always the case, but recently
     * they added a new element to the ancestor chain which doesn't have such a height, and so it broke our sizing.
     * So, we walk up the ancestor chain and look for the element w/ missing height, and set it. Right now, they also
     * seem to set an inline width and height on one of the elements, but that value changes when resizing the window etc..
     *
     * Most of the elements get their height from a css class, so we look at the computed styles.
     * @param {Element} video
     */
    function ensure100PercentHeight(video) {
        // Going up 6 elements is a very generous upper limit. It should probably be like 4.
        for (let ancestor of nParents(video, 6)) {
            const style = ancestor.style;
            const computedStyle = window.getComputedStyle(ancestor);
            const heightAsDeclared = getPercentageCssRuleVal(ancestor, 'height');

            if (ancestor.tagName === 'SECTION') {
                // We went too far up. Stop.
                break;
            }

            // We can stop if we find an absolute height style - probably an inline style.
            if (/\d+px/.test(heightAsDeclared)) {
                break;
            }

            // If there's no height set, we set it.
            // Note: The element w/ the missing height has position: relative, but I'm not sure we should rely on that inline style
            // since other elements seem to get the same style via css class.
            if (heightAsDeclared === 'auto') {
                style.setProperty('height', '100%');
            }
        }
    }

    /**
     * Checks if a certain css property was set via inline style or css rule/class.
     *
     * @example stylePropertyExists('height', div.style) // inline style
     * @example stylePropertyExists('height', getComputedStyle(div)) // css style
     * @param {string} stylePropertyName
     * @param {CSSStyleDeclaration} styleObj
     */
    function stylePropertyExists(stylePropertyName, styleObj) {
        stylePropertyName = stylePropertyName.toLowerCase();
        for (let i = 0; i < styleObj.length; i++) {
            const item = styleObj.item(i).toLowerCase();
            if (item === stylePropertyName) {
                return true;
            }
        }
        return false;
    }

    /**
     * Hacky trick to get the original height css rule in percentage.
     * Normally, if you set height: XX% and then try to read the height via elem.style.height or getComputedStyle(),
     * the browser will give you the height in px, not percent.
     * But setting display: none prevents px calculation, so we temporarily do that to read the original rule.
     *
     * @param {Element} elem
     * @param {string} cssProperty
     * @returns {string}
     */
    function getPercentageCssRuleVal(elem, cssProperty) {
        // Null-safety: check parentElement exists
        if (!elem || !elem.parentElement) {
            return 'auto';
        }
        const parentStyle = elem.parentElement.style;
        const prevDisplay = parentStyle.display;
        parentStyle.display = 'none';
        const cssRuleValue = getComputedStyle(elem)[cssProperty];
        parentStyle.display = prevDisplay;
        return cssRuleValue;
    }

    /**
     * On some stories videos, they overlay the video with a "send message" or "reply to <username>" textarea, but it lays on top of the video
     * player controls, making them difficult to use. So, we will identify these videos, and when found, we will reduce
     * the height of the video, so it moves upwards in its parent box, allowing the controls to be accessed. The
     * send message doesnt move - it stays fixed to the bottom of the parent.
     */
    function modifyVideoHeightIfSendMessageBoxOrLikeButtonIsBlockingVideoControls(video) {
        // We need to take a few steps back up the tree before we will reach a position that can search for the textarea or like button.
        // note, sometimes componentRoot is null on some stories. rare. noticed Dec 2nd. this might happen if video removed from
        // dom before this func is called via setTimeout
        const componentRoot = getComponentRootForStoryVideo(video);
        const textarea = componentRoot.querySelector("textarea[placeholder]");
        function findLikeButton(componentRoot, video) {
            // The aria-label=Like value varies based on the browser language, so it's unreliable to look for the english word "Like".
            // So, we have a backup strategy if it fails, but it's not as robust.
            let likeButtonSvg = componentRoot.querySelector("[aria-label=Like]");
            if (likeButtonSvg) {
                return likeButtonSvg.closest('button');
            }

            // Otherwise we need to do some dom traversal and inspection to find it.

            // Find svg elems, but we dont want those that are descendant of a header.
            // They should however, be descendant of a button.
            return util.queryAll("button > * svg", componentRoot)
                .filter(el => !el.closest('header') && el.closest('button'))
                .map(el => el.closest('button'))[0];
        }

        const likeButton = findLikeButton(componentRoot, video);
        if (!textarea && !likeButton) {
            // log('no textarea or like button. no need to adjust height.');
            return;
        }

        // Find the height of the textarea or of a like button.
        const heightOfRow = (textarea || likeButton).getBoundingClientRect().height;
        const videoRect = video.getBoundingClientRect();
        // Now go upwards and find an element that is both nearly as wide as the video, but also
        // less than 2x the height of the row. That will be the container. We want the tallest one
        // that doesnt exceed 2x row height.
        let sendMessageContainer;
        for (let potentialSendMessageContainer of nParents(textarea || likeButton, 8)) {
            const potentialContainerRect = potentialSendMessageContainer.getBoundingClientRect();
            // We want a width within 25% of the video width.
            if (videoRect.width - potentialContainerRect.width < videoRect.width * 0.25) {
                // The height is usually just a smidge taller than the textarea or buttons, but too much taller.
                // There's a further ancestor thats about 3x the height, which container emoticons, and we do not want to
                // match that taller container, so we set a limit of 2x height.
                if (potentialContainerRect.height <= heightOfRow * 2) {
                    sendMessageContainer = potentialSendMessageContainer;
                } else {
                    // Once we encounter an elem thats too tall, we can stop looking for better matches.
                    break;
                }
            }
        }

        if (!sendMessageContainer) {
            log('no sendMessageContainer');
            return;
        }

        // This contains the video, the Send Message stuff, and many other buttons.
        const videoAndControlsContainer = componentRoot;

        // Sometimes the video parent is taller than its parent element. The overflow is hidden, which is a problem for us because
        // the controls on the bottom of the video might not be visible. Even if they are, this overflow makes it difficult for us to
        // calculate how much to shrink the video height, so we will change the size of the parent to match. I don't know why
        // instagram does this, but maybe they don't want to change the aspect ratio too much or something.
        // Null-safety: check parent elements exist
        if (!video.parentElement || !video.parentElement.parentElement) {
            log('video parent elements missing, skipping height adjustment');
            return;
        }
        const videoParentHeight = video.parentElement.getBoundingClientRect().height;
        const videoParentParentHeight = video.parentElement.parentElement.getBoundingClientRect().height;
        if (videoParentHeight > videoParentParentHeight) {
            log(`video parent height adjusted to ${videoParentParentHeight}px`);
            video.parentElement.style.height = videoParentParentHeight + 'px';
        }

        // We measure the height of the textarea ancestor element, because it's a bit larger and contains other elements, such as the submit button.
        const distanceFromTopOfSendMessageToBottomOfParentContainer = videoAndControlsContainer.getBoundingClientRect().bottom - sendMessageContainer.getBoundingClientRect().top;
        // If there's a textarea, we move a tiny bit more to make a nice looking gap. Not sure how reliable this nudge is, but whatever.
        // If there's no textarea, which implies there's only a like button, we don't move any less.
        const videoHeightAdjustment = distanceFromTopOfSendMessageToBottomOfParentContainer + (textarea ? 16 : 0);

        // Now, we change the height of the video, reducing it by the height of the problematic textarea box assembly.
        // The video should move upwards, leaving a black gap below it.
        ensure100PercentHeight(video);
        video.style.height = `calc(100% - ${videoHeightAdjustment}px)`;
        log(`video height adjusted to ${videoHeightAdjustment}px`);
    }

    function looksLikeCoversVideo(el, video) {
        const videoRect = video.getBoundingClientRect();
        function dimensionWithinXPercentOrAbsoluteValueOfEachOther(dimensionA, dimensionB, allowedRatio, absolutePixels) {
            return dimensionA && dimensionB && (
                Math.abs(dimensionA / dimensionB) <= allowedRatio
             || Math.abs(dimensionA - dimensionB) <= absolutePixels
            );
        }
        const rect = el.getBoundingClientRect();
        if (!dimensionWithinXPercentOrAbsoluteValueOfEachOther(videoRect.width, rect.width, 1.1, 100)) {
            return false;
        }
        if (!dimensionWithinXPercentOrAbsoluteValueOfEachOther(videoRect.height, rect.height, 1.2, 100)) {
            return false;
        }
        return true;
    }

    function getVideoCoveringButtons(searchRoot, video) {
        return util.queryAll("[role=button],[role=presentation]", searchRoot).filter(el => looksLikeCoversVideo(el, video));
    }

    /**
     * If you look in the dom, and traverse upwards from the video element, you'll soon find
     * a node which is the ancestor to both the video, and a div with role=button, and that div is big, covering the entire video.
     *
     * This func searches for that parent element. We use these as a sort of container element for the video and its
     * other controller pieces.
     *
     * @param {Element} video
     * @return {Element}
     */
    function getEstimatedVideoComponentRootElement(video) {
        for (const parent of nParents(video, 4)) {
            if (getVideoCoveringButtons(parent, video).length) {
                return parent;
            }
        }
        log("couldnt find parent", video);
    }

    /**
     * Returns N number of parents, ordered with the closest elements first.
     *
     * @param {Element} elem
     * @param {number} numParents
     * @return Element[]
     */
    function nParents(elem, numParents) {
        const parents = [];
        while (elem && --numParents >= 0) {
            elem = elem.parentElement;
            elem && parents.push(elem);
        }
        return parents;
    }

    function nthParent(elem, n) {
        while (elem && --n >= 0) {
            elem = elem.parentElement;
        }
        return elem;
    }

    function attachPageVisibilityListener() {
        // Not sure we need this anymore. Leaving for now until I'm sure mut observer
        // will queue up changes that happened when the tab is hidden/backgrounded.
        document.addEventListener('visibilitychange', util.recordEx('v.svmp', startVideoModificationPhase));
    }

    function startVideoModificationPhase() {
        ensureMutationObserverEnabled();
        // The first time this func is called, we scan the dom and try to find all video elements.
        // But we also setup a mutation observer which looks for new video elements, and the observer should
        // eliminate the need for polling.
        // But, somehow some video elements arent detected by the mutation observer, and so we cant rely on the observer to find
        // all new videos. Instead we must poll until I figure out why.
        util.recordEx('mv', modifyAllPresentVideos)();
    }

    function ensureMutationObserverEnabled() {
        // Prevent multiple observers.
        if (ensureMutationObserverEnabled.enabled) {
            return;
        } else {
            ensureMutationObserverEnabled.enabled = true;
        }
        log(`ensureMutationObserverEnabled`);

        function callback(mutations) {
            const videos = [];
            mutations.forEach(mutation => {
                //console.log(`added = ${mutation.addedNodes.length} rem = ${mutation.removedNodes.length}`, mutation);
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'VIDEO') {
                        log('found vid mut', node);
                        videos.push(node);
                    }

                    // Some nodes don't have this method. Probably stuff like text nodes etc...
                    if (node.querySelectorAll) {
                        // Oddly, we never find videos directly. They're always found as an ancestor for some reason.
                        const vids = node.querySelectorAll('video');
                        if (vids.length) {
                            log('found vids recurse', vids);
                            videos.push(...vids);
                        }
                    }
                });
            });

            if (videos.length) {
                log(`videos.length = ${videos.length}`, videos);
                log('found new vids at', new Date().toISOString());
                videos.forEach(modifyVideo);
            }
        }

        const observer = new MutationObserver(util.recordEx('mo', callback));
        observer.observe(document.body, {subtree: true, childList: true});
    }

    function isInstagramStoriesPage() {
        return window.location.pathname.toLowerCase().startsWith('/stories/');
    }

    function isInstagramReelsPage() {
        return window.location.pathname.toLowerCase().startsWith('/reels/');
    }

    function fixStringConfigKeys(config) {
        // Some users have strings saved in storage, so we need to cast to number.
        ['volumeLevel', 'playbackRate'].forEach(key => {
            if (typeof config[key] === 'string') {
                config[key] = Number(config[key]);
            }
        });
        return config;
    }

    function getSavedConfig() {
        return new Promise((resolve, reject) => {
            const defaults = {
                rememberVolumeLevel: true,
                rememberPlaybackRate: true,
                debugMode: false,
                volumeLevel: 1,
                playbackRate: 1,
                volumeAdjustmentStepSize: 0.1,
                playbackRateAdjustmentStepSize: 0.125,
            };
            chrome.storage.local.get(defaults, resolve);
        }).then(fixStringConfigKeys);
    }

    function saveUserConfig(config) {
        chrome.storage.local.set(config, () => {});
    }

    // Dynamic log function that respects debugMode from config
    function log(...args) {
        if (config.debugMode || showLog) {
            console.log('[InstagramControls]', ...args);
        }
    }

    function setupStorageChangeListener(that) {
        // Chrome hotkeys / commands don't give us an easy way to determine which tab they occurred in, if any.
        // But we only want to update video speed or volume of videos running in the same tab as the hotkey,
        // so we need to determine the tab, because the hotkey handler will update chrome.storage, which will then
        // trigger the storage change listener in each tab.
        // We expect when the user presses the hotkey in this tab that the document.keyup event will fire in this tab,
        // and then a short moment later the chrome.storage event will fire (as a result of chrome hotkey handler
        // being triggered and executing our service worker / background script, which updates the storage).
        // But, sometimes the document.keyup handler actually fires AFTER the storage event, making our job of
        // identifying the event origin tab tougher.
        // What we do is have each tab locally record a timestamp for all keyup events, so a few millis later
        // when the storage change listener fires, we can look at the timestamp, and if it was recent enough, we
        // can assume the hotkey was fired in our tab. But, since the storage event sometimes happens before the keyup event,
        // we need to be more tricky. What we do is when the storage event fires, we queue up a worker to check in a few more millis to see
        // if the keyup event fired. I hate relying on timing like this. It might be buggy for a heavily loaded system
        // when 25ms isnt enough time for both events to happen. Oh well.
        // Note we must use keyup not keydown - keydown won't fire when a chrome defined hotkey combo is pressed.
        const maxMillisToAssumeHotkeyOccurredInThisTab = 500;
        let lastKeyup;
        document.body.addEventListener('keyup', evt => {
            lastKeyup = new Date().getTime();
            log('keyup', dtFmt());
        });

        function dtFmt(d) {
            d = (d || new Date());
            return `${d.getMinutes()}-${d.getSeconds()}.${d.getMilliseconds()}`;
        }

        /**
         * A small utility to do something generic in an async loop.
         *
         * Calls the callbackFn every intervalMillis until maxMillis time has elapsed.
         * The callback is also passed an object with a method named "stop", which if called,
         * will prevent your callback from being called additional times, even if the maxMillis
         * elapsed time hasn't yet been exceeded.
         *
         * @param {function} callbackFn
         * @param {number} intervalMillis
         * @param {number} maxMillis
         */
        function loopAsync(callbackFn, intervalMillis, maxMillis) {
            const intervalStart = new Date().getTime();
            const intervalId = setInterval(() => {
                if (new Date().getTime() - intervalStart > maxMillis) {
                    clearInterval(intervalId);
                    //log(`loopAsync expired naturally ${new Date().getTime() - intervalStart} ${new Date().getTime()} - ${intervalStart} > ${maxMillis}`);
                }
                const remoteControl = {
                    stop: () => {
                        clearInterval(intervalId);
                        log(`loopAsync stopped`);
                    },
                    intervalStart,
                    intervalMillis,
                    maxMillis
                };
                callbackFn(remoteControl);
            }, intervalMillis);
        }

        chrome.storage.onChanged.addListener(configChange => {
            log('storage.onChanged', dtFmt(), configChange);
            const shouldUpdateVolume = 'volumeLevel' in configChange;
            const shouldUpdatePlaybackRate = 'playbackRate' in configChange;
            const previousConfig = {...config}; // shallow copy so we can compare after reload
            getSavedConfig().then(newConfig => {
                config = newConfig;
                
                // Update in-memory cache from storage
                if (shouldUpdateVolume && config.volumeLevel !== undefined) {
                    lastKnownVolume = config.volumeLevel;
                    log(`Updated lastKnownVolume from storage change: ${lastKnownVolume}`);
                }
                if (shouldUpdatePlaybackRate && config.playbackRate !== undefined) {
                    lastKnownPlaybackRate = config.playbackRate;
                    log(`Updated lastKnownPlaybackRate from storage change: ${lastKnownPlaybackRate}`);
                }

                // Helper: propagate changes to all known videos
                function applyChanges() {
                    if (shouldUpdateVolume && valuesAreDifferentEnough(previousConfig.volumeLevel, config.volumeLevel)) {
                        log('update volume in this tab');
                        setVolumeOfPreviouslySeenVideoElements(config.volumeLevel);
                        // Show OSD for hotkey-triggered volume changes
                        showOSD(`🔊 Volume: ${Math.round(config.volumeLevel * 100)}%`);
                    }
                    if (shouldUpdatePlaybackRate && valuesAreDifferentEnough(previousConfig.playbackRate, config.playbackRate)) {
                        log('update playbackRate in this tab');
                        setPlaybackRateOfPreviouslySeenVideoElements(config.playbackRate);
                        // Show OSD for hotkey-triggered speed changes
                        showOSD(`⏩ Speed: ${config.playbackRate.toFixed(2)}x`);
                    }
                }

                // If a hotkey triggered the change, wait briefly for the keyup event to confirm it's this tab.
                // Otherwise, just apply the change immediately (e.g., user changed volume via native controls).
                if (lastKeyup && now() - lastKeyup < maxMillisToAssumeHotkeyOccurredInThisTab) {
                    // Hotkey likely in this tab – apply now.
                    applyChanges();
                } else {
                    // No recent keyup: could be slider change in this tab, another tab, or options page.
                    // Apply after a short delay to let any concurrent keyup arrive, then apply.
                    loopAsync((remoteControl) => {
                        if (lastKeyup && now() - lastKeyup < maxMillisToAssumeHotkeyOccurredInThisTab) {
                            remoteControl.stop();
                            applyChanges();
                        }
                    }, 25, 500);
                    // Fallback: if no keyup arrives in 500ms, still apply changes so cross-tab sync works.
                    setTimeout(applyChanges, 550);
                }
            });
        });
    }

    this.init = util.recordEx('init', function init() {
        // We must load the config before we initialize the extension.
        getSavedConfig().then(newConfig => {
            config = newConfig;
            
            // Initialize in-memory volume/rate cache from storage
            // This ensures volume persists even across page reloads
            if (config.volumeLevel !== undefined && !isNaN(config.volumeLevel)) {
                lastKnownVolume = config.volumeLevel;
                log(`Initialized lastKnownVolume from storage: ${lastKnownVolume}`);
            }
            if (config.playbackRate !== undefined && !isNaN(config.playbackRate)) {
                lastKnownPlaybackRate = config.playbackRate;
                log(`Initialized lastKnownPlaybackRate from storage: ${lastKnownPlaybackRate}`);
            }
            
            attachPageVisibilityListener();
            startVideoModificationPhase();
            // Reduced from 200ms to 1000ms - MutationObserver handles most cases, this is just a fallback
            setInterval(startVideoModificationPhase, 1000);
            redefineWebkitMediaControlHidingCssRule();
            setupStorageChangeListener(this);
            
            // Set up PiP media session for reel navigation
            setupPiPMediaSession();
            
            // Set up global PiP listener to keep videos playing when tab is hidden
            setupGlobalPiPListener();
            
            // Set up keyboard shortcuts for PiP control
            setupPiPKeyboardShortcuts();
            
            // Set up Document PiP shortcut (P key)
            setupDocumentPiPShortcut();
            
            // Set up message listener for hotkey commands from background script
            setupMessageListener();
            
            util.recordUsageStats('initOk');
            initialized = true;
        });

    });
    
    // Expose navigateReel for external access (PiP, testing)
    this.navigateReel = navigateReel;
    this.nextReel = () => navigateReel('next');
    this.prevReel = () => navigateReel('previous');
    this.openPiP = openDocumentPiP; // Enhanced PiP with on-screen controls

}
