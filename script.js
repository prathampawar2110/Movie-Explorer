const API_KEY = "a4914b67";
const BASE_URL = "https://www.omdbapi.com/";

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let movies = [];
let currentSearchTerm = "";

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchMovies(searchText) {
    const response = await fetch(
        `${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(searchText)}`
    );
    const data = await response.json();
    if (data.Response === "False") return [];
    return data.Search || [];
}

async function fetchMovieDetails(id) {
    const response = await fetch(`${BASE_URL}?apikey=${API_KEY}&i=${id}`);
    return await response.json();
}

// ─── LOAD / SEARCH ────────────────────────────────────────────────────────────

async function loadRandomMovies() {
    const terms = ["action", "comedy", "drama", "adventure", "marvel", "sci-fi", "horror"];
    const randomTerm = terms[Math.floor(Math.random() * terms.length)];
    await loadMovies(randomTerm);
}

async function loadMovies(searchText) {
    setLoading(true);
    currentSearchTerm = searchText;

    const raw = await fetchMovies(searchText);
    movies = raw.map(mapMovie);
    renderMovies(movies);
    setLoading(false);
}

async function searchMovies() {
    const searchText = document.getElementById("searchText").value.trim();
    const clearBtn = document.getElementById("clearBtn");
    clearBtn.style.display = searchText ? "flex" : "none";

    if (searchText === "") {
        loadRandomMovies();
        return;
    }
    await loadMovies(searchText);
}

function clearSearch() {
    document.getElementById("searchText").value = "";
    document.getElementById("clearBtn").style.display = "none";
    loadRandomMovies();
}

async function filterByGenre(btn, genre) {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    const term = genre || currentSearchTerm || "popular";
    await loadMovies(term);
}

// ─── MAPPING ──────────────────────────────────────────────────────────────────

function mapMovie(movie) {
    return {
        id: movie.imdbID,
        title: movie.Title,
        year: movie.Year,
        type: movie.Type,
        image: movie.Poster !== "N/A" ? movie.Poster : null,
    };
}

// ─── RENDER MOVIES ────────────────────────────────────────────────────────────

function renderMovies(movieArray) {
    const movieList = document.getElementById("movieList");
    const resultsCount = document.getElementById("resultsCount");

    movieList.innerHTML = "";

    if (!movieArray || movieArray.length === 0) {
        movieList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎭</div>
                <h3>No movies found</h3>
                <p>Try a different title or genre</p>
            </div>`;
        resultsCount.textContent = "";
        return;
    }

    resultsCount.textContent = `${movieArray.length} result${movieArray.length !== 1 ? "s" : ""}`;

    movieArray.forEach((movie, index) => {
        const isFavorite = favorites.some(f => f.id === movie.id);
        const card = document.createElement("div");
        card.className = "card";
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <div class="card-poster" onclick="showDetails('${movie.id}')">
                ${movie.image
                    ? `<img src="${movie.image}" alt="${escapeAttr(movie.title)}" loading="lazy">`
                    : `<div class="no-poster">🎬<br><small>No Image</small></div>`
                }
                <div class="card-overlay">
                    <span class="overlay-label">View Details</span>
                </div>
                <span class="type-badge">${movie.type || "movie"}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title" title="${escapeAttr(movie.title)}">${movie.title}</h3>
                <p class="card-year">${movie.year}</p>
                <div class="card-actions">
                    <button class="btn-details" onclick="showDetails('${movie.id}')">Details</button>
                    <button class="btn-fav ${isFavorite ? "is-fav" : ""}"
                        onclick="toggleFavorite('${movie.id}')"
                        title="${isFavorite ? "Remove from Watchlist" : "Add to Watchlist"}">
                        ${isFavorite ? "❤️" : "🤍"}
                    </button>
                </div>
            </div>
        `;
        movieList.appendChild(card);
    });
}

// ─── DETAILS MODAL ────────────────────────────────────────────────────────────

