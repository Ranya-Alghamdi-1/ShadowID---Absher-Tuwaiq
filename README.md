# ShadowID - Absher Tuwaiq

A secure, temporary identity system for Saudi Arabia that allows citizens to generate time-limited Shadow IDs for service verification without exposing their National ID.

# To use the system "ShadowID"
- **For the usesrs** – [ClickHere](https://shadow-id.sudorw.com) 
- **For Admins** – [ClickHere](https://shadow-id.sudorw.com/admin) 

## 🎯 Project Overview

ShadowID enables citizens to:

- Generate temporary QR codes (valid for 3 minutes)
- Use QR codes at registered services (banks, government offices, etc.)
- Track all usage in an activity log
- Maintain privacy while accessing services

## 🚀 Quick Start

### Option 1: Docker (Recommended)

The easiest way to run the entire project with all dependencies:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The server will be available at `http://localhost:3000`

- **Mobile App**: `http://localhost:3000/mobile`
- **Admin Dashboard**: `http://localhost:3000/admin`
- **API**: `http://localhost:3000/api`

**Note**: On first run, LLM models will be downloaded (~3-4GB). To disable LLM features and save space, see [DOCKER_README.md](./DOCKER_README.md).

### Option 2: Local Development

#### Prerequisites

- Node.js 18+ and npm
- TypeScript
- Python 3.8+ (for ML scripts)

#### Installation

```bash
cd backend
npm install

# Install Python ML dependencies
pip3 install -r ml/requirements.txt
```

#### Database Setup

The SQLite database will be automatically created on first run. To seed initial services:

```bash
npm run seed:services
```

#### Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 📁 Project Structure

```
ShadowID---Absher-Tuwaiq/
├── backend/              # Express.js + TypeScript backend
│   ├── src/
│   │   ├── entities/    # TypeORM entities
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── scripts/     # Seed scripts
│   └── data/            # SQLite database
├── Frontend/            # Mobile frontend (HTML/CSS/JS)
├── Dashboard-idntity/   # Admin dashboard
└── DeepLearning_Classification/  # ML models
```

## 📚 Documentation

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Complete technical documentation including:
  - Current status and progress
  - Architecture and database schema
  - All API endpoints
  - QR scanning API documentation
  - Next steps and implementation priorities
  - ML integration strategy
- **[DOCKER_README.md](./DOCKER_README.md)** - Docker setup guide including:
  - Docker Compose configuration
  - Volume management
  - LLM feature toggling
  - Troubleshooting

## 🔑 Key Features

### ✅ Implemented

- **Session-based Authentication** (30 days for mobile, 30 min for admin)
- **Shadow ID Generation** with database persistence
- **QR Code Scanning** with service/portal validation
- **Activity Logging** (automatic on generation & scan)
- **Service Registry** with portal-based location tracking
- **Frontend Integration** with real-time data

### 🚧 In Progress

- ML Integration for risk assessment
- User profile and settings management
- Device management
- Admin dashboard APIs

## 🔐 Service Registration

External services must be registered before they can scan QR codes. Each service has:

- **API Key** for authentication
- **Portals** (branches/locations) with unique portal IDs
- **Location tracking** automatically determined from portal (prevents spoofing)

See [QR_SCAN_API.md](./QR_SCAN_API.md) for integration details.

## 🧠 ML Models

The project includes trained ML models for risk assessment:

- Autoencoder for feature extraction
- RandomForest classifier for risk classification
- Accuracy: 97.88%
- LLM-powered RAG reports (Qwen2.5-1.5B-Instruct)
- AI-generated security recommendations

Models are located in `DeepLearning_Classification/Models/`

**Note**: LLM features can be disabled to save disk space (~4GB). See [DOCKER_README.md](./DOCKER_README.md) for details.

## 🛠️ Tech Stack

- **Backend**: Express.js + TypeScript
- **Database**: TypeORM + SQLite
- **Authentication**: express-session (cookie-based)
- **Frontend**: HTML5/CSS3/JavaScript
- **ML**: Python (Keras, scikit-learn, Transformers)
- **LLM**: Qwen2.5-1.5B-Instruct, Sentence Transformers
- **Deployment**: Docker & Docker Compose

## 📝 License

[Add your license here]

## 👥 Contributors

[Add contributors here]
