/**
 * WebSocket Service for Real-time Notifications
 * Handles real-time updates for students and teachers
 */

// Store connected clients
const clients = new Map();

// Broadcast to specific user
exports.broadcastToUser = (userId, event, data) => {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ event, data }));
      }
    });
  }
};

// Broadcast to all connected clients (for teachers)
exports.broadcastToAll = (event, data) => {
  clients.forEach((userClients) => {
    userClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ event, data }));
      }
    });
  });
};

// Broadcast to specific role (e.g., all teachers)
exports.broadcastToRole = (role, event, data) => {
  clients.forEach((userClients, userId) => {
    const user = getUserFromId(userId);
    if (user?.role === role) {
      userClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ event, data }));
        }
      });
    }
  });
};

const getUserFromId = (userId) => {
  // In production, you'd lookup from a session store
  return null;
};

// Add client connection
exports.addClient = (userId, ws) => {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(ws);
};

// Remove client connection
exports.removeClient = (userId, ws) => {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.delete(ws);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
};

// Notify student of new assignment
exports.notifyNewAssignment = (studentId, assignment) => {
  exports.broadcastToUser(studentId, 'new_assignment', {
    id: assignment._id,
    title: assignment.title,
    course: assignment.course?.name,
    dueDate: assignment.dueDate
  });
};

// Notify student of grade posted
exports.notifyGradePosted = (studentId, grade) => {
  exports.broadcastToUser(studentId, 'grade_posted', {
    course: grade.course?.name,
    grade: grade.letterGrade,
    percentage: grade.percentage
  });
};

// Notify teacher of new submission
exports.notifyNewSubmission = (teacherId, submission) => {
  exports.broadcastToUser(teacherId, 'new_submission', {
    assignmentTitle: submission.assignment?.title,
    studentName: submission.student?.name,
    submittedAt: submission.submittedAt
  });
};

// Get connected count
exports.getConnectedCount = () => clients.size;

module.exports = exports;