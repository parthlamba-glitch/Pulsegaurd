# 🫀 PulseGuard

### Physiological-Signal-Based Deepfake Analysis

PulseGuard is an experimental deepfake-analysis system that explores whether subtle **physiological signals extracted from facial video** can be used as an additional signal for identifying manipulated media.

Instead of analyzing only visual artifacts, PulseGuard extracts remote photoplethysmography (**rPPG**) signals from facial regions and converts them into physiological and temporal features. These features are then analyzed by a trained machine-learning model.

PulseGuard is exposed through a **local FastAPI backend** and integrated with a **Chrome Extension**, allowing a user to analyze a video directly from a webpage.

> **PulseGuard is a research and hackathon prototype. It is not intended to provide definitive proof that a video is real or fake.**

---

## ✨ Key Features

- 🎥 Capture approximately 10 seconds of a webpage video
- 🌐 Chrome Extension interface
- ⚡ Local FastAPI inference server
- 🔄 Automatic WebM → MP4 conversion using FFmpeg
- 👤 MediaPipe-based facial landmark detection
- 🧬 rPPG physiological signal extraction
- 🧠 POS-based pulse signal processing
- 📊 Multi-region facial analysis
- 📈 Physiological and temporal feature extraction
- 🤖 Random Forest-based classification
- 🔌 REST API for browser-to-ML communication
- 🩺 Physiological metrics including BPM and regional coherence
- 🛡️ Graceful handling of unreliable physiological signals

---

# 🧠 The Core Idea

Deepfake detection is commonly approached through visual, spatial, or temporal artifacts.

PulseGuard explores a different source of information:

> **Does a generated or manipulated face preserve realistic physiological patterns?**

A real human face contains extremely subtle color changes associated with blood-volume variations. These changes are generally invisible to the naked eye but can potentially be extracted from video using remote photoplethysmography.

PulseGuard therefore attempts to extract physiological information from multiple facial regions:


             ┌─────────────┐
             │   Forehead  │
             └─────────────┘

        ┌─────────┐     ┌─────────┐
        │  Left   │     │  Right  │
        │  Cheek  │     │  Cheek  │
        └─────────┘     └─────────┘

The resulting signals are processed and converted into features that can be supplied to a machine-learning classifier.

---

# 🏗️ System Architecture
                    ┌─────────────────────┐
                    │     Webpage Video   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Chrome Extension  │
                    │                     │
                    │ Video Detection     │
                    │ 10-sec Capture      │
                    │ WebM Generation     │
                    └──────────┬──────────┘
                               │
                         WebM Upload
                               │
                               ▼
                    ┌─────────────────────┐
                    │    FastAPI Server   │
                    │      /analyze       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   FFmpeg Conversion │
                    │     WebM → MP4      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     main.py         │
                    │ PulseGuard Pipeline │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        Face Detection    ROI Extraction    RGB Signals
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   RGB Normalization │
                    └──────────┬──────────┘
                               ▼
                    ┌─────────────────────┐
                    │      POS rPPG       │
                    └──────────┬──────────┘
                               ▼
                    ┌─────────────────────┐
                    │ Bandpass Filtering  │
                    └──────────┬──────────┘
                               ▼
                    ┌─────────────────────┐
                    │ Feature Extraction  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   predict.py        │
                    │                     │
                    │ Random Forest Model │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    JSON Response    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Chrome Extension  │
                    │                     │
                    │ Verdict             │
                    │ Model Score         │
                    │ BPM                 │
                    │ Face Detection      │
                    │ Regional Coherence  │
                    │ Temporal Variability│
                    └─────────────────────┘

# 🔬 Physiological Signal Pipeline

The PulseGuard backend processes the video through several stages.

## 1. Face Detection

MediaPipe is used to identify and track the face across video frames.

The system calculates a:

Face Detection Rate

which represents how consistently a usable face was detected.

---

## 2. Facial Region Extraction

Three facial regions are analyzed:

- Forehead
- Left cheek
- Right cheek

These regions are used to obtain RGB time-series signals.

---

## 3. RGB Signal Extraction

For each region, the system calculates representative RGB values across frames.

This creates temporal signals such as:


Frame 1 → RGB
Frame 2 → RGB
Frame 3 → RGB
...
Frame N → RGB
```

---

## 4. Signal Normalization

The extracted RGB signals are normalized to reduce the effect of differences in illumination and signal scale.

---

## 5. POS rPPG Extraction

PulseGuard applies a POS-based remote photoplethysmography approach to extract a physiological pulse signal from the normalized RGB data.

---

## 6. Bandpass Filtering

The resulting signal is filtered to focus on the frequency range relevant to human pulse activity.

---

## 7. Feature Extraction

The processed signals are converted into numerical features.

Examples include:

Median BPM
Mean BPM
Peak Strength
Regional BPM Standard Deviation
Regional BPM Range
Temporal Variability
Forehead-Left Correlation
Forehead-Right Correlation
Left-Right Correlation
Regional Coherence
Face Detection Rate
```

