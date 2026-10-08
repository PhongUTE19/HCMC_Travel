const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const submitBtn = document.getElementById('submit-btn');
const loadingDiv = document.getElementById('loading');
const errorBox = document.getElementById('error-box');
const answerSection = document.getElementById('answer-section');
const answerText = document.getElementById('answer-text');
const healthBadge = document.getElementById('health-badge');

// 1. Check system health on load
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.status === 'ok') {
      healthBadge.textContent = `● Server: Online | Memory: ${data.indexedChunks} indexed chunks`;
      healthBadge.style.color = '#15803d';
    } else {
      healthBadge.textContent = '● Server: Unexpected status';
      healthBadge.style.color = '#b45309';
    }
  } catch (err) {
    healthBadge.textContent = '● Server: Disconnected / Offline';
    healthBadge.style.color = '#b91c1c';
  }
}

// 2. Handle form submission (Walking Skeleton: Browser -> /api/chat -> Gemini -> Browser)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  // Set loading state
  submitBtn.disabled = true;
  loadingDiv.style.display = 'block';
  errorBox.style.display = 'none';
  answerSection.style.display = 'none';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: Failed to get answer`);
    }

    // Display answer
    answerText.textContent = data.answer || 'No response text received.';

    // Display sources if present
    const sourcesContainer = document.getElementById('sources-container');
    const sourcesList = document.getElementById('sources-list');
    sourcesList.innerHTML = '';

    if (data.sources && data.sources.length > 0) {
      data.sources.forEach((src) => {
        const li = document.createElement('li');
        li.style.marginBottom = '4px';
        li.textContent = `📄 ${src.title} (${src.source}) — similarity score: ${src.score}`;
        sourcesList.appendChild(li);
      });
      sourcesContainer.style.display = 'block';
    } else {
      sourcesContainer.style.display = 'none';
    }

    answerSection.style.display = 'block';
  } catch (err) {
    // Display error
    errorBox.textContent = `Error: ${err.message}`;
    errorBox.style.display = 'block';
  } finally {
    // Clear loading state
    loadingDiv.style.display = 'none';
    submitBtn.disabled = false;
  }
});

checkHealth();
