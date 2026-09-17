/**
 * quiz.js
 * -------
 * Core logic for the quiz taking experience.
 *
 * This file handles:
 *   1. Loading questions from sessionStorage
 *   2. Rendering each question (MCQ or True/False)
 *   3. Countdown timer with warning at <60 seconds
 *   4. Proctoring: tab switch detection, fullscreen request
 *   5. Tracking user's answers in a responses object
 *   6. Submitting the quiz to the Flask backend
 *   7. Redirecting to the results page
 *
 * INTERVIEW TIP: Be ready to explain each event listener here —
 * especially visibilitychange and fullscreenchange.
 */

// =====================================================
// LOAD DATA FROM SESSION STORAGE
// (Set by upload.js on the previous page)
// =====================================================

const questions     = JSON.parse(sessionStorage.getItem("questions") || "[]");
const attemptId     = sessionStorage.getItem("attemptId") || "";
const timerDuration = parseInt(sessionStorage.getItem("timerDuration") || "600");
const proctoring    = sessionStorage.getItem("proctoring") || "on";

// If there are no questions, something went wrong — go back home
if (questions.length === 0) {
  alert("No questions found. Please upload a PDF first.");
  window.location.href = "/";
}

// =====================================================
// STATE
// =====================================================

let currentIndex  = 0;              // Which question we're on (0-based)
let responses     = {};             // Maps question id (string) → user's answer
let violations    = 0;              // Number of proctoring violations
let timerSeconds  = timerDuration;  // Countdown seconds remaining
let timerInterval = null;           // setInterval reference for the timer
let examStarted   = false;          // Whether the exam is actively running
let isSubmitting  = false;          // Prevent duplicate submissions from clicks/timeouts
let lastViolationAt = 0;             // Avoid counting one browser switch twice

// =====================================================
// DOM ELEMENTS
// =====================================================

const questionText      = document.getElementById("questionText");
const questionTypeLabel = document.getElementById("questionTypeLabel");
const optionsGrid       = document.getElementById("optionsGrid");
const tfButtons         = document.getElementById("tfButtons");
const trueBtn           = document.getElementById("trueBtn");
const falseBtn          = document.getElementById("falseBtn");
const questionCounter   = document.getElementById("questionCounter");
const progressFill      = document.getElementById("progressFill");
const timerDisplay      = document.getElementById("timerDisplay");
const timerBox          = document.getElementById("timerBox");
const navDots           = document.getElementById("navDots");
const prevBtn           = document.getElementById("prevBtn");
const nextBtn           = document.getElementById("nextBtn");
const submitRow         = document.getElementById("submitRow");
const proctorBanner     = document.getElementById("proctorBanner");
const violationStrip    = document.getElementById("violationStrip");
const violationCount    = document.getElementById("violationCount");
const fullscreenModal   = document.getElementById("fullscreenModal");

// =====================================================
// FULLSCREEN HANDLING
// =====================================================

/**
 * Called when user clicks "Enter Fullscreen & Start".
 * Requests fullscreen on the document element and starts the exam.
 */
function startExam() {
  const el = document.documentElement;
  // requestFullscreen is a Promise — but we start the exam regardless
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen(); // Safari support
  }
  fullscreenModal.style.display = "none";
  beginExam();
}

/**
 * Called when user skips fullscreen.
 * Exam still works, just without fullscreen enforcement.
 */
function startExamNoFullscreen() {
  fullscreenModal.style.display = "none";
  beginExam();
}

/**
 * Starts the exam: renders first question, starts timer.
 */
function beginExam() {
  examStarted = true;
  buildNavDots();
  renderQuestion(0);
  startTimer();

  // If proctoring is off, hide violation strip
  if (proctoring !== "on") {
    violationStrip.style.display = "none";
  }
}

// =====================================================
// PROCTORING LOGIC
// =====================================================

