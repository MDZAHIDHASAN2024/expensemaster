const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000', 'https://your-app.vercel.app'],
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/family', require('./routes/family'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/income', require('./routes/income'));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    // Indexes for performance
    mongoose.connection
      .collection('expenses')
      .createIndex({ user: 1, date: -1 })
      .catch(() => {});
    mongoose.connection
      .collection('expenses')
      .createIndex({ user: 1, itemType: 1 })
      .catch(() => {});
  })
  .catch((err) => console.log('MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
