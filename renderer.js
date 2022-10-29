async function handleOnClick(id) {
    console.log('handleOnClick', id)
    await window.electronAPI.setClip(id);
}

async function handleOnClickDelete(id) {
    console.log('handleOnClickDelete', id)
    await window.electronAPI.removeClip(id);
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
