# ShadowID - Absher Tuwaiq (أبشر طويق)

A secure, temporary identity system for Saudi Arabia that allows citizens to generate time-limited "Shadow IDs" for service verification without exposing their sensitive National ID data.

> **Hackathon Project:** Absher Tuwaiq - Team Basmah (فريق بصمة)

## 🔗 Quick Links
- **For Users (Mobile App):** [https://shadow-id.sudorw.com](https://shadow-id.sudorw.com)
- **For Admins (Dashboard):** [https://shadow-id.sudorw.com/admin](https://shadow-id.sudorw.com/admin)

---

## 📂 Project Structure & Architecture

This project is organized into four main modules: Backend, Mobile Frontend, Admin Dashboard, and AI/ML Core.

### 1. 📱 Mobile Frontend (`/Frontend`)
The user-facing web application designed for mobile view. It handles user authentication, ID generation, and history tracking.
* **Core Pages:**
  * `auth.html`: User login and authentication interface.
  * `dashboard.html`: Main landing page showing current status.
  * `id-details.html`: Displays the active "Shadow ID" and QR code.
  * `activity.html`: Log of previous ID usages and locations.
  * `scanner.html`: Interface for verifying IDs (for service providers).
  * `settings.html`: User profile and preferences.
* **Assets:** Contains `js/`, `styles/`, and `logo.png`.

### 2. 📊 Admin & Analytics Dashboard (`/Dashboard-idntity`)
A specialized dashboard for MOI (Ministry of Interior) and administrators to monitor risks and analyze data using LLMs.
* **`RAG_ShadowID_MOI.ipynb`**: Jupyter Notebook containing the **RAG (Retrieval-Augmented Generation)** logic for generating security reports using LLMs.
* **Web Interface:** `index.html`, `app.js`, `styles.css` for the admin visualization panel.

### 3. 🧠 AI & Machine Learning (`/DeepLearning_Classification`)
Contains the trained models used for risk assessment and anomaly detection.
* **`Dataset/`**: Data used for training and validation.
* **`Models/`**: Saved trained models (Autoencoder & RandomForest).
* **`DeepLearning&Classification_Source.py`**: Source code for the training pipeline and classification logic using nueral networks.

### 4. ⚙️ Backend API (`/backend`)
The core logic engine built with **Express.js** and **TypeScript**.
* **`src/`**: Application source code (Controllers, Routes, Services).
* **`ml/`**: Python integration scripts bridging Node.js with the AI models.
* **`data/`**: SQLite database files.
* **Infrastructure:** `Dockerfile.backend`, `docker-compose.yml` for containerization.

### 5. 📄 Documentation & Presentation (`/Presentation`)
* Contains the hackathon presentation deck: `......هاكاثون أبشر طويق - فريق بصمة`.

---

## 🎯 Project Overview

ShadowID enables citizens to:

- Generate temporary QR codes (valid for 3 minutes)
- Use QR codes at registered services (banks, government offices, etc.)
- Track all usage in an activity log
- Maintain privacy while accessing services

  ## 👥 Contributors

- **Raniyah Alghamdi** – [LinkedIn](https://www.linkedin.com/in/raniyah-alghamdi?)  
- **Shahad bin judia** – [LinkedIn](https://www.linkedin.com/in/shahad-bin-judia-bb7b39325?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app)  
- **Bushra Abu Fayyah** – [LinkedIn](https://www.linkedin.com/in/ahmed-rowaihi?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app)
- **Mohammed Alliheedi** – [LinkedIn](https://www.linkedin.com/in/mohammed-alliheedi-ph-d-41262316?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app)
- **Ahmed Rowaihi** – [LinkedIn](https://www.linkedin.com/in/ahmed-rowaihi?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app)
- **Abrar** – [LinkedIn](https://www.linkedin.com/in/abrar-al?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app)

## 🚀 Quick Start

### Option 1: Docker (Recommended)
Run the entire stack (Backend, Frontend, AI Services) with one command:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
