# Controls for Instagram Videos

A tiny and efficient Chrome extension that adds standard video playback controls to Instagram™ videos.

## Overview

Normally, all you can do with an Instagram™ video is play or pause it. This extension exposes the native HTML5 video player which provides:

- 🎬 **Seek bar** (video scrubber) - jump to any point in the video
- 🔊 **Volume control** - with persistent memory across videos
- ▶️ **Play/Pause button** - standard video controls
- 🖼️ **Picture-in-Picture** - floating video with custom controls
- 📺 **Fullscreen** - watch videos in full screen mode
- ⬇️ **Download button** - works on *some* videos

The extension automatically runs and works on all web pages that embed Instagram™ videos!

## How to Use

1. Load any web page that contains an Instagram video
2. Click the video to make it play
3. That's it - the extension will automatically detect the video and reveal the control buttons

## Features

### Volume & Playback Memory
- Control volume and playback speed via hotkeys
- Remember your volume and playback speed for future videos
- Settings sync across all videos on the same page

### Picture-in-Picture Mode
- Watch videos in a floating window
- Navigate between reels using next/previous track buttons
- Use keyboard shortcuts while PiP is active
- Custom on-screen controls (play/pause, volume, navigation)

### Global Unmute
- Once you unmute a video, all subsequent videos play unmuted
- No more clicking the mute button on every video!

## Keyboard Shortcuts

Customizable via `chrome://extensions/shortcuts`

### Windows / Linux

| Action | Shortcut |
|--------|----------|
| Increase Volume | `Ctrl + Up Arrow` |
| Decrease Volume | `Ctrl + Down Arrow` |
| Increase Playback Speed | (configurable) |
| Decrease Playback Speed | (configurable) |
| Next Reel | `Ctrl + Right Arrow` |
| Previous Reel | `Ctrl + Left Arrow` |
| Toggle PiP | `P` |
| Mute/Unmute (in PiP) | `M` |
| Quick Volume (in PiP) | `0-9` keys |

### Mac

| Action | Shortcut |
|--------|----------|
| Increase Volume | `Command + Up Arrow` |
| Decrease Volume | `Command + Down Arrow` |
| Increase Playback Speed | (configurable) |
| Decrease Playback Speed | (configurable) |
| Next Reel | `Command + Right Arrow` |
| Previous Reel | `Command + Left Arrow` |
| Toggle PiP | `P` |
| Mute/Unmute (in PiP) | `M` |
| Quick Volume (in PiP) | `0-9` keys |

## Configuration

Access the extension options:
1. Right-click the extension icon in your browser toolbar
2. Select **Options**

Or navigate to `chrome://extensions/` and click the extension's **Details** → **Extension options**

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Remember Volume Level | Save volume across videos | ✅ Enabled |
| Volume Level | Current volume (0-1) | 1.0 |
| Volume Adjustment Step | Amount to change per hotkey | 0.1 |
| Remember Playback Rate | Save speed across videos | ✅ Enabled |
| Playback Rate | Current speed multiplier | 1.0 |
| Playback Rate Step | Amount to change per hotkey | 0.125 |
| Debug Mode | Log debug info to console | ❌ Disabled |

## Important Notes

- ⚠️ **After installation**: Reload any browser tabs that were opened before installing. The extension won't run in those tabs until you do.
- ⚠️ **Download button**: Doesn't work on many videos anymore due to recent Instagram changes, but still works on *some*.
- ⚠️ **Auto-play feeds**: On pages where Instagram auto-plays videos as you scroll (like your home feed), click in the **center** of the video to play/pause. Using the small button in the lower left may cause videos to not stay paused when scrolling.

## Known Issues

