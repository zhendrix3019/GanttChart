const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database', 'gantt.db'),
  logging: console.log
});

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  building: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Building 100'
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
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
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3498db'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

async function updateTask(id, start_date, end_date) {
  try {
    const task = await Task.findByPk(id);
    if (task) {
      await task.update({ start_date, end_date });
      console.log(`Updated task ${id}: ${task.name}`);
    }
  } catch (error) {
    console.error(`Error updating task ${id}:`, error);
  }
}

async function updateAllTasks() {
  try {
    await sequelize.sync();

    // Update specific tasks to current timeframe
    await updateTask(1, '2025-09-01', '2025-10-15'); // Foundation Work
    await updateTask(2, '2025-10-01', '2025-11-15'); // HVAC Installation
    await updateTask(3, '2025-11-01', '2025-12-15'); // Automation Systems
    await updateTask(4, '2025-09-15', '2025-11-01'); // Structural Steel
    await updateTask(5, '2025-10-15', '2025-12-01'); // Electrical Wiring
    await updateTask(6, '2025-11-15', '2025-12-30'); // Plumbing Installation

    console.log('All tasks updated successfully!');

  } catch (error) {
    console.error('Error updating tasks:', error);
  } finally {
    await sequelize.close();
  }
}

updateAllTasks();