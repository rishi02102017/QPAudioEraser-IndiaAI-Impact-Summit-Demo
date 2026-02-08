# QPAudioEraser — Quantum-Inspired Audio Unlearning

**Interactive Demonstration for the IndiaAI Impact Summit 2026**

---

## Overview

QPAudioEraser is a quantum-inspired framework for selectively erasing speaker-specific voice signatures from trained audio classification models, without requiring full model retraining. It addresses the growing need for privacy-preserving mechanisms in voice biometric systems, in compliance with regulations such as GDPR's Right to Be Forgotten and India's Digital Personal Data Protection (DPDP) Act, 2023.

This repository contains the official interactive web demonstration of the QPAudioEraser framework, designed and presented at the **IndiaAI Impact Summit 2026**.

**Paper:** [Quantum-Inspired Audio Unlearning: Towards Privacy-Preserving Voice Biometrics](https://arxiv.org/abs/2507.22208) (arXiv:2507.22208)

---

## Authors

| Name | Role | Affiliation |
|------|------|-------------|
| Shreyansh Pathak | Researcher | IIT Jodhpur |
| Sonu Shrestha | Researcher | IIT Jodhpur |
| Prof. Richa Singh | Faculty | IIT Jodhpur |
| Prof. Mayank Vatsa | Faculty | IIT Jodhpur |

**Lab:** Image Analysis and Biometrics (IAB) Lab, Department of Computer Science and Engineering, Indian Institute of Technology Jodhpur, Rajasthan, India.

---

## The QPAudioEraser Framework

QPAudioEraser operates through a four-phase pipeline, each grounded in principles drawn from quantum physics:

### Phase 1 — Destructive Interference Weight Initialization

The final classification layer weights corresponding to the target (forget) class are transformed using a destructive interference analogy. A cosine phase shift is applied to the weight vector and bias of the forget class, negating and scaling them to immediately suppress the model's confidence for that class, while leaving all other class representations intact.

### Phase 2 — Superposition-Based Label Transformation

Labels for all training samples belonging to the forget class are replaced with a uniform distribution across all classes. This is analogous to placing the class identity into a quantum superposition of all possible states, effectively removing any discriminative signal and maximizing the entropy of the label for the target class.

### Phase 3 — Uncertainty-Maximizing Quantum Loss Optimization

A dual-objective loss function is introduced. For retained classes, standard cross-entropy loss ensures continued high-accuracy classification. For the forget class, the loss maximizes the entropy of the model's predicted distribution, driving it toward a uniform output — equivalent to maximal uncertainty. This phase runs iterative optimization epochs that progressively erase the model's ability to distinguish the target speaker.

### Phase 4 — Entanglement-Inspired Weight Mixing

A mixing matrix blends the optimized weight vector of the forget class with those of retained classes and vice versa. This entanglement-inspired step dilutes any residual discriminative patterns specific to the forgotten class, ensuring complete erasure while preserving the integrity of all other class representations.

---

## Demonstration Features

This web-based demonstration provides a complete, end-to-end walkthrough of the QPAudioEraser pipeline:

### Speaker Audio Samples
- Real voice clips from 10 prominent public figures, sourced from publicly available interviews and speeches.
- Each clip is approximately 12–13 seconds in duration, sampled at 16 kHz (mono).
- All audio samples are playable directly within the browser.

### Model Training Simulation
- Simulates fine-tuning a pretrained **ResNet-18** architecture on 128x128 mel-spectrogram representations for 10-class speaker identification.
- Displays epoch-wise training loss, training accuracy, and per-epoch timing across 10 epochs.
- Upon completion, presents class-wise accuracy, precision, recall, and F1-score for all speakers.
- Final training accuracy converges in the range of 98.3%–98.6%.

### Unlearning Demonstration
- The user selects any one of the 10 speakers as the unlearning target.
- Data statistics for the selected class are displayed prior to unlearning.
- The model's pre-unlearning prediction on the selected speaker's audio is shown, confirming correct identification with high confidence.
- All four phases of QPAudioEraser are executed with real-time progress visualization. Phase 3 includes 4 visible unlearning epochs with quantum loss, forget accuracy decay, and retain accuracy monitoring.
- The total unlearning process runs for approximately 31–32 seconds.
- Post-unlearning, the model misclassifies the erased speaker's audio, while all retained speakers maintain their original accuracy.

### Evaluation Metrics
After unlearning, the following metrics are presented:

| Metric | Description |
|--------|-------------|
| Forget Accuracy (FA) | Classification accuracy on the erased class (target: near 0%) |
| Retain Accuracy (RA) | Classification accuracy on all non-erased classes |
| Privacy Erasure Rate (PER) | Proportion of forget-class samples no longer correctly identified |
| Information Leakage (IL) | Residual information about the erased class |
| False Acceptance Rate (FAR) | Rate at which the erased speaker is incorrectly accepted |
| False Rejection Rate (FRR) | Rate at which the erased speaker is correctly rejected |

### Session Variability
All numerical outputs — training metrics, class-wise accuracies, prediction confidences, unlearning statistics, and misclassification targets — are randomized within realistic bounds on each session. This ensures that repeated demonstrations produce visually distinct but consistently valid results.

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3, Flask |
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Charts | Chart.js 4.4 |
| Typography | Inter (Google Fonts) |
| Icons | Font Awesome 6.5 |
| Audio Format | MP3, 16 kHz, mono |
| Design | Responsive (desktop, tablet, mobile) |

---

## Repository Structure

```
QPAudioEraser-IndiaAI-Impact-Summit-Demo/
├── app.py                                  # Flask application server
├── requirements.txt                        # Python dependencies
├── download_real_audio.py                  # Audio acquisition script (pytubefix + ffmpeg)
├── Quantum-Inspired Audio Unlearning.pdf   # Research paper
├── templates/
│   └── index.html                          # Main HTML template
├── static/
│   ├── css/
│   │   └── style.css                       # Stylesheet (responsive, professional theme)
│   ├── js/
│   │   └── main.js                         # Application logic and simulation engine
│   └── audio/
│       ├── sachin.mp3                      # Mr. Sachin Tendulkar
│       ├── modi.mp3                        # PM Shri Narendra Modi
│       ├── kohli.mp3                       # Mr. Virat Kohli
│       ├── trump.mp3                       # Mr. Donald Trump
│       ├── vaishnav.mp3                    # Mr. Ashwini Vaishnav
│       ├── federer.mp3                     # Mr. Roger Federer
│       ├── chopra.mp3                      # Mrs. Priyanka Chopra
│       ├── bachchan.mp3                    # Mr. Amitabh Bachchan
│       ├── shah.mp3                        # Mr. Amit Shah
│       └── putin.mp3                       # Mr. Vladimir Putin
└── .gitignore
```

---

## Setup and Execution

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

```bash
git clone https://github.com/rishi02102017/QPAudioEraser-IndiaAI-Impact-Summit-Demo.git
cd QPAudioEraser-IndiaAI-Impact-Summit-Demo
pip install -r requirements.txt
```

### Running the Application

```bash
python app.py
```

The application will start on `http://127.0.0.1:5001`. Open this URL in any modern web browser.

### Production Deployment

For production or deployment environments:

```bash
gunicorn app:app --bind 0.0.0.0:5001
```

---

## Experimental Validation (from the research paper)

The QPAudioEraser framework has been comprehensively evaluated across:

**Architectures:** ResNet-18, Vision Transformer (ViT), CNN

**Datasets:**
- AudioMNIST (10 speakers, 30,000 samples)
- Speech Commands (35 command classes)
- LibriSpeech (speaker identification subset)
- Speech Accent Archive (accent-level erasure)

**Key Results:**
- Achieves 0% Forget Accuracy across all tested configurations, confirming complete erasure.
- Retain Accuracy degradation as low as 0.05%, demonstrating negligible impact on model utility.
- Consistently outperforms conventional baselines (fine-tuning, gradient ascent, Fisher scrubbing, knowledge distillation) across single-class, multi-class, sequential, and accent-level erasure scenarios.

For complete experimental results, ablation studies, and complexity analysis, refer to the [research paper](https://arxiv.org/abs/2507.22208).

---

## Citation

If you use this work in your research, please cite:

```bibtex
@article{pathak2025qpaudioeraser,
  title={Quantum-Inspired Audio Unlearning: Towards Privacy-Preserving Voice Biometrics},
  author={Pathak, Shreyansh and Shreshtha, Sonu and Singh, Richa and Vatsa, Mayank},
  journal={arXiv preprint arXiv:2507.22208},
  year={2025}
}
```

---

## Acknowledgements

The interactive web demonstration was designed and developed by **Jyotishman Das**, IAB Lab, IIT Jodhpur.

---

## License

This project is developed at the Image Analysis and Biometrics (IAB) Lab, Indian Institute of Technology Jodhpur. All rights reserved.

---

*Presented at the IndiaAI Impact Summit 2026, New Delhi, India.*
