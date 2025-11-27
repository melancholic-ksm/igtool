{
    function watchEx(fn) {
        return recordEx('stdError', fn);
    }

    function recordEx(errorKey, fn) {
        function wrapper() {
            try {
                return fn.apply(this, arguments);
            } catch (ex) {
                console.error(errorKey, ex);
                try {
                    const fnName = getFunctionName(ex);
                    recordUsageStats(`${errorKey}.${fnName}`);
                } catch (ex2) {
                    console.error(errorKey, ex2);
                    recordUsageStats(`${errorKey}.unknown`);
                }

                throw ex;
            }
        }

        return augmentFunctionName(wrapper, fn, 'recordEx_');
    }

    /**
     * Increments the count for the given log entry name.
     *
     * @param {string} keyName
     */
    function recordUsageStats(keyName) {
        keyName = keyName || 'stdError';
        chrome.storage.local.get({usageStats: {}}, obj => {
            obj.usageStats = obj.usageStats || {};
            obj.usageStats[keyName] = obj.usageStats[keyName] || 0;
            obj.usageStats[keyName]++;
            chrome.storage.local.set(obj);
        });
    }

    function getFunctionName(ex) {
        const stackFrames = ErrorStackParser.parse(ex);
        if (!stackFrames) {
            return;
        }

        if (stackFrames[0]) {
            const f = stackFrames[0];
            if (f.functionName) {
                // Use the function name, if present.
                return f.functionName;
            } else {
                // No name, likely a lambda, so well patch together some other info, compactly.
                const parts = (f.fileName || '').split('/');
                const baseNameNoPath = parts.pop();
                const fileNameShortPiece = baseNameNoPath.slice(0, 6);
                return `${fileNameShortPiece}-${f.lineNumber}-${f.columnNumber}`;
            }
        }
    }

    /**
     * This is a hack that attempts to "change" a function's "name" property. The name gets used in stack traces, so a name that's better than "anonymous function" is always helpful.
     * This hack is useful when wrapping other functions, because you can take the name of the wrapped function and copy it over to the wrapper you created, allowing you to kinda maintain the name.
     *
     * @example
     * function updateGui() {
     *     // ...
     * }
     * console.log(updateGui.name); // "updateGui"
     * let wrapped = debounce(updateGui);
     * console.log(wrapped.name); // "anonymous"
     * augmentFunctionName(wrapped, updateGui, 'debouncedFunc_');
     * console.log(wrapped.name); // "debouncedFunc_updateGui"
     *
     * Or
     * let wrapped = augmentFunctionName(debounce(updateGui), updateGui, debounce);
     * console.log(wrapped.name); // "debounce_updateGui"
     *
     * @param {function} fnToReceiveNewName
     * @param {function} fnToPartiallyCopyNameFrom
     * @param {string|function} fnNamePrefix
     */
    function augmentFunctionName(fnToReceiveNewName, fnToPartiallyCopyNameFrom, fnNamePrefix) {
        let prefix;
        if (typeof fnNamePrefix === 'string') {
            prefix = fnNamePrefix;
        } else if (typeof fnNamePrefix === 'function') {
            prefix = fnNamePrefix.name + "_";
        } else {
            prefix = "wrapped_";
        }

        // Hack to set the function name of the wrapper so that it contains the name of the wrapped function - for better stack traces.
        Object.defineProperty(fnToReceiveNewName, 'name', {value: prefix + fnToPartiallyCopyNameFrom.name});

        // We don't need to return the object because we modified the existing object, but we do it to make using/calling this function easier.
        return fnToReceiveNewName;
    }

    function debounce(func, delayUntilCallMillis) {
        let timerId;
        function wrapper() {
            const that = this;
            const args = arguments;
            timerId && clearTimeout(timerId);
            timerId = setTimeout(function debounceWrapper() {
                timerId = undefined;
                func.apply(that, args);
            }, delayUntilCallMillis);
        }
        return augmentFunctionName(wrapper, func, 'debounceWrapper_');
    }

    /**
     *
     from https://stackoverflow.com/questions/27078285/simple-throttle-in-js
     Returns a function, that, when invoked, will only be triggered at most once
     during a given window of time. Normally, the throttled function will run
     as much as it can, without ever going more than once per `wait` duration;
     but if you'd like to disable the execution on the leading edge, pass
     `{leading: false}`. To disable execution on the trailing edge, ditto.

     * @param {function(): *} func
     * @param {number} minimumMillisBetween
     * @param {object} [options]
     * @return {function(): *}
     */
    function throttle(func, minimumMillisBetween, options) {
        let context, args, result;
        let timeout = null;
        let previous = 0;
        if (!options) options = {};
        let later = function() {
            previous = options.leading === false ? 0 : Date.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        };
        function throttledFunc() {
            let now = Date.now();
            if (!previous && options.leading === false) previous = now;
            let remaining = minimumMillisBetween - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > minimumMillisBetween) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(watchEx(later), remaining);
            }
            return result;
        }
        return augmentFunctionName(throttledFunc, func, 'throttleWrapper_');
    }

    /**
     *
     * @param {function} func
     * @param minimumMillisBetween
     * @return {function}
     */
    function leadingAndTrailingFiringThrottle(func, minimumMillisBetween) {
        return throttle(func, minimumMillisBetween, {leading: true, trailing: true});
    }

    function byId(domId) {
        return document.getElementById(domId);
    }

    /**
     * @param {string} selector
     * @param {Node?} contextNode
     * @return {Node[]}
     */
    function queryAll(selector, contextNode) {
        return Array.from((contextNode || document).querySelectorAll(selector));
    }

    /**
     * @param {string} selector
     * @param {Node?} contextNode
     * @return {Node|null}
     */
    function query(selector, contextNode) {
        return (contextNode || document).querySelector(selector);
    }

    /**
     * @param {string} html
     * @return {Element}
     */
    function fromHtml(html) {
        const div = document.createElement("div");
        div.innerHTML = html;
        return div.firstElementChild;
    }

    /**
     * Compares 2 numbers, but only using a certain number of decimal places for the comparison.
     *
     * @param {number} a
     * @param {number} b
     * @param {number} decimalPlaces
     * @example cmpPrecision(1.123, 1.124, 2) === 0 && cmpPrecision(1.123, 1.124, 3) !== 0
     * @return {number}
     */
    function cmpToPrecision(a, b, decimalPlaces) {
        const pow = Math.pow(10, decimalPlaces);
        return Math.trunc(a * pow) - Math.trunc(b * pow);
    }

    /**
    * Returns the result of the first function to return a non-undefined value.
    *
    * @param {...function} callbacks
    */
    function coalesceCallback(callbacks) {
        for (let i = 0; i < callbacks.length; i++) {
            const result = callbacks[i]();
            if (result) {
                return result;
            }
        }
    }


    /**
     * @param {Element} element
     * @returns {Element[]}
     */
    function getAllElementSiblings(element) {
        const siblings = [];
        let cursor = element.parentNode.firstElementChild;
        while (cursor) {
            siblings.push(cursor);
            cursor = cursor.nextElementSibling;
        }
        return siblings;
    }
}