async function showDetails(id) {
    const modal = document.getElementById("movieModal");
    const details = document.getElementById("movieDetails");

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    details.innerHTML = `
        <div class="modal-loading">
            <div class="spinner"></div>
            <p>Loading details…</p>
        </div>`;

    try {
        const m = await fetchMovieDetails(id);

        if (m.Response === "False") {
            details.innerHTML = `<p class="modal-error">Movie details not found.</p>`;
            return;
        }

        const ratingStars = m.imdbRating !== "N/A"
            ? `<span class="stars">⭐ ${m.imdbRating}/10</span>`
            : "";

        details.innerHTML = `
            <div class="modal-grid">
                <div class="modal-poster">
                    ${m.Poster !== "N/A"
                        ? `<img src="${m.Poster}" alt="${escapeAttr(m.Title)}">`
                        : `<div class="no-poster large">🎬</div>`
                    }
                </div>
                <div class="modal-info">
                    <h2>${m.Title}</h2>
                    <div class="modal-meta">
                        <span class="meta-tag">${m.Year}</span>
                        <span class="meta-tag">${m.Rated}</span>
                        <span class="meta-tag">${m.Runtime}</span>
                        ${ratingStars}
                    </div>
                    <p class="modal-genre"><strong>Genre:</strong> ${m.Genre}</p>
                    <p class="modal-director"><strong>Director:</strong> ${m.Director}</p>
                    <p class="modal-actors"><strong>Cast:</strong> ${m.Actors}</p>
                    <p class="modal-country"><strong>Country:</strong> ${m.Country}</p>
                    <p class="modal-plot">${m.Plot}</p>
                    <div class="modal-actions">
                        <button class="btn-details" onclick="toggleFavoriteFromModal('${m.imdbID}')">
                            ${favorites.some(f => f.id === m.imdbID) ? "❤️ In Watchlist" : "🤍 Add to Watchlist"}
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        details.innerHTML = `<p class="modal-error">Something went wrong. Please try again.</p>`;
    }
}

function closeModal() {
    document.getElementById("movieModal").style.display = "none";
    document.body.style.overflow = "";
}

function handleModalClick(event) {
    if (event.target === document.getElementById("movieModal")) closeModal();
}

// ─── FAVORITES ────────────────────────────────────────────────────────────────

function toggleFavorite(id) {
    const movie = movies.find(m => m.id === id);
    if (!movie) return;

    const idx = favorites.findIndex(f => f.id === id);
    if (idx === -1) {
        favorites.push(movie);
        showToast(`"${movie.title}" added to Watchlist ❤️`);
    } else {
        favorites.splice(idx, 1);
        showToast(`"${movie.title}" removed from Watchlist`);
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderMovies(movies);
    renderFavorites();
    updateFavBadge();
}

function toggleFavoriteFromModal(id) {
    // Try to find in current movies list first
    let movie = movies.find(m => m.id === id);

    // If not found in current list (e.g. opened from favorites), rebuild from favorites
    if (!movie) {
        movie = favorites.find(f => f.id === id);
    }

    if (!movie) return;

    const idx = favorites.findIndex(f => f.id === id);
    if (idx === -1) {
        favorites.push(movie);
        showToast(`"${movie.title}" added to Watchlist ❤️`);
    } else {
        favorites.splice(idx, 1);
        showToast(`"${movie.title}" removed from Watchlist`);
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderMovies(movies);
    renderFavorites();
    updateFavBadge();

    // Refresh modal button label
    const btn = document.querySelector(".modal-actions .btn-details");
    if (btn) {
        btn.textContent = favorites.some(f => f.id === id) ? "❤️ In Watchlist" : "🤍 Add to Watchlist";
    }
}

function renderFavorites() {
    const sidebar = document.getElementById("favorites");
    const favList = document.getElementById("favoriteList");
    const title = document.getElementById("favoritesTitle");

    title.textContent = `${favorites.length} saved`;

    if (favorites.length === 0) {
        favList.innerHTML = `<p class="empty-fav">No movies saved yet.<br>Hit 🤍 on any movie to add.</p>`;
        return;
    }

    favList.innerHTML = "";
    favorites.forEach(movie => {
        const row = document.createElement("div");
        row.className = "fav-row";
        row.innerHTML = `
            <div class="fav-thumb" onclick="showDetails('${movie.id}')">
                ${movie.image
                    ? `<img src="${movie.image}" alt="${escapeAttr(movie.title)}">`
                    : `<div class="no-poster small">🎬</div>`
                }
            </div>
            <div class="fav-info" onclick="showDetails('${movie.id}')">
                <span class="fav-title">${movie.title}</span>
                <span class="fav-year">${movie.year}</span>
            </div>
            <button class="fav-remove" onclick="removeFavorite('${movie.id}')" title="Remove">✕</button>
        `;
        favList.appendChild(row);
    });
}

function removeFavorite(id) {
    const movie = favorites.find(f => f.id === id);
    favorites = favorites.filter(f => f.id !== id);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    if (movie) showToast(`"${movie.title}" removed`);
    renderFavorites();
    renderMovies(movies);
    updateFavBadge();
}

function toggleFavoritesPanel() {
    const sidebar = document.getElementById("favorites");
    const isVisible = sidebar.style.display !== "none";
    sidebar.style.display = isVisible ? "none" : "block";
}

function updateFavBadge() {
    const badge = document.getElementById("favBadge");
    if (favorites.length > 0) {
        badge.style.display = "flex";
        badge.textContent = favorites.length;
    } else {
        badge.style.display = "none";
    }
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────

function setLoading(isLoading) {
    document.getElementById("loadingState").style.display = isLoading ? "flex" : "none";
    document.getElementById("movieList").style.display = isLoading ? "none" : "grid";
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
}

function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    loadRandomMovies();
    renderFavorites();
    updateFavBadge();

    // Show favorites panel if there are saved items
    if (favorites.length > 0) {
        document.getElementById("favorites").style.display = "block";
    }
});

document.getElementById("searchText").addEventListener("input", searchMovies);

document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
});