/**
 * Tab Switch Detection using the Page Visibility API.
 *
 * The `visibilitychange` event fires whenever the user:
 *   - Switches to another browser tab
 *   - Minimizes the window
 *   - Presses Alt+Tab to another app
 *
 * document.hidden is true when the page is not visible.
 *
 * INTERVIEW EXPLANATION:
 *   The Page Visibility API (document.hidden + visibilitychange event)
 *   was designed to help developers pause videos/animations when users
 *   switch tabs. We repurpose it here for proctoring.
 */
document.addEventListener("visibilitychange", () => {
  if (!examStarted || proctoring !== "on") return;

  if (document.hidden) {
    recordViolation("Tab switch detected");
  }
});

/**
 * Fullscreen exit detection.
 *
 * When the user presses Escape or otherwise leaves fullscreen,
 * the `fullscreenchange` event fires. We check if fullscreen is still
 * active and warn the user if they exited.
 */
document.addEventListener("fullscreenchange", () => {
  if (!examStarted || proctoring !== "on") return;

  if (!document.fullscreenElement) {
    recordViolation("Fullscreen exit detected");
  }
});

// Also catch window focus loss (user Alt+Tabs to another app)
window.addEventListener("blur", () => {
  if (!examStarted || proctoring !== "on") return;
  recordViolation("Window focus lost");
});

/**
 * Records a proctoring violation.
 * Shows the warning banner and increments the counter.
 */
function recordViolation(reason) {
  const now = Date.now();
  if (now - lastViolationAt < 750) return;
  lastViolationAt = now;
  violations++;
  console.warn(`[Proctor] Violation #${violations}: ${reason}`);

  // Show the red banner at the top
  proctorBanner.style.display = "flex";

  // Show and update the violation counter strip
  violationStrip.style.display = "block";
  violationCount.textContent = violations;

  // Auto-hide the banner after 5 seconds
  setTimeout(() => {
    proctorBanner.style.display = "none";
  }, 5000);
}

// =====================================================
// COUNTDOWN TIMER
// =====================================================

/**
 * Starts the countdown timer.
 * Updates the display every second.
 * Adds a "warning" style when under 60 seconds.
 * Auto-submits when time reaches 0.
 */
function startTimer() {
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();

    // Warning: less than 60 seconds remaining
    if (timerSeconds <= 60) {
      timerBox.classList.add("warning");
    }

    // Time's up!
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      submitExam(true);
    }
  }, 1000);
}

/**
 * Converts seconds to MM:SS format and updates the DOM.
 * Example: 305 seconds → "5:05"
 */
function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  // padStart(2, '0') adds a leading zero if needed: 5 → "05"
  timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
}

// =====================================================
// QUESTION RENDERING
// =====================================================

/**
 * Renders the question at the given index.
 * Handles both MCQ and True/False question types.
 */
function renderQuestion(index) {
  const q = questions[index];
  if (!q) return;

  currentIndex = index;

  // Update header stats
  questionCounter.textContent = `Question ${index + 1} / ${questions.length}`;
  const progress = ((index + 1) / questions.length) * 100;
  progressFill.style.width = progress + "%";

  // Question content
  questionTypeLabel.textContent = q.type === "mcq" ? "MCQ" : "True / False";
  questionText.textContent = q.question;

  // Render options based on type
  if (q.type === "mcq") {
    renderMCQ(q);
  } else {
    renderTrueFalse(q);
  }

  // Update navigation buttons
  prevBtn.disabled = index === 0;
  nextBtn.style.display = index < questions.length - 1 ? "block" : "none";
  submitRow.style.display = index === questions.length - 1 ? "block" : "none";

  // Update nav dots
  updateNavDots(index);
}

/**
 * Renders MCQ option buttons for a question.
 * Highlights the previously selected answer if the user navigated back.
 */
