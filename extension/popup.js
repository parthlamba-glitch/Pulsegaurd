const status = document.getElementById("status");
const result = document.getElementById("result");
const recordBtn = document.getElementById("recordBtn");


// =============================================================
//                  RECORD AND ANALYZE VIDEO
// =============================================================

async function recordAndAnalyzeVideo() {

    status.textContent = "Finding current video...";
    result.innerHTML = "";
    recordBtn.disabled = true;


    try {

        // =====================================================
        // GET ACTIVE TAB
        // =====================================================

        const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });


        if (!tabs || tabs.length === 0) {

            throw new Error(
                "No active tab found."
            );

        }


        const tabId = tabs[0].id;


        // =====================================================
        // RUN VIDEO CAPTURE ON PAGE
        // =====================================================

        const results =
            await chrome.scripting.executeScript({

                target: {
                    tabId: tabId
                },


                func: async () => {

                    // =====================================================
                    // FIND CURRENT PLAYING VIDEO
                    // =====================================================

                    const videos =
                        Array.from(
                            document.querySelectorAll("video")
                        );


                    const candidates =
                        videos
                            .map(video => {

                                const rect =
                                    video.getBoundingClientRect();


                                const area =
                                    rect.width *
                                    rect.height;


                                const visible =
                                    rect.width > 0 &&
                                    rect.height > 0 &&
                                    rect.bottom > 0 &&
                                    rect.right > 0 &&
                                    rect.top < window.innerHeight &&
                                    rect.left < window.innerWidth;


                                return {
                                    video,
                                    area,
                                    visible
                                };

                            })
                            .filter(item =>

                                item.visible &&

                                item.video.videoWidth > 0 &&

                                item.video.videoHeight > 0 &&

                                !item.video.paused

                            );


                    if (candidates.length === 0) {

                        throw new Error(
                            "No currently playing video found."
                        );

                    }


                    // =====================================================
                    // SELECT LARGEST VISIBLE PLAYING VIDEO
                    // =====================================================

                    candidates.sort(
                        (a, b) => b.area - a.area
                    );


                    const video =
                        candidates[0].video;


                    // =====================================================
                    // CHECK captureStream()
                    // =====================================================

                    if (
                        typeof video.captureStream !==
                        "function"
                    ) {

                        throw new Error(
                            "captureStream() is not supported by this video."
                        );

                    }


                    // =====================================================
                    // CAPTURE VIDEO STREAM
                    // =====================================================

                    const stream =
                        video.captureStream();


                    // =====================================================
                    // FIND SUPPORTED WEBM FORMAT
                    // =====================================================

                    const mimeTypes = [

                        "video/webm;codecs=vp9",

                        "video/webm;codecs=vp8",

                        "video/webm"

                    ];


                    let mimeType = "";


                    for (const type of mimeTypes) {

                        if (
                            MediaRecorder.isTypeSupported(type)
                        ) {

                            mimeType = type;

                            break;

                        }

                    }


                    if (!mimeType) {

                        throw new Error(
                            "No supported WebM recording format found."
                        );

                    }


                    // =====================================================
                    // CREATE RECORDER
                    // =====================================================

                    const recorder =
                        new MediaRecorder(
                            stream,
                            {
                                mimeType: mimeType
                            }
                        );


                    const chunks = [];


                    recorder.ondataavailable =
                        event => {

                            if (
                                event.data.size > 0
                            ) {

                                chunks.push(
                                    event.data
                                );

                            }

                        };


                    // =====================================================
                    // WAIT FOR RECORDING TO FINISH
                    // =====================================================

                    const recordingFinished =
                        new Promise(
                            (resolve, reject) => {

                                recorder.onstop =
                                    () => {

                                        if (
                                            chunks.length === 0
                                        ) {

                                            reject(
                                                new Error(
                                                    "No video data was recorded."
                                                )
                                            );

                                            return;

                                        }


                                        const blob =
                                            new Blob(
                                                chunks,
                                                {
                                                    type: mimeType
                                                }
                                            );


                                        resolve(blob);

                                    };


                                recorder.onerror =
                                    event => {

                                        reject(
                                            event.error ||

                                            new Error(
                                                "Recording failed."
                                            )
                                        );

                                    };

                            }
                        );


                    // =====================================================
                    // START RECORDING
                    // =====================================================

                    recorder.start();


                    // =====================================================
                    // RECORD FOR 10 SECONDS
                    // =====================================================

                    await new Promise(resolve => {

                        setTimeout(
                            resolve,
                            10000
                        );

                    });


                    // =====================================================
                    // STOP RECORDING
                    // =====================================================

                    recorder.stop();


                    const blob =
                        await recordingFinished;


                    // =====================================================
                    // SEND WEBM TO FASTAPI
                    // =====================================================

                    const formData =
                        new FormData();


                    formData.append(
                        "file",
                        blob,
                        "pulseguard_capture.webm"
                    );


                    const response =
                        await fetch(
                            "http://127.0.0.1:8000/analyze",
                            {
                                method: "POST",
                                body: formData
                            }
                        );


                    // =====================================================
                    // CHECK API RESPONSE
                    // =====================================================

                    if (!response.ok) {

                        throw new Error(
                            "API returned HTTP " +
                            response.status
                        );

                    }


                    const data =
                        await response.json();


                    // =====================================================
                    // RETURN RESULT TO EXTENSION
                    // =====================================================

                    return {

                        apiResponse: data,

                        videoWidth:
                            video.videoWidth,

                        videoHeight:
                            video.videoHeight,

                        blobSize:
                            blob.size,

                        mimeType:
                            mimeType

                    };

                }

            });


        // =========================================================
        // GET RESULT FROM PAGE
        // =========================================================

        const output =
            results[0]?.result;


        if (!output) {

            throw new Error(
                "No result returned from video analysis."
            );

        }


        // =========================================================
        // CHECK PULSEGARD RESPONSE
        // =========================================================

        const data =
            output.apiResponse;


        if (!data.success) {

            throw new Error(
                data.error ||
                "PulseGuard analysis failed."
            );

        }


        // =========================================================
        // GET PREDICTION RESULT
        // =========================================================

        const prediction =
            data.result || {};


        // =========================================================
        // FORMAT VALUES
        // =========================================================

        const verdict =
            prediction.verdict ??
            "INCONCLUSIVE";


        const score =
            prediction.score != null
                ? (Number(prediction.score) * 100).toFixed(1) + "%"
                : "N/A";


        const realProbability =
            prediction.real_probability != null
                ? (
                    Number(
                        prediction.real_probability
                    ) * 100
                ).toFixed(1) + "%"
                : "N/A";


        const fakeProbability =
            prediction.fake_probability != null
                ? (
                    Number(
                        prediction.fake_probability
                    ) * 100
                ).toFixed(1) + "%"
                : "N/A";


        const bpm =
            prediction.bpm != null
                ? Number(
                    prediction.bpm
                ).toFixed(1)
                : "N/A";


        const faceDetection =
            prediction.face_detection_rate != null
                ? Number(
                    prediction.face_detection_rate
                ).toFixed(1) + "%"
                : "N/A";


        const regionalCoherence =
            prediction.regional_coherence != null
                ? Number(
                    prediction.regional_coherence
                ).toFixed(3)
                : "N/A";


        const temporalVariability =
            prediction.temporal_variability != null
                ? Number(
                    prediction.temporal_variability
                ).toFixed(3)
                : "N/A";


        // =========================================================
        // DISPLAY RESULT
        // =========================================================

        status.textContent =
            "Analysis complete.";


        result.innerHTML = `

            <div class="video-card">

                <h3>PulseGuard Result</h3>


                <p>
                    <strong>Verdict:</strong>
                    ${verdict}
                </p>


                <p>
                    <strong>
                        Experimental Model Score:
                    </strong>

                    ${score}
                </p>


                <p>
                    <strong>
                        Real Probability:
                    </strong>

                    ${realProbability}
                </p>


                <p>
                    <strong>
                        Fake Probability:
                    </strong>

                    ${fakeProbability}
                </p>


                <hr>


                <p>
                    <strong>❤️ BPM:</strong>
                    ${bpm}
                </p>


                <p>
                    <strong>
                        👤 Face Detection:
                    </strong>

                    ${faceDetection}
                </p>


                <p>
                    <strong>
                        🔗 Regional Coherence:
                    </strong>

                    ${regionalCoherence}
                </p>


                <p>
                    <strong>
                        📈 Temporal Variability:
                    </strong>

                    ${temporalVariability}
                </p>


                <hr>


                <p>
                    <strong>
                        Recorded:
                    </strong>

                    ${
                        (
                            output.blobSize /
                            1024 /
                            1024
                        ).toFixed(2)
                    }
                    MB
                </p>


                <p>
                    <strong>
                        Resolution:
                    </strong>

                    ${output.videoWidth}
                    ×
                    ${output.videoHeight}
                </p>


                <p class="warning">
                    Experimental analysis.
                    Results are not scientifically definitive.
                </p>

            </div>

        `;


    } catch (error) {

        // =========================================================
        // ERROR HANDLING
        // =========================================================

        console.error(
            "PulseGuard error:",
            error
        );


        status.textContent =
            "Analysis failed.";


        result.innerHTML = `

            <div class="video-card">

                <h3>Error</h3>

                <p>
                    ${error.message}
                </p>

            </div>

        `;

    } finally {

        // =========================================================
        // RE-ENABLE BUTTON
        // =========================================================

        recordBtn.disabled = false;

    }

}


// =============================================================
// BUTTON
// =============================================================

recordBtn.addEventListener(
    "click",
    recordAndAnalyzeVideo
);