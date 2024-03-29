let listening;
const defaultListeningValue = window.electronAPI ? true : false;
let previousClipboardContent = '';
let checkClipboardTimer;
let activeTab = 'default';
let tabLimitValue;
const defaultTabLimitValue = 10;
let clipsLimitValue;
const defaultClipsLimitValue = 20;
const shortcuts = ['st-cmc', 'st-cmc', 'st-sync-btn', 'st-sync-stat', 'st-import', 'st-export'];
const shortcutDefValues = [true, true, true, true, true, true];
const shortcutMappingElems = ['listener-label', 'listener', 'syncBtn', 'syncStat', 'importBtn', 'exportBtn'];

const listener = document.getElementById('listener');
const listener2 = document.getElementById('listener2');
const tabLimitCheck = document.getElementById('tab-limit-check');
const tabLimit = document.getElementById('tab-limit');
const clipsLimitCheck = document.getElementById('clips-limit-check');
const clipsLimit = document.getElementById('clips-limit');

function applySettings() {
    const shortcutConfig = shortcuts.map(s => document.getElementById(s).checked);
    for (let i = 0; i < shortcuts.length; i++) {
        document.getElementById(shortcutMappingElems[i]).style.display = shortcutConfig[i] ? 'inline' : 'none';
        localStorage.setItem(shortcuts[i], shortcutConfig[i]);
    }

    if (tabLimitCheck.checked) {
        tabLimitValue = tabLimit.value;
    } else {
        tabLimitValue = Infinity;
    }
    if (clipsLimitCheck.checked) {
        clipsLimitValue = clipsLimit.value;
    } else {
        clipsLimitValue = Infinity;
    }
    localStorage.setItem('tabLimitValue', tabLimitValue);
    localStorage.setItem('clipsLimitValue', clipsLimitValue);

    listening = listener2.checked;
    if (!window.electronAPI) {
        setListeningMode(listening);
    }
    listener.checked = listening;
    localStorage.setItem('listening', listening);
}

function resetSettingstoDefault() {
    listener.checked = defaultListeningValue;
    listener2.checked = listener.checked;
    listening = listener2.checked;
    localStorage.setItem('listening', listening);

    tabLimitValue = defaultTabLimitValue;
    tabLimitCheck.checked = Number.isFinite(tabLimitValue) ? true : false;
    tabLimit.value = tabLimitValue;
    tabLimit.disabled = !tabLimitCheck.checked;
    localStorage.setItem('tabLimitValue', tabLimitValue);

    clipsLimitValue = defaultClipsLimitValue;
    clipsLimitCheck.checked = Number.isFinite(clipsLimitValue) ? true : false;
    clipsLimit.value = clipsLimitValue;
    clipsLimit.disabled = !clipsLimitCheck.checked;
    localStorage.setItem('clipsLimitValue', clipsLimitValue);

    for (let i = 0; i < shortcuts.length; i++) {
        document.getElementById(shortcutMappingElems[i]).style.display = shortcutDefValues[i] ? 'inline' : 'none';
        document.getElementById(shortcuts[i]).checked = shortcutDefValues[i];
        localStorage.setItem(shortcuts[i], shortcutDefValues[i]);
    }
}

async function cleanupData() {
    await deleteStore();
    const item = await getItem('default');
    console.log('item', item);
    if (!item) {
        await addItem({ id: 'default', name: 'Default', content: [] }, false);
    }
    await loadTabs();
    loadClipsByTab('default');
}