These features form the input to the machine-learning model.

---

# 🤖 Machine Learning

PulseGuard uses a trained **Random Forest classifier** for the final prediction stage.

The basic flow is:

```text
Video
  ↓
Physiological Signal
  ↓
Extracted Features
  ↓
Random Forest
  ↓
Prediction
```

The trained model is stored as:

```text
backend/pulseguard_model.pkl
```

Prediction logic is implemented in:

```text
backend/predict.py
```

---

# 🌐 Chrome Extension

The Chrome Extension provides the user-facing interface.

The extension is responsible for:

1. Detecting videos on the current webpage
2. Capturing approximately 10 seconds of the selected video
3. Generating a WebM recording
4. Sending the recording to the local FastAPI server
5. Receiving the prediction
6. Displaying the analysis results

The extension communicates with:

```text
http://127.0.0.1:8000/analyze
```

---

# 🔌 API

## `POST /analyze`

Analyzes an uploaded video.

### Request

The endpoint expects:

```text
Content-Type: multipart/form-data
```

with the field:

```text
file
```

Example:

```text
file = captured_video.webm
```

---

## Backend Processing

Uploaded WebM files are temporarily converted to MP4 using FFmpeg because the existing PulseGuard processing pipeline operates on the converted video.

```text
WebM
 ↓
FFmpeg
 ↓
MP4
 ↓
main.py
```

Temporary files are removed after processing.

---

## Example Response

```json
{
    "success": true,
    "result": {
        "verdict": "LIKELY FAKE",
        "score": 0.63,
        "real_probability": 0.37,
        "fake_probability": 0.63,
        "bpm": 72.3,
        "face_detection_rate": 100.0,
        "regional_coherence": 0.15,
        "temporal_variability": 0.27
    }
}
```

Some physiological measurements may be returned as:

```json
null
```

when a reliable signal cannot be obtained from the video.

This is an expected condition rather than necessarily a backend failure.

---

# 📁 Project Structure


PulseGuard/
│
├── backend/
│   │
│   ├── api.py
│   │       FastAPI server and API layer
│   │
│   ├── main.py
│   │       Video processing and rPPG feature extraction
│   │
│   ├── predict.py
│   │       Machine-learning inference
│   │
│   ├── pulseguard_model.pkl
│   │       Trained Random Forest model
│   │
│   ├── face_landmarker.task
│   │       MediaPipe face landmark model
│   │
│   └── requirements.txt
│           Python dependencies
│
├── extension/
│   ├── content.js
│   │       Webpage video detection/capture logic
│   │
│   ├── manifest.json
│   │       Chrome Extension configuration
│   │
│   ├── popup.html
│   │       Extension interface
│   │
│   ├── popup.js
│   │       Extension logic and API communication
│   │
│   └── style.css
│           Extension styling
│
├── .gitignore
└── README.md

---

# ⚙️ Installation

## Requirements

- Python 3.11+
- Google Chrome
- FFmpeg
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/parthlamba-glitch/Pulsegaurd.git
```

```bash
cd Pulsegaurd
```

---

# 🐍 Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

### Windows

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# 🎞️ FFmpeg

PulseGuard requires FFmpeg for WebM → MP4 conversion.

Verify that FFmpeg is available:

```bash
ffmpeg -version
```

If the command is not recognized, install FFmpeg and add it to the system PATH.

---

# 🚀 Running the Backend

From the `backend` directory:

```bash
uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

The API health check can be accessed at:

```text
http://127.0.0.1:8000/
```

Expected response:

```json
{
    "status": "online",
    "service": "PulseGuard API"
}
```

---

# 🧩 Loading the Chrome Extension

Open:

```text
chrome://extensions
```

Then:

1. Enable **Developer mode**
2. Click **Load unpacked**
3. Select the `extension/` directory
4. Pin PulseGuard to the Chrome toolbar

---

# ▶️ Using PulseGuard

### Step 1

Open a webpage containing a suitable human-face video.

### Step 2

Start the PulseGuard extension.

### Step 3

The extension captures approximately 10 seconds of the current video.

### Step 4

The captured WebM is sent to:

```text
POST http://127.0.0.1:8000/analyze
```

### Step 5

The backend converts the video and runs the physiological-signal pipeline.

### Step 6

The machine-learning model generates a prediction.

### Step 7

The extension displays the returned result and physiological metrics.

---

# 📊 Output Metrics

PulseGuard can expose several measurements from the analysis pipeline.

| Metric | Description |
|---|---|
| **Verdict** | Model's predicted class |
| **Model Score** | Model output associated with the prediction |
| **BPM** | Estimated pulse rate when available |
| **Face Detection Rate** | Percentage of frames with a detected face |
| **Regional Coherence** | Agreement between physiological signals from facial regions |
| **Temporal Variability** | Variation in the extracted signal over time |

