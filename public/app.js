let currentCars = [];
let pinnedIndices = new Set();
let analysisHistory = [];

// Use example text
function useExample(btn) {
  const text = btn.textContent.trim();
  document.getElementById('requirements').value = text;
}

// Form submission - Find cars
document.getElementById('needsForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const requirements = document.getElementById('requirements').value.trim();

  if (requirements.length < 10) {
    alert('Please describe your requirements in more detail (at least 10 characters)');
    return;
  }

  const btn = document.getElementById('findCarsBtn');
  const btnText = btn.querySelector('span');
  const spinner = btn.querySelector('.spinner');

  // Show loading state
  btn.disabled = true;
  btnText.textContent = 'Analyzing your requirements...';
  spinner.classList.remove('hidden');

  try {
    const response = await fetch('/api/find-cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requirements })
    });

    const data = await response.json();

    if (data.success) {
      currentCars = data.cars;
      analysisHistory = [data.analysis]; // Reset history for new search
      showResults(null, data.cars);
    } else {
      alert(`Error: ${data.error}`);
    }

  } catch (error) {
    console.error('Error:', error);
    alert('Connection error. Make sure Ollama is running.');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Find my perfect cars';
    spinner.classList.add('hidden');
  }
});

// Helper function to format property names (camelCase to Title Case)
function formatPropertyName(key) {
  // Convert camelCase to Title Case
  // e.g., "fuelConsumption" → "Fuel Consumption"
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/0to60/gi, '0-60') // Special case for 0to60
    .trim();
}

