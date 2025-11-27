/**
 * Controls for Instagram Videos - Options Page Script
 * Enhanced version with export/import, presets, and better UX
 */

const configDefaults = {
    rememberVolumeLevel: true,
    rememberPlaybackRate: true,
    volumeLevel: 1,
    playbackRate: 1,
    volumeAdjustmentStepSize: 0.1,
    playbackRateAdjustmentStepSize: 0.125,
    debugMode: false,
};

/**
 * Validates and returns a number within specified bounds
 * @param {*} sourceVal - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default value if validation fails
 * @returns {number}
 */
function getNumberBetweenOrElse(sourceVal, min, max, defaultValue) {
    if (sourceVal === null || sourceVal === undefined || isNaN(sourceVal) || sourceVal === "") {
        return defaultValue;
    }
    const numVal = Number(sourceVal);
    if (isNaN(numVal) || numVal < min || numVal > max) {
        return defaultValue;
    }
    return numVal;
}

/**
 * Shows a notification toast with custom message and type
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 */
function showNotification(message, type = 'success') {
    const status = byId('status');
    const colors = {
        success: 'linear-gradient(135deg, #4caf50, #45a049)',
        error: 'linear-gradient(135deg, #f44336, #d32f2f)',
        warning: 'linear-gradient(135deg, #ff9800, #f57c00)',
        info: 'linear-gradient(135deg, #2196f3, #1976d2)'
    };
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    status.style.background = colors[type] || colors.success;
    status.innerHTML = `<span>${icons[type] || icons.success}</span> ${message}`;
    status.classList.remove("hidden");
    status.classList.add("visible");
    
    setTimeout(() => {
        status.classList.remove("visible");
        status.classList.add("hidden");
    }, 2000);
}

/**
 * Saves current configuration to chrome.storage
 */
function saveUserConfig() {
    const config = {
        "rememberVolumeLevel": byId("rememberVolumeLevel").checked,
        "rememberPlaybackRate": byId("rememberPlaybackRate").checked,
        "debugMode": byId("debugMode").checked,
        "playbackRate": getNumberBetweenOrElse(byId("playbackRate").value, 1/256, 32, configDefaults.playbackRate),
        "volumeLevel": getNumberBetweenOrElse(byId("volumeLevel").value, 0, 1, configDefaults.volumeLevel),
        "volumeAdjustmentStepSize": getNumberBetweenOrElse(byId("volumeAdjustmentStepSize").value, 0.01, 1, configDefaults.volumeAdjustmentStepSize),
        "playbackRateAdjustmentStepSize": getNumberBetweenOrElse(byId("playbackRateAdjustmentStepSize").value, 0.001, 8, configDefaults.playbackRateAdjustmentStepSize),
    };
    
    chrome.storage.local.set(config, () => {
        showNotification('Settings Saved', 'success');
        console.log('Config saved:', config);
    });
}

/**
 * Gets saved configuration from chrome.storage
 * @returns {Promise<Object>}
 */
function getSavedConfig() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(configDefaults, resolve);
    });
}

/**
 * Restores user configuration from storage to UI
 */
function restoreUserConfig() {
    getSavedConfig().then(vals => {
        console.log('Restored config:', vals);
        
        // Checkboxes
        byId("rememberVolumeLevel").checked = typeof vals["rememberVolumeLevel"] === 'boolean' ? vals["rememberVolumeLevel"] : configDefaults.rememberVolumeLevel;
        byId("rememberPlaybackRate").checked = typeof vals["rememberPlaybackRate"] === 'boolean' ? vals["rememberPlaybackRate"] : configDefaults.rememberPlaybackRate;
        byId("debugMode").checked = typeof vals["debugMode"] === 'boolean' ? vals["debugMode"] : configDefaults.debugMode;
        
        // Number inputs
        const volumeLevel = getNumberBetweenOrElse(vals["volumeLevel"], 0, 1, configDefaults.volumeLevel);
        byId("volumeLevel").value = volumeLevel;
        byId("playbackRate").value = getNumberBetweenOrElse(vals["playbackRate"], 0.001, 64, configDefaults.playbackRate);
        byId("volumeAdjustmentStepSize").value = getNumberBetweenOrElse(vals["volumeAdjustmentStepSize"], 0.01, 1, configDefaults.volumeAdjustmentStepSize);
        byId("playbackRateAdjustmentStepSize").value = getNumberBetweenOrElse(vals["playbackRateAdjustmentStepSize"], 0.001, 8, configDefaults.playbackRateAdjustmentStepSize);
        
        // Update range slider and display
        updateVolumeSlider(volumeLevel);
    });
}

/**
 * Updates the volume range slider and display
 * @param {number} value - Volume value (0-1)
 */
function updateVolumeSlider(value) {
    const range = byId("volumeLevelRange");
    const display = byId("volumeLevelDisplay");
    if (range) range.value = value;
    if (display) display.textContent = Math.round(value * 100) + '%';
}

/**
 * Resets all settings to defaults
 */
function resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        chrome.storage.local.set(configDefaults, () => {
            restoreUserConfig();
            showNotification('Settings reset to defaults', 'warning');
        });
    }
}

/**
 * Exports current settings as JSON file
 */