function renderSettingValuesFromStore() {
    listener.checked = localStorage.getItem('listening') ? localStorage.getItem('listening') === 'true' : defaultListeningValue;
    listener2.checked = listener.checked;
    listening = listener2.checked;
    localStorage.setItem('listening', listening);

    tabLimitValue = localStorage.getItem('tabLimitValue') ? parseInt(localStorage.getItem('tabLimitValue')) : defaultTabLimitValue;
    tabLimitCheck.checked = Number.isFinite(tabLimitValue) ? true : false;
    tabLimit.value = tabLimitValue;
    tabLimit.disabled = !tabLimitCheck.checked;
    localStorage.setItem('tabLimitValue', tabLimitValue);

    clipsLimitValue = localStorage.getItem('clipsLimitValue') ? parseInt(localStorage.getItem('clipsLimitValue')) : defaultClipsLimitValue;
    clipsLimitCheck.checked = Number.isFinite(clipsLimitValue) ? true : false;
    clipsLimit.value = clipsLimitValue;
    clipsLimit.disabled = !clipsLimitCheck.checked;
    localStorage.setItem('clipsLimitValue', clipsLimitValue);

    for (let i = 0; i < shortcuts.length; i++) {
        const t = localStorage.getItem(shortcuts[i]) ? localStorage.getItem(shortcuts[i]) === 'true' : shortcutDefValues[i];
        document.getElementById(shortcuts[i]).checked = t;
        document.getElementById(shortcutMappingElems[i]).style.display = t ? 'inline' : 'none';
        localStorage.setItem(shortcuts[i], t);
    }
    document.getElementById('runtime').innerText = window.electronAPI ? 'Electron' : 'Web';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            console.log('Text copied to clipboard');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
}

function checkClipboard() {
    navigator.clipboard.readText()
        .then(text => {
            if (text !== previousClipboardContent) {
                previousClipboardContent = text;
                console.log("Changed Clipboard content: " + text);
                saveInto(text, 'default')
                    .then(() => {
                        console.log('Item updated successfully');
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
            }
        })
        .catch(err => {
            console.error('Failed to read clipboard contents: ', err);
        });
}

function setListeningMode(value) {
    if (value) {
        checkClipboard();
        checkClipboardTimer = setInterval(checkClipboard, 1000);
    } else {
        clearInterval(checkClipboardTimer);
    }
}

async function exportContent() {
    const res = await getAllItems();
    const fileName = `clipboard-history_${new Date().toISOString()}.json`;
    const data = JSON.stringify(res, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 0);
}

async function importContent() {
    // add tab, clips limit check
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.click();
    fileInput.addEventListener("change", () => {
        const selectedFile = fileInput.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const fileContent = event.target.result;
                const data = JSON.parse(fileContent);
                console.log(data);
                const conflictingClips = [];
                for await (const entry of data) {
                    const item = await getItem(entry.id);
                    if (item) {
                        item.name = entry.uts > item.uts ? entry.name : item.name;
                        const clips = item.content.map(i => i.id);
                        for (const clip of entry.content) {
                            if (clips.includes(clip.id)) {
                                conflictingClips.push(clip.id);
                            } else {
                                item.content.push(clip);
                            }
                        }
                        await updateItem(item);
                    } else {
                        await addItem(entry);
                    }
                }
                if (conflictingClips.length === 0) {
                    alert('Successfully imported');
                } else {
                    console.log('Conflicting Clips encountered (' + conflictingClips.join(',') + ')')
                    alert('Conflicting Clips encountered (' + conflictingClips.join(',') + ')')
                }
                await loadTabs();
                loadClipsByTab(activeTab);
            };
            reader.readAsText(selectedFile);
        }
    });
}

function loadClipsByTab(tab) {
    document.getElementById(`${tab}_tab_btn`).click();
}

