const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors'); // Import the cors module
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Use the cors middleware to enable CORS for all routes
app.use(cors());

app.use(bodyParser.json({ limit: '100mb' }));

// Use the cors middleware for Socket.io
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;
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

const generateRandomId = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomId = '';

  for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomId += characters.charAt(randomIndex);
  }

  return randomId;
}

async function createTemplateJsonDirIfNotExist() {
  const dirPath = 'template_json';
  try {
      await fs.access(dirPath);
  } catch (err) {
      if (err.code === 'ENOENT') {
          await fs.mkdir(dirPath);
      }
  }
}

// POST endpoint to handle incoming JSON data
app.post('/api/savejson', async (req, res) => {
  const jsonData = req.body;
  const jsonString = await JSON.stringify(jsonData, null, 2);
  let fileName = `${generateRandomId(8)}.json`;

  await createTemplateJsonDirIfNotExist();

  // for update file
  if(jsonData?.seating_id) {
    fileName = jsonData?.seating_id;
  }

  fs.writeFile(`template_json/${fileName}.json`, jsonString, (err) => {
    if (err) {
        console.error(err);
        res.status(500).send(err?.message);
    } else {
        console.log('JSON data saved successfully.');
        res.status(200).send('JSON data saved successfully.');
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});