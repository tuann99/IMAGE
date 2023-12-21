const { api } = window;
const container = document.getElementById('main-container');
const startScreen = document.getElementById('start-screen');
const textarea = document.querySelector('.sequence-input textarea');
const startButton = document.querySelector('.start-button');
const fileInput = document.querySelector('.file-input');
const uploadMessage = document.getElementById('upload-message');
const loadingScreen = document.getElementById('loading-screen');
const resultsSection = document.getElementById('results-section');
const tableDiv = document.getElementById('ec-table');
const check = 'check';

let fileUploaded = false;
let inputType;
let startTime;
let timerInterval;

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(function() {
        const elapsedTime = Date.now() - startTime;
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime - minutes * 60000) / 1000);
        const milliseconds = elapsedTime - minutes * 60000 - seconds * 1000;
        document.getElementById('timer').textContent = `${minutes}m ${seconds}s ${milliseconds}ms`;
    }, 100);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function log(message) {
    const logDiv = document.getElementById('log');
    logDiv.innerHTML += 'Progress: ' + message + '<br>';
}

api.invoke('mainCheck', check).then((preloadPath) => {

    console.log('Check sent to main process.')

    if (preloadPath) {
        console.log('Reply received from main process, so it is running and IPC is working.');
        console.log('preload.js path:', preloadPath);
    }
    else {
        console.log('Did not get reply from Main process, so it may not be running');
    }

});

api.receive('pyvenvPath', (path) => {
    console.log('pyvenv path: ', path);
});

api.receive('relativePyvenvPath', (rPath) => {
    console.log('Extracted path from cfg file: ', rPath);
});

api.receive('finalPyvenvPath', (fPath) => {
    console.log('Final path for cfg file: ', fPath);
});

api.receive('paths', (paths) => {
    const { pythonExecutablePath, pythonScriptPath } = paths;
    console.log('Python paths received from main process:', paths);
    log("Python exe path: " + pythonExecutablePath);
    log("Python script path: " + pythonScriptPath);
});

api.receive('pythonProcessStatus', (msg) => {
    console.log('Python process status: ', msg);
    log(msg);
});

api.receive('pythonError', (error) => {
    console.error('Python error: ', error);
    log(error);
});

api.receive('pythonOutput', (outputData) => {

    if (outputData) {

        console.log(typeof outputData, outputData)
        const data = JSON.parse(outputData);
        
        console.log('Output Data received from main process:', outputData);
        startScreen.style.display = 'none';
        loadingScreen.style.display = 'none';
        resultsSection.style.display = 'block';
        
        const ctx = document.getElementById('myChart').getContext('2d');
        const labels = Object.keys(data);
        const values = Object.values(data);

        function getRandomColor() {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            return `rgba(${r}, ${g}, ${b}, 0.2)`;
        }

        function getDarkerColor(rgbColor) {
            const color = rgbColor.slice(5, -4).split(', ').map(c => Math.max(0, c - 70));
            return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
        }

        // Generate a random color for each data point
        const backgroundColors = labels.map(() => getRandomColor());
        const borderColors = backgroundColors.map(color => getDarkerColor(color));

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: borderColors,
                    borderColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true, // this fixed the drifting issue
                animation: false,
                title: {
                    display: true,
                    text: 'Pie Chart of functions in sample \nbased on EC numbers',
                    fontSize: 20
                }
            }
        });

    } else {
        const errorMsg = 'No output data received from main process';
        log(errorMsg);
        console.log(errorMsg);
        // make a check for why no data was received
    }
});

document.addEventListener('DOMContentLoaded', function () {
    
    // Testing to see if text is entered
    textarea.addEventListener('input', function () {
        const isValid = textarea.value.trim().length > 0;
        if (isValid && fileUploaded) {
            startButton.classList.remove('valid');
            uploadMessage.textContent = 'Please provide either a file or text, not both. Reload the app (ctrl+R) to reset.';
        } else {
            startButton.classList.toggle('valid', isValid);
            startButton.removeAttribute('disabled');
            uploadMessage.textContent = '';
            inputType = 'text';
        }
    });

    // Testing to see if file is uploaded
    fileInput.addEventListener('change', function () {
        const file = fileInput.files[0];
        const fileName = fileInput.value;
        const filePath = file.path;
        const validExtensions = ['.fsa', '.fasta', '.fna', '.fa'];
        const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));

        if (isValidFile) {
            startButton.removeAttribute('disabled');
            startButton.classList.toggle('valid', isValidFile); 
            uploadMessage.textContent = `"${fileName}" has been uploaded.`;
            inputType = 'file';
            console.log('File path:', filePath);
        
            const reader = new FileReader();
            reader.onload = function(e) {
                textarea.value = e.target.result;  // Store the file contents in the textarea
            };
            reader.readAsText(file);
        } else {
            startButton.classList.remove('valid');
            uploadMessage.textContent = `"${fileName}" is not a valid file. Only .fsa, .fasta, .fna, and .fa files are accepted.`;
        }
    });

    // If button is clicked, send either text within textarea or uploaded file to main.js to send to Python
    startButton.addEventListener('click', function () {

        const userInput = textarea.value.trim();

        console.log('User Input to be sent to main.js:', userInput.substring(0, 50) + (userInput.length > 50 ? '...' : ''));
        console.log('Input Type:', inputType);

        startScreen.style.display = 'none';
        loadingScreen.style.display = 'block';
        resultsSection.style.display = 'none';
        startTimer();
        
        // Add loading bar + timer in the future

        api.send('executePythonScript', userInput)

    });
});

