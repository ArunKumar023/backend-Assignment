const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const Deployment = require('./models/Deployment');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

const deployWorker = new Worker('deployments', async job => {
  const { deploymentId } = job.data;
  console.log(`Processing deployment ${deploymentId}`);

  try {
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      console.log(`Deployment ${deploymentId} not found`);
      return;
    }

    deployment.status = 'In Progress';
    deployment.logs.push({ message: 'Deployment started in worker' });
    await deployment.save();

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 5000));

    deployment.status = 'Completed';
    deployment.logs.push({ message: 'Deployment completed successfully' });
    await deployment.save();
    console.log(`Deployment ${deploymentId} completed`);

  } catch (error) {
    console.error(`Error processing deployment ${deploymentId}:`, error);
    try {
      const deployment = await Deployment.findById(deploymentId);
      if (deployment) {
        deployment.status = 'Failed';
        deployment.logs.push({ message: `Deployment failed: ${error.message}` });
        await deployment.save();
      }
    } catch (dbError) {
      console.error('Error updating deployment status to Failed:', dbError);
    }
    throw error;
  }
}, { connection });

deployWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});

console.log('Worker listening for deployment jobs...');
