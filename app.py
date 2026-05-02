from flask import Flask, jsonify, render_template
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

# Load and prepare data
df = pd.read_csv("final_data_stackoverflow_questions.csv")
df = df.dropna(subset=['Language'])

# Count occurrences of each tag per year
tag_counts = df.groupby(['Year', 'Language']).size().reset_index(name='count')

# Get top 10 tags overall (across all years)
top_tags_list = tag_counts.groupby('Language')['count'].sum().sort_values(ascending=False).head(10).index

# Filter only top 10 tags
filtered = tag_counts[tag_counts['Language'].isin(top_tags_list)]

# Normalize within each year
normalized_data = {}
for year in sorted(filtered['Year'].unique()):
    df_year = filtered[filtered['Year'] == year]
    total = df_year['count'].sum()
    for _, row in df_year.iterrows():
        tag = row['Language']
        norm = row['count'] / total
        if tag not in normalized_data:
            normalized_data[tag] = {}
        normalized_data[tag][str(year)] = norm


@app.route('/top-tags')
def top_tags():
    """Return normalized tag frequency data grouped by language and year."""
    return jsonify(normalized_data)


@app.route('/stats')
def stats():
    """Return summary statistics for the dashboard cards."""
    total_questions = len(df)
    total_languages = df['Language'].nunique()
    years = sorted(df['Year'].dropna().unique().tolist())
    top_lang = df['Language'].value_counts().idxmax()
    top_lang_count = int(df['Language'].value_counts().max())

    return jsonify({
        "total_questions": total_questions,
        "total_languages": total_languages,
        "year_range": f"{int(min(years))} – {int(max(years))}",
        "top_language": top_lang,
        "top_language_count": top_lang_count
    })


@app.route('/')
def index():
    """Serve the main dashboard page."""
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
