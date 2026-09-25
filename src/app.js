const express = require('express');
const cors = require('cors');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const TICKET_PRICE = Number(process.env.TICKET_PRICE) || 250;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---------- In-Memory Data ----------
const movies = [
  {
    id: 'MV001', title: 'Inception', language: 'English', duration: 148, genre: 'Sci-Fi',
    poster: 'https://image.tmdb.org/t/p/w300/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    shows: [
      { showId: 'SH001', time: '10:00 AM', screen: 'Audi-1', totalSeats: 50, bookedSeats: [] },
      { showId: 'SH002', time: '02:00 PM', screen: 'Audi-2', totalSeats: 50, bookedSeats: [] }
    ]
  },
  {
    id: 'MV002', title: 'Interstellar', language: 'English', duration: 169, genre: 'Sci-Fi',
    poster: 'https://image.tmdb.org/t/p/w300/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    shows: [
      { showId: 'SH003', time: '11:00 AM', screen: 'Audi-3', totalSeats: 40, bookedSeats: [] },
      { showId: 'SH004', time: '06:00 PM', screen: 'Audi-1', totalSeats: 50, bookedSeats: [] }
    ]
  },
  {
    id: 'MV003', title: 'RRR', language: 'Telugu', duration: 187, genre: 'Action',
    poster: 'https://image.tmdb.org/t/p/w300/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg',
    shows: [
      { showId: 'SH005', time: '09:00 AM', screen: 'Audi-2', totalSeats: 60, bookedSeats: [] }
    ]
  }
];

const bookings = [];

