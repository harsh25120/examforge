/**
 * results.js
 * ----------
 * Renders the results page after quiz submission.
 *
 * Reads the results object saved in sessionStorage by quiz.js,
 * then:
 *   1. Animates the donut chart to show the score percentage
 *   2. Fills in the stat boxes (correct, wrong, total, violations)
 *   3. Shows a pass/fail badge
 *   4. Renders each question with the user's answer vs correct answer
 *
 * The donut chart is a pure SVG/CSS trick — no chart library needed.
 * INTERVIEW TIP: Explain how stroke-dasharray works on SVG circles.
 */

// ---- Load results from sessionStorage ----
const resultsRaw = sessionStorage.getItem("quizResults");

if (!resultsRaw) {
  // If no results, redirect back home
  window.location.href = "/";
}

const results = JSON.parse(resultsRaw);

// ---- DOM elements ----
const scorePct       = document.getElementById("scorePct");
const donutFill      = document.getElementById("donutFill");
const statCorrect    = document.getElementById("statCorrect");
const statWrong      = document.getElementById("statWrong");
const statTotal      = document.getElementById("statTotal");
const statViolations = document.getElementById("statViolations");
const resultBadge    = document.getElementById("resultBadge");
const penaltyNote    = document.getElementById("penaltyNote");
const reviewList     = document.getElementById("reviewList");

// =====================================================
// POPULATE SCORE CARD
// =====================================================

/**
 * The SVG donut chart works like this:
 *   - The circle has a circumference of 2 * π * r = 2 * 3.14 * 50 ≈ 314px
 *   - stroke-dasharray="X 314" draws X pixels of stroke, then 314px of gap
 *   - So X = (percentage / 100) * 314 fills the correct portion of the circle
 *
 * We animate it by starting at "0 314" and transitioning to the real value.
 * The CSS transition on .donut-fill handles the animation smoothly.
 */
function renderDonut(percentage) {
  const circumference = 314; // 2 * π * 50
  const filled = (percentage / 100) * circumference;

  // Small delay so the CSS transition plays on load
  setTimeout(() => {
    donutFill.setAttribute("stroke-dasharray", `${filled} ${circumference}`);
  }, 200);

  scorePct.textContent = percentage + "%";
}

// Fill stats
const correct   = results.raw_score;
const total     = results.total;
const wrong     = total - results.raw_score;  // raw wrong (before penalty)
const pct       = results.percentage;

renderDonut(pct);

statCorrect.textContent    = correct;
statWrong.textContent      = results.total - results.raw_score;
statTotal.textContent      = total;
statViolations.textContent = results.violations;

// Pass/Fail: we consider 50% a passing grade
if (pct >= 50) {
  resultBadge.textContent = "🎉 Passed";
  resultBadge.className = "result-badge pass";
} else {
  resultBadge.textContent = "❌ Failed";
  resultBadge.className = "result-badge fail";
}

// Show penalty note if there were violations that reduced the score
if (results.penalty > 0) {
  penaltyNote.style.display = "block";
  penaltyNote.textContent =
    `⚠️ ${results.violations} proctoring violation(s) detected. ` +
    `${results.penalty} point(s) deducted from your score.`;
}

// =====================================================
// RENDER ANSWER REVIEW LIST
// =====================================================

/**
 * Shows each question with:
 *   - The question text
 *   - What the user answered
 *   - What the correct answer was
 *   - An explanation (from the backend)
 */
function addText(parent, tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  parent.appendChild(element);
  return element;
}

results.results.forEach((item, i) => {
  const div = document.createElement("div");
  div.className = "review-item " + (item.is_correct ? "correct-item" : "wrong-item");
  // Stagger the animation so cards appear one by one
  div.style.animationDelay = `${i * 0.06}s`;

  const icon = item.is_correct ? "✅" : "❌";
  const userAns = item.user_answer || "— (not answered)";
  const userClass = item.is_correct ? "answer-yours" : "answer-yours wrong-ans";
  addText(div, "p", "review-q-num", `${icon} Question ${item.id}`);
  addText(div, "p", "review-q-text", item.question);
  const answers = document.createElement("div");
  answers.className = "review-answers";
  const yours = addText(answers, "span", userClass, "Your answer: ");
  addText(yours, "strong", "", userAns);
  const correctAnswer = addText(answers, "span", "answer-correct", "Correct: ");
  addText(correctAnswer, "strong", "", item.correct_answer);
  div.appendChild(answers);
  if (item.explanation) addText(div, "p", "review-explanation", `💡 ${item.explanation}`);

  reviewList.appendChild(div);
});
