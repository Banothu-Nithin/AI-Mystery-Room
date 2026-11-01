
const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const { randomUUID } = require("crypto");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing from the .env file");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Temporary storage. MongoDB will be connected later.
const cases = new Map();

// Generate content with retries for temporary Gemini errors.
async function generateWithRetry(prompt, attempts = 3, jsonMode = false) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const config = {
        maxOutputTokens: 4096,
      };

      if (jsonMode) {
        config.responseMimeType = "application/json";
      }

      return await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config,
      });
    } catch (error) {
      const errorMessage = error.message || "";

      const isTemporaryError =
        errorMessage.includes("503") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED");

      if (!isTemporaryError || attempt === attempts) {
        throw error;
      }

      const waitTime = attempt * 3000;

      console.log(
        `Gemini is busy. Retrying in ${waitTime / 1000} seconds (${attempt + 1}/${attempts})...`
      );

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

// Parse Gemini's mystery JSON response.
function parseMysteryResponse(response) {
  if (!response || !response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  let cleanedText = response.text.trim();

  cleanedText = cleanedText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini returned invalid JSON:", cleanedText);
    throw new Error("Gemini returned incomplete or invalid JSON.");
  }
}

// Extract clean hint text from Gemini's response.
function parseHintResponse(response) {
  if (!response || !response.text) {
    throw new Error("Gemini returned an empty hint.");
  }

  let hint = response.text.trim();

  hint = hint
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsedHint = JSON.parse(hint);

    if (typeof parsedHint.hint === "string") {
      hint = parsedHint.hint.trim();
    } else if (typeof parsedHint === "string") {
      hint = parsedHint.trim();
    }
  } catch (error) {
    // Keep plain-text Gemini responses.
  }

  if (!hint) {
    throw new Error("Gemini returned an empty hint.");
  }

  return hint;
}

// Health check.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
  });
});

// Generate a mystery case.
app.post("/api/cases", async (req, res) => {
  try {
    const {
      theme = "Murder Mystery",
      difficulty = "Easy",
    } = req.body;

    const settings = {
      Easy: { suspects: 3, clues: 5, points: 100 },
      Medium: { suspects: 4, clues: 7, points: 150 },
      Hard: { suspects: 5, clues: 9, points: 200 },
    };

    if (!settings[difficulty]) {
      return res.status(400).json({
        success: false,
        message: "Invalid difficulty.",
      });
    }

    const selected = settings[difficulty];

    const prompt = `
Create an original, logically solvable detective mystery.

Theme: ${theme}
Difficulty: ${difficulty}

Return ONLY valid JSON. Do not use Markdown or code fences.

Use this exact structure:
{
  "title": "Case title",
  "description": "Short mystery introduction",
  "suspects": [
    {
      "id": "s1",
      "name": "Suspect name",
      "occupation": "Occupation",
      "description": "Short description",
      "alibi": "Their stated alibi"
    }
  ],
  "clues": [
    {
      "id": "c1",
      "title": "Clue title",
      "description": "Short clue information",
      "location": "Where it was found",
      "importance": "important or normal"
    }
  ],
  "culpritId": "s1",
  "explanation": "Short explanation connecting the clues to the culprit."
}

Requirements:
- Exactly ${selected.suspects} suspects.
- Exactly ${selected.clues} clues.
- Give every suspect a believable motive and alibi.
- Include fair clues that identify exactly one culprit.
- Keep descriptions and explanations concise.
- Make sure all JSON strings are complete and correctly escaped.
- Do not include text before or after the JSON.
`;

    const response = await generateWithRetry(prompt, 3, true);
    const mystery = parseMysteryResponse(response);

    if (
      !mystery.title ||
      !mystery.description ||
      !Array.isArray(mystery.suspects) ||
      !Array.isArray(mystery.clues) ||
      !mystery.culpritId ||
      !mystery.explanation ||
      mystery.suspects.length !== selected.suspects ||
      mystery.clues.length !== selected.clues ||
      !mystery.suspects.some((s) => s.id === mystery.culpritId)
    ) {
      throw new Error("Gemini returned an invalid mystery structure.");
    }

    const caseId = randomUUID();

    const newCase = {
      id: caseId,
      theme,
      difficulty,
      title: mystery.title,
      description: mystery.description,
      suspects: mystery.suspects,
      clues: mystery.clues,
      culpritId: mystery.culpritId,
      explanation: mystery.explanation,
      discoveredClues: [],
      hintsUsed: 0,
      hintHistory: [],
      score: selected.points,
      status: "investigating",
      accusation: null,
      result: null,
    };

    cases.set(caseId, newCase);

    // Never send culpritId or explanation before accusation.
    const publicCase = {
      id: newCase.id,
      theme: newCase.theme,
      difficulty: newCase.difficulty,
      title: newCase.title,
      description: newCase.description,
      suspects: newCase.suspects,
      clues: newCase.clues.map(({ id, title, location }) => ({
        id,
        title,
        location,
      })),
      score: newCase.score,
      status: newCase.status,
      hintsUsed: newCase.hintsUsed,
      hintsRemaining: difficulty === "Easy" ? 2 : 3,
    };

    return res.status(201).json({
      success: true,
      message: "Mystery generated successfully.",
      case: publicCase,
    });
  } catch (error) {
    console.error("Mystery generation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not generate a mystery. Please try again.",
    });
  }
});

