const mongoose = require('mongoose');

const deploymentSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Failed'],
    default: 'Pending',
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    message: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Deployment', deploymentSchema);
