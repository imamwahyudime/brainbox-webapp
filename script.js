document.addEventListener('DOMContentLoaded', () => {
    // DOM References
    const taskListEl = document.getElementById('task-list');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskButton = document.getElementById('add-task-button');
    const scheduleTimelineEl = document.getElementById('schedule-timeline');
    const themeSelect = document.getElementById('theme-select');
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const importFileInput = document.getElementById('import-file-input');

    // Modal Elements
    const editModal = document.getElementById('edit-modal');
    const closeModalButton = editModal.querySelector('.close-button');
    const modalTaskName = document.getElementById('modal-task-name');
    const modalStartTimeInput = document.getElementById('modal-start-time');
    const modalDurationInput = document.getElementById('modal-duration');
    const modalDescriptionInput = document.getElementById('modal-description');
    const modalSaveButton = document.getElementById('modal-save-button');
    const modalDeleteButton = document.getElementById('modal-delete-button');
    const modalScheduledTaskIdInput = document.getElementById('modal-scheduled-task-id');

    // --- State Management ---
    let tasks = []; // { id: string, text: string }
    let scheduledTasks = []; // { id: string, taskId: string, text: string, startTime: number, duration: number, description: string }
    let nextTaskId = 1;
    let nextScheduledId = 1;

    // --- Local Storage Keys ---
    const TASKS_STORAGE_KEY = 'timeboxAppTasks';
    const SCHEDULED_TASKS_STORAGE_KEY = 'timeboxAppScheduledTasks';
    const THEME_STORAGE_KEY = 'timeboxAppTheme';
    const NEXT_TASK_ID_KEY = 'timeboxAppNextTaskId';
    const NEXT_SCHEDULED_ID_KEY = 'timeboxAppNextScheduledId';

    // --- Helper Functions ---
    function formatTime(totalMinutes) {
        if (totalMinutes === 1440) totalMinutes = 0; // Handle midnight case start for end time
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        //const hours12 = hours % 12 === 0 ? 12 : hours % 12;
        //const ampm = hours < 12 || hours === 24 ? 'AM' : 'PM';
        //return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    }

    function formatMinutesToHHMM(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
        const minutes = (totalMinutes % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function formatHHMMToMinutes(hhmm) {
        if (!hhmm) return 0;
        try {
            const [hours, minutes] = hhmm.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return 0;
            return (hours * 60) + minutes;
        } catch (error) {
            console.error("Error parsing time:", hhmm, error);
            return 0;
        }
    }

    // --- Local Storage Operations ---
    function saveStateToLocalStorage() {
        try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
            localStorage.setItem(SCHEDULED_TASKS_STORAGE_KEY, JSON.stringify(scheduledTasks));
            localStorage.setItem(NEXT_TASK_ID_KEY, nextTaskId.toString());
            localStorage.setItem(NEXT_SCHEDULED_ID_KEY, nextScheduledId.toString());
            console.log("State saved to localStorage.");
        } catch (error) {
            console.error("Error saving state to localStorage:", error);
            alert("Could not save data. Local storage might be full or disabled.");
        }
    }

    function loadStateFromLocalStorage() {
        try {
            const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
            const savedScheduledTasks = localStorage.getItem(SCHEDULED_TASKS_STORAGE_KEY);
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
            const savedNextTaskId = localStorage.getItem(NEXT_TASK_ID_KEY);
            const savedNextScheduledId = localStorage.getItem(NEXT_SCHEDULED_ID_KEY);

            if (savedTasks) {
                tasks = JSON.parse(savedTasks);
            }
            if (savedScheduledTasks) {
                scheduledTasks = JSON.parse(savedScheduledTasks);
            }
            if (savedTheme) {
                applyTheme(savedTheme);
                themeSelect.value = savedTheme;
            } else {
                applyTheme('light'); // Default theme
            }
            if (savedNextTaskId) {
                 // Ensure it's at least 1 and greater than max existing id
                const maxTaskId = tasks.reduce((max, t) => Math.max(max, parseInt(t.id.substring(1)) || 0), 0);
                nextTaskId = Math.max(parseInt(savedNextTaskId, 10) || 1, maxTaskId + 1);
            }
             if (savedNextScheduledId) {
                const maxScheduledId = scheduledTasks.reduce((max, t) => Math.max(max, parseInt(t.id.substring(1)) || 0), 0);
                 nextScheduledId = Math.max(parseInt(savedNextScheduledId, 10) || 1, maxScheduledId + 1);
             }

            console.log("State loaded from localStorage.");
        } catch (error) {
            console.error("Error loading state from localStorage:", error);
            // Reset state if loading fails to prevent broken app state
            tasks = [];
            scheduledTasks = [];
            nextTaskId = 1;
            nextScheduledId = 1;
            alert("Could not load saved data. It might be corrupted. Starting fresh.");
            localStorage.removeItem(TASKS_STORAGE_KEY);
            localStorage.removeItem(SCHEDULED_TASKS_STORAGE_KEY);
            localStorage.removeItem(NEXT_TASK_ID_KEY);
            localStorage.removeItem(NEXT_SCHEDULED_ID_KEY);
        }
    }

    // --- Task List Functionality ---
    function renderTaskList() {
        taskListEl.innerHTML = ''; // Clear existing list
        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.classList.add('task-item');
            taskItem.setAttribute('draggable', 'true');
            taskItem.id = `task-${task.id}`;
            taskItem.dataset.taskId = task.id;
            taskItem.textContent = task.text;

            taskItem.addEventListener('dragstart', handleDragStart);
            taskItem.addEventListener('dragend', handleDragEnd);

            taskListEl.appendChild(taskItem);
        });
    }

    function addTask() {
        const taskText = newTaskInput.value.trim();
        if (taskText === '') return;

        const newTask = { id: `t${nextTaskId++}`, text: taskText };
        tasks.push(newTask);
        newTaskInput.value = '';
        renderTaskList();
        saveStateToLocalStorage(); // Save after adding
    }

    // --- Drag and Drop Functionality ---
    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => e.target.classList.add('dragging'), 0);
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    scheduleTimelineEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetSlot = getHourSlotFromY(e.clientY);
        clearDropTargets(); // Clear previous targets
        if (targetSlot) {
            targetSlot.classList.add('drop-target');
        }
    });

     scheduleTimelineEl.addEventListener('dragleave', (e) => {
        if (!scheduleTimelineEl.contains(e.relatedTarget)) {
             clearDropTargets();
        }
     });

     function clearDropTargets() {
        scheduleTimelineEl.querySelectorAll('.hour-slot.drop-target').forEach(el => {
            el.classList.remove('drop-target');
        });
     }

    scheduleTimelineEl.addEventListener('drop', (e) => {
        e.preventDefault();
        clearDropTargets();
        const taskIdAttr = e.dataTransfer.getData('text/plain'); // e.g., "task-t1"
        const draggedElement = document.getElementById(taskIdAttr);

        if (!draggedElement) return;

        const originalTaskId = draggedElement.dataset.taskId; // e.g., "t1"
        const taskData = tasks.find(t => t.id === originalTaskId);
        if (!taskData) return; // Should not happen if state is consistent

        const timelineRect = scheduleTimelineEl.getBoundingClientRect();
        // Calculate Y relative to the timeline, considering scroll position
        const dropY = e.clientY - timelineRect.top + scheduleTimelineEl.scrollTop;

        // Convert Y position to minutes (1px = 1 minute, ensure within bounds)
        const rawMinutes = Math.max(0, Math.min(1439, Math.round(dropY)));
        const startMinutes = Math.round(rawMinutes / 15) * 15; // Snap to 15 mins

        const newScheduledTask = {
            id: `s${nextScheduledId++}`,
            taskId: originalTaskId,
            text: taskData.text,
            startTime: startMinutes,
            duration: 45, // Default duration
            description: ''
        };

        scheduledTasks.push(newScheduledTask);
        renderSchedule();
        saveStateToLocalStorage(); // Save after dropping

        // Optional: Remove from list? Maybe just visually indicate it's scheduled?
        // tasks = tasks.filter(t => t.id !== originalTaskId);
        // renderTaskList();
    });


    // --- Schedule Rendering ---
    function createHourSlots() {
        const hourHeight = 60;
        const numHours = 24;

        scheduleTimelineEl.innerHTML = ''; // Clear everything first

        for (let i = 0; i < numHours; i++) {
            const slot = document.createElement('div');
            slot.classList.add('hour-slot');
            slot.style.height = `${hourHeight}px`;
            slot.dataset.hour = i;

            const label = document.createElement('span');
            label.classList.add('hour-label');
            // Display time range
            const startTimeStr = formatTime(i * 60);
            const endTimeStr = formatTime((i + 1) * 60);
            label.textContent = `${startTimeStr} - ${endTimeStr}`;
            slot.appendChild(label);

            scheduleTimelineEl.appendChild(slot);
        }
        scheduleTimelineEl.style.height = `${numHours * hourHeight}px`;
    }

     function getHourSlotFromY(clientY) {
        const timelineRect = scheduleTimelineEl.getBoundingClientRect();
        const y = clientY - timelineRect.top + scheduleTimelineEl.scrollTop;
        const hourIndex = Math.floor(y / 60);
        return scheduleTimelineEl.querySelector(`.hour-slot[data-hour="${hourIndex}"]`);
     }

    function renderSchedule() {
         // Clear only previously rendered tasks, not hour slots
         const existingTasks = scheduleTimelineEl.querySelectorAll('.scheduled-task');
         existingTasks.forEach(task => task.remove());

        scheduledTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.classList.add('scheduled-task');
            taskElement.id = `scheduled-${task.id}`;
            taskElement.dataset.scheduledId = task.id;

            // Calculate position and time
            const top = task.startTime;
            const height = task.duration;
            const endTime = task.startTime + task.duration;

            taskElement.style.top = `${top}px`;
            taskElement.style.height = `${Math.max(15, height)}px`; // Min height of 15px

            // Create inner content
            const textSpan = document.createElement('span');
            textSpan.classList.add('task-text');
            textSpan.textContent = task.text;
            taskElement.appendChild(textSpan);

            const timeSpan = document.createElement('span');
            timeSpan.classList.add('task-time');
            timeSpan.textContent = `${formatTime(task.startTime)} - ${formatTime(endTime)}`;
            taskElement.appendChild(timeSpan);

            // Add click listener
            taskElement.addEventListener('click', () => openEditModal(task.id));

            scheduleTimelineEl.appendChild(taskElement);
        });
    }

    // --- Edit Modal Functionality ---
    function openEditModal(scheduledTaskId) {
        const task = scheduledTasks.find(t => t.id === scheduledTaskId);
        if (!task) return;

        modalScheduledTaskIdInput.value = task.id;
        modalTaskName.textContent = task.text;
        modalStartTimeInput.value = formatMinutesToHHMM(task.startTime);
        modalDurationInput.value = task.duration;
        modalDescriptionInput.value = task.description || '';

        editModal.style.display = 'block';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
    }

    function saveEditedTask() {
        const scheduledTaskId = modalScheduledTaskIdInput.value;
        const taskIndex = scheduledTasks.findIndex(t => t.id === scheduledTaskId);
        if (taskIndex === -1) return;

        const newStartTime = formatHHMMToMinutes(modalStartTimeInput.value);
        const newDuration = parseInt(modalDurationInput.value, 10);
        const newDescription = modalDescriptionInput.value;

        if (isNaN(newDuration) || newDuration <= 0) {
            alert("Please enter a valid positive duration.");
            return;
        }
         if (modalStartTimeInput.value === "") {
             alert("Please enter a valid start time.");
             return;
         }

        // Update task in the array
        scheduledTasks[taskIndex] = {
            ...scheduledTasks[taskIndex],
            startTime: newStartTime,
            duration: newDuration,
            description: newDescription
        };

        renderSchedule();
        saveStateToLocalStorage(); // Save after edit
        closeEditModal();
    }

     function deleteScheduledTask() {
        const scheduledTaskId = modalScheduledTaskIdInput.value;
        if (confirm(`Are you sure you want to delete task "${modalTaskName.textContent}" from the schedule?`)) {
            scheduledTasks = scheduledTasks.filter(t => t.id !== scheduledTaskId);
            renderSchedule();
            saveStateToLocalStorage(); // Save after delete
            closeEditModal();
        }
     }

    // --- Theming ---
    function applyTheme(themeName) {
        document.body.dataset.theme = themeName;
        localStorage.setItem(THEME_STORAGE_KEY, themeName); // Save preference
        console.log(`Theme applied: ${themeName}`);
    }

    themeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });

    // --- Import/Export ---
    function exportSchedule() {
        const dataToExport = {
            version: 1, // Add versioning for future compatibility
            tasks: tasks,
            scheduledTasks: scheduledTasks,
            nextTaskId: nextTaskId, // Save IDs to maintain consistency
            nextScheduledId: nextScheduledId
        };

        try {
            const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `timebox-schedule-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a); // Required for Firefox
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // Clean up
             console.log("Schedule exported.");
        } catch (error) {
            console.error("Error exporting schedule:", error);
            alert("Failed to export schedule.");
        }
    }

    function importSchedule(event) {
        const file = event.target.files[0];
        if (!file) {
            return; // No file selected
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                const importedData = JSON.parse(jsonString);

                // Basic validation
                if (!importedData || typeof importedData !== 'object' || !Array.isArray(importedData.tasks) || !Array.isArray(importedData.scheduledTasks)) {
                     throw new Error("Invalid file format. Required fields 'tasks' and 'scheduledTasks' not found or are not arrays.");
                }

                 // Optional: Add more validation (check structure of task objects, etc.)

                 if (confirm("Importing this file will overwrite your current tasks and schedule. Are you sure?")) {
                     tasks = importedData.tasks;
                     scheduledTasks = importedData.scheduledTasks;
                     // Load IDs if present, otherwise calculate based on imported data
                     const maxTaskId = tasks.reduce((max, t) => Math.max(max, parseInt(t.id.substring(1)) || 0), 0);
                     const maxScheduledId = scheduledTasks.reduce((max, t) => Math.max(max, parseInt(t.id.substring(1)) || 0), 0);
                     nextTaskId = Math.max(importedData.nextTaskId || 1, maxTaskId + 1);
                     nextScheduledId = Math.max(importedData.nextScheduledId || 1, maxScheduledId + 1);

                     saveStateToLocalStorage(); // Save the newly imported state
                     renderTaskList();
                     createHourSlots(); // Recreate slots (needed if timeline cleared)
                     renderSchedule(); // Render the imported schedule
                     alert("Schedule imported successfully!");
                     console.log("Schedule imported.");
                 }

            } catch (error) {
                console.error("Error importing schedule:", error);
                alert(`Failed to import file: ${error.message}`);
            } finally {
                 // Reset file input value to allow importing the same file again
                 importFileInput.value = null;
            }
        };

        reader.onerror = () => {
             console.error("Error reading file:", reader.error);
             alert("Error reading the selected file.");
             importFileInput.value = null;
        };

        reader.readAsText(file);
    }

    // --- Event Listeners ---
    addTaskButton.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    closeModalButton.addEventListener('click', closeEditModal);
    modalSaveButton.addEventListener('click', saveEditedTask);
    modalDeleteButton.addEventListener('click', deleteScheduledTask);
    exportButton.addEventListener('click', exportSchedule);
    importButton.addEventListener('click', () => importFileInput.click()); // Trigger hidden input
    importFileInput.addEventListener('change', importSchedule);

    // Close modal if clicked outside the content
    window.addEventListener('click', (event) => {
        if (event.target == editModal) {
            closeEditModal();
        }
    });

    // --- Initialization ---
    function initializeApp() {
        loadStateFromLocalStorage(); // Load saved data first
        createHourSlots();         // Generate the timeline structure
        renderTaskList();          // Render tasks from loaded state
        renderSchedule();          // Render schedule from loaded state
        console.log("App initialized.");
    }

    initializeApp();
});