- The volume mute/unmute buttons on the video vs the Instagram GUI aren't always in sync
- On Stories, you must use the Instagram play/pause button (the native video button doesn't work)

## Technical Details

- **Manifest Version**: 3 (MV3)
- **Minimum Chrome Version**: 88
- **Permissions**: `storage` only
- **Content Scripts**: Runs on `*.instagram.com`

---

## Changelog

### Fork Enhancements (over v1.33) v2.0 - November 27th, 2025

This fork includes the following improvements:
- ✨ Enhanced Picture-in-Picture with custom on-screen controls
- ✨ Global unmute state - unmute once, all videos play unmuted
- ✨ Improved volume persistence across rapid video changes
- ✨ Better mute button sync with Instagram's UI
- ✨ Reel navigation with keyboard shortcuts
- ✨ Document PiP with progress bar, navigation buttons, and volume slider
- ✨ OSD feedback for volume and speed changes
- ✨ Visibility API override to keep videos playing in background

### v1.33 - February 5th, 2023
- Fix for not being able to click controls on some videos on home feed
- Make background shade on reels pages less visually disruptive

### v1.32 - February 2nd, 2023
- Another potential fix for some users not seeing controls on some videos
- Add support for reels

### v1.30 - November 24th, 2022
- More reliably adjust video height on story videos
- Potential fix for some users not seeing controls on some videos

### v1.29 - November 18th, 2022
- Fix video controls not being easily clickable for certain videos
- New features: configurable hotkeys for volume and video speed

### v1.28 - June 22nd, 2022
- Upgrade to manifest v3 (technical change, no functionality affected)

### v1.27 - June 17th, 2022
- Make videos stay paused when scrolling on home page (click center of video)
- Fix bug preventing users with non-english browser language from using core features

### v1.25 - June 2nd, 2022
- Adapt to recent Instagram updates, fixing sudden lack of video controls
- Resize video upwards on stories so controls aren't covered by Instagram buttons

### v1.24 - May 29th, 2021
- More reliably avoid "Send Message" box from overlaying controls on Story videos
- Hopefully avoid rare case of stuttering videos

### v1.23 - August 17th, 2020
- Potential bugfix for disappearing videos/images on some pages

### v1.21 - August 5th, 2020
- Bugfix for disappearing videos on some pages

### v1.19 - July 18th, 2020
- On some Story videos, resize the video so "Send Message" text box doesn't overlay controls (2nd attempt)

### v1.18 - May 11th, 2020
- Undo previous change to Story videos which affected some non-story videos

### v1.17 - May 9th, 2020
- On some stories, move the video so "Send Message" text box doesn't overlay controls

### v1.16 - April 2nd, 2020
- Fix bug sometimes causing wrong video to play when clicking

### v1.15 - November 2nd, 2019
- Expand allowed playback rate range

### v1.14 - October 30th, 2019
- Add ability to set video playback speed
- Enable "remember volume" feature by default

### v1.13 - September 29th, 2019
- Add ability to automatically remember the volume of videos

### v1.11 - June 8th, 2019
- Update to react to Instagram changes, fixing support for stories page

### v1.10 - May 18th, 2019
- Show controls on videos in stories
- Fix play/pause bug when clicking on center of videos

### v1.9
- Update readme

### v1.8
- Efficiency improvement

### v1.6
- More reliably detect videos on instagram.com pages that use modal dialogs

### v1.5
- Update to react to Instagram changes

### v1.4
- Update to react to Instagram changes

### v1.3
- Renamed extension

### v1.2
- Added trademark notice

### v1.1
- Improve compatibility to work on more sites, including instagram.com and other non-Instagram sites

### v1.0
- Initial release

---

## Legal

Instagram™ is a registered trademark. This extension was developed independently of Instagram, by someone who is not related or affiliated with Instagram, without any help or endorsement from them.

## Credits

- **Original Author**: [Chris Rehfeld](mailto:rehfeldchris@gmail.com)
- **Homepage**: http://rehfeld.us/browser-extensions/controls-for-instagram

## Troubleshooting

**Why is the extension broken sometimes?**

Instagram frequently updates their website, which can break extensions that interact with their pages. Read more at: https://rehfeld.us/browser-extensions/controls-for-instagram/instagram-changes
