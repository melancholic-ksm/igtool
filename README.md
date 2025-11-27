# igtool - Controls for Instagram Videos

Enhanced fork of the [Controls for Instagram Videos](https://chromewebstore.google.com/detail/controls-for-instagram-vi/eigfbedabacomcacemdnkelnlhgbiacn) Chrome extension with additional features and bug fixes. Kudos to the original creators - they can push these changes to the original if they want to do so.

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

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Locate the extension folder (e.g., `InstagramControls-vX.XX-YYYY-MM-DD`)
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable **Developer mode** (toggle in the top-right corner)
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

- The download button doesn't work on many videos due to recent Instagram changes, but still works on some
- Volume mute/unmute buttons may occasionally get out of sync with Instagram's GUI
- On Stories, you must use the Instagram play/pause button (native video button doesn't work)

## Changelog

See the full changelog in the `README.txt` file within the extension folder.

### Recent Updates (v1.40)
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
- Homepage: http://rehfeld.us/browser-extensions/controls-for-instagram
