/**
 * upload.js
 * ---------
 * Handles everything on the index/upload page:
 *   1. Drag-and-drop and file browsing
 *   2. Sending the PDF to the Flask backend
 *   3. Saving settings (timer duration, proctoring toggle)
 *   4. Navigating to the quiz page once questions are ready
 *
 * We store the generated quiz in sessionStorage so the quiz.html
 * page can read it without needing another API call.
 */

// ---- DOM elements ----
const dropZone     = document.getElementById("dropZone");
const pdfInput     = document.getElementById("pdfInput");
const filePreview  = document.getElementById("filePreview");
const fileName     = document.getElementById("fileName");
const removeFile   = document.getElementById("removeFile");
const generateBtn  = document.getElementById("generateBtn");
const statusMsg    = document.getElementById("statusMsg");
const timerSelect  = document.getElementById("timerSelect");
const proctorSelect = document.getElementById("proctorSelect");

let selectedFile = null;   // Holds the File object the user picked

// =====================================================
// DRAG & DROP EVENTS
// =====================================================

// Prevent browser from opening the file when dragged
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragging");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// Click anywhere on drop zone to trigger file browser
dropZone.addEventListener("click", () => pdfInput.click());

// When user picks a file via browse button
pdfInput.addEventListener("change", () => {
  if (pdfInput.files[0]) handleFile(pdfInput.files[0]);
});

// Remove selected file
removeFile.addEventListener("click", (e) => {
  e.stopPropagation();
  clearFile();
});

// =====================================================
// FILE HANDLING
// =====================================================

/**
 * Called when a file is selected (via drag-drop or browse).
 * Validates it's a PDF, shows the preview, enables the generate button.
 */
function handleFile(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showStatus("Please upload a PDF file only.", "error");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showStatus("File is too large. Maximum size is 10 MB.", "error");
    return;
  }

  selectedFile = file;
  fileName.textContent = file.name;
  dropZone.style.display = "none";
  filePreview.style.display = "flex";
  generateBtn.disabled = false;
  hideStatus();
}

/**
 * Clears the selected file and resets the UI.
 */
function clearFile() {
  selectedFile = null;
  pdfInput.value = "";
  dropZone.style.display = "block";
  filePreview.style.display = "none";
  generateBtn.disabled = true;
  hideStatus();
}

// =====================================================
// QUIZ GENERATION — Send PDF to backend
// =====================================================

generateBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  showStatus("⏳ Uploading and generating questions…", "loading");
  generateBtn.disabled = true;

  // Build a FormData object to send the file as multipart/form-data
  // This is the standard way to send files via fetch()
  const formData = new FormData();
  formData.append("pdf", selectedFile);

  try {
    // POST the PDF to our Flask API endpoint
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
      // Note: DO NOT set Content-Type header manually when using FormData
      // The browser sets it automatically with the correct boundary
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      showStatus("❌ " + (data.error || "Something went wrong."), "error");
      generateBtn.disabled = false;
      return;
    }

    // ✅ Success! Save everything to sessionStorage
    // sessionStorage persists data only within the current browser tab session
    // It's perfect here because we don't need the quiz data to survive page refreshes

    sessionStorage.setItem("questions", JSON.stringify(data.questions));
    sessionStorage.setItem("attemptId", data.attempt_id);
    sessionStorage.setItem("totalQuestions", data.total);
    sessionStorage.setItem("timerDuration", timerSelect.value);
    sessionStorage.setItem("proctoring", proctorSelect.value);
    sessionStorage.setItem("pdfName", data.filename);

    showStatus(`✅ Generated ${data.total} questions! Redirecting…`, "success");

    // Navigate to the quiz page after a short delay
    setTimeout(() => {
      window.location.href = "/quiz";
    }, 1000);

  } catch (err) {
    // Network error or server is down
    showStatus("❌ Could not connect to server. Is Flask running?", "error");
    generateBtn.disabled = false;
    console.error(err);
  }
});

// =====================================================
// UI HELPERS
// =====================================================

function showStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = "status-msg " + type;
  statusMsg.style.display = "block";
}

function hideStatus() {
  statusMsg.style.display = "none";
}