// ==================================================
// UI PAGE (HTML served at /)
// ==================================================
const UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>🎬 Movie Ticket Booking</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
  body { background: #0f0f1a; color: #eaeaea; min-height: 100vh; }
  header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 24px 32px; border-bottom: 2px solid #e94560; }
  header h1 { font-size: 28px; }
  header p { color: #aaa; margin-top: 4px; font-size: 14px; }
  .container { max-width: 1200px; margin: 0 auto; padding: 32px; }
  .movies { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
  .movie-card { background: #1a1a2e; border-radius: 12px; overflow: hidden; transition: transform .2s; border: 1px solid #2a2a4e; }
  .movie-card:hover { transform: translateY(-4px); border-color: #e94560; }
  .movie-card img { width: 100%; height: 340px; object-fit: cover; background: #222; }
  .movie-info { padding: 16px; }
  .movie-info h3 { font-size: 18px; margin-bottom: 6px; }
  .movie-meta { font-size: 13px; color: #aaa; margin-bottom: 4px; }
  .badge { display: inline-block; background: #e94560; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 8px; }
  .btn { background: #e94560; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 12px; width: 100%; transition: background .2s; }
  .btn:hover { background: #c73650; }
  .btn:disabled { background: #444; cursor: not-allowed; }
  .shows { margin-top: 12px; display: none; }
  .shows.active { display: block; }
  .show-item { background: #0f0f1a; padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
  .show-item button { background: #16a34a; padding: 6px 12px; font-size: 12px; margin: 0; width: auto; }
  .modal { position: fixed; inset: 0; background: rgba(0,0,0,.8); display: none; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
  .modal.active { display: flex; }
  .modal-content { background: #1a1a2e; border-radius: 12px; padding: 28px; max-width: 500px; width: 100%; border: 1px solid #e94560; }
  .modal-content h2 { margin-bottom: 16px; color: #e94560; }
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; margin-bottom: 6px; font-size: 13px; color: #aaa; }
  .form-group input, .form-group select { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2a2a4e; background: #0f0f1a; color: #eaeaea; font-size: 14px; }
  .seat-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin-top: 8px; }
  .seat { padding: 8px 4px; text-align: center; background: #16a34a; border-radius: 4px; cursor: pointer; font-size: 11px; user-select: none; }
  .seat.booked { background: #444; cursor: not-allowed; color: #888; }
  .seat.selected { background: #e94560; }
  .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
  .modal-actions .btn { margin-top: 0; }
  .btn-secondary { background: #444; }
  .btn-secondary:hover { background: #555; }
  .toast { position: fixed; top: 24px; right: 24px; background: #16a34a; color: white; padding: 14px 20px; border-radius: 8px; font-size: 14px; z-index: 200; display: none; }
  .toast.error { background: #e94560; }
  .toast.active { display: block; animation: slideIn .3s ease; }
  @keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }
  .loading { text-align: center; padding: 60px; color: #aaa; }
</style>
</head>
<body>
  <header>
    <h1>🎬 Movie Ticket Booking</h1>
    <p>Book tickets for the latest movies at your favorite cinema</p>
  </header>

  <div class="container">
    <div id="movies" class="movies">
      <div class="loading">Loading movies...</div>
    </div>
  </div>

  <!-- Booking Modal -->
  <div id="modal" class="modal">
    <div class="modal-content">
      <h2 id="modalTitle">Book Tickets</h2>
      <div class="form-group">
        <label>Your Name</label>
        <input type="text" id="customerName" placeholder="Enter your name" />
      </div>
      <div class="form-group">
        <label>Select Seats (click to toggle)</label>
        <div class="seat-grid" id="seatGrid"></div>
      </div>
      <div class="form-group">
        <label>Total Amount: <span id="totalAmount" style="color:#16a34a; font-weight:bold;">₹0</span></label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" id="confirmBtn" onclick="confirmBooking()">Confirm Booking</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

<script>
  const API = '';
  let allMovies = [];
  let currentBooking = null;
  let selectedSeats = [];

  // ---------- Helpers ----------
  function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast active' + (isError ? ' error' : '');
    setTimeout(() => t.className = 'toast', 3000);
  }

  async function api(path, opts = {}) {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ---------- Load movies ----------
  async function loadMovies() {
    try {
      const data = await api('/api/movies');
      allMovies = data.movies;
      renderMovies();
    } catch (e) {
      document.getElementById('movies').innerHTML =
        '<div class="loading">❌ Failed to load movies: ' + e.message + '</div>';
    }
  }

  function renderMovies() {
    const el = document.getElementById('movies');
    el.innerHTML = allMovies.map(m => \`
      <div class="movie-card">
        <img src="\${m.poster}" alt="\${m.title}" onerror="this.src='https://via.placeholder.com/300x450/1a1a2e/e94560?text=\${encodeURIComponent(m.title)}'" />
        <div class="movie-info">
          <h3>\${m.title}</h3>
          <div class="movie-meta">\${m.language} • \${m.duration} min</div>
          <div class="movie-meta">\${m.genre}</div>
          <span class="badge">\${m.shows.length} shows</span>
          <button class="btn" onclick="toggleShows('\${m.id}')">View Shows</button>
          <div class="shows" id="shows-\${m.id}"></div>
        </div>
      </div>
    \`).join('');
  }

  async function toggleShows(movieId) {
    const el = document.getElementById('shows-' + movieId);
    if (el.classList.contains('active')) {
      el.classList.remove('active');
      return;
    }

    const data = await api(\`/api/movies/\${movieId}/shows\`);
    el.innerHTML = data.shows.map(s => \`
      <div class="show-item">
        <div>
          <strong>\${s.time}</strong><br/>
          <small>\${s.screen} • \${s.availableSeats} seats left</small>
        </div>
        <button class="btn" onclick='openBooking("\${movieId}", "\${s.showId}")' \${s.availableSeats === 0 ? 'disabled' : ''}>
          Book
        </button>
      </div>
    \`).join('');
    el.classList.add('active');
  }

  // ---------- Booking flow ----------
  async function openBooking(movieId, showId) {
    const movie = allMovies.find(m => m.id === movieId);
    const show = movie.shows.find(s => s.showId === showId);
    const showsData = await api(\`/api/movies/\${movieId}/shows\`);
    const showInfo = showsData.shows.find(s => s.showId === showId);

    currentBooking = { movieId, showId, movie, show, showInfo };
    selectedSeats = [];

    document.getElementById('modalTitle').textContent = \`Book: \${movie.title} (\${show.time})\`;
    document.getElementById('customerName').value = '';
    document.getElementById('totalAmount').textContent = '₹0';
    renderSeats();
    document.getElementById('modal').classList.add('active');
  }

  function renderSeats() {
    const { show, showInfo } = currentBooking;
    const grid = document.getElementById('seatGrid');
    const rows = ['A','B','C','D','E','F','G','H'];
    const seatsPerRow = Math.ceil(show.totalSeats / rows.length);

    let html = '';
    rows.forEach(row => {
      for (let i = 1; i <= seatsPerRow; i++) {
        const seatId = \`\${row}\${i}\`;
        const isBooked = show.bookedSeats.includes(seatId);
        const isSelected = selectedSeats.includes(seatId);
        html += \`<div class="seat \${isBooked ? 'booked' : ''} \${isSelected ? 'selected' : ''}"
                     onclick="\${isBooked ? '' : \`toggleSeat('\${seatId}')\`}">\${seatId}</div>\`;
      }
    });
    grid.innerHTML = html;
  }

  function toggleSeat(seatId) {
    const idx = selectedSeats.indexOf(seatId);
    if (idx >= 0) selectedSeats.splice(idx, 1);
    else selectedSeats.push(seatId);

    document.getElementById('totalAmount').textContent = '₹' + (selectedSeats.length * 250);
    renderSeats();
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentBooking = null;
    selectedSeats = [];
  }

  async function confirmBooking() {
    const name = document.getElementById('customerName').value.trim();
    if (!name) return showToast('Please enter your name', true);
    if (selectedSeats.length === 0) return showToast('Please select at least one seat', true);

    const btn = document.getElementById('confirmBtn');
    btn.disabled = true;
    btn.textContent = 'Booking...';

    try {
      const res = await api('/api/book', {
        method: 'POST',
        body: JSON.stringify({
          movieId: currentBooking.movieId,
          showId: currentBooking.showId,
          customerName: name,
          seats: selectedSeats
        })
      });
      showToast(\`✅ Booking confirmed! ID: \${res.booking.bookingId.slice(0, 8)}...\`);
      closeModal();
      await loadMovies();
    } catch (e) {
      showToast('❌ ' + e.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirm Booking';
    }
  }

  // Init
  loadMovies();
</script>
</body>
</html>`;

// Serve UI at root
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(UI_HTML);
});

// ---------- API Routes (unchanged) ----------

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', hostname: os.hostname(), uptime: process.uptime() });
});

app.get('/api/movies', (req, res) => {
  res.json({ count: movies.length, movies });
});

app.get('/api/movies/:movieId/shows', (req, res) => {
  const movie = movies.find((m) => m.id === req.params.movieId);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  res.json({
    movie: movie.title,
    shows: movie.shows.map((s) => ({
      showId: s.showId, time: s.time, screen: s.screen,
      totalSeats: s.totalSeats,
      availableSeats: s.totalSeats - s.bookedSeats.length
    }))
  });
});

app.post('/api/book', (req, res) => {
  const { movieId, showId, customerName, seats } = req.body;
  if (!movieId || !showId || !customerName || !Array.isArray(seats) || !seats.length) {
    return res.status(400).json({ error: 'movieId, showId, customerName, seats[] required' });
  }
  const movie = movies.find((m) => m.id === movieId);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  const show = movie.shows.find((s) => s.showId === showId);
  if (!show) return res.status(404).json({ error: 'Show not found' });

  const alreadyBooked = seats.filter((s) => show.bookedSeats.includes(s));
  if (alreadyBooked.length) return res.status(409).json({ error: 'Seats already booked', seats: alreadyBooked });

  if (show.bookedSeats.length + seats.length > show.totalSeats) {
    return res.status(400).json({ error: 'Not enough seats' });
  }

  const booking = {
    bookingId: uuidv4(), movieId, movieTitle: movie.title, showId,
    showTime: show.time, screen: show.screen, customerName, seats,
    ticketPrice: TICKET_PRICE, totalAmount: seats.length * TICKET_PRICE,
    bookedAt: new Date().toISOString()
  };
  show.bookedSeats.push(...seats);
  bookings.push(booking);
  res.status(201).json({ message: 'Booking confirmed 🎬', booking });
});

app.get('/api/bookings', (req, res) => res.json({ count: bookings.length, bookings }));
app.get('/api/bookings/:id', (req, res) => {
  const b = bookings.find((x) => x.bookingId === req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  res.json(b);
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

app.listen(PORT, '0.0.0.0', () => console.log(`🎬 Movie Ticket API + UI on port ${PORT}`));