---

# ⚠️ Limitations

PulseGuard is currently a **prototype** and has several important limitations.

### Dataset Size

The training dataset is relatively small.

A larger and more diverse dataset would be required for robust generalization.

### Short Video Duration

The browser prototype analyzes approximately 10 seconds of video.

Short clips can make reliable physiological signal estimation difficult.

### Signal Quality

rPPG depends on factors such as:

- Lighting
- Face visibility
- Camera quality
- Compression
- Head movement
- Occlusion
- Video resolution
- Frame rate

Poor signal quality can result in unavailable or unreliable physiological measurements.

### Model Performance

The current model is an experimental baseline rather than a production-grade deepfake detector.

On the current held-out evaluation, performance was limited, with approximately:

```text
Accuracy : 47.8%
Precision: 22.2%
Recall   : 28.6%
F1 Score : 25.0%
ROC-AUC  : 0.589
```

These results indicate that the current model requires additional data, validation, and feature/model development before it can be considered reliable for real-world detection.

---

# 🧪 Research Direction

PulseGuard is designed around the idea that physiological consistency can provide an **additional signal** for manipulated-media analysis.

Future development could include:

- Larger real/fake datasets
- Longer temporal windows
- More facial regions
- Improved rPPG algorithms
- Signal-quality assessment
- Additional physiological features
- Temporal deep-learning models
- CNN/Transformer-based visual features
- Ensemble models combining physiological and visual signals
- Cross-dataset evaluation
- Real-world robustness testing

The long-term goal is not to rely on one signal alone, but to investigate whether physiological information can complement existing deepfake-detection techniques.

---

# 🔐 Privacy

PulseGuard's current architecture processes videos through a **local FastAPI server**.

The Chrome Extension communicates with:

```text
127.0.0.1:8000
```

rather than requiring the captured video to be uploaded to a remote inference service.

---

# 🛠️ Technology Stack

### Frontend

- JavaScript
- HTML
- CSS
- Chrome Extension APIs

### Backend

- Python
- FastAPI
- Uvicorn
- FFmpeg

### Computer Vision

- OpenCV
- MediaPipe

### Signal Processing

- NumPy
- SciPy
- POS-based rPPG processing

### Machine Learning

- Scikit-learn
- Random Forest
- Joblib/Pickle model serialization

---

# 🧭 End-to-End Workflow

```text
                 USER
                  │
                  ▼
          ┌───────────────┐
          │ Webpage Video │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │    Chrome     │
          │   Extension   │
          └───────┬───────┘
                  │
             10-sec WebM
                  │
                  ▼
          ┌───────────────┐
          │    FastAPI    │
          │   /analyze    │
          └───────┬───────┘
                  │
                  ▼
             FFmpeg
             WebM → MP4
                  │
                  ▼
          ┌───────────────┐
          │    main.py    │
          └───────┬───────┘
                  │
                  ▼
          Face + RGB + rPPG
                  │
                  ▼
          Physiological Features
                  │
                  ▼
          ┌───────────────┐
          │   predict.py  │
          └───────┬───────┘
                  │
                  ▼
        pulseguard_model.pkl
                  │
                  ▼
             Prediction
                  │
                  ▼
          ┌───────────────┐
          │    FastAPI    │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │    Chrome     │
          │   Extension   │
          └───────┬───────┘
                  │
                  ▼
              USER RESULT
```

---

# 👥 Project Status

PulseGuard currently exists as a working research/hackathon prototype integrating:

- Physiological signal extraction
- Facial-region analysis
- Machine-learning inference
- FastAPI serving
- WebM video processing
- Chrome Extension interaction

The project is intended to demonstrate the **feasibility of combining physiological signals with machine learning for manipulated-media analysis**, rather than claiming production-ready deepfake detection.

---

# 📜 Disclaimer

PulseGuard is an experimental research and hackathon project.

Its predictions are **not definitive evidence of whether a video is authentic or manipulated**.

The current model has limited validation performance and should not be used for high-stakes decisions, authentication, legal judgments, or factual verification.

---

## ⭐ Built as a Deepfake Analysis Research Prototype

**PulseGuard**  
*Exploring the physiological side of synthetic media detection.* 🫀
```

### One thing I deliberately did differently

I **did not market the current model as highly accurate**. Your measured ROC-AUC of ~0.589 and fake-class F1 of ~0.25 don't support that claim. The README instead sells the genuinely interesting part of the project: **the physiological-signal approach + complete working pipeline + browser integration**, while being transparent about the model's current limitations.

That is much safer in a hackathon Q&A too. If a judge asks, *"Does it actually detect deepfakes reliably?"*, you can say exactly what the evaluation shows rather than getting cornered by an inflated claim.
