const API_KEY = "d66fba81057e436998592368121b1655";

const state = {
    currentView: "browse",
    searchResults: [],
    bookmarks: JSON.parse(localStorage.getItem("Bookmarks")) || [],
    isLoading: false,
    error: null,
    searchQuery: "",
};

let promptTimer = null;

// ---------------- STATE ----------------

function setState(updates) {
    Object.assign(state, updates);
    render();
}

function showPrompt(message, type = "success") {
    let prompt = document.querySelector("#bookmark-prompt");

    if (!prompt) {
        prompt = document.createElement("div");
        prompt.id = "bookmark-prompt";
        prompt.className = "bookmark-prompt";
        document.body.appendChild(prompt);
    }

    prompt.textContent = message;
    prompt.classList.remove("prompt-success", "prompt-info", "show");
    prompt.classList.add(type === "info" ? "prompt-info" : "prompt-success");

    requestAnimationFrame(() => {
        prompt.classList.add("show");
    });

    if (promptTimer) {
        clearTimeout(promptTimer);
    }

    promptTimer = setTimeout(() => {
        prompt.classList.remove("show");
    }, 2800);
}

// ---------------- SEARCH BAR ----------------

function createSearchBar() {
    return `
    <form id="search-form" class="search-bar">
        <input 
            type="text" 
            name="query" 
            placeholder="Search for movies..." 
            value="${state.searchQuery}"
        />
        <button type="submit">Search</button>
    </form>
    `;
}

function getPosterMarkup(movie) {
    if (movie.poster_path) {
        return `
        <img 
            src="https://image.tmdb.org/t/p/w500${movie.poster_path}"
            alt="${movie.title}"
            loading="lazy"
        />
        `;
    }

    return `<div class="poster-fallback">No Poster</div>`;
}

// ---------------- API ----------------

async function fetchMovies(query) {
    if (!query.trim()) return;

    setState({
        isLoading: true,
        error: null,
        searchQuery: query,
        searchResults: []
    });

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${query}`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch movies");
        }

        const data = await response.json();

        setState({
            searchResults: data.results || [],
            isLoading: false
        });

    } catch (error) {
        setState({
            error: error.message,
            isLoading: false
        });
    }
}

// ---------------- BOOKMARK FUNCTIONS ----------------

function addBookmark(movie) {
    const exists = state.bookmarks.some(b => b.id === movie.id);
    if (exists) {
        showPrompt(`"${movie.title}" is already in bookmarks.`, "info");
        return;
    }

    const updated = [...state.bookmarks, movie];

    localStorage.setItem("Bookmarks", JSON.stringify(updated));

    setState({ bookmarks: updated });
    showPrompt(`Added "${movie.title}" to bookmarks.`);
}

function removeBookmark(movieId) {
    const movieToRemove = state.bookmarks.find(m => m.id === movieId);
    const updated = state.bookmarks.filter(m => m.id !== movieId);

    localStorage.setItem("Bookmarks", JSON.stringify(updated));

    setState({ bookmarks: updated });

    if (movieToRemove) {
        showPrompt(`Removed "${movieToRemove.title}" from bookmarks.`, "info");
    }
}

// ---------------- VIEWS ----------------

function renderBrowseView() {
    let content = createSearchBar();

    if (state.isLoading) {
        content += `<p class="status-text">Loading...</p>`;
    } 
    else if (state.error) {
        content += `<p class="error">${state.error}</p>`;
    } 
    else if (state.searchResults.length > 0) {
        content += `
        <div class="card-grid">
            ${state.searchResults.map(movie => `
                <div class="card">
                    <div class="poster-wrap">
                        ${getPosterMarkup(movie)}
                    </div>
                    <div class="card-content">
                        <h3>${movie.title}</h3>
                        <p class="movie-meta">${movie.release_date ? movie.release_date.slice(0, 4) : "Year N/A"}</p>
                        <p class="movie-overview">${movie.overview ? movie.overview.slice(0, 120) + (movie.overview.length > 120 ? "..." : "") : "No description available."}</p>
                    </div>

                    <button class="bookmark-btn" data-id="${movie.id}">
                        ⭐ Add Bookmark
                    </button>
                </div>
            `).join("")}
        </div>
        `;
    } 
    else if (state.searchQuery) {
        content += `<p class="empty">No results found for "${state.searchQuery}"</p>`;
    } 
    else {
        content += `<p class="initial">Search for movies above!</p>`;
    }

    return content;
}

function renderBookmarksView() {
    if (state.bookmarks.length === 0) {
        return `<p class="empty">No bookmarks yet! Start adding some.</p>`;
    }

    return `
    <section class="bookmarks-view">
    <h2>Bookmarks (${state.bookmarks.length})</h2>
    <div class="card-grid">
        ${state.bookmarks.map(movie => `
            <div class="card">
                <div class="poster-wrap">
                    ${getPosterMarkup(movie)}
                </div>
                <div class="card-content">
                    <h3>${movie.title}</h3>
                </div>

                <button class="remove-btn" data-id="${movie.id}">
                    ❌ Remove
                </button>
            </div>
        `).join("")}
    </div>
    </section>
    `;
}

function renderAboutView() {
    return `
    <div class="about">
        <h2>About This App</h2>
        <p>Welcome to the Movie Search and Bookmark App! This is the first time i'm building such an app with an API.</p>
        <p>As this app allows users to search movies using the TMDb API.</p>
        <p>Users can bookmark their favorite movies and manage their bookmarks easily.</p>

        <h3>Features</h3>
        <ul>
            <li>Search movies</li>
            <li>Add bookmarks</li>
            <li>Remove bookmarks</li>
        </ul>

        <p>Built by Brandon Bahena.</p>
    </div>
    `;
}

// ---------------- RENDER ----------------

function render() {
    const root = document.querySelector("#script");

    const views = {
        browse: renderBrowseView,
        bookmarks: renderBookmarksView,
        about: renderAboutView,
    };

    const viewFn = views[state.currentView] || renderBrowseView;

    root.innerHTML = viewFn();

    document.querySelectorAll(".nav-link").forEach((link) => {
        const linkView = (link.getAttribute("href") || "").replace("#", "") || "browse";
        link.classList.toggle("active", linkView === state.currentView);
    });
}

// ---------------- EVENTS ----------------

// Search submit
document.addEventListener("submit", (e) => {
    if (e.target.id === "search-form") {
        e.preventDefault();
        const query = e.target.query.value;
        fetchMovies(query);
    }
});

// Add + Remove bookmarks
document.addEventListener("click", (e) => {

    // Add bookmark
    if (e.target.classList.contains("bookmark-btn")) {
        const id = Number(e.target.dataset.id);
        const movie = state.searchResults.find(m => m.id === id);

        if (movie) addBookmark(movie);
    }

    // Remove bookmark
    if (e.target.classList.contains("remove-btn")) {
        const id = Number(e.target.dataset.id);
        removeBookmark(id);
    }
});

// Navigation
window.addEventListener("hashchange", () => {
    const view = location.hash.slice(1) || "browse";
    setState({ currentView: view });
});

// ---------------- INIT ----------------

state.currentView = location.hash.slice(1) || "browse";
render();