// Discover a clue.
app.post("/api/cases/:id/clues/:clueId/discover", (req, res) => {
  try {
    const { id, clueId } = req.params;
    const mysteryCase = cases.get(id);

    if (!mysteryCase) {
      return res.status(404).json({
        success: false,
        message: "Mystery case not found.",
      });
    }

    if (mysteryCase.status !== "investigating") {
      return res.status(400).json({
        success: false,
        message: "This investigation is no longer active.",
      });
    }

    const clue = mysteryCase.clues.find(
      (item) => item.id === clueId
    );

    if (!clue) {
      return res.status(404).json({
        success: false,
        message: "Clue not found.",
      });
    }

    if (mysteryCase.discoveredClues.includes(clueId)) {
      return res.status(409).json({
        success: false,
        message: "You have already discovered this clue.",
        score: mysteryCase.score,
      });
    }

    mysteryCase.discoveredClues.push(clueId);
    mysteryCase.score += 5;

    return res.status(200).json({
      success: true,
      message: "Clue discovered successfully.",
      clue: {
        id: clue.id,
        title: clue.title,
        description: clue.description,
        location: clue.location,
        importance: clue.importance,
      },
      discoveredClues: mysteryCase.discoveredClues,
      score: mysteryCase.score,
    });
  } catch (error) {
    console.error("Clue discovery error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not discover the clue.",
    });
  }
});

