"""
QPAudioEraser Demo — Quantum-Inspired Audio Unlearning
Flask web application for demonstrating the QPAudioEraser framework.
Authors: Shreyansh Pathak, Sonu Shreshtha, Richa Singh, Mayank Vatsa
IAB Lab, IIT Jodhpur
"""

from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(BASE_DIR, "static", "audio")
PAPER_DIR = BASE_DIR


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/audio/<filename>")
def serve_audio(filename):
    return send_from_directory(AUDIO_DIR, filename)


@app.route("/paper")
def serve_paper():
    return send_from_directory(
        PAPER_DIR, "Quantum-Inspired Audio Unlearning.pdf"
    )


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  QPAudioEraser — Interactive Unlearning Demo")
    print("  IAB Lab, IIT Jodhpur")
    print("=" * 60)
    print("  Open http://127.0.0.1:5001 in your browser")
    print("=" * 60 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5001)