async function loadTabs() {
    try {
        const data = await getAllItems();
        const tabHolder = document.getElementById("tabs");
        tabHolder.replaceChildren();
        if (data) {
            data.sort((o, n) => o.ts - n.ts);
            for (const entry of data) {
                const div = document.createElement("div");
                if (entry.id === 'default') {
                    div.appendChild(document.createTextNode(entry.name));
                } else {
                    const tabNameIn = document.createElement("span");
                    tabNameIn.innerText = entry.name;
                    tabNameIn.style.padding = '5px';
                    div.appendChild(tabNameIn);
                    div.ondblclick = () => {
                        tabNameIn.contentEditable = 'plaintext-only';
                        const range = document.createRange();
                        range.selectNodeContents(tabNameIn);
                        range.collapse(false);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        tabNameIn.focus();
                        tabNameIn.addEventListener("blur", async () => {
                            const newText = tabNameIn.innerText;
                            if (newText && (entry.name !== newText)) {
                                console.log("New tab name:", newText);
                                const item = await getItem(entry.id);
                                item.name = newText;
                                console.log(item)
                                await updateItem(item);
                            }
                            this.contentEditable = false;
                        });
                    };
                }
                div.classList.add("tab");
                div.onclick = (event) => {
                    openTab(event, entry.id);
                };
                div.id = `${entry.id}_tab_btn`;
                if (entry.id !== 'default') {
                    const span = document.createElement("button");
                    span.classList.add("close");
                    span.innerHTML = "X";
                    span.onclick = (event) => {
                        closeTab(event, entry.id);
                    };
                    div.appendChild(span);
                }

                tabHolder.appendChild(div);

                document.getElementById(entry.id)?.remove();

                const contentDiv = document.createElement("div");
                contentDiv.id = entry.id;
                contentDiv.classList.add("tab-content");
                const buttonAc = document.createElement("button");
                buttonAc.classList.add('add-cc-content-btn');
                buttonAc.innerText = "Add Current Clipboard Text";
                buttonAc.onclick = async () => {
                    const content = await navigator.clipboard.readText();
                    await saveInto(content, activeTab);
                };
                const input = document.createElement("input");
                input.placeholder = "Enter the content to save";
                const button = document.createElement("button");
                button.innerText = "+";
                button.onclick = async () => {
                    await saveInto(input.value, entry.id);
                    input.value = '';
                };
                const newContentDiv = document.createElement("div");
                newContentDiv.appendChild(buttonAc);
                newContentDiv.appendChild(input);
                newContentDiv.appendChild(button);
                contentDiv.appendChild(newContentDiv);
                const contentDiv2 = document.createElement("div");
                contentDiv2.id = entry.id + "_content";
                contentDiv.appendChild(contentDiv2);
                tabHolder.insertAdjacentElement("afterend", contentDiv);
            }
        }

        const input2 = document.createElement("input");
        input2.placeholder = 'New Tab Name';
        const button2 = document.createElement('button');
        button2.innerText = '+';
        button2.onclick = async () => {
            let name = input2.value.trim();
            if (name) {
                await addTab(name);
                input2.value = '';
            } else {
                alert('Invalid name, retry');
            }
        };
        const div2 = document.createElement("div");
        div2.classList.add('new-tab-div');
        div2.appendChild(input2);
        div2.appendChild(button2);
        tabHolder.appendChild(div2);
    } catch (err) {
        console.error(err);
    }
}

async function addTab(name) {
    const tabs = await getAllItems();
    if (tabs.length >= tabLimitValue) {
        alert('Tab creation limit exceeded. Use settings to update the limit.');
        return;
    }
    const id = uuidv4();
    await addItem({ id, name, content: [] });
    await loadTabs();
    loadClipsByTab(activeTab);
}

async function saveInto(content, tab) {
    const item = await getItem(tab);
    if (item) {
        if (item.content.length >= clipsLimitValue) {
            alert('Clips per tab limit exceeded. Use settings to update the limit.');
            return;
        }
        item.content = [...item.content, {
            id: uuidv4(),
            content,
            ts: Date.now()
        }];
    }
    await updateItem(item);
    await loadTabContentClips(tab);
}

async function loadTabContentClips(tabName) {
    console.log('loadTabContentClips', tabName)
    const contentDiv = document.getElementById(tabName + "_content");
    if (contentDiv) {
        contentDiv.replaceChildren();
        let data = await getItem(tabName);
        data = data.content;
        data.sort((o, n) => n.ts - o.ts);
        console.log("In load tab content clips -", data);
        if (data) {
            for (const entry of data) {
                const li = document.createElement("div");
                li.classList.add("clip_item");
                li.onclick = () => {
                    handleOnClick(entry.content, entry.id, tabName);
                };

                const div = document.createElement("div");
                div.classList.add("clip_text");
                div.innerText = entry.content;
                div.title = entry.content;

                const adiv = document.createElement("div");
                adiv.classList.add("clip_action");
                const img = document.createElement("img");
                img.src = "icons/del.png";
                img.alt = "X";
                img.height = 20;
                img.width = 20;
                adiv.appendChild(img);
                adiv.onclick = async (e) => {
                    e.stopPropagation();
                    await handleOnClickDelete(entry.id, tabName);
                    await loadTabContentClips(tabName);
                };

                li.appendChild(div);
                li.appendChild(adiv);
                contentDiv.appendChild(li);
            }
        }
    }
}

