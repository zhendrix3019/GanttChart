const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();

const { verifyGoogleToken, generateJWT, verifyJWT, requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_PATH || (process.env.NODE_ENV === 'production' ? '/data/gantt.db' : '../database/gantt.db'),
  logging: false
});

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Task name cannot be empty' },
      len: { args: [1, 255], msg: 'Task name must be between 1 and 255 characters' }
    }
  },
  building: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Building 100',
    validate: {
      notEmpty: { msg: 'Building/section name cannot be empty' }
    }
  },
  sub_header: {
    type: DataTypes.STRING,
    allowNull: true
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: { msg: 'Start date must be a valid date' }
    }
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: { msg: 'End date must be a valid date' },
      isAfterOrEqualStart(value) {
        if (this.start_date && value && new Date(value) < new Date(this.start_date)) {
          throw new Error('End date must be on or after start date');
        }
      }
    }
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Progress must be at least 0' },
      max: { args: [100], msg: 'Progress cannot exceed 100' }
    }
  },
  dependencies: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  row_index: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3498db',
    validate: {
      is: { args: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, msg: 'Color must be a valid hex color code' }
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'task',
    allowNull: false,
    validate: {
      isIn: { args: [['task', 'milestone', 'section', 'text']], msg: 'Type must be task, milestone, section, or text' }
    }
  },
  symbol: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// ==================== AUTH ROUTES ====================

// Dev login (only in development)
app.post('/api/auth/dev-login', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { generateJWT } = require('./middleware/auth');
  const devUser = {
    email: 'dev@localhost',
    name: 'Dev User',
    picture: null
  };

  const token = generateJWT(devUser);
  res.json({ token, user: devUser });
});

// Login with Google
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  const googleUser = await verifyGoogleToken(credential);

  if (!googleUser) {
    return res.status(401).json({ error: 'Invalid Google token' });
  }

  // Generate JWT for the user
  const token = generateJWT(googleUser);

  res.json({
    token,
    user: {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    }
  });
});

// Verify JWT token
app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// ==================== PROTECTED TASK ROUTES ====================

app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      order: [['building', 'ASC'], ['row_index', 'ASC'], ['start_date', 'ASC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/date-range', requireAuth, async (req, res) => {
  try {
    // Get the earliest start_date and latest end_date from all tasks
    const result = await Task.findOne({
      attributes: [
        [sequelize.fn('MIN', sequelize.col('start_date')), 'minDate'],
        [sequelize.fn('MAX', sequelize.col('end_date')), 'maxDate']
      ],
      raw: true
    });

    // Default range if no tasks exist
    let startDate = new Date();
    let endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    if (result.minDate && result.maxDate) {
      startDate = new Date(result.minDate);
      endDate = new Date(result.maxDate);

      // Add 2 weeks padding before and after
      startDate.setDate(startDate.getDate() - 14);
      endDate.setDate(endDate.getDate() + 14);
    }

    res.json({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error getting date range:', error);
    // Fallback to default range
    res.json({
      start_date: '2026-01-01',
      end_date: '2026-12-31'
    });
  }
});

app.post('/api/tasks', requireAuth, async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await task.update(req.body);
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await task.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

sequelize.sync({ alter: true }).then(() => {
  console.log('Database synced with schema updates');
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database sync error:', err);
});
