let currentDayIndex = 0;
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function selectDay(day) {
    currentDayIndex = daysOfWeek.indexOf(day);
    updateDay();
}

function previousDay() {
    currentDayIndex = (currentDayIndex - 1 + daysOfWeek.length) % daysOfWeek.length;
    updateDay();
}

function nextDay() {
    currentDayIndex = (currentDayIndex + 1) % daysOfWeek.length;
    updateDay();
}

function updateDay() {
    const dayName = daysOfWeek[currentDayIndex];
    document.getElementById('day-name').innerText = dayName;
    renderExercises();
}

function addExercise() {
    const exerciseName = document.getElementById('exercise-name').value.trim();
    const weight = document.getElementById('weight').value.trim();
	const unit = document.getElementById('unit').value.trim();
    const repRangeMin = document.getElementById('rep-range-min').value.trim();
	const repRangeMax = document.getElementById('rep-range-max').value.trim();


    if (!exerciseName || !weight || !repRangeMin || !repRangeMax) {
        alert('Please fill out all fields.');
        return;
    }

    const exerciseData = {
        day: daysOfWeek[currentDayIndex],
        exercise: exerciseName,
        weight,
		unit,
        repRangeMin,
		repRangeMax,
        repsDone: 0
    };

    const transaction = db.transaction(['exercises'], 'readwrite');
    const objectStore = transaction.objectStore('exercises');
    objectStore.add(exerciseData);

    transaction.oncomplete = () => {
        console.log('Exercise added successfully');
        renderExercises();
        clearInputs();
    };

    transaction.onerror = (event) => {
        console.error('Transaction error:', event.target.errorCode);
    };
}

function renderExercises() {
    const dayName = daysOfWeek[currentDayIndex];
    const transaction = db.transaction(['exercises'], 'readonly');
    const objectStore = transaction.objectStore('exercises');
    const index = objectStore.index('day');
    const request = index.getAll(IDBKeyRange.only(dayName));

    request.onsuccess = (event) => {
        const exercises = event.target.result;
        const exerciseCards = document.getElementById('exercise-cards');
        exerciseCards.innerHTML = '';

        exercises.forEach(exercise => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            card.innerHTML = `
                <div class="info">
                    <h2>${exercise.exercise}</h2>
                    <div>Weight: <input type="number" value="${exercise.weight}" onchange="updateExerciseField(${exercise.id}, 'weight', this.value)"> ${exercise.unit}</input></div>
                    <div class="rep-range-inputs">
                        Rep Range: <input type="number" value="${exercise.repRangeMin}" onchange="updateExerciseField(${exercise.id}, 'repRangeMin', this.value)"> <span>-</span> <input type="number" value="${exercise.repRangeMax}" onchange="updateExerciseField(${exercise.id}, 'repRangeMax', this.value)">
                    </div>
                    <div>Reps Done: <input type="number" value=${exercise.repsDone} onchange="updateExerciseField(${exercise.id}, 'repsDone', this.value)"></div>
                </div>
                <div class="exercise-card__delete">
                    <a class="exercise-card__delete-button" onclick="deleteExercise(${exercise.id})">&#10060</a>
                </div>
            `;
            exerciseCards.appendChild(card);
        });
    };

    request.onerror = (event) => {
        console.error('Request error:', event.target.errorCode);
    };
}

function updateExerciseField(id, field, value) {
    const transaction = db.transaction(['exercises'], 'readwrite');
    const objectStore = transaction.objectStore('exercises');
    const request = objectStore.get(id);

    request.onsuccess = (event) => {
        const exercise = event.target.result;
        if (exercise) {
            exercise[field] = value;
            const updateRequest = objectStore.put(exercise);
            updateRequest.onsuccess = () => {
                console.log(`Exercise ${field} updated successfully`);
            };
            updateRequest.onerror = (event) => {
                console.error('Update error:', event.target.errorCode);
            };
        } else {
            console.error('Exercise not found');
        }
    };

    request.onerror = (event) => {
        console.error('Get error:', event.target.errorCode);
    };
}


function deleteExercise(id) {
    const transaction = db.transaction(['exercises'], 'readwrite');
    const objectStore = transaction.objectStore('exercises');

    objectStore.delete(id);
    renderExercises();
}

function clearInputs() {
    document.getElementById('exercise-name').value = '';
    document.getElementById('weight').value = '';
    document.getElementById('rep-range-min').value = '';
	document.getElementById('rep-range-max').value = '';
    document.getElementById('reps-done').value = '';
}

function exportData() {
    const transaction = db.transaction(['exercises'], 'readwrite');
    const objectStore = transaction.objectStore('exercises');

    const request = objectStore.getAll();
    request.onsuccess = (e) => {
        const exercises = event.target.result;
        const dataStr = JSON.stringify(exercises, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'exercises.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    request.onerror = () => {
        alert('Export failed.');
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        const transaction = db.transaction(['exercises'], 'readwrite');
        const objectStore = transaction.objectStore('exercises');

        data.forEach(exercise => {
            objectStore.put(exercise);
        });

        transaction.oncomplete = () => {
            console.log('Data imported successfully');
            renderExercises();
        };

        transaction.onerror = (event) => {
            console.error('Error importing data:', event.target.errorCode);
        };
    };
    reader.readAsText(file);
}


// IndexedDB setup
const dbName = 'WeekExerciseDB';
let db;

document.addEventListener('DOMContentLoaded', () => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        const objectStore = db.createObjectStore('exercises', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('day', 'day', { unique: false });
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        updateDay();
    };

    request.onerror = (event) => {
        console.error('Database error:', event.target.errorCode);
    };
});