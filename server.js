const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors'); // Import the cors module

const app = express();
const server = http.createServer(app);

// Use the cors middleware to enable CORS for all routes
app.use(cors());

// Use the cors middleware for Socket.io
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = 'mongodb://127.0.0.1:27017/realtime_database'; // Replace with your MongoDB connection URI

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// // Define the Schema for the database document
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
});

// // Create the Message model
const Message = mongoose.model('Message', messageSchema);

// Serve static files from the public folder
// app.use(express.static('public'));

// Handle new socket connections
io.on('connection', (socket) => {

  // Fetch initial data from MongoDB and send it to the client
  Message.find({})
  .then(messages => {
    socket.emit('initialData', messages);
  })
  .catch(err => {
    console.error('Error fetching data from MongoDB:', err);
  });

  // Listen for new messages from the client
  socket.on('newMessage', (data) => {
    console.log('New message received:', data);

    // Save the new message to MongoDB
    const newMessage = new Message(data);
    newMessage.save()
    .then(savedMessage => {
      // Broadcast the new message to all connected clients
      io.emit('newMessage', savedMessage);
    })
    .catch(err => {
      console.error('Error saving message to MongoDB:', err);
    });

    // io.emit('newMessage', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});