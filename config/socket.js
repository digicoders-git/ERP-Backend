const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*", // Adjust this in production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join_branch', (branchId) => {
      socket.join(`branch_${branchId}`);
      console.log(`Socket ${socket.id} joined branch: ${branchId}`);
    });

    socket.on('join_trip', (tripId) => {
      socket.join(`trip_${tripId}`);
      console.log(`Socket ${socket.id} joined trip: ${tripId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Helper to emit events to specific rooms
const emitToBranch = (branchId, event, data) => {
  if (io) {
    io.to(`branch_${branchId}`).emit(event, data);
  }
};

const emitToTrip = (tripId, event, data) => {
  if (io) {
    io.to(`trip_${tripId}`).emit(event, data);
  }
};

module.exports = { initSocket, getIo, emitToBranch, emitToTrip };
