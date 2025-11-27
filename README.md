# igtool - Controls for Instagram Videos

Enhanced fork of the [Controls for Instagram Videos](https://chromewebstore.google.com/detail/controls-for-instagram-vi/eigfbedabacomcacemdnkelnlhgbiacn) Chrome extension with additional features and bug fixes. Kudos to the original creators - they can push these changes to the original if they want to do so.

## Installation

- Click [Download .zip](https://github.com/melancholic-ksm/igtool/archive/refs/heads/main.zip) and unzip it to some safe folder, for eg: ~/Documents/extension/

### From Source (Developer Mode)

1. Download or clone this repository   ([.zip](https://github.com/melancholic-ksm/igtool/archive/refs/heads/main.zip))
2. Look for the extension folder (contains `manifest.json`)
3. Open Chrome and navigate to `chrome://extensions/` (or if edge then edge://extension, brave then brave://extension and similarly on other chromium browsers. !Doesnt works on safari or firefor.
4. Enable **Developer mode** (toggle in the top-right corner)(Ctrl+F-- Developer Mode-- esc-- toogle it on)
5. Click **Load unpacked** and select the extension folder
6. The extension is now installed and active

### After Installation

- **Reload** any Instagram tabs that were open before installing
- The extension automatically activates on `instagram.com`
- Click any video to see the native controls appear

## Configuration

Access the extension options by:
1. Right-click the extension icon in your browser toolbar
2. Select **Options**

Or navigate directly to `chrome://extensions/`, find the extension, and click **Details** → **Extension options**

---

## Description

This Chrome extension adds native HTML5 video playback controls to Instagram videos. Normally, all you can do with an Instagram video is play or pause it, but this extension exposes the native HTML5 video player which provides:

- **Seek bar** (video scrubber) to jump to any point in the video
- **Volume control** with persistent memory across videos and sessions
- **Playback speed control** with persistent memory
- **Picture-in-Picture (PiP)** with custom on-screen controls
- **Reel navigation** (next/previous) with keyboard shortcuts
- **Fullscreen video** support
- **Download button** (works on some videos)

## Features

### Video Controls
- Native HTML5 video controls on all Instagram videos
- Works on Stories, Reels, Feed posts, and embedded Instagram videos
- Automatic video detection and control injection

### Volume & Playback
- Remember volume level across videos and page reloads
- Remember playback speed across videos
- Configurable adjustment step sizes
- Visual OSD (On-Screen Display) feedback for volume/speed changes

### Picture-in-Picture (PiP)
- Enhanced Document PiP with custom controls
- On-screen play/pause, next/previous, mute/volume controls
- Progress bar with seeking
- Scroll wheel navigation between reels
- Videos keep playing when tab is in background

### Keyboard Shortcuts

**Default Hotkeys** (customizable via `chrome://extensions/shortcuts`):

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Increase Volume | `Ctrl+Up` | `Command+Up` |
| Decrease Volume | `Ctrl+Down` | `Command+Down` |
| Next Reel | `Ctrl+Right` | `Command+Right` |
| Previous Reel | `Ctrl+Left` | `Command+Left` |
| Toggle PiP | `P` | `P` |
| Mute/Unmute (in PiP) | `M` | `M` |
| Quick Volume (in PiP) | `0-9` keys | `0-9` keys |

### Global Unmute
Once you unmute a video in a session, all subsequent videos automatically play unmuted - no more clicking the mute button on every video!


### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Remember Volume Level | Save volume across videos | Enabled |
| Volume Level | Current volume (0-1) | 1.0 |
| Volume Adjustment Step | Amount to change per hotkey | 0.1 |
| Remember Playback Rate | Save speed across videos | Enabled |
| Playback Rate | Current speed multiplier | 1.0 |
| Playback Rate Step | Amount to change per hotkey | 0.125 |
| Debug Mode | Log debug info to console | Disabled |

## Usage Tips

1. **Clicking videos**: Click in the **center** of the video to play/pause (not the small button in the corner). This ensures proper state management when scrolling through your feed.

2. **PiP Mode**: Press `P` to enter enhanced Picture-in-Picture mode with on-screen controls. Scroll up/down in PiP to navigate between reels!

3. **Volume sync**: When you adjust volume using the native video controls or hotkeys, it automatically syncs with Instagram's UI and all other videos on the page.

4. **Stories**: On Stories, some overlays are hidden to give you access to the video controls. Use Instagram's native play/pause button in Stories.

## Known Issues

- The download button doesn't work on many videos due to Instagram's content protection; it may still work on older or less protected content
- Volume mute/unmute buttons may occasionally get out of sync with Instagram's GUI
- On Stories, you must use the Instagram play/pause button (native video button doesn't work)

## Changelog

For the full changelog with version history, see the `README.md` file inside the extension folder.

### Fork Enhancements v2.0 - November 27th 2025
This fork includes the following improvements over the original v1.33 release:
- Enhanced Picture-in-Picture with custom on-screen controls
- Global unmute state - unmute once, all videos play unmuted
- Improved volume persistence across rapid video changes
- Better mute button sync with Instagram's UI
- Reel navigation with Ctrl+Arrow keys
- Document PiP with progress bar, navigation buttons, and volume slider
- OSD feedback for volume and speed changes
- Visibility API override to keep videos playing in background

### v1.33 (Feb 2023)
- Fix for not being able to click controls on some videos on home feed
- Less visually disruptive background shade on reels pages

## Technical Details

- **Manifest Version**: 3 (MV3)
- **Base Version**: 1.33 (fork enhancements added)
- **Minimum Chrome Version**: 88
- **Permissions**: `storage` only
- **Content Scripts**: Runs on `*.instagram.com`

## Contributing

Feel free to submit issues and pull requests to improve this extension!

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Legal

Instagram™ is a registered trademark. This extension was developed independently of Instagram, by someone who is not related or affiliated with Instagram, without any help or endorsement from them.

## Credits

- Original extension by [Chris Rehfeld](mailto:rehfeldchris@gmail.com)
- Homepage: [http://rehfeld.us/browser-extensions/controls-for-instagram](http://rehfeld.us/browser-extensions/controls-for-instagram)

## Previous versions of Extensions
 @ [https://rehfeld.us/browser-extensions/controls-for-instagram/list-zips](https://rehfeld.us/browser-extensions/controls-for-instagram/list-zips)

 You can install one of these versions without having to go through the Chrome Webstore. Just unzip it, and then from chrome://extensions/ use the Load Unpacked Extension button. You should only do this for extensions you trust.

[InstagramControls-v1.33-2023-02-05-12-28.zip](https://rehfeld.us/browser-extensions/controls-for-instagram/zips/InstagramControls-v1.33-2023-02-05-12-28.zip)
[[InstagramControls-v1.32-2023-02-02-12-28.zip](https://rehfeld.us/browser-extensions/controls-for-instagram/zips/InstagramControls-v1.32-2023-02-02-12-28.zip)
InstagramControls-v1.23-2020-10-11-05-36.zip](https://rehfeld.us/browser-extensions/controls-for-instagram/zips/InstagramControls-v1.23-2020-10-11-05-36.zip)
[InstagramControls-v1.22-2020-08-09-09-40.zip](https://rehfeld.us/browser-extensions/controls-for-instagram/zips/InstagramControls-v1.22-2020-08-09-09-40.zip)
[InstagramControls-v1.21-2020-08-04-03-15.zip](https://rehfeld.us/browser-extensions/controls-for-instagram/zips/InstagramControls-v1.21-2020-08-04-03-15.zip)
[InstagramControls-v1.20-2020-08-02-03-14.zip](https://rehfeld.us/browser-extensions/controls-for-instagram/zips/InstagramControls-v1.20-2020-08-02-03-14.zip)

Latest (Fork) [InstagramControls-v2.0-2025-11-27.zip](https://github.com/melancholic-ksm/igtool/archive/refs/heads/main.zip)


## Privacy in Fork of Extension 

As per [privacy-policy](https://rehfeld.us/browser-extensions/controls-for-instagram/privacy-policy) of rehfeld-us extension, this fork also do same-


"This extension, "Controls for Instagram", does not collect any personally identifying information. It does collect anonymous extension usage statistics.

This extension does not do any background network communication to external sites (it doesn't "phone home" while you use it).
As you use it, it gathers usage statistics and accumulates them in your browser. This data is not collected while you use the extension,
it's only collected one time, at the moment you uninstall the extension, when you're sent to my website for an uninstallation survey.
If you don't want any data collected at all, simply unplug your internet connection before you uninstall the extension.

This extension is fully self contained, and does not load any remote code, not even libraries, nor does it talk to any remote websites. 100% of
 the code is packaged with the extension, so you can review and audit the code contained in the CRX file, if desired,
 and feel confident you've seen every bit of the code.

What it does track and collect:
- Date you installed, updated, and uninstalled the extension.
- Which version(s) of the extension you installed.
- Your operating system.
- Quality assurance data, such as how many javascript errors you encountered, if any. Also, how many times the extension code was run.
- Extension usage statistics. For example, did you use the feature which allows you to change the playback rate?

To be clear, it does NOT track or collect which urls, websites, or any data derived from the pages you visit such as account names / friends.

All data collected is used strictly to improve the extension. Your data is never sold, or shared with anyone. I am a 1 person team."


and for verification, reverification all codes are disclosed and opensourced under [Apache License 2.0](https://github.com/melancholic-ksm/igtool/blob/main/LICENSE), feel free to examine code and resource under this tool. Their is no motive of earning or personal gain from this fork of particular extension. Maybe you can support author somewhere at [refeld.us](http://refeld.us/) or from his socials. Thankyou.