// Old code
// const data = outputData;
        // let table = '<table class="styled-table"><tr><th>Title</th><th>Expect</th><th>Subject</th><th>Length</th><th>DB Used</th><th>Accession</th></tr>';
        // let table = '<table class="styled-table"><tr><th>EC Number</th><th>EC Number Counts</th></tr>';
        // let currentPage = 0;
        // const rowsPerPage = 10;

// data.forEach(row => {
        //     table += `<tr><td><span>${row.header}</span></td><td><span>${row.nt_seq}</span></td></tr>`;
        //     table += 
        //     `<tr>
        //         <td><span>${row.title}</span></td>
        //         <td><span>${row.expect}</span></td>
        //         <td><span>${row.subject}</span></td>
        //         <td><span>${row.length}</span></td>
        //         <td><span>${row.db_used}</span></td>
        //         <td><span>${row.accession}</span></td>
        //     </tr>`;
        //     table += 
        //     `<tr>
        //         <td><span>${row.ec_number}</span></td>
        //     </tr>`;
        // });
        // table += '</table>';
        // resultsSection.innerHTML = table;


        // api.whatevers used to go here

        // api.invoke('executePythonScript', userInput).then((outputData) => {

        //     if (outputData) {
                
        //         console.log(typeof outputData, outputData)
        //         const data = JSON.parse(outputData);
        //         // const data = outputData;
        //         // let table = '<table class="styled-table"><tr><th>Title</th><th>Expect</th><th>Subject</th><th>Length</th><th>DB Used</th><th>Accession</th></tr>';
        //         // let table = '<table class="styled-table"><tr><th>EC Number</th><th>EC Number Counts</th></tr>';
        //         // let currentPage = 0;
        //         // const rowsPerPage = 10;
                
        //         console.log('Output Data received from main process:', outputData);
        //         startScreen.style.display = 'none';
        //         loadingScreen.style.display = 'none';
        //         resultsSection.style.display = 'block';
                
        //         const ctx = document.getElementById('myChart').getContext('2d');
        //         const labels = Object.keys(data);
        //         const values = Object.values(data);

        //         function getRandomColor() {
        //             const r = Math.floor(Math.random() * 256);
        //             const g = Math.floor(Math.random() * 256);
        //             const b = Math.floor(Math.random() * 256);
        //             return `rgba(${r}, ${g}, ${b}, 0.2)`;
        //         }

        //         function getDarkerColor(rgbColor) {
        //             const color = rgbColor.slice(5, -4).split(', ').map(c => Math.max(0, c - 70));
        //             return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
        //         }

        //         // Generate a random color for each data point
        //         const backgroundColors = labels.map(() => getRandomColor());
        //         const borderColors = backgroundColors.map(color => getDarkerColor(color));

        //         new Chart(ctx, {
        //             type: 'pie',
        //             data: {
        //                 labels: labels,
        //                 datasets: [{
        //                     data: values,
        //                     backgroundColor: borderColors,
        //                     borderColor: backgroundColors,
        //                     borderWidth: 1
        //                 }]
        //             },
        //             options: {
        //                 responsive: true,
        //                 maintainAspectRatio: true, // this fixed the drifting issue
        //                 animation: false,
        //                 title: {
        //                     display: true,
        //                     text: 'Pie Chart of functions in sample \nbased on EC numbers',
        //                     fontSize: 20
        //                 }
        //             }
        //         });

        //         // data.forEach(row => {
        //         //     table += `<tr><td><span>${row.header}</span></td><td><span>${row.nt_seq}</span></td></tr>`;
        //         //     table += 
        //         //     `<tr>
        //         //         <td><span>${row.title}</span></td>
        //         //         <td><span>${row.expect}</span></td>
        //         //         <td><span>${row.subject}</span></td>
        //         //         <td><span>${row.length}</span></td>
        //         //         <td><span>${row.db_used}</span></td>
        //         //         <td><span>${row.accession}</span></td>
        //         //     </tr>`;
        //         //     table += 
        //         //     `<tr>
        //         //         <td><span>${row.ec_number}</span></td>
        //         //     </tr>`;
        //         // });
        //         // table += '</table>';
        //         // resultsSection.innerHTML = table;
                
        //     } else {
        //         const errorMsg = 'No output data received from main process';
        //         log(errorMsg);
        //         console.log(errorMsg);
        //         // make a check for why no data was received
        //     }
            
        // });