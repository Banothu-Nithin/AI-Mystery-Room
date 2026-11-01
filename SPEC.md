# AI Mystery Room — Project Specification

## 1. Project Overview
AI Mystery Room is a web application where users solve AI-generated mystery cases by investigating suspects, discovering clues, requesting hints, and accusing the culprit.

## 2. Technology Stack
- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MongoDB Atlas with Mongoose
- AI: Google Gemini API
- Frontend deployment: Vercel
- Backend deployment: A Node.js-compatible hosting service

## 3. Main User Flow
1. Open the home page.
2. Choose a mystery theme and difficulty.
3. Generate a new mystery.
4. Review the case description and suspects.
5. Discover clues and request hints.
6. Accuse one suspect.
7. View the verdict and score.
8. Start another mystery.

## 4. Difficulty Settings
- Easy: 3 suspects, 5 clues, 2 hints, 100 starting points.
- Medium: 4 suspects, 7 clues, 3 hints, 150 starting points.
- Hard: 5 suspects, 9 clues, 3 hints, 200 starting points.

## 5. Scoring
- Correctly discovered clue: +5 points.
- Each hint used: −10 points.
- Wrong accusation: no correct-answer bonus.
- Minimum score: 0.
- Correct accusation: award the remaining points as the case score.

## 6. Main Pages
- Home
- Create Mystery
- Investigation Room
- Accusation
- Results

## 7. Backend API Endpoints
- POST /api/cases — generate a mystery.
- GET /api/cases/:id — retrieve a case.
- POST /api/cases/:id/clues/:clueId/discover — discover a clue.
- POST /api/cases/:id/hints — request a hint.
- POST /api/cases/:id/accuse — submit an accusation.
- GET /api/cases/:id/result — retrieve the final result.

## 8. Database
Store the case description, difficulty, suspects, clues, discovered clues, hints used, score, accusation, result, and timestamps.

Keep the culprit identity and solution on the server. Never send the hidden solution to the frontend before the user submits an accusation.

## 9. AI Requirements
- Generate a coherent mystery with a definite culprit.
- Ensure clues support the final solution.
- Give hints without immediately revealing the culprit.
- Validate the AI response before saving it.
- Never expose the Gemini API key in frontend code.

## 10. Security and Validation
- Validate request data on the backend.
- Keep API keys in environment variables.
- Use a .env file locally and exclude it from Git.
- Handle invalid case IDs and failed AI requests.
- Avoid revealing the culprit before the accusation.

## 11. Completion Checklist
- Users can generate a mystery.
- Users can view suspects and discover clues.
- Users can request hints.
- Users can accuse a suspect.
- The result and score are displayed correctly.
- The application works on desktop and mobile.
- The README explains setup and deployment.