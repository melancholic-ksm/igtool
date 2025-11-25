const configDefaults = {
    rememberVolumeLevel: true,
    rememberPlaybackRate: true,
    volumeLevel: 1,
    playbackRate: 1,
    volumeAdjustmentStepSize: 0.1,
    playbackRateAdjustmentStepSize: 0.125,
    debugMode: false,
};

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

// Saves options to chrome.storage
function saveUserConfig() {
    chrome.storage.local.set({
        "rememberVolumeLevel":              byId("rememberVolumeLevel").checked,
        "rememberPlaybackRate":             byId("rememberPlaybackRate").checked,
        "debugMode":                        byId("debugMode").checked,
        "playbackRate":                     getNumberBetweenOrElse(byId("playbackRate").value, 1/256, 32, configDefaults.playbackRate),
        "volumeLevel":                      getNumberBetweenOrElse(byId("volumeLevel").value, 0, 1, configDefaults.volumeLevel),
        "volumeAdjustmentStepSize":         getNumberBetweenOrElse(byId("volumeAdjustmentStepSize").value, 0.01, 1, configDefaults.volumeAdjustmentStepSize),
        "playbackRateAdjustmentStepSize":   getNumberBetweenOrElse(byId("playbackRateAdjustmentStepSize").value, 0.001, 8, configDefaults.playbackRateAdjustmentStepSize),
    }, () => {
        // Update status to let user know options were saved.
        const status = byId('status');
        status.classList.remove("hidden");
        status.classList.add("visible");
        status.textContent = "Config Saved.";
        setTimeout(() => {
            status.classList.remove("visible");
            status.classList.add("hidden");
        }, 200);
    });
}

function getSavedConfig() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(configDefaults, resolve);
    });
}

function restoreUserConfig() {
    getSavedConfig().then(vals => {
        console.log('SavedConfig', vals);
        byId("rememberVolumeLevel").checked =           typeof vals["rememberVolumeLevel"] === 'boolean' ? vals["rememberVolumeLevel"] : configDefaults.rememberVolumeLevel;
        byId("rememberPlaybackRate").checked =          typeof vals["rememberPlaybackRate"] === 'boolean' ? vals["rememberPlaybackRate"] : configDefaults.rememberPlaybackRate;
        byId("debugMode").checked =                     typeof vals["debugMode"] === 'boolean' ? vals["debugMode"] : configDefaults.debugMode;
        byId("playbackRate").value =                    getNumberBetweenOrElse(vals["playbackRate"], 0.001, 64, configDefaults.playbackRate);
        byId("volumeLevel").value =                     getNumberBetweenOrElse(vals["volumeLevel"], 0, 1, configDefaults.volumeLevel);
        byId("volumeAdjustmentStepSize").value =        getNumberBetweenOrElse(vals["volumeAdjustmentStepSize"], 0.1, 1, configDefaults.volumeAdjustmentStepSize);
        byId("playbackRateAdjustmentStepSize").value =  getNumberBetweenOrElse(vals["playbackRateAdjustmentStepSize"], 0.001, 8, configDefaults.playbackRateAdjustmentStepSize);
    });
}

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

function byId(domId) {
    return document.getElementById(domId);
}

document.addEventListener('DOMContentLoaded', restoreUserConfig);

// Use input event on all elements to trigger a save.
// But, we debounce it, and only do the save if there's been no activity for a bit.
// This way we don't spam save as they type.
const markFormUpdated = debounce(saveUserConfig, 1000);

/**
 * @param {string} selector
 * @param {Node?} contextNode
 * @return {Node[]}
 */
function queryAll(selector, contextNode) {
    return Array.from((contextNode || document).querySelectorAll(selector));
}

queryAll("input[type=number]").forEach(input => {
    input.addEventListener("input", markFormUpdated, false);
});
queryAll("input[type=checkbox]").forEach(input => {
    input.addEventListener("change", markFormUpdated, false);
});
// Allow links to local resources, like chrome://extensions/shortcuts
queryAll("a[href][specialProto]").forEach(link => {
    link.addEventListener("click", evt => {
        evt.preventDefault();
        chrome.tabs.create({url: link.getAttribute('href'), active: true});
    });
});