function renderMCQ(q) {
  optionsGrid.innerHTML = "";  // Clear previous options
  optionsGrid.style.display = "grid";
  tfButtons.style.display = "none";

  const savedAnswer = responses[q.id];  // Check if user already answered this

  q.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = option;

    // If user already picked this option, mark it selected
    if (savedAnswer === option) btn.classList.add("selected");

    btn.addEventListener("click", () => {
      // Deselect all options, then select this one
      document.querySelectorAll(".option-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      // Save the answer
      responses[q.id] = option;
      markDotAnswered(currentIndex);
    });

    optionsGrid.appendChild(btn);
  });
}

/**
 * Renders True/False buttons.
 */
function renderTrueFalse(q) {
  optionsGrid.style.display = "none";
  tfButtons.style.display = "flex";

  const saved = responses[q.id];
  trueBtn.classList.toggle("selected",  saved === "True");
  falseBtn.classList.toggle("selected", saved === "False");
}

/**
 * Called when user clicks True or False.
 */
function selectTF(value) {
  const q = questions[currentIndex];
  responses[q.id] = value;

  trueBtn.classList.toggle("selected",  value === "True");
  falseBtn.classList.toggle("selected", value === "False");

  markDotAnswered(currentIndex);
}

// =====================================================
// NAVIGATION DOT INDICATORS
// =====================================================

/**
 * Creates the row of small dots at the bottom of the quiz.
 * One dot per question. Clicking jumps to that question.
 */
function buildNavDots() {
  navDots.innerHTML = "";
  questions.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "nav-dot";
    dot.dataset.index = i;
    dot.addEventListener("click", () => renderQuestion(i));
    navDots.appendChild(dot);
  });
}

function updateNavDots(activeIndex) {
  document.querySelectorAll(".nav-dot").forEach((dot, i) => {
    dot.classList.remove("current");
    if (i === activeIndex) dot.classList.add("current");
  });
}

function markDotAnswered(index) {
  const dot = document.querySelector(`.nav-dot[data-index="${index}"]`);
  if (dot) dot.classList.add("answered");
}

// =====================================================
// NAVIGATION BUTTONS
// =====================================================

function nextQuestion() {
  if (currentIndex < questions.length - 1) {
    renderQuestion(currentIndex + 1);
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    renderQuestion(currentIndex - 1);
  }
}

// =====================================================
// SUBMIT EXAM
// =====================================================

/**
 * Submits the quiz to the backend and redirects to results.
 *
 * Sends:
 *   - questions: the original question objects (with correct answers)
 *   - responses: the user's answers
 *   - violations: number of proctoring violations
 *
 * The backend calculates the score and returns detailed results.
 */
async function submitExam(timedOut = false) {
  if (isSubmitting) return;
  isSubmitting = true;
  clearInterval(timerInterval);  // Stop the timer

  // Close any open modals
  document.getElementById("timeUpModal").style.display = "none";

  try {
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: attemptId, responses, violations })
    });

    const data = await response.json();

    if (!response.ok) {
      alert("Error submitting quiz: " + (data.error || "Unknown error"));
      if (timedOut) document.getElementById("timeUpModal").style.display = "flex";
      isSubmitting = false;
      return;
    }

    // Save results to sessionStorage so results.html can read them
    sessionStorage.setItem("quizResults", JSON.stringify(data));

    // Navigate to results page
    window.location.href = "/results";

  } catch (err) {
    alert(timedOut ? "Time expired, but we could not submit your answers. Please reconnect and use View Results." : "Could not submit quiz. Check your connection.");
    if (timedOut) document.getElementById("timeUpModal").style.display = "flex";
    isSubmitting = false;
    console.error(err);
  }
}

// =====================================================
// EXPOSE GLOBALS for inline onclick handlers in HTML
// =====================================================
window.startExam               = startExam;
window.startExamNoFullscreen   = startExamNoFullscreen;
window.nextQuestion            = nextQuestion;
window.prevQuestion            = prevQuestion;
window.selectTF                = selectTF;
window.submitExam              = submitExam;

// A quiz with proctoring disabled should not show a misleading fullscreen prompt.
if (proctoring !== "on") {
  fullscreenModal.style.display = "none";
  beginExam();
}
