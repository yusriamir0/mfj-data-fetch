console.log("MFJ Data Fetch Extension loaded.");

function extractJobs() {
    const jobItems = document.querySelectorAll('a.list__item.d-block');
    const jobs = [];

    jobItems.forEach(item => {
        const titleElement = item.querySelector('ngb-highlight[data-test="swipe-vacancySummary-title"]');
        const title = titleElement ? titleElement.innerText.trim() : "Unknown Title";

        const dateElement = item.querySelector('span[data-test="swipe-vacancySummary-company--footer"]');
        const dateUpload = dateElement ? dateElement.innerText.trim() : "Unknown Date";

        const url = item.href;

        jobs.push({ title, url, dateUpload });
    });

    if (jobs.length > 0) {
        console.log(`Extracted ${jobs.length} jobs.`);
    }
    return jobs;
}

async function fetchAllJobs() {
    const listBody = document.querySelector('.list__body');
    if (!listBody) return extractJobs();

    console.log("Starting Fetch All... scrolling list.");

    let previousCount = 0;
    let currentCount = document.querySelectorAll('a.list__item.d-block').length;
    let retryCount = 0;

    while (currentCount > previousCount || retryCount < 5) {
        if (currentCount === previousCount) {
            retryCount++;
        } else {
            retryCount = 0;
        }

        previousCount = currentCount;
        listBody.scrollTo(0, listBody.scrollHeight);

        // Wait for potential network load
        await new Promise(r => setTimeout(r, 1500));

        currentCount = document.querySelectorAll('a.list__item.d-block').length;
        console.log(`Loaded ${currentCount} jobs...`);

        // Safety break if it's too many (optional, but good for UX)
        if (currentCount > 500) break;
    }

    console.log("Finished scrolling. Extracting all jobs.");
    return extractJobs();
}

// Handle messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getJobs") {
        const jobs = extractJobs();
        sendResponse({ jobs: jobs });
    } else if (request.action === "fetchAll") {
        fetchAllJobs().then(jobs => {
            sendResponse({ jobs: jobs });
        });
        return true; // Keep channel open for async response
    }
    return true;
});

// Observe for changes in the job list
const observer = new MutationObserver((mutations) => {
    let shouldExtract = false;
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
            shouldExtract = true;
        }
    });

    if (shouldExtract) {
        console.log("New jobs detected, extracting...");
        extractJobs();
    }
});

const listBody = document.querySelector('.list__body');
if (listBody) {
    observer.observe(listBody, { childList: true, subtree: true });
    console.log("Observing list body for changes.");
} else {
    // If list body is not there yet, try again later or observe parent
    const bodyObserver = new MutationObserver(() => {
        const target = document.querySelector('.list__body');
        if (target) {
            observer.observe(target, { childList: true, subtree: true });
            console.log("Observing list body for changes (late binding).");
            bodyObserver.disconnect();
            extractJobs(); // initial extraction
        }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
}

// Initial extraction in case content is already there
extractJobs();
