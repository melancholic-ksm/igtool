const showLog = false;
let os = '';
function log() {
    showLog && console.log.apply(console, arguments);
}

// note this gets called on extension install + update, but also on chrome update.
function recordInstall(currentAppVersion, currentTime) {

    // They may have existing values. So, we request them.
    chrome.storage.local.get({
        "appVersionHistory": [],
        "initialAppInstallTime": currentTime
    }, savedVals => {

        // Add the current version to the user's history, if not already there.
        const versions = savedVals.appVersionHistory;
        if (!versions.includes(currentAppVersion)) {
            versions.push(currentAppVersion);
        }

        // Now we write the values back, likely setting them for the first time.
        chrome.storage.local.set({
            "appVersionHistory": versions,
            "initialAppInstallTime": savedVals.initialAppInstallTime,
            "mostRecentUpdateTime": currentTime,
        }, updateUninstallUrl);

    });
}

// max url length is 255 chars, and we actually hit this limit sometimes.
// So, we'll try to build the longest url we can, giving preference for args at the front of the array.
function buildUrlRespectingMaxLength(queryArgs) {
    let url = 'http://rehfeld.us/browser-extensions/uninstall-survey.php?';

    let argSep = '';
    for (const arg of queryArgs) {
        if (url.length + argSep.length + arg.length < 255) {
            url += argSep + arg;
            // Trick to prevent adding & on first loop iteration.
            argSep = '&';
        }
    }

    return url;
}

function updateUninstallUrl() {
    chrome.runtime.getPlatformInfo(({os}) => {
        chrome.storage.local.get(null, syncVals => {
            chrome.storage.local.get({usageStats: {}}, localVals => {
                const manifest = chrome.runtime.getManifest();

                // Add the current version to the user's history, if not already there.
                const versions = (syncVals.appVersionHistory || []);
                if (!versions.includes(manifest.version)) {
                    versions.push(manifest.version);
                }
                const sortedVersions = versions.sort();

                // To save space, we only send min and max versions.
                let versionRange = sortedVersions[0];
                if (sortedVersions.length > 1) {
                    versionRange +=  "," + sortedVersions[sortedVersions.length - 1];
                }

                // chrome imposes a 255 char url limit, so we need to use compact query var names.
                const queryArgs2 = {
                    app: "ic",
                    it: syncVals.initialAppInstallTime,
                    ut: syncVals.mostRecentUpdateTime,
                    vh: versionRange,
                    err: countErrors(localVals.usageStats || {}),
                    os: os,
                };

                // We could easily fill the url up w/ function names if we have lots of errors. Solution - write good code and don't get errors!
                const errorQueryArgs = {};

                const map = Object.assign({}, queryArgs2, errorQueryArgs, localVals.usageStats);
                const urlKeyValPairs = Object.keys(map).map(key => {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(map[key]);
                });

                chrome.runtime.setUninstallURL(buildUrlRespectingMaxLength(urlKeyValPairs));
            });
        });
    });
}

function countErrors(errorInfo) {
    let cnt = 0;
    Object.keys(errorInfo).filter(key => key.includes('err')).forEach(errorKey => {
        cnt += errorInfo[errorKey];
    });
    return cnt;
}

chrome.runtime.onInstalled.addListener(details => {
    log("onInstall", details);
    const manifest = chrome.runtime.getManifest();
    recordInstall(manifest.version, unixTimestamp());
});

// Anytime storage changes, such as due to usage stats or a settings change, we update the uninstallation url.
// This is because this url must be set preemptively, and we use the url to collect usage stats.
chrome.storage.onChanged.addListener(updateUninstallUrl);

function unixTimestamp() {
    return Math.floor(Date.now() / 1000);
}

chrome.commands.onCommand.addListener((command) => {
    log(`Command "${command}" triggered`);

    const clamp = (num, min, max) => Math.max(Math.min(num, max), min);
    const clampVolume = num => clamp(num, 0, 1);
    const clampPlaybackRate = num => clamp(num, 0.0625 / 8, 128);

    // We want the playback rate to be in multiples of 12.5%. The chrome html5 GUI shows buttons for
    // each 25% step, and if the speed matches one of the options, the GUI will show a checkmark for that speed.
    // So its desirable to use 25% speed steps. But we want more precision, and so will use 12.5% and just deal with
    // only seeing a checked option for some of the speeds. But we will also make the step snap to the nearest
    // multiple of 12.5% in case the user somehow ended up with a weird multiple like 113%, possibly from another
    // extension, which would cause them to never see their speed check marked.
    function snapToStepSize(num, stepSize = 0.125) {
        return stepSize * Math.round(num / stepSize);
    }

    // Handle reel navigation commands - send message to content script
    if (command === 'next-reel' || command === 'previous-reel') {
        console.log(`[InstagramControls] Background: Handling ${command} command`);
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                console.log(`[InstagramControls] Background: Sending message to tab ${tabs[0].id}`);
                chrome.tabs.sendMessage(tabs[0].id, {action: command});
            } else {
                console.log('[InstagramControls] Background: No active tab found');
            }
        });
        return;
    }

    const defaults = {
        volumeLevel: 1,
        playbackRate: 1,
        volumeAdjustmentStepSize: 0.1,
        playbackRateAdjustmentStepSize: 0.125,
    };
    chrome.storage.local.get(defaults, function(vals) {
        switch (command) {
            case 'volume-increase':
                chrome.storage.local.set({volumeLevel: clampVolume(vals.volumeLevel + vals.volumeAdjustmentStepSize)});
                break;
            case 'volume-decrease':
                chrome.storage.local.set({volumeLevel: clampVolume(vals.volumeLevel - vals.volumeAdjustmentStepSize)});
                break;
            case 'playback-speed-increase':
                chrome.storage.local.set({playbackRate: snapToStepSize(clampPlaybackRate(vals.playbackRate + vals.playbackRateAdjustmentStepSize))});
                break;
            case 'playback-speed-decrease':
                chrome.storage.local.set({playbackRate: snapToStepSize(clampPlaybackRate(vals.playbackRate - vals.playbackRateAdjustmentStepSize))});
                break;
            case 'playback-speed-reset':
                chrome.storage.local.set({playbackRate: 1});
                break;
            default:
            // unexpected command.
        }
    });


});
