import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Download required NLTK resources
nltk.download('punkt')
nltk.download('punkt_tab')
nltk.download('stopwords')

def summarize_text(text, num_sentences):
    # Tokenize the text into sentences
    sentences = sent_tokenize(text)

    if len(sentences) == 0:
        return "No sentences found in text."

    # Remove stopwords and punctuation
    stop_words = set(stopwords.words('english'))
    filtered_sentences = [
        sentence for sentence in sentences
        if not any(word.lower() in stop_words for word in word_tokenize(sentence))
    ]

    # Fallback: use all sentences if filtering removed everything
    if not filtered_sentences:
        filtered_sentences = sentences

    # Calculate TF-IDF scores for each sentence
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(filtered_sentences)

    # Calculate cosine similarity between sentences
    similarity_matrix = cosine_similarity(tfidf_matrix)

    # Cap num_sentences to available sentences
    num_sentences = min(num_sentences, len(sentences))

    # Select the top-scoring sentences
    top_sentences = []
    for i in range(num_sentences):
        max_similarity = -1
        max_index = 0
        for j in range(len(sentences)):
            sim_idx = min(i, similarity_matrix.shape[0] - 1)
            sim_jdx = min(j, similarity_matrix.shape[1] - 1)
            similarity = similarity_matrix[sim_idx, sim_jdx]
            if similarity > max_similarity:
                max_similarity = similarity
                max_index = j
        top_sentences.append(sentences[max_index])

    # Join the top sentences into a summary
    summary = ' '.join(top_sentences)
    return summary


# ── Example Usage ────────────────────────────────────────────────────────────
text = (
    "Natural language processing (NLP) is a subfield of linguistics, computer science, "
    "and artificial intelligence concerned with the interactions between computers and human language. "
    "It involves the application of computational techniques to analyze and synthesize natural language and speech. "
    "The history of NLP generally started in the 1950s, although work can be found from earlier periods. "
    "In 1950, Alan Turing published an article titled 'Computing Machinery and Intelligence' which proposed "
    "what is now called the Turing test as a criterion of intelligence. "
    "The Georgetown experiment in 1954 involved fully automatic translation of more than sixty Russian sentences into English. "
    "The authors claimed that within three to five years, machine translation would be a solved problem. "
    "Modern NLP algorithms are based on machine learning, especially statistical machine learning. "
    "Deep learning approaches have achieved state-of-the-art results on many NLP tasks in recent years. "
    "Large language models like GPT and BERT have revolutionized the field of natural language processing."
)

num_sentences = 3

print("=" * 60)
print("         TEXT SUMMARIZATION (TF-IDF + Cosine Similarity)")
print("=" * 60)
print("\n[Original Text]\n")
print(text)
print(f"\n>> Total sentences in text: {len(sent_tokenize(text))}")
print(f">> Requested summary sentences: {num_sentences}")
print("\n" + "-" * 60)
print("\n[Summary]\n")
summary = summarize_text(text, num_sentences)
print(summary)
print("\n" + "=" * 60)
