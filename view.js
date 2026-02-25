let allJobs = [];
let sortDirection = { title: 1, date: -1 };

document.addEventListener('DOMContentLoaded', () => {
    const jobsList = document.getElementById('jobsList');
    const jobStats = document.getElementById('jobStats');
    const message = document.getElementById('message');

    // Sorting headers
    document.getElementById('th-title').addEventListener('click', () => sortJobs('title'));
    document.getElementById('th-date').addEventListener('click', () => sortJobs('date'));

    // Retrieve data from storage
    chrome.storage.local.get('fetchedJobs', (data) => {
        if (data && data.fetchedJobs && data.fetchedJobs.length > 0) {
            allJobs = data.fetchedJobs;
            jobStats.innerText = `${allJobs.length} Jobs Found`;
            displayJobs(allJobs);
        } else {
            message.style.display = 'block';
            message.innerText = "No job data found. Please fetch jobs from the extension popup first.";
            document.getElementById('jobsTable').style.display = 'none';
            jobStats.style.display = 'none';
        }
    });
});

function displayJobs(jobs) {
    const jobsList = document.getElementById('jobsList');
    jobsList.innerHTML = '';

    jobs.forEach(job => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="job-title">${job.title}</td>
            <td class="job-date">${job.dateUpload}</td>
            <td><a href="${job.url}" target="_blank" class="job-link">View Details</a></td>
        `;
        jobsList.appendChild(row);
    });
}

function sortJobs(key) {
    const thTitle = document.getElementById('th-title');
    const thDate = document.getElementById('th-date');

    sortDirection[key] *= -1;

    thTitle.className = '';
    thDate.className = '';
    const currentTh = key === 'title' ? thTitle : thDate;
    currentTh.classList.add(sortDirection[key] === 1 ? 'sort-asc' : 'sort-desc');

    allJobs.sort((a, b) => {
        let valA = a[key] || "";
        let valB = b[key] || "";

        if (key === 'date') {
            valA = parseRelativeDate(a.dateUpload);
            valB = parseRelativeDate(b.dateUpload);
            return (valA - valB) * sortDirection[key];
        }

        return valA.localeCompare(valB) * sortDirection[key];
    });

    displayJobs(allJobs);
}

function parseRelativeDate(dateStr) {
    if (!dateStr || dateStr === "Unknown Date") return Infinity;

    const num = parseInt(dateStr.match(/\d+/)) || 0;
    const unit = dateStr.toLowerCase();

    if (unit.includes('minute')) return num;
    if (unit.includes('hour')) return num * 60;
    if (unit.includes('day')) return num * 60 * 24;
    if (unit.includes('week')) return num * 60 * 24 * 7;
    if (unit.includes('month')) return num * 60 * 24 * 30;

    return num;
}
