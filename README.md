# 📈 StackTrends — Programming Language Analytics Dashboard

A modern, dark-themed analytics dashboard that visualizes the popularity of programming languages on Stack Overflow over time. Built with Flask (backend) and vanilla HTML/CSS/JS with Chart.js (frontend).

---

## ✨ Features

- **Normalized trend lines** — see how languages rise and fall in popularity over years
- **Year snapshot bar chart** — compare all languages side-by-side for a specific year
- **Live rankings panel** — languages sorted by share with animated progress bars
- **Sidebar filters** — toggle individual languages, filter by year, switch between Line and Area chart modes
- **Stats cards** — quick-glance metrics: total questions, languages tracked, year range, top language
- **Dark refined theme** — professional dashboard aesthetic with subtle grid texture and glow effects
- **Fully responsive** — works on mobile, tablet, and desktop

---

## 🗂️ Folder Structure

```
stackoverflow-trends/
├── app.py                          # Flask backend (API routes)
├── scraping.ipynb                  # Data scraping notebook (Jupyter)
├── final_data_stackoverflow_questions.csv   # Dataset (you must provide)
├── requirements.txt                # Python dependencies
├── README.md
│
├── templates/
│   └── index.html                  # Main dashboard (Jinja2 template)
│
└── static/
    ├── css/
    │   └── style.css               # All dashboard styles
    └── js/
        └── dashboard.js            # Chart rendering, API calls, interactions
```

---

## 🚀 How to Run

### 1. Prerequisites

- Python 3.8+
- Your scraped dataset file: `final_data_stackoverflow_questions.csv`
  - Must have columns: `Language`, `Year`

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Place Your Dataset

Copy your CSV file into the project root:

```bash
cp /path/to/your/final_data_stackoverflow_questions.csv .
```

### 4. Start the Server

```bash
python app.py
```

### 5. Open in Browser

Visit: **http://localhost:5000**

---

## 📦 Requirements

```
flask
flask-cors
pandas
```

Install all at once:
```bash
pip install flask flask-cors pandas
```

---

## 🔌 API Endpoints

| Endpoint     | Description |
|-------------|-------------|
| `GET /`      | Serves the dashboard HTML |
| `GET /top-tags` | Returns normalized tag frequency `{ lang: { year: value } }` |
| `GET /stats` | Returns summary statistics for the dashboard cards |

---

## 📊 Dataset Format

The CSV must contain at minimum:

| Column     | Type   | Example        |
|------------|--------|----------------|
| `Language` | string | `python`       |
| `Year`     | int    | `2023`         |

Optional columns (used if present): `Question Title`, `Relative Time`

---

## 🛠️ Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Backend   | Python · Flask · Pandas |
| Frontend  | HTML5 · CSS3 · Vanilla JS |
| Charts    | Chart.js v4 |
| Fonts     | Syne · DM Sans · DM Mono (Google Fonts) |
| Scraping  | BeautifulSoup · urllib |

---

## 💡 Tips

- **No data?** Run `scraping.ipynb` first to collect data from Stack Overflow.
- **Wrong year range?** The year select auto-populates from whatever years exist in your CSV.
- **Add more languages?** The dashboard automatically handles any number of languages — it picks the top 10 by total count.

---

*Built as a portfolio project — feel free to customize, extend, and showcase!*
