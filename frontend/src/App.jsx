
import { useState } from "react";
import "./App.css";

function App() {
  const [difficulty, setDifficulty] = useState("Easy");
  const [theme, setTheme] = useState("Murder Mystery");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [mystery, setMystery] = useState(null);
  const [discoveredClues, setDiscoveredClues] = useState([]);
  const [score, setScore] = useState(0);
  const [clueLoading, setClueLoading] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [hints, setHints] = useState([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(0);
  const [selectedSuspect, setSelectedSuspect] = useState("");
  const [accusationLoading, setAccusationLoading] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  async function createMystery() {
    setLoading(true);
    setMessage("");
    setMystery(null);
    setDiscoveredClues([]);
    setScore(0);
    setHints([]);
    setHintsUsed(0);
    setHintsRemaining(0);
    setSelectedSuspect("");
    setAccusationLoading(false);
    setFinalResult(null);

    try {
      const response = await fetch("http://localhost:5000/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme,
          difficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Mystery generation failed.");
      }

      setMystery(data.case);
      setScore(data.case.score);
      setHintsUsed(data.case.hintsUsed || 0);
      setHintsRemaining(
        data.case.hintsRemaining ?? (difficulty === "Easy" ? 2 : 3)
      );
      setMessage("Your mystery case has been generated successfully!");
    } catch (error) {
      console.error("Mystery generation error:", error);
      setMessage(error.message || "Could not generate the mystery.");
    } finally {
      setLoading(false);
    }
  }

  async function discoverClue(clueId) {
    if (!mystery || discoveredClues.includes(clueId)) {
      return;
    }

    setClueLoading(clueId);
    setMessage("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/cases/${mystery.id}/clues/${clueId}/discover`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not discover the clue.");
      }

      setDiscoveredClues((previous) => [
        ...previous,
        data.clue.id,
      ]);

      setScore(data.score);
      setMessage(data.message);
    } catch (error) {
      console.error("Clue discovery error:", error);
      setMessage(error.message || "Could not discover the clue.");
    } finally {
      setClueLoading("");
    }
  }

  // Request a hint from Gemini.
  async function requestHint() {
    if (!mystery || hintLoading || hintsRemaining <= 0) {
      return;
    }

    setHintLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/cases/${mystery.id}/hints`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not generate a hint.");
      }

      setHints((previous) => [...previous, data.hint]);
      setHintsUsed(data.hintsUsed);
      setHintsRemaining(data.hintsRemaining);
      setScore(data.score);
      setMessage(data.message);
    } catch (error) {
      console.error("Hint generation error:", error);
      setMessage(error.message || "Could not generate a hint.");
    } finally {
      setHintLoading(false);
    }
  }
  // Submit the suspect accusation.
async function submitAccusation() {
  if (!mystery || !selectedSuspect || accusationLoading) {
    setMessage("Please select a suspect before accusing.");
    return;
  }

  setAccusationLoading(true);
  setMessage("");

  try {
    const response = await fetch(
      `http://localhost:5000/api/cases/${mystery.id}/accuse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          suspectId: selectedSuspect,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Could not submit your accusation.");
    }

    setFinalResult(data.result);
    setScore(data.result.score);
    setMessage(data.message || "Your accusation has been submitted!");
  } catch (error) {
    console.error("Accusation error:", error);
    setMessage(error.message || "Could not submit your accusation.");
  } finally {
    setAccusationLoading(false);
  }
}
  return (
    <main className="app">
      <nav className="navbar">
        <h2>🔎 Mystery Room</h2>
        <span>AI Detective Experience</span>
      </nav>

      <section className="hero">
        <p className="eyebrow">YOUR NEXT CASE AWAITS</p>

        <h1>
          Can You Solve
          <br />
          The Mystery?
        </h1>

        <p className="description">
          Investigate suspects, discover hidden clues, and use your
          detective skills to uncover the truth.
        </p>

        <div className="case-card">
          <label htmlFor="theme">Choose Mystery Theme</label>

          <select
            id="theme"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option>Murder Mystery</option>
            <option>Missing Person</option>
            <option>Art Theft</option>
            <option>Bank Robbery</option>
          </select>

          <label htmlFor="difficulty">Select Difficulty</label>

          <select
            id="difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>

          <button onClick={createMystery} disabled={loading}>
            {loading ? "Generating Mystery..." : "Start Investigation →"}
          </button>

          {message && <p className="status">{message}</p>}

          {mystery && (
            <div className="mystery-result">
              <h2>{mystery.title}</h2>
              <p>{mystery.description}</p>

              <h3>Investigation Score: {score}</h3>

              <p>
                Clues discovered: {discoveredClues.length} /{" "}
                {mystery.clues.length}
              </p>

              <h3>Suspects</h3>

              {mystery.suspects.map((suspect) => (
                <div key={suspect.id}>
                  <strong>{suspect.name}</strong>
                  <p>{suspect.occupation}</p>
                  <p>{suspect.description}</p>
                  <p>Alibi: {suspect.alibi}</p>
                </div>
              ))}

              <h3>Discover Clues</h3>

              {mystery.clues.map((clue) => {
                const isDiscovered = discoveredClues.includes(clue.id);

                return (
                  <div key={clue.id}>
                    <strong>{clue.title}</strong>
                    <p>Location: {clue.location}</p>

                    {isDiscovered ? (
                      <>
                        <p>{clue.description}</p>
                        <p>✓ Clue discovered (+5 points)</p>
                      </>
                    ) : (
                      <button
                        onClick={() => discoverClue(clue.id)}
                        disabled={clueLoading !== ""}
                      >
                        {clueLoading === clue.id
                          ? "Discovering..."
                          : "Discover Clue"}
                      </button>
                    )}
                  </div>
                );
              })}

              <hr />

              <h3>💡 Detective Hints</h3>

              <p>
                Hints used: {hintsUsed} | Hints remaining: {hintsRemaining}
              </p>

              <p>Each hint costs 10 investigation points.</p>

              <button
                onClick={requestHint}
                disabled={hintLoading || hintsRemaining <= 0}
              >
                {hintLoading
                  ? "Generating Hint..."
                  : hintsRemaining > 0
                    ? "Request Hint (-10 points)"
                    : "No Hints Remaining"}
              </button>

              {hints.map((hint, index) => (
                <div key={index}>
                  <h4>Hint {index + 1}</h4>
                  <p>{hint}</p>
                </div>
              ))}
              {/* Accusation section */}
{!finalResult && (
  <>
    <hr />
    <h3>🕵️ Make Your Accusation</h3>
    <p>Select the suspect you believe is responsible.</p>

    <select
      value={selectedSuspect}
      onChange={(event) => setSelectedSuspect(event.target.value)}
      disabled={accusationLoading}
    >
      <option value="">Choose a suspect</option>

      {mystery.suspects.map((suspect) => (
        <option key={suspect.id} value={suspect.id}>
          {suspect.name}
        </option>
      ))}
    </select>

    <button
      onClick={submitAccusation}
      disabled={accusationLoading || !selectedSuspect}
    >
      {accusationLoading ? "Submitting..." : "Submit Accusation"}
    </button>
  </>
)}

{/* Final result */}
{finalResult && (
  <>
    <hr />
    <h2>
  {finalResult.isCorrect
    ? "🎉 Case Solved!"
    : "❌ Incorrect Accusation"}
</h2>

    <p>
      <strong>Correct culprit:</strong>{" "}
      {typeof finalResult.culprit === "object"
        ? finalResult.culprit.name
        : finalResult.culprit}
    </p>

    <p>
      <strong>Explanation:</strong> {finalResult.explanation}
    </p>

    <h3>Final Score: {finalResult.score}</h3>

    <button onClick={createMystery}>Start New Mystery</button>
  </>
)}
            </div>
          )}
        </div>
      </section>

      <footer>
        AI Mystery Room · Think carefully. Trust the clues.
      </footer>
    </main>
  );
}

export default App;
