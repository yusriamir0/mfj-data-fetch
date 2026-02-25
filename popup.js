let allJobs = [];
let sortDirection = { title: 1, date: -1 }; // 1 for asc, -1 for desc

document.addEventListener('DOMContentLoaded', async () => {
    const jobsList = document.getElementById('jobsList');
    const jobsTable = document.getElementById('jobsTable');
    const message = document.getElementById('message');
    const fetchAllBtn = document.getElementById('fetchAllBtn');
    const viewTabBtn = document.getElementById('viewTabBtn');

    // Sorting headers
    document.getElementById('th-title').addEventListener('click', () => sortJobs('title'));
    document.getElementById('th-date').addEventListener('click', () => sortJobs('date'));

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.includes("candidates.myfuturejobs.gov.my")) {
        message.innerText = "Please use this extension on the MyFutureJobs search page.";
        fetchAllBtn.disabled = true;
        viewTabBtn.disabled = true;
        return;
    }

    // Initial load
    loadJobs(tab.id);

    // View on a new Tab button
    viewTabBtn.addEventListener('click', () => {
        if (allJobs.length > 0) {
            chrome.storage.local.set({ fetchedJobs: allJobs }, () => {
                chrome.tabs.create({ url: chrome.runtime.getURL('view.html') });
            });
        } else {
            alert("No jobs fetched yet. Please wait or refresh.");
        }
    });

    // Fetch All button
    fetchAllBtn.addEventListener('click', async () => {
        fetchAllBtn.disabled = true;
        fetchAllBtn.innerText = "Fetching (Scrolling)...";
        message.style.display = 'block';
        message.innerText = "This may take a minute. Scrolling to load all 400+ jobs...";
        jobsTable.style.display = 'none';

        chrome.tabs.sendMessage(tab.id, { action: "fetchAll" }, (response) => {
            fetchAllBtn.disabled = false;
            fetchAllBtn.innerText = "Fetch All (Auto-Scroll)";

            if (response && response.jobs) {
                allJobs = response.jobs;
                displayJobs(allJobs);
            } else {
                message.innerText = "Failed to fetch all jobs. Try again.";
            }
        });
    });
});

function loadJobs(tabId) {
    chrome.tabs.sendMessage(tabId, { action: "getJobs" }, (response) => {
        if (response && response.jobs) {
            allJobs = response.jobs;
            displayJobs(allJobs);
        } else {
            document.getElementById('message').innerText = "No jobs found or error connecting.";
        }
    });
}

function displayJobs(jobs) {
    const jobsList = document.getElementById('jobsList');
    const jobsTable = document.getElementById('jobsTable');
    const message = document.getElementById('message');

    jobsList.innerHTML = '';

    if (jobs.length > 0) {
        message.style.display = 'none';
        jobsTable.style.display = 'table';

        jobs.forEach(job => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="job-title" title="${job.title}">${job.title}</td>
                <td class="job-date">${job.dateUpload}</td>
                <td><a href="${job.url}" target="_blank" class="job-link">View</a></td>
            `;
            jobsList.appendChild(row);
        });
    } else {
        message.innerText = "No jobs found.";
        jobsTable.style.display = 'none';
    }
}

function sortJobs(key) {
    const thTitle = document.getElementById('th-title');
    const thDate = document.getElementById('th-date');

    // Toggle direction
    sortDirection[key] *= -1;

    // UI Feedback
    thTitle.className = 'sortable';
    thDate.className = 'sortable';
    const currentTh = key === 'title' ? thTitle : thDate;
    currentTh.classList.add(sortDirection[key] === 1 ? 'sort-asc' : 'sort-desc');

    allJobs.sort((a, b) => {
        let valA = a[key] || "";
        let valB = b[key] || "";

        if (key === 'date') {
            // Sort by Date Upload (Date is more complex, need parsing)
            valA = parseRelativeDate(a.dateUpload);
            valB = parseRelativeDate(b.dateUpload);
            return (valA - valB) * sortDirection[key];
        }

        // Title sort
        return valA.localeCompare(valB) * sortDirection[key];
    });

    displayJobs(allJobs);
}

// Converts "2 days ago", "1 hour ago" into a comparable number (minutes)
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