async function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
        tabcontent[i].style.display = "none";
    }
    const tablinks = document.getElementsByClassName("tab");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).classList.add("active");
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");
    // render clips for the specific tab
    await loadTabContentClips(tabName);
    activeTab = tabName;
    console.log('activeTab', activeTab);
}

async function closeTab(evt, tabName) {
    const resp = confirm('Do you want to delete the tab and its contents?');
    evt.stopPropagation(); // Prevent event bubbling
    const elem = document.getElementById(tabName);
    const isActive = elem.classList.contains('active');
    elem.style.display = "none";
    evt.currentTarget.parentNode.style.display = "none";
    if (isActive) {
        loadClipsByTab('default');
    }
    if (resp) {
        await deleteItem(tabName);
    }
}

async function handleOnClick(content, id, tab) {
    console.log('handleOnClick', id, tab, content);
    copyToClipboard(content);
}

async function handleOnClickDelete(id, tab) {
    console.log('handleOnClickDelete', id, tab);
    const item = await getItem(tab);
    if (item) {
        item.content = item.content.filter(i => i.id !== id);
        await updateItem(item);
    }
}

(async () => {
    renderSettingValuesFromStore();
    await openDatabase();
    const item = await getItem('default');
    console.log('item', item);
    if (!item) {
        await addItem({ id: 'default', name: 'Default', content: [] });
    }

    if (window.electronAPI) {
        listener.addEventListener('change', () => {
            listening = listener.checked;
            listener2.checked = listening;
            localStorage.setItem('listening', listening);
        });
        window.electronAPI.on('clipboard-changed', async (event, data) => {
            console.log('In the renderer clipboard changed', Date.now(), data.content);
            if (listening) {
                try {
                    await saveInto(data.content, 'default');
                } catch (err) {
                    console.error(err);
                }
            }
        });
    } else {
        setListeningMode(listening);
        listener.addEventListener('change', () => {
            listening = listener.checked;
            listener2.checked = listening;
            localStorage.setItem('listening', listening);
            setListeningMode(listening);
        });
    }

    await loadTabs();
    loadClipsByTab('default');

    document.getElementById("settingsButton").addEventListener("click", async () => {
        document.getElementById('feature-div').style.display = 'none';
        document.getElementById('settings').style.display = 'block';
    });

    document.getElementById("back-to-fd-btn").addEventListener("click", async () => {
        document.getElementById('settings').style.display = 'none';
        document.getElementById('feature-div').style.display = 'block';
    });

    tabLimitCheck.addEventListener('change', () => {
        tabLimit.disabled = !tabLimitCheck.checked;
    });

    clipsLimitCheck.addEventListener('change', () => {
        clipsLimit.disabled = !clipsLimitCheck.checked;
    });

    document.getElementById('settings-apply-btn').addEventListener('click', () => {
        applySettings();
    });

    document.getElementById('reset-settings-btn').addEventListener('click', () => {
        resetSettingstoDefault();
    });

    document.getElementById('cleanup-btn').addEventListener('click', () => {
        cleanupData();
    });

    document.getElementById("exportBtn").addEventListener("click", async () => {
        exportContent();
    });

    document.getElementById("importBtn").addEventListener("click", async () => {
        importContent();
    });

    document.getElementById("exportBtn2").addEventListener("click", async () => {
        exportContent();
    });

    document.getElementById("importBtn2").addEventListener("click", async () => {
        importContent();
    });

    window.addEventListener('clouddatachange', async (event) => {
        await loadTabs();
        loadClipsByTab(activeTab);
    });

})();
