# ML Risk Assessment Setup

This directory contains the Python ML script for risk assessment.

## Installation

### Quick Install (Recommended)

```bash
# Run the installation script
./install_dependencies.sh

# Or manually:
chmod +x install_dependencies.sh
./install_dependencies.sh
```

### Using `uv` (Recommended - Fast)

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies (make sure to use the same Python as python3)
# Option 1: Install to system Python
uv pip install -r requirements.txt --python $(which python3)

# Option 2: Or use uv sync (if you have a pyproject.toml)
uv sync

# Option 3: Or specify Python path explicitly
uv pip install -r requirements.txt --python /usr/bin/python3
```

### Using `pip` (Alternative)

```bash
# Make sure you're using the same Python as the scripts
python3 -m pip install -r requirements.txt

# Or if you have pip3
pip3 install -r requirements.txt
```

### Troubleshooting

If `uv pip install` doesn't work, try:

```bash
# Check which Python uv is using
uv pip list

# Install to specific Python
uv pip install -r requirements.txt --python $(which python3)

# Or use pip directly
python3 -m pip install -r requirements.txt
```

**Note**: The scripts use `#!/usr/bin/env python3`, so make sure packages are installed for the same Python that `python3` points to.

## Usage

The script is called automatically by the Node.js backend via `RiskAssessmentService`.

Manual testing:

```bash
python3 assess_risk.py '{"user": {"nationalId": "1XXXXXXXXX", "personType": "Citizen", "nationality": "Saudi"}, ...}'
```

## Models

All models are located in `../../DeepLearning_Classification/Models/`:

- `shadow_id_scaler.pkl` - StandardScaler
- `shadow_id_autoencoder.keras` - Autoencoder
- `shadow_id_encoder.keras` - Encoder
- `shadow_id_risk_classifier_rf.pkl` - RandomForest Classifier
- `shadow_id_feature_names.json.json` - Feature names
- `shadow_id_label_mapping.json.json` - Label mapping

## Dependencies

- numpy
- pandas
- scikit-learn
- tensorflow
- joblib
