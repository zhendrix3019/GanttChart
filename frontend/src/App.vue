<template>
  <div id="app">
    <div class="gantt-container">
      <div class="gantt-header">
        <h1>Construction Project Gantt Chart</h1>
        <div class="controls">
          <div class="date-range-filter">
            <label>From:</label>
            <input v-model="dateRange.start" type="date" @change="filterTasks">
            <label>To:</label>
            <input v-model="dateRange.end" type="date" @change="filterTasks">
            <button @click="resetDateRange" class="btn btn-secondary">Reset</button>
          </div>
          <button @click="showAddTask = true" class="btn btn-primary">Add Task</button>
          <button @click="loadTasks" class="btn btn-secondary">Refresh</button>
        </div>
      </div>

      <div class="gantt-chart-wrapper">
        <div class="timeline-header">
          <div class="task-list-header">Tasks</div>
          <div class="timeline-grid">
            <div class="months-row">
              <div v-for="month in visibleMonths" :key="month.key" class="month-header" :style="{ width: month.width + 'px' }">
                {{ month.name }} {{ month.year }}
              </div>
            </div>
            <div class="days-row">
              <div v-for="day in visibleDays" :key="day.key" class="day-header" :class="{ 'weekend': day.isWeekend }">
                {{ day.date }}
              </div>
            </div>
          </div>
        </div>

        <div class="gantt-body">
          <div v-for="building in groupedTasks" :key="building.name" class="building-group">
            <div class="building-header">
              <div class="task-list-header">{{ building.name }}</div>
              <div class="timeline-grid"></div>
            </div>
            
            <div v-for="task in building.tasks" :key="task.id" class="task-row">
              <div class="task-info">
                <div class="task-company">{{ task.company || 'No Company' }}</div>
                <div class="task-name">{{ task.name }}</div>
              </div>
              <div class="timeline-grid">
                <div class="grid-lines">
                  <div v-for="day in visibleDays" :key="'grid-' + day.key" class="grid-line" :class="{ 'weekend': day.isWeekend }"></div>
                </div>
                <div 
                  v-if="isTaskVisible(task)"
                  class="task-bar"
                  :style="getTaskBarStyle(task)"
                  @click="editTask(task)"
                  :title="`${task.name} (${task.progress}%)`"
                >
                  <span class="task-text">{{ task.name }}</span>
                  <span class="task-progress">{{ task.progress }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddTask || selectedTask" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ selectedTask ? 'Edit Task' : 'Add New Task' }}</h2>
        </div>
        <form @submit.prevent="saveTask">
          <div class="form-group">
            <label>Building/Project</label>
            <select v-model="taskForm.building" required>
              <option value="Building 100">Building 100</option>
              <option value="Building 200">Building 200</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Company/Contractor</label>
            <input v-model="taskForm.company" type="text" placeholder="e.g., Franklin Pierce Robie/Henla" required>
          </div>
          <div class="form-group">
            <label>Task Name</label>
            <input v-model="taskForm.name" type="text" placeholder="Task name" required>
          </div>
          <div class="form-group">
            <label>Start Date</label>
            <input v-model="taskForm.start_date" type="date" required>
          </div>
          <div class="form-group">
            <label>End Date</label>
            <input v-model="taskForm.end_date" type="date" required>
          </div>
          <div class="form-group">
            <label>Progress (%)</label>
            <input v-model.number="taskForm.progress" type="number" min="0" max="100" required>
          </div>
          <div class="form-group">
            <label>Color</label>
            <div class="color-picker">
              <div 
                v-for="color in colors" 
                :key="color"
                class="color-option"
                :class="{ selected: taskForm.color === color }"
                :style="{ backgroundColor: color }"
                @click="taskForm.color = color"
              ></div>
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="taskForm.description" placeholder="Task description"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">{{ selectedTask ? 'Update' : 'Create' }}</button>
            <button v-if="selectedTask" type="button" @click="deleteTask" class="btn" style="background-color: #f44336; color: white;">Delete</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

export default {
  name: 'App',
  setup() {
    const tasks = ref([])
    const allTasks = ref([])
    const showAddTask = ref(false)
    const selectedTask = ref(null)
    const dateRange = ref({
      start: dayjs().startOf('year').format('YYYY-MM-DD'),
      end: dayjs().endOf('year').format('YYYY-MM-DD')
    })
    
    const taskForm = ref({
      building: 'Building 100',
      company: '',
      name: '',
      start_date: '',
      end_date: '',
      progress: 0,
      color: '#4CAF50',
      description: ''
    })

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFC107', '#795548']

    const visibleStartDate = computed(() => dayjs(dateRange.value.start))
    const visibleEndDate = computed(() => dayjs(dateRange.value.end))
    
    const visibleDays = computed(() => {
      const days = []
      let current = visibleStartDate.value
      const end = visibleEndDate.value
      
      while (current.isBefore(end) || current.isSame(end)) {
        days.push({
          key: current.format('YYYY-MM-DD'),
          date: current.format('D'),
          isWeekend: current.day() === 0 || current.day() === 6,
          month: current.month(),
          year: current.year()
        })
        current = current.add(1, 'day')
      }
      return days
    })

    const visibleMonths = computed(() => {
      const months = []
      const monthMap = {}
      
      visibleDays.value.forEach(day => {
        const key = `${day.year}-${day.month}`
        if (!monthMap[key]) {
          monthMap[key] = {
            key,
            name: dayjs().month(day.month).format('MMM'),
            year: day.year,
            count: 0
          }
        }
        monthMap[key].count++
      })
      
      Object.values(monthMap).forEach(month => {
        month.width = month.count * 30
        months.push(month)
      })
      
      return months
    })

    const groupedTasks = computed(() => {
      const groups = {}
      tasks.value.forEach(task => {
        const building = task.building || 'Other'
        if (!groups[building]) {
          groups[building] = {
            name: building,
            tasks: []
          }
        }
        groups[building].tasks.push(task)
      })
      return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))
    })

    const isTaskVisible = (task) => {
      const taskStart = dayjs(task.start_date)
      const taskEnd = dayjs(task.end_date)
      return !(taskEnd.isBefore(visibleStartDate.value) || taskStart.isAfter(visibleEndDate.value))
    }

    const getTaskBarStyle = (task) => {
      const taskStart = dayjs(task.start_date)
      const taskEnd = dayjs(task.end_date)
      const chartStart = visibleStartDate.value
      
      // Calculate position based on 30px per day
      const dayWidth = 30
      const leftDays = taskStart.diff(chartStart, 'day')
      const taskDays = taskEnd.diff(taskStart, 'day') + 1
      
      const leftPosition = leftDays * dayWidth
      const barWidth = taskDays * dayWidth
      
      return {
        left: `${leftPosition}px`,
        width: `${barWidth}px`,
        backgroundColor: task.color || '#4CAF50'
      }
    }

    const filterTasks = () => {
      if (dateRange.value.start && dateRange.value.end) {
        const start = dayjs(dateRange.value.start)
        const end = dayjs(dateRange.value.end)
        
        tasks.value = allTasks.value.filter(task => {
          const taskStart = dayjs(task.start_date)
          const taskEnd = dayjs(task.end_date)
          return !(taskEnd.isBefore(start) || taskStart.isAfter(end))
        })
      } else {
        tasks.value = [...allTasks.value]
      }
    }

    const resetDateRange = () => {
      dateRange.value = {
        start: dayjs().startOf('year').format('YYYY-MM-DD'),
        end: dayjs().endOf('year').format('YYYY-MM-DD')
      }
      filterTasks()
    }

    const loadTasks = async () => {
      try {
        const response = await axios.get('/api/tasks')
        allTasks.value = response.data
        filterTasks()
      } catch (error) {
        console.error('Error loading tasks:', error)
        alert('Error loading tasks')
      }
    }

    const saveTask = async () => {
      try {
        const taskData = { ...taskForm.value }
        
        if (selectedTask.value) {
          await axios.put(`/api/tasks/${selectedTask.value.id}`, taskData)
        } else {
          await axios.post('/api/tasks', taskData)
        }
        
        await loadTasks()
        closeModal()
      } catch (error) {
        console.error('Error saving task:', error)
        alert('Error saving task')
      }
    }

    const editTask = (task) => {
      selectedTask.value = task
      taskForm.value = {
        building: task.building || 'Building 100',
        company: task.company || '',
        name: task.name,
        start_date: dayjs(task.start_date).format('YYYY-MM-DD'),
        end_date: dayjs(task.end_date).format('YYYY-MM-DD'),
        progress: task.progress,
        color: task.color || '#4CAF50',
        description: task.description || ''
      }
    }

    const deleteTask = async () => {
      if (!selectedTask.value || !confirm('Are you sure you want to delete this task?')) return
      
      try {
        await axios.delete(`/api/tasks/${selectedTask.value.id}`)
        await loadTasks()
        closeModal()
      } catch (error) {
        console.error('Error deleting task:', error)
        alert('Error deleting task')
      }
    }

    const closeModal = () => {
      showAddTask.value = false
      selectedTask.value = null
      taskForm.value = {
        building: 'Building 100',
        company: '',
        name: '',
        start_date: '',
        end_date: '',
        progress: 0,
        color: '#4CAF50',
        description: ''
      }
    }

    onMounted(() => {
      loadTasks()
    })

    return {
      tasks,
      groupedTasks,
      showAddTask,
      selectedTask,
      taskForm,
      colors,
      dateRange,
      visibleDays,
      visibleMonths,
      isTaskVisible,
      getTaskBarStyle,
      loadTasks,
      saveTask,
      editTask,
      deleteTask,
      closeModal,
      filterTasks,
      resetDateRange
    }
  }
}
</script>