class FloodTracker {
    #timeBuckets = {};
    #timePeriodSeconds;
    #maxEventsPerPeriod;

    constructor(timePeriodSeconds, maxEventsPerPeriod) {
        this.#timePeriodSeconds = timePeriodSeconds;
        this.#maxEventsPerPeriod = maxEventsPerPeriod;
    }

    #formatTimeToBucket() {
        const d = new Date();
        return `${d.getDate()}-${d.getHours()} ${d.getMinutes()}-${Math.floor(d.getSeconds() / (60 / this.#timePeriodSeconds))}`;
    }

    #getCurrentTimePeriodBucket() {
        const timeBucket = this.#formatTimeToBucket();
        this.#timeBuckets[timeBucket] = this.#timeBuckets[timeBucket] || {timeBucket, cnt: 0};
        return this.#timeBuckets[timeBucket];
    }

    markEventOccurred() {
        this.#getCurrentTimePeriodBucket().cnt++;
    }

    // This can give false negative and allow you to exceed the limit a bit, but it won't false positive.
    limitExceeded() {
        return this.#getCurrentTimePeriodBucket().cnt > this.#maxEventsPerPeriod;
    }
}

// psuedo exports
const util = {
    watchEx,
    recordEx,
    recordUsageStats,
    getFunctionName,
    augmentFunctionName,
    debounce,
    throttle,
    leadingAndTrailingFiringThrottle,
    byId,
    queryAll,
    query,
    fromHtml,
    cmpToPrecision,
    getAllElementSiblings,
    FloodTracker
};