// Show results
function showResults(analysis, cars) {
  // Hide form, show results
  document.getElementById('initialForm').classList.add('hidden');
  document.getElementById('resultsContainer').classList.remove('hidden');

  // Build analysis history HTML
  let historyHtml = '';
  analysisHistory.forEach((text, index) => {
    const isFirst = index === 0;
    const title = isFirst ? '📋 Initial Analysis' : `🔄 Refinement #${index}`;

    historyHtml += `
      <div class="analysis-item" style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
        <h4 style="color: #667eea; margin-bottom: 10px;">${title}</h4>
        <p>${text}</p>
      </div>
    `;
  });

  // Show analysis history + Refine Input
  document.getElementById('analysisBox').innerHTML = `
    ${historyHtml}
    
    <div class="refine-section" style="margin-top: 10px;">
        <label style="display:block; margin-bottom: 5px; font-weight:bold;">💬 Refine these results:</label>
        <div style="display:flex; gap: 10px;">
            <input type="text" id="refineInput" placeholder="e.g. 'Too expensive', 'I prefer German cars', 'Keep the Fiat but change others'" style="flex:1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <button onclick="refineSearch()" id="refineBtn" style="padding: 8px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Update</button>
        </div>
        <small style="color: #666;">💡 Tip: Pin cars you like (<span style="font-style: normal;">📌</span>) to keep them.</small>
    </div>
  `;

  // Extract all unique property keys from all cars
  const allPropertyKeys = new Set();
  cars.forEach(car => {
    if (car.properties && typeof car.properties === 'object') {
      Object.keys(car.properties).forEach(key => allPropertyKeys.add(key));
    }
  });

  // Build dynamic property rows
  let dynamicPropertyRows = '';
  allPropertyKeys.forEach(propKey => {
    const formattedName = formatPropertyName(propKey);
    dynamicPropertyRows += `
      <tr>
        <td class="label-cell"><strong>${formattedName}</strong></td>
        ${cars.map(car => {
      const value = car.properties && car.properties[propKey] ? car.properties[propKey] : '-';
      return `<td>${value}</td>`;
    }).join('')}
      </tr>
    `;
  });

  // Create comparison table
  const table = document.getElementById('comparisonTable');
  table.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th>Feature</th>
          ${cars.map((car, i) => `
            <th class="car-header">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div class="car-number">Car ${i + 1}</div>
                  <button class="pin-btn ${pinnedIndices.has(i) ? 'active' : ''}" onclick="togglePin(${i})" title="Pin this car to keep it">
                    ${pinnedIndices.has(i) ? '📌 Pinned' : '📌 Pin'}
                  </button>
              </div>
              <div class="car-name">${car.make} ${car.model}</div>
              <div class="car-year">${car.year}</div>
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-cell"><strong>Type</strong></td>
          ${cars.map(car => `<td>${car.type}</td>`).join('')}
        </tr>
        <tr>
          <td class="label-cell"><strong>Price</strong></td>
          ${cars.map(car => `<td class="price-cell">${car.price}</td>`).join('')}
        </tr>
        ${dynamicPropertyRows}
        <tr>
          <td class="label-cell"><strong>Strengths</strong></td>
          ${cars.map(car => `
            <td>
              <ul class="pros-list">
                ${car.strengths.map(s => `<li>✅ ${s}</li>`).join('')}
              </ul>
            </td>
          `).join('')}
        </tr>
        <tr>
          <td class="label-cell"><strong>Weaknesses</strong></td>
          ${cars.map(car => `
            <td>
              <ul class="cons-list">
                ${car.weaknesses.map(w => `<li>❌ ${w}</li>`).join('')}
              </ul>
            </td>
          `).join('')}
        </tr>
        <tr class="motivation-row">
          <td class="label-cell"><strong>Why choose it</strong></td>
          ${cars.map(car => `<td class="motivation-cell">${car.reason}</td>`).join('')}
        </tr>
      </tbody>
    </table>
  `;

  // Populate select for questions
  const carSelect = document.getElementById('carSelect');
  carSelect.innerHTML = '<option value="">Select a car...</option>' +
    cars.map((car, i) => `<option value="${i}">${car.make} ${car.model}</option>`).join('');

  // Populate select for comparison and alternatives
  const compareOptions = cars.map((car, i) =>
    `<option value="${car.make} ${car.model}">${car.make} ${car.model}</option>`
  ).join('');

  document.getElementById('compareCar1').innerHTML = '<option value="">First car...</option>' + compareOptions;
  document.getElementById('compareCar2').innerHTML = '<option value="">Second car...</option>' + compareOptions;
  document.getElementById('alternativeCar').innerHTML = '<option value="">Select a car...</option>' + compareOptions;

  // Smooth scroll to results
  document.getElementById('resultsContainer').scrollIntoView({ behavior: 'smooth' });
}

// Ask question about specific car
async function askQuestion() {
  const carIndex = document.getElementById('carSelect').value;
  const question = document.getElementById('questionInput').value.trim();

  if (!carIndex || !question) {
    alert('Please select a car and write a question');
    return;
  }

  const car = currentCars[carIndex];
  const carName = `${car.make} ${car.model}`;

  // Add question to history
  const qaHistory = document.getElementById('qaHistory');
  const questionDiv = document.createElement('div');
  questionDiv.className = 'qa-item qa-question';
  questionDiv.textContent = `❓ ${question} (${carName})`;
  qaHistory.appendChild(questionDiv);

  const answerDiv = document.createElement('div');
  answerDiv.className = 'qa-item qa-answer loading';
  answerDiv.textContent = '⏳ Looking for the answer...';
  qaHistory.appendChild(answerDiv);

  // Scroll
  qaHistory.scrollTop = qaHistory.scrollHeight;

  try {
    const response = await fetch('/api/ask-about-car', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ car: carName, question })
    });

    const data = await response.json();

    if (data.success) {
      answerDiv.className = 'qa-item qa-answer';
      answerDiv.innerHTML = `💡 ${data.answer.replace(/\n/g, '<br>')}`;
    } else {
      answerDiv.className = 'qa-item qa-answer error';
      answerDiv.textContent = `❌ ${data.error}`;
    }

  } catch (error) {
    answerDiv.className = 'qa-item qa-answer error';
    answerDiv.textContent = '❌ Connection error';
  }

  // Clear input
  document.getElementById('questionInput').value = '';
  qaHistory.scrollTop = qaHistory.scrollHeight;
}

// Enter key to send question
document.getElementById('questionInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    askQuestion();
  }
});

// Show comparison modal
function showDetailedComparison() {
  document.getElementById('compareModal').classList.remove('hidden');
}

