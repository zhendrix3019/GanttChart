const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database', 'gantt.db'),
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

async function updateSeedData() {
  try {
    await sequelize.sync();

    // Clear existing data
    await Task.destroy({ where: {} });

    // Create new tasks with better date ranges around current time
    const tasks = [
      {
        name: "Foundation Work",
        building: "Building 100",
        company: "Franklin Pierce Robie/Henla",
        start_date: "2025-09-01",
        end_date: "2025-10-15",
        progress: 65,
        color: "#4CAF50"
      },
      {
        name: "HVAC Installation",
        building: "Building 100",
        company: "Collins HVAC Electric",
        start_date: "2025-10-01",
        end_date: "2025-11-15",
        progress: 30,
        color: "#2196F3"
      },
      {
        name: "Automation Systems",
        building: "Building 100",
        company: "KTB Automation Inc.",
        start_date: "2025-11-01",
        end_date: "2025-12-15",
        progress: 10,
        color: "#FF9800"
      },
      {
        name: "Structural Steel",
        building: "Building 200",
        company: "ACS Steel Construction",
        start_date: "2025-09-15",
        end_date: "2025-11-01",
        progress: 50,
        color: "#9C27B0"
      },
      {
        name: "Electrical Wiring",
        building: "Building 200",
        company: "Collins HVAC Electric",
        start_date: "2025-10-15",
        end_date: "2025-12-01",
        progress: 20,
        color: "#F44336"
      },
      {
        name: "Plumbing Installation",
        building: "Building 200",
        company: "Metro Plumbing Services",
        start_date: "2025-11-15",
        end_date: "2025-12-30",
        progress: 0,
        color: "#00BCD4"
      }
    ];

    for (const task of tasks) {
      await Task.create(task);
    }

    console.log('Seed data updated successfully!');
    console.log(`Created ${tasks.length} tasks with dates around current period`);

  } catch (error) {
    console.error('Error updating seed data:', error);
  } finally {
    await sequelize.close();
  }
}

updateSeedData();