const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: '../database/gantt.db',
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

const sampleTasks = [
  {
    name: 'Foundation Work',
    building: 'Building 100',
    company: 'Franklin Pierce Robie/Henla',
    start_date: '2025-01-10',
    end_date: '2025-02-28',
    progress: 65,
    color: '#4CAF50'
  },
  {
    name: 'HVAC Installation',
    building: 'Building 100',
    company: 'Collins HVAC Electric',
    start_date: '2025-03-01',
    end_date: '2025-04-15',
    progress: 30,
    color: '#2196F3'
  },
  {
    name: 'Automation Systems',
    building: 'Building 100',
    company: 'KTB Automation Inc.',
    start_date: '2025-04-20',
    end_date: '2025-05-30',
    progress: 10,
    color: '#FF9800'
  },
  {
    name: 'Structural Steel',
    building: 'Building 200',
    company: 'ACS Steel Construction',
    start_date: '2025-01-15',
    end_date: '2025-03-10',
    progress: 50,
    color: '#9C27B0'
  },
  {
    name: 'Electrical Wiring',
    building: 'Building 200',
    company: 'Collins HVAC Electric',
    start_date: '2025-03-15',
    end_date: '2025-05-01',
    progress: 20,
    color: '#F44336'
  },
  {
    name: 'Plumbing Installation',
    building: 'Building 200',
    company: 'Metro Plumbing Services',
    start_date: '2025-05-05',
    end_date: '2025-06-20',
    progress: 0,
    color: '#00BCD4'
  }
];

async function seedDatabase() {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced, creating sample tasks...');
    
    for (const task of sampleTasks) {
      await Task.create(task);
      console.log(`Created task: ${task.name} for ${task.building}`);
    }
    
    console.log('Sample data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();