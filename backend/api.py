import os
import json
import sys
import tempfile
import subprocess
import math

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
#                    PULSEGARD API
# ============================================================

app = FastAPI(
    title="PulseGuard API",
    description="API bridge for PulseGuard physiological analysis",
    version="1.0"
)


# ============================================================
#                       CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# ============================================================
#                  JSON SANITIZATION
# ============================================================

def sanitize_for_json(data):

    # Dictionary
    if isinstance(data, dict):

        return {
            key: sanitize_for_json(value)
            for key, value in data.items()
        }


    # List
    elif isinstance(data, list):

        return [
            sanitize_for_json(value)
            for value in data
        ]


    # Float
    elif isinstance(data, float):

        if not math.isfinite(data):

            return None

        return data


    # Everything else
    return data


# ============================================================
#                       HEALTH CHECK
# ============================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "service": "PulseGuard API"
    }


# ============================================================
#                     ANALYZE VIDEO
# ============================================================

@app.post("/analyze")
async def analyze_video(
    file: UploadFile = File(...)
):

    if not file.filename:

        return {

            "success": False,

            "error":
                "No file provided."

        }


    webm_path = None
    converted_path = None


    try:

        # ----------------------------------------------------
        # Save uploaded WebM
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".webm"
        ) as temp_file:

            webm_path = temp_file.name

            contents = await file.read()

            temp_file.write(
                contents
            )


        print()
        print("=" * 60)
        print("             PULSEGARD API REQUEST")
        print("=" * 60)

        print()

        print(
            "Received:",
            file.filename
        )

        print(
            "Uploaded WebM:",
            webm_path
        )


        # ----------------------------------------------------
        # Convert WebM → MP4
        # ----------------------------------------------------

        print()
        print(
            "Converting WebM to MP4..."
        )


        converted_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".mp4"
        )

        converted_path = (
            converted_file.name
        )

        converted_file.close()


        conversion = subprocess.run(

            [
                "ffmpeg",

                "-y",

                "-i",
                webm_path,

                "-c:v",
                "libx264",

                "-pix_fmt",
                "yuv420p",

                "-an",

                converted_path
            ],

            capture_output=True,

            text=True,

            encoding="utf-8",

            errors="replace"
        )


        if conversion.returncode != 0:

            print(
                conversion.stderr
            )

            return {

                "success": False,

                "error":
                    "WebM to MP4 conversion failed.",

                "details":
                    conversion.stderr

            }


        print(
            "Conversion successful."
        )

        print(
            "Converted video:",
            converted_path
        )


        # ----------------------------------------------------
        # Run main.py
        # ----------------------------------------------------

        print()
        print(
            "Running PulseGuard pipeline..."
        )


        process = subprocess.run(

            [
                sys.executable,

                "main.py",

                converted_path
            ],

            capture_output=True,

            text=True,

            encoding="utf-8",

            errors="replace"
        )


        # ----------------------------------------------------
        # Print main.py output
        # ----------------------------------------------------

        print(
            process.stdout
        )


        # ----------------------------------------------------
        # Check main.py
        # ----------------------------------------------------

        if process.returncode != 0:

            print(
                process.stderr
            )

            return {

                "success": False,

                "error":
                    "PulseGuard analysis failed.",

                "details":
                    process.stderr

            }


        # ----------------------------------------------------
        # Check features.json
        # ----------------------------------------------------

        if not os.path.exists(
            "features.json"
        ):

            return {

                "success": False,

                "error":
                    "features.json was not generated."

            }


        # ----------------------------------------------------
        # Load features
        # ----------------------------------------------------

        print(
            "Loading extracted features..."
        )


        with open(
            "features.json",
            "r"
        ) as f:

            features = json.load(f)


        # ----------------------------------------------------
        # Run ML prediction
        # ----------------------------------------------------

        print()
        print(
            "Running ML prediction..."
        )


        from predict import predict_from_features


        prediction = predict_from_features(
            features
        )


        # ----------------------------------------------------
        # Sanitize prediction
        #
        # Converts:
        #
        # NaN       → null
        # Infinity  → null
        # -Infinity → null
        #
        # This prevents FastAPI JSON serialization errors.
        # ----------------------------------------------------

        prediction = sanitize_for_json(
            prediction
        )


        # ----------------------------------------------------
        # Print prediction
        # ----------------------------------------------------

        print()
        print("=" * 60)
        print("                 PULSEGARD PREDICTION")
        print("=" * 60)

        print()

        print(
            "Verdict:",
            prediction.get(
                "verdict"
            )
        )


        score = prediction.get(
            "score"
        )


        if score is not None:

            print(
                "Model score:",
                f"{score * 100:.2f}%"
            )

        else:

            print(
                "Model score: N/A"
            )


        real_probability = prediction.get(
            "real_probability"
        )


        if real_probability is not None:

            print(
                "Real probability:",
                f"{real_probability * 100:.2f}%"
            )

        else:

            print(
                "Real probability: N/A"
            )


        fake_probability = prediction.get(
            "fake_probability"
        )


        if fake_probability is not None:

            print(
                "Fake probability:",
                f"{fake_probability * 100:.2f}%"
            )

        else:

            print(
                "Fake probability: N/A"
            )


        print()


        # ----------------------------------------------------
        # Analysis complete
        # ----------------------------------------------------

        print(
            "Analysis complete."
        )

        print(
            "Returning result to extension..."
        )

        print()


        # ----------------------------------------------------
        # Return JSON to Chrome extension
        # ----------------------------------------------------

        return {

            "success": True,

            "result": prediction

        }


    except Exception as e:

        print()
        print(
            "API ERROR:",
            str(e)
        )
        print()


        return {

            "success": False,

            "error":
                str(e)

        }


    finally:

        # ----------------------------------------------------
        # Delete temporary WebM
        # ----------------------------------------------------

        if (

            webm_path

            and

            os.path.exists(
                webm_path
            )

        ):

            os.remove(
                webm_path
            )


        # ----------------------------------------------------
        # Delete temporary MP4
        # ----------------------------------------------------

        if (

            converted_path

            and

            os.path.exists(
                converted_path
            )

        ):

            os.remove(
                converted_path
            )