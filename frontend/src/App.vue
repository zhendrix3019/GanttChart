<template>
  <div id="app">
    <div class="gantt-container">
      <div class="gantt-chart-wrapper">
        <div class="timeline-header">
          <div class="corner-cell"></div>
          <div class="timeline-months">
            <div v-for="month in months" :key="month.key" class="month-header" :style="{ width: month.width + 'px' }">
              {{ month.name }}
            </div>
          </div>
        </div>

        <div class="timeline-days-row">
          <div class="corner-cell"></div>
          <div class="timeline-days">
            <div v-for="day in days" :key="day.key" class="day-cell" :class="{ 'weekend': day.isWeekend }">
              {{ day.day }}
            </div>
          </div>
        </div>

        <div class="gantt-body">
          <div v-for="section in sections" :key="section.id" class="section-group">
            <div class="section-header">
              <div class="row-number"></div>
              <div class="section-title">{{ section.name }}</div>
            </div>

            <div v-for="(task, index) in section.tasks" :key="task.id" class="task-row">
              <div class="row-number">{{ task.rowNumber }}</div>
              <div class="timeline-area">
                <div class="grid-lines">
                  <div v-for="day in days" :key="'grid-' + day.key" class="grid-cell" :class="{ 'weekend': day.isWeekend }"></div>
                </div>

                <div v-if="task.type === 'milestone'"
                     class="milestone"
                     :style="getMilestoneStyle(task)"
                     :title="task.name">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <polygon points="10,2 18,10 10,18 2,10" :fill="task.color || '#666'"/>
                  </svg>
                  <div class="milestone-label">{{ task.name }}</div>
                </div>

                <div v-else-if="task.type === 'task'"
                     class="task-bar"
                     :style="getTaskBarStyle(task)"
                     @click="selectTask(task)"
                     :title="task.name">
                  <span class="task-text">{{ task.name }}</span>
                </div>

                <svg v-if="task.dependencies && task.dependencies.length" class="dependency-lines">
                  <path v-for="dep in getDependencyPaths(task)" :key="dep.id"
                        :d="dep.path"
                        stroke="#666"
                        stroke-width="1"
                        fill="none"
                        marker-end="url(#arrowhead)"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="instructions">
          <div class="instruction">1 - Set / Change Start date - with or without moving existing activities.</div>
          <div class="instruction">2 - Select work days - delete holidays etc from work days.</div>
          <div class="instruction">3 - Set scale - 'no scrolling' used for ones 'one page per inch' for printing not reducing or enlarging field print.</div>
          <div class="instruction">4 - Create and place Milestones — simple day activities, move around the page</div>
          <div class="instruction">5 - Create and place Timelines - increase or decrease duration , add in fill colors move timelines independently around the page</div>
          <div class="instruction">6 - Add Text lines - Adjust Font Size, Bold, Italic, Underline etc.</div>
        </div>
      </div>

      <div class="controls-panel">
        <button @click="setStartDate" class="control-btn">Set Start Date</button>
        <button @click="selectWorkDays" class="control-btn">Select Work Days</button>
        <button @click="setScale" class="control-btn">Set Scale</button>
        <button @click="createMilestone" class="control-btn">Create Milestone</button>
        <button @click="createTimeline" class="control-btn">Create Timeline</button>
        <button @click="addTextLine" class="control-btn">Add Text</button>
      </div>
    </div>

    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ modalTitle }}</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="modalType === 'milestone'" class="form-group">
            <label>Milestone Name:</label>
            <input v-model="milestoneForm.name" type="text" placeholder="Enter milestone name">
            <label>Date:</label>
            <input v-model="milestoneForm.date" type="date">
            <label>Section:</label>
            <select v-model="milestoneForm.section">
              <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.name }}</option>
            </select>
            <label>Color:</label>
            <input v-model="milestoneForm.color" type="color">
          </div>

          <div v-else-if="modalType === 'timeline'" class="form-group">
            <label>Task Name:</label>
            <input v-model="timelineForm.name" type="text" placeholder="Enter task name">
            <label>Start Date:</label>
            <input v-model="timelineForm.startDate" type="date">
            <label>End Date:</label>
            <input v-model="timelineForm.endDate" type="date">
            <label>Section:</label>
            <select v-model="timelineForm.section">
              <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.name }}</option>
            </select>
            <label>Color:</label>
            <input v-model="timelineForm.color" type="color">
          </div>

          <div v-else-if="modalType === 'startDate'" class="form-group">
            <label>Project Start Date:</label>
            <input v-model="projectStartDate" type="date">
            <label>
              <input v-model="moveExisting" type="checkbox">
              Move existing activities
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-secondary">Cancel</button>
          <button @click="saveModalData" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'

