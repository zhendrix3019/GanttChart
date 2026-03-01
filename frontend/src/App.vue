<template>
  <div id="app">
    <div class="gantt-container">
      <div class="project-filter">
        <label>View Project:</label>
        <select v-model="selectedProject" @change="filterByProject(selectedProject)">
          <option value="all">All Projects</option>
          <option v-for="project in projectList" :key="project" :value="project">{{ project }}</option>
        </select>
        <button class="dark-mode-btn" @click="toggleDarkMode" :title="darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
          {{ darkMode ? '☀️' : '🌙' }}
        </button>
      </div>
      <div class="gantt-chart-wrapper">
        <div class="timeline-header">
          <div class="corner-cell"></div>
          <div class="timeline-months" :style="{ width: timelineWidth + 'px', minWidth: timelineWidth + 'px' }">
            <div v-for="month in months" :key="month.key" class="month-header" :style="{ width: month.width + 'px' }">
              {{ month.name }}
            </div>
          </div>
        </div>

        <div class="timeline-days-row">
          <div class="corner-cell"></div>
          <div class="timeline-days" :style="{ width: timelineWidth + 'px', minWidth: timelineWidth + 'px' }">
            <div v-for="day in days" :key="day.key" class="day-cell" :class="{ 'weekend': day.isWeekend }" :style="{ width: dayWidth + 'px', minWidth: dayWidth + 'px' }">
              {{ day.day }}
            </div>
          </div>
        </div>

        <div class="gantt-body">
          <div v-for="section in sections" :key="section.id" class="section-group">
            <div class="task-row section-title-row">
              <div class="row-number"></div>
              <div class="timeline-area" :style="{ width: timelineWidth + 'px', minWidth: timelineWidth + 'px' }">
                <div class="grid-lines" :style="{ width: timelineWidth + 'px' }">
                  <div v-for="day in days" :key="'grid-' + day.key" class="grid-cell" :class="{ 'weekend': day.isWeekend }" :style="{ width: dayWidth + 'px', minWidth: dayWidth + 'px' }"></div>
                </div>
                <div class="section-header">
                  <div class="section-move-btns">
                    <button class="section-move-btn" @click.stop="moveSectionUp(section)" title="Move Section Up">&#9650;</button>
                    <button class="section-move-btn" @click.stop="moveSectionDown(section)" title="Move Section Down">&#9660;</button>
                  </div>
                  <div class="section-title-text">{{ section.name }}</div>
                  <div v-if="section.sub_header" class="section-sub-header">{{ section.sub_header }}</div>
                  <button class="section-edit-btn" @click.stop="editSection(section)" title="Edit Section">&#9998;</button>
                  <button class="section-delete-btn" @click.stop="confirmDeleteSection(section)" title="Delete Section">×</button>
                </div>
              </div>
            </div>

            <div v-for="row in section.rows" :key="row.rowIndex" class="task-row">
              <div class="row-number">{{ row.rowNumber }}</div>
              <div class="timeline-area" :style="{ width: timelineWidth + 'px', minWidth: timelineWidth + 'px' }">
                <div class="grid-lines" :style="{ width: timelineWidth + 'px' }">
                  <div v-for="day in days" :key="'grid-' + day.key" class="grid-cell" :class="{ 'weekend': day.isWeekend }" :style="{ width: dayWidth + 'px', minWidth: dayWidth + 'px' }"></div>
                </div>

                <template v-for="task in row.tasks" :key="task.id">
                  <div v-if="task.type === 'milestone'"
                       class="milestone"
                       :class="{ 'dragging': draggingTask && draggingTask.id === task.id }"
                       :style="getMilestoneStyle(task)"
                       :title="task.name"
                       @mousedown="startMilestoneDrag($event, task)"
                       @contextmenu.prevent="showContextMenu($event, task)">
                    <button class="edit-btn" @click.stop="editTask(task)" title="Edit">&#9998;</button>
                    <svg width="20" height="20" viewBox="0 0 20 20">
                      <polygon points="10,2 18,10 10,18 2,10" :fill="task.color || '#666'"/>
                    </svg>
                    <div class="milestone-label">{{ task.name }}</div>
                    <button class="delete-btn" @click.stop="confirmDelete(task)" title="Delete">×</button>
                  </div>

                  <div v-else-if="task.type === 'task'"
                       class="task-bar"
                       :class="{ 'dragging': draggingTask && draggingTask.id === task.id }"
                       :style="getTaskBarStyle(task)"
                       :title="task.name"
                       @contextmenu.prevent="showContextMenu($event, task)">
                    <button class="edit-btn" @click.stop="editTask(task)" title="Edit">&#9998;</button>
                    <div class="resize-handle resize-start" @mousedown="startTaskDrag($event, task, 'resize-start')"></div>
                    <div class="task-bar-content" @mousedown="startTaskDrag($event, task, 'move')">
                      <span class="task-date-start">{{ getTaskStartDay(task) }}</span>
                      <span class="task-text">{{ task.name }}</span>
                      <span class="task-date-end">{{ getTaskEndDay(task) }}</span>
                    </div>
                    <div class="resize-handle resize-end" @mousedown="startTaskDrag($event, task, 'resize-end')"></div>
                    <button class="delete-btn" @click.stop="confirmDelete(task)" title="Delete">×</button>
                  </div>

                  <div v-else-if="task.type === 'text'"
                       class="text-item"
                       :class="{ 'dragging': draggingTask && draggingTask.id === task.id }"
                       :style="getTextStyle(task)"
                       @mousedown="startTextDrag($event, task)"
                       @contextmenu.prevent="showContextMenu($event, task)">
                    <button class="edit-btn" @click.stop="editTask(task)" title="Edit">&#9998;</button>
                    {{ task.name }}
                    <button class="delete-btn text-delete" @click.stop="confirmDelete(task)" title="Delete">×</button>
                  </div>
                </template>

                <svg v-if="row.tasks.some(t => t.dependencies && t.dependencies.length)" class="dependency-lines">
                  <template v-for="task in row.tasks" :key="'dep-' + task.id">
                    <path v-for="dep in getDependencyPaths(task)" :key="dep.id"
                          :d="dep.path"
                          stroke="#666"
                          stroke-width="1"
                          fill="none"
                          marker-end="url(#arrowhead)"/>
                  </template>
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
        <button @click="openPrintModal" class="control-btn" style="background: #2196F3;">Print</button>
      </div>
    </div>

    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content" :style="getModalStyle()">
        <div class="modal-header" @mousedown="startDrag">
          <h2>{{ modalTitle }}</h2>
          <button @click.stop="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="formErrors.length > 0" class="form-errors">
            <div v-for="(error, index) in formErrors" :key="index" class="error-message">
              {{ error }}
            </div>
          </div>

          <div v-if="modalType === 'milestone'" class="form-group">
            <label>Milestone Name: <span class="field-hint">Required - text, max 255 chars</span></label>
            <input v-model="milestoneForm.name" type="text" placeholder="e.g. Project Kickoff" maxlength="255" title="Required. Enter a name for this milestone (max 255 characters)">
            <label>Date: <span class="field-hint">Required - pick a date</span></label>
            <input v-model="milestoneForm.date" type="date" title="Required. Select the milestone date">
            <label>Section: <span class="field-hint">Required - select or create</span></label>
            <select v-model="milestoneForm.section" title="Required. Choose an existing section or create a new one">
              <option value="" disabled>Select a section</option>
              <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.name }}</option>
              <option value="__new__">+ Create New Section</option>
            </select>
            <div v-if="milestoneForm.section === '__new__'">
              <label>New Section Name: <span class="field-hint">Required - text, max 255 chars</span></label>
              <input v-model="milestoneForm.newSectionName" type="text" placeholder="e.g. Building 200" maxlength="255" title="Required when creating a new section. Enter the section/building name">
            </div>
            <label>Row: <span class="field-hint">Optional - number 1-20, leave empty for auto</span></label>
            <input v-model="milestoneForm.row_index" type="number" min="1" max="20" placeholder="Auto-assigned if empty" title="Optional. Enter a row number (1-20) or leave empty for auto-placement">
            <label>Color:</label>
            <input v-model="milestoneForm.color" type="color" title="Pick a color for the milestone diamond">
          </div>

          <div v-else-if="modalType === 'timeline'" class="form-group">
            <label>Task Name: <span class="field-hint">Required - text, max 255 chars</span></label>
            <input v-model="timelineForm.name" type="text" placeholder="e.g. Foundation Work" maxlength="255" title="Required. Enter a name for this timeline bar (max 255 characters)">
            <label>Start Date: <span class="field-hint">Required</span></label>
            <input v-model="timelineForm.startDate" type="date" title="Required. Select the start date">
            <label>End Date: <span class="field-hint">Required - must be on or after start date</span></label>
            <input v-model="timelineForm.endDate" type="date" title="Required. Must be on or after the start date">
            <label>Section: <span class="field-hint">Required - select or create</span></label>
            <select v-model="timelineForm.section" title="Required. Choose an existing section or create a new one">
              <option value="" disabled>Select a section</option>
              <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.name }}</option>
              <option value="__new__">+ Create New Section</option>
            </select>
            <div v-if="timelineForm.section === '__new__'">
              <label>New Section Name: <span class="field-hint">Required - text, max 255 chars</span></label>
              <input v-model="timelineForm.newSectionName" type="text" placeholder="e.g. Building 200" maxlength="255" title="Required when creating a new section. Enter the section/building name">
            </div>
            <label>Row: <span class="field-hint">Optional - number 1-20, leave empty for auto</span></label>
            <input v-model="timelineForm.row_index" type="number" min="1" max="20" placeholder="Auto-assigned if empty" title="Optional. Enter a row number (1-20) or leave empty for auto-placement">
            <label>Color:</label>
            <input v-model="timelineForm.color" type="color" title="Pick a color for the timeline bar">
          </div>

          <div v-else-if="modalType === 'startDate'" class="form-group">
            <label>Project Start Date:</label>
            <input v-model="projectStartDate" type="date">
            <label>
              <input v-model="moveExisting" type="checkbox">
              Move existing activities
            </label>
          </div>

          <div v-else-if="modalType === 'workDays'" class="form-group">
            <label>Select Work Days:</label>
            <div class="checkbox-group">
              <label><input type="checkbox" v-model="workDaysForm.monday"> Monday</label>
              <label><input type="checkbox" v-model="workDaysForm.tuesday"> Tuesday</label>
              <label><input type="checkbox" v-model="workDaysForm.wednesday"> Wednesday</label>
              <label><input type="checkbox" v-model="workDaysForm.thursday"> Thursday</label>
              <label><input type="checkbox" v-model="workDaysForm.friday"> Friday</label>
              <label><input type="checkbox" v-model="workDaysForm.saturday"> Saturday</label>
              <label><input type="checkbox" v-model="workDaysForm.sunday"> Sunday</label>
            </div>
          </div>

          <div v-else-if="modalType === 'scale'" class="form-group">
            <label>Day Width (pixels):</label>
            <input v-model.number="scaleForm.dayWidth" type="number" min="15" max="200" step="5">
            <label>Scale Preset:</label>
            <select v-model="scaleForm.preset" @change="applyScalePreset">
              <option value="compact">Compact (15px)</option>
              <option value="normal">Normal (25px)</option>
              <option value="wide">Wide (35px)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div v-else-if="modalType === 'text'" class="form-group">
            <label>Text Content: <span class="field-hint">Required - text, max 255 chars</span></label>
            <input v-model="textForm.content" type="text" placeholder="e.g. Phase 1 Complete" maxlength="255" title="Required. Enter the text to display on the chart">
            <label>Start Date (position on timeline): <span class="field-hint">Required</span></label>
            <input v-model="textForm.startDate" type="date" title="Required. Sets horizontal position on the timeline">
            <label>Section: <span class="field-hint">Required - select or create</span></label>
            <select v-model="textForm.section" title="Required. Choose an existing section or create a new one">
              <option value="" disabled>Select a section</option>
              <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.name }}</option>
              <option value="__new__">+ Create New Section</option>
            </select>
            <div v-if="textForm.section === '__new__'">
              <label>New Section Name: <span class="field-hint">Required - text, max 255 chars</span></label>
              <input v-model="textForm.newSectionName" type="text" placeholder="e.g. Building 200" maxlength="255" title="Required when creating a new section">
            </div>
            <label>Row: <span class="field-hint">Optional - number 1-20</span></label>
            <input v-model="textForm.row_index" type="number" min="1" max="20" placeholder="Auto-assigned if empty" title="Optional. Enter a row number (1-20) or leave empty">
            <label>Font Size:</label>
            <select v-model="textForm.fontSize">
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
            <label>Style:</label>
            <div class="checkbox-group horizontal">
              <label><input type="checkbox" v-model="textForm.bold"> Bold</label>
              <label><input type="checkbox" v-model="textForm.italic"> Italic</label>
              <label><input type="checkbox" v-model="textForm.underline"> Underline</label>
            </div>
            <label>Color:</label>
            <input v-model="textForm.color" type="color">
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-secondary" :disabled="isSaving">Cancel</button>
          <button @click="saveModalData" class="btn btn-primary" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal" @click.self="cancelDelete">
      <div class="modal-content delete-confirm-modal" :style="getDeleteModalStyle()">
        <div class="modal-header delete-header" @mousedown="startDeleteDrag">
          <h2>Confirm Delete</h2>
          <button @click.stop="cancelDelete" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <span class="warning-icon">⚠️</span>
            <p>Are you sure you want to delete this item?</p>
          </div>
          <div class="delete-item-info">
            <p><strong>Type:</strong> {{ taskToDelete?.type }}</p>
            <p><strong>Name:</strong> {{ taskToDelete?.name }}</p>
            <p v-if="taskToDelete?.type === 'task'"><strong>Dates:</strong> {{ taskToDelete?.start_date }} to {{ taskToDelete?.end_date }}</p>
            <p v-if="taskToDelete?.type === 'milestone'"><strong>Date:</strong> {{ taskToDelete?.start_date }}</p>
          </div>
          <p class="delete-notice">This action cannot be undone.</p>
        </div>
        <div class="modal-footer">
          <button @click="cancelDelete" class="btn btn-secondary">Cancel</button>
          <button @click="deleteTask" class="btn btn-danger" :disabled="isDeleting">
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Section Confirmation Modal -->
    <div v-if="showDeleteSectionConfirm" class="modal" @click.self="cancelDeleteSection">
      <div class="modal-content delete-confirm-modal">
        <div class="modal-header delete-header">
          <h2>Delete Section</h2>
          <button @click.stop="cancelDeleteSection" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <span class="warning-icon">⚠️</span>
            <p>Are you sure you want to delete this entire section?</p>
          </div>
          <div class="delete-item-info">
            <p><strong>Section:</strong> {{ sectionToDelete?.name }}</p>
            <p><strong>Items:</strong> {{ sectionToDelete?.itemCount }} item(s) will be deleted</p>
          </div>
          <p class="delete-notice">This will delete ALL items in this section. This action cannot be undone.</p>
        </div>
        <div class="modal-footer">
          <button @click="cancelDeleteSection" class="btn btn-secondary">Cancel</button>
          <button @click="deleteSection" class="btn btn-danger" :disabled="isDeletingSection">
            {{ isDeletingSection ? 'Deleting...' : 'Delete Section' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Section Modal -->
    <div v-if="showEditSectionModal" class="modal" @click.self="cancelEditSection">
      <div class="modal-content" :style="{ width: '450px' }">
        <div class="modal-header">
          <h2>Edit Section</h2>
          <button @click.stop="cancelEditSection" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="sectionEditErrors.length > 0" class="form-errors">
            <div v-for="(error, index) in sectionEditErrors" :key="index" class="error-message">
              {{ error }}
            </div>
          </div>
          <div class="form-group">
            <label>Section Name: <span class="field-hint">Required</span></label>
            <input v-model="sectionEditForm.name" type="text" placeholder="Section name" maxlength="255">
            <label>Sub Header: <span class="field-hint">Optional</span></label>
            <input v-model="sectionEditForm.sub_header" type="text" placeholder="Optional sub header" maxlength="255">
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cancelEditSection" class="btn btn-secondary">Cancel</button>
          <button @click="saveSectionEdit" class="btn btn-primary" :disabled="isSavingSection">
            {{ isSavingSection ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Print Settings Modal -->
    <div v-if="showPrintModal" class="modal" @click.self="closePrintModal">
      <div class="modal-content" :style="getPrintModalStyle()">
        <div class="modal-header" @mousedown="startPrintDrag">
          <h2>Print Settings</h2>
          <button @click.stop="closePrintModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Paper Size:</label>
            <select v-model="printForm.paperSize">
              <option value="letter">8.5" x 11" (Letter)</option>
              <option value="tabloid">11" x 17" (Tabloid)</option>
              <option value="archD">24" x 36" (Arch D)</option>
            </select>
            <label>Orientation:</label>
            <div class="checkbox-group horizontal">
              <label><input type="radio" v-model="printForm.orientation" value="landscape"> Landscape</label>
              <label><input type="radio" v-model="printForm.orientation" value="portrait"> Portrait</label>
            </div>
            <label>Sections to Print:</label>
            <div class="checkbox-group horizontal">
              <label><input type="radio" v-model="printForm.printMode" value="all"> All Sections</label>
              <label><input type="radio" v-model="printForm.printMode" value="selected"> Select Sections</label>
            </div>
            <div v-if="printForm.printMode === 'selected'" class="checkbox-group print-section-list">
              <label v-for="section in sections" :key="section.id">
                <input type="checkbox" :value="section.name" v-model="printForm.selectedSections">
                {{ section.name }}
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closePrintModal" class="btn btn-secondary">Cancel</button>
          <button @click="executePrint" class="btn btn-primary" style="background: #2196F3;">Print</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { supabase } from './supabase'
import dayjs from 'dayjs'

// Data validation helpers
const isValidHexColor = (color) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
const isValidDate = (date) => dayjs(date).isValid()
const sanitizeString = (str, maxLength = 255) => {
  if (!str) return ''
  return String(str).trim().slice(0, maxLength)
}
const sanitizeTaskData = (task) => {
  const sanitized = {
    name: sanitizeString(task.name, 255) || 'Untitled',
    building: sanitizeString(task.building, 255) || 'Building 100',
    start_date: isValidDate(task.start_date) ? task.start_date : dayjs().format('YYYY-MM-DD'),
    end_date: isValidDate(task.end_date) ? task.end_date : dayjs().format('YYYY-MM-DD'),
    type: ['task', 'milestone', 'section', 'text'].includes(task.type) ? task.type : 'task',
    color: isValidHexColor(task.color) ? task.color : '#3498db',
    progress: Math.min(100, Math.max(0, parseInt(task.progress) || 0)),
    row_index: (task.row_index && !isNaN(parseInt(task.row_index))) ? parseInt(task.row_index) : null,
    dependencies: task.dependencies ? sanitizeString(task.dependencies, 255) : null,
    notes: task.notes ? sanitizeString(task.notes, 5000) : null,
    sub_header: task.sub_header ? sanitizeString(task.sub_header, 255) : null,
    company: task.company ? sanitizeString(task.company, 255) : null,
    symbol: task.symbol ? sanitizeString(task.symbol, 50) : null
  }
  return sanitized
}

export default {
  name: 'App',
  setup() {
    const startDate = ref(dayjs())
    const endDate = ref(dayjs().add(3, 'month'))
    const sections = ref([])
    const selectedTask = ref(null)
    const showModal = ref(false)
    const modalType = ref('')
    const modalTitle = ref('')
    const formErrors = ref([])
    const isSaving = ref(false)

    // Modal dragging state
    const modalPosition = ref({ x: null, y: null })
    const isDragging = ref(false)
    const dragOffset = ref({ x: 0, y: 0 })

    // Delete confirmation state
    const showDeleteConfirm = ref(false)
    const taskToDelete = ref(null)
    const isDeleting = ref(false)
    const deleteModalPosition = ref({ x: null, y: null })
    const isDeleteDragging = ref(false)
    const deleteDragOffset = ref({ x: 0, y: 0 })

    // Section delete state
    const showDeleteSectionConfirm = ref(false)
    const sectionToDelete = ref(null)
    const isDeletingSection = ref(false)

    // Section edit state
    const showEditSectionModal = ref(false)
    const sectionEditForm = ref({ name: '', sub_header: '', originalName: '' })
    const sectionEditErrors = ref([])
    const isSavingSection = ref(false)

    // Section ordering (persisted to localStorage)
    const sectionOrder = ref(JSON.parse(localStorage.getItem('gantt_section_order') || '[]'))

    // Edit task state
    const editingTaskId = ref(null)

    // Print modal state
    const showPrintModal = ref(false)
    const printForm = ref({
      paperSize: 'letter',
      orientation: 'landscape',
      printMode: 'all',          // 'all' or 'selected'
      selectedSections: []       // section names to print
    })
    const printModalPosition = ref({ x: null, y: null })
    const isPrintDragging = ref(false)
    const printDragOffset = ref({ x: 0, y: 0 })

    // Task bar dragging state
    const draggingTask = ref(null)
    const dragMode = ref(null) // 'move', 'resize-start', 'resize-end'
    const dragStartX = ref(0)
    const dragStartY = ref(0)
    const originalTaskDates = ref({ start: null, end: null })
    const originalRowIndex = ref(null)
    const ROW_HEIGHT = 25 // Height of each row in pixels

    const milestoneForm = ref({
      name: '',
      date: '',
      section: '',
      newSectionName: '',
      color: '#666666',
      row_index: null
    })

    const timelineForm = ref({
      name: '',
      startDate: '',
      endDate: '',
      section: '',
      newSectionName: '',
      color: '#4CAF50',
      row_index: null
    })

    const workDaysForm = ref({
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    })

    const scaleForm = ref({
      dayWidth: 25,
      preset: 'normal'
    })

    const textForm = ref({
      content: '',
      startDate: '',
      section: '',
      newSectionName: '',
      row_index: null,
      fontSize: 'medium',
      bold: false,
      italic: false,
      underline: false,
      color: '#000000'
    })

    const dayWidth = ref(25)

    const projectStartDate = ref('')
    const moveExisting = ref(false)
    const userSetStartDate = ref(false) // Track if user manually set start date

    // Dark mode
    const darkMode = ref(localStorage.getItem('gantt_dark_mode') === 'true')
    const applyDarkMode = (enabled) => {
      if (enabled) {
        document.documentElement.classList.add('dark-mode')
      } else {
        document.documentElement.classList.remove('dark-mode')
      }
    }
    const toggleDarkMode = () => {
      darkMode.value = !darkMode.value
      localStorage.setItem('gantt_dark_mode', darkMode.value)
      applyDarkMode(darkMode.value)
    }
    // Apply on load
    applyDarkMode(darkMode.value)

    // Project filtering
    const selectedProject = ref('all')
    const allSections = ref([])

    const isNonWorkDay = (dayOfWeek) => {
      const dayMap = {
        0: !workDaysForm.value.sunday,
        1: !workDaysForm.value.monday,
        2: !workDaysForm.value.tuesday,
        3: !workDaysForm.value.wednesday,
        4: !workDaysForm.value.thursday,
        5: !workDaysForm.value.friday,
        6: !workDaysForm.value.saturday
      }
      return dayMap[dayOfWeek]
    }

    const days = computed(() => {
      const result = []
      let current = startDate.value
      while (current.isBefore(endDate.value) || current.isSame(endDate.value)) {
        result.push({
          key: current.format('YYYY-MM-DD'),
          day: current.format('D'),
          isWeekend: isNonWorkDay(current.day()),
          month: current.month(),
          year: current.year()
        })
        current = current.add(1, 'day')
      }
      return result
    })

    const months = computed(() => {
      const monthsMap = new Map()
      let lastYear = null
      days.value.forEach(day => {
        const key = `${day.year}-${day.month}`
        if (!monthsMap.has(key)) {
          // Show year when it changes or on first month
          const showYear = lastYear === null || day.year !== lastYear
          lastYear = day.year
          monthsMap.set(key, {
            key,
            name: dayjs().month(day.month).format('MMMM') + (showYear ? ` ${day.year}` : ''),
            count: 0
          })
        }
        monthsMap.get(key).count++
      })

      return Array.from(monthsMap.values()).map(month => ({
        ...month,
        width: month.count * dayWidth.value
      }))
    })

    // Total timeline width based on number of days
    const timelineWidth = computed(() => {
      return days.value.length * dayWidth.value
    })

    const getMilestoneStyle = (task) => {
      const taskDate = dayjs(task.start_date)
      const dayIndex = taskDate.diff(startDate.value, 'day')
      return {
        left: `${dayIndex * dayWidth.value + 5}px`
      }
    }

    const getTaskBarStyle = (task) => {
      const taskStart = dayjs(task.start_date)
      const taskEnd = dayjs(task.end_date)
      const dayIndex = taskStart.diff(startDate.value, 'day')
      const duration = taskEnd.diff(taskStart, 'day') + 1

      return {
        left: `${dayIndex * dayWidth.value}px`,
        width: `${duration * dayWidth.value}px`,
        backgroundColor: task.color || '#4CAF50'
      }
    }

    const getDependencyPaths = (task) => {
      return []
    }

    const selectTask = (task) => {
      selectedTask.value = task
    }

    const getTaskStartDay = (task) => {
      const taskStart = dayjs(task.start_date)
      return taskStart.format('D')
    }

    const getTaskEndDay = (task) => {
      const taskEnd = dayjs(task.end_date)
      return taskEnd.format('D')
    }

    const getTextStyle = (task) => {
      let styles = {}
      try {
        const textStyles = task.notes ? JSON.parse(task.notes) : {}
        // Calculate position based on start_date
        const taskDate = dayjs(task.start_date)
        const dayIndex = taskDate.diff(startDate.value, 'day')
        styles = {
          left: `${dayIndex * dayWidth.value + 5}px`,
          color: task.color || '#000',
          fontSize: textStyles.fontSize === 'small' ? '10px' : textStyles.fontSize === 'large' ? '14px' : '12px',
          fontWeight: textStyles.bold ? 'bold' : 'normal',
          fontStyle: textStyles.italic ? 'italic' : 'normal',
          textDecoration: textStyles.underline ? 'underline' : 'none'
        }
      } catch (e) {
        const taskDate = dayjs(task.start_date)
        const dayIndex = taskDate.diff(startDate.value, 'day')
        styles = {
          left: `${dayIndex * dayWidth.value + 5}px`,
          color: task.color || '#000'
        }
      }
      return styles
    }

    const setStartDate = () => {
      modalType.value = 'startDate'
      modalTitle.value = 'Set Project Start Date'
      projectStartDate.value = startDate.value.format('YYYY-MM-DD')
      showModal.value = true
    }

    const selectWorkDays = () => {
      modalType.value = 'workDays'
      modalTitle.value = 'Select Work Days'
      showModal.value = true
    }

    const setScale = () => {
      modalType.value = 'scale'
      modalTitle.value = 'Set Scale'
      scaleForm.value.dayWidth = dayWidth.value
      scaleForm.value.preset = dayWidth.value === 15 ? 'compact' : dayWidth.value === 25 ? 'normal' : dayWidth.value === 35 ? 'wide' : 'custom'
      showModal.value = true
    }

    const applyScalePreset = () => {
      if (scaleForm.value.preset === 'compact') scaleForm.value.dayWidth = 15
      else if (scaleForm.value.preset === 'normal') scaleForm.value.dayWidth = 25
      else if (scaleForm.value.preset === 'wide') scaleForm.value.dayWidth = 35
    }

    const createMilestone = () => {
      modalType.value = 'milestone'
      modalTitle.value = 'Create Milestone'
      milestoneForm.value = {
        name: '',
        date: dayjs().format('YYYY-MM-DD'),
        section: sections.value.length > 0 ? sections.value[0].id : '__new__',
        newSectionName: '',
        color: '#666666',
        row_index: null
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
        section: sections.value.length > 0 ? sections.value[0].id : '__new__',
        newSectionName: '',
        color: '#4CAF50',
        row_index: null
      }
      showModal.value = true
    }

    const addTextLine = () => {
      modalType.value = 'text'
      modalTitle.value = 'Add Text Line'
      textForm.value = {
        content: '',
        startDate: dayjs().format('YYYY-MM-DD'),
        section: sections.value.length > 0 ? sections.value[0].id : '__new__',
        newSectionName: '',
        row_index: null,
        fontSize: 'medium',
        bold: false,
        italic: false,
        underline: false,
        color: '#000000'
      }
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      modalType.value = ''
      formErrors.value = []
      modalPosition.value = { x: null, y: null }
      editingTaskId.value = null
    }

    // Modal dragging functions
    const startDrag = (e) => {
      if (e.target.closest('.close-btn')) return
      isDragging.value = true
      const modal = e.target.closest('.modal-content')
      const rect = modal.getBoundingClientRect()
      dragOffset.value = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      document.addEventListener('mousemove', onDrag)
      document.addEventListener('mouseup', stopDrag)
    }

    const onDrag = (e) => {
      if (!isDragging.value) return
      modalPosition.value = {
        x: e.clientX - dragOffset.value.x,
        y: e.clientY - dragOffset.value.y
      }
    }

    const stopDrag = () => {
      isDragging.value = false
      document.removeEventListener('mousemove', onDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    const getModalStyle = () => {
      if (modalPosition.value.x === null) return {}
      return {
        position: 'fixed',
        left: modalPosition.value.x + 'px',
        top: modalPosition.value.y + 'px',
        transform: 'none'
      }
    }

    // Delete confirmation functions
    const confirmDelete = (task) => {
      taskToDelete.value = task
      showDeleteConfirm.value = true
      deleteModalPosition.value = { x: null, y: null }
    }

    const cancelDelete = () => {
      showDeleteConfirm.value = false
      taskToDelete.value = null
      deleteModalPosition.value = { x: null, y: null }
    }

    const deleteTask = async () => {
      if (!taskToDelete.value) return

      isDeleting.value = true
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskToDelete.value.id)
        if (error) throw error
        await loadTasks()
        cancelDelete()
      } catch (error) {
        console.error('Error deleting task:', error)
        alert('Failed to delete: ' + error.message)
      } finally {
        isDeleting.value = false
      }
    }

    const showContextMenu = (e, task) => {
      // Right-click shows delete confirmation
      confirmDelete(task)
    }

    // Section delete functions
    const confirmDeleteSection = (section) => {
      // Count all items in the section
      let itemCount = 0
      section.rows.forEach(row => {
        itemCount += row.tasks.length
      })
      sectionToDelete.value = { ...section, itemCount }
      showDeleteSectionConfirm.value = true
    }

    const cancelDeleteSection = () => {
      showDeleteSectionConfirm.value = false
      sectionToDelete.value = null
    }

    const deleteSection = async () => {
      if (!sectionToDelete.value) return

      isDeletingSection.value = true
      try {
        // Delete all tasks in this section (by building name)
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('building', sectionToDelete.value.name)
        if (error) throw error
        await loadTasks()
        cancelDeleteSection()
      } catch (error) {
        console.error('Error deleting section:', error)
        alert('Failed to delete section: ' + error.message)
      } finally {
        isDeletingSection.value = false
      }
    }

    // Section edit functions
    const editSection = (section) => {
      sectionEditForm.value = {
        name: section.name,
        sub_header: section.sub_header || '',
        originalName: section.name
      }
      sectionEditErrors.value = []
      showEditSectionModal.value = true
    }

    const cancelEditSection = () => {
      showEditSectionModal.value = false
      sectionEditForm.value = { name: '', sub_header: '', originalName: '' }
      sectionEditErrors.value = []
    }

    const saveSectionEdit = async () => {
      sectionEditErrors.value = []
      const newName = sectionEditForm.value.name.trim()
      const oldName = sectionEditForm.value.originalName
      const newSubHeader = sectionEditForm.value.sub_header.trim() || null

      if (!newName) {
        sectionEditErrors.value = ['Section name is required']
        return
      }

      // Check if new name conflicts with existing section
      if (newName !== oldName && allSections.value.some(s => s.name === newName)) {
        sectionEditErrors.value = ['A section with this name already exists']
        return
      }

      isSavingSection.value = true
      try {
        // Update all tasks in this section with new building name and sub_header
        const { data: sectionTasks, error: fetchError } = await supabase
          .from('tasks')
          .select('id')
          .eq('building', oldName)
        if (fetchError) throw fetchError

        for (const task of sectionTasks) {
          const updateData = { building: newName, sub_header: newSubHeader }
          const { error: updateError } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', task.id)
          if (updateError) throw updateError
        }

        // Update section order if name changed
        if (newName !== oldName) {
          const orderIdx = sectionOrder.value.indexOf(oldName)
          if (orderIdx !== -1) {
            sectionOrder.value[orderIdx] = newName
          }
          saveSectionOrder()
        }

        await loadTasks()
        cancelEditSection()
      } catch (error) {
        console.error('Error updating section:', error)
        sectionEditErrors.value = ['Failed to update section: ' + error.message]
      } finally {
        isSavingSection.value = false
      }
    }

    // Section move functions
    const saveSectionOrder = () => {
      localStorage.setItem('gantt_section_order', JSON.stringify(sectionOrder.value))
    }

    const applySectionOrder = (sectionsList) => {
      if (sectionOrder.value.length === 0) return sectionsList

      return [...sectionsList].sort((a, b) => {
        let aIdx = sectionOrder.value.indexOf(a.name)
        let bIdx = sectionOrder.value.indexOf(b.name)
        // Sections not in order list go to end, in original order
        if (aIdx === -1 && bIdx === -1) return 0
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      })
    }

    const moveSectionUp = (section) => {
      const currentSections = sections.value.map(s => s.name)
      const idx = currentSections.indexOf(section.name)
      if (idx <= 0) return

      // Swap with previous section
      const temp = currentSections[idx - 1]
      currentSections[idx - 1] = currentSections[idx]
      currentSections[idx] = temp

      sectionOrder.value = currentSections
      saveSectionOrder()
      // Re-sort sections in place
      sections.value = applySectionOrder(sections.value)
      allSections.value = applySectionOrder(allSections.value)
    }

    const moveSectionDown = (section) => {
      const currentSections = sections.value.map(s => s.name)
      const idx = currentSections.indexOf(section.name)
      if (idx === -1 || idx >= currentSections.length - 1) return

      // Swap with next section
      const temp = currentSections[idx + 1]
      currentSections[idx + 1] = currentSections[idx]
      currentSections[idx] = temp

      sectionOrder.value = currentSections
      saveSectionOrder()
      // Re-sort sections in place
      sections.value = applySectionOrder(sections.value)
      allSections.value = applySectionOrder(allSections.value)
    }

    // Delete modal dragging
    const startDeleteDrag = (e) => {
      if (e.target.closest('.close-btn')) return
      isDeleteDragging.value = true
      const modal = e.target.closest('.modal-content')
      const rect = modal.getBoundingClientRect()
      deleteDragOffset.value = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      document.addEventListener('mousemove', onDeleteDrag)
      document.addEventListener('mouseup', stopDeleteDrag)
    }

    const onDeleteDrag = (e) => {
      if (!isDeleteDragging.value) return
      deleteModalPosition.value = {
        x: e.clientX - deleteDragOffset.value.x,
        y: e.clientY - deleteDragOffset.value.y
      }
    }

    const stopDeleteDrag = () => {
      isDeleteDragging.value = false
      document.removeEventListener('mousemove', onDeleteDrag)
      document.removeEventListener('mouseup', stopDeleteDrag)
    }

    const getDeleteModalStyle = () => {
      if (deleteModalPosition.value.x === null) return {}
      return {
        position: 'fixed',
        left: deleteModalPosition.value.x + 'px',
        top: deleteModalPosition.value.y + 'px',
        transform: 'none'
      }
    }

    // Validation functions
    const validateMilestoneForm = () => {
      const errors = []
      if (!milestoneForm.value.name?.trim()) {
        errors.push('Milestone name is required')
      }
      if (!milestoneForm.value.date) {
        errors.push('Date is required')
      }
      if (!milestoneForm.value.section) {
        errors.push('Section is required')
      }
      if (milestoneForm.value.section === '__new__' && !milestoneForm.value.newSectionName?.trim()) {
        errors.push('New section name is required')
      }
      return errors
    }

    const validateTimelineForm = () => {
      const errors = []
      if (!timelineForm.value.name?.trim()) {
        errors.push('Task name is required')
      }
      if (!timelineForm.value.startDate) {
        errors.push('Start date is required')
      }
      if (!timelineForm.value.endDate) {
        errors.push('End date is required')
      }
      if (timelineForm.value.startDate && timelineForm.value.endDate) {
        if (dayjs(timelineForm.value.endDate).isBefore(dayjs(timelineForm.value.startDate))) {
          errors.push('End date must be on or after start date')
        }
      }
      if (!timelineForm.value.section) {
        errors.push('Section is required')
      }
      if (timelineForm.value.section === '__new__' && !timelineForm.value.newSectionName?.trim()) {
        errors.push('New section name is required')
      }
      return errors
    }

    const loadDateRange = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('start_date, end_date')

        if (error) throw error

        if (data && data.length > 0) {
          const dates = data.flatMap(t => [new Date(t.start_date), new Date(t.end_date)])
          const maxDate = new Date(Math.max(...dates))
          // Add 2 weeks padding to end
          maxDate.setDate(maxDate.getDate() + 14)
          endDate.value = dayjs(maxDate)

          // Only auto-set start date if user hasn't manually set one
          if (!userSetStartDate.value) {
            const minDate = new Date(Math.min(...dates))
            minDate.setDate(minDate.getDate() - 14)
            startDate.value = dayjs(minDate)
          }
        }
      } catch (error) {
        console.error('Error loading date range:', error)
      }
    }

    // Task bar drag functions
    const startTaskDrag = (e, task, mode) => {
      e.preventDefault()
      e.stopPropagation()
      draggingTask.value = task
      dragMode.value = mode
      dragStartX.value = e.clientX
      dragStartY.value = e.clientY
      originalTaskDates.value = {
        start: dayjs(task.start_date),
        end: dayjs(task.end_date)
      }
      originalRowIndex.value = task.row_index
      document.addEventListener('mousemove', onTaskDrag)
      document.addEventListener('mouseup', stopTaskDrag)
    }

    const onTaskDrag = (e) => {
      if (!draggingTask.value) return

      const deltaX = e.clientX - dragStartX.value
      const deltaY = e.clientY - dragStartY.value
      const daysDelta = Math.round(deltaX / dayWidth.value)
      const rowsDelta = Math.round(deltaY / ROW_HEIGHT)

      const task = draggingTask.value

      if (dragMode.value === 'move') {
        // Move the entire bar horizontally
        if (daysDelta !== 0) {
          task.start_date = originalTaskDates.value.start.add(daysDelta, 'day').format('YYYY-MM-DD')
          task.end_date = originalTaskDates.value.end.add(daysDelta, 'day').format('YYYY-MM-DD')
        }
        // Move vertically (row)
        if (rowsDelta !== 0) {
          const baseRow = originalRowIndex.value || 1
          const newRow = Math.max(1, Math.min(20, baseRow + rowsDelta))
          task.row_index = newRow
        }
      } else if (dragMode.value === 'resize-start') {
        // Resize from start (horizontal only)
        const newStart = originalTaskDates.value.start.add(daysDelta, 'day')
        if (newStart.isBefore(originalTaskDates.value.end) || newStart.isSame(originalTaskDates.value.end)) {
          task.start_date = newStart.format('YYYY-MM-DD')
        }
      } else if (dragMode.value === 'resize-end') {
        // Resize from end (horizontal only)
        const newEnd = originalTaskDates.value.end.add(daysDelta, 'day')
        if (newEnd.isAfter(originalTaskDates.value.start) || newEnd.isSame(originalTaskDates.value.start)) {
          task.end_date = newEnd.format('YYYY-MM-DD')
        }
      }
    }

    const stopTaskDrag = async () => {
      if (draggingTask.value) {
        // Save the updated task to database
        try {
          const { error } = await supabase
            .from('tasks')
            .update({
              start_date: draggingTask.value.start_date,
              end_date: draggingTask.value.end_date,
              row_index: draggingTask.value.row_index
            })
            .eq('id', draggingTask.value.id)
          if (error) throw error
          await loadDateRange()
          await loadTasks()
        } catch (error) {
          console.error('Error updating task:', error)
          // Revert on error
          draggingTask.value.start_date = originalTaskDates.value.start.format('YYYY-MM-DD')
          draggingTask.value.end_date = originalTaskDates.value.end.format('YYYY-MM-DD')
          draggingTask.value.row_index = originalRowIndex.value
        }
      }
      draggingTask.value = null
      dragMode.value = null
      originalRowIndex.value = null
      document.removeEventListener('mousemove', onTaskDrag)
      document.removeEventListener('mouseup', stopTaskDrag)
    }

    // Milestone drag function
    const startMilestoneDrag = (e, task) => {
      e.preventDefault()
      e.stopPropagation()
      draggingTask.value = task
      dragMode.value = 'move'
      dragStartX.value = e.clientX
      dragStartY.value = e.clientY
      originalTaskDates.value = {
        start: dayjs(task.start_date),
        end: dayjs(task.end_date)
      }
      originalRowIndex.value = task.row_index
      document.addEventListener('mousemove', onMilestoneDrag)
      document.addEventListener('mouseup', stopMilestoneDrag)
    }

    const onMilestoneDrag = (e) => {
      if (!draggingTask.value) return

      const deltaX = e.clientX - dragStartX.value
      const deltaY = e.clientY - dragStartY.value
      const daysDelta = Math.round(deltaX / dayWidth.value)
      const rowsDelta = Math.round(deltaY / ROW_HEIGHT)

      const task = draggingTask.value

      // Update horizontal position
      if (daysDelta !== 0) {
        const newDate = originalTaskDates.value.start.add(daysDelta, 'day').format('YYYY-MM-DD')
        task.start_date = newDate
        task.end_date = newDate
      }

      // Update vertical position (row)
      if (rowsDelta !== 0) {
        const baseRow = originalRowIndex.value || 1
        const newRow = Math.max(1, Math.min(20, baseRow + rowsDelta))
        task.row_index = newRow
      }
    }

    const stopMilestoneDrag = async () => {
      if (draggingTask.value) {
        try {
          const { error } = await supabase
            .from('tasks')
            .update({
              start_date: draggingTask.value.start_date,
              end_date: draggingTask.value.end_date,
              row_index: draggingTask.value.row_index
            })
            .eq('id', draggingTask.value.id)
          if (error) throw error
          await loadDateRange()
          await loadTasks()
        } catch (error) {
          console.error('Error updating milestone:', error)
          draggingTask.value.start_date = originalTaskDates.value.start.format('YYYY-MM-DD')
          draggingTask.value.end_date = originalTaskDates.value.end.format('YYYY-MM-DD')
          draggingTask.value.row_index = originalRowIndex.value
        }
      }
      draggingTask.value = null
      dragMode.value = null
      originalRowIndex.value = null
      document.removeEventListener('mousemove', onMilestoneDrag)
      document.removeEventListener('mouseup', stopMilestoneDrag)
    }

    // Text item drag functions
    const startTextDrag = (e, task) => {
      e.preventDefault()
      e.stopPropagation()
      draggingTask.value = task
      dragMode.value = 'move'
      dragStartX.value = e.clientX
      dragStartY.value = e.clientY
      originalTaskDates.value = {
        start: dayjs(task.start_date),
        end: dayjs(task.end_date)
      }
      originalRowIndex.value = task.row_index
      document.addEventListener('mousemove', onTextDrag)
      document.addEventListener('mouseup', stopTextDrag)
    }

    const onTextDrag = (e) => {
      if (!draggingTask.value) return

      const deltaX = e.clientX - dragStartX.value
      const deltaY = e.clientY - dragStartY.value
      const daysDelta = Math.round(deltaX / dayWidth.value)
      const rowsDelta = Math.round(deltaY / ROW_HEIGHT)

      const task = draggingTask.value

      // Update horizontal position
      if (daysDelta !== 0) {
        const newDate = originalTaskDates.value.start.add(daysDelta, 'day').format('YYYY-MM-DD')
        task.start_date = newDate
        task.end_date = newDate
      }

      // Update vertical position (row)
      if (rowsDelta !== 0) {
        const baseRow = originalRowIndex.value || 1
        const newRow = Math.max(1, Math.min(20, baseRow + rowsDelta))
        task.row_index = newRow
      }
    }

    const stopTextDrag = async () => {
      if (draggingTask.value) {
        try {
          const { error } = await supabase
            .from('tasks')
            .update({
              start_date: draggingTask.value.start_date,
              end_date: draggingTask.value.end_date,
              row_index: draggingTask.value.row_index
            })
            .eq('id', draggingTask.value.id)
          if (error) throw error
          await loadDateRange()
          await loadTasks()
        } catch (error) {
          console.error('Error updating text item:', error)
          draggingTask.value.start_date = originalTaskDates.value.start.format('YYYY-MM-DD')
          draggingTask.value.end_date = originalTaskDates.value.end.format('YYYY-MM-DD')
          draggingTask.value.row_index = originalRowIndex.value
        }
      }
      draggingTask.value = null
      dragMode.value = null
      originalRowIndex.value = null
      document.removeEventListener('mousemove', onTextDrag)
      document.removeEventListener('mouseup', stopTextDrag)
    }

    // Print modal functions
    const openPrintModal = () => {
      printForm.value.printMode = 'all'
      printForm.value.selectedSections = sections.value.map(s => s.name)
      showPrintModal.value = true
      printModalPosition.value = { x: null, y: null }
    }

    const closePrintModal = () => {
      showPrintModal.value = false
      printModalPosition.value = { x: null, y: null }
    }

    const startPrintDrag = (e) => {
      if (e.target.closest('.close-btn')) return
      isPrintDragging.value = true
      const modal = e.target.closest('.modal-content')
      const rect = modal.getBoundingClientRect()
      printDragOffset.value = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      document.addEventListener('mousemove', onPrintDrag)
      document.addEventListener('mouseup', stopPrintDrag)
    }

    const onPrintDrag = (e) => {
      if (!isPrintDragging.value) return
      printModalPosition.value = {
        x: e.clientX - printDragOffset.value.x,
        y: e.clientY - printDragOffset.value.y
      }
    }

    const stopPrintDrag = () => {
      isPrintDragging.value = false
      document.removeEventListener('mousemove', onPrintDrag)
      document.removeEventListener('mouseup', stopPrintDrag)
    }

    const getPrintModalStyle = () => {
      if (printModalPosition.value.x === null) return {}
      return {
        position: 'fixed',
        left: printModalPosition.value.x + 'px',
        top: printModalPosition.value.y + 'px',
        transform: 'none'
      }
    }

    const executePrint = () => {
      const sizeMap = {
        letter: { width: '8.5in', height: '11in' },
        tabloid: { width: '11in', height: '17in' },
        archD: { width: '24in', height: '36in' }
      }

      const size = sizeMap[printForm.value.paperSize]
      const isLandscape = printForm.value.orientation === 'landscape'

      // Build @page CSS with the chosen size and orientation
      const pageWidth = isLandscape ? size.height : size.width
      const pageHeight = isLandscape ? size.width : size.height

      // Build section hiding CSS if printing selected sections only
      let sectionHideCSS = ''
      if (printForm.value.printMode === 'selected') {
        const selectedNames = printForm.value.selectedSections
        // Hide unselected sections by adding a data attribute and CSS
        const sectionGroups = document.querySelectorAll('.section-group')
        sectionGroups.forEach(group => {
          const titleEl = group.querySelector('.section-title-text')
          if (titleEl) {
            const name = titleEl.textContent.trim()
            if (!selectedNames.includes(name)) {
              group.setAttribute('data-print-hide', 'true')
            }
          }
        })
        sectionHideCSS = `
          .section-group[data-print-hide="true"] {
            display: none !important;
          }
        `
      }

      const printStyle = document.createElement('style')
      printStyle.id = 'dynamic-print-style'
      printStyle.textContent = `
        @page {
          size: ${pageWidth} ${pageHeight};
          margin: 0.25in;
        }
        ${sectionHideCSS}
      `
      document.head.appendChild(printStyle)

      closePrintModal()

      // Small delay so modal closes before print dialog opens
      setTimeout(() => {
        window.print()
        // Clean up after print dialog closes
        const cleanup = () => {
          const el = document.getElementById('dynamic-print-style')
          if (el) el.remove()
          // Remove data-print-hide attributes
          document.querySelectorAll('[data-print-hide]').forEach(el => {
            el.removeAttribute('data-print-hide')
          })
        }
        // Use onafterprint if available, otherwise timeout fallback
        if (window.onafterprint !== undefined) {
          window.addEventListener('afterprint', cleanup, { once: true })
        } else {
          setTimeout(cleanup, 1000)
        }
      }, 200)
    }

    const editTask = (task) => {
      editingTaskId.value = task.id
      if (task.type === 'milestone') {
        modalType.value = 'milestone'
        modalTitle.value = 'Edit Milestone'
        milestoneForm.value = {
          name: task.name,
          date: task.start_date,
          section: sections.value.find(s => s.name === task.building)?.id || '',
          newSectionName: '',
          color: task.color || '#666666',
          row_index: task.row_index
        }
      } else if (task.type === 'task') {
        modalType.value = 'timeline'
        modalTitle.value = 'Edit Timeline'
        timelineForm.value = {
          name: task.name,
          startDate: task.start_date,
          endDate: task.end_date,
          section: sections.value.find(s => s.name === task.building)?.id || '',
          newSectionName: '',
          color: task.color || '#4CAF50',
          row_index: task.row_index
        }
      } else if (task.type === 'text') {
        modalType.value = 'text'
        modalTitle.value = 'Edit Text'
        let textStyles = {}
        try { textStyles = task.notes ? JSON.parse(task.notes) : {} } catch (e) { /* ignore */ }
        textForm.value = {
          content: task.name,
          startDate: task.start_date,
          section: sections.value.find(s => s.name === task.building)?.id || '',
          newSectionName: '',
          row_index: task.row_index,
          fontSize: textStyles.fontSize || 'medium',
          bold: textStyles.bold || false,
          italic: textStyles.italic || false,
          underline: textStyles.underline || false,
          color: task.color || '#000000'
        }
      }
      showModal.value = true
    }

    const saveModalData = async () => {
      formErrors.value = []
      isSaving.value = true

      try {
        if (modalType.value === 'milestone') {
          const errors = validateMilestoneForm()
          if (errors.length > 0) {
            formErrors.value = errors
            isSaving.value = false
            return
          }

          // Determine building name: new section or existing
          const buildingName = milestoneForm.value.section === '__new__'
            ? milestoneForm.value.newSectionName.trim()
            : sections.value.find(s => s.id === milestoneForm.value.section)?.name || 'Other'

          const newTask = {
            name: milestoneForm.value.name.trim(),
            building: buildingName,
            start_date: milestoneForm.value.date,
            end_date: milestoneForm.value.date,
            type: 'milestone',
            color: milestoneForm.value.color,
            progress: 0,
            row_index: milestoneForm.value.row_index
          }

          if (editingTaskId.value) {
            const { error } = await supabase.from('tasks').update(sanitizeTaskData(newTask)).eq('id', editingTaskId.value)
            if (error) throw error
          } else {
            const { error } = await supabase.from('tasks').insert([sanitizeTaskData(newTask)])
            if (error) throw error
          }
          await loadDateRange()
          await loadTasks()
          closeModal()
        } else if (modalType.value === 'timeline') {
          const errors = validateTimelineForm()
          if (errors.length > 0) {
            formErrors.value = errors
            isSaving.value = false
            return
          }

          // Determine building name: new section or existing
          const buildingName = timelineForm.value.section === '__new__'
            ? timelineForm.value.newSectionName.trim()
            : sections.value.find(s => s.id === timelineForm.value.section)?.name || 'Other'

          const newTask = {
            name: timelineForm.value.name.trim(),
            building: buildingName,
            start_date: timelineForm.value.startDate,
            end_date: timelineForm.value.endDate,
            type: 'task',
            color: timelineForm.value.color,
            progress: 0,
            row_index: timelineForm.value.row_index
          }

          if (editingTaskId.value) {
            const { error } = await supabase.from('tasks').update(sanitizeTaskData(newTask)).eq('id', editingTaskId.value)
            if (error) throw error
          } else {
            const { error } = await supabase.from('tasks').insert([sanitizeTaskData(newTask)])
            if (error) throw error
          }
          await loadDateRange()
          await loadTasks()
          closeModal()
        } else if (modalType.value === 'startDate') {
          const newStart = dayjs(projectStartDate.value)

          if (moveExisting.value) {
            // Calculate the delta between old start and new start
            const oldStart = startDate.value
            const daysDelta = newStart.diff(oldStart, 'day')

            if (daysDelta !== 0) {
              // Fetch all tasks and shift their dates
              const { data: allTasks, error: fetchError } = await supabase
                .from('tasks')
                .select('id, start_date, end_date')
              if (fetchError) throw fetchError

              for (const task of allTasks) {
                const newTaskStart = dayjs(task.start_date).add(daysDelta, 'day').format('YYYY-MM-DD')
                const newTaskEnd = dayjs(task.end_date).add(daysDelta, 'day').format('YYYY-MM-DD')
                const { error: updateError } = await supabase
                  .from('tasks')
                  .update({ start_date: newTaskStart, end_date: newTaskEnd })
                  .eq('id', task.id)
                if (updateError) throw updateError
              }
            }
          }

          startDate.value = newStart
          userSetStartDate.value = true
          moveExisting.value = false
          await loadDateRange()
          await loadTasks()
          closeModal()
        } else if (modalType.value === 'workDays') {
          // Work days are stored locally - affects weekend highlighting
          closeModal()
        } else if (modalType.value === 'scale') {
          dayWidth.value = scaleForm.value.dayWidth
          closeModal()
        } else if (modalType.value === 'text') {
          if (!textForm.value.content?.trim()) {
            formErrors.value = ['Text content is required']
            isSaving.value = false
            return
          }
          if (!textForm.value.section) {
            formErrors.value = ['Section is required']
            isSaving.value = false
            return
          }

          const buildingName = textForm.value.section === '__new__'
            ? textForm.value.newSectionName.trim()
            : sections.value.find(s => s.id === textForm.value.section)?.name || 'Other'

          const textDate = textForm.value.startDate || dayjs().format('YYYY-MM-DD')
          const newTask = {
            name: textForm.value.content.trim(),
            building: buildingName,
            start_date: textDate,
            end_date: textDate,
            type: 'text',
            color: textForm.value.color,
            progress: 0,
            row_index: textForm.value.row_index,
            notes: JSON.stringify({
              fontSize: textForm.value.fontSize,
              bold: textForm.value.bold,
              italic: textForm.value.italic,
              underline: textForm.value.underline
            })
          }

          if (editingTaskId.value) {
            const { error } = await supabase.from('tasks').update(sanitizeTaskData(newTask)).eq('id', editingTaskId.value)
            if (error) throw error
          } else {
            const { error } = await supabase.from('tasks').insert([sanitizeTaskData(newTask)])
            if (error) throw error
          }
          await loadTasks()
          closeModal()
        }
      } catch (error) {
        console.error('Error saving:', error)
        const errorMsg = error.message || 'An error occurred while saving'
        formErrors.value = [errorMsg]
      } finally {
        isSaving.value = false
      }
    }

    const loadTasks = async () => {
      try {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .order('building')
          .order('row_index')
          .order('start_date')

        if (error) throw error

        const grouped = {}
        tasks.forEach(task => {
          const building = task.building || 'Other'
          if (!grouped[building]) {
            grouped[building] = []
          }
          grouped[building].push(task)
        })

        // Process each section to support multiple tasks per row
        allSections.value = Object.keys(grouped).map((name, index) => {
          const sectionTasks = grouped[name]

          // Group tasks by row_index, null row_index gets its own row
          const rowGroups = {}
          let nextAutoRow = 1

          sectionTasks.forEach(task => {
            const rowIdx = task.row_index || `auto_${nextAutoRow++}`
            if (!rowGroups[rowIdx]) {
              rowGroups[rowIdx] = []
            }
            rowGroups[rowIdx].push(task)
          })

          // Convert to array of rows with multiple tasks
          // Sort rows: numeric row_index first (in order), then auto rows
          const sortedEntries = Object.entries(rowGroups).sort(([a], [b]) => {
            const aIsAuto = String(a).startsWith('auto_')
            const bIsAuto = String(b).startsWith('auto_')
            if (aIsAuto && bIsAuto) return 0
            if (aIsAuto) return 1
            if (bIsAuto) return -1
            return parseInt(a) - parseInt(b)
          })

          // Track the next available row number for auto rows
          let maxExplicitRow = 0
          sortedEntries.forEach(([rowIdx]) => {
            if (!String(rowIdx).startsWith('auto_')) {
              maxExplicitRow = Math.max(maxExplicitRow, parseInt(rowIdx))
            }
          })

          // Create all 20 rows, placing tasks in their assigned rows
          const rows = []
          for (let i = 1; i <= 20; i++) {
            const tasksForRow = rowGroups[i] || []
            rows.push({
              rowNumber: i,
              rowIndex: i,
              tasks: tasksForRow
            })
          }

          // Add any auto-assigned tasks to rows after 20 or to empty slots
          let autoRowNum = 21
          sortedEntries.forEach(([rowIdx, rowTasks]) => {
            if (String(rowIdx).startsWith('auto_')) {
              // Find first empty row or add after 20
              let targetRow = rows.find(r => r.tasks.length === 0)
              if (targetRow) {
                targetRow.tasks = rowTasks
              } else {
                rows.push({
                  rowNumber: autoRowNum,
                  rowIndex: `auto_${autoRowNum}`,
                  tasks: rowTasks
                })
                autoRowNum++
              }
            }
          })

          return {
            id: index + 1,
            name,
            sub_header: sectionTasks[0]?.sub_header || null,
            rows
          }
        })

        // Apply section ordering
        allSections.value = applySectionOrder(allSections.value)

        // Apply filter
        if (selectedProject.value === 'all') {
          sections.value = allSections.value
        } else {
          sections.value = allSections.value.filter(s => s.name === selectedProject.value)
        }
      } catch (error) {
        console.error('Error loading tasks:', error)
      }
    }

    const filterByProject = (projectName) => {
      selectedProject.value = projectName
      if (projectName === 'all') {
        sections.value = allSections.value
      } else {
        sections.value = allSections.value.filter(s => s.name === projectName)
      }
    }

    const projectList = computed(() => {
      return allSections.value.map(s => s.name)
    })

    onMounted(async () => {
      await loadDateRange()
      await loadTasks()
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
      workDaysForm,
      scaleForm,
      textForm,
      dayWidth,
      timelineWidth,
      projectStartDate,
      moveExisting,
      userSetStartDate,
      formErrors,
      isSaving,
      modalPosition,
      draggingTask,
      darkMode,
      toggleDarkMode,
      selectedProject,
      projectList,
      getMilestoneStyle,
      getTaskBarStyle,
      getTextStyle,
      getDependencyPaths,
      selectTask,
      getTaskStartDay,
      getTaskEndDay,
      setStartDate,
      selectWorkDays,
      setScale,
      applyScalePreset,
      createMilestone,
      createTimeline,
      addTextLine,
      closeModal,
      saveModalData,
      loadTasks,
      loadDateRange,
      startDrag,
      getModalStyle,
      validateMilestoneForm,
      validateTimelineForm,
      startTaskDrag,
      startMilestoneDrag,
      startTextDrag,
      filterByProject,
      showDeleteConfirm,
      taskToDelete,
      isDeleting,
      confirmDelete,
      cancelDelete,
      deleteTask,
      showContextMenu,
      editTask,
      startDeleteDrag,
      getDeleteModalStyle,
      showDeleteSectionConfirm,
      sectionToDelete,
      isDeletingSection,
      confirmDeleteSection,
      cancelDeleteSection,
      deleteSection,
      showEditSectionModal,
      sectionEditForm,
      sectionEditErrors,
      isSavingSection,
      editSection,
      cancelEditSection,
      saveSectionEdit,
      moveSectionUp,
      moveSectionDown,
      showPrintModal,
      printForm,
      openPrintModal,
      closePrintModal,
      startPrintDrag,
      getPrintModalStyle,
      executePrint
    }
  }
}
</script>

<style>
@import './style.css';
</style>