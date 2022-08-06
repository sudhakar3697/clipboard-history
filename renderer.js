document.getElementById('header').addEventListener('mousedown', mouseDown);
document.getElementById('close_button').addEventListener('click', closeApp);

function mouseDown() {
    window.getSelection().removeAllRanges();
}

function closeApp() {
    window.electronAPI.closeApp();
}

async function handleOnClick(content) {
    console.log('handleOnClick', content)
    await window.electronAPI.setClip(content);
}

async function handleOnClickDelete(content) {
    console.log('handleOnClickDelete', content)
    await window.electronAPI.removeClip(content);
}

function setDataProps(el, { id, ts }) {
    el.dataset.id = id;
    el.dataset.ts = ts;
}

function loadClips() {
    const holder = document.getElementById('clip_holder');
    holder.innerHTML = null;
    window.electronAPI.store.get('clips')
        .then(data => {
            console.log('In loadClips -', data);
            data.forEach((entry) => {
                const li = document.createElement('div');
                li.classList.add('clip_item');
                li.onclick = () => { handleOnClick(entry.content) };

                const div = document.createElement('div');
                div.classList.add('clip_text');
                div.innerHTML = entry.content;

                const adiv = document.createElement('div');
                adiv.classList.add('clip_action');
                adiv.innerHTML = '🗑️';
                adiv.onclick = (e) => {
                    e.stopPropagation();
                    handleOnClickDelete(entry.id)
                };

                li.appendChild(div);
                li.appendChild(adiv);
                holder.appendChild(li);
                setDataProps(div, entry);
                setDataProps(adiv, entry);
                setDataProps(li, entry);
            });

        })
        .catch(err => {
            console.error(err);
        })
}

loadClips();

window.electronAPI.on('clipboard-changed', async () => {
    console.log('In the renderer clipboard changed');
    loadClips();
});
