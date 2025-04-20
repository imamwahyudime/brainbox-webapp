document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('task-list');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskButton = document.getElementById('add-task-button');
    const scheduleTimeline = document.getElementById('schedule-timeline');

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

    // --- State Management (Simple In-Memory) ---
    let tasks = []; // { id: string, text: string }
    let scheduledTasks = []; // { id: string, taskId: string, text: string, startTime: number, duration: number, description: string } (startTime in minutes from midnight)
    let nextTaskId = 1;
    let nextScheduledId = 1;

    // --- Task List Functionality ---
    function renderTaskList() {
        taskList.innerHTML = ''; // Clear existing list
        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.classList.add('task-item');
            taskItem.setAttribute('draggable', 'true');
            taskItem.id = `task-${task.id}`;
            taskItem.dataset.taskId = task.id;
            taskItem.textContent = task.text;

            // Add drag start listener
            taskItem.addEventListener('dragstart', handleDragStart);
            taskItem.addEventListener('dragend', handleDragEnd);

            taskList.appendChild(taskItem);
        });
    }

    function addTask() {
        const taskText = newTaskInput.value.trim();
        if (taskText === '') return;

        const newTask = { id: `t${nextTaskId++}`, text: taskText };
        tasks.push(newTask);
        newTaskInput.value = '';
        renderTaskList(); // Re-render the list to include the new task
    }

    addTaskButton.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // --- Drag and Drop Functionality ---
    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => e.target.classList.add('dragging'), 0); // Add class after a tick
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    scheduleTimeline.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        // Optional: Add visual feedback to the timeline or specific hour slot
        const targetSlot = getHourSlotFromY(e.clientY);
        if (targetSlot) {
             // Remove from others first for cleaner effect
             clearDropTargets();
             targetSlot.classList.add('drop-target');
        }
    });

     scheduleTimeline.addEventListener('dragleave', (e) => {
        // Optional: Remove visual feedback if the cursor leaves the timeline
        if (!scheduleTimeline.contains(e.relatedTarget)) {
             clearDropTargets();
        }
     });

     function clearDropTargets() {
        scheduleTimeline.querySelectorAll('.hour-slot.drop-target').forEach(el => {
            el.classList.remove('drop-target');
        });
     }

    scheduleTimeline.addEventListener('drop', (e) => {
        e.preventDefault();
        clearDropTargets();
        const taskId = e.dataTransfer.getData('text/plain');
        const draggedElement = document.getElementById(taskId);

        if (!draggedElement) return;

        const originalTaskId = draggedElement.dataset.taskId;
        const taskText = tasks.find(t => t.id === originalTaskId)?.text || 'Unknown Task';

        // Calculate drop position and time
        const timelineRect = scheduleTimeline.getBoundingClientRect();
        const dropY = e.clientY - timelineRect.top + scheduleTimeline.scrollTop; // Y position within the timeline, considering scroll

        // Convert Y position to minutes (1px = 1 minute)
        const rawMinutes = Math.max(0, Math.min(1439, Math.round(dropY)));

        // Optional: Snap to nearest 15 minutes
        const startMinutes = Math.round(rawMinutes / 15) * 15;

        // Create new scheduled task object
        const newScheduledTask = {
            id: `s${nextScheduledId++}`,
            taskId: originalTaskId,
            text: taskText,
            startTime: startMinutes,
            duration: 45, // Default duration
            description: ''
        };

        scheduledTasks.push(newScheduledTask);
        renderSchedule(); // Update the visual schedule

        // Optional: Remove task from the list after scheduling
        // tasks = tasks.filter(t => t.id !== originalTaskId);
        // renderTaskList();
    });


    // --- Schedule Rendering ---
    function createHourSlots() {
        const timelineHeight = scheduleTimeline.offsetHeight;
        const hourHeight = 60; // Height corresponding to 60 minutes/pixels
        const numHours = 24;

        scheduleTimeline.innerHTML = ''; // Clear previous slots

        for (let i = 0; i < numHours; i++) {
            const slot = document.createElement('div');
            slot.classList.add('hour-slot');
            slot.style.height = `${hourHeight}px`;
            slot.dataset.hour = i;

            const label = document.createElement('span');
            label.classList.add('hour-label');
            // Format time (e.g., 9:00 AM)
            const displayHour = i % 12 === 0 ? 12 : i % 12;
            const ampm = i < 12 || i === 24 ? 'AM' : 'PM';
            label.textContent = `${displayHour}:00 ${ampm}`;
            slot.appendChild(label);

            scheduleTimeline.appendChild(slot);
        }
        // Ensure timeline has the correct total height for pixel mapping
        scheduleTimeline.style.height = `${numHours * hourHeight}px`;
    }

     function getHourSlotFromY(clientY) {
        const timelineRect = scheduleTimeline.getBoundingClientRect();
        const y = clientY - timelineRect.top + scheduleTimeline.scrollTop;
        const hourIndex = Math.floor(y / 60); // Assuming 60px per hour
        return scheduleTimeline.querySelector(`.hour-slot[data-hour="${hourIndex}"]`);
     }

    function renderSchedule() {
         // Clear only previously rendered tasks, not hour slots
         const existingTasks = scheduleTimeline.querySelectorAll('.scheduled-task');
         existingTasks.forEach(task => task.remove());

        scheduledTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.classList.add('scheduled-task');
            taskElement.id = `scheduled-${task.id}`;
            taskElement.dataset.scheduledId = task.id;
            taskElement.textContent = task.text;

            // Calculate position and height (1 minute = 1 pixel)
            const top = task.startTime;
            const height = task.duration;

            taskElement.style.top = `${top}px`;
            taskElement.style.height = `${height}px`;
            taskElement.style.backgroundColor = getRandomColor(); // Optional: different colors

            // Add click listener to open edit modal
            taskElement.addEventListener('click', () => openEditModal(task.id));

            scheduleTimeline.appendChild(taskElement);
        });
    }

    // --- Edit Modal Functionality ---
    function formatMinutesToHHMM(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
        const minutes = (totalMinutes % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function formatHHMMToMinutes(hhmm) {
        if (!hhmm) return 0;
        const [hours, minutes] = hhmm.split(':').map(Number);
        return (hours * 60) + minutes;
    }

    function openEditModal(scheduledTaskId) {
        const task = scheduledTasks.find(t => t.id === scheduledTaskId);
        if (!task) return;

        modalScheduledTaskIdInput.value = task.id;
        modalTaskName.textContent = task.text;
        modalStartTimeInput.value = formatMinutesToHHMM(task.startTime);
        modalDurationInput.value = task.duration;
        modalDescriptionInput.value = task.description || ''; // Handle undefined description

        editModal.style.display = 'block';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
    }

    function saveEditedTask() {
        const scheduledTaskId = modalScheduledTaskIdInput.value;
        const taskIndex = scheduledTasks.findIndex(t => t.id === scheduledTaskId);
        if (taskIndex === -1) return; // Task not found

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
            ...scheduledTasks[taskIndex], // Keep existing id, taskId, text
            startTime: newStartTime,
            duration: newDuration,
            description: newDescription
        };

        renderSchedule(); // Re-render the schedule with updated info
        closeEditModal();
    }

     function deleteScheduledTask() {
        const scheduledTaskId = modalScheduledTaskIdInput.value;
        scheduledTasks = scheduledTasks.filter(t => t.id !== scheduledTaskId);
        renderSchedule();
        closeEditModal();
     }

    closeModalButton.addEventListener('click', closeEditModal);
    modalSaveButton.addEventListener('click', saveEditedTask);
    modalDeleteButton.addEventListener('click', deleteScheduledTask);

    // Close modal if clicked outside the content
    window.addEventListener('click', (event) => {
        if (event.target == editModal) {
            closeEditModal();
        }
    });

    // --- Initialization ---
    function initializeApp() {
        createHourSlots(); // Generate the timeline structure
        renderTaskList(); // Render initial tasks (if any were pre-defined)
        renderSchedule(); // Render initial scheduled tasks (if any)
    }

     // Helper for random colors (optional)
     function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        // Generate softer colors - avoid pure black/white, lean towards blues/purples/greens
        color += Math.floor(Math.random() * 8 + 4).toString(16); // R (4-B)
        color += Math.floor(Math.random() * 8 + 4).toString(16); // G (4-B)
        color += Math.floor(Math.random() * 8 + 8).toString(16); // B (8-F) - bias towards blue/purple
        // Add alpha for transparency
        // return color + 'CC'; // ~80% opacity
        return color; // Solid color
     }

    initializeApp();
});
