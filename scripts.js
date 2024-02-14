const listener = document.getElementById('listener');
let listening = false;
let previousClipboardContent = '';
let checkClipboardTimer;
let activeTab = 'default';

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
                getItem('default')
                    .then(item => {
                        if (item) {
                            item.content = [...item.content, {
                                id: uuidv4(),
                                content: text,
                                ts: Date.now()
                            }];
                        }
                        return updateItem(item);
                    })
                    .then(() => {
                        console.log('Item updated successfully');
                        if (activeTab === 'default')
                            loadClipsByTab('default');
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
        listening = true;
    } else {
        clearInterval(checkClipboardTimer);
        listening = false;
    }
}

(async () => {

    await openDatabase();
    const item = await getItem('default');
    console.log('item', item);
    if (!item) {
        await addItem({ id: 'default', name: 'Default', content: [] });
    }

    if (window.electronAPI) {
        listening = true;
        listener.checked = true;
        listener.addEventListener('change', () => {
            listening = listener.checked;
        });
        window.electronAPI.on('clipboard-changed', async (event, data) => {
            console.log('In the renderer clipboard changed', Date.now(), data.content);
            if (listening) {
                try {
                    const item = await getItem('default');
                    if (item) {
                        item.content = [...item.content, {
                            id: uuidv4(),
                            content: data.content,
                            ts: Date.now()
                        }];
                    }
                    await updateItem(item);
                    if (activeTab === 'default')
                        loadClipsByTab('default');
                } catch (err) {
                    console.error(err);
                }
            }
        });
    } else {
        setListeningMode(false);
        listener.addEventListener('change', () => {
            setListeningMode(listener.checked);
        });
    }

    await loadTabs();
    loadClipsByTab('default');

    document.getElementById("copyButton").addEventListener("click", async () => {
        try {
            const content = await navigator.clipboard.readText();
            const item = await getItem(activeTab);
            if (item) {
                item.content = [...item.content, {
                    id: uuidv4(),
                    content,
                    ts: Date.now()
                }];
            }
            await updateItem(item);
            loadClipsByTab(activeTab);
        } catch (err) {
            console.error(err);
        }
    });

})();

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
                div.appendChild(document.createTextNode(entry.name));
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
                if (entry.id !== 'default') {
                    const input = document.createElement("input");
                    input.placeholder = "Enter the content to save";
                    const button = document.createElement("button");
                    button.innerText = "+";
                    button.onclick = async () => {
                        await saveInto(input.value, entry.id);
                        input.value = '';
                    };
                    const newContentDiv = document.createElement("div");
                    newContentDiv.appendChild(input);
                    newContentDiv.appendChild(button);
                    contentDiv.appendChild(newContentDiv);
                }
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
    const id = uuidv4();
    await addItem({ id, name, content: [] });
    await loadTabs();
    loadClipsByTab(activeTab);
}

async function saveInto(content, tab) {
    const item = await getItem(tab);
    if (item) {
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
                div.innerHTML = entry.content;
                div.title = entry.content;

                const adiv = document.createElement("div");
                adiv.classList.add("clip_action");
                const img = document.createElement("img");
                img.src = "icons/del.png";
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