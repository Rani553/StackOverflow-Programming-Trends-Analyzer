from flask import Flask, jsonify
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
top_tags = tag_counts.groupby('Language')['count'].sum().sort_values(ascending=False).head(10).index

# Filter only top 10 tags
filtered = tag_counts[tag_counts['Language'].isin(top_tags)]

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
    return jsonify(normalized_data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
