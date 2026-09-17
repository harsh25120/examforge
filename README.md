# ExamForge — PDF Quiz Generator

This is a web-based quiz application built using Python, Flask, HTML, CSS, and JavaScript.

ExamForge is a local study workspace. Upload a text-based PDF and it creates a short MCQ/True-False quiz, runs a timed attempt, saves the study set for later, and records an answer review in a personal dashboard.

> This is a learning/portfolio application, not a secure remote-proctoring platform. Browser focus signals can be bypassed and are presented only as an integrity reminder.

I built this project to learn:

* Flask backend development
* handling file uploads
* working with PDFs in Python
* REST APIs
* frontend-backend interaction
* safer server-side scoring

---

## Features

* Upload PDF files
* Generate MCQ and True/False questions
* Quiz timer
* Automatic score calculation
* Tab-switch detection
* Fullscreen warning during quiz
* Result page with score and answer review
* Server-stored answer keys and idempotent result submission
* Temporary PDF processing — uploads are deleted after questions are generated
* Dashboard with saved-set, attempt, and average-score analytics
* Reusable study library — retake or remove generated study sets

---

## Tech Used

### Backend

* Python
* Flask
* PyPDF2
* SQLite (included with Python; no separate server required)

### Frontend

* HTML
* CSS
* JavaScript

---

## Project Structure

```text
examforge/
│
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
│
├── uploads/
│
└── frontend/
    ├── index.html
    ├── dashboard.html
    ├── library.html
    ├── quiz.html
    ├── results.html
    │
    ├── css/
    └── js/
```

---

## Setup

### Clone the repository

```bash
git clone https://github.com/harsh25120/examforge.git
cd examforge
```

### Create virtual environment

Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

macOS/Linux:

```bash
python -m venv venv
source venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

---

## Run the project

```bash
python app.py
```

Then open:

```text
http://localhost:5000
```

in your browser.

---

## Notes

* The project works best with text-based PDFs.
* Question generation is rule-based and intentionally simple.
* Only text-based PDFs are supported; scanned/image-only PDFs need OCR and will be rejected.
* The application keeps generated quiz data and completed results in `examforge.db`; uploaded PDFs are deleted once processed.
* This is designed as a simple single-user local application. Dashboard data belongs to the local SQLite file, not a cloud account.

---

## Future Improvements

* Better NLP-based question generation
* Authentication and instructor dashboards
* Exportable result reports
* OCR support for scanned PDFs
* More question types and quiz customization

---

## Author

Harsh Dwivedi