export default {
  name: 'App',
  setup() {
    const startDate = ref(dayjs('2023-10-23'))
    const endDate = ref(dayjs('2024-02-29'))
    const sections = ref([])
    const selectedTask = ref(null)
    const showModal = ref(false)
    const modalType = ref('')
    const modalTitle = ref('')

    const milestoneForm = ref({
      name: '',
      date: '',
      section: '',
      color: '#666666'
    })

    const timelineForm = ref({
      name: '',
      startDate: '',
      endDate: '',
      section: '',
      color: '#4CAF50'
    })

    const projectStartDate = ref('')
    const moveExisting = ref(false)

    const days = computed(() => {
      const result = []
      let current = startDate.value
      while (current.isBefore(endDate.value) || current.isSame(endDate.value)) {
        result.push({
          key: current.format('YYYY-MM-DD'),
          day: current.format('D'),
          isWeekend: current.day() === 0 || current.day() === 6,
          month: current.month(),
          year: current.year()
        })
        current = current.add(1, 'day')
      }
      return result
    })

    const months = computed(() => {
      const monthsMap = new Map()
      days.value.forEach(day => {
        const key = `${day.year}-${day.month}`
        if (!monthsMap.has(key)) {
          monthsMap.set(key, {
            key,
            name: dayjs().month(day.month).format('MMMM') + (day.month === 0 ? ` ${day.year}` : ''),
            count: 0
          })
        }
        monthsMap.get(key).count++
      })

      return Array.from(monthsMap.values()).map(month => ({
        ...month,
        width: month.count * 25
      }))
    })

    const getMilestoneStyle = (task) => {
      const taskDate = dayjs(task.start_date)
      const dayIndex = taskDate.diff(startDate.value, 'day')
      return {
        left: `${dayIndex * 25 + 5}px`
      }
    }

    const getTaskBarStyle = (task) => {
      const taskStart = dayjs(task.start_date)
      const taskEnd = dayjs(task.end_date)
      const dayIndex = taskStart.diff(startDate.value, 'day')
      const duration = taskEnd.diff(taskStart, 'day') + 1

      return {
        left: `${dayIndex * 25}px`,
        width: `${duration * 25}px`,
        backgroundColor: task.color || '#4CAF50'
      }
    }

    const getDependencyPaths = (task) => {
      return []
    }

    const selectTask = (task) => {
      selectedTask.value = task
    }

    const setStartDate = () => {
      modalType.value = 'startDate'
      modalTitle.value = 'Set Project Start Date'
      projectStartDate.value = startDate.value.format('YYYY-MM-DD')
      showModal.value = true
    }

    const selectWorkDays = () => {
      alert('Work days selection - Feature coming soon')
    }

    const setScale = () => {
      alert('Scale settings - Feature coming soon')
    }

    const createMilestone = () => {
      modalType.value = 'milestone'
      modalTitle.value = 'Create Milestone'
      milestoneForm.value = {
        name: '',
        date: dayjs().format('YYYY-MM-DD'),
        section: sections.value[0]?.id || '',
        color: '#666666'
      }
      showModal.value = true
    }

    const createTimeline = () => {
      modalType.value = 'timeline'
      modalTitle.value = 'Create Timeline'
      timelineForm.value = {
        name: '',
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
        section: sections.value[0]?.id || '',
        color: '#4CAF50'
      }
      showModal.value = true
    }

    const addTextLine = () => {
      alert('Add text line - Feature coming soon')
    }

    const closeModal = () => {
      showModal.value = false
      modalType.value = ''
    }

    const saveModalData = async () => {
      if (modalType.value === 'milestone') {
        const newTask = {
          name: milestoneForm.value.name,
          building: sections.value.find(s => s.id === milestoneForm.value.section)?.name || 'Other',
          start_date: milestoneForm.value.date,
          end_date: milestoneForm.value.date,
          type: 'milestone',
          color: milestoneForm.value.color,
          progress: 0
        }

        try {
          await axios.post('/api/tasks', newTask)
          await loadTasks()
          closeModal()
        } catch (error) {
          console.error('Error creating milestone:', error)
        }
      } else if (modalType.value === 'timeline') {
        const newTask = {
          name: timelineForm.value.name,
          building: sections.value.find(s => s.id === timelineForm.value.section)?.name || 'Other',
          start_date: timelineForm.value.startDate,
          end_date: timelineForm.value.endDate,
          type: 'task',
          color: timelineForm.value.color,
          progress: 0
        }

        try {
          await axios.post('/api/tasks', newTask)
          await loadTasks()
          closeModal()
        } catch (error) {
          console.error('Error creating timeline:', error)
        }
      } else if (modalType.value === 'startDate') {
        startDate.value = dayjs(projectStartDate.value)
        closeModal()
      }
    }

    const loadTasks = async () => {
      try {
        const response = await axios.get('/api/tasks')
        const tasks = response.data

        const grouped = {}
        tasks.forEach(task => {
          const building = task.building || 'Other'
          if (!grouped[building]) {
            grouped[building] = []
          }
          grouped[building].push(task)
        })

        sections.value = Object.keys(grouped).map((name, index) => ({
          id: index + 1,
          name,
          tasks: grouped[name].map((task, taskIndex) => ({
            ...task,
            rowNumber: taskIndex + 1
          }))
        }))
      } catch (error) {
        console.error('Error loading tasks:', error)
      }
    }

    const initializeSampleData = async () => {
      const sampleTasks = [
        {
          name: 'Auburn School District # 408',
          building: 'Auburn School District # 408',
          type: 'section',
          start_date: '2023-10-23',
          end_date: '2023-10-23',
          progress: 0,
          color: '#2196F3'
        },
        {
          name: 'Administration Building Portable #2',
          building: 'Auburn School District # 408',
          type: 'text',
          start_date: '2023-10-23',
          end_date: '2023-10-23',
          progress: 0,
          color: '#000000'
        },
        {
          name: 'Tie Down Inspection',
          building: 'Auburn School District # 408',
          company: 'Tie Down Inspection',
          type: 'milestone',
          start_date: '2023-10-27',
          end_date: '2023-10-27',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'receive wood doors & frames',
          building: 'Auburn School District # 408',
          company: 'receive wood',
          type: 'milestone',
          start_date: '2023-11-03',
          end_date: '2023-11-03',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'receive HM doors & frames',
          building: 'Auburn School District # 408',
          company: 'receive HM',
          type: 'milestone',
          start_date: '2023-11-10',
          end_date: '2023-11-10',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'Modular Set & Assembly (5)',
          building: 'Auburn School District # 408',
          company: 'Modular Set & Assembly (5)',
          type: 'task',
          start_date: '2023-10-30',
          end_date: '2023-11-03',
          progress: 0,
          color: '#FF5722'
        },
        {
          name: 'Interior Framing (8)',
          building: 'Auburn School District # 408',
          company: 'Interior Framing (8)',
          type: 'task',
          start_date: '2023-11-06',
          end_date: '2023-11-15',
          progress: 0,
          color: '#4CAF50'
        },
        {
          name: 'Frame permit (8)',
          building: 'Auburn School District # 408',
          company: 'Frame permit (8)',
          type: 'task',
          start_date: '2023-11-16',
          end_date: '2023-11-17',
          progress: 0,
          color: '#9C27B0'
        },
        {
          name: 'form & pour sidewalk (6)',
          building: 'Auburn School District # 408',
          company: 'form & pour',
          type: 'task',
          start_date: '2023-11-06',
          end_date: '2023-11-13',
          progress: 0,
          color: '#607D8B'
        },
        {
          name: 'electrical rough in (8)',
          building: 'Auburn School District # 408',
          type: 'task',
          start_date: '2023-11-20',
          end_date: '2023-11-30',
          progress: 0,
          color: '#000000'
        },
        {
          name: 'connect storm drainage (4)',
          building: 'Auburn School District # 408',
          type: 'task',
          start_date: '2023-10-30',
          end_date: '2023-11-02',
          progress: 0,
          color: '#8B4513'
        },
        {
          name: 'Re-roof building (5)',
          building: 'Auburn School District # 408',
          type: 'task',
          start_date: '2023-11-27',
          end_date: '2023-12-01',
          progress: 0,
          color: '#FF1744'
        },
        {
          name: 'Construction Schedule',
          building: 'Construction Schedule',
          type: 'section',
          start_date: '2023-10-23',
          end_date: '2023-10-23',
          progress: 0,
          color: '#2196F3'
        },
        {
          name: 'Roofing Helpers 7',
          building: 'Construction Schedule',
          type: 'milestone',
          start_date: '2023-11-01',
          end_date: '2023-11-01',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'Electrical Inspection',
          building: 'Construction Schedule',
          type: 'milestone',
          start_date: '2023-11-08',
          end_date: '2023-11-08',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'Plumbing team inspection',
          building: 'Construction Schedule',
          type: 'milestone',
          start_date: '2023-11-15',
          end_date: '2023-11-15',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'HVAC testing & supporting',
          building: 'Construction Schedule',
          type: 'milestone',
          start_date: '2023-11-22',
          end_date: '2023-11-22',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'Final inspection',
          building: 'Construction Schedule',
          type: 'milestone',
          start_date: '2023-12-15',
          end_date: '2023-12-15',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'Holiday Shut Down',
          building: 'Construction Schedule',
          type: 'task',
          start_date: '2023-12-22',
          end_date: '2024-01-02',
          progress: 0,
          color: '#9E9E9E'
        },
        {
          name: 'exterior painting as weather permits (23)',
          building: 'Construction Schedule',
          type: 'task',
          start_date: '2023-11-20',
          end_date: '2023-12-20',
          progress: 0,
          color: '#E91E63'
        },
        {
          name: 'landscape (17)',
          building: 'Construction Schedule',
          type: 'task',
          start_date: '2023-12-04',
          end_date: '2023-12-26',
          progress: 0,
          color: '#4CAF50'
        },
        {
          name: 'rough in plumbing (4)',
          building: 'Construction Schedule',
          type: 'task',
          start_date: '2023-11-27',
          end_date: '2023-11-30',
          progress: 0,
          color: '#2196F3'
        },
        {
          name: 'rough in mechanical (8)',
          building: 'Construction Schedule',
          type: 'task',
          start_date: '2023-11-13',
          end_date: '2023-11-22',
          progress: 0,
          color: '#FF9800'
        },
        {
          name: 'rough in electrical (8)',
          building: 'Construction Schedule',
          type: 'task',
          start_date: '2023-12-11',
          end_date: '2023-12-20',
          progress: 0,
          color: '#F44336'
        },
        {
          name: 'Modern Building Systems Inc.',
          building: 'Modern Building Systems Inc.',
          type: 'section',
          start_date: '2023-10-23',
          end_date: '2023-10-23',
          progress: 0,
          color: '#2196F3'
        },
        {
          name: 'Lake Tapps Construction Unltd.',
          building: 'Modern Building Systems Inc.',
          type: 'text',
          start_date: '2023-10-23',
          end_date: '2023-10-23',
          progress: 0,
          color: '#000000'
        },
        {
          name: 'Building Final Inspection',
          building: 'Modern Building Systems Inc.',
          type: 'milestone',
          start_date: '2024-01-15',
          end_date: '2024-01-15',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'Plumbing C.O.',
          building: 'Modern Building Systems Inc.',
          type: 'milestone',
          start_date: '2024-01-22',
          end_date: '2024-01-22',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'Electrical Final',
          building: 'Modern Building Systems Inc.',
          type: 'milestone',
          start_date: '2024-02-05',
          end_date: '2024-02-05',
          progress: 0,
          color: '#666666'
        },
        {
          name: 'install hardware main building (11)',
          building: 'Modern Building Systems Inc.',
          type: 'task',
          start_date: '2024-01-08',
          end_date: '2024-01-22',
          progress: 0,
          color: '#4CAF50'
        },
        {
          name: 'wall doors & hardware (8)',
          building: 'Modern Building Systems Inc.',
          type: 'task',
          start_date: '2024-01-15',
          end_date: '2024-01-24',
          progress: 0,
          color: '#00BCD4'
        },
        {
          name: 'punch list / All Subs (5)',
          building: 'Modern Building Systems Inc.',
          type: 'task',
          start_date: '2024-01-29',
          end_date: '2024-02-02',
          progress: 0,
          color: '#795548'
        },
        {
          name: 'insulating (3)',
          building: 'Modern Building Systems Inc.',
          type: 'task',
          start_date: '2024-01-08',
          end_date: '2024-01-10',
          progress: 0,
          color: '#9C27B0'
        },
        {
          name: 'Floor Coats (5)',
          building: 'Modern Building Systems Inc.',
          type: 'task',
          start_date: '2024-01-22',
          end_date: '2024-01-26',
          progress: 0,
          color: '#FF5722'
        },
        {
          name: 'floor covering (4)',
          building: 'Modern Building Systems Inc.',
          type: 'task',
          start_date: '2024-01-15',
          end_date: '2024-01-18',
          progress: 0,
          color: '#3F51B5'
        },
        {
          name: 'plumbing trim (4)',
          building: 'Modern Building Systems Inc.',
          type: 'task',
          start_date: '2024-01-22',
          end_date: '2024-01-25',
          progress: 0,
          color: '#009688'
        },
        {
          name: 'HVAC trim (4)',
          building: 'Modern Building Systems Inc.',
          type: 'task',
          start_date: '2024-01-29',
          end_date: '2024-02-01',
          progress: 0,
          color: '#FFC107'
        },
        {
          name: 'electrical - systems trim - test (14)',
          building: 'Modern Building Systems Inc.',
          type: 'task',
          start_date: '2024-01-15',
          end_date: '2024-02-01',
          progress: 0,
          color: '#F44336'
        }
      ]

      for (const task of sampleTasks) {
        if (task.type !== 'section' && task.type !== 'text') {
          try {
            await axios.post('/api/tasks', task)
          } catch (error) {
            console.error('Error creating task:', task.name, error)
          }
        }
      }

      await loadTasks()
    }

    onMounted(async () => {
      await loadTasks()

      if (sections.value.length === 0) {
        await initializeSampleData()
      }
    })

    return {
      startDate,
      endDate,
      days,
      months,
      sections,
      selectedTask,
      showModal,
      modalType,
      modalTitle,
      milestoneForm,
      timelineForm,
      projectStartDate,
      moveExisting,
      getMilestoneStyle,
      getTaskBarStyle,
      getDependencyPaths,
      selectTask,
      setStartDate,
      selectWorkDays,
      setScale,
      createMilestone,
      createTimeline,
      addTextLine,
      closeModal,
      saveModalData,
      loadTasks
    }
  }
}
</script>

<style>
@import './style.css';
</style>