// Request a hint.
app.post("/api/cases/:id/hints", async (req, res) => {
  try {
    const { id } = req.params;
    const mysteryCase = cases.get(id);

    if (!mysteryCase) {
      return res.status(404).json({
        success: false,
        message: "Mystery case not found.",
      });
    }

    if (mysteryCase.status !== "investigating") {
      return res.status(400).json({
        success: false,
        message: "This investigation is no longer active.",
      });
    }

    const hintLimits = {
      Easy: 2,
      Medium: 3,
      Hard: 3,
    };

    const hintLimit = hintLimits[mysteryCase.difficulty];

    if (mysteryCase.hintsUsed >= hintLimit) {
      return res.status(400).json({
        success: false,
        message: "You have used all available hints.",
        hintsUsed: mysteryCase.hintsUsed,
        hintsRemaining: 0,
        score: mysteryCase.score,
      });
    }

    const hintCost = 10;

    if (mysteryCase.score < hintCost) {
      return res.status(400).json({
        success: false,
        message: "You do not have enough points to request a hint.",
        score: mysteryCase.score,
      });
    }

    const discoveredClues = mysteryCase.clues
      .filter((clue) =>
        mysteryCase.discoveredClues.includes(clue.id)
      )
      .map((clue) => ({
        title: clue.title,
        description: clue.description,
        location: clue.location,
      }));

    const prompt = `
You are an expert detective helping a player investigate a mystery.

CASE:
${mysteryCase.title}

STORY:
${mysteryCase.description}

DIFFICULTY:
${mysteryCase.difficulty}

SUSPECTS:
${JSON.stringify(
  mysteryCase.suspects.map((suspect) => ({
    name: suspect.name,
    occupation: suspect.occupation,
    description: suspect.description,
    alibi: suspect.alibi,
  }))
)}

CLUES DISCOVERED BY THE PLAYER:
${JSON.stringify(discoveredClues)}

Generate ONE useful investigative hint.

Rules:
- Guide the player toward a logical connection between evidence and suspect statements.
- Keep the hint short and easy to understand.
- Do not directly name the culprit.
- Do not reveal the culprit ID.
- Do not reveal the final explanation.
- Do not invent clues that are not part of this mystery.
- Do not simply repeat a discovered clue.
- Encourage the player to think like a detective.

Return ONLY plain text.
Do not return JSON.
Do not use Markdown or code fences.
`;

    const response = await generateWithRetry(prompt);
    const hint = parseHintResponse(response);

    // Deduct points only after Gemini successfully generates a hint.
    mysteryCase.hintsUsed += 1;
    mysteryCase.score -= hintCost;
    mysteryCase.hintHistory.push(hint);

    return res.status(200).json({
      success: true,
      message: "Hint generated successfully.",
      hint,
      hintsUsed: mysteryCase.hintsUsed,
      hintsRemaining: hintLimit - mysteryCase.hintsUsed,
      score: mysteryCase.score,
    });
  } catch (error) {
    console.error("Hint generation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not generate a hint. Please try again.",
    });
  }
});

// Submit the player's accusation.
app.post("/api/cases/:id/accuse", (req, res) => {
  try {
    const { id } = req.params;
    const { suspectId } = req.body;

    const mysteryCase = cases.get(id);

    if (!mysteryCase) {
      return res.status(404).json({
        success: false,
        message: "Mystery case not found.",
      });
    }

    if (mysteryCase.status !== "investigating") {
      return res.status(400).json({
        success: false,
        message: "You have already submitted an accusation.",
      });
    }

    if (!suspectId) {
      return res.status(400).json({
        success: false,
        message: "Please select a suspect.",
      });
    }

    const accusedSuspect = mysteryCase.suspects.find(
      (suspect) => suspect.id === suspectId
    );

    if (!accusedSuspect) {
      return res.status(404).json({
        success: false,
        message: "Selected suspect not found.",
      });
    }

    const isCorrect = suspectId === mysteryCase.culpritId;

    // Apply a 50-point penalty for an incorrect accusation.
    if (!isCorrect) {
      mysteryCase.score = Math.max(0, mysteryCase.score - 50);
    }

    mysteryCase.status = "completed";
    mysteryCase.accusation = suspectId;

    mysteryCase.result = {
      isCorrect,
      accusedSuspect: accusedSuspect.name,
      culprit: mysteryCase.suspects.find(
        (suspect) => suspect.id === mysteryCase.culpritId
      ).name,
      explanation: mysteryCase.explanation,
      score: mysteryCase.score,
    };

    return res.status(200).json({
      success: true,
      message: "Accusation submitted successfully.",
      result: mysteryCase.result,
    });
  } catch (error) {
    console.error("Accusation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not submit your accusation.",
    });
  }
});

// Get the final result after accusation.
app.get("/api/cases/:id/result", (req, res) => {
  try {
    const { id } = req.params;
    const mysteryCase = cases.get(id);

    if (!mysteryCase) {
      return res.status(404).json({
        success: false,
        message: "Mystery case not found.",
      });
    }

    if (mysteryCase.status !== "completed" || !mysteryCase.result) {
      return res.status(400).json({
        success: false,
        message: "Submit your accusation to view the final result.",
      });
    }

    return res.status(200).json({
      success: true,
      result: mysteryCase.result,
    });
  } catch (error) {
    console.error("Result retrieval error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve the final result.",
    });
  }
});

// Start backend.
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
