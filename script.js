/**
 * Quiz Master (v14) - KALVI KADAL
 * script.js - Core Logic & UI Management
 */

// Global State
const state = {
    quizzes: [],
    loading: true,
    currentView: 'library', // 'library' or 'create'
};

// DOM Elements
const elements = {
    loadingIndicator: document.getElementById('loading-indicator'), // The "Loading..." badge
    newQuizBtn: document.getElementById('new-quiz-btn'),           // Your create button
    quizLibraryContainer: document.getElementById('library-container'),
    searchBar: document.getElementById('search-quizzes'),
    subjectFilter: document.getElementById('filter-subjects'),
    classFilter: document.getElementById('filter-classes')
};

/**
 * 1. Initialize App & Fetch Data
 */
async function initApp() {
    toggleLoadingState(true);
    
    try {
        // Simulating fetching your global quiz library data (e.g., from a JSON file, GitHub repo, or database)
        // REPLACE THIS URL with your actual endpoint if fetching externally
        const response = await fetch('./quizzes/global_library.json');
        
        if (!response.ok) {
            throw new Error(`HTTP network error! Status: ${response.status}`);
        }
        
        state.quizzes = await response.json();
        state.loading = false;
        
        // Render library data and lift restrictions
        renderQuizLibrary(state.quizzes);
        toggleLoadingState(false);
        
    } catch (error) {
        console.error("Failed to load Quiz Library:", error);
        
        // CRITICAL FIX: If it fails, don't let it hang on "Loading..." forever.
        // Notify user and unlock the app interface so "New Quiz" can still function.
        showErrorMessage("Unable to load the quiz library. You can still create a new quiz.");
        toggleLoadingState(false); 
    }
}

/**
 * 2. UI State & Loading Handler
 * This ensures buttons toggle cleanly based on background processes
 */
function toggleLoadingState(isLoading) {
    if (isLoading) {
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'inline-block';
        if (elements.newQuizBtn) {
            elements.newQuizBtn.classList.add('disabled');
            elements.newQuizBtn.style.opacity = '0.5';
            elements.newQuizBtn.style.pointerEvents = 'none'; // Disables clicking
        }
    } else {
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'none';
        if (elements.newQuizBtn) {
            elements.newQuizBtn.classList.remove('disabled');
            elements.newQuizBtn.style.opacity = '1';
            elements.newQuizBtn.style.pointerEvents = 'auto'; // Re-enables clicking
        }
    }
}

/**
 * 3. Render Quiz Cards
 */
function renderQuizLibrary(quizzes) {
    if (!elements.quizLibraryContainer) return;
    elements.quizLibraryContainer.innerHTML = '';

    if (quizzes.length === 0) {
        elements.quizLibraryContainer.innerHTML = '<p class="no-data">No quizzes found.</p>';
        return;
    }

    quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'quiz-card';
        card.innerHTML = `
            <h3>${escapeHTML(quiz.title)}</h3>
            <p>Subject: ${escapeHTML(quiz.subject)} | Class: ${escapeHTML(quiz.class)}</p>
            <button onclick="launchQuiz('${quiz.id}')">Start Quiz</button>
        `;
        elements.quizLibraryContainer.appendChild(card);
    });
}

/**
 * 4. Create New Quiz Navigation Action
 */
function handleCreateNewQuiz() {
    // Double-check block protection
    if (state.loading) {
        console.warn("App is currently downloading asset data. Please wait.");
        return;
    }
    
    console.log("Navigating to setup wizard...");
    state.currentView = 'create';
    
    // Your routing logic here to swap view panes or redirect
    // Example: window.location.href = 'create.html'; 
}

/**
 * Helper Utilities
 */
function showErrorMessage(msg) {
    if (elements.quizLibraryContainer) {
        elements.quizLibraryContainer.innerHTML = `<p class="error-text">⚠️ ${msg}</p>`;
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// 5. Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
    // Bind the click event to the icon button shown in "buttom mot work.png"
    if (elements.newQuizBtn) {
        elements.newQuizBtn.addEventListener('click', handleCreateNewQuiz);
    }
    
    // Kick off initialization
    initApp();
});