// Execute detailed comparison
async function executeComparison() {
  const car1 = document.getElementById('compareCar1').value;
  const car2 = document.getElementById('compareCar2').value;

  if (!car1 || !car2) {
    alert('Please select two cars to compare');
    return;
  }

  if (car1 === car2) {
    alert('Please select two different cars');
    return;
  }

  const resultsDiv = document.getElementById('compareResults');
  resultsDiv.innerHTML = '<div class="loading-text">⏳ Preparing detailed comparison...</div>';

  try {
    const response = await fetch('/api/compare-cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ car1, car2 })
    });

    const data = await response.json();

    if (data.success) {
      const comparison = data.comparison;
      resultsDiv.innerHTML = `
        <div class="compare-intro">${comparison.comparison}</div>
        
        <div class="compare-categories">
          ${comparison.categories.map(cat => `
            <div class="compare-category">
              <h4>${cat.name}</h4>
              <div class="compare-row">
                <div class="compare-col ${cat.winner === 'car1' ? 'winner' : ''}">
                  <div class="car-name">${car1}</div>
                  <div>${cat.car1}</div>
                </div>
                <div class="compare-col ${cat.winner === 'car2' ? 'winner' : ''}">
                  <div class="car-name">${car2}</div>
                  <div>${cat.car2}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="compare-conclusion">
          <h4>🏆 Conclusion</h4>
          <p>${comparison.conclusion}</p>
        </div>
      `;
    } else {
      resultsDiv.innerHTML = `<div class="error-text">❌ ${data.error}</div>`;
    }

  } catch (error) {
    resultsDiv.innerHTML = '<div class="error-text">❌ Connection error</div>';
  }
}

// Show alternatives modal
function showAlternatives() {
  document.getElementById('alternativesModal').classList.remove('hidden');
}

// Search for alternatives
async function searchAlternatives() {
  const car = document.getElementById('alternativeCar').value;
  const reason = document.getElementById('alternativeReason').value.trim();

  if (!car) {
    alert('Please select a car');
    return;
  }

  const resultsDiv = document.getElementById('alternativesResults');
  resultsDiv.innerHTML = '<div class="loading-text">⏳ Searching for alternatives...</div>';

  try {
    const response = await fetch('/api/get-alternatives', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ car, reason })
    });

    const data = await response.json();

    if (data.success) {
      resultsDiv.innerHTML = `
        <div class="alternatives-list">
          ${data.alternatives.map((alt, i) => `
            <div class="alternative-card">
              <h4>${i + 1}. ${alt.make} ${alt.model}</h4>
              <p class="alt-reason"><strong>Why consider it:</strong> ${alt.reason}</p>
              <p class="alt-advantages"><strong>Advantages:</strong> ${alt.advantages}</p>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      resultsDiv.innerHTML = `<div class="error-text">❌ ${data.error}</div>`;
    }

  } catch (error) {
    resultsDiv.innerHTML = '<div class="error-text">❌ Connection error</div>';
  }
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');

  // Reset contents
  if (modalId === 'compareModal') {
    document.getElementById('compareResults').innerHTML = '';
  } else if (modalId === 'alternativesModal') {
    document.getElementById('alternativesResults').innerHTML = '';
  }
}

// Click outside modal to close
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal.id);
    }
  });
});

// New search
document.getElementById('newSearchBtn').addEventListener('click', async () => {
  const confirmed = confirm('Do you want to start a new search? Current results will be lost.');

  if (!confirmed) return;

  try {
    await fetch('/api/reset-conversation', { method: 'POST' });
  } catch (error) {
    console.error('Reset error:', error);
  }

  // Reset UI
  document.getElementById('resultsContainer').classList.add('hidden');
  document.getElementById('initialForm').classList.remove('hidden');
  document.getElementById('qaHistory').innerHTML = '';
  currentCars = [];
  analysisHistory = [];

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Pinning Logic
function togglePin(index) {
  if (pinnedIndices.has(index)) {
    pinnedIndices.delete(index);
  } else {
    pinnedIndices.add(index);
  }
  // Re-render table header to update buttons? 
  // Easier to just toggle class on button for now to avoid full re-render
  // But since we generate HTML string, we need to update DOM
  const btn = document.querySelectorAll('.pin-btn')[index];
  if (pinnedIndices.has(index)) {
    btn.classList.add('active');
    btn.innerHTML = '📌 Pinned';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '📌 Pin';
  }
}

// Refine Search Logic
async function refineSearch() {
  const feedback = document.getElementById('refineInput').value.trim();
  if (!feedback) {
    alert('Please enter some feedback to refine the search.');
    return;
  }

  const btn = document.getElementById('refineBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Updating...';
  btn.disabled = true;

  // Collect pinned cars
  const pinnedCars = [];
  pinnedIndices.forEach(index => {
    if (currentCars[index]) {
      pinnedCars.push(currentCars[index]);
    }
  });

  try {
    const response = await fetch('/api/refine-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback, pinnedCars })
    });

    const data = await response.json();

    if (data.success) {
      currentCars = data.cars;
      // Reset pins? Or keep them pinned?
      // Pinned cars should still be pinned. They are now at 0, 1, ...
      pinnedIndices.clear();
      for (let i = 0; i < pinnedCars.length; i++) {
        pinnedIndices.add(i);
      }

      analysisHistory.push(data.analysis); // Add new analysis to history
      showResults(null, data.cars);
    } else {
      alert('Error refining search: ' + data.error);
    }

  } catch (error) {
    console.error('Refine error:', error);
    alert('Connection error.');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}
