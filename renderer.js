async function handleOnClick(id, tab) {
    console.log('handleOnClick', id, tab)
    await window.electronAPI.setClip(id, tab);
}

async function handleOnClickDelete(id, tab) {
    console.log('handleOnClickDelete', id, tab)
    await window.electronAPI.removeClip(id, tab);
}

async function loadClips() {
    try {
        const holder = document.getElementById('clip_holder');
        // holder.innerHTML = null;
        holder.replaceChildren();
        const data = await window.electronAPI.store.get('clips');
        console.log('In loadClips -', data);
        for (const entry of data) {
            const li = document.createElement('div');
            li.classList.add('clip_item');
            li.onclick = () => { handleOnClick(entry.id) };

            const div = document.createElement('div');
            div.classList.add('clip_text');
            div.innerHTML = entry.content;
            div.title = entry.content;

            const adiv = document.createElement('div');
            adiv.classList.add('clip_action');
            const img = document.createElement('img');
            img.src = 'icons/del.png';
            img.height = 20;
            img.width = 20;
            adiv.appendChild(img);
            adiv.onclick = (e) => {
                e.stopPropagation();
                handleOnClickDelete(entry.id)
            };

            li.appendChild(div);
            li.appendChild(adiv);
            holder.appendChild(li);
        }
    } catch (err) {
        console.error(err);
    }
}

loadClips();

const listener = document.getElementById('listener');

listener.addEventListener('change', () => {
    window.electronAPI.setListeningMode(listener.checked);
});

window.electronAPI.on('clipboard-changed', async () => {
    console.log('In the renderer clipboard changed', Date.now());
    loadClips();
});

loadTabs();

async function loadTabs() {
    try {
        const data = await window.electronAPI.store.get("saved_clips");
        const tabHolder = document.getElementById("tabs");
        tabHolder.replaceChildren();

        const div0 = document.createElement("div");
        div0.id = 'default_tab_btn';
        div0.innerHTML = 'Default';
        div0.classList.add("tab", "active");
        div0.onclick = (event) => {
            openTab(event, 'clip_holder');
        };

        tabHolder.appendChild(div0);

        if (data) {
            const holder = document.getElementById("clip_holder");
            for (const entry of data) {
                const span = document.createElement("button");
                span.classList.add("close");
                span.innerHTML = "X";
                span.onclick = (event) => {
                    closeTab(event, entry.id);
                };

                const div = document.createElement("div");
                div.appendChild(document.createTextNode(entry.name));
                div.appendChild(span);
                div.classList.add("tab");
                div.onclick = (event) => {
                    openTab(event, entry.id);
                };

                tabHolder.appendChild(div);

                const input = document.createElement("input");
                input.placeholder = "Enter the content to save";
                const button = document.createElement("button");
                button.innerText = "+";
                button.onclick = async () => {
                    await saveInto(input.value, entry.id);
                    input.value = '';
                };
                const contentDiv2 = document.createElement("div");
                contentDiv2.id = entry.id + "_content";

                const contentDiv = document.createElement("div");
                contentDiv.id = entry.id;
                contentDiv.classList.add("tab-content");

                const newContentDiv = document.createElement("div");
                newContentDiv.appendChild(input);
                newContentDiv.appendChild(button);

                contentDiv.appendChild(newContentDiv);
                contentDiv.appendChild(contentDiv2);

                holder.insertAdjacentElement("beforeBegin", contentDiv);
            }
        }

        const input2 = document.createElement("input");
        input2.placeholder = 'New Tab Name';
        const button2 = document.createElement('button');
        button2.innerText = '+';
        button2.onclick = async (event) => {
            let name = input2.value.trim();
            if (name) {
                await addTab(event, name);
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

async function addTab(evt, tabName) {
    await window.electronAPI.store.setSavedClips({ name: tabName });
    await loadTabs();
}

async function saveInto(content, tab) {
    await window.electronAPI.store.setSavedClipContent({ tab, content });
    await loadTabContentClips(tab);
}

async function loadTabContentClips(tabName) {
    const contentDiv = document.getElementById(tabName + "_content");
    if (contentDiv) {
        contentDiv.replaceChildren();
        let data = await window.electronAPI.store.get("saved_clips");
        data = data.find(d => d.id === tabName).content;
        console.log("In load saved clips -", data);
        if (data) {
            for (const entry of data) {
                const li = document.createElement("div");
                li.classList.add("clip_item");
                li.onclick = () => {
                    handleOnClick(entry.id, tabName);
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
                    handleOnClickDelete(entry.id, tabName);
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
}

async function closeTab(evt, tabName) {
    const resp = confirm('Do you want to delete the tab and its contents?');
    evt.stopPropagation(); // Prevent event bubbling
    const elem = document.getElementById(tabName);
    const isActive = elem.classList.contains('active');
    elem.style.display = "none";
    evt.currentTarget.parentNode.style.display = "none";
    if (isActive) {
        document.getElementById('default_tab_btn').click();
    }
    if (resp) {
        // remove tab from db   
        await window.electronAPI.store.deleteTab(tabName);
    }
}