function exportSettings() {
    getSavedConfig().then(config => {
        const dataStr = JSON.stringify(config, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportName = `instagram-controls-settings-${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
        
        showNotification('Settings exported', 'success');
    });
}

/**
 * Imports settings from JSON file
 * @param {Event} event - File input change event
 */
function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            
            // Validate imported config
            const validConfig = {};
            Object.keys(configDefaults).forEach(key => {
                if (config.hasOwnProperty(key)) {
                    validConfig[key] = config[key];
                } else {
                    validConfig[key] = configDefaults[key];
                }
            });
            
            chrome.storage.local.set(validConfig, () => {
                restoreUserConfig();
                showNotification('Settings imported successfully', 'success');
            });
        } catch (error) {
            showNotification('Invalid settings file', 'error');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

/**
 * Views current storage data in console
 */
function viewStorageData() {
    chrome.storage.local.get(null, (data) => {
        console.log('=== Instagram Controls Storage Data ===');
        console.log(JSON.stringify(data, null, 2));
        showNotification('Storage data logged to console', 'info');
    });
}

/**
 * Clears cache and temporary data
 */
function clearCache() {
    if (confirm('This will clear any cached data. Settings will be preserved. Continue?')) {
        chrome.storage.local.get(configDefaults, (settings) => {
            chrome.storage.local.clear(() => {
                chrome.storage.local.set(settings, () => {
                    showNotification('Cache cleared', 'success');
                });
            });
        });
    }
}

/**
 * Resets all data including settings
 */
function resetAllData() {
    if (confirm('⚠️ WARNING: This will delete ALL extension data including your settings. This cannot be undone. Are you sure?')) {
        chrome.storage.local.clear(() => {
            chrome.storage.local.set(configDefaults, () => {
                restoreUserConfig();
                showNotification('All data has been reset', 'warning');
            });
        });
    }
}

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} delayUntilCall - Delay in milliseconds
 * @returns {Function}
 */
function debounce(func, delayUntilCall) {
    let timerId;
    return function() {
        const that = this;
        const args = arguments;
        timerId && clearTimeout(timerId);
        timerId = setTimeout(function debounceWrapper() {
            timerId = undefined;
            func.apply(that, args);
        }, delayUntilCall);
    };
}

/**
 * Gets element by ID
 * @param {string} domId - Element ID
 * @returns {HTMLElement}
 */
function byId(domId) {
    return document.getElementById(domId);
}

/**
 * Query selector helper that returns array
 * @param {string} selector - CSS selector
 * @param {Node} contextNode - Optional context node
 * @returns {Node[]}
 */
function queryAll(selector, contextNode) {
    return Array.from((contextNode || document).querySelectorAll(selector));
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Restore saved configuration
    restoreUserConfig();
    
    // Set up debounced auto-save
    const markFormUpdated = debounce(saveUserConfig, 1000);
    
    // Number inputs - auto save on change
    queryAll("input[type=number]").forEach(input => {
        input.addEventListener("input", markFormUpdated, false);
    });
    
    // Checkbox inputs - auto save on change
    queryAll("input[type=checkbox]").forEach(input => {
        input.addEventListener("change", markFormUpdated, false);
    });
    
    // Volume range slider
    const volumeRange = byId("volumeLevelRange");
    const volumeInput = byId("volumeLevel");
    const volumeDisplay = byId("volumeLevelDisplay");
    
    if (volumeRange) {
        volumeRange.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            volumeInput.value = value;
            volumeDisplay.textContent = Math.round(value * 100) + '%';
            markFormUpdated();
        });
    }
    
    if (volumeInput) {
        volumeInput.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value) || 0;
            updateVolumeSlider(value);
        });
    }
    
    // Quick action buttons
    byId("saveBtn")?.addEventListener("click", saveUserConfig);
    byId("resetBtn")?.addEventListener("click", resetToDefaults);
    byId("exportBtn")?.addEventListener("click", exportSettings);
    byId("importBtn")?.addEventListener("click", () => byId("importInput")?.click());
    byId("importInput")?.addEventListener("change", importSettings);
    
    // Advanced action buttons
    byId("viewStorageBtn")?.addEventListener("click", viewStorageData);
    byId("clearCacheBtn")?.addEventListener("click", clearCache);
    byId("resetAllBtn")?.addEventListener("click", resetAllData);
    
    // Volume presets
    queryAll("[data-volume]").forEach(btn => {
        btn.addEventListener("click", () => {
            const volume = parseFloat(btn.dataset.volume);
            byId("volumeLevel").value = volume;
            updateVolumeSlider(volume);
            saveUserConfig();
        });
    });
    
    // Speed presets
    queryAll("[data-speed]").forEach(btn => {
        btn.addEventListener("click", () => {
            const speed = parseFloat(btn.dataset.speed);
            byId("playbackRate").value = speed;
            saveUserConfig();
        });
    });
    
    // Chrome protocol links (like chrome://extensions/shortcuts)
    queryAll("a[href][specialProto]").forEach(link => {
        link.addEventListener("click", evt => {
            evt.preventDefault();
            chrome.tabs.create({url: link.getAttribute('href'), active: true});
        });
    });
    
    console.log('Instagram Controls options page initialized');
});
