```javascript
function findVideos() {
    const videos = document.querySelectorAll("video");

    return Array.from(videos).map((video, index) => ({
        index: index,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        paused: video.paused,
        currentTime: video.currentTime,
        src: video.currentSrc || video.src || null
    }));
}
```
