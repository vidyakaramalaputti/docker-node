const express = require('express');
const cors = require('cors');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const TICKET_PRICE = Number(process.env.TICKET_PRICE) || 250;

// ---------- Middleware ----------
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
    shows: [
      { showId: 'SH001', time: '10:00 AM', screen: 'Audi-1', totalSeats: 50, bookedSeats: [] },
      { showId: 'SH002', time: '02:00 PM', screen: 'Audi-2', totalSeats: 50, bookedSeats: [] }
    ]
  },
  {
    id: 'MV002', title: 'Interstellar', language: 'English', duration: 169, genre: 'Sci-Fi',
    shows: [
      { showId: 'SH003', time: '11:00 AM', screen: 'Audi-3', totalSeats: 40, bookedSeats: [] },
      { showId: 'SH004', time: '06:00 PM', screen: 'Audi-1', totalSeats: 50, bookedSeats: [] }
    ]
  },
  {
    id: 'MV003', title: 'RRR', language: 'Telugu', duration: 187, genre: 'Action',
    shows: [
      { showId: 'SH005', time: '09:00 AM', screen: 'Audi-2', totalSeats: 60, bookedSeats: [] }
    ]
  }
];

const bookings = [];

// ---------- Routes ----------

// Health check (used by Docker HEALTHCHECK)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'movie-ticket-app',
    uptime: process.uptime(),
    hostname: os.hostname()
  });
});

// Root / API info
app.get('/', (req, res) => {
  res.json({
    message: '🎬 Movie Ticket Booking API',
    endpoints: {
      getAllMovies: 'GET /api/movies',
      getShows: 'GET /api/movies/:movieId/shows',
      bookTickets: 'POST /api/book',
      getBooking: 'GET /api/bookings/:bookingId',
      getAllBookings: 'GET /api/bookings',
      health: 'GET /health'
    }
  });
});

// GET all movies
app.get('/api/movies', (req, res) => {
  res.json({ count: movies.length, movies });
});

// GET shows for a movie
app.get('/api/movies/:movieId/shows', (req, res) => {
  const movie = movies.find((m) => m.id === req.params.movieId);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });

  const shows = movie.shows.map((s) => ({
    showId: s.showId,
    time: s.time,
    screen: s.screen,
    totalSeats: s.totalSeats,
    bookedCount: s.bookedSeats.length,
    availableSeats: s.totalSeats - s.bookedSeats.length
  }));

  res.json({ movie: movie.title, shows });
});

// POST book tickets
app.post('/api/book', (req, res) => {
  const { movieId, showId, customerName, seats } = req.body;

  if (!movieId || !showId || !customerName || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({
      error: 'movieId, showId, customerName and seats[] (non-empty) are required'
    });
  }

  const movie = movies.find((m) => m.id === movieId);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });

  const show = movie.shows.find((s) => s.showId === showId);
  if (!show) return res.status(404).json({ error: 'Show not found' });

  const uniqueSeats = new Set(seats);
  if (uniqueSeats.size !== seats.length) {
    return res.status(400).json({ error: 'Duplicate seats in request' });
  }

  const alreadyBooked = seats.filter((seat) => show.bookedSeats.includes(seat));
  if (alreadyBooked.length > 0) {
    return res.status(409).json({
      error: 'Some seats are already booked',
      seats: alreadyBooked
    });
  }

  if (show.bookedSeats.length + seats.length > show.totalSeats) {
    return res.status(400).json({
      error: 'Not enough seats available',
      available: show.totalSeats - show.bookedSeats.length
    });
  }

  const booking = {
    bookingId: uuidv4(),
    movieId,
    movieTitle: movie.title,
    showId,
    showTime: show.time,
    screen: show.screen,
    customerName,
    seats,
    ticketPrice: TICKET_PRICE,
    totalAmount: seats.length * TICKET_PRICE,
    bookedAt: new Date().toISOString()
  };

  show.bookedSeats.push(...seats);
  bookings.push(booking);

  res.status(201).json({ message: 'Booking confirmed 🎬', booking });
});

// GET all bookings
app.get('/api/bookings', (req, res) => {
  res.json({ count: bookings.length, bookings });
});

// GET booking by ID
app.get('/api/bookings/:bookingId', (req, res) => {
  const booking = bookings.find((b) => b.bookingId === req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ---------- Start Server ----------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 Movie Ticket API running on port ${PORT}`);
});
