# AI Mystery Room – AI Detective Experience

An interactive AI-powered detective mystery game built using React, Vite, Tailwind CSS, Node.js, Express, MongoDB, and Google Gemini API.

## Project Description

AI Mystery Room allows users to investigate AI-generated mystery cases. Players can explore suspects, discover clues, request AI-generated hints, accuse suspects, and view the final solution with an investigation score.

## Features

- AI-generated mystery cases using Google Gemini.
- Three difficulty levels: Easy, Medium, and Hard.
- Multiple suspects and investigation clues.
- Interactive clue discovery system.
- AI-generated hints with score deductions.
- Suspect accusation and result evaluation.
- Investigation scoring system.
- MongoDB database for storing cases and progress.

## Technologies Used

**Frontend:** React, Vite, Tailwind CSS

**Backend:** Node.js, Express.js

**Database:** MongoDB, Mongoose

**AI:** Google Gemini API

## Live Application

https://ai-mystery-room-sepia.vercel.app

## GitHub Repository

https://github.com/Banothu-Nithin/AI-Mystery-Room

## Local Setup

### Prerequisites

- Node.js
- npm
- MongoDB connection string
- Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/Banothu-Nithin/AI-Mystery-Room.git
cd AI-Mystery-Room
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
```

Start the backend:

```bash
npm start
```

### 3. Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

## Security

Never commit API keys, database passwords, or `.env` files to GitHub.

## Author

Banothu Nithin
