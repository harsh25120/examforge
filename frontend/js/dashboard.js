const formatDate = (value) => new Date(`${value}Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const empty = (text) => `<div class="empty-state">${text}</div>`;

function quizRow(quiz) {
  return `<div class="activity-row"><div><strong>${quiz.title}</strong><span>${quiz.question_count} questions · ${formatDate(quiz.created_at)}</span></div><button class="btn-small" data-start="${quiz.id}">Start →</button></div>`;
}
function attemptRow(attempt) {
  return `<div class="activity-row"><div><strong>${attempt.filename}</strong><span>${attempt.score}/${attempt.total} correct · ${formatDate(attempt.created_at)}</span></div><b class="score-chip">${attempt.percentage}%</b></div>`;
}
async function startQuiz(id) {
  const response = await fetch(`/api/quizzes/${id}/start`, { method: "POST" });
  const data = await response.json();
  if (!response.ok) return alert(data.error || "Could not start this study set.");
  sessionStorage.setItem("questions", JSON.stringify(data.questions));
  sessionStorage.setItem("attemptId", data.attempt_id);
  sessionStorage.setItem("totalQuestions", data.total);
  sessionStorage.setItem("timerDuration", "600");
  sessionStorage.setItem("proctoring", "off");
  sessionStorage.setItem("pdfName", data.filename);
  window.location.href = "/quiz";
}
document.addEventListener("click", (event) => { if (event.target.dataset.start) startQuiz(event.target.dataset.start); });
fetch("/api/dashboard").then(r => r.json()).then(data => {
  savedCount.textContent = data.stats.saved_quizzes;
  attemptCount.textContent = data.stats.completed_attempts;
  averageScore.textContent = `${data.stats.average_score}%`;
  recentQuizzes.innerHTML = data.recent_quizzes.length ? data.recent_quizzes.map(quizRow).join("") : empty("Your generated study sets will appear here.");
  recentAttempts.innerHTML = data.recent_attempts.length ? data.recent_attempts.map(attemptRow).join("") : empty("Complete a quiz to begin building your history.");
}).catch(() => { document.querySelectorAll(".list-stack").forEach(el => el.innerHTML = empty("Could not load your dashboard.")); });
