let generatedDocs = null;
// API base URL - change this if your Flask server runs on a different host/port
const apiBaseUrl = window.location.origin;

function updateProgress(progress) {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.innerHTML = `
        <div class="progress-container">
            <div class="progress-bar" style="width: ${progress}%"></div>
            <div class="progress-text">${Math.round(progress)}% Completed</div>
        </div>
        <div class="progress-message">Generating documentation...</div>
    `;
}

function structureDocumentation(doc) {
    const sections = doc.split('\n\n');
    let structuredHtml = '';
    
    sections.forEach(section => {
        if (section.trim()) {
            structuredHtml += `
                <div class="documentation-section">
                    ${section
                        .replace(/\n/g, '<br>')
                        .replace(/\s{2,}/g, match => '&nbsp;'.repeat(match.length))
                        .replace(/•/g, '<span class="bullet">&bull;</span>')}
                </div>
            `;
        }
    });
    
    return structuredHtml;
}

async function generateDocs() {
    const path = document.getElementById('path').value.trim();
    const customPrompt = document.getElementById('customPrompt').value;
    const outputFormat = document.getElementById('outputFormat').value;
    const aiModel = document.getElementById('aiModel').value;
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const downloadSection = document.getElementById('download-section');
    
    if (!path) {
        resultsDiv.innerHTML = '<div class="error">Please enter a valid path</div>';
        return;
    }
    
    loadingDiv.style.display = 'block';
    resultsDiv.innerHTML = '';
    downloadSection.style.display = 'none';
    
        // Inicializar barra de progreso
        updateProgress(0);

    try {
        const response = await fetch(`${apiBaseUrl}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: path,
                customPrompt: customPrompt,
                outputFormat: outputFormat,
                model: aiModel
            }),
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            resultsDiv.innerHTML = `<div class="error">${data.error}</div>`;
            return;
        }
        
        generatedDocs = data;
        let output = '';
        let completedFiles = 0;
        const totalFiles = Object.keys(data).length;

        for (const [file, result] of Object.entries(data)) {
            completedFiles++;
            updateProgress((completedFiles / totalFiles) * 100);
            
            let docContent = '';
            if (result && result.documentation) {
                docContent = result.documentation;
            } else if (typeof result === 'string') {
                docContent = result;
            } else {
                docContent = JSON.stringify(result, null, 2);
            }

            output += `
                <div class="file-result">
                    <div class="file-path">${file}</div>
                    <div class="documentation">
                        ${structureDocumentation(docContent)}
                    </div>
                    <div class="feedback-buttons">
                        <button onclick="provideFeedback('${file}', 1)" class="feedback-btn" title="Helpful">
                            <i class="fas fa-thumbs-up"></i>
                        </button>
                        <button onclick="provideFeedback('${file}', 0)" class="feedback-btn" title="Not Helpful">
                            <i class="fas fa-thumbs-down"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        
        resultsDiv.innerHTML = output;
        downloadSection.style.display = 'block';
        
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}. Please check that the server is running and accessible.</div>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

async function downloadDocs() {
    if (!generatedDocs) return;

    const outputFormat = document.getElementById('outputFormat').value;
    const resultsDiv = document.getElementById('results');
    
    try {
        const response = await fetch(`${apiBaseUrl}/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                documentation: generatedDocs,
                format: outputFormat
            }),
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documentation.${outputFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (error) {
        console.error('Error downloading:', error);
        resultsDiv.innerHTML += `<div class="error">Error downloading documentation: ${error.message}. Please try again.</div>`;
        alert('Error downloading documentation. Please check console for details.');
    }
}

function toggleProfileMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const menu = document.getElementById('profileMenu');
    if (!menu) return;
    
    // Simple toggle
    menu.classList.toggle('active');
    
    // Handle clicking outside
    if (menu.classList.contains('active')) {
        const closeMenu = (e) => {
            // Check if click is outside menu and trigger
            if (!menu.contains(e.target) && !e.target.closest('.user-info')) {
                menu.classList.remove('active');
                document.removeEventListener('click', closeMenu);
            }
        };
        
        // Add listener on next tick to avoid immediate trigger
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }
}



function handleLogout() {
    alert('Logout successful!');
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

async function provideFeedback(documentationId, rating) {
    try {
        const response = await fetch(`${apiBaseUrl}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                documentationId: documentationId,
                rating: rating
            })
        });
        
        if (response.ok) {
            showToast('Thank you for your feedback!', 'success');
        }
    } catch (error) {
        console.error('Error providing feedback:', error);
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}

// Theme Switcher
function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);
}

function toggleTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        setTheme('light');
    } else {
        setTheme('dark');
    }
}

// Initialize theme
(function () {
    if (localStorage.getItem('theme') === 'dark') {
        setTheme('dark');
        document.getElementById('checkbox').checked = true;
    } else {
        setTheme('light');
        document.getElementById('checkbox').checked = false;
    }
})();

// Event Listeners
document.getElementById('checkbox').addEventListener('change', function() {
    toggleTheme();
});

document.getElementById('path').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        generateDocs();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        // Use capture phase to ensure the event is handled first
        userInfo.addEventListener('click', toggleProfileMenu, true);
    }
});