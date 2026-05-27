require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Queue } = require('bullmq');
const Deployment = require('./models/Deployment');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/control_panel')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// BullMQ Setup
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

const deployQueue = new Queue('deployments', { connection });

// POST /api/deploy
app.post('/api/deploy', async (req, res) => {
  try {
    const { clientName, domain, image } = req.body;
    
    if (!clientName || !domain || !image) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save request to MongoDB as "Pending"
    const deployment = new Deployment({
      clientName,
      domain,
      image,
      status: 'Pending',
      logs: [{ message: 'Deployment requested' }]
    });
    
    await deployment.save();

    // Push task to background queue
    await deployQueue.add('deployTask', { deploymentId: deployment._id }, {
      jobId: deployment._id.toString()
    });

    // Respond immediately with 200 OK
    res.status(200).json({ message: 'Deployment queued', deploymentId: deployment._id });
  } catch (error) {
    console.error('Error in /api/deploy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/status/:id
app.get('/api/status/:id', async (req, res) => {
  try {
    const deployment = await Deployment.findById(req.params.id);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    res.json(deployment);
  } catch (error) {
    console.error('Error in /api/status/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Start the worker process
require('./worker');
