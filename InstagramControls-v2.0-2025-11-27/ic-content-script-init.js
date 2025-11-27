let showLog = false;
let ivc;

function log() {
    showLog && console.log.apply(console, arguments);
}

(function main() {
    ivc = new InstagramVideoControls();
    window.instagramVideoControls = ivc;
    ivc.init();
})();
